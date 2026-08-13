import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { presentBill } from "../presenters/bill-presenter.js";
import { paidAmount, paymentStatus, remainingAmount, toCents } from "../services/payment-status.js";
import { ApiError } from "../utils/api-error.js";
import { authenticatedCompanyId } from "../utils/auth-user.js";
import { parseBody } from "../utils/request.js";
import { optionalString, requiredString } from "../utils/validation.js";

export const billsRouter = Router();
const vendorInclude = {
  vendor: { select: { id: true, displayName: true } },
  payments: { select: { amount: true } },
};
const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const dateValue = (body: Record<string, unknown>, field: string) => {
  const value = requiredString(body, field);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${field} is invalid.`);
  return date;
};

const billValues = async (companyId: string, body: Record<string, unknown>) => {
  const vendorId = requiredString(body, "vendorId");
  const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, companyId }, select: { id: true } });
  if (!vendor) throw new ApiError(400, "Vendor was not found.");
  if (!Array.isArray(body.lines) || body.lines.length === 0) throw new ApiError(400, "Add at least one bill item.");
  const rawLines = body.lines as Array<Record<string, unknown>>;
  const itemIds = rawLines.map((line) => String(line.itemId ?? "")).filter(Boolean);
  const items = await prisma.item.findMany({ where: { companyId, id: { in: itemIds }, purchaseEnabled: true }, select: { id: true, name: true } });
  const itemMap = new Map(items.map((item) => [item.id, item]));
  const lines = rawLines.map((line) => {
    const itemId = String(line.itemId ?? ""); const item = itemMap.get(itemId);
    const quantity = Number(line.quantity); const rate = Number(line.rate); const taxRate = Number(line.taxRate ?? 0);
    if (!item) throw new ApiError(400, "A bill item was not found or cannot be purchased.");
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw new ApiError(400, "Bill quantity and rate must be valid.");
    return { itemId, itemName: item.name, quantity, rate, tax: typeof line.tax === "string" ? line.tax : null, taxRate, amount: quantity * rate };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
  if (!Number.isFinite(discountPercent)) throw new ApiError(400, "Discount is invalid.");
  const discountAmount = subtotal * discountPercent / 100;
  const factor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
  const taxTotal = lines.reduce((sum, line) => sum + line.amount * factor * line.taxRate / 100, 0);
  return { vendorId, lines, subtotal, discountPercent, discountAmount, taxTotal, total: subtotal - discountAmount + taxTotal };
};

const savedLines = (lines: Awaited<ReturnType<typeof billValues>>["lines"]) => lines.map((line) => ({ ...line, quantity: decimal(line.quantity), rate: decimal(line.rate), taxRate: decimal(line.taxRate), amount: decimal(line.amount) }));

billsRouter.get("/", async (_req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const bills = await prisma.bill.findMany({ where: { companyId }, include: vendorInclude, orderBy: { sequence: "desc" } });
    const lines = await prisma.billLine.findMany({ where: { billId: { in: bills.map((bill) => bill.id) } } });
    res.json(bills.map((bill) => presentBill({ ...bill, lines: lines.filter((line) => line.billId === bill.id) })));
  } catch (error) { next(error); }
});

billsRouter.get("/next-number", async (_req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const sequence = await prisma.bill.aggregate({ where: { companyId }, _max: { sequence: true } });
    const next = (sequence._max.sequence ?? 0) + 1;
    res.json({ billNumber: `BILL-${String(next).padStart(4, "0")}` });
  } catch (error) { next(error); }
});

billsRouter.post("/", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const body = parseBody(req); const values = await billValues(companyId, body);
    const bill = await prisma.$transaction(async (transaction) => {
      const current = await transaction.bill.aggregate({ where: { companyId }, _max: { sequence: true } });
      return transaction.bill.create({ data: {
        companyId, sequence: (current._max.sequence ?? 0) + 1,
        vendorId: values.vendorId, billDate: dateValue(body, "billDate"), dueDate: dateValue(body, "dueDate"),
        terms: requiredString(body, "terms"), notes: optionalString(body, "notes"), status: "Unpaid",
        subtotal: decimal(values.subtotal), discountPercent: decimal(values.discountPercent), discountAmount: decimal(values.discountAmount), taxTotal: decimal(values.taxTotal), total: decimal(values.total),
        lines: { create: savedLines(values.lines) },
      }, include: vendorInclude });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const lines = await prisma.billLine.findMany({ where: { billId: bill.id } });
    res.status(201).json(presentBill({ ...bill, lines }));
  } catch (error) { next(error); }
});

billsRouter.patch("/:id", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const existing = await prisma.bill.findFirst({ where: { id: req.params.id, companyId }, select: { status: true } });
    if (!existing) throw new ApiError(404, "Bill was not found.");
    if (existing.status !== "Unpaid") throw new ApiError(400, "Paid and partially paid bills cannot be edited.");
    const body = parseBody(req); const values = await billValues(companyId, body);
    const bill = await prisma.bill.update({ where: { id: req.params.id, companyId }, data: {
      vendorId: values.vendorId, billDate: dateValue(body, "billDate"), dueDate: dateValue(body, "dueDate"), terms: requiredString(body, "terms"), notes: optionalString(body, "notes"),
      subtotal: decimal(values.subtotal), discountPercent: decimal(values.discountPercent), discountAmount: decimal(values.discountAmount), taxTotal: decimal(values.taxTotal), total: decimal(values.total),
      lines: { deleteMany: {}, create: savedLines(values.lines) },
    }, include: vendorInclude });
    const lines = await prisma.billLine.findMany({ where: { billId: bill.id } });
    res.json(presentBill({ ...bill, lines }));
  } catch (error) { next(error); }
});

billsRouter.post("/:id/payment", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const body = parseBody(req); const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Payment amount must be greater than zero.");
    const bill = await prisma.bill.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true, status: true, total: true, payments: { select: { amount: true } } },
    });
    if (!bill) throw new ApiError(404, "Bill was not found.");
    if (bill.status === "Paid") throw new ApiError(400, "This bill is already paid.");
    const amountPaid = paidAmount(bill.payments);
    const balance = remainingAmount(bill.total, amountPaid);
    if (toCents(amount) > toCents(balance)) throw new ApiError(400, "Payment amount cannot exceed the remaining balance.");
    const nextStatus = paymentStatus(bill.total, amountPaid + amount);
    await prisma.$transaction([
      prisma.billPayment.create({ data: { billId: bill.id, paymentDate: dateValue(body, "paymentDate"), amount: decimal(amount) } }),
      prisma.bill.update({ where: { id: bill.id, companyId }, data: { status: nextStatus } }),
    ]);
    res.status(204).send();
  } catch (error) { next(error); }
});

billsRouter.delete("/:id", async (req, res, next) => {
  try {
    const companyId = authenticatedCompanyId(res);
    const bill = await prisma.bill.findFirst({ where: { id: req.params.id, companyId }, select: { id: true } });
    if (!bill) throw new ApiError(404, "Bill was not found.");
    await prisma.$transaction([prisma.billPayment.deleteMany({ where: { billId: bill.id } }), prisma.bill.delete({ where: { id: bill.id, companyId } })]);
    res.status(204).send();
  } catch (error) { next(error); }
});

import { Router } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { presentInvoice } from "../presenters/invoice-presenter.js";
import { paidAmount, paymentStatus, remainingAmount, toCents } from "../services/payment-status.js";
import { ApiError } from "../utils/api-error.js";
import { parseBody } from "../utils/request.js";
import { optionalString, requiredString } from "../utils/validation.js";

export const invoicesRouter = Router();

const customerInclude = {
  customer: { select: { id: true, displayName: true } },
  payments: { select: { amount: true } },
};

const decimal = (value: number) => new Prisma.Decimal(value.toFixed(2));
const dateValue = (body: Record<string, unknown>, field: string) => {
  const value = requiredString(body, field);
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new ApiError(400, `${field} is invalid.`);
  return date;
};

invoicesRouter.get("/", async (_req, res, next) => {
  try {
    await prisma.invoice.updateMany({ where: { status: "Saved" }, data: { status: "Unpaid" } });
    const invoices = await prisma.invoice.findMany({ include: customerInclude, orderBy: { createdAt: "desc" } });
    const lines = await prisma.invoiceLine.findMany({ where: { invoiceId: { in: invoices.map((invoice) => invoice.id) } } });
    res.json(invoices.map((invoice) => presentInvoice({ ...invoice, lines: lines.filter((line) => line.invoiceId === invoice.id) })));
  } catch (error) { next(error); }
});

invoicesRouter.post("/", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const customerId = requiredString(body, "customerId");
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new ApiError(400, "Customer was not found.");

    if (!Array.isArray(body.lines) || body.lines.length === 0) throw new ApiError(400, "Add at least one invoice item.");
    const rawLines = body.lines as Array<Record<string, unknown>>;
    const itemIds = rawLines.map((line) => String(line.itemId ?? "")).filter(Boolean);
    const items = await prisma.item.findMany({ where: { id: { in: itemIds }, salesEnabled: true }, select: { id: true, name: true } });
    const itemMap = new Map(items.map((item) => [item.id, item]));

    const lines = rawLines.map((line) => {
      const itemId = String(line.itemId ?? "");
      const item = itemMap.get(itemId);
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      const taxRate = Number(line.taxRate ?? 0);
      if (!item) throw new ApiError(400, "An invoice item was not found or cannot be sold.");
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw new ApiError(400, "Invoice quantity and rate must be valid.");
      const amount = quantity * rate;
      return { itemId, itemName: item.name, quantity, rate, tax: typeof line.tax === "string" ? line.tax : null, taxRate, amount };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    if (!Number.isFinite(discountPercent)) throw new ApiError(400, "Discount is invalid.");
    const discountAmount = subtotal * discountPercent / 100;
    const taxableFactor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
    const taxTotal = lines.reduce((sum, line) => sum + line.amount * taxableFactor * line.taxRate / 100, 0);
    const total = subtotal - discountAmount + taxTotal;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: requiredString(body, "invoiceNumber"), customerId,
        invoiceDate: dateValue(body, "invoiceDate"), dueDate: dateValue(body, "dueDate"),
        terms: requiredString(body, "terms"), customerNotes: optionalString(body, "customerNotes"),
        status: "Unpaid",
        subtotal: decimal(subtotal), discountPercent: decimal(discountPercent),
        discountAmount: decimal(discountAmount), taxTotal: decimal(taxTotal), total: decimal(total),
        lines: { create: lines.map((line) => ({ ...line, quantity: decimal(line.quantity), rate: decimal(line.rate), taxRate: decimal(line.taxRate), amount: decimal(line.amount) })) },
      },
      include: customerInclude,
    });
    const savedLines = await prisma.invoiceLine.findMany({ where: { invoiceId: invoice.id } });
    res.status(201).json(presentInvoice({ ...invoice, lines: savedLines }));
  } catch (error) { next(error); }
});

invoicesRouter.patch("/:id", async (req, res, next) => {
  try {
    const existingInvoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { status: true } });
    if (!existingInvoice) throw new ApiError(404, "Invoice was not found.");
    if (existingInvoice.status !== "Unpaid") throw new ApiError(400, "Paid and partially paid invoices cannot be edited.");

    const body = parseBody(req);
    const customerId = requiredString(body, "customerId");
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
    if (!customer) throw new ApiError(400, "Customer was not found.");
    if (!Array.isArray(body.lines) || body.lines.length === 0) throw new ApiError(400, "Add at least one invoice item.");

    const rawLines = body.lines as Array<Record<string, unknown>>;
    const itemIds = rawLines.map((line) => String(line.itemId ?? "")).filter(Boolean);
    const items = await prisma.item.findMany({ where: { id: { in: itemIds }, salesEnabled: true }, select: { id: true, name: true } });
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const lines = rawLines.map((line) => {
      const itemId = String(line.itemId ?? "");
      const item = itemMap.get(itemId);
      const quantity = Number(line.quantity);
      const rate = Number(line.rate);
      const taxRate = Number(line.taxRate ?? 0);
      if (!item) throw new ApiError(400, "An invoice item was not found or cannot be sold.");
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(rate) || rate < 0) throw new ApiError(400, "Invoice quantity and rate must be valid.");
      return { itemId, itemName: item.name, quantity, rate, tax: typeof line.tax === "string" ? line.tax : null, taxRate, amount: quantity * rate };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
    const discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    if (!Number.isFinite(discountPercent)) throw new ApiError(400, "Discount is invalid.");
    const discountAmount = subtotal * discountPercent / 100;
    const taxableFactor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
    const taxTotal = lines.reduce((sum, line) => sum + line.amount * taxableFactor * line.taxRate / 100, 0);
    const total = subtotal - discountAmount + taxTotal;

    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        invoiceNumber: requiredString(body, "invoiceNumber"), customerId,
        invoiceDate: dateValue(body, "invoiceDate"), dueDate: dateValue(body, "dueDate"),
        terms: requiredString(body, "terms"), customerNotes: optionalString(body, "customerNotes"),
        subtotal: decimal(subtotal), discountPercent: decimal(discountPercent),
        discountAmount: decimal(discountAmount), taxTotal: decimal(taxTotal), total: decimal(total),
        lines: {
          deleteMany: {},
          create: lines.map((line) => ({ ...line, quantity: decimal(line.quantity), rate: decimal(line.rate), taxRate: decimal(line.taxRate), amount: decimal(line.amount) })),
        },
      },
      include: customerInclude,
    });
    const savedLines = await prisma.invoiceLine.findMany({ where: { invoiceId: invoice.id } });
    res.json(presentInvoice({ ...invoice, lines: savedLines }));
  } catch (error) { next(error); }
});

invoicesRouter.post("/:id/payment", async (req, res, next) => {
  try {
    const body = parseBody(req);
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) throw new ApiError(400, "Payment amount must be greater than zero.");

    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      select: { id: true, status: true, total: true, payments: { select: { amount: true } } },
    });
    if (!invoice) throw new ApiError(404, "Invoice was not found.");
    if (invoice.status === "Paid") throw new ApiError(400, "This invoice is already paid.");

    const amountPaid = paidAmount(invoice.payments);
    const balance = remainingAmount(invoice.total, amountPaid);
    if (toCents(amount) > toCents(balance)) throw new ApiError(400, "Payment amount cannot exceed the remaining balance.");
    const nextStatus = paymentStatus(invoice.total, amountPaid + amount);

    await prisma.$transaction([
      prisma.payment.create({ data: { invoiceId: invoice.id, paymentDate: dateValue(body, "paymentDate"), amount: decimal(amount) } }),
      prisma.invoice.update({ where: { id: invoice.id }, data: { status: nextStatus } }),
    ]);
    res.status(204).send();
  } catch (error) { next(error); }
});

invoicesRouter.delete("/:id", async (req, res, next) => {
  try {
    const invoice = await prisma.invoice.findUnique({ where: { id: req.params.id }, select: { id: true } });
    if (!invoice) throw new ApiError(404, "Invoice was not found.");

    await prisma.$transaction([
      prisma.payment.deleteMany({ where: { invoiceId: invoice.id } }),
      prisma.invoice.delete({ where: { id: invoice.id } }),
    ]);
    res.status(204).send();
  } catch (error) { next(error); }
});

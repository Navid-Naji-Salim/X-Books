import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { buildDashboardSummary } from "../services/dashboard-summary.js";

export const summaryRouter = Router();

summaryRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const yearEnd = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));
    // Sequential reads keep the local Prisma development database stable.
    const invoices = await prisma.invoice.findMany({ select: { id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, status: true, total: true, customer: { select: { displayName: true } } } });
    const bills = await prisma.bill.findMany({ select: { id: true, sequence: true, billDate: true, dueDate: true, status: true, total: true, vendor: { select: { displayName: true } } } });
    const payments = await prisma.payment.findMany({ where: { paymentDate: { gte: yearStart, lt: yearEnd } }, select: { paymentDate: true, amount: true } });
    const billPayments = await prisma.billPayment.findMany({ where: { paymentDate: { gte: yearStart, lt: yearEnd } }, select: { paymentDate: true, amount: true } });
    res.json(buildDashboardSummary({ invoices, bills, payments, billPayments, now }));
  } catch (error) {
    next(error);
  }
});

import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const summaryRouter = Router();

const money = (value: unknown) => Number(value);
summaryRouter.get("/", async (_req, res, next) => {
  try {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const year = now.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    // Keep these reads sequential: the local Prisma development database can
    // close pooled connections when the initial workspace request fans out.
    const invoices = await prisma.invoice.findMany({
      select: { id: true, invoiceNumber: true, invoiceDate: true, dueDate: true, status: true, total: true, customer: { select: { displayName: true } } },
    });
    const bills = await prisma.bill.findMany({
      select: { id: true, sequence: true, billDate: true, dueDate: true, status: true, total: true, vendor: { select: { displayName: true } } },
    });
    const payments = await prisma.payment.findMany({ where: { paymentDate: { gte: yearStart, lt: yearEnd } }, select: { paymentDate: true, amount: true } });
    const billPayments = await prisma.billPayment.findMany({ where: { paymentDate: { gte: yearStart, lt: yearEnd } }, select: { paymentDate: true, amount: true } });

    const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
    const unpaidBills = bills.filter((bill) => bill.status !== "Paid");
    const aging = <T extends { dueDate: Date; total: unknown }>(entries: T[]) => ({
      outstanding: entries.reduce((sum, entry) => sum + money(entry.total), 0),
      current: entries.filter((entry) => entry.dueDate >= today).reduce((sum, entry) => sum + money(entry.total), 0),
      overdue: entries.filter((entry) => entry.dueDate < today).reduce((sum, entry) => sum + money(entry.total), 0),
    });
    const byUrgency = <T extends { dueDate: Date }>(a: T, b: T) => a.dueDate.getTime() - b.dueDate.getTime();

    const months = Array.from({ length: 12 }, (_, index) => ({
      month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(year, index, 1))),
      monthIndex: index,
      cashReceived: 0,
      cashPaid: 0,
      income: 0,
      expenses: 0,
    }));
    const add = (date: Date, field: "cashReceived" | "cashPaid" | "income" | "expenses", value: unknown) => {
      const month = months[date.getUTCMonth()];
      if (date.getUTCFullYear() === year && month) month[field] += money(value);
    };
    payments.forEach((payment) => add(payment.paymentDate, "cashReceived", payment.amount));
    billPayments.forEach((payment) => add(payment.paymentDate, "cashPaid", payment.amount));
    invoices.forEach((invoice) => add(invoice.invoiceDate, "income", invoice.total));
    bills.forEach((bill) => add(bill.billDate, "expenses", bill.total));

    const totalIncome = months.reduce((sum, month) => sum + month.income, 0);
    const totalExpenses = months.reduce((sum, month) => sum + month.expenses, 0);
    res.json({
      year,
      receivables: {
        ...aging(unpaidInvoices),
        entries: unpaidInvoices.sort(byUrgency).slice(0, 4).map((invoice) => ({ id: invoice.id, number: invoice.invoiceNumber, name: invoice.customer.displayName, dueDate: invoice.dueDate.toISOString(), amount: money(invoice.total), overdue: invoice.dueDate < today })),
      },
      payables: {
        ...aging(unpaidBills),
        entries: unpaidBills.sort(byUrgency).slice(0, 4).map((bill) => ({ id: bill.id, number: `BILL-${String(bill.sequence).padStart(4, "0")}`, name: bill.vendor.displayName, dueDate: bill.dueDate.toISOString(), amount: money(bill.total), overdue: bill.dueDate < today })),
      },
      months,
      activity: { totalIncome, totalExpenses, netActivity: totalIncome - totalExpenses },
    });
  } catch (error) {
    next(error);
  }
});

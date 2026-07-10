import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const summaryRouter = Router();

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const totalOf = <T>(rows: T[], amount: (row: T) => number) => rows.reduce((total, row) => total + amount(row), 0);
const isPaid = (status: string) => status.toLowerCase() === "paid";

summaryRouter.get("/", async (_req, res, next) => {
  try {
    // Prisma Dev can close a pooled local connection when several aggregate
    // queries start on the same request at once. Keep this dashboard read
    // sequential so login-time workspace loading remains reliable.
    const items = await prisma.item.findMany();
    const customerCount = await prisma.customer.count();
    const vendorCount = await prisma.vendor.count();
    const invoicePayments = await prisma.payment.findMany({ select: { amount: true, paymentDate: true } });
    const billPayments = await prisma.billPayment.findMany({ select: { amount: true, paymentDate: true } });
    const invoices = await prisma.invoice.findMany({
      select: { dueDate: true, invoiceDate: true, status: true, total: true },
    });
    const bills = await prisma.bill.findMany({
      select: {
        billDate: true,
        dueDate: true,
        status: true,
        total: true,
        vendor: { select: { displayName: true } },
        lines: {
          select: {
            amount: true,
            itemName: true,
            item: { select: { purchaseAccount: true } },
          },
        },
      },
    });

    const now = new Date();
    const year = now.getUTCFullYear();
    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year + 1, 0, 1));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const isInPeriod = (date: Date) => date >= periodStart && date < periodEnd;

    const monthly = monthLabels.map((month) => ({
      month,
      year,
      incoming: 0,
      outgoing: 0,
      cash: 0,
    }));

    const beginningBalance =
      totalOf(invoicePayments.filter((payment) => payment.paymentDate < periodStart), (payment) => Number(payment.amount))
      - totalOf(billPayments.filter((payment) => payment.paymentDate < periodStart), (payment) => Number(payment.amount));

    invoicePayments.filter((payment) => isInPeriod(payment.paymentDate)).forEach((payment) => {
      const month = monthly[payment.paymentDate.getUTCMonth()];
      if (month) month.incoming += Number(payment.amount);
    });
    billPayments.filter((payment) => isInPeriod(payment.paymentDate)).forEach((payment) => {
      const month = monthly[payment.paymentDate.getUTCMonth()];
      if (month) month.outgoing += Number(payment.amount);
    });

    let runningBalance = beginningBalance;
    monthly.forEach((month) => {
      runningBalance += month.incoming - month.outgoing;
      month.cash = runningBalance;
    });

    const incomeVsPurchases = monthLabels.map((month) => ({ month, year, income: 0, purchases: 0 }));
    invoices.filter((invoice) => isInPeriod(invoice.invoiceDate)).forEach((invoice) => {
      const month = incomeVsPurchases[invoice.invoiceDate.getUTCMonth()];
      if (month) month.income += Number(invoice.total);
    });
    bills.filter((bill) => isInPeriod(bill.billDate)).forEach((bill) => {
      const month = incomeVsPurchases[bill.billDate.getUTCMonth()];
      if (month) month.purchases += Number(bill.total);
    });

    const summarizeOutstanding = <T extends { dueDate: Date; status: string; total: { toString(): string } }>(rows: T[]) => {
      const unpaid = rows.filter((row) => !isPaid(row.status));
      const current = totalOf(unpaid.filter((row) => row.dueDate >= today), (row) => Number(row.total));
      const overdue = totalOf(unpaid.filter((row) => row.dueDate < today), (row) => Number(row.total));
      return { unpaidCount: unpaid.length, outstanding: current + overdue, current, overdue };
    };

    const expenseTotals = new Map<string, number>();
    bills.filter((bill) => isInPeriod(bill.billDate)).forEach((bill) => {
      if (bill.lines.length === 0) {
        expenseTotals.set(bill.vendor.displayName, (expenseTotals.get(bill.vendor.displayName) ?? 0) + Number(bill.total));
        return;
      }
      bill.lines.forEach((line) => {
        const label = line.item?.purchaseAccount || line.itemName || bill.vendor.displayName || "Purchases";
        expenseTotals.set(label, (expenseTotals.get(label) ?? 0) + Number(line.amount));
      });
    });

    const inventoryValue = items.reduce(
      (total, item) => total + Number(item.unitCost) * item.quantity,
      0,
    );
    const incoming = totalOf(monthly, (month) => month.incoming);
    const outgoing = totalOf(monthly, (month) => month.outgoing);

    res.json({
      itemCount: items.length,
      customerCount,
      vendorCount,
      inventoryValue,
      activeItemCount: items.filter((item) => item.isActive).length,
      dashboard: {
        periodLabel: `FY ${year}`,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: new Date(Date.UTC(year, 11, 31)).toISOString().slice(0, 10),
        receivables: summarizeOutstanding(invoices),
        payables: summarizeOutstanding(bills),
        cashFlow: {
          beginningBalance,
          incoming,
          outgoing,
          endingBalance: beginningBalance + incoming - outgoing,
          monthly,
        },
        incomeVsPurchases,
        topExpenses: Array.from(expenseTotals.entries())
          .map(([label, amount]) => ({ label, amount }))
          .sort((left, right) => right.amount - left.amount)
          .slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
});

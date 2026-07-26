export type DashboardInvoice = { invoiceDate: Date; dueDate: Date; status: string; total: unknown; payments: Array<{ amount: unknown }> };
export type DashboardBill = { billDate: Date; dueDate: Date; status: string; total: unknown; payments: Array<{ amount: unknown }> };
export type DashboardPayment = { paymentDate: Date; amount: unknown };

const money = (value: unknown) => Number(value);
const balance = (entry: { total: unknown; payments: Array<{ amount: unknown }> }) =>
  Math.max(0, money(entry.total) - entry.payments.reduce((sum, payment) => sum + money(payment.amount), 0));

export const buildDashboardSummary = ({ invoices, bills, payments, billPayments, now = new Date() }: {
  invoices: DashboardInvoice[];
  bills: DashboardBill[];
  payments: DashboardPayment[];
  billPayments: DashboardPayment[];
  now?: Date;
}) => {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const year = now.getUTCFullYear();
  const unpaidInvoices = invoices.filter((invoice) => invoice.status !== "Paid");
  const unpaidBills = bills.filter((bill) => bill.status !== "Paid");
  const aging = <T extends { dueDate: Date; total: unknown; payments: Array<{ amount: unknown }> }>(entries: T[]) => ({
    outstanding: entries.reduce((sum, entry) => sum + balance(entry), 0),
    current: entries.filter((entry) => entry.dueDate >= today).reduce((sum, entry) => sum + balance(entry), 0),
    overdue: entries.filter((entry) => entry.dueDate < today).reduce((sum, entry) => sum + balance(entry), 0),
  });
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
  const totalIncoming = months.reduce((sum, month) => sum + month.cashReceived, 0);
  const totalOutgoing = months.reduce((sum, month) => sum + month.cashPaid, 0);

  return {
    year,
    receivables: aging(unpaidInvoices),
    payables: aging(unpaidBills),
    months,
    cashActivity: { totalIncoming, totalOutgoing, netActivity: totalIncoming - totalOutgoing },
    activity: { totalIncome, totalExpenses, netActivity: totalIncome - totalExpenses },
  };
};

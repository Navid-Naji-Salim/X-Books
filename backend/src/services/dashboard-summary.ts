type Party = { displayName: string };
export type DashboardInvoice = { id: string; invoiceNumber: string; invoiceDate: Date; dueDate: Date; status: string; total: unknown; payments: Array<{ amount: unknown }>; customer: Party };
export type DashboardBill = { id: string; sequence: number; billDate: Date; dueDate: Date; status: string; total: unknown; payments: Array<{ amount: unknown }>; vendor: Party };
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

  return {
    year,
    receivables: {
      ...aging(unpaidInvoices),
      entries: [...unpaidInvoices].sort(byUrgency).slice(0, 4).map((invoice) => ({ id: invoice.id, number: invoice.invoiceNumber, name: invoice.customer.displayName, dueDate: invoice.dueDate.toISOString(), amount: balance(invoice), overdue: invoice.dueDate < today })),
    },
    payables: {
      ...aging(unpaidBills),
      entries: [...unpaidBills].sort(byUrgency).slice(0, 4).map((bill) => ({ id: bill.id, number: `BILL-${String(bill.sequence).padStart(4, "0")}`, name: bill.vendor.displayName, dueDate: bill.dueDate.toISOString(), amount: balance(bill), overdue: bill.dueDate < today })),
    },
    months,
    activity: { totalIncome, totalExpenses, netActivity: totalIncome - totalExpenses },
  };
};

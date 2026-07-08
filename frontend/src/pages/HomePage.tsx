import { Link } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { currency } from "../lib/format";
import type { Admin, Bill, Contact, DashboardSummary, Invoice, Item, Summary } from "../types";

type HomePageProps = {
  admin: Admin;
  bills: Bill[];
  customers: Contact[];
  invoices: Invoice[];
  items: Item[];
  summary: Summary;
  vendors: Contact[];
  onRefresh: () => Promise<void>;
};

type MonthValue = { key: string; label: string; income: number; purchases: number; incoming: number; outgoing: number; cash: number };

const fiscalYear = new Date().getFullYear();
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const dateKey = (value: string) => value.slice(0, 10);
const todayKey = () => {
  const now = new Date();
  const adjusted = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
};
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const compactMoney = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${currency.format(value / 1_000_000).replace(".00", "")}M`;
  if (Math.abs(value) >= 1_000) return `${currency.format(value / 1_000).replace(".00", "")}K`;
  return currency.format(value);
};
const isPaid = (status: string) => status.toLowerCase() === "paid";
const isCurrentYear = (value: string) => new Date(value).getFullYear() === fiscalYear;
const axisMax = (values: number[]) => Math.max(1, ...values.map((value) => Math.abs(value)));

const buildMonthly = (invoices: Invoice[], bills: Bill[], cashFlow?: DashboardSummary["cashFlow"]): MonthValue[] => {
  const months = monthLabels.map((label, index) => ({
    key: `${fiscalYear}-${String(index + 1).padStart(2, "0")}`,
    label,
    income: 0,
    purchases: 0,
    incoming: cashFlow?.monthly[index]?.incoming ?? 0,
    outgoing: cashFlow?.monthly[index]?.outgoing ?? 0,
    cash: cashFlow?.monthly[index]?.cash ?? 0,
  }));

  invoices.forEach((invoice) => {
    if (isCurrentYear(invoice.invoiceDate)) {
      const bucket = months[new Date(invoice.invoiceDate).getMonth()];
      if (bucket) bucket.income += invoice.total;
      if (!cashFlow && isPaid(invoice.status) && bucket) {
        bucket.incoming += invoice.total;
        bucket.cash += invoice.total;
      }
    }
  });
  bills.forEach((bill) => {
    if (isCurrentYear(bill.billDate)) {
      const bucket = months[new Date(bill.billDate).getMonth()];
      if (bucket) bucket.purchases += bill.total;
      if (!cashFlow && isPaid(bill.status) && bucket) {
        bucket.outgoing += bill.total;
        bucket.cash -= bill.total;
      }
    }
  });

  if (!cashFlow) {
    let running = 0;
    months.forEach((month) => {
      running += month.incoming - month.outgoing;
      month.cash = running;
    });
  }

  return months;
};

const TimelineChart = ({ months }: { months: MonthValue[] }) => {
  const max = axisMax(months.flatMap((month) => [month.incoming, month.outgoing, month.cash]));
  const points = months.map((month, index) => {
    const x = months.length === 1 ? 0 : index / (months.length - 1) * 100;
    const y = 78 - Math.max(0, month.cash) / max * 68;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");

  return (
    <div className="dashboard-flow-chart" role="img" aria-label="Cash movement by month">
      <svg viewBox="0 0 100 92" preserveAspectRatio="none">
        {[10, 27, 44, 61, 78].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} />)}
        <polyline points={points} />
      </svg>
      <div className="dashboard-flow-bars">
        {months.map((month) => (
          <span key={month.key}>
            <i className="is-incoming" style={{ height: `${Math.max(2, month.incoming / max * 100)}%` }} />
            <i className="is-outgoing" style={{ height: `${Math.max(2, month.outgoing / max * 100)}%` }} />
          </span>
        ))}
      </div>
      <div className="dashboard-month-axis">{months.map((month) => <span key={month.key}>{month.label}</span>)}</div>
    </div>
  );
};

const ComparisonChart = ({ months }: { months: MonthValue[] }) => {
  const max = axisMax(months.flatMap((month) => [month.income, month.purchases]));
  return (
    <div className="dashboard-comparison-chart" role="img" aria-label="Invoice income compared with bill purchases">
      {months.map((month) => (
        <span key={month.key}>
          <i className="is-income" style={{ width: `${month.income / max * 100}%` }} />
          <i className="is-purchases" style={{ width: `${month.purchases / max * 100}%` }} />
          <em>{month.label}</em>
        </span>
      ))}
    </div>
  );
};

const EmptyWidget = ({ children }: { children: string }) => (
  <div className="dashboard-soft-empty">
    <strong>{children}</strong>
    <span>The dashboard will keep this space ready as soon as records exist.</span>
  </div>
);

export const HomePage = ({ admin, bills, customers, invoices, items, onRefresh, summary, vendors }: HomePageProps) => {
  const today = todayKey();
  const dashboard = summary.dashboard;
  const monthly = useMemo(() => buildMonthly(invoices, bills, dashboard?.cashFlow), [bills, dashboard?.cashFlow, invoices]);
  const unpaidInvoices = useMemo(() => invoices.filter((invoice) => !isPaid(invoice.status)), [invoices]);
  const unpaidBills = useMemo(() => bills.filter((bill) => !isPaid(bill.status)), [bills]);
  const receivables = useMemo(() => {
    const current = unpaidInvoices.filter((invoice) => dateKey(invoice.dueDate) >= today).reduce((total, invoice) => total + invoice.total, 0);
    const overdue = unpaidInvoices.filter((invoice) => dateKey(invoice.dueDate) < today).reduce((total, invoice) => total + invoice.total, 0);
    const attention = [...unpaidInvoices].sort((left, right) => dateKey(left.dueDate).localeCompare(dateKey(right.dueDate))).slice(0, 4);
    return { current, overdue, outstanding: current + overdue, attention };
  }, [today, unpaidInvoices]);
  const payables = useMemo(() => {
    const current = unpaidBills.filter((bill) => dateKey(bill.dueDate) >= today).reduce((total, bill) => total + bill.total, 0);
    const overdue = unpaidBills.filter((bill) => dateKey(bill.dueDate) < today).reduce((total, bill) => total + bill.total, 0);
    const attention = [...unpaidBills].sort((left, right) => dateKey(left.dueDate).localeCompare(dateKey(right.dueDate))).slice(0, 4);
    return { current, overdue, outstanding: current + overdue, attention };
  }, [today, unpaidBills]);
  const income = invoices.filter((invoice) => isCurrentYear(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0);
  const purchases = bills.filter((bill) => isCurrentYear(bill.billDate)).reduce((total, bill) => total + bill.total, 0);
  const incoming = dashboard?.cashFlow.incoming ?? invoices.filter((invoice) => isPaid(invoice.status) && isCurrentYear(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0);
  const outgoing = dashboard?.cashFlow.outgoing ?? bills.filter((bill) => isPaid(bill.status) && isCurrentYear(bill.billDate)).reduce((total, bill) => total + bill.total, 0);
  const endingBalance = dashboard?.cashFlow.endingBalance ?? incoming - outgoing;
  const expenseRows = useMemo(() => {
    const totals = new Map<string, number>();
    bills.filter((bill) => isCurrentYear(bill.billDate)).forEach((bill) => {
      if (bill.lines.length === 0) totals.set(bill.vendor.displayName, (totals.get(bill.vendor.displayName) ?? 0) + bill.total);
      bill.lines.forEach((line) => {
        const item = items.find((entry) => entry.id === line.itemId);
        const label = item?.purchaseAccount || bill.vendor.displayName || line.itemName || "Purchases";
        totals.set(label, (totals.get(label) ?? 0) + line.amount);
      });
    });
    return Array.from(totals.entries()).map(([label, amount]) => ({ label, amount })).sort((left, right) => right.amount - left.amount).slice(0, 5);
  }, [bills, items]);
  const maxExpense = Math.max(1, ...expenseRows.map((row) => row.amount));

  useEffect(() => {
    const interval = window.setInterval(() => void onRefresh(), 30_000);
    return () => window.clearInterval(interval);
  }, [onRefresh]);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <p className="eyebrow">Home</p>
        <h1>{greeting()}, {admin.name || "there"}!</h1>
        <p>Live bookkeeping pulse for {customers.length} customers, {vendors.length} vendors, {items.length} catalog items, {invoices.length} invoices, and {bills.length} bills.</p>
      </section>

      <section className="dashboard-status-grid">
        <section className="panel dashboard-card dashboard-ledger-card">
          <header className="dashboard-card-head">
            <div><h2>Receivables</h2><p>Customer invoices waiting to become cash.</p></div>
            <Link className="ghost-button" to="/sales/invoices">Open invoices</Link>
          </header>
          <div className="dashboard-ledger-total">
            <span>Outstanding</span>
            <strong>{currency.format(receivables.outstanding)}</strong>
            <div><b>{currency.format(receivables.current)}</b> current <i /> <b className="is-overdue">{currency.format(receivables.overdue)}</b> overdue</div>
          </div>
          {receivables.attention.length ? (
            <div className="dashboard-attention-list">
              {receivables.attention.map((invoice) => (
                <Link className={dateKey(invoice.dueDate) < today ? "is-overdue" : ""} key={invoice.id} to="/sales/invoices">
                  <span><strong>{invoice.invoiceNumber}</strong><em>{invoice.customer.displayName} · due {dateLabel(invoice.dueDate)}</em></span>
                  <b>{currency.format(invoice.total)}</b>
                </Link>
              ))}
            </div>
          ) : <EmptyWidget>No unpaid invoices.</EmptyWidget>}
        </section>

        <section className="panel dashboard-card dashboard-ledger-card">
          <header className="dashboard-card-head">
            <div><h2>Payables</h2><p>Vendor bills that still need payment.</p></div>
            <Link className="ghost-button" to="/purchases/bills">Open bills</Link>
          </header>
          <div className="dashboard-ledger-total">
            <span>Outstanding</span>
            <strong>{currency.format(payables.outstanding)}</strong>
            <div><b>{currency.format(payables.current)}</b> current <i /> <b className="is-overdue">{currency.format(payables.overdue)}</b> overdue</div>
          </div>
          {payables.attention.length ? (
            <div className="dashboard-attention-list">
              {payables.attention.map((bill) => (
                <Link className={dateKey(bill.dueDate) < today ? "is-overdue" : ""} key={bill.id} to="/purchases/bills">
                  <span><strong>{bill.billNumber}</strong><em>{bill.vendor.displayName} · due {dateLabel(bill.dueDate)}</em></span>
                  <b>{currency.format(bill.total)}</b>
                </Link>
              ))}
            </div>
          ) : <EmptyWidget>No unpaid bills.</EmptyWidget>}
        </section>
      </section>

      <section className="panel dashboard-card dashboard-cash-card">
        <header className="dashboard-card-head">
          <div><h2>Cash Flow</h2><p>Recorded payments in and out during the fiscal year.</p></div>
          <span className="dashboard-live-chip">Refreshes automatically</span>
        </header>
        <div className="dashboard-cash-layout">
          <TimelineChart months={monthly} />
          <aside className="dashboard-cash-summary">
            <div><span>Beginning balance</span><strong>{currency.format(dashboard?.cashFlow.beginningBalance ?? 0)}</strong></div>
            <div><span>Incoming</span><strong className="is-positive">{currency.format(incoming)}</strong></div>
            <div><span>Outgoing</span><strong className="is-negative">{currency.format(outgoing)}</strong></div>
            <div><span>Ending balance</span><strong>{currency.format(endingBalance)}</strong></div>
          </aside>
        </div>
      </section>

      <section className="dashboard-lower-grid">
        <section className="panel dashboard-card dashboard-comparison-card">
          <header className="dashboard-card-head">
            <div><h2>Income vs Purchases</h2><p>Invoices issued compared with bills entered.</p></div>
          </header>
          <div className="dashboard-money-pair">
            <div><span>Income</span><strong>{currency.format(income)}</strong></div>
            <div><span>Purchases</span><strong>{currency.format(purchases)}</strong></div>
            <div><span>Net activity</span><strong>{currency.format(income - purchases)}</strong></div>
          </div>
          <ComparisonChart months={monthly} />
        </section>

        <section className="panel dashboard-card dashboard-expenses-card">
          <header className="dashboard-card-head">
            <div><h2>Top Expenses</h2><p>Largest purchase accounts or vendors this fiscal year.</p></div>
          </header>
          {expenseRows.length ? (
            <div className="dashboard-expense-list">
              {expenseRows.map((expense) => (
                <div className="dashboard-expense-row" key={expense.label}>
                  <div><strong>{expense.label}</strong><span>{compactMoney(expense.amount)}</span></div>
                  <i style={{ width: `${expense.amount / maxExpense * 100}%` }} />
                </div>
              ))}
            </div>
          ) : <EmptyWidget>No expense data recorded this fiscal year.</EmptyWidget>}
        </section>
      </section>
    </div>
  );
};

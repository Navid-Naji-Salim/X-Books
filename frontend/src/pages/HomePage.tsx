import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
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

type MonthValue = {
  key: string;
  label: string;
  income: number;
  purchases: number;
  incoming: number;
  outgoing: number;
  cash: number;
};

const fiscalYear = new Date().getFullYear();
const fiscalYearShort = String(fiscalYear).slice(-2);
const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

const buildMonthly = (invoices: Invoice[], bills: Bill[], dashboard?: DashboardSummary): MonthValue[] => {
  const cashFlow = dashboard?.cashFlow;
  const months = monthLabels.map((label, index) => ({
    key: `${fiscalYear}-${String(index + 1).padStart(2, "0")}`,
    label,
    income: dashboard?.incomeVsPurchases[index]?.income ?? 0,
    purchases: dashboard?.incomeVsPurchases[index]?.purchases ?? 0,
    incoming: cashFlow?.monthly[index]?.incoming ?? 0,
    outgoing: cashFlow?.monthly[index]?.outgoing ?? 0,
    cash: cashFlow?.monthly[index]?.cash ?? 0,
  }));

  invoices.forEach((invoice) => {
    if (!isCurrentYear(invoice.invoiceDate)) return;
    const bucket = months[new Date(invoice.invoiceDate).getMonth()];
    if (!bucket) return;
    if (!dashboard?.incomeVsPurchases) bucket.income += invoice.total;
    if (!cashFlow && isPaid(invoice.status)) bucket.incoming += invoice.total;
  });

  bills.forEach((bill) => {
    if (!isCurrentYear(bill.billDate)) return;
    const bucket = months[new Date(bill.billDate).getMonth()];
    if (!bucket) return;
    if (!dashboard?.incomeVsPurchases) bucket.purchases += bill.total;
    if (!cashFlow && isPaid(bill.status)) bucket.outgoing += bill.total;
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
  const width = 760;
  const height = 224;
  const plot = { left: 62, right: 12, top: 12, bottom: 38 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const values = months.flatMap((month) => [month.incoming, -month.outgoing, month.cash]);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(1, ...values);
  const range = maximum - minimum;
  const x = (index: number) => plot.left + index / (months.length - 1) * plotWidth;
  const y = (value: number) => plot.top + (maximum - value) / range * plotHeight;
  const ticks = Array.from({ length: 5 }, (_, index) => maximum - range * index / 4);
  const coordinates = months.map((month, index) => ({ x: x(index), y: y(month.cash) }));
  const balancePath = coordinates.reduce((path, point, index) => (
    index === 0 ? `M ${point.x} ${point.y}` : `${path} H ${point.x} V ${point.y}`
  ), "");

  return (
    <svg className="dashboard-financial-chart dashboard-cash-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Incoming money, outgoing money, and running cash balance by month for fiscal year ${fiscalYear}`}>
      {ticks.map((tick, index) => {
        const tickY = y(tick);
        return (
          <g className="dashboard-chart-grid" key={index}>
            <line x1={plot.left} x2={width - plot.right} y1={tickY} y2={tickY} />
            <text x={plot.left - 10} y={tickY + 3}>{compactMoney(tick)}</text>
          </g>
        );
      })}
      {months.map((month, index) => {
        const monthX = x(index);
        const baseline = y(0);
        const incomingY = y(month.incoming);
        const outgoingY = y(-month.outgoing);
        return (
          <g key={month.key}>
            {month.incoming > 0 && <g><title>{month.label} incoming: {currency.format(month.incoming)}</title><rect className="is-incoming" x={monthX - 10} y={incomingY} width="7" height={baseline - incomingY} /></g>}
            {month.outgoing > 0 && <g><title>{month.label} outgoing: {currency.format(month.outgoing)}</title><rect className="is-outgoing" x={monthX + 3} y={baseline} width="7" height={outgoingY - baseline} /></g>}
            <text className="dashboard-chart-month" x={monthX} y={height - 13}>{month.label} '{fiscalYearShort}</text>
          </g>
        );
      })}
      <path className="is-balance" d={balancePath} />
      <g><title>Ending balance: {currency.format(months.at(-1)?.cash ?? 0)}</title><circle className="is-balance-end" cx={coordinates.at(-1)?.x} cy={coordinates.at(-1)?.y} r="3.5" /></g>
    </svg>
  );
};

const ComparisonChart = ({ months }: { months: MonthValue[] }) => {
  const width = 600;
  const height = 210;
  const plot = { left: 56, right: 10, top: 12, bottom: 36 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maximum = Math.max(1, ...months.flatMap((month) => [month.income, month.purchases]));
  const x = (index: number) => plot.left + index / (months.length - 1) * plotWidth;
  const y = (value: number) => plot.top + (maximum - value) / maximum * plotHeight;
  const ticks = Array.from({ length: 4 }, (_, index) => maximum - maximum * index / 3);

  return (
    <svg className="dashboard-financial-chart dashboard-comparison-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Monthly income and purchases for fiscal year ${fiscalYear}`}>
      {ticks.map((tick, index) => {
        const tickY = y(tick);
        return (
          <g className="dashboard-chart-grid" key={index}>
            <line x1={plot.left} x2={width - plot.right} y1={tickY} y2={tickY} />
            <text x={plot.left - 9} y={tickY + 3}>{compactMoney(tick)}</text>
          </g>
        );
      })}
      {months.map((month, index) => {
        const monthX = x(index);
        return (
          <g key={month.key}>
            {month.income > 0 && <g><title>{month.label} income: {currency.format(month.income)}</title><rect className="is-income" x={monthX - 8} y={y(month.income)} width="7" height={plot.top + plotHeight - y(month.income)} /></g>}
            {month.purchases > 0 && <g><title>{month.label} purchases: {currency.format(month.purchases)}</title><rect className="is-purchases" x={monthX + 1} y={y(month.purchases)} width="7" height={plot.top + plotHeight - y(month.purchases)} /></g>}
            <text className="dashboard-chart-month" x={monthX} y={height - 12}>{month.label} '{fiscalYearShort}</text>
          </g>
        );
      })}
    </svg>
  );
};

const QuietEmpty = ({ children }: { children: ReactNode }) => (
  <p className="dashboard-quiet-empty">{children}</p>
);

export const HomePage = ({ admin, bills, invoices, items, onRefresh, summary }: HomePageProps) => {
  const today = todayKey();
  const dashboard = summary.dashboard;
  const monthly = useMemo(() => buildMonthly(invoices, bills, dashboard), [bills, dashboard, invoices]);
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
  const income = dashboard?.incomeVsPurchases.reduce((total, month) => total + month.income, 0)
    ?? invoices.filter((invoice) => isCurrentYear(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0);
  const purchases = dashboard?.incomeVsPurchases.reduce((total, month) => total + month.purchases, 0)
    ?? bills.filter((bill) => isCurrentYear(bill.billDate)).reduce((total, bill) => total + bill.total, 0);
  const incoming = dashboard?.cashFlow.incoming ?? invoices.filter((invoice) => isPaid(invoice.status) && isCurrentYear(invoice.invoiceDate)).reduce((total, invoice) => total + invoice.total, 0);
  const outgoing = dashboard?.cashFlow.outgoing ?? bills.filter((bill) => isPaid(bill.status) && isCurrentYear(bill.billDate)).reduce((total, bill) => total + bill.total, 0);
  const beginningBalance = dashboard?.cashFlow.beginningBalance ?? 0;
  const endingBalance = dashboard?.cashFlow.endingBalance ?? incoming - outgoing;
  const hasIncoming = incoming > 0;
  const hasOutgoing = outgoing > 0;
  const hasCashActivity = hasIncoming || hasOutgoing;
  const hasIncome = income > 0;
  const hasPurchases = purchases > 0;
  const hasAccrualActivity = hasIncome || hasPurchases;
  const asOfDate = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
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
        <h1>{greeting()}, {admin.name || "there"}</h1>
        <p>Your financial overview at a glance.</p>
      </section>

      <div className="dashboard-section-heading">
        <h2>Current position</h2>
        <p>As of {asOfDate}</p>
      </div>

      <section className="dashboard-status-grid">
        <section className="panel dashboard-card dashboard-ledger-card">
          <header className="dashboard-card-head">
            <div><h3>Receivables</h3><p>Customer invoices still to collect.</p></div>
            <Link className="dashboard-card-link" to="/sales/invoices">View invoices</Link>
          </header>
          <div className="dashboard-ledger-total">
            <span>Outstanding</span>
            <strong>{currency.format(receivables.outstanding)}</strong>
            {receivables.outstanding > 0 ? (
              <div>
                <span><b>{currency.format(receivables.current)}</b> current</span>
                {receivables.overdue > 0 && <span className="is-overdue"><b>{currency.format(receivables.overdue)}</b> overdue</span>}
              </div>
            ) : <QuietEmpty>No outstanding invoices</QuietEmpty>}
          </div>
          {receivables.attention.length > 0 && (
            <div className="dashboard-attention-list">
              {receivables.attention.map((invoice) => (
                <Link className={dateKey(invoice.dueDate) < today ? "is-overdue" : ""} key={invoice.id} to="/sales/invoices">
                  <span><strong>{invoice.invoiceNumber}</strong><em>{invoice.customer.displayName} · due {dateLabel(invoice.dueDate)}</em></span>
                  <b>{currency.format(invoice.total)}</b>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel dashboard-card dashboard-ledger-card">
          <header className="dashboard-card-head">
            <div><h3>Payables</h3><p>Vendor bills still to pay.</p></div>
            <Link className="dashboard-card-link" to="/purchases/bills">View bills</Link>
          </header>
          <div className="dashboard-ledger-total">
            <span>Outstanding</span>
            <strong>{currency.format(payables.outstanding)}</strong>
            {payables.outstanding > 0 ? (
              <div>
                <span><b>{currency.format(payables.current)}</b> current</span>
                {payables.overdue > 0 && <span className="is-overdue"><b>{currency.format(payables.overdue)}</b> overdue</span>}
              </div>
            ) : <QuietEmpty>No outstanding bills</QuietEmpty>}
          </div>
          {payables.attention.length > 0 && (
            <div className="dashboard-attention-list">
              {payables.attention.map((bill) => (
                <Link className={dateKey(bill.dueDate) < today ? "is-overdue" : ""} key={bill.id} to="/purchases/bills">
                  <span><strong>{bill.billNumber}</strong><em>{bill.vendor.displayName} · due {dateLabel(bill.dueDate)}</em></span>
                  <b>{currency.format(bill.total)}</b>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      <div className="dashboard-section-heading">
        <h2>Fiscal year activity</h2>
        <p>FY {fiscalYear}</p>
      </div>

      <section className="panel dashboard-card dashboard-cash-card">
        <header className="dashboard-card-head">
          <div><h3>Cash flow</h3><p>Payments received, payments made, and running balance.</p></div>
        </header>
        <div className={`dashboard-cash-metrics ${hasCashActivity ? "" : "is-empty"}`}>
          {hasCashActivity && <div><span>Beginning balance</span><strong>{currency.format(beginningBalance)}</strong></div>}
          {hasCashActivity && <div><span>Incoming</span><strong className={hasIncoming ? "is-positive" : ""}>{currency.format(incoming)}</strong></div>}
          {hasCashActivity && <div><span>Outgoing</span><strong className={hasOutgoing ? "is-negative" : ""}>{currency.format(outgoing)}</strong></div>}
          <div className="is-ending"><span>Ending balance</span><strong>{currency.format(endingBalance)}</strong></div>
        </div>
        {hasCashActivity ? (
          <div className="dashboard-chart-region">
            <div className="dashboard-chart-legend" aria-label="Cash flow chart legend">
              <span><i className="is-incoming" />Incoming</span>
              <span><i className="is-outgoing" />Outgoing</span>
              <span><i className="is-balance" />Running balance</span>
            </div>
            <TimelineChart months={monthly} />
          </div>
        ) : <QuietEmpty>No cash activity recorded in FY {fiscalYear}</QuietEmpty>}
      </section>

      {(hasAccrualActivity || expenseRows.length > 0) && (
        <section className={`dashboard-lower-grid ${hasAccrualActivity && expenseRows.length > 0 ? "" : "is-single"}`}>
          {hasAccrualActivity && <section className="panel dashboard-card dashboard-comparison-card">
            <header className="dashboard-card-head">
              <div><h3>Income vs purchases</h3><p>Invoices issued compared with bills entered.</p></div>
            </header>
            <div className="dashboard-money-pair">
              <div><span>Income</span><strong className={hasIncome ? "is-positive" : ""}>{currency.format(income)}</strong></div>
              <div><span>Purchases</span><strong className={hasPurchases ? "is-negative" : ""}>{currency.format(purchases)}</strong></div>
              <div><span>Net activity</span><strong>{currency.format(income - purchases)}</strong></div>
            </div>
            <div className="dashboard-chart-legend dashboard-comparison-legend" aria-label="Income and purchases chart legend">
              <span><i className="is-incoming" />Income</span>
              <span><i className="is-outgoing" />Purchases</span>
            </div>
            <ComparisonChart months={monthly} />
          </section>}

          {expenseRows.length > 0 && <section className="panel dashboard-card dashboard-expenses-card">
            <header className="dashboard-card-head">
              <div><h3>Top expenses</h3><p>Largest purchase accounts or vendors.</p></div>
            </header>
            <div className="dashboard-expense-list">
              {expenseRows.map((expense) => (
                <div className="dashboard-expense-row" key={expense.label}>
                  <div><strong>{expense.label}</strong><span>{compactMoney(expense.amount)}</span></div>
                  <i style={{ width: `${expense.amount / maxExpense * 100}%` }} />
                </div>
              ))}
            </div>
          </section>}
        </section>
      )}
    </div>
  );
};

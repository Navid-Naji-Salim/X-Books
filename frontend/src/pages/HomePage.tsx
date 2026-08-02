import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLanguage } from "../i18n";
import { currency } from "../lib/format";
import type { AccountAging, Summary, User } from "../types";

const compactAxisMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const standardAxisMoney = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const compactMoney = (value: number) => (Math.abs(value) >= 1000 ? compactAxisMoney : standardAxisMoney).format(value);
const fullMoney = (value: number) => currency.format(value);

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const AgingCard = ({ title, subtitle, data, to }: { title: string; subtitle: string; data: AccountAging; to: string }) => (
  <section className="panel home-aging-card">
    <div className="home-card-head"><div><span>{title}</span><strong>{fullMoney(data.outstanding)}</strong><small>{subtitle}</small></div><Link className="ghost-button home-aging-action" to={to}>View All</Link></div>
    <div className="home-aging-split"><div><span>Current</span><strong>{fullMoney(data.current)}</strong></div><div className={data.overdue > 0 ? "is-overdue" : ""}><span>Overdue</span><strong>{fullMoney(data.overdue)}</strong></div></div>
  </section>
);

const ChartTooltip = ({ active, payload, label }: any) => active && payload?.length ? <div className="home-chart-tooltip"><strong>{label}</strong>{payload.map((item: any) => <span key={item.dataKey}><i style={{ background: item.color }} />{item.name}: {fullMoney(Number(item.value))}</span>)}</div> : null;

type ActivitySummaryEntry = { label: string; value: number };

const ActivitySummary = ({ entries }: { entries: ActivitySummaryEntry[] }) => (
  <div className="home-activity-summary">
    {entries.map((entry) => <div key={entry.label}><span>{entry.label}</span><strong className={entry.value < 0 ? "is-negative" : ""}>{fullMoney(entry.value)}</strong></div>)}
  </div>
);

const summarizeCashFlow = (months: Summary["months"]) => {
  const incoming = months.reduce((total, month) => total + month.cashReceived, 0);
  const outgoing = months.reduce((total, month) => total + month.cashPaid, 0);
  return { incoming, outgoing, netActivity: incoming - outgoing };
};

const FinancialChart = ({ title, description, data, series, summary }: { title: string; description: string; data: Summary["months"]; series: Array<{ key: keyof Summary["months"][number]; label: string; color: string }>; summary?: ActivitySummaryEntry[] }) => {
  const { language } = useLanguage();
  const isRtl = language !== "en";
  const maximum = Math.max(0, ...data.flatMap((month) => series.map((item) => Number(month[item.key]))));
  return (
  <section className="panel home-chart-card" aria-label={title}>
    <div className="home-chart-head"><div><h2>{title}</h2><p>{description}</p></div>{summary ? <ActivitySummary entries={summary} /> : null}</div>
    <div className="home-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 18, right: 12, left: 10, bottom: 0 }} barGap={3} accessibilityLayer>
          <CartesianGrid stroke="#dbe3ed" strokeDasharray="3 4" vertical={false} />
          <XAxis dataKey="month" axisLine={false} reversed={isRtl} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
          <YAxis axisLine={false} orientation={isRtl ? "right" : "left"} tickLine={false} tickFormatter={compactMoney} tick={{ fill: "#64748b", fontSize: 12 }} ticks={maximum === 0 ? [0] : undefined} width={68} domain={[0, (max: number) => max === 0 ? 1 : Math.ceil(max * 1.15)]} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
          {series.map((item) => <Bar key={item.key} dataKey={item.key} name={item.label} fill={item.color} isAnimationActive={false} radius={[4, 4, 0, 0]} maxBarSize={34} minPointSize={(value) => Number(value) > 0 ? 2 : 0} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  </section>
  );
};

export const HomePage = ({ user, dataError, summary }: { user: User; dataError: string; summary: Summary }) => {
  const { language, t } = useLanguage();
  const cashFlow = summarizeCashFlow(summary.months);
  return (
    <div className="home-page">
      <header className="home-hero"><h1>{t(greeting())}{language === "en" ? ", " : "، "}<span translate="no">{user.name || "Nawid"}</span></h1><p>Your financial overview, clearly presented.</p></header>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <div className="home-aging-grid"><AgingCard title="Receivables" subtitle="Total Unpaid Invoices" data={summary.receivables} to="/sales/invoices" /><AgingCard title="Payables" subtitle="Total Unpaid Bills" data={summary.payables} to="/purchases/bills" /></div>
      <FinancialChart title="Cash Flow" description={`Cash received and paid by month · ${summary.year}`} data={summary.months} summary={[{ label: "Incoming", value: cashFlow.incoming }, { label: "Outgoing", value: cashFlow.outgoing }, { label: "Net Activity", value: cashFlow.netActivity }]} series={[{ key: "cashReceived", label: "Incoming Cash", color: "#15803d" }, { key: "cashPaid", label: "Outgoing Cash", color: "#dc2626" }]} />
      <FinancialChart title="Income vs Expenses" description={`Invoices and bills recorded by month · ${summary.year}`} data={summary.months} summary={[{ label: "Income", value: summary.activity.totalIncome }, { label: "Expenses", value: summary.activity.totalExpenses }, { label: "Net Activity", value: summary.activity.netActivity }]} series={[{ key: "income", label: "Invoice Income", color: "#15803d" }, { key: "expenses", label: "Recorded Expenses", color: "#dc2626" }]} />
    </div>
  );
};

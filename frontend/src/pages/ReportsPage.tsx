import { Link, Navigate, useParams } from "react-router-dom";
import { PageTitle } from "../components/PageTitle";
import { currency } from "../lib/format";
import type { Bill, Contact, Invoice } from "../types";

type Props = { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[] };
type Row = { label: string; value: number };
const reports = [
  { id: "profit-loss", title: "Profit & Loss", description: "Compare invoiced sales with recorded purchases and review net profit." },
  { id: "sales", title: "Sales Report", description: "Review invoice totals, payment status, customers, and sales activity." },
  { id: "purchases", title: "Purchases Report", description: "Review bill totals, payment status, vendors, and purchase activity." },
  { id: "customers", title: "Customers Report", description: "See customer activity, invoiced totals, and outstanding balances." },
  { id: "vendors", title: "Vendors Report", description: "See vendor activity, billed totals, and outstanding balances." },
] as const;

const BarChart = ({ rows }: { rows: Row[] }) => {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  return <div className="report-chart">{rows.length === 0 ? <div className="muted report-empty">No activity to chart yet.</div> : rows.map((row) => <div className="report-bar-row" key={row.label}><span>{row.label}</span><div><i style={{ width: `${Math.max(3, Math.abs(row.value) / max * 100)}%` }} /></div><strong>{currency.format(row.value)}</strong></div>)}</div>;
};

const Summary = ({ entries }: { entries: Array<[string, string]> }) => <div className="report-summary">{entries.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;
const status = (value: string) => <span className={`invoice-status ${value === "Paid" ? "is-paid" : "is-unpaid"}`}>{value}</span>;

export const ReportsPage = (props: Props) => {
  const { reportId } = useParams();
  if (!reportId) return <ReportLibrary />;
  const report = reports.find((entry) => entry.id === reportId);
  if (!report) return <Navigate to="/reports" replace />;
  return <ReportDetail {...props} id={report.id} title={report.title} description={report.description} />;
};

const ReportLibrary = () => <>
  <PageTitle eyebrow="Reports" title="Generated reports." description="Open a focused view of sales, purchases, customers, vendors, or profitability." />
  <section className="report-library">{reports.map((report) => <Link className="panel report-card" key={report.id} to={`/reports/${report.id}`}><div><span className="report-card-mark">↗</span><h2>{report.title}</h2><p>{report.description}</p></div><strong>View report <span aria-hidden="true">→</span></strong></Link>)}</section>
</>;

const ReportDetail = ({ id, title, description, bills, customers, invoices, vendors }: Props & { id: string; title: string; description: string }) => {
  const sales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const purchases = bills.reduce((sum, bill) => sum + bill.total, 0);
  const paidSales = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0);
  const paidPurchases = bills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.total, 0);
  const byMonth = (entries: Array<{ date: string; total: number }>) => Object.entries(entries.reduce<Record<string, number>>((result, entry) => { const key = new Date(entry.date).toLocaleDateString(undefined, { month: "short", year: "numeric" }); result[key] = (result[key] ?? 0) + entry.total; return result; }, {})).map(([label, value]) => ({ label, value }));
  const aggregate = (contacts: Contact[], entries: Array<{ contactId: string; total: number; status: string }>) => contacts.map((contact) => { const related = entries.filter((entry) => entry.contactId === contact.id); return { contact, count: related.length, total: related.reduce((sum, entry) => sum + entry.total, 0), outstanding: related.filter((entry) => entry.status !== "Paid").reduce((sum, entry) => sum + entry.total, 0) }; }).sort((a, b) => b.total - a.total);

  let content;
  if (id === "profit-loss") {
    const months = Array.from(new Set([...byMonth(invoices.map((entry) => ({ date: entry.invoiceDate, total: entry.total }))).map((row) => row.label), ...byMonth(bills.map((entry) => ({ date: entry.billDate, total: entry.total }))).map((row) => row.label)]));
    const salesMonths = new Map(byMonth(invoices.map((entry) => ({ date: entry.invoiceDate, total: entry.total }))).map((row) => [row.label, row.value]));
    const purchaseMonths = new Map(byMonth(bills.map((entry) => ({ date: entry.billDate, total: entry.total }))).map((row) => [row.label, row.value]));
    content = <><Summary entries={[["Sales", currency.format(sales)], ["Purchases", currency.format(purchases)], ["Net profit", currency.format(sales - purchases)]]} /><section className="panel report-section"><h2>Profit by period</h2><BarChart rows={months.map((label) => ({ label, value: (salesMonths.get(label) ?? 0) - (purchaseMonths.get(label) ?? 0) }))} /></section><section className="panel report-section"><h2>Profit & loss detail</h2><div className="table-wrap"><table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody><tr><td>Sales income</td><td><strong>{currency.format(sales)}</strong></td></tr><tr><td>Purchases</td><td><strong>-{currency.format(purchases)}</strong></td></tr><tr><td>Net profit</td><td><strong>{currency.format(sales - purchases)}</strong></td></tr></tbody></table></div></section></>;
  } else if (id === "sales") {
    content = <><Summary entries={[["Total sales", currency.format(sales)], ["Paid", currency.format(paidSales)], ["Outstanding", currency.format(sales - paidSales)]]} /><section className="panel report-section"><h2>Sales by period</h2><BarChart rows={byMonth(invoices.map((entry) => ({ date: entry.invoiceDate, total: entry.total })))} /></section><section className="panel report-section"><h2>Invoice detail</h2><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer.displayName}</td><td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td><td>{status(invoice.status)}</td><td><strong>{currency.format(invoice.total)}</strong></td></tr>) : <tr><td className="muted" colSpan={5}>No sales activity yet.</td></tr>}</tbody></table></div></section></>;
  } else if (id === "purchases") {
    content = <><Summary entries={[["Total purchases", currency.format(purchases)], ["Paid", currency.format(paidPurchases)], ["Outstanding", currency.format(purchases - paidPurchases)]]} /><section className="panel report-section"><h2>Purchases by period</h2><BarChart rows={byMonth(bills.map((entry) => ({ date: entry.billDate, total: entry.total })))} /></section><section className="panel report-section"><h2>Bill detail</h2><div className="table-wrap"><table><thead><tr><th>Bill</th><th>Vendor</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{bills.length ? bills.map((bill) => <tr key={bill.id}><td><strong>{bill.billNumber}</strong></td><td>{bill.vendor.displayName}</td><td>{new Date(bill.billDate).toLocaleDateString()}</td><td>{status(bill.status)}</td><td><strong>{currency.format(bill.total)}</strong></td></tr>) : <tr><td className="muted" colSpan={5}>No purchase activity yet.</td></tr>}</tbody></table></div></section></>;
  } else {
    const isCustomers = id === "customers";
    const rows = aggregate(isCustomers ? customers : vendors, isCustomers ? invoices.map((entry) => ({ contactId: entry.customerId, total: entry.total, status: entry.status })) : bills.map((entry) => ({ contactId: entry.vendorId, total: entry.total, status: entry.status })));
    content = <><section className="panel report-section"><h2>{isCustomers ? "Sales by customer" : "Purchases by vendor"}</h2><BarChart rows={rows.filter((row) => row.total > 0).slice(0, 8).map((row) => ({ label: row.contact.displayName, value: row.total }))} /></section><section className="panel report-section"><h2>{isCustomers ? "Customer" : "Vendor"} detail</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Transactions</th><th>Total</th><th>Outstanding</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.contact.id}><td><strong>{row.contact.displayName}</strong><br /><span className="muted">{row.contact.email || "No email"}</span></td><td>{row.count}</td><td><strong>{currency.format(row.total)}</strong></td><td>{currency.format(row.outstanding)}</td></tr>) : <tr><td className="muted" colSpan={4}>No {isCustomers ? "customers" : "vendors"} yet.</td></tr>}</tbody></table></div></section></>;
  }
  return <><Link className="report-back" to="/reports">← All reports</Link><PageTitle eyebrow="Reports" title={`${title}.`} description={description} /><div className="report-detail">{content}</div></>;
};

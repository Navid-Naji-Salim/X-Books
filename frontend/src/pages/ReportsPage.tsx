import { Link, Navigate, useParams } from "react-router-dom";
import { useRef, useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { api, ApiError } from "../api";
import { currency } from "../lib/format";
import type { Bill, Contact, Invoice } from "../types";

type Props = { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[]; token: string };
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

const inputDate = (date: Date) => { const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return adjusted.toISOString().slice(0, 10); };

const ReportDetail = ({ id, title, description, token }: Props & { id: string; title: string; description: string }) => {
  const today = new Date();
  const [fromDate, setFromDate] = useState(() => inputDate(new Date(today.getFullYear(), 0, 1)));
  const [toDate, setToDate] = useState(() => inputDate(today));
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<null | { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[]; fromDate: string; toDate: string; generatedAt: Date }>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const bills = generated?.bills ?? [];
  const customers = generated?.customers ?? [];
  const invoices = generated?.invoices ?? [];
  const vendors = generated?.vendors ?? [];
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
  const generate = async () => {
    if (!fromDate || !toDate || fromDate > toDate) { setError("Choose a valid date range."); return; }
    setError(""); setIsGenerating(true);
    try {
      const [freshInvoices, freshBills, freshCustomers, freshVendors] = await Promise.all([api.invoices(token), api.bills(token), api.customers(token), api.vendors(token)]);
      const inRange = (value: string) => { const date = value.slice(0, 10); return date >= fromDate && date <= toDate; };
      setGenerated({ invoices: freshInvoices.filter((invoice) => inRange(invoice.invoiceDate)), bills: freshBills.filter((bill) => inRange(bill.billDate)), customers: freshCustomers, vendors: freshVendors, fromDate, toDate, generatedAt: new Date() });
    } catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "Unable to generate the report."); }
    finally { setIsGenerating(false); }
  };
  const exportPdf = async () => {
    if (!previewRef.current || !generated) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    await pdf.html(previewRef.current, { margin: [28, 28, 28, 28], autoPaging: "text", width: 539, windowWidth: 900, html2canvas: { scale: 0.72, backgroundColor: "#ffffff" } });
    pdf.save(`${id}-${generated.fromDate}-${generated.toDate}.pdf`);
  };
  return <><Link className="report-back report-screen-only" to="/reports">← All reports</Link><PageTitle eyebrow="Reports" title={`${title}.`} description={description} />
    <section className="panel report-generator report-screen-only"><div className="report-range"><div className="field"><label htmlFor="reportFrom">From</label><input id="reportFrom" type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} /></div><div className="field"><label htmlFor="reportTo">To</label><input id="reportTo" type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} /></div></div><button className="button" disabled={isGenerating} type="button" onClick={() => void generate()}>{isGenerating ? "Generating..." : "Generate report"}</button><div className="message">{error}</div></section>
    {generated ? <><div className="report-actions report-screen-only"><button className="ghost-button" type="button" onClick={() => window.print()}>Print</button><button className="button" type="button" onClick={() => void exportPdf()}>Export as PDF</button></div><div className="report-document" ref={previewRef}><header className="report-document-head"><div><span>XBooks</span><h1>{title}</h1></div><dl><div><dt>Report period</dt><dd>{new Date(`${generated.fromDate}T00:00:00`).toLocaleDateString()} – {new Date(`${generated.toDate}T00:00:00`).toLocaleDateString()}</dd></div><div><dt>Generated</dt><dd>{generated.generatedAt.toLocaleString()}</dd></div></dl></header><div className="report-detail">{content}</div></div></> : <div className="empty-state report-screen-only">Choose a date range and generate this report.</div>}
  </>;
};

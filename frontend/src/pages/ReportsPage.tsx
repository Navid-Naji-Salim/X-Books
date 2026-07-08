import { Link, Navigate, useParams } from "react-router-dom";
import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { api, ApiError } from "../api";
import { currency } from "../lib/format";
import type { Bill, Contact, Invoice } from "../types";

type Props = { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[]; token: string };
const reports = [
  { id: "profit-loss", title: "Profit & Loss", description: "Compare invoiced sales with recorded purchases and review net profit." },
  { id: "sales", title: "Sales Report", description: "Review invoice totals, payment status, customers, and sales activity." },
  { id: "purchases", title: "Purchases Report", description: "Review bill totals, payment status, vendors, and purchase activity." },
  { id: "customers", title: "Customers Report", description: "See customer activity, invoiced totals, and outstanding balances." },
  { id: "vendors", title: "Vendors Report", description: "See vendor activity, billed totals, and outstanding balances." },
] as const;

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
  const bills = generated?.bills ?? [];
  const customers = generated?.customers ?? [];
  const invoices = generated?.invoices ?? [];
  const vendors = generated?.vendors ?? [];
  const sales = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const purchases = bills.reduce((sum, bill) => sum + bill.total, 0);
  const paidSales = invoices.filter((invoice) => invoice.status === "Paid").reduce((sum, invoice) => sum + invoice.total, 0);
  const paidPurchases = bills.filter((bill) => bill.status === "Paid").reduce((sum, bill) => sum + bill.total, 0);
  const aggregate = (contacts: Contact[], entries: Array<{ contactId: string; total: number; status: string }>) => contacts.map((contact) => { const related = entries.filter((entry) => entry.contactId === contact.id); return { contact, count: related.length, total: related.reduce((sum, entry) => sum + entry.total, 0), outstanding: related.filter((entry) => entry.status !== "Paid").reduce((sum, entry) => sum + entry.total, 0) }; }).sort((a, b) => b.total - a.total);

  let content;
  let pdfSummary: Array<[string, string]> = [];
  let pdfHeaders: string[] = [];
  let pdfRows: string[][] = [];
  if (id === "profit-loss") {
    pdfSummary = [["Sales", currency.format(sales)], ["Purchases", currency.format(purchases)], ["Net profit", currency.format(sales - purchases)]];
    pdfHeaders = ["Category", "Amount"]; pdfRows = [["Sales income", currency.format(sales)], ["Purchases", `-${currency.format(purchases)}`], ["Net profit", currency.format(sales - purchases)]];
    content = <><Summary entries={pdfSummary} /><section className="report-section"><h2>Profit & loss detail</h2><div className="table-wrap"><table><thead><tr><th>Category</th><th>Amount</th></tr></thead><tbody>{pdfRows.map((row) => <tr key={row[0]}><td>{row[0]}</td><td><strong>{row[1]}</strong></td></tr>)}</tbody></table></div></section></>;
  } else if (id === "sales") {
    pdfSummary = [["Total sales", currency.format(sales)], ["Paid", currency.format(paidSales)], ["Outstanding", currency.format(sales - paidSales)]];
    pdfHeaders = ["Invoice", "Customer", "Date", "Status", "Total"]; pdfRows = invoices.map((invoice) => [invoice.invoiceNumber, invoice.customer.displayName, new Date(invoice.invoiceDate).toLocaleDateString(), invoice.status, currency.format(invoice.total)]);
    content = <><Summary entries={pdfSummary} /><section className="report-section"><h2>Invoice detail</h2><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{invoices.length ? invoices.map((invoice) => <tr key={invoice.id}><td><strong>{invoice.invoiceNumber}</strong></td><td>{invoice.customer.displayName}</td><td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td><td>{status(invoice.status)}</td><td><strong>{currency.format(invoice.total)}</strong></td></tr>) : <tr><td className="muted" colSpan={5}>No sales activity yet.</td></tr>}</tbody></table></div></section></>;
  } else if (id === "purchases") {
    pdfSummary = [["Total purchases", currency.format(purchases)], ["Paid", currency.format(paidPurchases)], ["Outstanding", currency.format(purchases - paidPurchases)]];
    pdfHeaders = ["Bill", "Vendor", "Date", "Status", "Total"]; pdfRows = bills.map((bill) => [bill.billNumber, bill.vendor.displayName, new Date(bill.billDate).toLocaleDateString(), bill.status, currency.format(bill.total)]);
    content = <><Summary entries={pdfSummary} /><section className="report-section"><h2>Bill detail</h2><div className="table-wrap"><table><thead><tr><th>Bill</th><th>Vendor</th><th>Date</th><th>Status</th><th>Total</th></tr></thead><tbody>{bills.length ? bills.map((bill) => <tr key={bill.id}><td><strong>{bill.billNumber}</strong></td><td>{bill.vendor.displayName}</td><td>{new Date(bill.billDate).toLocaleDateString()}</td><td>{status(bill.status)}</td><td><strong>{currency.format(bill.total)}</strong></td></tr>) : <tr><td className="muted" colSpan={5}>No purchase activity yet.</td></tr>}</tbody></table></div></section></>;
  } else {
    const isCustomers = id === "customers";
    const rows = aggregate(isCustomers ? customers : vendors, isCustomers ? invoices.map((entry) => ({ contactId: entry.customerId, total: entry.total, status: entry.status })) : bills.map((entry) => ({ contactId: entry.vendorId, total: entry.total, status: entry.status })));
    const total = rows.reduce((sum, row) => sum + row.total, 0); const outstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);
    pdfSummary = [[isCustomers ? "Customers" : "Vendors", String(rows.length)], ["Transaction total", currency.format(total)], ["Outstanding", currency.format(outstanding)]];
    pdfHeaders = ["Name", "Transactions", "Total", "Outstanding"]; pdfRows = rows.map((row) => [row.contact.displayName, String(row.count), currency.format(row.total), currency.format(row.outstanding)]);
    content = <><Summary entries={pdfSummary} /><section className="report-section"><h2>{isCustomers ? "Customer" : "Vendor"} detail</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Transactions</th><th>Total</th><th>Outstanding</th></tr></thead><tbody>{rows.length ? rows.map((row) => <tr key={row.contact.id}><td><strong>{row.contact.displayName}</strong><br /><span className="muted">{row.contact.email || "No email"}</span></td><td>{row.count}</td><td><strong>{currency.format(row.total)}</strong></td><td>{currency.format(row.outstanding)}</td></tr>) : <tr><td className="muted" colSpan={4}>No {isCustomers ? "customers" : "vendors"} yet.</td></tr>}</tbody></table></div></section></>;
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
    if (!generated) return;
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const margin = 42; const pageWidth = pdf.internal.pageSize.getWidth(); const pageHeight = pdf.internal.pageSize.getHeight(); const usable = pageWidth - margin * 2;
    let y = margin;
    pdf.setTextColor(3, 105, 161); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("XBooks", margin, y);
    y += 25; pdf.setTextColor(20, 33, 61); pdf.setFontSize(22); pdf.text(title, margin, y);
    y += 20; pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105);
    pdf.text(`Report period: ${new Date(`${generated.fromDate}T00:00:00`).toLocaleDateString()} - ${new Date(`${generated.toDate}T00:00:00`).toLocaleDateString()}`, margin, y);
    pdf.text(`Generated: ${generated.generatedAt.toLocaleString()}`, pageWidth - margin, y, { align: "right" });
    y += 14; pdf.setDrawColor(148, 163, 184); pdf.line(margin, y, pageWidth - margin, y); y += 20;
    pdfSummary.forEach(([label, value]) => { pdf.setFont("helvetica", "normal"); pdf.setTextColor(71, 85, 105); pdf.text(label, margin, y); pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 33, 61); pdf.text(value, pageWidth - margin, y, { align: "right" }); y += 18; });
    y += 8;
    const columnWidth = usable / Math.max(1, pdfHeaders.length);
    const drawHeader = () => { pdf.setFillColor(241, 245, 249); pdf.rect(margin, y, usable, 22, "F"); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(30, 41, 59); pdfHeaders.forEach((header, index) => pdf.text(header, margin + index * columnWidth + 5, y + 14)); y += 22; };
    if (pdfHeaders.length) drawHeader();
    pdf.setFontSize(8); pdf.setFont("helvetica", "normal");
    for (const row of pdfRows) {
      const cells = row.map((cell) => pdf.splitTextToSize(cell, columnWidth - 10) as string[]);
      const rowHeight = Math.max(22, ...cells.map((cell) => cell.length * 10 + 8));
      if (y + rowHeight > pageHeight - margin) { pdf.addPage(); y = margin; drawHeader(); pdf.setFont("helvetica", "normal"); }
      pdf.setDrawColor(226, 232, 240); pdf.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
      pdf.setTextColor(30, 41, 59); cells.forEach((cell, index) => pdf.text(cell, margin + index * columnWidth + 5, y + 13));
      y += rowHeight;
    }
    pdf.save(`${id}-${generated.fromDate}-${generated.toDate}.pdf`);
  };
  return <><Link className="report-back report-screen-only" to="/reports">← All reports</Link><PageTitle eyebrow="Reports" title={`${title}.`} description={description} />
    <section className="panel report-generator report-screen-only"><div className="report-range"><div className="field"><label htmlFor="reportFrom">From</label><input id="reportFrom" type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} /></div><div className="field"><label htmlFor="reportTo">To</label><input id="reportTo" type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} /></div></div><button className="button" disabled={isGenerating} type="button" onClick={() => void generate()}>{isGenerating ? "Generating..." : "Generate report"}</button><div className="message">{error}</div></section>
    {generated ? <><div className="report-actions report-screen-only"><button className="ghost-button" type="button" onClick={() => window.print()}>Print</button><button className="button" type="button" onClick={() => void exportPdf()}>Export as PDF</button></div><div className="report-document"><header className="report-document-head"><div><span>XBooks</span><h1>{title}</h1></div><dl><div><dt>Report period</dt><dd>{new Date(`${generated.fromDate}T00:00:00`).toLocaleDateString()} – {new Date(`${generated.toDate}T00:00:00`).toLocaleDateString()}</dd></div><div><dt>Generated</dt><dd>{generated.generatedAt.toLocaleString()}</dd></div></dl></header><div className="report-detail">{content}</div></div></> : <div className="empty-state report-screen-only">Choose a date range and generate this report.</div>}
  </>;
};

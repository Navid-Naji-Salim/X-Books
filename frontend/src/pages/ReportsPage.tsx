import { Link, Navigate, useParams } from "react-router-dom";
import { useState } from "react";
import { PageTitle } from "../components/PageTitle";
import { api, ApiError } from "../api";
import { currency } from "../lib/format";
import type { Bill, Contact, Invoice } from "../types";
import { useLanguage } from "../i18n";

type Props = { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[]; token: string };
const reports = [
  { id: "profit-loss", title: "Profit & Loss", description: "Compare invoiced sales with recorded purchases and review net profit." },
  { id: "sales", title: "Sales Report", description: "Review invoice totals, payment status, customers, and sales activity." },
  { id: "purchases", title: "Purchases Report", description: "Review bill totals, payment status, vendors, and purchase activity." },
  { id: "customers", title: "Customers Report", description: "See customer activity, invoiced totals, and outstanding balances." },
  { id: "vendors", title: "Vendors Report", description: "See vendor activity, billed totals, and outstanding balances." },
] as const;

const Summary = ({ entries }: { entries: Array<[string, string]> }) => <div className="report-summary">{entries.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;

export const ReportsPage = (props: Props) => {
  const { reportId } = useParams();
  if (!reportId) return <ReportLibrary />;
  const report = reports.find((entry) => entry.id === reportId);
  if (!report) return <Navigate to="/reports" replace />;
  return <ReportDetail {...props} id={report.id} title={report.title} description={report.description} />;
};

const ReportLibrary = () => {
  const { language } = useLanguage();
  const isRtl = language !== "en";

  return <>
    <PageTitle eyebrow="Reports" title="Generated reports." description="Open a focused view of sales, purchases, customers, vendors, or profitability." />
    <section className="report-library">{reports.map((report) => <Link className="panel report-card" key={report.id} to={`/reports/${report.id}`}><div><span className="report-card-mark">{isRtl ? "↖" : "↗"}</span><h2>{report.title}</h2><p>{report.description}</p></div><strong>View report <span aria-hidden="true">{isRtl ? "←" : "→"}</span></strong></Link>)}</section>
  </>;
};

const inputDate = (date: Date) => { const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return adjusted.toISOString().slice(0, 10); };
const reportDate = (value: string | Date) => typeof value === "string" && !value ? "—" : new Date(typeof value === "string" ? `${value}T00:00:00` : value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const generatedTime = (value: Date) => `${reportDate(value)}, ${value.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;

const ReportDetail = ({ id, title, description, token }: Props & { id: string; title: string; description: string }) => {
  const { language } = useLanguage();
  const isRtl = language !== "en";
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
  const aggregate = (contacts: Contact[], entries: Array<{ contactId: string; total: number; status: string }>) => {
    const totals = new Map<string, { count: number; total: number; outstanding: number }>();
    entries.forEach((entry) => {
      const current = totals.get(entry.contactId) ?? { count: 0, total: 0, outstanding: 0 };
      current.count += 1; current.total += entry.total;
      if (entry.status !== "Paid") current.outstanding += entry.total;
      totals.set(entry.contactId, current);
    });
    return contacts.map((contact) => ({ contact, ...(totals.get(contact.id) ?? { count: 0, total: 0, outstanding: 0 }) })).sort((a, b) => b.total - a.total);
  };

  let pdfSummary: Array<[string, string]> = [];
  let pdfHeaders: string[] = [];
  let pdfRows: string[][] = [];
  let detailTitle = "Report Details";
  if (id === "profit-loss") {
    detailTitle = "Profit & Loss Details";
    pdfSummary = [["Sales", currency.format(sales)], ["Purchases", currency.format(purchases)], ["Net profit", currency.format(sales - purchases)]];
    pdfHeaders = ["Category", "Amount"]; pdfRows = [["Sales income", currency.format(sales)], ["Purchases", `-${currency.format(purchases)}`], ["Net profit", currency.format(sales - purchases)]];
  } else if (id === "sales") {
    detailTitle = "Invoice Details";
    pdfSummary = [["Total sales", currency.format(sales)], ["Paid", currency.format(paidSales)], ["Outstanding", currency.format(sales - paidSales)]];
    pdfHeaders = ["Invoice", "Customer", "Date", "Status", "Total"]; pdfRows = invoices.map((invoice) => [invoice.invoiceNumber, invoice.customer.displayName, new Date(invoice.invoiceDate).toLocaleDateString(), invoice.status, currency.format(invoice.total)]);
  } else if (id === "purchases") {
    detailTitle = "Bill Details";
    pdfSummary = [["Total purchases", currency.format(purchases)], ["Paid", currency.format(paidPurchases)], ["Outstanding", currency.format(purchases - paidPurchases)]];
    pdfHeaders = ["Bill", "Vendor", "Date", "Status", "Total"]; pdfRows = bills.map((bill) => [bill.billNumber, bill.vendor.displayName, new Date(bill.billDate).toLocaleDateString(), bill.status, currency.format(bill.total)]);
  } else {
    const isCustomers = id === "customers";
    detailTitle = `${isCustomers ? "Customer" : "Vendor"} Details`;
    const rows = aggregate(isCustomers ? customers : vendors, isCustomers ? invoices.map((entry) => ({ contactId: entry.customerId, total: entry.total, status: entry.status })) : bills.map((entry) => ({ contactId: entry.vendorId, total: entry.total, status: entry.status })));
    const total = rows.reduce((sum, row) => sum + row.total, 0); const outstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);
    pdfSummary = [[isCustomers ? "Customers" : "Vendors", String(rows.length)], ["Transaction total", currency.format(total)], ["Outstanding", currency.format(outstanding)]];
    pdfHeaders = ["Name", "Transactions", "Total", "Outstanding"]; pdfRows = rows.map((row) => [row.contact.displayName, String(row.count), currency.format(row.total), currency.format(row.outstanding)]);
  }
  const firstPageCapacity = 16;
  const continuedPageCapacity = 24;
  const paginatedRows = (() => {
    if (pdfRows.length === 0) return [([] as string[][])];
    const pages: string[][][] = [pdfRows.slice(0, firstPageCapacity)];
    for (let index = firstPageCapacity; index < pdfRows.length; index += continuedPageCapacity) pages.push(pdfRows.slice(index, index + continuedPageCapacity));
    return pages;
  })();
  const templateRows = id === "profit-loss" ? pdfRows.map((row) => row.map((cell, index) => index === 0 ? cell : "")) : [pdfHeaders.map(() => "")];
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
    const margin = 42; const pageWidth = pdf.internal.pageSize.getWidth(); const usable = pageWidth - margin * 2; const columnWidth = usable / Math.max(1, pdfHeaders.length);
    const fit = (value: string, width: number) => { let result = value; while (result.length > 1 && pdf.getTextWidth(result) > width) result = `${result.slice(0, -2)}…`; return result; };
    const drawDocumentHeader = (pageIndex: number) => {
      let y = margin;
      pdf.setTextColor(3, 105, 161); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("XBooks", margin, y);
      y += 25; pdf.setTextColor(20, 33, 61); pdf.setFontSize(22); pdf.text(title, margin, y);
      y += 20; pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(71, 85, 105);
      pdf.text(`Report period: ${reportDate(generated.fromDate)} – ${reportDate(generated.toDate)}`, margin, y);
      pdf.text(`Generated: ${generatedTime(generated.generatedAt)}`, pageWidth - margin, y, { align: "right" });
      y += 14; pdf.setDrawColor(148, 163, 184); pdf.line(margin, y, pageWidth - margin, y); y += 20;
      if (pageIndex === 0) pdfSummary.forEach(([label, value]) => { pdf.setFont("helvetica", "normal"); pdf.setTextColor(71, 85, 105); pdf.text(label, margin, y); pdf.setFont("helvetica", "bold"); pdf.setTextColor(20, 33, 61); pdf.text(value, pageWidth - margin, y, { align: "right" }); y += 18; });
      y += 8; pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(30, 41, 59); pdf.text(detailTitle, margin, y); y += 8; pdf.setDrawColor(148, 163, 184); pdf.line(margin, y, pageWidth - margin, y); y += 10;
      pdf.setFillColor(241, 245, 249); pdf.rect(margin, y, usable, 22, "F"); pdf.setFontSize(8); pdfHeaders.forEach((header, index) => pdf.text(fit(header, columnWidth - 10), margin + index * columnWidth + 5, y + 14));
      return y + 22;
    };
    paginatedRows.forEach((rows, pageIndex) => {
      if (pageIndex > 0) pdf.addPage();
      let y = drawDocumentHeader(pageIndex); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8);
      rows.forEach((row) => { pdf.setDrawColor(226, 232, 240); pdf.line(margin, y + 22, pageWidth - margin, y + 22); pdf.setTextColor(30, 41, 59); row.forEach((cell, index) => pdf.text(fit(cell, columnWidth - 10), margin + index * columnWidth + 5, y + 14)); y += 22; });
    });
    pdf.save(`${id}-${generated.fromDate}-${generated.toDate}.pdf`);
  };
  return <div className="report-page"><header className="report-page-head report-screen-only"><Link className="report-back" to="/reports"><span aria-hidden="true">{isRtl ? "→" : "←"}</span> <span>Reports</span></Link><h1>{title}</h1><p>{description}</p></header>
    <section className="report-toolbar report-screen-only"><div className="field"><label htmlFor="reportFrom">From</label><input id="reportFrom" type="date" value={fromDate} onChange={(event) => setFromDate(event.currentTarget.value)} /></div><div className="field"><label htmlFor="reportTo">To</label><input id="reportTo" type="date" value={toDate} onChange={(event) => setToDate(event.currentTarget.value)} /></div><button className="button" disabled={isGenerating} type="button" onClick={() => void generate()}>{isGenerating ? "Generating..." : "Generate report"}</button><div className="message">{error}</div></section>
    <section className="report-viewer">{generated ? <div className="report-document-shell"><div className="report-document-actions report-screen-only"><span>{paginatedRows.length} page{paginatedRows.length === 1 ? "" : "s"}</span><div><button className="ghost-button" type="button" onClick={() => window.print()}>Print</button><button className="button" type="button" onClick={() => void exportPdf()}>Export PDF</button></div></div><div className="report-pages">{paginatedRows.map((rows, pageIndex) => <article className="report-document" key={pageIndex}><header className="report-document-head"><span>XBooks</span><h1>{title}</h1><div className="report-document-meta"><span>Report period: {reportDate(generated.fromDate)} – {reportDate(generated.toDate)}</span><span>Generated: {generatedTime(generated.generatedAt)}</span></div></header><div className="report-detail">{pageIndex === 0 ? <Summary entries={pdfSummary} /> : null}<section className="report-section"><h2>{detailTitle}</h2><div className="table-wrap"><table><thead><tr>{pdfHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <strong>{cell}</strong> : cell}</td>)}</tr>) : <tr><td className="muted" colSpan={Math.max(1, pdfHeaders.length)}>No activity in this period.</td></tr>}</tbody></table></div></section></div></article>)}</div></div> : <div className="report-document-shell report-template-shell"><article className="report-document report-document-template"><header className="report-document-head"><span>XBooks</span><h1>{title}</h1><div className="report-document-meta"><span>Report period: {reportDate(fromDate)} – {reportDate(toDate)}</span><span>Generated: —</span></div></header><div className="report-detail"><div className="report-template-summary" aria-hidden="true">{pdfSummary.map(([label]) => <div key={label}><span>{label}</span><i /></div>)}</div><section className="report-section"><h2>{detailTitle}</h2><div className="table-wrap"><table><thead><tr>{pdfHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{templateRows.map((row, rowIndex) => <tr className="report-template-row" key={rowIndex}>{row.map((cell, column) => <td key={`${pdfHeaders[column]}-${column}`}>{cell || column === 0 && id === "profit-loss" ? cell : <i />}</td>)}</tr>)}</tbody></table></div><p className="report-template-message">Choose a date range and generate this report.</p></section></div></article></div>}</section>
  </div>;
};

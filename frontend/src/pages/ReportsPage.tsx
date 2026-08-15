import { useRef, useState } from "react";
import { api, ApiError } from "../api";
import { DropdownField } from "../components/FormControls";
import { DateField } from "../components/DateField";
import { companyAddressLine, companyContactLine } from "../components/CompanyDocumentIdentity";
import { formatLocalizedDate, useLanguage } from "../i18n";
import { currency } from "../lib/format";
import type { Bill, CompanyProfile, Contact, Invoice } from "../types";
import { reports, type ReportId } from "../reportDefinitions";

type Props = { company: CompanyProfile; token: string };

const Summary = ({ entries }: { entries: Array<[string, string]> }) => <div className="report-summary">{entries.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>;

const inputDate = (date: Date) => { const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000); return adjusted.toISOString().slice(0, 10); };
export const ReportsPage = ({ company, token }: Props) => {
  const { language, t } = useLanguage();
  const locale = language === "ku" ? "ckb" : language === "ar" ? "ar-IQ" : "en-GB";
  const reportDate = (value: string | Date) => typeof value === "string" && !value ? "—" : formatLocalizedDate(value, language, "long");
  const generatedTime = (value: Date) => `${reportDate(value)}, ${value.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" })}`;
  const reportPagesRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const [id, setId] = useState<ReportId>("profit-loss");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState(() => inputDate(new Date(today.getFullYear(), 0, 1)));
  const [toDate, setToDate] = useState(() => inputDate(today));
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<null | { bills: Bill[]; customers: Contact[]; invoices: Invoice[]; vendors: Contact[]; fromDate: string; toDate: string; generatedAt: Date }>(null);
  const report = reports.find((entry) => entry.id === id) ?? reports[0];
  const { title, description } = report;
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
    pdfSummary = [["Sales", currency.format(sales)], ["Purchases", currency.format(purchases)], ["Net Profit", currency.format(sales - purchases)]];
    pdfHeaders = ["Category", "Amount"]; pdfRows = [["Sales Income", currency.format(sales)], ["Purchases", `-${currency.format(purchases)}`], ["Net Profit", currency.format(sales - purchases)]];
  } else if (id === "sales") {
    detailTitle = "Invoice Details";
    pdfSummary = [["Total Sales", currency.format(sales)], ["Paid", currency.format(paidSales)], ["Outstanding", currency.format(sales - paidSales)]];
    pdfHeaders = ["Invoice", "Customer", "Date", "Status", "Total"]; pdfRows = invoices.map((invoice) => [invoice.invoiceNumber, invoice.customer.displayName, formatLocalizedDate(invoice.invoiceDate, language), invoice.status, currency.format(invoice.total)]);
  } else if (id === "purchases") {
    detailTitle = "Bill Details";
    pdfSummary = [["Total Purchases", currency.format(purchases)], ["Paid", currency.format(paidPurchases)], ["Outstanding", currency.format(purchases - paidPurchases)]];
    pdfHeaders = ["Bill", "Vendor", "Date", "Status", "Total"]; pdfRows = bills.map((bill) => [bill.billNumber, bill.vendor.displayName, formatLocalizedDate(bill.billDate, language), bill.status, currency.format(bill.total)]);
  } else {
    const isCustomers = id === "customers";
    detailTitle = `${isCustomers ? "Customer" : "Vendor"} Details`;
    const rows = aggregate(isCustomers ? customers : vendors, isCustomers ? invoices.map((entry) => ({ contactId: entry.customerId, total: entry.total, status: entry.status })) : bills.map((entry) => ({ contactId: entry.vendorId, total: entry.total, status: entry.status })));
    const total = rows.reduce((sum, row) => sum + row.total, 0); const outstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);
    pdfSummary = [[isCustomers ? "Customers" : "Vendors", String(rows.length)], ["Transaction Total", currency.format(total)], ["Outstanding", currency.format(outstanding)]];
    pdfHeaders = ["Name", "Transactions", "Total", "Outstanding"]; pdfRows = rows.map((row) => [row.contact.displayName, String(row.count), currency.format(row.total), currency.format(row.outstanding)]);
  }
  const localizedPdfHeaders = pdfHeaders.map(t);
  const localizedPdfRows = pdfRows.map((row) => row.map((cell, column) => {
    if (id === "profit-loss" && column === 0) return t(cell);
    if ((id === "sales" || id === "purchases") && column === 3) return t(cell);
    return cell;
  }));
  const firstPageCapacity = 16;
  const continuedPageCapacity = 24;
  const paginatedRows = (() => {
    if (localizedPdfRows.length === 0) return [([] as string[][])];
    const pages: string[][][] = [localizedPdfRows.slice(0, firstPageCapacity)];
    for (let index = firstPageCapacity; index < localizedPdfRows.length; index += continuedPageCapacity) pages.push(localizedPdfRows.slice(index, index + continuedPageCapacity));
    return pages;
  })();
  const templateRows = id === "profit-loss" ? localizedPdfRows.map((row) => row.map((cell, index) => index === 0 ? cell : "")) : [localizedPdfHeaders.map(() => "")];
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
    if (!generated || !reportPagesRef.current) return;
    await document.fonts.ready;
    const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import("jspdf"), import("html2canvas")]);
    const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pages = Array.from(reportPagesRef.current.querySelectorAll<HTMLElement>(".report-document"));
    for (const [pageIndex, page] of pages.entries()) {
      const previousContentVisibility = page.style.contentVisibility;
      page.style.contentVisibility = "visible";
      let canvas: HTMLCanvasElement;
      try {
        canvas = await html2canvas(page, { backgroundColor: "#ffffff", logging: false, scale: 2, useCORS: true });
      } finally {
        page.style.contentVisibility = previousContentVisibility;
      }
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(canvas, "PNG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }
    pdf.save(`${id}-${generated.fromDate}-${generated.toDate}.pdf`);
  };
  const printReport = async () => {
    await document.fonts.ready;
    window.print();
  };
  return <div className="report-page"><header className="report-page-head report-screen-only"><h1>{title}</h1><p>{description}</p></header>
    <section className="report-toolbar report-screen-only"><DropdownField label="Report" name="reportType" openDropdown={openDropdown} options={reports.map((entry) => ({ label: entry.title, value: entry.id }))} setOpenDropdown={setOpenDropdown} value={id} onChange={(value) => { setId(value as ReportId); setError(""); }} /><DateField id="reportFrom" label="From" value={fromDate} onChange={setFromDate} /><DateField id="reportTo" label="To" value={toDate} onChange={setToDate} /><button className="button" disabled={isGenerating} type="button" onClick={() => void generate()}>{isGenerating ? "Generating..." : "Generate Report"}</button><div className="message">{error}</div></section>
    <section className="report-viewer">{generated ? <div className="report-document-shell"><div className="report-document-actions report-screen-only"><span>{paginatedRows.length} page{paginatedRows.length === 1 ? "" : "s"}</span><div><button className="ghost-button" type="button" onClick={() => void printReport()}>Print</button><button className="button" type="button" onClick={() => void exportPdf()}>Export PDF</button></div></div><div className="report-pages" ref={reportPagesRef}>{paginatedRows.map((rows, pageIndex) => <article className="report-document" key={pageIndex}><header className="report-document-head"><div className="report-document-brand" translate="no"><span>X Books</span><strong>{company.name}</strong>{companyAddressLine(company) ? <small>{companyAddressLine(company)}</small> : null}{companyContactLine(company) ? <small>{companyContactLine(company)}</small> : null}</div><h1>{title}</h1><div className="report-document-meta"><span>Report Period: {reportDate(generated.fromDate)} – {reportDate(generated.toDate)}</span><span>Generated: {generatedTime(generated.generatedAt)}</span></div></header><div className="report-detail">{pageIndex === 0 ? <Summary entries={pdfSummary} /> : null}<section className="report-section"><h2>{detailTitle}</h2><div className="table-wrap"><table><thead><tr>{pdfHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cellIndex === row.length - 1 ? <strong>{cell}</strong> : cell}</td>)}</tr>) : <tr><td className="muted" colSpan={Math.max(1, pdfHeaders.length)}>No activity in this period.</td></tr>}</tbody></table></div></section></div></article>)}</div></div> : <div className="report-document-shell report-template-shell"><article className="report-document report-document-template"><header className="report-document-head"><div className="report-document-brand" translate="no"><span>X Books</span><strong>{company.name}</strong>{companyAddressLine(company) ? <small>{companyAddressLine(company)}</small> : null}{companyContactLine(company) ? <small>{companyContactLine(company)}</small> : null}</div><h1>{title}</h1><div className="report-document-meta"><span>Report Period: {reportDate(fromDate)} – {reportDate(toDate)}</span><span>Generated: —</span></div></header><div className="report-detail"><div className="report-template-summary" aria-hidden="true">{pdfSummary.map(([label]) => <div key={label}><span>{label}</span><i /></div>)}</div><section className="report-section"><h2>{detailTitle}</h2><div className="table-wrap"><table><thead><tr>{pdfHeaders.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{templateRows.map((row, rowIndex) => <tr className="report-template-row" key={rowIndex}>{row.map((cell, column) => <td key={`${pdfHeaders[column]}-${column}`}>{cell || column === 0 && id === "profit-loss" ? cell : <i />}</td>)}</tr>)}</tbody></table></div><p className="report-template-message">Choose a date range and generate this report.</p></section></div></article></div>}</section>
  </div>;
};

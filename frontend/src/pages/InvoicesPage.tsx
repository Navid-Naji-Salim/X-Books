import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { DateField } from "../components/DateField";
import { CompanyDocumentIdentity } from "../components/CompanyDocumentIdentity";
import { ModalLayer } from "../components/ModalLayer";
import { useConfirmation } from "../components/ConfirmationDialog";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { RecordListSearch } from "../components/RecordListSearch";
import { RecordTableScroll } from "../components/RecordTableScroll";
import { Tooltip } from "../components/Tooltip";
import { useUnsavedChangesGuard } from "../components/useUnsavedChangesGuard";
import { currency } from "../lib/format";
import { formatLocalizedDate, useLanguage } from "../i18n";
import { appIcons } from "../icons";
import type { CompanyProfile, Contact, Invoice, Item } from "../types";

type Props = {
  company: CompanyProfile;
  customers: Contact[];
  dataError?: string;
  invoices: Invoice[];
  items: Item[];
  nextInvoiceNumber: string;
  token: string;
  onRefresh: () => Promise<void>;
};

type LineDraft = { id: number; itemId: string; itemName: string; quantity: number; rate: number; tax: string };
type InvoiceDraftValues = {
  customerId: string;
  invoiceNumber: string;
  invoiceDate: string;
  terms: string;
  dueDate: string;
  discountPercent: number;
  customerNotes: string;
  lines: readonly LineDraft[];
};

const invoiceDraftFingerprint = (values: InvoiceDraftValues) => JSON.stringify({
  ...values,
  lines: values.lines.map(({ itemId, itemName, quantity, rate, tax }) => ({ itemId, itemName, quantity, rate, tax })),
});

const termsOptions = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
const taxRates: Record<string, number> = { Exempt: 0, "Standard Tax": 10, "Reduced Tax": 5, "Out of Scope": 0 };
const dateInputValue = (date = new Date()) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
};
const dueDateFor = (invoiceDate: string, terms: string) => {
  const date = new Date(`${invoiceDate}T00:00:00`);
  const days = terms === "Due on Receipt" ? 0 : Number(terms.replace("Net ", "")) || 0;
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
};

const followingInvoiceNumber = (invoiceNumber: string) => {
  const match = /^INV-(\d+)$/.exec(invoiceNumber);
  return match ? `INV-${String(Number(match[1]) + 1).padStart(6, "0")}` : invoiceNumber;
};

const itemOptionsFor = (line: LineDraft, availableItems: Item[]) => {
  const options = availableItems.map((item) => ({ label: item.name, value: item.id }));
  if (line.itemName && !options.some((option) => option.value === line.itemId)) {
    options.unshift({ label: line.itemName, value: line.itemId });
  }
  return options;
};

export const InvoicesPage = ({ company, customers, dataError, invoices, items, nextInvoiceNumber, token, onRefresh }: Props) => {
  const { language, t } = useLanguage();
  const confirm = useConfirmation();
  const AddIcon = appIcons.actions.add;
  const DeleteIcon = appIcons.actions.delete;
  const today = dateInputValue();
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(today);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerNotes, setCustomerNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ id: 1, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }]);
  const [baseline, setBaseline] = useState(() => invoiceDraftFingerprint({
    customerId: "",
    invoiceNumber: nextInvoiceNumber,
    invoiceDate: today,
    terms: "Due on Receipt",
    dueDate: today,
    discountPercent: 0,
    customerNotes: "",
    lines: [{ id: 1, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }],
  }));
  const [nextLineId, setNextLineId] = useState(2);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const selectedInvoice = selectedInvoiceId
    ? invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null
    : null;
  const isViewingPaidInvoice = Boolean(selectedInvoice && selectedInvoice.status !== "Unpaid");
  const sellableItems = items.filter((item) => item.salesEnabled);
  const filteredInvoices = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return invoices;
    return invoices.filter((invoice) => [
      invoice.invoiceNumber,
      invoice.customer.displayName,
      formatLocalizedDate(invoice.invoiceDate, language),
      formatLocalizedDate(invoice.dueDate, language),
      t(invoice.status),
      currency.format(invoice.total),
    ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized)));
  }, [invoices, language, query, t]);
  const countLabel = query.trim()
    ? `${filteredInvoices.length} of ${invoices.length} invoices`
    : `${invoices.length} invoice${invoices.length === 1 ? "" : "s"}`;
  const currentDraftFingerprint = useMemo(() => invoiceDraftFingerprint({
    customerId,
    invoiceNumber,
    invoiceDate,
    terms,
    dueDate,
    discountPercent,
    customerNotes,
    lines,
  }), [customerId, customerNotes, discountPercent, dueDate, invoiceDate, invoiceNumber, lines, terms]);
  const hasUnsavedChanges = currentDraftFingerprint !== baseline;
  const confirmDiscardChanges = useUnsavedChangesGuard(hasUnsavedChanges);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0);
    const discountAmount = subtotal * Math.min(100, Math.max(0, discountPercent)) / 100;
    const factor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
    const taxTotal = lines.reduce((sum, line) => sum + line.quantity * line.rate * factor * (taxRates[line.tax] ?? 0) / 100, 0);
    return { subtotal, discountAmount, taxTotal, total: subtotal - discountAmount + taxTotal };
  }, [discountPercent, lines]);

  const updateLine = (id: number, values: Partial<LineDraft>) =>
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...values } : line));

  const resetForm = (nextNumber = nextInvoiceNumber) => {
    const nextLines = [{ id: nextLineId, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }];
    setSelectedInvoiceId(null);
    setCustomerId(""); setInvoiceNumber(nextNumber); setInvoiceDate(today);
    setTerms("Due on Receipt"); setDueDate(today); setDiscountPercent(0);
    setCustomerNotes(""); setOpenDropdown(null);
    setLines(nextLines);
    setBaseline(invoiceDraftFingerprint({
      customerId: "",
      invoiceNumber: nextNumber,
      invoiceDate: today,
      terms: "Due on Receipt",
      dueDate: today,
      discountPercent: 0,
      customerNotes: "",
      lines: nextLines,
    }));
    setNextLineId((value) => value + 1);
  };

  const loadInvoice = async (invoice: Invoice) => {
    if (!await confirmDiscardChanges()) return;
    const nextInvoiceDate = invoice.invoiceDate.slice(0, 10);
    const nextDueDate = invoice.dueDate.slice(0, 10);
    const nextCustomerNotes = invoice.customerNotes ?? "";
    const nextLines = invoice.lines.map((line, index) => ({ id: nextLineId + index, itemId: line.itemId ?? "", itemName: line.itemName, quantity: line.quantity, rate: line.rate, tax: line.tax ?? "" }));
    setSelectedInvoiceId(invoice.id);
    setCustomerId(invoice.customerId); setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(nextInvoiceDate); setTerms(invoice.terms);
    setDueDate(nextDueDate); setDiscountPercent(invoice.discountPercent);
    setCustomerNotes(nextCustomerNotes); setOpenDropdown(null);
    setLines(nextLines);
    setBaseline(invoiceDraftFingerprint({
      customerId: invoice.customerId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: nextInvoiceDate,
      terms: invoice.terms,
      dueDate: nextDueDate,
      discountPercent: invoice.discountPercent,
      customerNotes: nextCustomerNotes,
      lines: nextLines,
    }));
    setNextLineId((value) => value + invoice.lines.length + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeInvoice = async () => {
    if (!await confirmDiscardChanges()) return;
    resetForm();
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!await confirm({
      confirmLabel: t("Delete"),
      message: t("This action cannot be undone."),
      title: t(`Delete invoice ${invoice.invoiceNumber}?`),
    })) return;
    setMessage("");
    setDeletingId(invoice.id);
    try {
      await api.deleteInvoice(token, invoice.id);
      if (selectedInvoiceId === invoice.id) resetForm();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to delete the invoice.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <form className={`panel invoice-workspace invoice-document-card ${isViewingPaidInvoice ? "is-read-only" : ""}`} onSubmit={async (event) => {
        event.preventDefault();
        if (isViewingPaidInvoice) return;
        setMessage("");
        try {
          const payload = {
            customerId, invoiceNumber, invoiceDate, terms, dueDate, discountPercent, customerNotes,
            lines: lines.filter((line) => line.itemId).map((line) => ({ ...line, taxRate: taxRates[line.tax] ?? 0 })),
          };
          const wasEditing = Boolean(selectedInvoiceId);
          if (selectedInvoiceId) await api.updateInvoice(token, selectedInvoiceId, payload);
          else await api.createInvoice(token, payload);
          await onRefresh();
          resetForm(wasEditing ? nextInvoiceNumber : followingInvoiceNumber(invoiceNumber));
        } catch (error) {
          setMessage(error instanceof ApiError ? error.message : "Unable to save invoice.");
        }
      }}>
        <section className="item-form compact-item-form invoice-form-panel">
          <div className="item-form-head">
            <div><h2>{selectedInvoiceId ? "Invoice Details" : "New Invoice"}</h2><p>Customer and Billing Details</p></div>
            <div className="invoice-form-actions">
              {selectedInvoiceId ? <button className="ghost-button" type="button" onClick={closeInvoice}>Close</button> : null}
              {!isViewingPaidInvoice ? <button className="button form-primary-action" type="submit">{selectedInvoiceId ? "Edit Invoice" : "Save Invoice"}</button> : null}
            </div>
          </div>
          {selectedInvoiceId ? <CompanyDocumentIdentity company={company} label="Issued by" /> : null}
          <div className="invoice-details-grid">
            <section className="invoice-detail-card">
              <h3>Customer</h3>
              <DropdownField label="Customer" name="customerId" options={customers.map((customer) => ({ label: customer.displayName, value: customer.id }))} placeholder="Select a customer" required disabled={isViewingPaidInvoice} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} translateOptions={false} value={customerId} onChange={(value) => {
                setCustomerId(value);
                const customer = customers.find((entry) => entry.id === value);
                const nextTerms = customer?.paymentTerms || "Due on Receipt";
                setTerms(nextTerms); setDueDate(dueDateFor(invoiceDate, nextTerms));
              }} />
            </section>
            <section className="invoice-detail-card">
              <h3>Invoice Details</h3>
              <div className="field"><label htmlFor="invoiceNumber">Invoice Number</label><input id="invoiceNumber" value={invoiceNumber} required disabled={isViewingPaidInvoice} onChange={(event) => setInvoiceNumber(event.currentTarget.value)} /></div>
              <DateField id="invoiceDate" label="Invoice Date" value={invoiceDate} required disabled={isViewingPaidInvoice} onChange={(value) => { setInvoiceDate(value); setDueDate(dueDateFor(value, terms)); }} />
            </section>
            <section className="invoice-detail-card">
              <h3>Payment Schedule</h3>
              <DropdownField label="Terms" name="terms" options={termsOptions} disabled={isViewingPaidInvoice} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={terms} onChange={(value) => { setTerms(value); setDueDate(dueDateFor(invoiceDate, value)); }} />
              <DateField id="dueDate" label="Due Date" value={dueDate} required disabled={isViewingPaidInvoice} onChange={setDueDate} />
            </section>
          </div>
        </section>

        <section className="invoice-items-panel">
          <div className="item-form-head">
            <div><h2>Item Table</h2><p>{`${lines.length} line ${lines.length === 1 ? "item" : "items"}`}</p></div>
            <button className="button invoice-add-row" type="button" disabled={isViewingPaidInvoice} onClick={() => { setLines((current) => [...current, { id: nextLineId, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }]); setNextLineId((value) => value + 1); }}><AddIcon /> Add New Row</button>
          </div>
          <RecordTableScroll className="invoice-lines-table-scroll" columns={6}>
            <table className="invoice-table">
              <thead><tr><th>Item Details</th><th>Quantity</th><th>Rate</th><th>Tax</th><th>Amount</th><th aria-label="Actions" /></tr></thead>
              <tbody>{lines.map((line) => (
                <tr key={line.id}>
                  <td className="invoice-item-cell"><DropdownField floatingOptions label="Item" name={`item-${line.id}`} options={itemOptionsFor(line, sellableItems)} placeholder="Select an item" disabled={isViewingPaidInvoice} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} translateOptions={false} value={line.itemId} onChange={(value) => {
                    const item = sellableItems.find((entry) => entry.id === value);
                    updateLine(line.id, { itemId: value, itemName: item?.name ?? line.itemName, rate: item?.salesPrice ?? 0, tax: item?.salesTax ?? "" });
                  }} /></td>
                  <td><input aria-label="Quantity" type="number" min="0.01" step="0.01" value={line.quantity} disabled={isViewingPaidInvoice} onChange={(event) => updateLine(line.id, { quantity: Number(event.currentTarget.value) })} /></td>
                  <td><input aria-label="Rate" type="number" min="0" step="0.01" value={line.rate} disabled={isViewingPaidInvoice} onChange={(event) => updateLine(line.id, { rate: Number(event.currentTarget.value) })} /></td>
                  <td className="invoice-tax-cell"><DropdownField floatingOptions label="Tax" name={`tax-${line.id}`} options={TAX_OPTIONS} placeholder="Select a tax" disabled={isViewingPaidInvoice} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={line.tax} onChange={(value) => updateLine(line.id, { tax: value })} /></td>
                  <td className="invoice-amount">{currency.format(line.quantity * line.rate)}</td>
                  <td><Tooltip content="Remove Line" disabled={lines.length === 1 || isViewingPaidInvoice} placement="top"><button aria-label="Remove Line" className="invoice-remove-line" disabled={lines.length === 1 || isViewingPaidInvoice} type="button" onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}><DeleteIcon /></button></Tooltip></td>
                </tr>
              ))}</tbody>
            </table>
          </RecordTableScroll>
        </section>

        <section className="invoice-footer-grid">
          <div className="invoice-notes-card"><h2 id="customerNotesLabel">Notes</h2><textarea aria-labelledby="customerNotesLabel" id="customerNotes" placeholder="Notes for internal use" value={customerNotes} disabled={isViewingPaidInvoice} onChange={(event) => setCustomerNotes(event.currentTarget.value)} /></div>
          <div className="invoice-totals-card">
            <div><span>Subtotal</span><strong>{currency.format(totals.subtotal)}</strong></div>
            <div><label htmlFor="discountPercent">Discount</label><span className="invoice-discount-input"><input id="discountPercent" type="number" min="0" max="100" step="0.01" value={discountPercent} disabled={isViewingPaidInvoice} onChange={(event) => setDiscountPercent(Number(event.currentTarget.value))} /><b>%</b></span><strong>-{currency.format(totals.discountAmount)}</strong></div>
            <div><span>Tax</span><strong>{currency.format(totals.taxTotal)}</strong></div>
            <div className="invoice-total-row"><span>Total</span><strong>{currency.format(totals.total)}</strong></div>
          </div>
        </section>
        <div className="message">{message}</div>
      </form>
      <section className="panel saved-invoices-panel record-list-panel">
        <div className="item-form-head record-list-head"><div><h2>Saved Invoices</h2><p>{countLabel}</p></div><RecordListSearch label="Search Invoices" placeholder="Search invoices by any detail…" value={query} onChange={setQuery} /></div>
        <RecordTableScroll className="saved-invoices-table-wrap" columns={7} visibleRows={4}>
          <table className="saved-invoices-table">
            <thead><tr><th>Invoice Number</th><th>Customer</th><th>Invoice Date</th><th>Due Date</th><th>Status</th><th>Total</th><th className="record-actions-heading">Actions</th></tr></thead>
            <tbody>
              {filteredInvoices.length === 0 ? <tr><td className="muted" colSpan={7}>{query ? "No invoices match your search." : "No saved invoices yet."}</td></tr> : filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td translate="no"><strong>{invoice.invoiceNumber}</strong></td>
                  <td translate="no">{invoice.customer.displayName}</td>
                  <td translate="no">{formatLocalizedDate(invoice.invoiceDate, language)}</td>
                  <td translate="no">{formatLocalizedDate(invoice.dueDate, language)}</td>
                  <td><span className={`invoice-status ${invoice.status === "Paid" ? "is-paid" : invoice.status === "Partially Paid" ? "is-partially-paid" : "is-unpaid"}`}>{invoice.status}</span></td>
                  <td translate="no"><strong>{currency.format(invoice.total)}</strong></td>
                  <td className="record-actions-cell">
                    <RecordActionsMenu
                      disabled={deletingId !== null}
                      recordLabel={invoice.invoiceNumber}
                      actions={[
                        {
                          label: "View",
                          icon: appIcons.actions.view,
                          disabled: deletingId !== null,
                          onSelect: () => void loadInvoice(invoice),
                        },
                        ...(invoice.status !== "Paid" ? [
                          {
                            label: "Record Payment",
                            icon: appIcons.actions.payment,
                            disabled: deletingId !== null,
                            onSelect: () => {
                              setMessage("");
                              setPaymentInvoice(invoice);
                              setPaymentDate(today);
                              setPaymentAmount(invoice.remainingBalance);
                            },
                          },
                        ] : []),
                        {
                          label: deletingId === invoice.id ? "Deleting" : "Delete",
                          icon: appIcons.actions.delete,
                          tone: "danger" as const,
                          disabled: deletingId !== null,
                          onSelect: () => void deleteInvoice(invoice),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </RecordTableScroll>
      </section>
      {paymentInvoice ? (
        <ModalLayer closeDisabled={isRecordingPayment} onClose={() => setPaymentInvoice(null)}>
          <form className="panel payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsRecordingPayment(true);
            try {
              await api.recordInvoicePayment(token, paymentInvoice.id, { paymentDate, amount: paymentAmount });
              await onRefresh();
              if (selectedInvoiceId === paymentInvoice.id) resetForm();
              setPaymentInvoice(null);
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to record the payment.");
            } finally {
              setIsRecordingPayment(false);
            }
          }}>
            <div className="item-form-head"><div><h2 id="payment-modal-title">Record Payment</h2><p translate="no">{paymentInvoice.invoiceNumber} · {paymentInvoice.customer.displayName}</p></div></div>
            <DateField id="paymentDate" label="Payment Date" required value={paymentDate} onChange={setPaymentDate} />
            <div className="field"><label htmlFor="paymentAmount">Amount</label><input id="paymentAmount" type="number" min="0.01" max={paymentInvoice.remainingBalance} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.currentTarget.value))} /></div>
            <div className="message" role="status">{message}</div>
            <div className="payment-modal-actions"><button className="ghost-button" disabled={isRecordingPayment} type="button" onClick={() => setPaymentInvoice(null)}>Cancel</button><button className="button" disabled={isRecordingPayment} type="submit">{isRecordingPayment ? "Saving..." : "Save Payment"}</button></div>
          </form>
        </ModalLayer>
      ) : null}
    </>
  );
};

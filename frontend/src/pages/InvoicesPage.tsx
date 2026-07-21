import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { Tooltip } from "../components/Tooltip";
import { currency } from "../lib/format";
import { appIcons } from "../icons";
import type { Contact, Invoice, Item } from "../types";

type Props = {
  customers: Contact[];
  dataError?: string;
  invoices: Invoice[];
  items: Item[];
  token: string;
  onRefresh: () => Promise<void>;
};

type LineDraft = { id: number; itemId: string; quantity: number; rate: number; tax: string };
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

export const InvoicesPage = ({ customers, dataError, invoices, items, token, onRefresh }: Props) => {
  const AddIcon = appIcons.actions.add;
  const RemoveIcon = appIcons.actions.remove;
  const today = dateInputValue();
  const [customerId, setCustomerId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-${String(invoices.length + 1).padStart(6, "0")}`);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(today);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customerNotes, setCustomerNotes] = useState("Thanks for your business.");
  const [lines, setLines] = useState<LineDraft[]>([{ id: 1, itemId: "", quantity: 1, rate: 0, tax: "" }]);
  const [nextLineId, setNextLineId] = useState(2);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sellableItems = items.filter((item) => item.salesEnabled);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0);
    const discountAmount = subtotal * Math.min(100, Math.max(0, discountPercent)) / 100;
    const factor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
    const taxTotal = lines.reduce((sum, line) => sum + line.quantity * line.rate * factor * (taxRates[line.tax] ?? 0) / 100, 0);
    return { subtotal, discountAmount, taxTotal, total: subtotal - discountAmount + taxTotal };
  }, [discountPercent, lines]);

  const updateLine = (id: number, values: Partial<LineDraft>) =>
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...values } : line));

  const resetForm = (nextNumber = `INV-${String(invoices.length + 1).padStart(6, "0")}`) => {
    setEditingId(null);
    setCustomerId(""); setInvoiceNumber(nextNumber); setInvoiceDate(today);
    setTerms("Due on Receipt"); setDueDate(today); setDiscountPercent(0);
    setCustomerNotes("Thanks for your business."); setOpenDropdown(null);
    setLines([{ id: nextLineId, itemId: "", quantity: 1, rate: 0, tax: "" }]);
    setNextLineId((value) => value + 1);
  };

  const loadInvoice = (invoice: Invoice) => {
    if (invoice.status === "Paid") return;
    setEditingId(invoice.id);
    setCustomerId(invoice.customerId); setInvoiceNumber(invoice.invoiceNumber);
    setInvoiceDate(invoice.invoiceDate.slice(0, 10)); setTerms(invoice.terms);
    setDueDate(invoice.dueDate.slice(0, 10)); setDiscountPercent(invoice.discountPercent);
    setCustomerNotes(invoice.customerNotes ?? ""); setOpenDropdown(null);
    setLines(invoice.lines.map((line, index) => ({ id: nextLineId + index, itemId: line.itemId ?? "", quantity: line.quantity, rate: line.rate, tax: line.tax ?? "" })));
    setNextLineId((value) => value + invoice.lines.length + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}?`)) return;
    setMessage("");
    setDeletingId(invoice.id);
    try {
      await api.deleteInvoice(token, invoice.id);
      if (editingId === invoice.id) resetForm();
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
      <form className="invoice-workspace" onSubmit={async (event) => {
        event.preventDefault();
        setMessage("");
        try {
          const payload = {
            customerId, invoiceNumber, invoiceDate, terms, dueDate, discountPercent, customerNotes,
            lines: lines.filter((line) => line.itemId).map((line) => ({ ...line, taxRate: taxRates[line.tax] ?? 0 })),
          };
          if (editingId) await api.updateInvoice(token, editingId, payload);
          else await api.createInvoice(token, payload);
          await onRefresh();
          resetForm(`INV-${String(invoices.length + (editingId ? 1 : 2)).padStart(6, "0")}`);
        } catch (error) {
          setMessage(error instanceof ApiError ? error.message : "Unable to save invoice.");
        }
      }}>
        <section className="panel item-form compact-item-form invoice-form-panel">
          <div className="item-form-head">
            <div><h2>{editingId ? "Edit invoice" : "New invoice"}</h2><p>Customer and billing details</p></div>
            <div className="invoice-form-actions">
              {editingId ? <button className="ghost-button" type="button" onClick={() => resetForm()}>Cancel</button> : null}
              <button className="button" type="submit">{editingId ? "Update invoice" : "Save invoice"}</button>
            </div>
          </div>
          <div className="invoice-details-grid">
            <section className="invoice-detail-card">
              <h3>Customer</h3>
              <DropdownField label="Customer" name="customerId" options={customers.map((customer) => ({ label: customer.displayName, value: customer.id }))} placeholder="Select a customer" required openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={customerId} onChange={(value) => {
                setCustomerId(value);
                const customer = customers.find((entry) => entry.id === value);
                const nextTerms = customer?.paymentTerms || "Due on Receipt";
                setTerms(nextTerms); setDueDate(dueDateFor(invoiceDate, nextTerms));
              }} />
            </section>
            <section className="invoice-detail-card">
              <h3>Invoice details</h3>
              <div className="field"><label htmlFor="invoiceNumber">Invoice number</label><input id="invoiceNumber" value={invoiceNumber} required onChange={(event) => setInvoiceNumber(event.currentTarget.value)} /></div>
              <div className="field"><label htmlFor="invoiceDate">Invoice date</label><input id="invoiceDate" type="date" value={invoiceDate} required onChange={(event) => { const value = event.currentTarget.value; setInvoiceDate(value); setDueDate(dueDateFor(value, terms)); }} /></div>
            </section>
            <section className="invoice-detail-card">
              <h3>Payment schedule</h3>
              <DropdownField label="Terms" name="terms" options={termsOptions} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={terms} onChange={(value) => { setTerms(value); setDueDate(dueDateFor(invoiceDate, value)); }} />
              <div className="field"><label htmlFor="dueDate">Due date</label><input id="dueDate" type="date" value={dueDate} required onChange={(event) => setDueDate(event.currentTarget.value)} /></div>
            </section>
          </div>
        </section>

        <section className="panel invoice-items-panel">
          <div className="item-form-head"><div><h2>Item table</h2><p>{lines.length} line {lines.length === 1 ? "item" : "items"}</p></div></div>
          <div className="table-wrap invoice-table-wrap">
            <table className="invoice-table">
              <thead><tr><th>Item details</th><th>Quantity</th><th>Rate</th><th>Tax</th><th>Amount</th><th aria-label="Actions" /></tr></thead>
              <tbody>{lines.map((line) => (
                <tr key={line.id}>
                  <td className="invoice-item-cell"><DropdownField label="Item" name={`item-${line.id}`} options={sellableItems.map((item) => ({ label: item.name, value: item.id }))} placeholder="Select an item" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={line.itemId} onChange={(value) => {
                    const item = sellableItems.find((entry) => entry.id === value);
                    updateLine(line.id, { itemId: value, rate: item?.salesPrice ?? 0, tax: item?.salesTax ?? "" });
                  }} /></td>
                  <td><input aria-label="Quantity" type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.currentTarget.value) })} /></td>
                  <td><input aria-label="Rate" type="number" min="0" step="0.01" value={line.rate} onChange={(event) => updateLine(line.id, { rate: Number(event.currentTarget.value) })} /></td>
                  <td className="invoice-tax-cell"><DropdownField label="Tax" name={`tax-${line.id}`} options={TAX_OPTIONS} placeholder="Select a tax" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={line.tax} onChange={(value) => updateLine(line.id, { tax: value })} /></td>
                  <td className="invoice-amount">{currency.format(line.quantity * line.rate)}</td>
                  <td><Tooltip content="Remove line" disabled={lines.length === 1} placement="top"><button aria-label="Remove line" className="invoice-remove-line" disabled={lines.length === 1} type="button" onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}><RemoveIcon /></button></Tooltip></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
            <button className="ghost-button invoice-add-row" type="button" onClick={() => { setLines((current) => [...current, { id: nextLineId, itemId: "", quantity: 1, rate: 0, tax: "" }]); setNextLineId((value) => value + 1); }}><AddIcon /> Add new row</button>
        </section>

        <section className="invoice-footer-grid">
          <div className="panel invoice-notes-card"><div className="field"><label htmlFor="customerNotes">Customer notes</label><textarea id="customerNotes" value={customerNotes} onChange={(event) => setCustomerNotes(event.currentTarget.value)} /></div><span>Displayed on the invoice</span></div>
          <div className="panel invoice-totals-card">
            <div><span>Subtotal</span><strong>{currency.format(totals.subtotal)}</strong></div>
            <div><label htmlFor="discountPercent">Discount</label><span className="invoice-discount-input"><input id="discountPercent" type="number" min="0" max="100" step="0.01" value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.currentTarget.value))} /><b>%</b></span><strong>-{currency.format(totals.discountAmount)}</strong></div>
            <div><span>Tax</span><strong>{currency.format(totals.taxTotal)}</strong></div>
            <div className="invoice-total-row"><span>Total</span><strong>{currency.format(totals.total)}</strong></div>
          </div>
        </section>
        <div className="message">{message}</div>
      </form>
      <section className="panel saved-invoices-panel">
        <div className="item-form-head"><div><h2>Saved invoices</h2><p>{invoices.length} invoice{invoices.length === 1 ? "" : "s"}</p></div></div>
        <div className="table-wrap saved-invoices-table-wrap record-table-wrap">
          <table className="saved-invoices-table">
            <thead><tr><th>Invoice number</th><th>Customer</th><th>Invoice date</th><th>Due date</th><th>Status</th><th>Total</th><th className="record-actions-heading">Actions</th></tr></thead>
            <tbody>
              {invoices.length === 0 ? <tr><td className="muted" colSpan={7}>No saved invoices yet.</td></tr> : invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.invoiceNumber}</strong></td>
                  <td>{invoice.customer.displayName}</td>
                  <td>{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                  <td>{new Date(invoice.dueDate).toLocaleDateString()}</td>
                  <td><span className={`invoice-status ${invoice.status === "Paid" ? "is-paid" : "is-unpaid"}`}>{invoice.status}</span></td>
                  <td><strong>{currency.format(invoice.total)}</strong></td>
                  <td className="record-actions-cell">
                    <RecordActionsMenu
                      disabled={deletingId !== null}
                      recordLabel={invoice.invoiceNumber}
                      actions={[
                        ...(invoice.status !== "Paid" ? [
                          {
                            label: "Record payment",
                            icon: appIcons.actions.payment,
                            disabled: deletingId !== null,
                            onSelect: () => {
                              setMessage("");
                              setPaymentInvoice(invoice);
                              setPaymentDate(today);
                              setPaymentAmount(invoice.total);
                            },
                          },
                          {
                            label: "Edit",
                            icon: appIcons.actions.edit,
                            disabled: deletingId !== null,
                            onSelect: () => loadInvoice(invoice),
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
        </div>
      </section>
      {paymentInvoice ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isRecordingPayment && setPaymentInvoice(null)}>
          <form className="panel payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-modal-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setIsRecordingPayment(true);
            try {
              await api.recordInvoicePayment(token, paymentInvoice.id, { paymentDate, amount: paymentAmount });
              await onRefresh();
              if (editingId === paymentInvoice.id) resetForm();
              setPaymentInvoice(null);
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to record the payment.");
            } finally {
              setIsRecordingPayment(false);
            }
          }}>
            <div className="item-form-head"><div><h2 id="payment-modal-title">Record payment</h2><p>{paymentInvoice.invoiceNumber} · {paymentInvoice.customer.displayName}</p></div></div>
            <div className="field"><label htmlFor="paymentDate">Payment date</label><input id="paymentDate" type="date" required value={paymentDate} onChange={(event) => setPaymentDate(event.currentTarget.value)} /></div>
            <div className="field"><label htmlFor="paymentAmount">Amount</label><input id="paymentAmount" type="number" min="0.01" step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.currentTarget.value))} /></div>
            <div className="message" role="status">{message}</div>
            <div className="payment-modal-actions"><button className="ghost-button" disabled={isRecordingPayment} type="button" onClick={() => setPaymentInvoice(null)}>Cancel</button><button className="button" disabled={isRecordingPayment} type="submit">{isRecordingPayment ? "Saving..." : "Save payment"}</button></div>
          </form>
        </div>
      ) : null}
    </>
  );
};

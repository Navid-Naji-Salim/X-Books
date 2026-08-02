import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { DateField } from "../components/DateField";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { RecordListSearch } from "../components/RecordListSearch";
import { RecordTableScroll } from "../components/RecordTableScroll";
import { Tooltip } from "../components/Tooltip";
import { useUnsavedChangesGuard } from "../components/useUnsavedChangesGuard";
import { appIcons } from "../icons";
import { currency } from "../lib/format";
import type { Bill, Contact, Item } from "../types";

type Props = {
  vendors: Contact[];
  dataError?: string;
  bills: Bill[];
  items: Item[];
  nextBillNumber: string;
  token: string;
  onRefresh: () => Promise<void>;
};

type LineDraft = {
  id: number;
  itemId: string;
  itemName: string;
  quantity: number;
  rate: number;
  tax: string;
};

type BillDraftValues = {
  vendorId: string;
  billDate: string;
  terms: string;
  dueDate: string;
  discountPercent: number;
  notes: string;
  lines: readonly LineDraft[];
};

const billDraftFingerprint = (values: BillDraftValues) => JSON.stringify({
  ...values,
  lines: values.lines.map(({ itemId, itemName, quantity, rate, tax }) => ({ itemId, itemName, quantity, rate, tax })),
});

const termsOptions = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
const taxRates: Record<string, number> = {
  Exempt: 0,
  "Standard Tax": 10,
  "Reduced Tax": 5,
  "Out of Scope": 0,
};

const dateInputValue = (date = new Date()) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return adjusted.toISOString().slice(0, 10);
};

const dueDateFor = (billDate: string, terms: string) => {
  const date = new Date(`${billDate}T00:00:00`);
  const days = terms === "Due on Receipt" ? 0 : Number(terms.replace("Net ", "")) || 0;
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
};

const itemOptionsFor = (line: LineDraft, availableItems: Item[]) => {
  const options = availableItems.map((item) => ({ label: item.name, value: item.id }));
  if (line.itemName && !options.some((option) => option.value === line.itemId)) {
    options.unshift({ label: line.itemName, value: line.itemId });
  }
  return options;
};

export const BillsPage = ({ vendors, dataError, bills, items, nextBillNumber, token, onRefresh }: Props) => {
  const AddIcon = appIcons.actions.add;
  const DeleteIcon = appIcons.actions.delete;
  const today = dateInputValue();
  const [vendorId, setVendorId] = useState("");
  const [billDate, setBillDate] = useState(today);
  const [terms, setTerms] = useState("Due on Receipt");
  const [dueDate, setDueDate] = useState(today);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { id: 1, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" },
  ]);
  const [baseline, setBaseline] = useState(() => billDraftFingerprint({
    vendorId: "",
    billDate: today,
    terms: "Due on Receipt",
    dueDate: today,
    discountPercent: 0,
    notes: "",
    lines: [{ id: 1, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }],
  }));
  const [nextLineId, setNextLineId] = useState(2);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [paymentBill, setPaymentBill] = useState<Bill | null>(null);
  const [paymentDate, setPaymentDate] = useState(today);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [isPaying, setIsPaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const selectedBill = selectedBillId
    ? bills.find((bill) => bill.id === selectedBillId) ?? null
    : null;
  const isReadOnly = Boolean(selectedBill && selectedBill.status !== "Unpaid");
  const purchasableItems = items.filter((item) => item.purchaseEnabled);
  const filteredBills = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return bills;
    return bills.filter((bill) => [
      bill.billNumber,
      bill.vendor.displayName,
      bill.billDate,
      bill.terms,
      bill.dueDate,
      bill.status,
      bill.notes,
      bill.subtotal,
      bill.discountPercent,
      bill.discountAmount,
      bill.taxTotal,
      bill.total,
      ...bill.lines.flatMap((line) => [line.itemName, line.quantity, line.rate, line.tax, line.amount]),
    ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized)));
  }, [bills, query]);
  const countLabel = query.trim()
    ? `${filteredBills.length} of ${bills.length} bills`
    : `${bills.length} bill${bills.length === 1 ? "" : "s"}`;
  const currentDraftFingerprint = useMemo(() => billDraftFingerprint({
    vendorId,
    billDate,
    terms,
    dueDate,
    discountPercent,
    notes,
    lines,
  }), [billDate, discountPercent, dueDate, lines, notes, terms, vendorId]);
  const hasUnsavedChanges = currentDraftFingerprint !== baseline;
  const confirmDiscardChanges = useUnsavedChangesGuard(hasUnsavedChanges);

  const totals = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.rate, 0);
    const discountAmount = subtotal * Math.min(100, Math.max(0, discountPercent)) / 100;
    const factor = subtotal === 0 ? 1 : (subtotal - discountAmount) / subtotal;
    const taxTotal = lines.reduce((sum, line) => (
      sum + line.quantity * line.rate * factor * (taxRates[line.tax] ?? 0) / 100
    ), 0);
    return { subtotal, discountAmount, taxTotal, total: subtotal - discountAmount + taxTotal };
  }, [discountPercent, lines]);

  const updateLine = (id: number, values: Partial<LineDraft>) => {
    if (isReadOnly) return;
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...values } : line));
  };

  const resetForm = () => {
    const nextLines = [{ id: nextLineId, itemId: "", itemName: "", quantity: 1, rate: 0, tax: "" }];
    setSelectedBillId(null);
    setVendorId("");
    setBillDate(today);
    setTerms("Due on Receipt");
    setDueDate(today);
    setDiscountPercent(0);
    setNotes("");
    setOpenDropdown(null);
    setMessage("");
    setLines(nextLines);
    setBaseline(billDraftFingerprint({
      vendorId: "",
      billDate: today,
      terms: "Due on Receipt",
      dueDate: today,
      discountPercent: 0,
      notes: "",
      lines: nextLines,
    }));
    setNextLineId((value) => value + 1);
  };

  const loadBill = (bill: Bill) => {
    if (!confirmDiscardChanges()) return;
    const nextBillDate = bill.billDate.slice(0, 10);
    const nextDueDate = bill.dueDate.slice(0, 10);
    const nextNotes = bill.notes ?? "";
    const nextLines = bill.lines.map((line, index) => ({
      id: nextLineId + index,
      itemId: line.itemId ?? "",
      itemName: line.itemName,
      quantity: line.quantity,
      rate: line.rate,
      tax: line.tax ?? "",
    }));
    setSelectedBillId(bill.id);
    setVendorId(bill.vendorId);
    setBillDate(nextBillDate);
    setTerms(bill.terms);
    setDueDate(nextDueDate);
    setDiscountPercent(bill.discountPercent);
    setNotes(nextNotes);
    setLines(nextLines);
    setBaseline(billDraftFingerprint({
      vendorId: bill.vendorId,
      billDate: nextBillDate,
      terms: bill.terms,
      dueDate: nextDueDate,
      discountPercent: bill.discountPercent,
      notes: nextNotes,
      lines: nextLines,
    }));
    setNextLineId((value) => value + bill.lines.length + 1);
    setOpenDropdown(null);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeBill = () => {
    if (!confirmDiscardChanges()) return;
    resetForm();
  };

  const deleteBill = async (bill: Bill) => {
    if (!window.confirm(`Delete bill ${bill.billNumber}?`)) return;
    setMessage("");
    setDeletingId(bill.id);
    try {
      await api.deleteBill(token, bill.id);
      if (selectedBillId === bill.id) resetForm();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to delete the bill.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <form
        className={`panel invoice-workspace invoice-document-card ${isReadOnly ? "is-read-only" : ""}`}
        onSubmit={async (event) => {
          event.preventDefault();
          if (isReadOnly || isSaving) return;
          setMessage("");
          setIsSaving(true);
          try {
            const payload = {
              vendorId,
              billDate,
              terms,
              dueDate,
              discountPercent,
              notes,
              lines: lines
                .filter((line) => line.itemId)
                .map((line) => ({ ...line, taxRate: taxRates[line.tax] ?? 0 })),
            };
            if (selectedBillId) await api.updateBill(token, selectedBillId, payload);
            else await api.createBill(token, payload);
            await onRefresh();
            resetForm();
          } catch (error) {
            setMessage(error instanceof ApiError ? error.message : "Unable to save bill.");
          } finally {
            setIsSaving(false);
          }
        }}
      >
        <section className="item-form compact-item-form invoice-form-panel">
          <div className="item-form-head">
            <div>
              <h2>{selectedBillId ? "Bill details" : "New bill"}</h2>
              <p>Vendor and billing details</p>
            </div>
            <div className="invoice-form-actions">
              {selectedBillId ? (
                <button className="ghost-button" disabled={isSaving} type="button" onClick={closeBill}>
                  Close
                </button>
              ) : null}
              {!isReadOnly ? (
                <button className="button form-primary-action" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : selectedBillId ? "Edit bill" : "Save bill"}
                </button>
              ) : null}
            </div>
          </div>
          <div className="invoice-details-grid">
            <section className="invoice-detail-card">
              <h3>Vendor</h3>
              <DropdownField
                disabled={isReadOnly}
                label="Vendor"
                name="vendorId"
                options={vendors.map((vendor) => ({ label: vendor.displayName, value: vendor.id }))}
                placeholder="Select a vendor"
                required
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                value={vendorId}
                onChange={(value) => {
                  setVendorId(value);
                  const vendor = vendors.find((entry) => entry.id === value);
                  const nextTerms = vendor?.paymentTerms || "Due on Receipt";
                  setTerms(nextTerms);
                  setDueDate(dueDateFor(billDate, nextTerms));
                  setLines((current) => current.map((line) => ({ ...line, tax: vendor?.taxRate || line.tax })));
                }}
              />
            </section>
            <section className="invoice-detail-card">
              <h3>Bill details</h3>
              <div className="field">
                <label htmlFor="billNumber">Bill number</label>
                <input id="billNumber" readOnly value={selectedBill?.billNumber ?? nextBillNumber} />
              </div>
              <DateField
                id="billDate"
                label="Bill date"
                readOnly={isReadOnly}
                required
                value={billDate}
                onChange={(value) => {
                  setBillDate(value);
                  setDueDate(dueDateFor(value, terms));
                }}
              />
            </section>
            <section className="invoice-detail-card">
              <h3>Payment schedule</h3>
              <DropdownField
                disabled={isReadOnly}
                label="Terms"
                name="terms"
                options={termsOptions}
                openDropdown={openDropdown}
                setOpenDropdown={setOpenDropdown}
                value={terms}
                onChange={(value) => {
                  setTerms(value);
                  setDueDate(dueDateFor(billDate, value));
                }}
              />
              <DateField id="billDueDate" label="Due date" readOnly={isReadOnly} required value={dueDate} onChange={setDueDate} />
            </section>
          </div>
        </section>

        <section className="invoice-items-panel">
          <div className="item-form-head">
            <div><h2>Item table</h2><p>{lines.length} line {lines.length === 1 ? "item" : "items"}</p></div>
            <button
              className="button invoice-add-row"
              disabled={isReadOnly}
              type="button"
              onClick={() => {
                const vendor = vendors.find((entry) => entry.id === vendorId);
                setLines((current) => [
                  ...current,
                  { id: nextLineId, itemId: "", itemName: "", quantity: 1, rate: 0, tax: vendor?.taxRate ?? "" },
                ]);
                setNextLineId((value) => value + 1);
              }}
            >
              <AddIcon /> Add new row
            </button>
          </div>
          <RecordTableScroll className="invoice-lines-table-scroll" columns={6}>
            <table className="invoice-table">
              <thead>
                <tr><th>Item details</th><th>Quantity</th><th>Rate</th><th>Tax</th><th>Amount</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id}>
                    <td className="invoice-item-cell">
                      <DropdownField
                        disabled={isReadOnly}
                        floatingOptions
                        label="Item"
                        name={`bill-item-${line.id}`}
                        options={itemOptionsFor(line, purchasableItems)}
                        placeholder="Select an item"
                        openDropdown={openDropdown}
                        setOpenDropdown={setOpenDropdown}
                        value={line.itemId}
                        onChange={(value) => {
                          const item = purchasableItems.find((entry) => entry.id === value);
                          const vendor = vendors.find((entry) => entry.id === vendorId);
                          updateLine(line.id, {
                            itemId: value,
                            itemName: item?.name ?? line.itemName,
                            rate: item?.unitCost ?? 0,
                            tax: vendor?.taxRate || item?.purchaseTax || "",
                          });
                        }}
                      />
                    </td>
                    <td>
                      <input aria-label="Quantity" type="number" min="0.01" step="0.01" readOnly={isReadOnly} value={line.quantity} onChange={(event) => updateLine(line.id, { quantity: Number(event.currentTarget.value) })} />
                    </td>
                    <td>
                      <input aria-label="Rate" type="number" min="0" step="0.01" readOnly={isReadOnly} value={line.rate} onChange={(event) => updateLine(line.id, { rate: Number(event.currentTarget.value) })} />
                    </td>
                    <td className="invoice-tax-cell">
                      <DropdownField
                        disabled={isReadOnly}
                        floatingOptions
                        label="Tax"
                        name={`bill-tax-${line.id}`}
                        options={TAX_OPTIONS}
                        placeholder="Select a tax"
                        openDropdown={openDropdown}
                        setOpenDropdown={setOpenDropdown}
                        value={line.tax}
                        onChange={(value) => updateLine(line.id, { tax: value })}
                      />
                    </td>
                    <td className="invoice-amount">{currency.format(line.quantity * line.rate)}</td>
                    <td>
                      <Tooltip content="Remove line" disabled={isReadOnly || lines.length === 1} placement="top">
                        <button
                          aria-label="Remove line"
                          className="invoice-remove-line"
                          disabled={isReadOnly || lines.length === 1}
                          type="button"
                          onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}
                        >
                          <DeleteIcon />
                        </button>
                      </Tooltip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </RecordTableScroll>
        </section>

        <section className="invoice-footer-grid">
          <div className="invoice-notes-card">
            <h2 id="billNotesLabel">Notes</h2>
            <textarea aria-labelledby="billNotesLabel" id="billNotes" placeholder="Notes for internal use" readOnly={isReadOnly} value={notes} onChange={(event) => setNotes(event.currentTarget.value)} />
          </div>
          <div className="invoice-totals-card">
            <div><span>Subtotal</span><strong>{currency.format(totals.subtotal)}</strong></div>
            <div>
              <label htmlFor="billDiscount">Discount</label>
              <span className="invoice-discount-input">
                <input id="billDiscount" type="number" min="0" max="100" step="0.01" readOnly={isReadOnly} value={discountPercent} onChange={(event) => setDiscountPercent(Number(event.currentTarget.value))} />
                <b>%</b>
              </span>
              <strong>-{currency.format(totals.discountAmount)}</strong>
            </div>
            <div><span>Tax</span><strong>{currency.format(totals.taxTotal)}</strong></div>
            <div className="invoice-total-row"><span>Total</span><strong>{currency.format(totals.total)}</strong></div>
          </div>
        </section>
        <div className="message" role={message ? "alert" : undefined}>{message}</div>
      </form>

      <section className="panel saved-invoices-panel record-list-panel">
        <div className="item-form-head record-list-head">
          <div><h2>Saved bills</h2><p>{countLabel}</p></div>
          <RecordListSearch label="Search bills" placeholder="Search bills by any detail…" value={query} onChange={setQuery} />
        </div>
        <RecordTableScroll className="saved-invoices-table-wrap" columns={7}>
          <table className="saved-invoices-table">
            <thead>
              <tr><th>Bill number</th><th>Vendor</th><th>Bill date</th><th>Due date</th><th>Status</th><th>Total</th><th className="record-actions-heading">Actions</th></tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr><td className="muted" colSpan={7}>{query ? "No bills match your search." : "No saved bills yet."}</td></tr>
              ) : filteredBills.map((bill) => (
                <tr key={bill.id}>
                  <td><strong>{bill.billNumber}</strong></td>
                  <td>{bill.vendor.displayName}</td>
                  <td>{new Date(bill.billDate).toLocaleDateString()}</td>
                  <td>{new Date(bill.dueDate).toLocaleDateString()}</td>
                  <td><span className={`invoice-status ${bill.status === "Paid" ? "is-paid" : bill.status === "Partially Paid" ? "is-partially-paid" : "is-unpaid"}`}>{bill.status}</span></td>
                  <td><strong>{currency.format(bill.total)}</strong></td>
                  <td className="record-actions-cell">
                    <RecordActionsMenu
                      disabled={deletingId !== null || isSaving}
                      recordLabel={bill.billNumber}
                      actions={[
                        {
                          label: "View",
                          icon: appIcons.actions.view,
                          disabled: deletingId !== null || isSaving,
                          onSelect: () => loadBill(bill),
                        },
                        ...(bill.status !== "Paid" ? [{
                          label: "Pay bill",
                          icon: appIcons.actions.payment,
                          disabled: deletingId !== null || isSaving,
                          onSelect: () => {
                            setMessage("");
                            setPaymentBill(bill);
                            setPaymentDate(today);
                            setPaymentAmount(bill.remainingBalance);
                          },
                        }] : []),
                        {
                          label: deletingId === bill.id ? "Deleting" : "Delete",
                          icon: appIcons.actions.delete,
                          tone: "danger" as const,
                          disabled: deletingId !== null || isSaving,
                          onSelect: () => void deleteBill(bill),
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

      {paymentBill ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => !isPaying && setPaymentBill(null)}>
          <form
            className="panel payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bill-payment-title"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setIsPaying(true);
              try {
                await api.recordBillPayment(token, paymentBill.id, { paymentDate, amount: paymentAmount });
                await onRefresh();
                if (selectedBillId === paymentBill.id) resetForm();
                setPaymentBill(null);
              } catch (error) {
                setMessage(error instanceof ApiError ? error.message : "Unable to record the payment.");
              } finally {
                setIsPaying(false);
              }
            }}
          >
            <div className="item-form-head">
              <div><h2 id="bill-payment-title">Pay bill</h2><p>{paymentBill.billNumber} · {paymentBill.vendor.displayName}</p></div>
            </div>
            <DateField id="billPaymentDate" label="Payment date" required value={paymentDate} onChange={setPaymentDate} />
            <div className="field">
              <label htmlFor="billPaymentAmount">Amount</label>
              <input id="billPaymentAmount" type="number" min="0.01" max={paymentBill.remainingBalance} step="0.01" required value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.currentTarget.value))} />
            </div>
            <div className="message" role="status">{message}</div>
            <div className="payment-modal-actions">
              <button className="ghost-button" disabled={isPaying} type="button" onClick={() => setPaymentBill(null)}>Cancel</button>
              <button className="button" disabled={isPaying} type="submit">{isPaying ? "Saving..." : "Save payment"}</button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
};

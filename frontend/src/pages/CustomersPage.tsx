import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { appIcons } from "../icons";
import { useLanguage } from "../i18n";
import type { Contact, CustomerType } from "../types";

type Props = {
  contacts: Contact[];
  dataError?: string;
  token: string;
  onRefresh: () => Promise<void>;
};

type CustomerDraft = {
  customerType: CustomerType;
  companyName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxRate: string;
  paymentTerms: string;
  notes: string;
};

type CustomerMode = "new" | "details" | "edit";

const emptyDraft: CustomerDraft = {
  customerType: "business",
  companyName: "",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  taxRate: "",
  paymentTerms: "Due on Receipt",
  notes: "",
};

const paymentTerms = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
const customerDraftKeys = Object.keys(emptyDraft) as Array<keyof CustomerDraft>;

const customerToDraft = (customer: Contact): CustomerDraft => {
  const customerType: CustomerType = customer.customerType === "individual" ? "individual" : "business";
  return {
    customerType,
    companyName: customer.companyName ?? (customerType === "business" ? customer.displayName : ""),
    firstName: customer.firstName ?? "",
    lastName: customer.lastName ?? "",
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    addressLine1: customer.addressLine1 ?? "",
    addressLine2: customer.addressLine2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    postalCode: customer.postalCode ?? "",
    country: customer.country ?? "",
    taxRate: customer.taxRate ?? "",
    paymentTerms: customer.paymentTerms ?? "Due on Receipt",
    notes: customer.notes ?? "",
  };
};

const draftsMatch = (left: CustomerDraft, right: CustomerDraft) =>
  customerDraftKeys.every((key) => left[key] === right[key]);

export const CustomersPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const { t } = useLanguage();
  const SearchIcon = appIcons.actions.search;
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const [baseline, setBaseline] = useState<CustomerDraft>(emptyDraft);
  const [mode, setMode] = useState<CustomerMode>("new");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) => {
      const searchableDetails = [
        contact.displayName,
        contact.customerType,
        contact.companyName,
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.addressLine1,
        contact.addressLine2,
        contact.city,
        contact.state,
        contact.postalCode,
        contact.country,
        contact.taxRate,
        contact.paymentTerms,
        contact.notes,
      ];

      return searchableDetails.some((value) => value?.toLocaleLowerCase().includes(normalized));
    });
  }, [contacts, query]);

  const isReadOnly = mode === "details";
  const hasUnsavedChanges = mode === "edit"
    ? !draftsMatch(draft, baseline)
    : mode === "new" && !draftsMatch(draft, emptyDraft);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const set = (field: Exclude<keyof CustomerDraft, "customerType">, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const resetToNew = () => {
    setDraft(emptyDraft);
    setBaseline(emptyDraft);
    setMode("new");
    setSelectedCustomerId(null);
    setMessage("");
    setOpenDropdown(null);
  };

  const scrollToForm = () => window.scrollTo({ top: 0, behavior: "smooth" });

  const openCustomer = (customer: Contact, nextMode: Extract<CustomerMode, "details" | "edit">) => {
    if (isSaving || deletingId !== null) return;
    if (selectedCustomerId && selectedCustomerId !== customer.id) return;
    if (hasUnsavedChanges && !window.confirm(t("Discard unsaved changes?"))) return;

    const customerDraft = customerToDraft(customer);
    setSelectedCustomerId(customer.id);
    setDraft(customerDraft);
    setBaseline(customerDraft);
    setMode(nextMode);
    setMessage("");
    setOpenDropdown(null);
    scrollToForm();
  };

  const deleteCustomer = async (customer: Contact) => {
    if (!window.confirm(`Delete ${customer.displayName}?`)) return;
    setMessage("");
    setDeletingId(customer.id);
    try {
      await api.deleteCustomer(token, customer.id);
      if (selectedCustomerId === customer.id) resetToNew();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to delete customer.");
    } finally {
      setDeletingId(null);
    }
  };

  const title = mode === "new" ? "New customer" : mode === "details" ? "Customer details" : "Edit customer";
  const countLabel = query.trim()
    ? `${filteredContacts.length} of ${contacts.length} customers`
    : `${contacts.length} customer${contacts.length === 1 ? "" : "s"}`;

  return (
    <>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <section className="items-workspace customer-workspace">
        <form
          className={`panel item-form compact-item-form customer-form ${isReadOnly ? "is-read-only" : ""}`}
          onSubmit={async (event) => {
            event.preventDefault();
            if (mode === "details" || isSaving) return;
            setMessage("");
            setIsSaving(true);
            try {
              const payload = Object.fromEntries(new FormData(event.currentTarget));
              if (mode === "edit" && selectedCustomerId) {
                const updated = await api.updateCustomer(token, selectedCustomerId, payload);
                const updatedDraft = customerToDraft(updated);
                setDraft(updatedDraft);
                setBaseline(updatedDraft);
                setMode("details");
                setOpenDropdown(null);
                await onRefresh();
              } else {
                await api.createContact(token, "customers", payload);
                resetToNew();
                await onRefresh();
              }
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to save customer.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className="item-form-head">
            <div><h2>{title}</h2><p>Contact and billing details</p></div>
            <div className="invoice-form-actions">
              {mode === "details" ? (
                <>
                  <button className="ghost-button" type="button" onClick={resetToNew}>Close</button>
                  <button className="button" type="button" onClick={() => setMode("edit")}>Edit customer</button>
                </>
              ) : mode === "edit" ? (
                <>
                  <button className="ghost-button" disabled={isSaving} type="button" onClick={() => {
                    setDraft(baseline);
                    setMode("details");
                    setMessage("");
                    setOpenDropdown(null);
                  }}>Cancel</button>
                  <button className="button" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Update customer"}</button>
                </>
              ) : (
                <button className="button" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Save customer"}</button>
              )}
            </div>
          </div>

          <div className="item-compact-grid customer-compact-grid">
            <section className="item-basics customer-basics">
              <h3 className="customer-section-title">Customer details</h3>
              <div className="radio-field">
                <span>Type</span>
                <label className="radio-option"><input checked={draft.customerType === "business"} disabled={isReadOnly} type="radio" name="customerType" value="business" onChange={() => setDraft((current) => ({ ...current, customerType: "business" }))} /><span className="option-text">Business</span></label>
                <label className="radio-option"><input checked={draft.customerType === "individual"} disabled={isReadOnly} type="radio" name="customerType" value="individual" onChange={() => setDraft((current) => ({ ...current, customerType: "individual" }))} /><span className="option-text">Individual</span></label>
              </div>
              {draft.customerType === "business" ? (
                <Field label="Company name" name="companyName" placeholder="Acme Trading" readOnly={isReadOnly} required value={draft.companyName} onChange={(event) => set("companyName", event.currentTarget.value)} />
              ) : (
                <div className="split"><Field label="First name" name="firstName" readOnly={isReadOnly} required value={draft.firstName} onChange={(event) => set("firstName", event.currentTarget.value)} /><Field label="Last name" name="lastName" readOnly={isReadOnly} required value={draft.lastName} onChange={(event) => set("lastName", event.currentTarget.value)} /></div>
              )}
              <Field label="Email address" name="email" readOnly={isReadOnly} type="email" value={draft.email} onChange={(event) => set("email", event.currentTarget.value)} />
              <Field label="Phone" name="phone" readOnly={isReadOnly} value={draft.phone} onChange={(event) => set("phone", event.currentTarget.value)} />
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Billing address</h3>
              <div className="item-info-fields">
                <Field label="Address line 1" name="addressLine1" placeholder="Street and building" readOnly={isReadOnly} value={draft.addressLine1} onChange={(event) => set("addressLine1", event.currentTarget.value)} />
                <Field label="Address line 2" name="addressLine2" placeholder="Suite, floor, or landmark" readOnly={isReadOnly} value={draft.addressLine2} onChange={(event) => set("addressLine2", event.currentTarget.value)} />
                <Field label="City" name="city" readOnly={isReadOnly} value={draft.city} onChange={(event) => set("city", event.currentTarget.value)} />
                <Field label="State / province" name="state" readOnly={isReadOnly} value={draft.state} onChange={(event) => set("state", event.currentTarget.value)} />
                <Field label="Postal code" name="postalCode" readOnly={isReadOnly} value={draft.postalCode} onChange={(event) => set("postalCode", event.currentTarget.value)} />
                <Field label="Country" name="country" readOnly={isReadOnly} value={draft.country} onChange={(event) => set("country", event.currentTarget.value)} />
              </div>
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Sales settings</h3>
              <div className="item-info-fields">
                <DropdownField disabled={isReadOnly} label="Tax" name="taxRate" options={TAX_OPTIONS} placeholder="Select a tax" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.taxRate} onChange={(value) => set("taxRate", value)} />
                <DropdownField disabled={isReadOnly} label="Payment terms" name="paymentTerms" options={paymentTerms} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.paymentTerms} onChange={(value) => set("paymentTerms", value)} />
                <div className="field item-description-field customer-notes"><label htmlFor="customer-notes">Notes</label><textarea id="customer-notes" name="notes" placeholder="Internal context about this customer" readOnly={isReadOnly} value={draft.notes} onChange={(event) => set("notes", event.currentTarget.value)} /></div>
              </div>
            </section>
          </div>
          <div className="message" role={message ? "alert" : undefined}>{message}</div>
        </form>

        <div className="panel item-list-panel customer-list-panel">
          <div className="item-form-head customer-list-head">
            <div><h2>Customer list</h2><p>{countLabel}</p></div>
            <label className="customer-search">
              <span className="sr-only">Search customers</span>
              <SearchIcon className="customer-search-icon" />
              <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search customers by any detail…" />
            </label>
          </div>
          <div className="table-wrap customer-table-wrap record-table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Contact</th><th>Location</th><th>Tax</th><th>Terms</th><th className="record-actions-heading">Actions</th></tr></thead>
              <tbody>
                {filteredContacts.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No customers match your search." : "No customers yet."}</td></tr> : filteredContacts.map((contact) => {
                  const conflictingCustomer = selectedCustomerId !== null && selectedCustomerId !== contact.id;
                  const editingThisCustomer = mode === "edit" && selectedCustomerId === contact.id;
                  return (
                    <tr key={contact.id}>
                      <td><strong>{contact.displayName}</strong><br /><span className="muted">{contact.customerType === "individual" ? "Individual" : "Business"}</span></td>
                      <td>{contact.email || "-"}<br /><span className="muted">{contact.phone || "No phone"}</span></td>
                      <td>{[contact.city, contact.country].filter(Boolean).join(", ") || "-"}</td>
                      <td>{contact.taxRate || "-"}</td><td>{contact.paymentTerms || "Due on Receipt"}</td>
                      <td className="record-actions-cell">
                        <RecordActionsMenu
                          recordLabel={contact.displayName}
                          actions={[
                            { label: "View", icon: appIcons.actions.view, disabled: conflictingCustomer || editingThisCustomer || isSaving || deletingId !== null, onSelect: () => openCustomer(contact, "details") },
                            { label: "Edit", icon: appIcons.actions.edit, disabled: conflictingCustomer || editingThisCustomer || isSaving || deletingId !== null, onSelect: () => openCustomer(contact, "edit") },
                            { label: deletingId === contact.id ? "Deleting" : "Delete", icon: appIcons.actions.delete, tone: "danger", disabled: deletingId !== null || isSaving, onSelect: () => void deleteCustomer(contact) },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

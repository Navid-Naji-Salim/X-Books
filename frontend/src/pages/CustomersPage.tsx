import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
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

export const CustomersPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const [draft, setDraft] = useState<CustomerDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

      return searchableDetails.some((value) =>
        value?.toLocaleLowerCase().includes(normalized),
      );
    });
  }, [contacts, query]);

  const set = (field: Exclude<keyof CustomerDraft, "customerType">, value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const reset = () => {
    setDraft(emptyDraft);
    setEditingId(null);
    setMessage("");
    setOpenDropdown(null);
  };

  const editCustomer = (customer: Contact) => {
    const customerType: CustomerType = customer.customerType === "individual" ? "individual" : "business";
    setEditingId(customer.id);
    setDraft({
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
    });
    setMessage("");
    setOpenDropdown(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCustomer = async (customer: Contact) => {
    if (!window.confirm(`Delete ${customer.displayName}?`)) return;
    setMessage("");
    setDeletingId(customer.id);
    try {
      await api.deleteCustomer(token, customer.id);
      if (editingId === customer.id) reset();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to delete customer.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <section className="items-workspace customer-workspace">
        <form
          className="panel item-form compact-item-form customer-form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            try {
              const payload = Object.fromEntries(new FormData(event.currentTarget));
              if (editingId) await api.updateCustomer(token, editingId, payload);
              else await api.createContact(token, "customers", payload);
              reset();
              await onRefresh();
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to save customer.");
            }
          }}
        >
          <div className="item-form-head">
            <div><h2>{editingId ? "Edit customer" : "New customer"}</h2><p>Contact and billing details</p></div>
            <div className="invoice-form-actions">
              {editingId ? <button className="ghost-button" type="button" onClick={reset}>Cancel</button> : null}
              <button className="button" type="submit">{editingId ? "Update customer" : "Save customer"}</button>
            </div>
          </div>

          <div className="item-compact-grid customer-compact-grid">
            <section className="item-basics customer-basics">
              <h3 className="customer-section-title">Customer details</h3>
              <div className="radio-field">
                <span>Type</span>
                <label className="radio-option"><input checked={draft.customerType === "business"} type="radio" name="customerType" value="business" onChange={() => setDraft((current) => ({ ...current, customerType: "business" }))} /><span className="option-text">Business</span></label>
                <label className="radio-option"><input checked={draft.customerType === "individual"} type="radio" name="customerType" value="individual" onChange={() => setDraft((current) => ({ ...current, customerType: "individual" }))} /><span className="option-text">Individual</span></label>
              </div>
              {draft.customerType === "business" ? (
                <Field label="Company name" name="companyName" placeholder="Acme Trading" required value={draft.companyName} onChange={(event) => set("companyName", event.currentTarget.value)} />
              ) : (
                <div className="split"><Field label="First name" name="firstName" required value={draft.firstName} onChange={(event) => set("firstName", event.currentTarget.value)} /><Field label="Last name" name="lastName" required value={draft.lastName} onChange={(event) => set("lastName", event.currentTarget.value)} /></div>
              )}
              <Field label="Email address" name="email" type="email" value={draft.email} onChange={(event) => set("email", event.currentTarget.value)} />
              <Field label="Phone" name="phone" value={draft.phone} onChange={(event) => set("phone", event.currentTarget.value)} />
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Billing address</h3>
              <div className="item-info-fields">
                <Field label="Address line 1" name="addressLine1" placeholder="Street and building" value={draft.addressLine1} onChange={(event) => set("addressLine1", event.currentTarget.value)} />
                <Field label="Address line 2" name="addressLine2" placeholder="Suite, floor, or landmark" value={draft.addressLine2} onChange={(event) => set("addressLine2", event.currentTarget.value)} />
                <Field label="City" name="city" value={draft.city} onChange={(event) => set("city", event.currentTarget.value)} />
                <Field label="State / province" name="state" value={draft.state} onChange={(event) => set("state", event.currentTarget.value)} />
                <Field label="Postal code" name="postalCode" value={draft.postalCode} onChange={(event) => set("postalCode", event.currentTarget.value)} />
                <Field label="Country" name="country" value={draft.country} onChange={(event) => set("country", event.currentTarget.value)} />
              </div>
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Sales settings</h3>
              <div className="item-info-fields">
                <DropdownField label="Tax" name="taxRate" options={TAX_OPTIONS} placeholder="Select a tax" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.taxRate} onChange={(value) => set("taxRate", value)} />
                <DropdownField label="Payment terms" name="paymentTerms" options={paymentTerms} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.paymentTerms} onChange={(value) => set("paymentTerms", value)} />
                <div className="field item-description-field customer-notes"><label htmlFor="customer-notes">Notes</label><textarea id="customer-notes" name="notes" placeholder="Internal context about this customer" value={draft.notes} onChange={(event) => set("notes", event.currentTarget.value)} /></div>
              </div>
            </section>
          </div>
          <div className="message">{message}</div>
        </form>

        <div className="panel item-list-panel customer-list-panel">
          <div className="item-form-head customer-list-head">
            <div><h2>Customer list</h2><p>{contacts.length} customer{contacts.length === 1 ? "" : "s"}</p></div>
            <label className="customer-search"><span className="sr-only">Search customers</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search by any customer detail..." /></label>
          </div>
          <div className="table-wrap customer-table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Contact</th><th>Location</th><th>Tax</th><th>Terms</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredContacts.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No customers match your search." : "No customers yet."}</td></tr> : filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td><strong>{contact.displayName}</strong><br /><span className="muted">{contact.companyName || (contact.customerType === "individual" ? "Individual" : "Business")}</span></td>
                    <td>{contact.email || "-"}<br /><span className="muted">{contact.phone || "No phone"}</span></td>
                    <td>{[contact.city, contact.country].filter(Boolean).join(", ") || "-"}</td>
                    <td>{contact.taxRate || "-"}</td><td>{contact.paymentTerms || "Due on Receipt"}</td>
                    <td className="record-actions-cell"><div className="record-actions"><button className="ghost-button record-action-button record-edit-button" type="button" onClick={() => editCustomer(contact)}>Edit</button><button className="ghost-button danger-button record-action-button record-delete-button" disabled={deletingId === contact.id} type="button" onClick={() => void deleteCustomer(contact)}>{deletingId === contact.id ? "Deleting" : "Delete"}</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
};

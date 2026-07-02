import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import type { Contact } from "../types";

type Props = {
  contacts: Contact[];
  dataError?: string;
  token: string;
  onRefresh: () => Promise<void>;
};

const paymentTerms = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];
export const CustomersPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [customerType, setCustomerType] = useState<"business" | "individual">("business");
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

  const deleteCustomer = async (customer: Contact) => {
    if (!window.confirm(`Delete ${customer.displayName}?`)) return;
    setMessage("");
    setDeletingId(customer.id);
    try {
      await api.deleteCustomer(token, customer.id);
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
            const form = event.currentTarget;
            try {
              await api.createContact(token, "customers", Object.fromEntries(new FormData(form)));
              form.reset();
              setCustomerType("business");
              setOpenDropdown(null);
              setResetVersion((current) => current + 1);
              await onRefresh();
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to save customer.");
            }
          }}
        >
          <div className="item-form-head">
            <div><h2>New customer</h2><p>Contact and billing details</p></div>
            <button className="button" type="submit">Save customer</button>
          </div>

          <div className="item-compact-grid customer-compact-grid">
            <section className="item-basics customer-basics">
              <h3 className="customer-section-title">Customer details</h3>
              <div className="radio-field">
                <span>Type</span>
                <label className="radio-option"><input checked={customerType === "business"} type="radio" name="customerType" value="business" onChange={() => setCustomerType("business")} /><span className="option-text">Business</span></label>
                <label className="radio-option"><input checked={customerType === "individual"} type="radio" name="customerType" value="individual" onChange={() => setCustomerType("individual")} /><span className="option-text">Individual</span></label>
              </div>
              {customerType === "business" ? (
                <Field label="Company name" name="companyName" placeholder="Acme Trading" required />
              ) : (
                <div className="split"><Field label="First name" name="firstName" required /><Field label="Last name" name="lastName" required /></div>
              )}
              <Field label="Email address" name="email" type="email" />
              <Field label="Phone" name="phone" />
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Billing address</h3>
              <div className="item-info-fields">
                <Field label="Address line 1" name="addressLine1" placeholder="Street and building" />
                <Field label="Address line 2" name="addressLine2" placeholder="Suite, floor, or landmark" />
                <Field label="City" name="city" /><Field label="State / province" name="state" />
                <Field label="Postal code" name="postalCode" /><Field label="Country" name="country" />
              </div>
            </section>

            <section className="item-info-section customer-info-section">
              <h3 className="check-title customer-section-title">Sales settings</h3>
              <div className="item-info-fields">
                <DropdownField label="Tax" name="taxRate" options={TAX_OPTIONS} placeholder="Select a tax" openDropdown={openDropdown} resetVersion={resetVersion} setOpenDropdown={setOpenDropdown} />
                <DropdownField label="Payment terms" name="paymentTerms" options={paymentTerms} defaultValue="Due on Receipt" openDropdown={openDropdown} resetVersion={resetVersion} setOpenDropdown={setOpenDropdown} />
                <div className="field item-description-field customer-notes"><label htmlFor="customer-notes">Notes</label><textarea id="customer-notes" name="notes" placeholder="Internal context about this customer" /></div>
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
              <thead><tr><th>Name</th><th>Contact</th><th>Location</th><th>Tax</th><th>Terms</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {filteredContacts.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No customers match your search." : "No customers yet."}</td></tr> : filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td><strong>{contact.displayName}</strong><br /><span className="muted">{contact.companyName || contact.customerType || "Customer"}</span></td>
                    <td>{contact.email || "-"}<br /><span className="muted">{contact.phone || "No phone"}</span></td>
                    <td>{[contact.city, contact.country].filter(Boolean).join(", ") || "-"}</td>
                    <td>{contact.taxRate || "-"}</td><td>{contact.paymentTerms || "Due on Receipt"}</td>
                    <td><button className="ghost-button danger-button" disabled={deletingId === contact.id} type="button" onClick={() => void deleteCustomer(contact)}>{deletingId === contact.id ? "Deleting" : "Delete"}</button></td>
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

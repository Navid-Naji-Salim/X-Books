import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import type { Contact } from "../types";

type Props = {
  contacts: Contact[];
  dataError?: string;
  token: string;
  onRefresh: () => Promise<void>;
};

const taxOptions = ["Exempt", "Standard Tax", "Reduced Tax", "Out of Scope"];
const paymentTerms = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];

export const CustomersPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filteredContacts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return contacts;
    return contacts.filter((contact) =>
      [contact.displayName, contact.companyName, contact.email, contact.phone]
        .some((value) => value?.toLowerCase().includes(normalized)),
    );
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

          <div className="customer-form-grid">
            <section className="customer-form-section">
              <h3>Customer details</h3>
              <div className="radio-field">
                <span>Type</span>
                <label className="radio-option"><input type="radio" name="customerType" value="business" defaultChecked /><span className="option-text">Business</span></label>
                <label className="radio-option"><input type="radio" name="customerType" value="individual" /><span className="option-text">Individual</span></label>
              </div>
              <div className="customer-name-grid">
                <div className="field"><label htmlFor="salutation">Salutation</label><select id="salutation" name="salutation" defaultValue=""><option value="">Select</option><option>Mr.</option><option>Mrs.</option><option>Ms.</option><option>Dr.</option></select></div>
                <Field label="First name" name="firstName" />
                <Field label="Last name" name="lastName" />
              </div>
              <Field label="Display name" name="displayName" placeholder="Acme Trading" required />
              <Field label="Company name" name="companyName" />
              <Field label="Email address" name="email" type="email" />
              <div className="split"><Field label="Work phone" name="phone" /><Field label="Mobile" name="mobile" /></div>
              <div className="field"><label htmlFor="language">Customer language</label><select id="language" name="language" defaultValue="English"><option>English</option><option>Kurdish</option><option>Arabic</option></select></div>
            </section>

            <section className="customer-form-section">
              <h3>Billing address</h3>
              <Field label="Address line 1" name="addressLine1" placeholder="Street and building" />
              <Field label="Address line 2" name="addressLine2" placeholder="Suite, floor, or landmark" />
              <div className="split"><Field label="City" name="city" /><Field label="State / province" name="state" /></div>
              <div className="split"><Field label="Postal code" name="postalCode" /><Field label="Country" name="country" /></div>
            </section>

            <section className="customer-form-section">
              <h3>Sales settings</h3>
              <div className="field"><label htmlFor="taxRate">Tax rate</label><select id="taxRate" name="taxRate" defaultValue=""><option value="">Select a tax</option>{taxOptions.map((tax) => <option key={tax}>{tax}</option>)}</select></div>
              <div className="field"><label htmlFor="paymentTerms">Payment terms</label><select id="paymentTerms" name="paymentTerms" defaultValue="Due on Receipt">{paymentTerms.map((term) => <option key={term}>{term}</option>)}</select></div>
              <div className="field customer-notes"><label htmlFor="customer-notes">Notes</label><textarea id="customer-notes" name="notes" placeholder="Internal context about this customer" /></div>
            </section>
          </div>
          <div className="message">{message}</div>
        </form>

        <div className="panel item-list-panel customer-list-panel">
          <div className="item-form-head customer-list-head">
            <div><h2>Customer list</h2><p>{contacts.length} customer{contacts.length === 1 ? "" : "s"}</p></div>
            <label className="customer-search"><span className="sr-only">Search customers</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search customers" /></label>
          </div>
          <div className="table-wrap customer-table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Contact</th><th>Location</th><th>Tax</th><th>Terms</th><th aria-label="Actions" /></tr></thead>
              <tbody>
                {filteredContacts.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No customers match your search." : "No customers yet."}</td></tr> : filteredContacts.map((contact) => (
                  <tr key={contact.id}>
                    <td><strong>{contact.displayName}</strong><br /><span className="muted">{contact.companyName || contact.customerType || "Customer"}</span></td>
                    <td>{contact.email || "-"}<br /><span className="muted">{contact.phone || contact.mobile || "No phone"}</span></td>
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

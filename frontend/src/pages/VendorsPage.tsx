import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { RecordListSearch } from "../components/RecordListSearch";
import { RecordTableScroll } from "../components/RecordTableScroll";
import { CONTACT_PLACEHOLDERS } from "../contactPlaceholders";
import { appIcons } from "../icons";
import type { Contact, CustomerType } from "../types";

type Props = { contacts: Contact[]; dataError?: string; token: string; onRefresh: () => Promise<void> };
type Draft = { vendorType: CustomerType; companyName: string; firstName: string; lastName: string; email: string; phone: string; addressLine1: string; addressLine2: string; city: string; state: string; postalCode: string; country: string; taxRate: string; paymentTerms: string; notes: string };
const emptyDraft: Draft = { vendorType: "business", companyName: "", firstName: "", lastName: "", email: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "", taxRate: "", paymentTerms: "Due on Receipt", notes: "" };
const paymentTerms = ["Due on Receipt", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60"];

const vendorToDraft = (vendor: Contact): Draft => {
  const nameParts = vendor.displayName.trim().split(/\s+/).filter(Boolean);
  const legacyFirstName = nameParts.shift() ?? "";
  const vendorType: CustomerType = vendor.vendorType === "individual"
    || (Boolean(vendor.firstName && vendor.lastName) && !vendor.companyName)
    ? "individual"
    : "business";

  return {
    vendorType,
    companyName: vendor.companyName ?? (vendorType === "business" ? vendor.displayName : ""),
    firstName: vendor.firstName ?? (vendorType === "individual" ? legacyFirstName : ""),
    lastName: vendor.lastName ?? (vendorType === "individual" ? nameParts.join(" ") : ""),
    email: vendor.email ?? "",
    phone: vendor.phone ?? "",
    addressLine1: vendor.addressLine1 ?? "",
    addressLine2: vendor.addressLine2 ?? "",
    city: vendor.city ?? "",
    state: vendor.state ?? "",
    postalCode: vendor.postalCode ?? "",
    country: vendor.country ?? "",
    taxRate: vendor.taxRate ?? "",
    paymentTerms: vendor.paymentTerms ?? "Due on Receipt",
    notes: vendor.notes ?? "",
  };
};

export const VendorsPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? contacts.filter((vendor) => [vendor.displayName, vendor.vendorType, vendor.companyName, vendor.firstName, vendor.lastName, vendor.email, vendor.phone, vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.postalCode, vendor.country, vendor.taxRate, vendor.paymentTerms, vendor.notes].some((entry) => entry?.toLowerCase().includes(value))) : contacts;
  }, [contacts, query]);
  const countLabel = query.trim()
    ? `${filtered.length} of ${contacts.length} vendors`
    : `${contacts.length} vendor${contacts.length === 1 ? "" : "s"}`;
  const set = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const reset = () => { setDraft(emptyDraft); setEditingId(null); setMessage(""); setOpenDropdown(null); };

  return <>
    {dataError ? <div className="panel page-alert">{dataError}</div> : null}
    <section className="items-workspace customer-workspace">
      <form className="panel item-form compact-item-form customer-form" onSubmit={async (event) => {
        event.preventDefault(); setMessage("");
        try {
          const payload = Object.fromEntries(new FormData(event.currentTarget));
          if (editingId) await api.updateVendor(token, editingId, payload); else await api.createContact(token, "vendors", payload);
          reset(); await onRefresh();
        } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to save vendor."); }
      }}>
        <div className="item-form-head"><div><h2>{editingId ? "Vendor details" : "New vendor"}</h2><p>Contact and billing details</p></div><div className="invoice-form-actions">{editingId ? <button className="ghost-button" type="button" onClick={reset}>Close</button> : null}<button className="button" type="submit">{editingId ? "Edit vendor" : "Save vendor"}</button></div></div>
        <div className="item-compact-grid customer-compact-grid">
          <section className="item-basics customer-basics"><h3 className="customer-section-title">Vendor details</h3><div className="radio-field"><span>Type</span><label className="radio-option"><input checked={draft.vendorType === "business"} type="radio" name="vendorType" value="business" onChange={() => set("vendorType", "business")} /><span className="option-text">Business</span></label><label className="radio-option"><input checked={draft.vendorType === "individual"} type="radio" name="vendorType" value="individual" onChange={() => set("vendorType", "individual")} /><span className="option-text">Individual</span></label></div>{draft.vendorType === "business" ? <Field label="Company name" name="companyName" placeholder={CONTACT_PLACEHOLDERS.businessName} required value={draft.companyName} onChange={(event) => set("companyName", event.currentTarget.value)} /> : <div className="split"><Field label="First name" name="firstName" placeholder={CONTACT_PLACEHOLDERS.firstName} required value={draft.firstName} onChange={(event) => set("firstName", event.currentTarget.value)} /><Field label="Last name" name="lastName" placeholder={CONTACT_PLACEHOLDERS.lastName} required value={draft.lastName} onChange={(event) => set("lastName", event.currentTarget.value)} /></div>}<Field label="Email address" name="email" placeholder={CONTACT_PLACEHOLDERS.email} type="email" value={draft.email} onChange={(event) => set("email", event.currentTarget.value)} /><Field label="Phone" name="phone" value={draft.phone} onChange={(event) => set("phone", event.currentTarget.value)} /></section>
          <section className="item-info-section customer-info-section"><h3 className="check-title customer-section-title">Billing address</h3><div className="item-info-fields"><Field label="Address line 1" name="addressLine1" placeholder="Street and building" value={draft.addressLine1} onChange={(event) => set("addressLine1", event.currentTarget.value)} /><Field label="Address line 2" name="addressLine2" placeholder="Suite, floor, or landmark" value={draft.addressLine2} onChange={(event) => set("addressLine2", event.currentTarget.value)} /><Field label="City" name="city" placeholder={CONTACT_PLACEHOLDERS.city} value={draft.city} onChange={(event) => set("city", event.currentTarget.value)} /><Field label="State / province" name="state" placeholder={CONTACT_PLACEHOLDERS.state} value={draft.state} onChange={(event) => set("state", event.currentTarget.value)} /><Field label="Postal code" name="postalCode" placeholder={CONTACT_PLACEHOLDERS.postalCode} value={draft.postalCode} onChange={(event) => set("postalCode", event.currentTarget.value)} /><Field label="Country" name="country" placeholder={CONTACT_PLACEHOLDERS.country} value={draft.country} onChange={(event) => set("country", event.currentTarget.value)} /></div></section>
          <section className="item-info-section customer-info-section"><h3 className="check-title customer-section-title">Purchase settings</h3><div className="item-info-fields"><DropdownField label="Default purchase tax" name="taxRate" options={TAX_OPTIONS} placeholder="Select a tax" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.taxRate} onChange={(value) => set("taxRate", value)} /><DropdownField label="Default payment terms" name="paymentTerms" options={paymentTerms} openDropdown={openDropdown} setOpenDropdown={setOpenDropdown} value={draft.paymentTerms} onChange={(value) => set("paymentTerms", value)} /><div className="field item-description-field customer-notes"><label htmlFor="vendor-notes">Notes</label><textarea id="vendor-notes" name="notes" value={draft.notes} onChange={(event) => set("notes", event.currentTarget.value)} placeholder="Notes for internal use" /></div></div></section>
        </div><div className="message">{message}</div>
      </form>
      <div className="panel item-list-panel customer-list-panel record-list-panel">
        <div className="item-form-head record-list-head"><div><h2>Vendor list</h2><p>{countLabel}</p></div><RecordListSearch label="Search vendors" placeholder="Search vendors by any detail…" value={query} onChange={setQuery} /></div>
        <RecordTableScroll className="customer-table-wrap" columns={6}><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Notes</th><th className="record-actions-heading">Actions</th></tr></thead><tbody>
          {filtered.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No vendors match your search." : "No vendors yet."}</td></tr> : filtered.map((vendor) => <tr key={vendor.id}><td><strong>{vendor.displayName}</strong></td><td>{vendor.email || "-"}</td><td>{vendor.phone || "-"}</td><td>{[vendor.addressLine1, vendor.addressLine2, vendor.city, vendor.state, vendor.postalCode, vendor.country].filter(Boolean).join(", ") || "-"}</td><td>{vendor.notes || "-"}</td><td className="record-actions-cell"><RecordActionsMenu recordLabel={vendor.displayName} actions={[{ label: "View", icon: appIcons.actions.view, onSelect: () => { setEditingId(vendor.id); setDraft(vendorToDraft(vendor)); window.scrollTo({ top: 0, behavior: "smooth" }); } }, { label: deletingId === vendor.id ? "Deleting" : "Delete", icon: appIcons.actions.delete, tone: "danger", disabled: deletingId === vendor.id, onSelect: async () => { if (!window.confirm(`Delete ${vendor.displayName}?`)) return; setDeletingId(vendor.id); setMessage(""); try { await api.deleteVendor(token, vendor.id); if (editingId === vendor.id) reset(); await onRefresh(); } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to delete vendor."); } finally { setDeletingId(null); } } }]} /></td></tr>)}
        </tbody></table></RecordTableScroll>
      </div>
    </section>
  </>;
};

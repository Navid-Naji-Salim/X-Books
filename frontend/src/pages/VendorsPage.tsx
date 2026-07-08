import { useMemo, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import type { Contact } from "../types";

type Props = { contacts: Contact[]; dataError?: string; token: string; onRefresh: () => Promise<void> };
type Draft = { displayName: string; email: string; phone: string; address: string; notes: string };
const emptyDraft: Draft = { displayName: "", email: "", phone: "", address: "", notes: "" };

export const VendorsPage = ({ contacts, dataError, token, onRefresh }: Props) => {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return value ? contacts.filter((vendor) => [vendor.displayName, vendor.email, vendor.phone, vendor.address, vendor.notes].some((entry) => entry?.toLowerCase().includes(value))) : contacts;
  }, [contacts, query]);
  const set = (field: keyof Draft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const reset = () => { setDraft(emptyDraft); setEditingId(null); setMessage(""); };

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
        <div className="item-form-head"><div><h2>{editingId ? "Edit vendor" : "New vendor"}</h2><p>Contact and purchasing details</p></div><div className="invoice-form-actions">{editingId ? <button className="ghost-button" type="button" onClick={reset}>Cancel</button> : null}<button className="button" type="submit">{editingId ? "Update vendor" : "Save vendor"}</button></div></div>
        <div className="item-compact-grid customer-compact-grid">
          <section className="item-basics customer-basics"><h3 className="customer-section-title">Vendor details</h3><Field label="Vendor name" name="displayName" required value={draft.displayName} onChange={(event) => set("displayName", event.currentTarget.value)} /><Field label="Email" name="email" type="email" value={draft.email} onChange={(event) => set("email", event.currentTarget.value)} /><Field label="Phone" name="phone" value={draft.phone} onChange={(event) => set("phone", event.currentTarget.value)} /></section>
          <section className="item-info-section customer-info-section"><h3 className="check-title customer-section-title">Address</h3><div className="item-info-fields"><div className="field item-description-field customer-notes"><label htmlFor="vendor-address">Address</label><textarea id="vendor-address" name="address" value={draft.address} onChange={(event) => set("address", event.currentTarget.value)} placeholder="Street, city, state, postal code, country" /></div></div></section>
          <section className="item-info-section customer-info-section"><h3 className="check-title customer-section-title">Notes</h3><div className="item-info-fields"><div className="field item-description-field customer-notes"><label htmlFor="vendor-notes">Notes</label><textarea id="vendor-notes" name="notes" value={draft.notes} onChange={(event) => set("notes", event.currentTarget.value)} placeholder="Internal context about this vendor" /></div></div></section>
        </div><div className="message">{message}</div>
      </form>
      <div className="panel item-list-panel customer-list-panel">
        <div className="item-form-head customer-list-head"><div><h2>Vendor list</h2><p>{contacts.length} vendor{contacts.length === 1 ? "" : "s"}</p></div><label className="customer-search"><span className="sr-only">Search vendors</span><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Search by any vendor detail..." /></label></div>
        <div className="table-wrap customer-table-wrap"><table><thead><tr><th>Vendor</th><th>Email</th><th>Phone</th><th>Address</th><th>Notes</th><th aria-label="Actions" /></tr></thead><tbody>
          {filtered.length === 0 ? <tr><td colSpan={6} className="muted">{query ? "No vendors match your search." : "No vendors yet."}</td></tr> : filtered.map((vendor) => <tr key={vendor.id}><td><strong>{vendor.displayName}</strong></td><td>{vendor.email || "-"}</td><td>{vendor.phone || "-"}</td><td>{vendor.address || "-"}</td><td>{vendor.notes || "-"}</td><td><div className="invoice-row-actions"><button className="ghost-button" type="button" onClick={() => { setEditingId(vendor.id); setDraft({ displayName: vendor.displayName, email: vendor.email ?? "", phone: vendor.phone ?? "", address: vendor.address ?? "", notes: vendor.notes ?? "" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="ghost-button danger-button" disabled={deletingId === vendor.id} type="button" onClick={async () => { if (!window.confirm(`Delete ${vendor.displayName}?`)) return; setDeletingId(vendor.id); setMessage(""); try { await api.deleteVendor(token, vendor.id); if (editingId === vendor.id) reset(); await onRefresh(); } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to delete vendor."); } finally { setDeletingId(null); } }}>{deletingId === vendor.id ? "Deleting" : "Delete"}</button></div></td></tr>)}
        </tbody></table></div>
      </div>
    </section>
  </>;
};

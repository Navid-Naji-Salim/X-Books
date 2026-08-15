import { useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { ModalLayer } from "../components/ModalLayer";
import { useUnsavedChangesGuard } from "../components/useUnsavedChangesGuard";
import type { CompanyProfile, User } from "../types";

type AccountDraft = { name: string; email: string; currentPassword: string };
type CompanyDraft = {
  name: string;
  businessEmail: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId: string;
};

const accountDraftFor = (user: User): AccountDraft => ({ name: user.name, email: user.email, currentPassword: "" });
const companyDraftFor = (company: CompanyProfile): CompanyDraft => ({
  name: company.name,
  businessEmail: company.businessEmail ?? "",
  phone: company.phone ?? "",
  addressLine1: company.addressLine1 ?? "",
  addressLine2: company.addressLine2 ?? "",
  city: company.city ?? "",
  state: company.state ?? "",
  postalCode: company.postalCode ?? "",
  country: company.country ?? "",
  taxId: company.taxId ?? "",
});

export const SettingsPage = ({ onAccountDeleted, onUserUpdated, token, user }: {
  onAccountDeleted: () => void;
  onUserUpdated: (user: User, token?: string) => void;
  token: string;
  user: User;
}) => {
  const company = user.company!;
  const [account, setAccount] = useState(() => accountDraftFor(user));
  const [companyDraft, setCompanyDraft] = useState(() => companyDraftFor(company));
  const [accountMessage, setAccountMessage] = useState("");
  const [companyMessage, setCompanyMessage] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => setAccount(accountDraftFor(user)), [user.id, user.name, user.email]);
  useEffect(() => setCompanyDraft(companyDraftFor(company)), [company]);

  const accountChanged = account.name !== user.name || account.email !== user.email;
  const companyChanged = useMemo(() => JSON.stringify(companyDraft) !== JSON.stringify(companyDraftFor(company)), [company, companyDraft]);
  useUnsavedChangesGuard(accountChanged || companyChanged);

  const setAccountField = (field: keyof AccountDraft, value: string) => {
    setAccount((current) => ({ ...current, [field]: value }));
    setAccountMessage("");
  };
  const setCompanyField = (field: keyof CompanyDraft, value: string) => {
    setCompanyDraft((current) => ({ ...current, [field]: value }));
    setCompanyMessage("");
  };

  return (
    <div className="settings-page">
      <section className="panel settings-surface">
        <header className="settings-surface-head"><h1>Settings</h1></header>

        <form className="settings-group" onSubmit={async (event) => {
          event.preventDefault();
          if (isSavingAccount || !accountChanged) return;
          setIsSavingAccount(true); setAccountMessage("");
          try {
            const response = await api.updateAccount(token, {
              name: account.name,
              email: account.email,
              ...(account.email !== user.email ? { currentPassword: account.currentPassword } : {}),
            });
            onUserUpdated(response.user, response.token);
            setAccount({ name: response.user.name, email: response.user.email, currentPassword: "" });
            setAccountMessage("Account settings saved.");
          } catch (error) {
            setAccountMessage(error instanceof ApiError ? error.message : "Unable to save account settings.");
          } finally { setIsSavingAccount(false); }
        }}>
          <div className="item-form-head">
            <div><h2>Account</h2></div>
            <button className="button" disabled={isSavingAccount || !accountChanged} type="submit">{isSavingAccount ? "Saving..." : "Save changes"}</button>
          </div>
          <div className="settings-form-grid">
            <Field autoComplete="name" label="Name" maxLength={100} name="settings-account-name" required value={account.name} onChange={(event) => setAccountField("name", event.currentTarget.value)} />
            <Field autoComplete="email" label="Email" maxLength={254} name="settings-account-email" required type="email" value={account.email} onChange={(event) => setAccountField("email", event.currentTarget.value)} />
            {account.email !== user.email ? <Field autoComplete="current-password" className="settings-password-field" label="Current password" name="settings-current-password" required type="password" value={account.currentPassword} onChange={(event) => setAccountField("currentPassword", event.currentTarget.value)} /> : null}
          </div>
          <div aria-live="polite" className="message" role="status">{accountMessage}</div>
        </form>

        <div className="settings-divider" />

        <form className="settings-group" onSubmit={async (event) => {
          event.preventDefault();
          if (isSavingCompany || !companyChanged) return;
          setIsSavingCompany(true); setCompanyMessage("");
          try {
            const response = await api.updateCompany(token, companyDraft);
            onUserUpdated({ ...user, company: response.company });
            setCompanyDraft(companyDraftFor(response.company));
            setCompanyMessage("Company settings saved.");
          } catch (error) {
            setCompanyMessage(error instanceof ApiError ? error.message : "Unable to save company settings.");
          } finally { setIsSavingCompany(false); }
        }}>
          <div className="item-form-head">
            <div><h2>Company</h2></div>
            <button className="button" disabled={isSavingCompany || !companyChanged} type="submit">{isSavingCompany ? "Saving..." : "Save changes"}</button>
          </div>
          <div className="settings-form-grid">
            <Field autoComplete="organization" label="Company Name" maxLength={150} name="settings-company-name" required value={companyDraft.name} onChange={(event) => setCompanyField("name", event.currentTarget.value)} />
            <Field autoComplete="email" label="Business Email" maxLength={254} name="settings-company-email" type="email" value={companyDraft.businessEmail} onChange={(event) => setCompanyField("businessEmail", event.currentTarget.value)} />
            <Field autoComplete="tel" label="Phone" maxLength={40} name="settings-company-phone" value={companyDraft.phone} onChange={(event) => setCompanyField("phone", event.currentTarget.value)} />
            <Field label="Tax ID" maxLength={80} name="settings-company-tax-id" value={companyDraft.taxId} onChange={(event) => setCompanyField("taxId", event.currentTarget.value)} />
            <Field autoComplete="address-line1" label="Business Address" maxLength={200} name="settings-company-address-1" value={companyDraft.addressLine1} onChange={(event) => setCompanyField("addressLine1", event.currentTarget.value)} />
            <Field autoComplete="address-line2" label="Address Line 2" maxLength={200} name="settings-company-address-2" value={companyDraft.addressLine2} onChange={(event) => setCompanyField("addressLine2", event.currentTarget.value)} />
            <Field autoComplete="address-level2" label="City" maxLength={100} name="settings-company-city" value={companyDraft.city} onChange={(event) => setCompanyField("city", event.currentTarget.value)} />
            <Field autoComplete="address-level1" label="State / Province" maxLength={100} name="settings-company-state" value={companyDraft.state} onChange={(event) => setCompanyField("state", event.currentTarget.value)} />
            <Field autoComplete="postal-code" label="Postal Code" maxLength={30} name="settings-company-postal" value={companyDraft.postalCode} onChange={(event) => setCompanyField("postalCode", event.currentTarget.value)} />
            <Field autoComplete="country-name" label="Country" maxLength={100} name="settings-company-country" value={companyDraft.country} onChange={(event) => setCompanyField("country", event.currentTarget.value)} />
          </div>
          <div aria-live="polite" className="message" role="status">{companyMessage}</div>
        </form>

        <div className="settings-divider" />

        <section className="settings-group settings-danger-zone">
          <div className="item-form-head">
            <div><h2>Danger Zone</h2><p>Permanently delete your account, company, and all accounting data.</p></div>
            <button className="button danger-button" type="button" onClick={() => { setDeleteMessage(""); setIsDeleteOpen(true); }}>Delete Account</button>
          </div>
        </section>
      </section>

      {isDeleteOpen ? <ModalLayer closeDisabled={isDeleting} initialFocusRef={passwordRef} onClose={() => setIsDeleteOpen(false)}><section aria-labelledby="delete-account-title" aria-modal="true" className="panel payment-modal" role="dialog"><form onSubmit={async (event) => {
        event.preventDefault(); if (isDeleting) return; setDeleteMessage(""); setIsDeleting(true);
        try { await api.deleteAccount(token, String(new FormData(event.currentTarget).get("password") ?? "")); onAccountDeleted(); }
        catch (error) { setDeleteMessage(error instanceof ApiError ? error.message : "Unable to delete your account."); setIsDeleting(false); }
      }}><div className="item-form-head"><div><h2 id="delete-account-title">Delete your account permanently?</h2><p>This cannot be undone. Your company and every accounting record will be deleted.</p></div></div><div className="field"><label htmlFor="delete-account-password">Enter your password to confirm</label><input autoComplete="current-password" id="delete-account-password" name="password" ref={passwordRef} type="password" required /></div><div className="message" role="status">{deleteMessage}</div><div className="payment-modal-actions"><button className="ghost-button" disabled={isDeleting} type="button" onClick={() => setIsDeleteOpen(false)}>Cancel</button><button className="button danger-button" disabled={isDeleting} type="submit">{isDeleting ? <span className="button-spinner" aria-label="Deleting Account" /> : "Delete Account"}</button></div></form></section></ModalLayer> : null}
    </div>
  );
};

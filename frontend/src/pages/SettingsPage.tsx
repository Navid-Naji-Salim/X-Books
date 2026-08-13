import { useRef, useState } from "react";
import { api, ApiError } from "../api";
import { ModalLayer } from "../components/ModalLayer";
import { PageTitle } from "../components/PageTitle";
import type { User } from "../types";

export const SettingsPage = ({ onAccountDeleted, token, user }: { onAccountDeleted: () => void; token: string; user: User }) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false); const [isDeleting, setIsDeleting] = useState(false); const [message, setMessage] = useState("");
  const passwordRef = useRef<HTMLInputElement>(null);
  return <div className="settings-page">
    <PageTitle eyebrow="Workspace" title="Settings" description="Account and company information" />
    <section className="panel settings-section"><div className="item-form-head"><div><h2>Account</h2><p>Your human identity in X Books.</p></div></div><div className="settings-details"><div><span>Name</span><strong translate="no">{user.name}</strong></div><div><span>Email</span><strong translate="no">{user.email}</strong></div></div></section>
    <section className="panel settings-section"><div className="item-form-head"><div><h2>Company</h2><p>The accounting entity whose books you manage.</p></div></div><div className="settings-details"><div><span>Company Name</span><strong translate="no">{user.company?.name}</strong></div></div></section>
    <section className="panel settings-section danger-zone"><div className="item-form-head"><div><h2>Delete Account</h2><p>Permanently delete your account, company, and all accounting data.</p></div></div><button className="button danger-button" type="button" onClick={() => { setMessage(""); setIsDeleteOpen(true); }}>Delete Account</button></section>
    {isDeleteOpen ? <ModalLayer closeDisabled={isDeleting} initialFocusRef={passwordRef} onClose={() => setIsDeleteOpen(false)}><section aria-labelledby="delete-account-title" aria-modal="true" className="panel payment-modal" role="dialog"><form onSubmit={async (event) => { event.preventDefault(); if (isDeleting) return; setMessage(""); setIsDeleting(true); try { await api.deleteAccount(token, String(new FormData(event.currentTarget).get("password") ?? "")); onAccountDeleted(); } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to delete your account."); setIsDeleting(false); } }}><div className="item-form-head"><div><h2 id="delete-account-title">Delete your account permanently?</h2><p>This cannot be undone. Your company and every accounting record will be deleted.</p></div></div><div className="field"><label htmlFor="delete-account-password">Enter your password to confirm</label><input autoComplete="current-password" id="delete-account-password" name="password" ref={passwordRef} type="password" required /></div><div className="message" role="status">{message}</div><div className="payment-modal-actions"><button className="ghost-button" disabled={isDeleting} type="button" onClick={() => setIsDeleteOpen(false)}>Cancel</button><button className="button danger-button" disabled={isDeleting} type="submit">{isDeleting ? <span className="button-spinner" aria-label="Deleting Account" /> : "Delete Account"}</button></div></form></section></ModalLayer> : null}
  </div>;
};

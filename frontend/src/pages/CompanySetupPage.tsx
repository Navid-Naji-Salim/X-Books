import { useState } from "react";
import { ApiError } from "../api";
import { AuthCard } from "../components/AuthCard";

export const CompanySetupPage = ({ onLogout, onSetup }: { onLogout: () => void; onSetup: (name: string) => Promise<void> }) => {
  const [message, setMessage] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false);
  return <AuthCard><form className="login-form" onSubmit={async (event) => {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try { await onSetup(String(new FormData(event.currentTarget).get("companyName") ?? "")); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to set up your company."); }
    finally { setIsSubmitting(false); }
  }}>
    <div className="login-heading"><h1>Set up your company</h1><p>This is the business whose books you will manage.</p></div>
    <div className="field"><label htmlFor="company-name">Company name</label><input id="company-name" name="companyName" autoComplete="organization" maxLength={150} required /></div>
    <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? <span className="button-spinner" aria-label="Creating workspace" /> : "Create workspace"}</button>
    <button className="auth-text-button" type="button" onClick={onLogout}>Use another account</button>
    <div className="message" role="status">{message}</div>
  </form></AuthCard>;
};

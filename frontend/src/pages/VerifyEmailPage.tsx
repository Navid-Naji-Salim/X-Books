import { useEffect, useState } from "react";
import { ApiError } from "../api";
import { AuthCard } from "../components/AuthCard";

export const VerifyEmailPage = ({ email, onLogout, onResend, onVerify }: {
  email: string; onLogout: () => void; onResend: () => Promise<number>; onVerify: (code: string) => Promise<void>;
}) => {
  const [message, setMessage] = useState(""); const [isSubmitting, setIsSubmitting] = useState(false); const [cooldown, setCooldown] = useState(60);
  useEffect(() => { if (!cooldown) return; const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, [cooldown]);
  return <AuthCard><form className="login-form" onSubmit={async (event) => {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    try { await onVerify(String(new FormData(event.currentTarget).get("code") ?? "")); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to verify your email."); }
    finally { setIsSubmitting(false); }
  }}>
    <div className="login-heading"><h1>Verify your email</h1><p>Enter the six-digit code sent to <span translate="no">{email}</span>.</p></div>
    <div className="field"><label htmlFor="verification-code">Verification Code</label><input id="verification-code" name="code" autoComplete="one-time-code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required /></div>
    <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? <span className="button-spinner" aria-label="Verifying Email" /> : "Verify Email"}</button>
    <button className="ghost-button login-mode-button" disabled={cooldown > 0 || isSubmitting} type="button" onClick={async () => { setMessage(""); try { const seconds = await onResend(); setCooldown(seconds); setMessage("A new verification code has been sent."); } catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to resend the code."); } }}>{cooldown ? `Resend code in ${cooldown}s` : "Resend code"}</button>
    <button className="auth-text-button" type="button" onClick={onLogout}>Use another account</button>
    <div className="message" role="status">{message}</div>
  </form></AuthCard>;
};

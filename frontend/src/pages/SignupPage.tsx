import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api";
import { AuthCard } from "../components/AuthCard";

export const SignupPage = ({ onSignup }: { onSignup: (name: string, email: string, password: string) => Promise<void> }) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  return <AuthCard><form className="login-form" autoComplete="on" onSubmit={async (event) => {
    event.preventDefault(); setMessage(""); setIsSubmitting(true);
    const data = new FormData(event.currentTarget);
    try { await onSignup(String(data.get("name") ?? ""), String(data.get("email") ?? ""), String(data.get("password") ?? "")); }
    catch (error) { setMessage(error instanceof ApiError ? error.message : "Unable to create your account."); }
    finally { setIsSubmitting(false); }
  }}>
    <div className="login-heading"><h1>X Books</h1></div>
    <div className="field"><label htmlFor="signup-name">Name</label><input id="signup-name" name="name" autoComplete="name" maxLength={100} required /></div>
    <div className="field"><label htmlFor="signup-email">Email</label><input id="signup-email" name="email" autoComplete="email" type="email" required /></div>
    <div className="field"><label htmlFor="signup-password">Password</label><input id="signup-password" name="password" autoComplete="new-password" type="password" minLength={8} required /></div>
    <button className="button" disabled={isSubmitting} type="submit">{isSubmitting ? <span className="button-spinner" aria-label="Creating account" /> : "Create account"}</button>
    <Link className="ghost-button login-mode-button" to="/login">Already have an account? Log in</Link>
    <div className="message" role="status">{message}</div>
  </form></AuthCard>;
};

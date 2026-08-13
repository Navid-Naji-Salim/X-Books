import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../api";
import brandLogo from "../assets/x-books-logo.png";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<void>;
};

export const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main className="login-shell">
      <div className="login-layout">
        <span aria-hidden="true" className="app-loading-logo">
          <img className="app-loading-logo-mark" draggable={false} src={brandLogo} />
          <img className="app-loading-logo-bookmark" draggable={false} src={brandLogo} />
        </span>
        <section className="login-card">
          <form
            autoComplete="on"
            className="login-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage("");
              setIsSubmitting(true);

              const formData = new FormData(event.currentTarget);
              try {
                const email = String(formData.get("email") ?? "");
                const password = String(formData.get("password") ?? "");
                await onLogin(email, password);
              } catch (error) {
                setMessage(error instanceof ApiError ? error.message : "Unable to log in.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="login-heading">
              <h1>X Books</h1>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input autoComplete="email" id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input autoComplete="current-password" id="password" name="password" type="password" required />
            </div>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <span className="button-spinner" aria-label="Logging In" /> : "Log In"}
            </button>
            <Link className="ghost-button login-mode-button" to="/signup">Create new account</Link>
            <div className="message">{message}</div>
          </form>
        </section>
      </div>
    </main>
  );
};

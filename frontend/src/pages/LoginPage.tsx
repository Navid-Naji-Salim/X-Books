import { useState } from "react";
import { ApiError } from "../api";
import brandLogo from "../assets/x-books-logo.png";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (name: string, email: string, password: string) => Promise<void>;
};

export const LoginPage = ({ onLogin, onRegister }: LoginPageProps) => {
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

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
                if (isRegistering) {
                  await onRegister(String(formData.get("name") ?? ""), email, password);
                } else {
                  await onLogin(email, password);
                }
              } catch (error) {
                setMessage(error instanceof ApiError ? error.message : isRegistering ? "Unable to create your account." : "Unable to log in.");
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="login-heading">
              <h1>X Books</h1>
            </div>
            {isRegistering ? (
              <div className="field">
                <label htmlFor="name">Name</label>
                <input autoComplete="name" id="name" name="name" type="text" maxLength={100} required />
              </div>
            ) : null}
            <div className="field">
              <label htmlFor="email">Email</label>
              <input autoComplete="email" id="email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input autoComplete={isRegistering ? "new-password" : "current-password"} id="password" name="password" type="password" minLength={isRegistering ? 8 : undefined} required />
            </div>
            <button className="button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <span className="button-spinner" aria-label={isRegistering ? "Creating Account" : "Logging In"} /> : isRegistering ? "Create Account" : "Log In"}
            </button>
            <button
              className="ghost-button login-mode-button"
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setIsRegistering((current) => !current);
                setMessage("");
              }}
            >
              {isRegistering ? "Already have an account? Log In" : "New to X Books? Create Account"}
            </button>
            <div className="message">{message}</div>
          </form>
        </section>
      </div>
    </main>
  );
};

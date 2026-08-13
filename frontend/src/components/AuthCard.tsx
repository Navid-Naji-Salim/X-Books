import type { ReactNode } from "react";
import brandLogo from "../assets/x-books-logo.png";

export const AuthCard = ({ children }: { children: ReactNode }) => (
  <main className="login-shell">
    <div className="login-layout">
      <span aria-hidden="true" className="app-loading-logo">
        <img className="app-loading-logo-mark" draggable={false} src={brandLogo} />
        <img className="app-loading-logo-bookmark" draggable={false} src={brandLogo} />
      </span>
      <section className="login-card">{children}</section>
    </div>
  </main>
);

import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { icons } from "../icons";
import type { PageId, User } from "../types";
import { useLanguage, type Language } from "../i18n";

const navItems: Array<{ id: PageId; label: string; to: string }> = [
  { id: "home", label: "Home", to: "/" },
  { id: "items", label: "Items", to: "/items" },
  { id: "sales", label: "Sales", to: "/sales/customers" },
  { id: "purchases", label: "Purchases", to: "/purchases/vendors" },
  { id: "reports", label: "Reports", to: "/reports" },
];

type SidebarProps = {
  user: User;
  isCollapsed: boolean;
  onLogout: () => void;
  onToggleCollapse: () => void;
};

export const Sidebar = ({ user, isCollapsed, onLogout, onToggleCollapse }: SidebarProps) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const location = useLocation();
  const [isSalesOpen, setIsSalesOpen] = useState(location.pathname.startsWith("/sales"));
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(location.pathname.startsWith("/purchases"));
  const { language, setLanguage } = useLanguage();
  const isRtl = language !== "en";
  const languageOptions: Array<{ value: Language; label: string }> = [{ value: "en", label: "English" }, { value: "ku", label: "Kurdish" }, { value: "ar", label: "Arabic" }];

  return (
    <aside className={`sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-head">
        <div className="sidebar-wordmark">{isCollapsed ? "XB" : "XBooks"}</div>
      </div>
      <nav className="nav">
        <button
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="nav-control"
          type="button"
          onClick={onToggleCollapse}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d={isCollapsed !== isRtl ? "m10 7 5 5-5 5" : "m14 7-5 5 5 5"}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
          <span>{isCollapsed ? "Expand" : "Collapse"}</span>
        </button>
        {navItems.map((item) => {
          if (item.id === "sales") {
            return (
              <div className={`nav-group ${isSalesOpen ? "is-open" : ""}`} key="sales">
                <button
                  aria-expanded={isSalesOpen}
                  className={!isSalesOpen && location.pathname.startsWith("/sales") ? "nav-group-button has-active-child" : "nav-group-button"}
                  type="button"
                  onClick={() => { if (isCollapsed) { onToggleCollapse(); setIsSalesOpen(true); } else setIsSalesOpen((current) => !current); }}
                >
                  {icons.sales({ className: "nav-icon" })}<span>Sales</span>
                  <svg className="nav-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                {!isCollapsed ? (
                  <div aria-hidden={!isSalesOpen} className={`nav-submenu ${isSalesOpen ? "is-visible" : ""}`}>
                    <NavLink tabIndex={isSalesOpen ? undefined : -1} to="/sales/invoices">Invoices</NavLink>
                    <NavLink tabIndex={isSalesOpen ? undefined : -1} to="/sales/customers">Customers</NavLink>
                  </div>
                ) : null}
              </div>
            );
          }
          if (item.id === "purchases") {
            return (
              <div className={`nav-group ${isPurchasesOpen ? "is-open" : ""}`} key="purchases">
                <button aria-expanded={isPurchasesOpen} className={!isPurchasesOpen && location.pathname.startsWith("/purchases") ? "nav-group-button has-active-child" : "nav-group-button"} type="button" onClick={() => { if (isCollapsed) { onToggleCollapse(); setIsPurchasesOpen(true); } else setIsPurchasesOpen((current) => !current); }}>
                  {icons.purchases({ className: "nav-icon nav-icon-directional" })}<span>Purchases</span>
                  <svg className="nav-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </button>
                {!isCollapsed ? <div aria-hidden={!isPurchasesOpen} className={`nav-submenu ${isPurchasesOpen ? "is-visible" : ""}`}><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/vendors">Vendors</NavLink><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/bills">Bills</NavLink></div> : null}
              </div>
            );
          }
          const Icon = icons[item.id];
          return (
            <NavLink
              className={({ isActive }) => (isActive ? "active" : undefined)}
              end={item.to === "/"}
              key={item.id}
              to={item.to}
            >
              <Icon className="nav-icon" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        {isSettingsOpen && (
          <div className="profile-menu">
            <div className="language-setting">
              <span>Language</span>
              <div role="group" aria-label="Language">
                {languageOptions.map((option) => <button className={language === option.value ? "is-selected" : ""} key={option.value} type="button" onClick={() => setLanguage(option.value)}>{option.label}</button>)}
              </div>
            </div>
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        )}
        <div className="profile-card">
          {isCollapsed ? (
            <button
              aria-expanded={isSettingsOpen}
              aria-label="Open user settings"
              className="brand-mark profile-mark-button"
              type="button"
              onClick={() => setIsSettingsOpen((current) => !current)}
            >
              {user.name.trim().charAt(0).toUpperCase() || "N"}
            </button>
          ) : (
            <>
              <div className="brand-mark">{user.name.trim().charAt(0).toUpperCase() || "N"}</div>
              <div className="profile-copy">
                <strong>{user.name}</strong>
                <span>{user.role}</span>
              </div>
            </>
          )}
          <button
            aria-expanded={isSettingsOpen}
            aria-label="Open user settings"
            className="settings-button"
            type="button"
            onClick={() => setIsSettingsOpen((current) => !current)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"
                stroke="currentColor"
                strokeWidth="1.8"
              />
              <path
                d="M19.1 13.4c.1-.5.1-.9.1-1.4s0-.9-.1-1.4l2-1.5-2-3.5-2.4 1a8 8 0 0 0-2.4-1.4L14 2.6h-4l-.4 2.6a8 8 0 0 0-2.4 1.4l-2.4-1-2 3.5 2 1.5a8.8 8.8 0 0 0 0 2.8l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 2.4 1.4l.4 2.6h4l.4-2.6a8 8 0 0 0 2.4-1.4l2.4 1 2-3.5-2.1-1.5Z"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

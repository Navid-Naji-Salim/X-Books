import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { icons } from "../icons";
import { Tooltip } from "../components/Tooltip";
import { NavFlyout } from "../components/NavFlyout";
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
  const [isSettingsRendered, setIsSettingsRendered] = useState(false);
  const [floatingMenuStyle, setFloatingMenuStyle] = useState({ left: 8, top: 8, width: 280 });
  const footerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const [isSalesOpen, setIsSalesOpen] = useState(location.pathname.startsWith("/sales"));
  const [isPurchasesOpen, setIsPurchasesOpen] = useState(location.pathname.startsWith("/purchases"));
  const { language, setLanguage, t } = useLanguage();
  const isRtl = language !== "en";
  const languageOptions: Array<{ value: Language; label: string }> = [{ value: "en", label: "English" }, { value: "ku", label: "Kurdish" }, { value: "ar", label: "Arabic" }];

  useEffect(() => {
    if (!isSettingsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!footerRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsSettingsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isSettingsOpen]);

  useLayoutEffect(() => {
    if (!isSettingsRendered) return;
    const menu = menuRef.current;
    if (!menu) return;
    const updatePosition = () => {
      const button = settingsButtonRef.current;
      const sidebar = footerRef.current?.closest(".sidebar");
      if (!button || !sidebar || !menu) return;
      const rect = button.getBoundingClientRect();
      const sidebarRect = sidebar.getBoundingClientRect();
      const edge = 8;
      const gap = 12;
      const width = Math.min(280, window.innerWidth - edge * 2);
      const rightPlacement = Math.max(rect.right, sidebarRect.right) + gap;
      const leftPlacement = Math.min(rect.left, sidebarRect.left) - width - gap;
      const preferredLeft = isRtl ? leftPlacement : rightPlacement;
      const fallbackLeft = isRtl ? rightPlacement : leftPlacement;
      const fitsHorizontally = (left: number) => left >= edge && left + width <= window.innerWidth - edge;
      const left = fitsHorizontally(preferredLeft)
        ? preferredLeft
        : fitsHorizontally(fallbackLeft)
          ? fallbackLeft
          : Math.min(Math.max(edge, preferredLeft), window.innerWidth - width - edge);
      const height = Math.min(menu.offsetHeight, window.innerHeight - edge * 2);
      const preferredTop = rect.bottom - height;
      const top = Math.min(Math.max(edge, preferredTop), window.innerHeight - height - edge);
      setFloatingMenuStyle({ left, top, width });
    };
    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(menu);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [isCollapsed, isRtl, isSettingsRendered]);

  const toggleSettings = () => {
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }
    setIsSettingsRendered(true);
    setIsSettingsOpen(true);
  };

  const settingsMenu = (
    <div
      aria-label={t("User settings")}
      aria-hidden={!isSettingsOpen}
      className={`profile-menu is-floating ${isSettingsOpen ? "is-open" : "is-closing"}`}
      id="user-settings-menu"
      ref={menuRef}
      role="dialog"
      style={floatingMenuStyle}
      onAnimationEnd={(event) => {
        if (event.animationName === "settings-flyout-exit" && !isSettingsOpen) setIsSettingsRendered(false);
      }}
    >
      <div className="profile-menu-head">
        <span>{t("Settings")}</span>
        <strong>{user.name}</strong>
        <small>{user.email}</small>
      </div>
      <div className="language-setting">
        <span>{t("Language")}</span>
        <div role="group" aria-label={t("Language")}>
          {languageOptions.map((option) => <button className={language === option.value ? "is-selected" : ""} key={option.value} type="button" onClick={() => setLanguage(option.value)}>{t(option.label)}</button>)}
        </div>
      </div>
      <button className="logout-button" type="button" onClick={onLogout}>
        {t("Log out")}
      </button>
    </div>
  );

  return (
    <aside className={`sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-head">
        <div className="sidebar-wordmark">{isCollapsed ? "XB" : "XBooks"}</div>
      </div>
      <nav className="nav">
        <Tooltip content="Expand" disabled={!isCollapsed} placement="side">
          <button
            aria-label={t(isCollapsed ? "Expand sidebar" : "Collapse sidebar")}
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
        </Tooltip>
        {navItems.map((item) => {
          if (item.id === "sales") {
            return (
              <div className={`nav-group ${isSalesOpen ? "is-open" : ""}`} key="sales">
                <NavFlyout disabled={!isCollapsed} label="Sales" items={[{ label: "Invoices", to: "/sales/invoices" }, { label: "Customers", to: "/sales/customers" }]}>
                  <button
                    aria-expanded={isSalesOpen}
                    aria-label={isCollapsed ? t("Sales") : undefined}
                    className={(isCollapsed || !isSalesOpen) && location.pathname.startsWith("/sales") ? "nav-group-button has-active-child" : "nav-group-button"}
                    type="button"
                    onClick={() => { if (!isCollapsed) setIsSalesOpen((current) => !current); }}
                  >
                    {icons.sales({ className: "nav-icon" })}<span>Sales</span>
                    <svg className="nav-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </NavFlyout>
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
                <NavFlyout disabled={!isCollapsed} label="Purchases" items={[{ label: "Vendors", to: "/purchases/vendors" }, { label: "Bills", to: "/purchases/bills" }]}>
                  <button aria-expanded={isPurchasesOpen} aria-label={isCollapsed ? t("Purchases") : undefined} className={(isCollapsed || !isPurchasesOpen) && location.pathname.startsWith("/purchases") ? "nav-group-button has-active-child" : "nav-group-button"} type="button" onClick={() => { if (!isCollapsed) setIsPurchasesOpen((current) => !current); }}>
                    {icons.purchases({ className: "nav-icon nav-icon-directional" })}<span>Purchases</span>
                    <svg className="nav-chevron" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </button>
                </NavFlyout>
                {!isCollapsed ? <div aria-hidden={!isPurchasesOpen} className={`nav-submenu ${isPurchasesOpen ? "is-visible" : ""}`}><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/vendors">Vendors</NavLink><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/bills">Bills</NavLink></div> : null}
              </div>
            );
          }
          const Icon = icons[item.id];
          return (
            <Tooltip content={item.label} disabled={!isCollapsed} key={item.id} placement="side">
              <NavLink
                aria-label={isCollapsed ? t(item.label) : undefined}
                className={({ isActive }) => (isActive ? "active" : undefined)}
                end={item.to === "/"}
                to={item.to}
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
              </NavLink>
            </Tooltip>
          );
        })}
      </nav>
      <div className="sidebar-footer" ref={footerRef}>
        {isSettingsRendered ? createPortal(settingsMenu, document.body) : null}
        <div className="profile-card">
          <div className="brand-mark">{user.name.trim().charAt(0).toUpperCase() || "N"}</div>
          <div className="profile-copy">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
          <button
            aria-controls="user-settings-menu"
            aria-expanded={isSettingsOpen}
            aria-haspopup="dialog"
            aria-label={t(isSettingsOpen ? "Close user settings" : "Open user settings")}
            className="settings-button"
            ref={settingsButtonRef}
            type="button"
            onClick={toggleSettings}
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

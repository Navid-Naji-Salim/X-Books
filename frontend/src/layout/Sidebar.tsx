import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation } from "react-router-dom";
import { appIcons, icons } from "../icons";
import { Tooltip } from "../components/Tooltip";
import { NavFlyout } from "../components/NavFlyout";
import { useContainedWheel } from "../components/useContainedWheel";
import type { PageId, User } from "../types";
import { useLanguage, type Language } from "../i18n";
import brandLogo from "../assets/x-books-logo.png";

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
  const SidebarStateIcon = isRtl
    ? isCollapsed ? appIcons.sidebar.expandRight : appIcons.sidebar.collapseRight
    : isCollapsed ? appIcons.sidebar.expandLeft : appIcons.sidebar.collapseLeft;
  const ChevronDownIcon = appIcons.disclosure.down;
  const SettingsIcon = appIcons.actions.settings;
  const SalesIcon = icons.sales;
  const PurchasesIcon = icons.purchases;
  const languageOptions: Array<{ value: Language; label: string }> = [{ value: "en", label: "English" }, { value: "ku", label: "Kurdish" }, { value: "ar", label: "Arabic" }];
  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  useContainedWheel(menuRef, isSettingsRendered);

  useEffect(() => {
    if (!isSettingsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!footerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeSettings();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSettings();
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
    const sidebar = footerRef.current?.closest(".sidebar");
    if (!menu || !sidebar) return;
    const updatePosition = () => {
      const button = settingsButtonRef.current;
      if (!button) return;
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
    resizeObserver.observe(sidebar);
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
      closeSettings();
      return;
    }
    setIsSettingsRendered(true);
    setIsSettingsOpen(true);
  };

  const settingsMenu = (
    <div
      aria-label={t("User Settings")}
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
        {t("Log Out")}
      </button>
    </div>
  );

  return (
    <aside className={`sidebar ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="sidebar-head">
        <div className="sidebar-brand">
          <img
            alt={isCollapsed ? "X Books" : ""}
            className="sidebar-logo"
            src={brandLogo}
          />
          <div aria-hidden={isCollapsed} className="sidebar-wordmark">X Books</div>
        </div>
      </div>
      <nav className="nav">
        <Tooltip content="Expand" disabled={!isCollapsed} placement="side" resetKey={isCollapsed}>
          <button
            aria-label={t(isCollapsed ? "Expand Sidebar" : "Collapse Sidebar")}
            className="nav-control"
            type="button"
            onClick={onToggleCollapse}
          >
            <SidebarStateIcon className="nav-icon" />
            <span>{isCollapsed ? "Expand" : "Collapse"}</span>
          </button>
        </Tooltip>
        {navItems.map((item) => {
          if (item.id === "sales") {
            return (
              <div className={`nav-group ${isSalesOpen ? "is-open" : ""}`} key="sales">
                <NavFlyout disabled={!isCollapsed} label="Sales" items={[{ label: "Customers", to: "/sales/customers" }, { label: "Invoices", to: "/sales/invoices" }]}>
                  <button
                    aria-expanded={isSalesOpen}
                    aria-label={isCollapsed ? t("Sales") : undefined}
                    className={(isCollapsed || !isSalesOpen) && location.pathname.startsWith("/sales") ? "nav-group-button has-active-child" : "nav-group-button"}
                    type="button"
                    onClick={() => { if (!isCollapsed) setIsSalesOpen((current) => !current); }}
                  >
                    <SalesIcon className="nav-icon" /><span>Sales</span>
                    <ChevronDownIcon className="nav-chevron" />
                  </button>
                </NavFlyout>
                {!isCollapsed ? (
                  <div aria-hidden={!isSalesOpen} className={`nav-submenu ${isSalesOpen ? "is-visible" : ""}`}>
                    <NavLink tabIndex={isSalesOpen ? undefined : -1} to="/sales/customers">Customers</NavLink>
                    <NavLink tabIndex={isSalesOpen ? undefined : -1} to="/sales/invoices">Invoices</NavLink>
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
                    <PurchasesIcon className="nav-icon nav-icon-directional" /><span>Purchases</span>
                    <ChevronDownIcon className="nav-chevron" />
                  </button>
                </NavFlyout>
                {!isCollapsed ? <div aria-hidden={!isPurchasesOpen} className={`nav-submenu ${isPurchasesOpen ? "is-visible" : ""}`}><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/vendors">Vendors</NavLink><NavLink tabIndex={isPurchasesOpen ? undefined : -1} to="/purchases/bills">Bills</NavLink></div> : null}
              </div>
            );
          }
          const Icon = icons[item.id];
          return (
            <Tooltip content={item.label} disabled={!isCollapsed} key={item.id} placement="side" resetKey={isCollapsed}>
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
          </div>
          <button
            aria-controls="user-settings-menu"
            aria-expanded={isSettingsOpen}
            aria-haspopup="dialog"
            aria-label={t(isSettingsOpen ? "Close User Settings" : "Open User Settings")}
            className="settings-button"
            ref={settingsButtonRef}
            type="button"
            onClick={toggleSettings}
          >
            <SettingsIcon />
          </button>
        </div>
      </div>
    </aside>
  );
};

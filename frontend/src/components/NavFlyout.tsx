import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import { useLanguage } from "../i18n";
import { useContainedWheel } from "./useContainedWheel";
import { useKeyboardFocusIntent } from "./useKeyboardFocusIntent";

type FlyoutChildProps = {
  "aria-controls"?: string;
  "aria-expanded"?: boolean;
  "aria-haspopup"?: "menu";
  onKeyDown?: (event: ReactKeyboardEvent<HTMLElement>) => void;
};

type NavFlyoutProps = {
  children: ReactElement<FlyoutChildProps>;
  disabled?: boolean;
  items: Array<{ label: string; to: string }>;
  label: string;
};

type Side = "left" | "right";

const EDGE = 8;
const GAP = 12;
const OPEN_DELAY = 140;
const CLOSE_DELAY = 120;

export const NavFlyout = ({ children, disabled = false, items, label }: NavFlyoutProps) => {
  const { t } = useLanguage();
  const menuId = useId();
  const keyboardFocusIntent = useKeyboardFocusIntent();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [side, setSide] = useState<Side>("right");
  const [position, setPosition] = useState<CSSProperties>({ left: EDGE, top: EDGE });

  useContainedWheel(menuRef, isRendered);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  };

  const open = (immediate = false) => {
    if (disabled) return;
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    if (isVisible) return;
    if (openTimer.current) clearTimeout(openTimer.current);
    const reveal = () => {
      setIsRendered(true);
      setIsVisible(true);
      openTimer.current = null;
    };
    if (immediate) reveal();
    else openTimer.current = setTimeout(reveal, OPEN_DELAY);
  };

  const close = (immediate = false) => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
    const conceal = () => {
      setIsVisible(false);
      closeTimer.current = null;
    };
    if (immediate) conceal();
    else closeTimer.current = setTimeout(conceal, CLOSE_DELAY);
  };

  useEffect(() => clearTimers, []);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor || disabled) return;
    const showOnHover = () => open(false);
    const hideOnHover = () => close(false);
    const showOnFocus = () => {
      if (keyboardFocusIntent.current) open(true);
    };
    const hideOnBlur = (event: FocusEvent) => {
      if (!menuRef.current?.contains(event.relatedTarget as Node | null)) close(false);
    };
    anchor.addEventListener("mouseenter", showOnHover);
    anchor.addEventListener("mouseleave", hideOnHover);
    anchor.addEventListener("focusin", showOnFocus);
    anchor.addEventListener("focusout", hideOnBlur);
    return () => {
      anchor.removeEventListener("mouseenter", showOnHover);
      anchor.removeEventListener("mouseleave", hideOnHover);
      anchor.removeEventListener("focusin", showOnFocus);
      anchor.removeEventListener("focusout", hideOnBlur);
    };
  }, [disabled]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const keepOpen = () => open(true);
    const scheduleClose = () => close(false);
    const hideOnBlur = (event: FocusEvent) => {
      if (!anchorRef.current?.contains(event.relatedTarget as Node | null) && !menu.contains(event.relatedTarget as Node | null)) close(false);
    };
    menu.addEventListener("mouseenter", keepOpen);
    menu.addEventListener("mouseleave", scheduleClose);
    menu.addEventListener("focusin", keepOpen);
    menu.addEventListener("focusout", hideOnBlur);
    return () => {
      menu.removeEventListener("mouseenter", keepOpen);
      menu.removeEventListener("mouseleave", scheduleClose);
      menu.removeEventListener("focusin", keepOpen);
      menu.removeEventListener("focusout", hideOnBlur);
    };
  }, [isRendered]);

  useEffect(() => {
    if (!isVisible) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!anchorRef.current?.contains(target) && !menuRef.current?.contains(target)) close(true);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      close(true);
      (anchorRef.current?.querySelector("button, a") as HTMLElement | null)?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [isVisible]);

  useLayoutEffect(() => {
    if (!isRendered) return;
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const updatePosition = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const isRtl = document.documentElement.dir === "rtl";
      const preferredSide: Side = isRtl ? "left" : "right";
      const preferredLeft = preferredSide === "right" ? anchorRect.right + GAP : anchorRect.left - width - GAP;
      const alternateLeft = preferredSide === "right" ? anchorRect.left - width - GAP : anchorRect.right + GAP;
      const fits = (left: number) => left >= EDGE && left + width <= window.innerWidth - EDGE;
      const resolvedSide = fits(preferredLeft) ? preferredSide : preferredSide === "right" ? "left" : "right";
      const left = fits(preferredLeft) ? preferredLeft : fits(alternateLeft) ? alternateLeft : Math.min(Math.max(EDGE, preferredLeft), window.innerWidth - width - EDGE);
      const top = Math.min(Math.max(EDGE, anchorRect.top + (anchorRect.height - height) / 2), window.innerHeight - height - EDGE);
      setSide(resolvedSide);
      setPosition({ left, top });
    };
    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(anchor);
    resizeObserver.observe(menu);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [isRendered, label]);

  const focusFirstItem = () => {
    open(true);
    requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus());
  };
  const originalKeyDown = children.props.onKeyDown;
  const trigger = cloneElement(children, disabled ? {} : {
    "aria-controls": menuId,
    "aria-expanded": isVisible,
    "aria-haspopup": "menu" as const,
    onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => {
      originalKeyDown?.(event);
      if (event.defaultPrevented) return;
      const openKey = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      if (event.key === openKey || event.key === "ArrowDown") {
        event.preventDefault();
        focusFirstItem();
      }
    },
  });

  return (
    <span
      className="x-tooltip-anchor"
      ref={anchorRef}
    >
      {trigger}
      {isRendered ? createPortal(
        <div
          className={`x-tooltip x-nav-flyout x-tooltip-${side} ${isVisible ? "is-visible" : "is-closing"}`}
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={t(label)}
          style={position}
          onAnimationEnd={(event) => {
            if (event.animationName === "x-tooltip-exit" && !isVisible) setIsRendered(false);
          }}
        >
          <div className="x-nav-flyout-title">{t(label)}</div>
          <div className="x-nav-flyout-items">
            {items.map((item) => (
              <NavLink
                className={({ isActive }) => isActive ? "active" : undefined}
                key={item.to}
                role="menuitem"
                to={item.to}
                onClick={() => close(true)}
              >
                {t(item.label)}
              </NavLink>
            ))}
          </div>
        </div>,
        document.body,
      ) : null}
    </span>
  );
};

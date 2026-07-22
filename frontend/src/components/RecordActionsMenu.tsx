import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { appIcons, type AppIcon } from "../icons";
import { useLanguage } from "../i18n";
import { useContainedWheel } from "./useContainedWheel";

export type RecordActionTone = "default" | "danger";

export type RecordAction = {
  label: string;
  onSelect: () => void | Promise<void>;
  tone?: RecordActionTone;
  disabled?: boolean;
  icon?: AppIcon;
};

export type RecordActionsMenuProps = {
  actions: readonly RecordAction[];
  align?: "directional" | "right";
  boundaryRef?: RefObject<HTMLElement | null>;
  className?: string;
  disabled?: boolean;
  label?: string;
  recordLabel?: string;
};

type Placement = "above" | "below";
type FocusTarget = "first" | "last";

const EDGE = 8;
const GAP = 6;
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const isVisibleFocusable = (element: HTMLElement) => (
  element.getClientRects().length > 0
  && !element.matches(":disabled")
  && !element.closest("[aria-hidden='true'], [inert]")
);

const isAnchorVisible = (element: HTMLElement) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0
    && rect.height > 0
    && rect.bottom > 0
    && rect.right > 0
    && rect.top < window.innerHeight
    && rect.left < window.innerWidth;
};

export const RecordActionsMenu = ({
  actions,
  align = "directional",
  boundaryRef,
  className,
  disabled = false,
  label = "Actions",
  recordLabel,
}: RecordActionsMenuProps) => {
  const { language, t } = useLanguage();
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<FocusTarget | null>(null);
  const isOpenRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [placement, setPlacement] = useState<Placement>("below");
  const [position, setPosition] = useState({ left: EDGE, top: EDGE });
  const MoreIcon = appIcons.actions.more;
  const isTriggerDisabled = disabled || actions.length === 0;
  const accessibleLabel = recordLabel ? `${t(label)}: ${recordLabel}` : t(label);

  useContainedWheel(menuRef, isRendered);

  const getEnabledItems = useCallback(() => {
    const menu = menuRef.current;
    if (!menu) return [];
    return Array.from(menu.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)"));
  }, []);

  const focusEdgeItem = useCallback((target: FocusTarget) => {
    const items = getEnabledItems();
    if (items.length === 0) return;
    items[target === "first" ? 0 : items.length - 1]?.focus();
  }, [getEnabledItems]);

  const closeMenu = useCallback((options: { immediate?: boolean; restoreFocus?: boolean } = {}) => {
    pendingFocus.current = null;
    isOpenRef.current = false;
    setIsOpen(false);
    setIsRendered(false);
    if (options.restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const openMenu = useCallback((target: FocusTarget = "first") => {
    if (isTriggerDisabled) return;
    pendingFocus.current = target;
    if (isOpenRef.current) {
      requestAnimationFrame(() => focusEdgeItem(target));
      return;
    }
    isOpenRef.current = true;
    setIsRendered(true);
    setIsOpen(true);
  }, [focusEdgeItem, isTriggerDisabled]);

  useEffect(() => {
    if (!isTriggerDisabled) return;
    closeMenu({ immediate: true });
  }, [closeMenu, isTriggerDisabled]);

  useLayoutEffect(() => {
    if (!isRendered || !isOpen || !pendingFocus.current) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    const frame = requestAnimationFrame(() => focusEdgeItem(target));
    return () => cancelAnimationFrame(frame);
  }, [focusEdgeItem, isOpen, isRendered]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) closeMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    };
    const closeOnWindowBlur = () => closeMenu({ immediate: true });
    const closeWhenHidden = () => {
      if (document.hidden) closeMenu({ immediate: true });
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("blur", closeOnWindowBlur);
    document.addEventListener("visibilitychange", closeWhenHidden);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("blur", closeOnWindowBlur);
      document.removeEventListener("visibilitychange", closeWhenHidden);
    };
  }, [closeMenu, isOpen]);

  useLayoutEffect(() => {
    if (!isRendered) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    let frame = 0;
    const updatePosition = () => {
      frame = 0;
      if (!isAnchorVisible(trigger)) {
        closeMenu({ immediate: true });
        return;
      }

      const triggerRect = trigger.getBoundingClientRect();
      const width = menu.offsetWidth;
      const height = menu.offsetHeight;
      const isRtl = document.documentElement.dir === "rtl";
      const belowTop = triggerRect.bottom + GAP;
      const aboveTop = triggerRect.top - height - GAP;
      const fitsBelow = belowTop + height <= window.innerHeight - EDGE;
      const fitsAbove = aboveTop >= EDGE;
      const spaceBelow = window.innerHeight - triggerRect.bottom - GAP - EDGE;
      const spaceAbove = triggerRect.top - GAP - EDGE;
      const nextPlacement: Placement = fitsBelow || (!fitsAbove && spaceBelow >= spaceAbove) ? "below" : "above";
      const preferredTop = nextPlacement === "below" ? belowTop : aboveTop;
      const preferredLeft = align === "right" || !isRtl ? triggerRect.right - width : triggerRect.left;
      const boundaryRect = boundaryRef?.current?.getBoundingClientRect();
      const viewportMaxLeft = Math.max(EDGE, window.innerWidth - width - EDGE);
      const boundaryMinLeft = boundaryRect ? Math.max(EDGE, boundaryRect.left + 4) : EDGE;
      const boundaryMaxLeft = boundaryRect
        ? Math.min(viewportMaxLeft, boundaryRect.right - width - 4)
        : viewportMaxLeft;
      const boundaryCanContainMenu = boundaryMaxLeft >= boundaryMinLeft;
      const minLeft = boundaryCanContainMenu ? boundaryMinLeft : EDGE;
      const maxLeft = boundaryCanContainMenu ? boundaryMaxLeft : viewportMaxLeft;
      const maxTop = Math.max(EDGE, window.innerHeight - height - EDGE);
      const left = Math.min(Math.max(minLeft, preferredLeft), maxLeft);
      const top = Math.min(Math.max(EDGE, preferredTop), maxTop);

      setPlacement((current) => current === nextPlacement ? current : nextPlacement);
      setPosition((current) => current.left === left && current.top === top ? current : { left, top });
    };
    const schedulePosition = () => {
      if (frame) return;
      frame = requestAnimationFrame(updatePosition);
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(schedulePosition);
    resizeObserver.observe(trigger);
    resizeObserver.observe(menu);
    if (boundaryRef?.current) resizeObserver.observe(boundaryRef.current);
    window.addEventListener("resize", schedulePosition);
    document.addEventListener("scroll", schedulePosition, true);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", schedulePosition);
      document.removeEventListener("scroll", schedulePosition, true);
    };
  }, [align, boundaryRef, closeMenu, isRendered, language]);

  const closeIfFocusLeaves = (event: ReactFocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!triggerRef.current?.contains(next) && !menuRef.current?.contains(next)) closeMenu();
  };

  const focusAdjacentToTrigger = (backward: boolean) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const menu = menuRef.current;
    const focusable = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter((element) => !menu?.contains(element) && isVisibleFocusable(element));
    const triggerIndex = focusable.indexOf(trigger);
    if (triggerIndex < 0 || focusable.length === 0) return;
    const offset = backward ? -1 : 1;
    focusable[(triggerIndex + offset + focusable.length) % focusable.length]?.focus();
  };

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeMenu({ restoreFocus: true });
      return;
    }
    if (event.key === "Tab") {
      event.preventDefault();
      const backward = event.shiftKey;
      flushSync(() => closeMenu({ immediate: true }));
      focusAdjacentToTrigger(backward);
      return;
    }

    const items = getEnabledItems();
    if (items.length === 0) return;
    const activeIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;
    if (event.key === "ArrowDown") nextIndex = activeIndex < 0 ? 0 : (activeIndex + 1) % items.length;
    else if (event.key === "ArrowUp") nextIndex = activeIndex < 0 ? items.length - 1 : (activeIndex - 1 + items.length) % items.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    if (nextIndex === null) return;
    event.preventDefault();
    items[nextIndex]?.focus();
  };

  const triggerClassName = ["record-actions-menu-anchor", className].filter(Boolean).join(" ");
  const menuStyle: CSSProperties = {
    position: "fixed",
    left: position.left,
    top: position.top,
    maxHeight: "calc(100dvh - 16px)",
    overflowY: "auto",
    overscrollBehavior: "contain",
  };

  return (
    <span className={triggerClassName}>
      <button
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={accessibleLabel}
        className="record-actions-menu-trigger"
        disabled={isTriggerDisabled}
        ref={triggerRef}
        type="button"
        onBlur={closeIfFocusLeaves}
        onClick={() => isOpenRef.current ? closeMenu() : openMenu("first")}
        onKeyDown={(event) => {
          if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
          event.preventDefault();
          openMenu(event.key === "ArrowDown" ? "first" : "last");
        }}
      >
        <MoreIcon className="record-actions-menu-trigger-icon" />
      </button>
      {isRendered ? createPortal(
        <div
          aria-hidden={!isOpen}
          aria-label={accessibleLabel}
          aria-orientation="vertical"
          className={`record-actions-menu record-actions-menu-${placement} record-actions-menu-align-${align} ${isOpen ? "is-open" : "is-closing"}`}
          id={menuId}
          ref={menuRef}
          role="menu"
          style={menuStyle}
          onBlur={closeIfFocusLeaves}
          onKeyDown={handleMenuKeyDown}
        >
          {actions.map((action, index) => {
            const ActionIcon = action.icon;
            const actionClassName = [
              "record-actions-menu-item",
              action.tone === "danger" ? "is-danger" : "",
              ActionIcon ? "has-icon" : "",
            ].filter(Boolean).join(" ");
            return (
              <button
                className={actionClassName}
                disabled={action.disabled}
                key={`${action.label}-${index}`}
                role="menuitem"
                tabIndex={-1}
                type="button"
                onClick={() => {
                  if (action.disabled) return;
                  flushSync(() => closeMenu({ immediate: true }));
                  void action.onSelect();
                }}
              >
                {ActionIcon ? <ActionIcon className="record-actions-menu-item-icon" /> : null}
                <span className="record-actions-menu-item-label">{t(action.label)}</span>
              </button>
            );
          })}
        </div>,
        document.body,
      ) : null}
    </span>
  );
};

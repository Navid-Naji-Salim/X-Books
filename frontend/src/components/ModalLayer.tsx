import { type ReactNode, type RefObject, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";

type ModalLayerProps = {
  backdropClassName?: string;
  children: ReactNode;
  closeDisabled?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
};

type DocumentLockSnapshot = {
  bodyOverflow: string;
  bodyOverscrollBehavior: string;
  bodyPaddingRight: string;
  rootHadInert: boolean;
  rootOverflow: string;
  rootOverscrollBehavior: string;
  rootScrollbarGutter: string;
  scrollX: number;
  scrollY: number;
};

let activeModalLocks = 0;
let documentLockSnapshot: DocumentLockSnapshot | null = null;

const lockDocument = () => {
  activeModalLocks += 1;
  if (activeModalLocks > 1) return;

  const root = document.documentElement;
  const appRoot = document.getElementById("root");
  documentLockSnapshot = {
    bodyOverflow: document.body.style.overflow,
    bodyOverscrollBehavior: document.body.style.overscrollBehavior,
    bodyPaddingRight: document.body.style.paddingRight,
    rootHadInert: Boolean(appRoot?.hasAttribute("inert")),
    rootOverflow: root.style.overflow,
    rootOverscrollBehavior: root.style.overscrollBehavior,
    rootScrollbarGutter: root.style.scrollbarGutter,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  const scrollbarWidth = window.innerWidth - root.clientWidth;
  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `calc(${window.getComputedStyle(document.body).paddingRight} + ${scrollbarWidth}px)`;
  }
  root.style.overflow = "clip";
  root.style.overscrollBehavior = "none";
  document.body.style.overflow = "clip";
  document.body.style.overscrollBehavior = "none";
  appRoot?.setAttribute("inert", "");
};

const unlockDocument = () => {
  activeModalLocks = Math.max(0, activeModalLocks - 1);
  if (activeModalLocks > 0 || !documentLockSnapshot) return;

  const snapshot = documentLockSnapshot;
  const root = document.documentElement;
  const appRoot = document.getElementById("root");
  root.style.overflow = snapshot.rootOverflow;
  root.style.overscrollBehavior = snapshot.rootOverscrollBehavior;
  root.style.scrollbarGutter = snapshot.rootScrollbarGutter;
  document.body.style.overflow = snapshot.bodyOverflow;
  document.body.style.overscrollBehavior = snapshot.bodyOverscrollBehavior;
  document.body.style.paddingRight = snapshot.bodyPaddingRight;
  if (!snapshot.rootHadInert) appRoot?.removeAttribute("inert");
  window.scrollTo({ left: snapshot.scrollX, top: snapshot.scrollY, behavior: "auto" });
  documentLockSnapshot = null;
};

const focusableSelector = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "a[href]",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export const ModalLayer = ({
  backdropClassName = "modal-backdrop",
  children,
  closeDisabled = false,
  initialFocusRef,
  onClose,
}: ModalLayerProps) => {
  const layerRef = useRef<HTMLDivElement>(null);
  const closeDisabledRef = useRef(closeDisabled);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    closeDisabledRef.current = closeDisabled;
    onCloseRef.current = onClose;
  }, [closeDisabled, onClose]);

  useLayoutEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockDocument();

    const getAuxiliaryLayers = () => Array.from(
      document.querySelectorAll<HTMLElement>(".date-picker-popover.is-modal-anchored"),
    );
    const getFocusableElements = () => [
      ...Array.from(layerRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []),
      ...getAuxiliaryLayers().flatMap((layer) => Array.from(layer.querySelectorAll<HTMLElement>(focusableSelector))),
    ].filter((element) => !element.hidden && element.getClientRects().length > 0);
    const containsActiveElement = (activeElement: Element | null) => Boolean(
      activeElement && (
        layerRef.current?.contains(activeElement)
        || getAuxiliaryLayers().some((layer) => layer.contains(activeElement))
      )
    );

    const focusFrame = window.requestAnimationFrame(() => {
      const initialFocus = initialFocusRef?.current ?? getFocusableElements()[0];
      initialFocus?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !closeDisabledRef.current) {
        if (getAuxiliaryLayers().length) return;
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements();
      if (!focusableElements.length) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey && (activeElement === first || !containsActiveElement(activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeElement === last || !containsActiveElement(activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      unlockDocument();
      previouslyFocused?.focus();
    };
  }, [initialFocusRef]);

  return createPortal(
    <div
      className={backdropClassName}
      ref={layerRef}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget && !closeDisabledRef.current) onCloseRef.current();
      }}
    >
      {children}
    </div>,
    document.body,
  );
};

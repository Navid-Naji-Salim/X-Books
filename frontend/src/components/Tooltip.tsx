import {
  cloneElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
} from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n";

type TooltipPlacement = "side" | "top" | "bottom";
type ResolvedPlacement = "left" | "right" | "top" | "bottom";
type TooltipChildProps = {
  "aria-describedby"?: string;
  disabled?: boolean;
};

type TooltipProps = {
  children: ReactElement<TooltipChildProps>;
  content: string;
  disabled?: boolean;
  placement?: TooltipPlacement;
};

const EDGE = 8;
const GAP = 12;
const HOVER_DELAY = 140;

export const Tooltip = ({ children, content, disabled = false, placement = "top" }: TooltipProps) => {
  const { t } = useLanguage();
  const tooltipId = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [resolvedPlacement, setResolvedPlacement] = useState<ResolvedPlacement>("top");
  const [position, setPosition] = useState<CSSProperties>({ left: EDGE, top: EDGE });
  const translatedContent = t(content);
  const isDisabled = disabled || Boolean(children.props.disabled);

  const clearOpenTimer = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    openTimer.current = null;
  };

  const show = (immediate: boolean) => {
    if (isDisabled) return;
    clearOpenTimer();
    const open = () => {
      setIsRendered(true);
      setIsVisible(true);
    };
    if (immediate) open();
    else openTimer.current = setTimeout(open, HOVER_DELAY);
  };

  const hide = () => {
    clearOpenTimer();
    setIsVisible(false);
  };

  useEffect(() => {
    const anchor = anchorRef.current;
    if (isDisabled) {
      clearOpenTimer();
      setIsVisible(false);
      setIsRendered(false);
      return clearOpenTimer;
    }

    if (!anchor) return clearOpenTimer;
    const showOnHover = () => show(false);
    const showOnFocus = () => show(true);
    const hideOnBlur = (event: FocusEvent) => {
      if (!anchor.contains(event.relatedTarget as Node | null)) hide();
    };
    anchor.addEventListener("mouseenter", showOnHover);
    anchor.addEventListener("mouseleave", hide);
    anchor.addEventListener("focusin", showOnFocus);
    anchor.addEventListener("focusout", hideOnBlur);
    return () => {
      clearOpenTimer();
      anchor.removeEventListener("mouseenter", showOnHover);
      anchor.removeEventListener("mouseleave", hide);
      anchor.removeEventListener("focusin", showOnFocus);
      anchor.removeEventListener("focusout", hideOnBlur);
    };
  }, [isDisabled]);

  useLayoutEffect(() => {
    if (!isRendered) return;
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;

    const updatePosition = () => {
      const anchorRect = anchor.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      const width = tooltip.offsetWidth || tooltipRect.width;
      const height = tooltip.offsetHeight || tooltipRect.height;
      const isRtl = document.documentElement.dir === "rtl";
      const candidates: ResolvedPlacement[] = placement === "side"
        ? isRtl ? ["left", "right", "top", "bottom"] : ["right", "left", "top", "bottom"]
        : placement === "bottom" ? ["bottom", "top", "right", "left"] : ["top", "bottom", "right", "left"];
      const coordinates = (candidate: ResolvedPlacement) => {
        if (candidate === "left") return { left: anchorRect.left - width - GAP, top: anchorRect.top + (anchorRect.height - height) / 2 };
        if (candidate === "right") return { left: anchorRect.right + GAP, top: anchorRect.top + (anchorRect.height - height) / 2 };
        if (candidate === "bottom") return { left: anchorRect.left + (anchorRect.width - width) / 2, top: anchorRect.bottom + GAP };
        return { left: anchorRect.left + (anchorRect.width - width) / 2, top: anchorRect.top - height - GAP };
      };
      const fits = ({ left, top }: { left: number; top: number }) =>
        left >= EDGE && top >= EDGE && left + width <= window.innerWidth - EDGE && top + height <= window.innerHeight - EDGE;
      const chosen = candidates.find((candidate) => fits(coordinates(candidate))) ?? candidates[0];
      const preferred = coordinates(chosen);
      setResolvedPlacement(chosen);
      setPosition({
        left: Math.min(Math.max(EDGE, preferred.left), window.innerWidth - width - EDGE),
        top: Math.min(Math.max(EDGE, preferred.top), window.innerHeight - height - EDGE),
      });
    };

    updatePosition();
    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(anchor);
    resizeObserver.observe(tooltip);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("scroll", updatePosition, true);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("scroll", updatePosition, true);
    };
  }, [isRendered, placement, translatedContent]);

  const describedBy = isRendered
    ? [children.props["aria-describedby"], tooltipId].filter(Boolean).join(" ")
    : children.props["aria-describedby"];
  const trigger = cloneElement(children, { "aria-describedby": describedBy });

  return (
    <span
      className="x-tooltip-anchor"
      ref={anchorRef}
    >
      {trigger}
      {isRendered ? createPortal(
        <span
          className={`x-tooltip x-tooltip-${resolvedPlacement} ${isVisible ? "is-visible" : "is-closing"}`}
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          style={position}
          onAnimationEnd={(event) => {
            if (event.animationName === "x-tooltip-exit" && !isVisible) setIsRendered(false);
          }}
        >
          {translatedContent}
        </span>,
        document.body,
      ) : null}
    </span>
  );
};

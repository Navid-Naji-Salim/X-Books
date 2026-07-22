import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useLanguage } from "../i18n";

type RecordTableScrollProps = {
  children: ReactNode;
  className?: string;
  columns: number;
};

type ScrollbarMetrics = {
  maxScroll: number;
  thumbHeight: number;
  thumbTop: number;
  trackHeight: number;
  trackTop: number;
  visible: boolean;
};

const emptyMetrics: ScrollbarMetrics = {
  maxScroll: 0,
  thumbHeight: 0,
  thumbTop: 0,
  trackHeight: 0,
  trackTop: 0,
  visible: false,
};

const scrollbarBottomInset = 8;

export const RecordTableScroll = ({ children, className, columns }: RecordTableScrollProps) => {
  const { language } = useLanguage();
  const horizontalRef = useRef<HTMLDivElement>(null);
  const isPinnedToRtlStartRef = useRef(true);
  const dragRef = useRef<{ pointerId: number; startScrollTop: number; startY: number } | null>(null);
  const [metrics, setMetrics] = useState<ScrollbarMetrics>(emptyMetrics);

  const getRowsContainer = () => horizontalRef.current?.querySelector<HTMLTableSectionElement>("tbody") ?? null;

  useLayoutEffect(() => {
    const horizontalContainer = horizontalRef.current;
    const rowsContainer = getRowsContainer();
    if (!horizontalContainer || !rowsContainer) return;

    const rtlStart = () => Math.max(0, horizontalContainer.scrollWidth - horizontalContainer.clientWidth);
    const alignToLanguageStart = () => {
      horizontalContainer.scrollLeft = language === "en" ? 0 : rtlStart();
    };
    const updatePinnedState = () => {
      if (language === "en") return;
      isPinnedToRtlStartRef.current = Math.abs(horizontalContainer.scrollLeft - rtlStart()) <= 1;
    };
    const updateScrollbar = () => {
      const horizontalRect = horizontalContainer.getBoundingClientRect();
      const rowsRect = rowsContainer.getBoundingClientRect();
      const viewportHeight = rowsContainer.clientHeight;
      const trackHeight = Math.max(0, viewportHeight - scrollbarBottomInset);
      const maxScroll = Math.max(0, rowsContainer.scrollHeight - viewportHeight);
      const visible = maxScroll > 1 && trackHeight > 0;
      if (!visible && rowsContainer.scrollTop !== 0) rowsContainer.scrollTop = 0;
      const thumbHeight = visible
        ? Math.min(trackHeight, Math.max(28, Math.round(trackHeight * viewportHeight / rowsContainer.scrollHeight)))
        : 0;
      const thumbRange = Math.max(0, trackHeight - thumbHeight);
      const thumbTop = maxScroll > 0 ? rowsContainer.scrollTop / maxScroll * thumbRange : 0;
      const nextMetrics = {
        maxScroll,
        thumbHeight,
        thumbTop,
        trackHeight,
        trackTop: rowsRect.top - horizontalRect.top,
        visible,
      };
      setMetrics((current) => Object.keys(nextMetrics).every((key) => (
        current[key as keyof ScrollbarMetrics] === nextMetrics[key as keyof ScrollbarMetrics]
      )) ? current : nextMetrics);
    };

    isPinnedToRtlStartRef.current = language !== "en";
    alignToLanguageStart();
    updateScrollbar();
    horizontalContainer.addEventListener("scroll", updatePinnedState, { passive: true });
    rowsContainer.addEventListener("scroll", updateScrollbar, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (language !== "en" && isPinnedToRtlStartRef.current) alignToLanguageStart();
      updateScrollbar();
    });
    resizeObserver.observe(horizontalContainer);
    resizeObserver.observe(rowsContainer);
    const table = horizontalContainer.querySelector("table");
    if (table) resizeObserver.observe(table);

    const mutationObserver = new MutationObserver(updateScrollbar);
    mutationObserver.observe(rowsContainer, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      horizontalContainer.removeEventListener("scroll", updatePinnedState);
      rowsContainer.removeEventListener("scroll", updateScrollbar);
    };
  }, [language]);

  const handleThumbPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rowsContainer = getRowsContainer();
    if (!rowsContainer) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startScrollTop: rowsContainer.scrollTop,
      startY: event.clientY,
    };
  };

  const handleThumbPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const rowsContainer = getRowsContainer();
    if (!drag || drag.pointerId !== event.pointerId || !rowsContainer) return;
    const thumbRange = metrics.trackHeight - metrics.thumbHeight;
    if (thumbRange <= 0) return;
    rowsContainer.scrollTop = drag.startScrollTop
      + (event.clientY - drag.startY) * metrics.maxScroll / thumbRange;
  };

  const handleThumbPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleScrollbarKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const rowsContainer = getRowsContainer();
    if (!rowsContainer) return;
    const page = Math.max(40, rowsContainer.clientHeight * 0.85);
    const nextScrollTop = event.key === "ArrowDown" ? rowsContainer.scrollTop + 40
      : event.key === "ArrowUp" ? rowsContainer.scrollTop - 40
        : event.key === "PageDown" ? rowsContainer.scrollTop + page
          : event.key === "PageUp" ? rowsContainer.scrollTop - page
            : event.key === "Home" ? 0
              : event.key === "End" ? metrics.maxScroll
                : null;
    if (nextScrollTop === null) return;
    event.preventDefault();
    rowsContainer.scrollTop = nextScrollTop;
  };

  const tableStyle = { "--record-data-columns": columns - 1 } as CSSProperties;

  return (
    <div className={[
      "record-table-shell",
      metrics.visible ? "has-scrollable-rows" : "rows-locked",
      className,
    ].filter(Boolean).join(" ")}>
      <div className="table-wrap record-table-wrap" ref={horizontalRef} style={tableStyle}>
        {children}
      </div>
      {metrics.visible ? (
        <div
          className="record-body-scrollbar-track"
          style={{ height: metrics.trackHeight, top: metrics.trackTop }}
        >
          <div
            aria-label="Scroll table rows"
            aria-orientation="vertical"
            aria-valuemax={Math.round(metrics.maxScroll)}
            aria-valuemin={0}
            aria-valuenow={Math.round(metrics.thumbTop / Math.max(1, metrics.trackHeight - metrics.thumbHeight) * metrics.maxScroll)}
            className="record-body-scrollbar-thumb"
            role="scrollbar"
            tabIndex={0}
            style={{ height: metrics.thumbHeight, transform: `translateY(${metrics.thumbTop}px)` }}
            onKeyDown={handleScrollbarKeyDown}
            onPointerCancel={handleThumbPointerUp}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
          />
        </div>
      ) : null}
    </div>
  );
};

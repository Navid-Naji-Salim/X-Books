import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useLanguage } from "../i18n";

type RecordTableScrollProps = {
  children: ReactNode;
  className?: string;
  columns: number;
  visibleRows?: number;
};

export const RecordTableScroll = ({ children, className, columns, visibleRows }: RecordTableScrollProps) => {
  const { language } = useLanguage();
  const horizontalRef = useRef<HTMLDivElement>(null);
  const isPinnedToRtlStartRef = useRef(true);

  useLayoutEffect(() => {
    const horizontalContainer = horizontalRef.current;
    const rowsContainer = horizontalContainer?.querySelector<HTMLTableSectionElement>("tbody");
    if (!horizontalContainer || !rowsContainer) return;

    const rtlStart = () => Math.max(0, horizontalContainer.scrollWidth - horizontalContainer.clientWidth);
    const alignToLanguageStart = () => {
      horizontalContainer.scrollLeft = language === "en" ? 0 : rtlStart();
    };
    const updatePinnedState = () => {
      if (language === "en") return;
      isPinnedToRtlStartRef.current = Math.abs(horizontalContainer.scrollLeft - rtlStart()) <= 1;
    };
    const updateRowsLimit = () => {
      if (!visibleRows) {
        rowsContainer.style.maxBlockSize = "";
        return;
      }
      const rows = Array.from(rowsContainer.rows);
      const visibleHeight = rows.slice(0, visibleRows).reduce(
        (height, row) => height + row.getBoundingClientRect().height,
        0,
      );
      const nextLimit = rows.length > visibleRows && visibleHeight > 0
        ? `${visibleHeight}px`
        : "";
      if (rowsContainer.style.maxBlockSize !== nextLimit) {
        rowsContainer.style.maxBlockSize = nextLimit;
      }
    };
    isPinnedToRtlStartRef.current = language !== "en";
    alignToLanguageStart();
    updateRowsLimit();
    horizontalContainer.addEventListener("scroll", updatePinnedState, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (language !== "en" && isPinnedToRtlStartRef.current) alignToLanguageStart();
      updateRowsLimit();
    });
    resizeObserver.observe(horizontalContainer);
    resizeObserver.observe(rowsContainer);
    const table = horizontalContainer.querySelector("table");
    if (table) resizeObserver.observe(table);

    const mutationObserver = new MutationObserver(() => {
      updateRowsLimit();
    });
    mutationObserver.observe(rowsContainer, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      horizontalContainer.removeEventListener("scroll", updatePinnedState);
    };
  }, [language, visibleRows]);

  const tableStyle = { "--record-data-columns": columns - 1 } as CSSProperties;

  return (
    <div className={["record-table-shell", className].filter(Boolean).join(" ")}>
      <div className="table-wrap record-table-wrap" ref={horizontalRef} style={tableStyle}>
        {children}
      </div>
    </div>
  );
};

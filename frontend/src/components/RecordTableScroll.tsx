import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useLanguage } from "../i18n";

type RecordTableScrollProps = {
  children: ReactNode;
  className?: string;
};

export const RecordTableScroll = ({ children, className }: RecordTableScrollProps) => {
  const { language } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPinnedToRtlStartRef = useRef(true);

  useLayoutEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;

    const rtlStart = () => Math.max(0, scrollContainer.scrollWidth - scrollContainer.clientWidth);
    const alignToLanguageStart = () => {
      scrollContainer.scrollLeft = language === "en" ? 0 : rtlStart();
    };
    const updatePinnedState = () => {
      if (language === "en") return;
      isPinnedToRtlStartRef.current = Math.abs(scrollContainer.scrollLeft - rtlStart()) <= 1;
    };

    isPinnedToRtlStartRef.current = language !== "en";
    alignToLanguageStart();
    scrollContainer.addEventListener("scroll", updatePinnedState, { passive: true });

    const resizeObserver = new ResizeObserver(() => {
      if (language !== "en" && isPinnedToRtlStartRef.current) alignToLanguageStart();
    });
    resizeObserver.observe(scrollContainer);
    const table = scrollContainer.querySelector("table");
    if (table) resizeObserver.observe(table);

    return () => {
      resizeObserver.disconnect();
      scrollContainer.removeEventListener("scroll", updatePinnedState);
    };
  }, [language]);

  return (
    <div
      className={["table-wrap", "record-table-wrap", className].filter(Boolean).join(" ")}
      ref={scrollRef}
    >
      {children}
    </div>
  );
};

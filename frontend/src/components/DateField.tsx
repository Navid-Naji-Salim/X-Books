import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { appIcons } from "../icons";
import { useLanguage } from "../i18n";
import { DropdownField } from "./FormControls";

type DateFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  min?: string;
  max?: string;
  name?: string;
};

const CalendarIcon = appIcons.form.calendar;
const PreviousIcon = appIcons.date.previous;
const NextIcon = appIcons.date.next;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const parseDate = (value: string) => {
  const match = datePattern.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
};

const formatDate = (date: Date) => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const sameDay = (left: Date, right: Date) => formatDate(left) === formatDate(right);
const isAllowed = (value: string, min?: string, max?: string) => (!min || value >= min) && (!max || value <= max);

export const DateField = ({ id, label, value, onChange, disabled, readOnly, required, min, max, name }: DateFieldProps) => {
  const { language, t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [openPeriodDropdown, setOpenPeriodDropdown] = useState<string | null>(null);
  const [draft, setDraft] = useState(value);
  const selectedDate = parseDate(value);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());
  const locale = language === "ku" ? "ckb" : language === "ar" ? "ar-IQ" : "en-US";
  const localizedLabel = t(label);
  const copy = language === "ku"
    ? { calendar: "ڕۆژژمێر", open: "کردنەوەی ڕۆژژمێر", close: "داخستنی ڕۆژژمێر", previous: "مانگی پێشوو", next: "مانگی داهاتوو", month: "مانگ", year: "ساڵ", today: "ئەمڕۆ", clear: "پاککردنەوە" }
    : language === "ar"
      ? { calendar: "التقويم", open: "فتح التقويم", close: "إغلاق التقويم", previous: "الشهر السابق", next: "الشهر التالي", month: "الشهر", year: "السنة", today: "اليوم", clear: "مسح" }
      : { calendar: "Calendar", open: "Open Calendar", close: "Close Calendar", previous: "Previous Month", next: "Next Month", month: "Month", year: "Year", today: "Today", clear: "Clear" };

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (disabled || readOnly) setIsOpen(false);
  }, [disabled, readOnly]);

  const close = () => {
    setIsOpen(false);
    setOpenPeriodDropdown(null);
  };
  const toggle = () => {
    if (disabled || readOnly) return;
    if (!isOpen) {
      setViewDate(selectedDate ?? new Date());
    }
    setIsOpen((current) => !current);
  };

  const commitDraft = () => {
    if (draft === "") {
      onChange("");
      return;
    }
    const parsed = parseDate(draft);
    if (parsed && isAllowed(draft, min, max)) {
      onChange(draft);
      setViewDate(parsed);
    } else {
      setDraft(value);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    const updatePosition = () => {
      const root = rootRef.current;
      const anchor = root?.getBoundingClientRect();
      const popup = popupRef.current;
      if (!anchor || !popup) return;
      const viewportGap = 8;
      const fieldGap = 7;
      const width = Math.min(376, window.innerWidth - viewportGap * 2);
      const left = Math.min(Math.max(anchor.right - width, viewportGap), window.innerWidth - width - viewportGap);
      const below = anchor.bottom + fieldGap;
      const isInModal = Boolean(root?.closest('[role="dialog"][aria-modal="true"]'));
      let top = below;

      if (isInModal) {
        const popupHeight = popup.offsetHeight;
        const above = anchor.top - fieldGap - popupHeight;
        const fitsBelow = below + popupHeight <= window.innerHeight - viewportGap;
        const fitsAbove = above >= viewportGap;

        if (!fitsBelow) {
          if (fitsAbove) {
            top = above;
          } else {
            const maximumTop = Math.max(viewportGap, window.innerHeight - popupHeight - viewportGap);
            top = Math.min(Math.max(below, viewportGap), maximumTop);
          }
        }
      }

      const nextPosition = isInModal ? "fixed" : "absolute";
      const nextLeft = `${left + (isInModal ? 0 : window.scrollX)}px`;
      const nextTop = `${top + (isInModal ? 0 : window.scrollY)}px`;
      const nextWidth = `${width}px`;
      popup.classList.toggle("is-modal-anchored", isInModal);
      if (popup.style.position !== nextPosition) popup.style.position = nextPosition;
      if (popup.style.left !== nextLeft) popup.style.left = nextLeft;
      if (popup.style.top !== nextTop) popup.style.top = nextTop;
      if (popup.style.width !== nextWidth) popup.style.width = nextWidth;
    };
    let frame = 0;
    const trackPosition = () => {
      updatePosition();
      frame = window.requestAnimationFrame(trackPosition);
    };
    trackPosition();
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isOpen, viewDate]);

  const monthNames = useMemo(() => Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, month, 1))), [locale]);
  const weekdayNames = useMemo(() => Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(new Date(2024, 0, 7 + day))), [locale]);
  const years = useMemo(() => Array.from({ length: 51 }, (_, index) => String(2000 + index)), []);
  const firstGridDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay());
  const days = Array.from({ length: 42 }, (_, index) => new Date(firstGridDay.getFullYear(), firstGridDay.getMonth(), firstGridDay.getDate() + index));
  const today = new Date();

  const chooseDate = (date: Date) => {
    const nextValue = formatDate(date);
    if (!isAllowed(nextValue, min, max)) return;
    setDraft(nextValue);
    onChange(nextValue);
    setViewDate(date);
    close();
    inputRef.current?.focus();
  };

  const focusDate = (targetDate: Date) => {
    setViewDate(new Date(targetDate.getFullYear(), targetDate.getMonth(), 1));
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      popupRef.current?.querySelector<HTMLButtonElement>(`[data-date="${formatDate(targetDate)}"]`)?.focus();
    }));
  };

  const popup = isOpen ? createPortal(
    <div
      ref={popupRef}
      className="date-picker-popover"
      role="dialog"
      aria-label={`${localizedLabel} ${copy.calendar}`}
      style={{ left: 8, top: 8, width: 320 }}
    >
      <div className="date-picker-header">
        <button type="button" className="date-picker-nav" aria-label={copy.previous} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>
          <PreviousIcon />
        </button>
        <div className="date-picker-period">
          <DropdownField
            ariaLabel={copy.month}
            className="date-picker-period-dropdown"
            includeFormValue={false}
            label={copy.month}
            labelClassName="sr-only"
            name={`${id}-calendar-month`}
            openDropdown={openPeriodDropdown}
            options={monthNames.map((month, index) => ({ label: month, value: String(index) }))}
            optionsClassName="date-picker-period-options is-month"
            setOpenDropdown={setOpenPeriodDropdown}
            value={String(viewDate.getMonth())}
            onChange={(month) => setViewDate(new Date(viewDate.getFullYear(), Number(month), 1))}
          />
          <DropdownField
            ariaLabel={copy.year}
            className="date-picker-period-dropdown"
            includeFormValue={false}
            label={copy.year}
            labelClassName="sr-only"
            name={`${id}-calendar-year`}
            openDropdown={openPeriodDropdown}
            options={years}
            optionsClassName="date-picker-period-options is-year"
            setOpenDropdown={setOpenPeriodDropdown}
            value={String(viewDate.getFullYear())}
            onChange={(year) => setViewDate(new Date(Number(year), viewDate.getMonth(), 1))}
          />
        </div>
        <button type="button" className="date-picker-nav" aria-label={copy.next} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>
          <NextIcon />
        </button>
      </div>
      <div className="date-picker-weekdays" aria-hidden="true">
        {weekdayNames.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}
      </div>
      <div className="date-picker-grid" role="grid">
        {days.map((date) => {
          const dateValue = formatDate(date);
          const outsideMonth = date.getMonth() !== viewDate.getMonth();
          const unavailable = !isAllowed(dateValue, min, max);
          return <button
            key={dateValue}
            type="button"
            role="gridcell"
            data-date={dateValue}
            className={`date-picker-day${outsideMonth ? " is-outside" : ""}${selectedDate && sameDay(date, selectedDate) ? " is-selected" : ""}${sameDay(date, today) ? " is-today" : ""}`}
            aria-label={new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(date)}
            aria-selected={Boolean(selectedDate && sameDay(date, selectedDate))}
            aria-current={sameDay(date, today) ? "date" : undefined}
            disabled={unavailable}
            onClick={() => chooseDate(date)}
            onKeyDown={(event) => {
              const offsets: Partial<Record<string, number>> = {
                ArrowLeft: -1,
                ArrowRight: 1,
                ArrowUp: -7,
                ArrowDown: 7,
                Home: -date.getDay(),
                End: 6 - date.getDay(),
              };
              const offset = offsets[event.key];
              if (offset !== undefined) {
                event.preventDefault();
                focusDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset));
              } else if (event.key === "PageUp" || event.key === "PageDown") {
                event.preventDefault();
                const monthOffset = event.key === "PageUp" ? -1 : 1;
                const targetMonth = new Date(date.getFullYear(), date.getMonth() + monthOffset, 1);
                const lastDay = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();
                focusDate(new Date(targetMonth.getFullYear(), targetMonth.getMonth(), Math.min(date.getDate(), lastDay)));
              }
            }}
          >{new Intl.NumberFormat(locale).format(date.getDate())}</button>;
        })}
      </div>
      <div className="date-picker-footer">
        <button type="button" onClick={() => chooseDate(today)} disabled={!isAllowed(formatDate(today), min, max)}>{copy.today}</button>
        <button type="button" onClick={() => { setDraft(""); onChange(""); close(); inputRef.current?.focus(); }}>{copy.clear}</button>
      </div>
    </div>,
    document.body,
  ) : null;

  return <div className="field date-field">
    <label htmlFor={id}>{localizedLabel}</label>
    <div className={`date-field-control${isOpen ? " is-open" : ""}`} ref={rootRef}>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="YYYY-MM-DD"
        pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}"
        value={draft}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        min={min}
        max={max}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onChange={(event) => setDraft(event.currentTarget.value)}
        onBlur={commitDraft}
        onKeyDown={(event) => {
          if (event.key === "Enter") commitDraft();
          if (event.key === "ArrowDown" && event.altKey) {
            event.preventDefault();
            toggle();
          }
        }}
      />
      <button type="button" className="date-field-trigger" aria-label={`${isOpen ? copy.close : copy.open}: ${localizedLabel}`} aria-expanded={isOpen} disabled={disabled || readOnly} onClick={toggle}>
        <CalendarIcon />
      </button>
    </div>
    {popup}
  </div>;
};

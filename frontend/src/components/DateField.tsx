import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { DayPicker, type ChevronProps, type DropdownProps, type Matcher } from "@daypicker/react";
import { ar, ckb, enUS } from "@daypicker/react/locale";
import * as Select from "@radix-ui/react-select";
import { appIcons } from "../icons";
import { useLanguage } from "../i18n";

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

type PopupPosition = { left: number; top: number; width: number };

const CalendarIcon = appIcons.form.calendar;
const PreviousIcon = appIcons.date.previous;
const NextIcon = appIcons.date.next;
const DropdownIcon = appIcons.disclosure.down;
const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const calendarStart = new Date(1900, 0, 1);
const calendarEnd = new Date(2100, 11, 31);

const parseDate = (value: string) => {
  const match = datePattern.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
};

const formatDate = (date: Date) => {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isAllowed = (value: string, min?: string, max?: string) => (!min || value >= min) && (!max || value <= max);

const PickerChevron = ({ orientation, className, size = 18, style }: ChevronProps) => {
  if (orientation === "left") return <PreviousIcon className={className} size={size} style={style} />;
  if (orientation === "right") return <NextIcon className={className} size={size} style={style} />;
  return <DropdownIcon className={className} size={size} style={{ ...style, transform: orientation === "up" ? "rotate(180deg)" : undefined }} />;
};

const PickerDropdown = ({ options, value, onChange, disabled, className, "aria-label": ariaLabel }: DropdownProps) => (
  <Select.Root
    value={String(value)}
    disabled={disabled}
    onValueChange={(nextValue) => onChange?.({
      target: { value: nextValue },
      currentTarget: { value: nextValue },
    } as ChangeEvent<HTMLSelectElement>)}
  >
    <Select.Trigger className={`date-picker-select-trigger ${className ?? ""}`} aria-label={ariaLabel}>
      <Select.Value />
      <Select.Icon className="date-picker-select-icon"><DropdownIcon /></Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content className="date-picker-select-content" position="popper" sideOffset={6} collisionPadding={8}>
        <Select.ScrollUpButton className="date-picker-select-scroll"><DropdownIcon className="is-up" /></Select.ScrollUpButton>
        <Select.Viewport className="date-picker-select-viewport">
          {options?.map((option) => (
            <Select.Item className="date-picker-select-item" disabled={option.disabled} key={option.value} value={String(option.value)}>
              <Select.ItemText>{option.label}</Select.ItemText>
              <Select.ItemIndicator className="date-picker-select-indicator" aria-hidden="true">✓</Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
        <Select.ScrollDownButton className="date-picker-select-scroll"><DropdownIcon /></Select.ScrollDownButton>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);

const pickerComponents = { Chevron: PickerChevron, Dropdown: PickerDropdown };

export const DateField = ({ id, label, value, onChange, disabled, readOnly, required, min, max, name }: DateFieldProps) => {
  const { language, t } = useLanguage();
  const rootRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [position, setPosition] = useState<PopupPosition>({ left: 8, top: 8, width: 320 });
  const selectedDate = parseDate(value);
  const minDate = min ? parseDate(min) : undefined;
  const maxDate = max ? parseDate(max) : undefined;
  const disabledDates: Matcher[] = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ];
  const locale = language === "ku" ? ckb : language === "ar" ? ar : enUS;
  const direction = language === "en" ? "ltr" : "rtl";
  const localizedLabel = t(label);
  const calendarId = `${id}-calendar`;
  const copy = language === "ku"
    ? { calendar: "ڕۆژژمێر", open: "کردنەوەی ڕۆژژمێر", close: "داخستنی ڕۆژژمێر", today: "ئەمڕۆ", clear: "پاککردنەوە" }
    : language === "ar"
      ? { calendar: "التقويم", open: "فتح التقويم", close: "إغلاق التقويم", today: "اليوم", clear: "مسح" }
      : { calendar: "calendar", open: "Open calendar", close: "Close calendar", today: "Today", clear: "Clear" };

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (disabled || readOnly) setIsOpen(false);
  }, [disabled, readOnly]);

  const close = () => setIsOpen(false);
  const toggle = () => {
    if (!disabled && !readOnly) setIsOpen((current) => !current);
  };

  const commitDraft = () => {
    if (draft === "") {
      onChange("");
      return;
    }
    const parsed = parseDate(draft);
    if (parsed && isAllowed(draft, min, max)) onChange(draft);
    else setDraft(value);
  };

  const chooseDate = (date: Date) => {
    const nextValue = formatDate(date);
    setDraft(nextValue);
    onChange(nextValue);
    close();
    inputRef.current?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (target instanceof Element && target.closest(".date-picker-select-content")) return;
      if (!rootRef.current?.contains(target) && !popupRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (event.target instanceof Element && event.target.closest(".date-picker-select-content")) return;
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
      const anchor = rootRef.current?.getBoundingClientRect();
      const popup = popupRef.current;
      if (!anchor || !popup) return;
      const viewportGap = 8;
      const fieldGap = 7;
      const width = Math.min(328, window.innerWidth - viewportGap * 2);
      const height = popup.offsetHeight;
      const left = Math.min(Math.max(anchor.right - width, viewportGap), window.innerWidth - width - viewportGap);
      const below = anchor.bottom + fieldGap;
      const top = below + height <= window.innerHeight - viewportGap
        ? below
        : Math.max(viewportGap, anchor.top - height - fieldGap);
      setPosition({ left, top, width });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  const popup = isOpen ? createPortal(
    <div
      ref={popupRef}
      className="date-picker-popover"
      style={{ left: position.left, top: position.top, width: position.width }}
    >
      <DayPicker
        id={calendarId}
        className="date-picker-calendar"
        mode="single"
        required
        selected={selectedDate}
        defaultMonth={selectedDate ?? new Date()}
        onSelect={chooseDate}
        disabled={disabledDates}
        startMonth={calendarStart}
        endMonth={calendarEnd}
        captionLayout="dropdown"
        navLayout="around"
        fixedWeeks
        showOutsideDays
        autoFocus
        locale={locale}
        numerals={language === "en" ? "latn" : "arab"}
        dir={direction}
        lang={language === "ku" ? "ckb" : language === "ar" ? "ar-IQ" : "en-US"}
        role="dialog"
        aria-label={`${localizedLabel} ${copy.calendar}`}
        components={pickerComponents}
      />
      <div className="date-picker-footer">
        <button type="button" onClick={() => chooseDate(new Date())} disabled={!isAllowed(formatDate(new Date()), min, max)}>{copy.today}</button>
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
        aria-controls={isOpen ? calendarId : undefined}
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
      <button type="button" className="date-field-trigger" aria-label={`${isOpen ? copy.close : copy.open}: ${localizedLabel}`} aria-controls={isOpen ? calendarId : undefined} aria-expanded={isOpen} disabled={disabled || readOnly} onClick={toggle}>
        <CalendarIcon />
      </button>
    </div>
    {popup}
  </div>;
};

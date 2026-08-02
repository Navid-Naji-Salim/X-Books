import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

export const TAX_OPTIONS = ["Exempt", "Standard Tax", "Reduced Tax", "Out of Scope"];

type Option = string | { label: string; value: string };

type DropdownFieldProps = {
  label?: string;
  ariaLabel?: string;
  className?: string;
  labelClassName?: string;
  name: string;
  options: Option[];
  optionsClassName?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  resetVersion?: number;
  openDropdown: string | null;
  setOpenDropdown: (name: string | null) => void;
  value?: string;
  onChange?: (value: string) => void;
  floatingOptions?: boolean;
  includeFormValue?: boolean;
  translateOptions?: boolean;
};

export const DropdownField = ({
  label = "Unit", name, options, defaultValue = "", placeholder = "Select an option",
  ariaLabel, className = "", labelClassName = "", optionsClassName = "",
  required, disabled, resetVersion, openDropdown, setOpenDropdown,
  value: controlledValue, onChange, floatingOptions = false, includeFormValue = true, translateOptions = true,
}: DropdownFieldProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties>();
  const selectedValue = controlledValue ?? internalValue;

  useEffect(() => {
    if (controlledValue === undefined) setInternalValue(defaultValue);
  }, [controlledValue, defaultValue, resetVersion]);

  const selectedOption = options.find((option) =>
    (typeof option === "string" ? option : option.value) === selectedValue,
  );
  const selectedLabel = typeof selectedOption === "string" ? selectedOption : selectedOption?.label;
  const isOpen = openDropdown === name;

  const positionFloatingOptions = useCallback(() => {
    const summary = detailsRef.current?.querySelector("summary");
    if (!summary) return;
    const rect = summary.getBoundingClientRect();
    const menuGap = 6;
    const menuHeight = 152;
    const openAbove = window.innerHeight - rect.bottom < menuHeight + menuGap && rect.top > menuHeight;
    setFloatingStyle({
      left: rect.left,
      width: rect.width,
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + menuGap, top: "auto" }
        : { top: rect.bottom + menuGap, bottom: "auto" }),
    });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !floatingOptions) {
      setFloatingStyle(undefined);
      return;
    }
    positionFloatingOptions();
    window.addEventListener("resize", positionFloatingOptions);
    document.addEventListener("scroll", positionFloatingOptions, true);
    return () => {
      window.removeEventListener("resize", positionFloatingOptions);
      document.removeEventListener("scroll", positionFloatingOptions, true);
    };
  }, [floatingOptions, isOpen, positionFloatingOptions]);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!detailsRef.current?.contains(target) && !optionsRef.current?.contains(target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen, setOpenDropdown]);

  const optionsMenu = isOpen ? <div
    className={`select-options${floatingOptions ? " is-floating" : ""}${optionsClassName ? ` ${optionsClassName}` : ""}`}
    ref={optionsRef}
    style={floatingOptions ? floatingStyle : undefined}
  >
    {options.map((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      return <button className={optionValue === selectedValue ? "is-selected" : ""} disabled={disabled} key={optionValue} translate={translateOptions ? undefined : "no"} type="button" onClick={() => {
        if (controlledValue === undefined) setInternalValue(optionValue);
        onChange?.(optionValue);
        setOpenDropdown(null);
      }}>{optionLabel}</button>;
    })}
  </div> : null;

  return (
    <div className={`field dropdown-field${className ? ` ${className}` : ""}`}>
      <label className={labelClassName || undefined} htmlFor={`${name}-value`}>{label}</label>
      {includeFormValue ? <input id={`${name}-value`} name={name} type="hidden" value={selectedValue} required={required} /> : null}
      <details ref={detailsRef} className="select-menu" open={isOpen}>
        <summary aria-disabled={disabled} aria-label={ariaLabel} onClick={(event) => {
          event.preventDefault();
          if (!disabled) setOpenDropdown(isOpen ? null : name);
        }} translate={selectedOption && !translateOptions ? "no" : undefined}>{selectedLabel || placeholder}</summary>
        {!floatingOptions ? optionsMenu : null}
      </details>
      {floatingOptions && optionsMenu && floatingStyle
        ? createPortal(optionsMenu, document.getElementById("floating-options-root") ?? document.body)
        : null}
    </div>
  );
};

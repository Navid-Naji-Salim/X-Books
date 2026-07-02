import { useEffect, useRef, useState } from "react";

export const TAX_OPTIONS = ["Exempt", "Standard Tax", "Reduced Tax", "Out of Scope"];

type Option = string | { label: string; value: string };

type DropdownFieldProps = {
  label?: string;
  name: string;
  options: Option[];
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  resetVersion?: number;
  openDropdown: string | null;
  setOpenDropdown: (name: string | null) => void;
  value?: string;
  onChange?: (value: string) => void;
};

export const DropdownField = ({
  label = "Unit", name, options, defaultValue = "", placeholder = "Select an option",
  required, disabled, resetVersion, openDropdown, setOpenDropdown,
  value: controlledValue, onChange,
}: DropdownFieldProps) => {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = controlledValue ?? internalValue;

  useEffect(() => {
    if (controlledValue === undefined) setInternalValue(defaultValue);
  }, [controlledValue, defaultValue, resetVersion]);

  const selectedOption = options.find((option) =>
    (typeof option === "string" ? option : option.value) === selectedValue,
  );
  const selectedLabel = typeof selectedOption === "string" ? selectedOption : selectedOption?.label;
  const isOpen = openDropdown === name;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (isOpen && !detailsRef.current?.contains(event.target as Node)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [isOpen, setOpenDropdown]);

  return (
    <div className="field dropdown-field">
      <label htmlFor={`${name}-value`}>{label}</label>
      <input id={`${name}-value`} name={name} type="hidden" value={selectedValue} required={required} />
      <details ref={detailsRef} className="select-menu" open={isOpen}>
        <summary aria-disabled={disabled} onClick={(event) => {
          event.preventDefault();
          if (!disabled) setOpenDropdown(isOpen ? null : name);
        }}>{selectedLabel || placeholder}</summary>
        <div className="select-options">
          {options.map((option) => {
            const optionValue = typeof option === "string" ? option : option.value;
            const optionLabel = typeof option === "string" ? option : option.label;
            return <button className={optionValue === selectedValue ? "is-selected" : ""} disabled={disabled} key={optionValue} type="button" onClick={() => {
              if (controlledValue === undefined) setInternalValue(optionValue);
              onChange?.(optionValue);
              setOpenDropdown(null);
            }}>{optionLabel}</button>;
          })}
        </div>
      </details>
    </div>
  );
};

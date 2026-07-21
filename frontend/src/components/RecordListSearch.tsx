import { appIcons } from "../icons";

type RecordListSearchProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export const RecordListSearch = ({ label, placeholder, value, onChange }: RecordListSearchProps) => {
  const SearchIcon = appIcons.actions.search;

  return (
    <label className="record-list-search">
      <span className="sr-only">{label}</span>
      <SearchIcon className="record-list-search-icon" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
      />
    </label>
  );
};

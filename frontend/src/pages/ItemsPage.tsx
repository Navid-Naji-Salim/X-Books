import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { api, ApiError } from "../api";
import { Field } from "../components/Field";
import { DropdownField, TAX_OPTIONS } from "../components/FormControls";
import { ImageLightbox } from "../components/ImageLightbox";
import { RecordActionsMenu } from "../components/RecordActionsMenu";
import { RecordListSearch } from "../components/RecordListSearch";
import { RecordTableScroll } from "../components/RecordTableScroll";
import { currency } from "../lib/format";
import { appIcons } from "../icons";
import type { Item } from "../types";

type ItemsPageProps = {
  dataError?: string;
  items: Item[];
  token: string;
  onRefresh: () => Promise<void>;
};

const salesAccounts = [
  "discount",
  "general income",
  "interest income",
  "late fee income",
  "other charges",
];
const purchaseAccounts = ["Cost of Goods Sold", "Supplies Expense", "Inventory Asset", "Other Expense"];
const unitOptions = ["box", "cm", "dz", "ft", "g", "in", "kg", "km", "lb", "mg", "ml", "m", "pcs"];

type ItemDraft = {
  name: string;
  imageUrl: string;
  itemType: "goods" | "service";
  unit: string;
  salesEnabled: boolean;
  salesPrice: string;
  salesAccount: string;
  salesTax: string;
  salesDescription: string;
  purchaseEnabled: boolean;
  unitCost: string;
  purchaseAccount: string;
  purchaseTax: string;
  purchaseDescription: string;
};

type ItemMode = "new" | "edit";

const emptyDraft: ItemDraft = {
  name: "",
  imageUrl: "",
  itemType: "goods",
  unit: "",
  salesEnabled: true,
  salesPrice: "",
  salesAccount: "general income",
  salesTax: "",
  salesDescription: "",
  purchaseEnabled: true,
  unitCost: "",
  purchaseAccount: "Cost of Goods Sold",
  purchaseTax: "",
  purchaseDescription: "",
};

const itemDraftKeys = Object.keys(emptyDraft) as Array<keyof ItemDraft>;

const itemToDraft = (item: Item): ItemDraft => ({
  name: item.name,
  imageUrl: item.imageUrl ?? "",
  itemType: item.itemType === "service" ? "service" : "goods",
  unit: item.unit ?? "",
  salesEnabled: item.salesEnabled,
  salesPrice: String(item.salesPrice),
  salesAccount: item.salesAccount,
  salesTax: item.salesTax ?? "",
  salesDescription: item.salesDescription ?? "",
  purchaseEnabled: item.purchaseEnabled,
  unitCost: String(item.unitCost),
  purchaseAccount: item.purchaseAccount,
  purchaseTax: item.purchaseTax ?? "",
  purchaseDescription: item.purchaseDescription ?? "",
});

const draftsMatch = (left: ItemDraft, right: ItemDraft) =>
  itemDraftKeys.every((key) => left[key] === right[key]);

const MAX_ITEM_IMAGE_BYTES = 2 * 1024 * 1024;

const readImageFile = (file: File) => new Promise<string>((resolve, reject) => {
  if (!file.type.startsWith("image/")) {
    reject(new Error("Choose an image file."));
    return;
  }
  if (file.size > MAX_ITEM_IMAGE_BYTES) {
    reject(new Error("Item images must be 2 MB or smaller."));
    return;
  }

  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string"
    ? resolve(reader.result)
    : reject(new Error("Unable to read that image."));
  reader.onerror = () => reject(new Error("Unable to read that image."));
  reader.readAsDataURL(file);
});

export const ItemsPage = ({ dataError, items, token, onRefresh }: ItemsPageProps) => {
  const ImageIcon = appIcons.media.image;
  const [draft, setDraft] = useState<ItemDraft>(emptyDraft);
  const [baseline, setBaseline] = useState<ItemDraft>(emptyDraft);
  const [mode, setMode] = useState<ItemMode>("new");
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const imageDropRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const filteredItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return items;
    return items.filter((item) => [
      item.name,
      item.sku,
      item.itemType,
      item.unit,
      item.description,
      item.salesAccount,
      item.salesTax,
      item.salesDescription,
      item.purchaseAccount,
      item.purchaseTax,
      item.purchaseDescription,
      item.salesEnabled ? "sales" : null,
      item.purchaseEnabled ? "purchase" : null,
      item.salesPrice,
      item.unitCost,
      item.quantity,
      item.inventoryValue,
    ].some((value) => String(value ?? "").toLocaleLowerCase().includes(normalized)));
  }, [items, query]);
  const countLabel = query.trim()
    ? `${filteredItems.length} of ${items.length} items`
    : `${items.length} item${items.length === 1 ? "" : "s"}`;
  const hasUnsavedChanges = mode === "edit"
    ? !draftsMatch(draft, baseline)
    : mode === "new" && !draftsMatch(draft, emptyDraft);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  const set = <Key extends keyof ItemDraft>(field: Key, value: ItemDraft[Key]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const selectImage = async (file?: File) => {
    if (!file) return;
    setMessage("");
    try {
      set("imageUrl", await readImageFile(file));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to read that image.");
    }
  };

  const resetToNew = () => {
    setDraft(emptyDraft);
    setBaseline(emptyDraft);
    setMode("new");
    setSelectedItemId(null);
    setMessage("");
    setOpenDropdown(null);
  };

  const openItem = (item: Item) => {
    if (isSaving || deletingId !== null) return;
    if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) return;

    const itemDraft = itemToDraft(item);
    setSelectedItemId(item.id);
    setDraft(itemDraft);
    setBaseline(itemDraft);
    setMode("edit");
    setMessage("");
    setOpenDropdown(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeItem = () => {
    if (isSaving) return;
    if (hasUnsavedChanges && !window.confirm("Discard unsaved changes?")) return;
    resetToNew();
  };

  const deleteItem = async (item: Item) => {
    const confirmed = window.confirm(`Delete ${item.name}?`);
    if (!confirmed) {
      return;
    }

    setMessage("");
    setDeletingId(item.id);
    try {
      await api.deleteItem(token, item.id);
      if (selectedItemId === item.id) resetToNew();
      await onRefresh();
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : "Unable to delete item.");
    } finally {
      setDeletingId(null);
    }
  };

  const title = mode === "new" ? "New item" : "Item details";

  return (
    <>
      {dataError ? <div className="panel page-alert">{dataError}</div> : null}
      <section className="items-workspace">
        <form
          className="panel item-form compact-item-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (isSaving) return;
            setMessage("");
            const form = event.currentTarget;
            setIsSaving(true);
            try {
              const payload = Object.fromEntries(new FormData(form));
              if (mode === "edit" && selectedItemId) {
                await api.updateItem(token, selectedItemId, payload);
              } else {
                await api.createItem(token, payload);
              }
              await onRefresh();
              form.reset();
              resetToNew();
            } catch (error) {
              setMessage(error instanceof ApiError ? error.message : "Unable to save item.");
            } finally {
              setIsSaving(false);
            }
          }}
        >
          <div className="item-form-head">
            <div>
              <h2>{title}</h2>
              <p>Catalog details</p>
            </div>
            <div className="invoice-form-actions">
              {mode === "edit" ? (
                <>
                  <button className="ghost-button" disabled={isSaving} type="button" onClick={closeItem}>Close</button>
                  <button className="button form-primary-action" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Edit item"}</button>
                </>
              ) : (
                <button className="button form-primary-action" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Save item"}</button>
              )}
            </div>
          </div>

          <div className="item-compact-grid">
            <section className="item-basics">
              <Field label="Name" name="name" placeholder="Premium notebook" required value={draft.name} onChange={(event) => set("name", event.currentTarget.value)} />
              <div className="radio-field">
                <span>Type</span>
                <span className="radio-option">
                  <input aria-label="Goods" checked={draft.itemType === "goods"} type="radio" name="itemType" value="goods" onChange={() => set("itemType", "goods")} />
                  <span className="option-text">Goods</span>
                </span>
                <span className="radio-option">
                  <input aria-label="Service" checked={draft.itemType === "service"} type="radio" name="itemType" value="service" onChange={() => set("itemType", "service")} />
                  <span className="option-text">Service</span>
                </span>
              </div>
              <DropdownField
                name="unit"
                openDropdown={openDropdown}
                options={unitOptions}
                placeholder="Select a unit"
                setOpenDropdown={setOpenDropdown}
                value={draft.unit}
                onChange={(value) => set("unit", value)}
              />
              <div
                className={`image-drop compact-image-drop ${draft.imageUrl ? "has-image" : ""}`}
                ref={imageDropRef}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void selectImage(event.dataTransfer.files[0]);
                }}
              >
                <input
                  id="itemImage"
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Item image"
                  onChange={(event) => {
                    void selectImage(event.currentTarget.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <input type="hidden" name="imageUrl" value={draft.imageUrl} />
                {draft.imageUrl ? (
                  <>
                    <button
                      aria-label="View image"
                      className="item-image-open"
                      type="button"
                      onClick={() => setIsImagePreviewOpen(true)}
                    >
                      <img className="item-image-preview" src={draft.imageUrl} alt={draft.name ? `${draft.name} preview` : "Item image preview"} />
                    </button>
                    <RecordActionsMenu
                      align="right"
                      boundaryRef={imageDropRef}
                      className="item-image-actions"
                      label="Image actions"
                      recordLabel={draft.name || "Item image"}
                      actions={[
                        {
                          label: "View image",
                          icon: appIcons.actions.view,
                          onSelect: () => setIsImagePreviewOpen(true),
                        },
                        {
                          label: "Choose another image",
                          icon: appIcons.media.image,
                          onSelect: () => imageInputRef.current?.click(),
                        },
                        {
                          label: "Remove image",
                          icon: appIcons.actions.remove,
                          tone: "danger",
                          onSelect: () => {
                            if (!window.confirm("Are you sure you want to remove this image?")) return;
                            setIsImagePreviewOpen(false);
                            set("imageUrl", "");
                          },
                        },
                      ]}
                    />
                  </>
                ) : (
                  <label className="item-image-picker" htmlFor="itemImage">
                    <span className="image-glyph" aria-hidden="true">
                      <ImageIcon />
                    </span>
                    <strong>Item image</strong>
                    <span>Drop or browse</span>
                  </label>
                )}
              </div>
            </section>

            <ItemSection
              checked={draft.salesEnabled}
              checkboxName="salesEnabled"
              onCheckedChange={(checked) => set("salesEnabled", checked)}
              title="Sales information"
              variant="sales"
            >
              <MoneyField disabled={!draft.salesEnabled} label="Selling price" name="salesPrice" required={draft.salesEnabled} value={draft.salesPrice} onChange={(value) => set("salesPrice", value)} />
              <DropdownField disabled={!draft.salesEnabled} label="Account" name="salesAccount" openDropdown={openDropdown} options={salesAccounts} required={draft.salesEnabled} setOpenDropdown={setOpenDropdown} value={draft.salesAccount} onChange={(value) => set("salesAccount", value)} />
              <DropdownField disabled={!draft.salesEnabled} label="Tax" name="salesTax" openDropdown={openDropdown} placeholder="Select a tax" options={TAX_OPTIONS} setOpenDropdown={setOpenDropdown} value={draft.salesTax} onChange={(value) => set("salesTax", value)} />
              <div className="field item-description-field">
                <label htmlFor="salesDescription">Description</label>
                <textarea disabled={!draft.salesEnabled} id="salesDescription" name="salesDescription" placeholder="Sales description" value={draft.salesDescription} onChange={(event) => set("salesDescription", event.currentTarget.value)} />
              </div>
            </ItemSection>

            <ItemSection
              checked={draft.purchaseEnabled}
              checkboxName="purchaseEnabled"
              onCheckedChange={(checked) => set("purchaseEnabled", checked)}
              title="Purchase information"
              variant="purchase"
            >
              <MoneyField disabled={!draft.purchaseEnabled} label="Cost price" name="unitCost" required={draft.purchaseEnabled} value={draft.unitCost} onChange={(value) => set("unitCost", value)} />
              <DropdownField disabled={!draft.purchaseEnabled} label="Account" name="purchaseAccount" openDropdown={openDropdown} options={purchaseAccounts} required={draft.purchaseEnabled} setOpenDropdown={setOpenDropdown} value={draft.purchaseAccount} onChange={(value) => set("purchaseAccount", value)} />
              <DropdownField disabled={!draft.purchaseEnabled} label="Tax" name="purchaseTax" openDropdown={openDropdown} placeholder="Select a tax" options={TAX_OPTIONS} setOpenDropdown={setOpenDropdown} value={draft.purchaseTax} onChange={(value) => set("purchaseTax", value)} />
              <div className="field item-description-field">
                <label htmlFor="purchaseDescription">Description</label>
                <textarea disabled={!draft.purchaseEnabled} id="purchaseDescription" name="purchaseDescription" placeholder="Purchase description" value={draft.purchaseDescription} onChange={(event) => set("purchaseDescription", event.currentTarget.value)} />
              </div>
            </ItemSection>
          </div>

          <div className="message">{message}</div>
        </form>

        <div className="panel item-list-panel record-list-panel">
          <div className="item-form-head record-list-head">
            <div>
              <h2>Item list</h2>
              <p>{countLabel}</p>
            </div>
            <RecordListSearch label="Search items" placeholder="Search items by any detail…" value={query} onChange={setQuery} />
          </div>
          <RecordTableScroll columns={5}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Sales</th>
                  <th>Purchase</th>
                  <th className="record-actions-heading">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">{query ? "No items match your search." : "No items yet."}</td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>
                        <br />
                        <span className="muted">{item.unit ?? "No unit"}</span>
                      </td>
                      <td><span className="pill">{item.itemType}</span></td>
                      <td>
                        {item.salesEnabled ? currency.format(item.salesPrice) : "-"}
                        <br />
                        <span className="muted">{item.salesAccount}</span>
                      </td>
                      <td>
                        {item.purchaseEnabled ? currency.format(item.unitCost) : "-"}
                        <br />
                        <span className="muted">{item.purchaseAccount}</span>
                      </td>
                      <td className="record-actions-cell">
                        <RecordActionsMenu
                          recordLabel={item.name}
                          actions={[
                            {
                              label: "View",
                              icon: appIcons.actions.view,
                              disabled: isSaving || deletingId !== null,
                              onSelect: () => openItem(item),
                            },
                            {
                              label: deletingId === item.id ? "Deleting" : "Delete",
                              icon: appIcons.actions.delete,
                              tone: "danger",
                              disabled: deletingId !== null || isSaving,
                              onSelect: () => void deleteItem(item),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </RecordTableScroll>
        </div>
      </section>
      <ImageLightbox
        alt={draft.name || "Item image"}
        isOpen={isImagePreviewOpen}
        src={draft.imageUrl}
        onClose={() => setIsImagePreviewOpen(false)}
      />
    </>
  );
};

type MoneyFieldProps = {
  label: string;
  name: string;
  required?: boolean;
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
};

const MoneyField = ({ label, name, required, disabled, value, onChange }: MoneyFieldProps) => (
  <div className="field money-field">
    <label htmlFor={name}>{label}</label>
    <div>
      <span>USD</span>
      <input disabled={disabled} id={name} name={name} type="number" min="0" step="0.01" required={required} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </div>
  </div>
);

type ItemSectionProps = {
  checked: boolean;
  title: string;
  checkboxName: string;
  onCheckedChange: (checked: boolean) => void;
  variant?: "sales" | "purchase";
  children: ReactNode;
};

const ItemSection = ({ checked, title, checkboxName, onCheckedChange, variant, children }: ItemSectionProps) => (
  <section className={`item-info-section ${variant ? `is-${variant}` : ""} ${checked ? "" : "is-disabled"}`}>
    <div className="check-title">
      <input type="hidden" name={checkboxName} value="false" />
      <input
        aria-label={title}
        checked={checked}
        name={checkboxName}
        onChange={(event) => onCheckedChange(event.currentTarget.checked)}
        type="checkbox"
        value="true"
      />
      <span>{title}</span>
    </div>
    <div className="item-info-fields">{children}</div>
  </section>
);

import { useState } from "react";
import { api, ApiError } from "../api";
import type { Contact, CustomerType, Item } from "../types";
import { Field } from "./Field";
import { ModalLayer } from "./ModalLayer";

export type QuickCreateKind = "customer" | "vendor" | "sales-item" | "purchase-item";

type Props = {
  kind: QuickCreateKind;
  token: string;
  onClose: () => void;
  onCreated: (record: Contact | Item) => void;
};

export const QuickCreateModal = ({ kind, token, onClose, onCreated }: Props) => {
  const isContact = kind === "customer" || kind === "vendor";
  const isCustomer = kind === "customer";
  const isSalesItem = kind === "sales-item";
  const [contactType, setContactType] = useState<CustomerType>("business");
  const [companyName, setCompanyName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [itemName, setItemName] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const contactLabel = isCustomer ? "Customer" : "Vendor";
  const title = isContact ? `New ${contactLabel}` : "New Item";
  const titleId = `quick-create-${kind}-title`;

  return (
    <ModalLayer closeDisabled={isSaving} onClose={onClose}>
      <form
        className="panel payment-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onSubmit={async (event) => {
          event.preventDefault();
          if (isSaving) return;
          setMessage("");
          setIsSaving(true);
          try {
            if (isContact) {
              const typeField = isCustomer ? "customerType" : "vendorType";
              const created = await api.createContact(token, isCustomer ? "customers" : "vendors", {
                [typeField]: contactType,
                ...(contactType === "business" ? { companyName } : { firstName, lastName }),
              });
              onCreated(created);
            } else {
              const created = await api.createItem(token, {
                name: itemName,
                [isSalesItem ? "salesPrice" : "unitCost"]: price,
              });
              onCreated(created);
            }
          } catch (error) {
            setMessage(error instanceof ApiError ? error.message : `Unable to save ${isContact ? contactLabel.toLowerCase() : "item"}.`);
            setIsSaving(false);
          }
        }}
      >
        <div className="item-form-head">
          <div><h2 id={titleId}>{title}</h2><p>{isContact ? `${contactLabel} Details` : "Item Details"}</p></div>
        </div>
        {isContact ? (
          <>
            <div className="radio-field">
              <span>Type</span>
              <label className="radio-option"><input checked={contactType === "business"} type="radio" name="quickContactType" value="business" onChange={() => setContactType("business")} /><span className="option-text">Business</span></label>
              <label className="radio-option"><input checked={contactType === "individual"} type="radio" name="quickContactType" value="individual" onChange={() => setContactType("individual")} /><span className="option-text">Individual</span></label>
            </div>
            {contactType === "business" ? (
              <Field autoComplete="organization" label="Company Name" name={`quick-${kind}-company-name`} required value={companyName} onChange={(event) => setCompanyName(event.currentTarget.value)} />
            ) : (
              <div className="split">
                <Field autoComplete="given-name" label="First Name" name={`quick-${kind}-first-name`} required value={firstName} onChange={(event) => setFirstName(event.currentTarget.value)} />
                <Field autoComplete="family-name" label="Last Name" name={`quick-${kind}-last-name`} required value={lastName} onChange={(event) => setLastName(event.currentTarget.value)} />
              </div>
            )}
          </>
        ) : (
          <>
            <Field label="Name" name={`quick-${kind}-name`} required value={itemName} onChange={(event) => setItemName(event.currentTarget.value)} />
            <Field label={isSalesItem ? "Sales Price" : "Cost Price"} min="0" name={`quick-${kind}-price`} required step="0.01" type="number" value={price} onChange={(event) => setPrice(event.currentTarget.value)} />
          </>
        )}
        <div className="message" role="status">{message}</div>
        <div className="payment-modal-actions">
          <button className="ghost-button" disabled={isSaving} type="button" onClick={onClose}>Cancel</button>
          <button className="button" disabled={isSaving} type="submit">{isSaving ? "Saving..." : isContact ? `Save ${contactLabel}` : "Save Item"}</button>
        </div>
      </form>
    </ModalLayer>
  );
};

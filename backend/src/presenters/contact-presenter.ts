type ContactRecord = {
  id: string;
  displayName: string;
  customerType?: string;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  mobile?: string | null;
  language?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  taxRate?: string | null;
  paymentTerms?: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const presentContact = (contact: ContactRecord) => contact;

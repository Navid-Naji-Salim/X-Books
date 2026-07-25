type ContactRecord = {
  id: string;
  displayName: string;
  customerType?: string;
  vendorType?: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
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

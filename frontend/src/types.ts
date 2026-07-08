export type PageId = "home" | "items" | "sales" | "purchases" | "reports";

export type Admin = {
  id: string;
  email: string;
  name: string;
};

export type Summary = {
  itemCount: number;
  customerCount: number;
  vendorCount: number;
  inventoryValue: number;
  activeItemCount: number;
};

export type Item = {
  id: string;
  name: string;
  sku: string | null;
  itemType: string;
  unit: string | null;
  imageUrl: string | null;
  description: string | null;
  salesEnabled: boolean;
  unitCost: number;
  salesPrice: number;
  salesAccount: string;
  salesTax: string | null;
  salesDescription: string | null;
  purchaseEnabled: boolean;
  purchaseAccount: string;
  purchaseTax: string | null;
  purchaseDescription: string | null;
  preferredVendorId: string | null;
  preferredVendor?: {
    id: string;
    displayName: string;
  } | null;
  quantity: number;
  inventoryValue: number;
};

export type Contact = {
  id: string;
  customerType?: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
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
};

export type InvoiceLine = {
  id: string;
  itemId: string | null;
  itemName: string;
  quantity: number;
  rate: number;
  tax: string | null;
  taxRate: number;
  amount: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer: { id: string; displayName: string };
  invoiceDate: string;
  terms: string;
  dueDate: string;
  status: string;
  customerNotes: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxTotal: number;
  total: number;
  lines: InvoiceLine[];
};

export type Bill = {
  id: string; sequence: number; billNumber: string; vendorId: string;
  vendor: { id: string; displayName: string }; billDate: string; terms: string; dueDate: string;
  status: string; notes: string | null; subtotal: number; discountPercent: number;
  discountAmount: number; taxTotal: number; total: number; lines: InvoiceLine[];
};

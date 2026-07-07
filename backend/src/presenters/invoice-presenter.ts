import type { Prisma } from "../../generated/prisma/client.js";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  invoiceDate: Date;
  terms: string;
  dueDate: Date;
  status: string;
  customerNotes: string | null;
  subtotal: Prisma.Decimal;
  discountPercent: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxTotal: Prisma.Decimal;
  total: Prisma.Decimal;
  customer: { id: string; displayName: string };
  lines: Array<{
    id: string;
    itemId: string | null;
    itemName: string;
    quantity: Prisma.Decimal;
    rate: Prisma.Decimal;
    tax: string | null;
    taxRate: Prisma.Decimal;
    amount: Prisma.Decimal;
  }>;
};

export const presentInvoice = (invoice: InvoiceRecord) => ({
  ...invoice,
  subtotal: Number(invoice.subtotal),
  discountPercent: Number(invoice.discountPercent),
  discountAmount: Number(invoice.discountAmount),
  taxTotal: Number(invoice.taxTotal),
  total: Number(invoice.total),
  lines: invoice.lines.map((line) => ({
    ...line,
    quantity: Number(line.quantity),
    rate: Number(line.rate),
    taxRate: Number(line.taxRate),
    amount: Number(line.amount),
  })),
});

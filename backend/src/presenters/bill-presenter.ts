import type { Prisma } from "../../generated/prisma/client.js";

type BillRecord = {
  id: string; sequence: number; vendorId: string; billDate: Date; terms: string; dueDate: Date;
  status: string; notes: string | null; subtotal: Prisma.Decimal; discountPercent: Prisma.Decimal;
  discountAmount: Prisma.Decimal; taxTotal: Prisma.Decimal; total: Prisma.Decimal;
  vendor: { id: string; displayName: string };
  lines: Array<{ id: string; itemId: string | null; itemName: string; quantity: Prisma.Decimal; rate: Prisma.Decimal; tax: string | null; taxRate: Prisma.Decimal; amount: Prisma.Decimal }>;
};

export const presentBill = (bill: BillRecord) => ({
  ...bill,
  billNumber: `BILL-${String(bill.sequence).padStart(4, "0")}`,
  subtotal: Number(bill.subtotal), discountPercent: Number(bill.discountPercent),
  discountAmount: Number(bill.discountAmount), taxTotal: Number(bill.taxTotal), total: Number(bill.total),
  lines: bill.lines.map((line) => ({ ...line, quantity: Number(line.quantity), rate: Number(line.rate), taxRate: Number(line.taxRate), amount: Number(line.amount) })),
});

export type PaymentStatus = "Unpaid" | "Partially Paid" | "Paid";

export const toCents = (value: unknown) => Math.round(Number(value) * 100);

export const paidAmount = (payments: Array<{ amount: unknown }>) =>
  payments.reduce((sum, payment) => sum + toCents(payment.amount), 0) / 100;

export const remainingAmount = (total: unknown, paid: unknown) =>
  Math.max(0, toCents(total) - toCents(paid)) / 100;

export const paymentStatus = (total: unknown, paid: unknown): PaymentStatus => {
  const paidCents = Math.max(0, toCents(paid));
  if (paidCents === 0) return "Unpaid";
  return paidCents >= toCents(total) ? "Paid" : "Partially Paid";
};

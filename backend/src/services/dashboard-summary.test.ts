import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardSummary, type DashboardBill, type DashboardInvoice } from "./dashboard-summary.js";

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);
const invoice = (id: string, total: number, invoiceDate: string, dueDate: string, status = "Unpaid", paid = 0): DashboardInvoice => ({ id, invoiceNumber: `INV-${id}`, invoiceDate: date(invoiceDate), dueDate: date(dueDate), status, total, payments: paid ? [{ amount: paid }] : [], customer: { displayName: `Customer ${id}` } });
const bill = (sequence: number, total: number, billDate: string, dueDate: string, status = "Unpaid", paid = 0): DashboardBill => ({ id: String(sequence), sequence, billDate: date(billDate), dueDate: date(dueDate), status, total, payments: paid ? [{ amount: paid }] : [], vendor: { displayName: `Vendor ${sequence}` } });

test("all Home accounting concepts remain distinct and complete", () => {
  const result = buildDashboardSummary({
    now: date("2026-07-11"),
    invoices: [invoice("CURRENT", 125, "2026-01-10", "2026-07-11"), invoice("OVERDUE", 75, "2026-02-10", "2026-07-10"), invoice("PAID", 300, "2026-03-10", "2026-03-20", "Paid"), invoice("PRIOR", 900, "2025-12-10", "2026-01-01", "Paid")],
    bills: [bill(1, 40, "2026-04-10", "2026-08-01"), bill(2, 60, "2026-05-10", "2026-06-01"), bill(3, 150, "2026-06-10", "2026-06-20", "Paid"), bill(4, 800, "2025-12-10", "2026-01-01", "Paid")],
    payments: [{ paymentDate: date("2026-03-15"), amount: 275 }, { paymentDate: date("2025-12-31"), amount: 999 }],
    billPayments: [{ paymentDate: date("2026-06-15"), amount: 140 }, { paymentDate: date("2027-01-01"), amount: 999 }],
  });
  assert.deepEqual(result.receivables, { outstanding: 200, current: 125, overdue: 75, entries: [
    { id: "OVERDUE", number: "INV-OVERDUE", name: "Customer OVERDUE", dueDate: date("2026-07-10").toISOString(), amount: 75, overdue: true },
    { id: "CURRENT", number: "INV-CURRENT", name: "Customer CURRENT", dueDate: date("2026-07-11").toISOString(), amount: 125, overdue: false },
  ] });
  assert.equal(result.payables.outstanding, 100);
  assert.equal(result.payables.current, 40);
  assert.equal(result.payables.overdue, 60);
  assert.equal(result.months[2]?.cashReceived, 275);
  assert.equal(result.months[5]?.cashPaid, 140);
  assert.equal(result.months[0]?.income, 125);
  assert.equal(result.months[1]?.income, 75);
  assert.equal(result.months[2]?.income, 300);
  assert.equal(result.months[3]?.expenses, 40);
  assert.equal(result.months[4]?.expenses, 60);
  assert.equal(result.months[5]?.expenses, 150);
  assert.deepEqual(result.activity, { totalIncome: 500, totalExpenses: 250, netActivity: 250 });
});

test("zero values and all twelve chronological months are preserved", () => {
  const result = buildDashboardSummary({ invoices: [], bills: [], payments: [], billPayments: [], now: date("2026-07-11") });
  assert.equal(result.months.length, 12);
  assert.deepEqual(result.months.map((month) => month.month), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]);
  assert.ok(result.months.every((month) => month.cashReceived === 0 && month.cashPaid === 0 && month.income === 0 && month.expenses === 0));
});

test("partially paid documents contribute only their remaining balances", () => {
  const result = buildDashboardSummary({
    now: date("2026-07-11"),
    invoices: [invoice("PARTIAL", 100, "2026-07-01", "2026-07-10", "Partially Paid", 40)],
    bills: [bill(5, 80, "2026-07-01", "2026-08-01", "Partially Paid", 30)],
    payments: [],
    billPayments: [],
  });
  assert.equal(result.receivables.outstanding, 60);
  assert.equal(result.receivables.entries[0]?.amount, 60);
  assert.equal(result.payables.outstanding, 50);
  assert.equal(result.payables.entries[0]?.amount, 50);
});

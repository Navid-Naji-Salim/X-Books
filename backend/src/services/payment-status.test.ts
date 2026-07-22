import assert from "node:assert/strict";
import test from "node:test";
import { paidAmount, paymentStatus, remainingAmount } from "./payment-status.js";

test("payment status follows cumulative payments", () => {
  assert.equal(paidAmount([{ amount: 20 }, { amount: 30 }]), 50);
  assert.equal(paymentStatus(100, 0), "Unpaid");
  assert.equal(paymentStatus(100, 50), "Partially Paid");
  assert.equal(paymentStatus(100, 100), "Paid");
  assert.equal(remainingAmount(100, 50), 50);
});

test("cent rounding avoids floating point status errors", () => {
  assert.equal(paymentStatus(0.3, 0.1 + 0.2), "Paid");
  assert.equal(remainingAmount(10, 12), 0);
});

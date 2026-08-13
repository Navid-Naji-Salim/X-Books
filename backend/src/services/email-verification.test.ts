import assert from "node:assert/strict";
import test from "node:test";
import { createVerificationCode, hashVerificationCode, verificationCodeMatches } from "./email-verification.js";

test("verification codes are six numeric digits", () => {
  assert.match(createVerificationCode(), /^\d{6}$/);
});

test("verification hashes bind a code to one user", () => {
  const hash = hashVerificationCode("user-a", "123456");
  assert.equal(verificationCodeMatches("user-a", "123456", hash), true);
  assert.equal(verificationCodeMatches("user-a", "654321", hash), false);
  assert.equal(verificationCodeMatches("user-b", "123456", hash), false);
  assert.equal(hash.includes("123456"), false);
});

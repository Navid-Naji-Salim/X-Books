import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  isCompromisedPassword,
  passwordFromBody,
  validateNewPassword,
  validatePasswordLength,
} from "./password-policy.js";

test("password length policy accepts 15 through 128 exact characters", () => {
  assert.throws(() => validatePasswordLength("a".repeat(14)), /at least 15/);
  assert.doesNotThrow(() => validatePasswordLength("a".repeat(15)));
  assert.doesNotThrow(() => validatePasswordLength("A".repeat(15)));
  assert.doesNotThrow(() => validatePasswordLength("long phrase with spaces"));
  assert.doesNotThrow(() => validatePasswordLength("!@#$%^&*()_+[]{}"));
  assert.doesNotThrow(() => validatePasswordLength("a".repeat(128)));
  assert.throws(() => validatePasswordLength("a".repeat(129)), /128 characters or fewer/);
});

test("password extraction preserves the exact value", () => {
  const password = "  exact passphrase with spaces  ";
  assert.equal(passwordFromBody({ password }), password);
});

test("compromised-password lookup sends only a five-character hash prefix", async () => {
  const password = "correct horse battery staple";
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  let requestedUrl = "";
  const request = async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return new Response(`${hash.slice(5)}:42\r\n${"0".repeat(35)}:0`);
  };

  assert.equal(await isCompromisedPassword(password, request as typeof fetch), true);
  assert.equal(requestedUrl, `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`);
  assert.equal(requestedUrl.includes(password), false);
  await assert.rejects(
    () => validateNewPassword(password, request as typeof fetch),
    /known to be compromised or excessively common/,
  );
});

test("compromised-password service failures do not block signup", async () => {
  const unavailable = async () => {
    throw new Error("service unavailable");
  };
  await assert.doesNotReject(() =>
    validateNewPassword("a unique long passphrase", unavailable as typeof fetch),
  );
});

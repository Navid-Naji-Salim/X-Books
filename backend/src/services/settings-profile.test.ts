import assert from "node:assert/strict";
import test from "node:test";
import { accountSettingsInput, companySettingsInput, exactRequiredString } from "./settings-profile.js";

test("account settings normalize identity fields and validate email", () => {
  assert.deepEqual(accountSettingsInput({ name: "  Navid Naji  ", email: " NAVID@EXAMPLE.COM " }), {
    name: "Navid Naji",
    email: "navid@example.com",
  });
  assert.throws(() => accountSettingsInput({ name: "Navid", email: "invalid" }), /valid email/);
});

test("company settings preserve a required name and clean optional profile fields", () => {
  assert.deepEqual(companySettingsInput({
    name: "  X Books LLC ",
    businessEmail: " OFFICE@EXAMPLE.COM ",
    phone: " +964 750 000 0000 ",
    addressLine1: " 100 Main Street ",
    addressLine2: "",
    city: " Erbil ",
    state: " Erbil ",
    postalCode: " 44001 ",
    country: " Iraq ",
    taxId: " IQ-123 ",
  }), {
    name: "X Books LLC",
    businessEmail: "office@example.com",
    phone: "+964 750 000 0000",
    addressLine1: "100 Main Street",
    addressLine2: null,
    city: "Erbil",
    state: "Erbil",
    postalCode: "44001",
    country: "Iraq",
    taxId: "IQ-123",
  });
});

test("email-change password confirmation preserves the exact password", () => {
  assert.equal(exactRequiredString({ currentPassword: "  exact password  " }, "currentPassword", "Current password"), "  exact password  ");
});

import assert from "node:assert/strict";
import test from "node:test";
import { parseVendorInput } from "./vendor-input.js";

test("business vendors derive their name and clear individual-only fields", () => {
  const vendor = parseVendorInput({
    vendorType: "business",
    companyName: "  Google ",
    firstName: "Old",
    lastName: "Name",
    paymentTerms: "",
  });

  assert.equal(vendor.displayName, "Google");
  assert.equal(vendor.companyName, "Google");
  assert.equal(vendor.firstName, null);
  assert.equal(vendor.lastName, null);
  assert.equal(vendor.paymentTerms, "Due on Receipt");
});

test("individual vendors derive their name and clear the business-only field", () => {
  const vendor = parseVendorInput({
    vendorType: "individual",
    companyName: "Old Company",
    firstName: "  Dilan ",
    lastName: " Karim  ",
  });

  assert.equal(vendor.displayName, "Dilan Karim");
  assert.equal(vendor.companyName, null);
  assert.equal(vendor.firstName, "Dilan");
  assert.equal(vendor.lastName, "Karim");
});

test("vendor input enforces type-specific required names", () => {
  assert.throws(() => parseVendorInput({ vendorType: "business" }), /Company name is required/);
  assert.throws(() => parseVendorInput({ vendorType: "individual", firstName: "Dilan" }), /First and last name are required/);
  assert.throws(() => parseVendorInput({ vendorType: "unknown", companyName: "Google" }), /Vendor type must be/);
});

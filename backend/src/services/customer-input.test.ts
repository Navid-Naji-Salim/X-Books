import assert from "node:assert/strict";
import test from "node:test";
import { parseCustomerInput } from "./customer-input.js";

test("business customers derive their name and clear individual-only fields", () => {
  const customer = parseCustomerInput({
    customerType: "business",
    companyName: "  Northwind  ",
    firstName: "Old",
    lastName: "Name",
    paymentTerms: "",
  });

  assert.equal(customer.displayName, "Northwind");
  assert.equal(customer.companyName, "Northwind");
  assert.equal(customer.firstName, null);
  assert.equal(customer.lastName, null);
  assert.equal(customer.paymentTerms, "Due on Receipt");
});

test("individual customers derive their name and clear the business-only field", () => {
  const customer = parseCustomerInput({
    customerType: "individual",
    companyName: "Old Company",
    firstName: "  Ada ",
    lastName: " Lovelace  ",
  });

  assert.equal(customer.displayName, "Ada Lovelace");
  assert.equal(customer.companyName, null);
  assert.equal(customer.firstName, "Ada");
  assert.equal(customer.lastName, "Lovelace");
});

test("customer input enforces type-specific required names", () => {
  assert.throws(() => parseCustomerInput({ customerType: "business" }), /Company name is required/);
  assert.throws(() => parseCustomerInput({ customerType: "individual", firstName: "Ada" }), /First and last name are required/);
  assert.throws(() => parseCustomerInput({ customerType: "unknown", companyName: "Northwind" }), /Customer type must be/);
});

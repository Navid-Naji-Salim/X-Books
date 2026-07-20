import { ApiError } from "../utils/api-error.js";
import { optionalString } from "../utils/validation.js";

export const parseCustomerInput = (body: Record<string, unknown>) => {
  const customerType = optionalString(body, "customerType") ?? "business";
  if (customerType !== "business" && customerType !== "individual") {
    throw new ApiError(400, "Customer type must be Business or Individual.");
  }

  const companyName = customerType === "business" ? optionalString(body, "companyName") : null;
  const firstName = customerType === "individual" ? optionalString(body, "firstName") : null;
  const lastName = customerType === "individual" ? optionalString(body, "lastName") : null;
  const displayName = customerType === "business"
    ? companyName
    : [firstName, lastName].filter(Boolean).join(" ");

  if (!displayName || (customerType === "individual" && (!firstName || !lastName))) {
    throw new ApiError(
      400,
      customerType === "business"
        ? "Company name is required."
        : "First and last name are required.",
    );
  }

  return {
    customerType,
    firstName,
    lastName,
    displayName,
    companyName,
    email: optionalString(body, "email"),
    phone: optionalString(body, "phone"),
    addressLine1: optionalString(body, "addressLine1"),
    addressLine2: optionalString(body, "addressLine2"),
    city: optionalString(body, "city"),
    state: optionalString(body, "state"),
    postalCode: optionalString(body, "postalCode"),
    country: optionalString(body, "country"),
    taxRate: optionalString(body, "taxRate"),
    paymentTerms: optionalString(body, "paymentTerms") ?? "Due on Receipt",
    notes: optionalString(body, "notes"),
  };
};

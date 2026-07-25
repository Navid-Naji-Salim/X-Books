import { ApiError } from "../utils/api-error.js";
import { optionalString } from "../utils/validation.js";

export const parseVendorInput = (body: Record<string, unknown>) => {
  const vendorType = optionalString(body, "vendorType") ?? "business";
  if (vendorType !== "business" && vendorType !== "individual") {
    throw new ApiError(400, "Vendor type must be Business or Individual.");
  }

  const companyName = vendorType === "business" ? optionalString(body, "companyName") : null;
  const firstName = vendorType === "individual" ? optionalString(body, "firstName") : null;
  const lastName = vendorType === "individual" ? optionalString(body, "lastName") : null;
  const displayName = vendorType === "business"
    ? companyName
    : [firstName, lastName].filter(Boolean).join(" ");

  if (!displayName || (vendorType === "individual" && (!firstName || !lastName))) {
    throw new ApiError(
      400,
      vendorType === "business"
        ? "Company name is required."
        : "First and last name are required.",
    );
  }

  return {
    vendorType,
    companyName,
    firstName,
    lastName,
    displayName,
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

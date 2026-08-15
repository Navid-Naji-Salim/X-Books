import { ApiError } from "../utils/api-error.js";
import { optionalString, requiredString } from "../utils/validation.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const limitedOptionalString = (
  body: Record<string, unknown>,
  field: string,
  label: string,
  maximumLength: number,
) => {
  const value = optionalString(body, field);
  if (value && value.length > maximumLength) {
    throw new ApiError(400, `${label} must be ${maximumLength} characters or fewer.`);
  }
  return value;
};

export const accountSettingsInput = (body: Record<string, unknown>) => {
  const name = requiredString(body, "name");
  const email = requiredString(body, "email").toLowerCase();
  if (name.length > 100) throw new ApiError(400, "Name must be 100 characters or fewer.");
  if (email.length > 254 || !emailPattern.test(email)) {
    throw new ApiError(400, "Enter a valid email address.");
  }
  return { email, name };
};

export const exactRequiredString = (body: Record<string, unknown>, field: string, label: string) => {
  const value = body[field];
  if (typeof value !== "string" || value.length === 0) {
    throw new ApiError(400, `${label} is required.`);
  }
  return value;
};

export const companySettingsInput = (body: Record<string, unknown>) => {
  const name = requiredString(body, "name");
  if (name.length > 150) throw new ApiError(400, "Company name must be 150 characters or fewer.");

  const businessEmail = limitedOptionalString(body, "businessEmail", "Business email", 254);
  if (businessEmail && !emailPattern.test(businessEmail)) {
    throw new ApiError(400, "Enter a valid business email address.");
  }

  return {
    name,
    businessEmail: businessEmail?.toLowerCase() ?? null,
    phone: limitedOptionalString(body, "phone", "Phone", 40),
    addressLine1: limitedOptionalString(body, "addressLine1", "Business address", 200),
    addressLine2: limitedOptionalString(body, "addressLine2", "Address line 2", 200),
    city: limitedOptionalString(body, "city", "City", 100),
    state: limitedOptionalString(body, "state", "State or province", 100),
    postalCode: limitedOptionalString(body, "postalCode", "Postal code", 30),
    country: limitedOptionalString(body, "country", "Country", 100),
    taxId: limitedOptionalString(body, "taxId", "Tax ID", 80),
  };
};

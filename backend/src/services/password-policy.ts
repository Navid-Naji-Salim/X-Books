import { createHash } from "node:crypto";
import { ApiError } from "../utils/api-error.js";

export const MIN_PASSWORD_LENGTH = 15;
export const MAX_PASSWORD_LENGTH = 128;

const compromisedPasswordMessage =
  "This password is known to be compromised or excessively common. Choose a different password.";

export const passwordFromBody = (body: Record<string, unknown>) => {
  const password = body.password;
  if (typeof password !== "string" || password.length === 0) {
    throw new ApiError(400, "password is required.");
  }

  return password;
};

export const validatePasswordLength = (password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new ApiError(400, `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`);
  }
};

export const isCompromisedPassword = async (
  password: string,
  request: typeof fetch = fetch,
) => {
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  try {
    const response = await request(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        "Add-Padding": "true",
        "User-Agent": "X-Books-Password-Policy",
      },
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) return false;

    const matches = (await response.text()).split(/\r?\n/);
    return matches.some((entry) => {
      const [candidateSuffix, count] = entry.split(":");
      return candidateSuffix === suffix && Number(count) > 0;
    });
  } catch {
    // A third-party outage must not prevent a legitimate account creation.
    return false;
  }
};

export const validateNewPassword = async (
  password: string,
  request: typeof fetch = fetch,
) => {
  validatePasswordLength(password);
  if (await isCompromisedPassword(password, request)) {
    throw new ApiError(400, compromisedPasswordMessage);
  }
};

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

export const verificationCodeLifetimeMs = 10 * 60 * 1000;
export const verificationResendCooldownMs = 60 * 1000;
export const maximumVerificationAttempts = 5;

export const createVerificationCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const hashVerificationCode = (userId: string, code: string) =>
  createHmac("sha256", env.otpSecret).update(`${userId}:${code}`).digest("hex");

export const verificationCodeMatches = (userId: string, code: string, expectedHash: string) => {
  const actual = Buffer.from(hashVerificationCode(userId, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
};

export const sendVerificationEmail = async (recipient: string, code: string) => {
  if (env.emailProvider === "console") {
    console.info(`[X Books email verification] ${recipient}: ${code}`);
    return;
  }

  if (env.emailProvider !== "resend" || !env.resendApiKey) {
    throw new Error("Email delivery is not configured. Set EMAIL_PROVIDER and RESEND_API_KEY.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.emailFrom,
      to: [recipient],
      subject: "Verify your X Books email",
      text: `Your X Books verification code is ${code}. It expires in 10 minutes.`,
    }),
  });

  if (!response.ok) throw new Error("Verification email could not be sent.");
};

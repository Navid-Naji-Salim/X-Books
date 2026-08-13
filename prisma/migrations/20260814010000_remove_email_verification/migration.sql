ALTER TABLE "User"
  DROP COLUMN "emailVerifiedAt",
  DROP COLUMN "verificationCodeHash",
  DROP COLUMN "verificationCodeExpiresAt",
  DROP COLUMN "verificationCodeSentAt",
  DROP COLUMN "verificationAttempts";

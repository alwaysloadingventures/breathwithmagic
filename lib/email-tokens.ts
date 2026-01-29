/**
 * Email Token Utilities
 *
 * Generate and verify secure tokens for email unsubscribe links.
 * Uses HMAC-SHA256 for token generation with timestamp for expiration.
 *
 * Token format: base64url(userId:timestamp:signature)
 * - userId: The user's database ID
 * - timestamp: Unix timestamp (seconds) when token was created
 * - signature: HMAC-SHA256 of userId:timestamp using EMAIL_TOKEN_SECRET
 */

import crypto from "crypto";

const TOKEN_SECRET = process.env.EMAIL_TOKEN_SECRET || process.env.CLERK_SECRET_KEY || "";
const TOKEN_EXPIRY_DAYS = 30; // Tokens expire after 30 days

/**
 * Generate a secure unsubscribe token for a user.
 *
 * @param userId - The user's database ID
 * @returns A base64url-encoded token string
 */
export function generateUnsubscribeToken(userId: string): string {
  if (!TOKEN_SECRET) {
    throw new Error("EMAIL_TOKEN_SECRET or CLERK_SECRET_KEY must be configured");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${userId}:${timestamp}`;

  // Create HMAC signature
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(payload)
    .digest("base64url");

  // Combine payload and signature
  const token = Buffer.from(`${payload}:${signature}`).toString("base64url");

  return token;
}

/**
 * Verify an unsubscribe token and extract the userId.
 *
 * @param token - The base64url-encoded token string
 * @returns The userId if valid, or null if invalid/expired
 */
export function verifyUnsubscribeToken(token: string): string | null {
  if (!TOKEN_SECRET) {
    console.error("EMAIL_TOKEN_SECRET or CLERK_SECRET_KEY must be configured");
    return null;
  }

  try {
    // Decode the token
    const decoded = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      console.warn("Invalid token format: wrong number of parts");
      return null;
    }

    const [userId, timestampStr, providedSignature] = parts;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp)) {
      console.warn("Invalid token format: timestamp is not a number");
      return null;
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    const maxAge = TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
    if (now - timestamp > maxAge) {
      console.warn("Token expired");
      return null;
    }

    // Verify signature
    const payload = `${userId}:${timestamp}`;
    const expectedSignature = crypto
      .createHmac("sha256", TOKEN_SECRET)
      .update(payload)
      .digest("base64url");

    // Use timing-safe comparison to prevent timing attacks
    const providedBuffer = Buffer.from(providedSignature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      console.warn("Invalid token: signature length mismatch");
      return null;
    }

    if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
      console.warn("Invalid token: signature mismatch");
      return null;
    }

    return userId;
  } catch (error) {
    console.error("Error verifying unsubscribe token:", error);
    return null;
  }
}

/**
 * Generate the full unsubscribe URL for a user.
 *
 * @param userId - The user's database ID
 * @param emailType - Optional: specific email type to unsubscribe from
 * @returns The full unsubscribe URL
 */
export function generateUnsubscribeUrl(userId: string, emailType?: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://breathwithmagic.com";
  const token = generateUnsubscribeToken(userId);

  const url = new URL("/unsubscribe", baseUrl);
  url.searchParams.set("token", token);
  if (emailType) {
    url.searchParams.set("type", emailType);
  }

  return url.toString();
}

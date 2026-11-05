import crypto from "crypto";

const TRACKING_SECRET =
  process.env.TRACKING_TOKEN_SECRET || "tethera-order-tracking-secret-key-2026";

/**
 * Generates high-entropy signed token for anonymous guest order tracking.
 * Format: `${orderNumber}.${hmacSignature}`
 */
export function generateGuestTrackingToken(
  orderNumber: string,
  customerEmail: string,
  secretKey?: string
): string {
  const secret = secretKey || TRACKING_SECRET;
  const payload = `${orderNumber.trim().toUpperCase()}:${customerEmail.trim().toLowerCase()}`;
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")
    .slice(0, 32);

  return `${orderNumber.trim().toUpperCase()}.${hmac}`;
}

/**
 * Validates a guest order tracking token against expected order number and customer email.
 */
export function verifyGuestTrackingToken(
  token: string,
  orderNumber: string,
  customerEmail: string,
  secretKey?: string
): boolean {
  if (!token || !orderNumber || !customerEmail) return false;

  const parts = token.trim().split(".");
  if (parts.length !== 2) return false;

  const [tokenOrderNumber, tokenHmac] = parts;
  if (tokenOrderNumber !== orderNumber.trim().toUpperCase()) return false;

  const expectedToken = generateGuestTrackingToken(orderNumber, customerEmail, secretKey);
  const [, expectedHmac] = expectedToken.split(".");

  const bufA = Buffer.from(tokenHmac.toLowerCase());
  const bufB = Buffer.from(expectedHmac.toLowerCase());

  if (bufA.length !== bufB.length) return false;

  return crypto.timingSafeEqual(bufA, bufB);
}

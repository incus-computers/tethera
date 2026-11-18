// Compatibility adapter for explicitly isolated demo tooling only.
import { demoAuth, normaliseIdentifier } from "./demo";
export const otpService = {
  generateOtp(identifier: string, channel: "email" | "phone") {
    return { code: demoAuth().otp(normaliseIdentifier(identifier)), channel, expiresAt: Date.now() + 600000 };
  },
  verifyOtp(identifier: string, code: string) {
    try { demoAuth().verify(normaliseIdentifier(identifier), code); return { success: true }; }
    catch { return { success: false, error: "Invalid or expired code." }; }
  }
};

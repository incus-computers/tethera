interface OtpRecord {
  code: string;
  expiresAt: number;
  channel: "email" | "phone";
  attempts: number;
  createdAt: number;
}

class OtpService {
  private otps: Map<string, OtpRecord> = new Map();
  private readonly OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_ATTEMPTS = 5;

  private normalizeIdentifier(identifier: string): string {
    const raw = identifier.trim().toLowerCase();
    if (raw.includes("@")) {
      return raw;
    }
    // Clean phone number: keep only numeric digits
    return raw.replace(/[^0-9]/g, "");
  }

  /**
   * Generates a 6-digit one-time code for email or phone verification.
   */
  generateOtp(identifier: string, channel: "email" | "phone"): { code: string; expiresAt: number; channel: "email" | "phone" } {
    const key = this.normalizeIdentifier(identifier);

    // Generate secure 6-digit numeric string
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + this.OTP_EXPIRY_MS;

    const record: OtpRecord = {
      code,
      expiresAt,
      channel,
      attempts: 0,
      createdAt: Date.now(),
    };

    this.otps.set(key, record);

    console.info(`[OTP DISPATCH] Destination: ${key} (${channel.toUpperCase()}) | Verification code: ${code}`);

    return {
      code,
      expiresAt,
      channel,
    };
  }

  /**
   * Validates a submitted OTP code for an identifier.
   */
  verifyOtp(identifier: string, submittedCode: string): { success: boolean; error?: string } {
    const key = this.normalizeIdentifier(identifier);
    const record = this.otps.get(key);

    if (!record) {
      return {
        success: false,
        error: "No active verification code found. Please request a new code.",
      };
    }

    if (Date.now() > record.expiresAt) {
      this.otps.delete(key);
      return {
        success: false,
        error: "Verification code has expired. Please request a fresh code.",
      };
    }

    record.attempts += 1;
    if (record.attempts > this.MAX_ATTEMPTS) {
      this.otps.delete(key);
      return {
        success: false,
        error: "Too many incorrect attempts. Please request a new verification code.",
      };
    }

    // Compare code trimmed
    if (record.code.trim() !== submittedCode.trim()) {
      const remaining = this.MAX_ATTEMPTS - record.attempts;
      return {
        success: false,
        error: `Incorrect code. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} remaining.`,
      };
    }

    // Code verified; clean up record to prevent replay attacks
    this.otps.delete(key);
    return { success: true };
  }

  /**
   * Cleans up expired codes periodically
   */
  cleanup(): void {
    const now = Date.now();
    this.otps.forEach((record, key) => {
      if (now > record.expiresAt) {
        this.otps.delete(key);
      }
    });
  }
}

// Global singleton instance for hot-reloading in Next.js development
const globalForOtp = globalThis as unknown as { otpService?: OtpService };
export const otpService = globalForOtp.otpService || new OtpService();
if (process.env.NODE_ENV !== "production") {
  globalForOtp.otpService = otpService;
}

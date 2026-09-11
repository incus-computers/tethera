import "server-only";
import { NextRequest } from "next/server";

export type AdminRole = "admin" | "superadmin";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  clearanceLevel: number; // 1 = Admin, 2 = Superadmin
}

// Configured Administrative Credentials
const ADMIN_ACCOUNTS: (AdminUser & { passwordHash: string })[] = [
  {
    id: "admin-super",
    username: "superadmin",
    email: "superadmin@tethera.com",
    name: "Master Superadmin",
    role: "superadmin",
    clearanceLevel: 2,
    passwordHash: "SuperAdmin2026!",
  },
  {
    id: "admin-ops",
    username: "admin",
    email: "admin@tethera.com",
    name: "Store Operations Admin",
    role: "admin",
    clearanceLevel: 1,
    passwordHash: "AdminPass2026!",
  },
];

export function authenticateAdminCredentials(
  identifier: string,
  passwordAttempt: string
): AdminUser | null {
  const cleanId = identifier.trim().toLowerCase();
  const account = ADMIN_ACCOUNTS.find(
    (acc) =>
      (acc.username.toLowerCase() === cleanId || acc.email.toLowerCase() === cleanId) &&
      acc.passwordHash === passwordAttempt
  );

  if (!account) return null;

  return {
    id: account.id,
    username: account.username,
    email: account.email,
    name: account.name,
    role: account.role,
    clearanceLevel: account.clearanceLevel,
  };
}

/**
 * Validates request authorization header or cookie for admin clearance.
 */
export function verifyAdminClearance(
  req: NextRequest,
  requiredLevel: "admin" | "superadmin" = "admin"
): { authorized: boolean; user?: AdminUser; error?: string } {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-admin-token");
  const cookieVal = req.cookies.get("tethera_admin_token")?.value;
  const token = authHeader?.replace("Bearer ", "") || cookieVal;

  if (!token) {
    return { authorized: false, error: "Administrative clearance required. Please sign in." };
  }

  // Token format: base64(userId:role:clearanceLevel:timestamp)
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, role] = decoded.split(":");

    const user = ADMIN_ACCOUNTS.find((a) => a.id === userId && a.role === role);
    if (!user) {
      return { authorized: false, error: "Invalid admin clearance token." };
    }

    if (requiredLevel === "superadmin" && user.role !== "superadmin") {
      return {
        authorized: false,
        error: "Insufficient privileges. This action requires Superadmin clearance.",
      };
    }

    return {
      authorized: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        clearanceLevel: user.clearanceLevel,
      },
    };
  } catch {
    return { authorized: false, error: "Malformed clearance token." };
  }
}

export function generateAdminClearanceToken(user: AdminUser): string {
  const payload = `${user.id}:${user.role}:${user.clearanceLevel}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

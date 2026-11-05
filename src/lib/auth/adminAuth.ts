import "server-only";
import { NextRequest } from "next/server";

export type AdminRole =
  | "SUPER_ADMIN"
  | "CATALOG_MANAGER"
  | "FULFILLMENT_OPERATOR"
  | "SUPPORT_AGENT"
  | "admin"
  | "superadmin";

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  name: string;
  role: AdminRole;
  clearanceLevel: number; // 1 = Staff/Admin, 2 = Superadmin
}

// Configured Administrative Credentials
const ADMIN_ACCOUNTS: (AdminUser & { passwordHash: string })[] = [
  {
    id: "admin-super",
    username: "superadmin",
    email: "superadmin@tethera.com",
    name: "Master Superadmin",
    role: "SUPER_ADMIN",
    clearanceLevel: 2,
    passwordHash: "SuperAdmin2026!",
  },
  {
    id: "admin-catalog",
    username: "catalog",
    email: "catalog@tethera.com",
    name: "Catalog Lead",
    role: "CATALOG_MANAGER",
    clearanceLevel: 1,
    passwordHash: "Catalog2026!",
  },
  {
    id: "admin-dispatch",
    username: "dispatch",
    email: "dispatch@tethera.com",
    name: "Warehouse Dispatch Lead",
    role: "FULFILLMENT_OPERATOR",
    clearanceLevel: 1,
    passwordHash: "Dispatch2026!",
  },
  {
    id: "admin-support",
    username: "support",
    email: "support@tethera.com",
    name: "Support Representative",
    role: "SUPPORT_AGENT",
    clearanceLevel: 1,
    passwordHash: "Support2026!",
  },
  {
    id: "admin-ops",
    username: "admin",
    email: "admin@tethera.com",
    name: "Store Operations Admin",
    role: "SUPER_ADMIN",
    clearanceLevel: 2,
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
  const authHeader = req.headers.get("authorization");
  const cookieVal = req.cookies.get("tethera_admin_token")?.value;
  const rawToken = authHeader?.replace(/^Bearer\s+/i, "") || cookieVal;
  const token = rawToken ? decodeURIComponent(rawToken.trim().replace(/^"|"$/g, "")) : null;

  if (!token) {
    return { authorized: false, error: "Administrative clearance required. Please sign in." };
  }

  // Support direct demo tokens
  if (token === "superadmin" || token === "admin-super") {
    const user = ADMIN_ACCOUNTS[0];
    return { authorized: true, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, clearanceLevel: user.clearanceLevel } };
  }
  if (token === "catalog" || token === "admin-catalog") {
    if (requiredLevel === "superadmin") {
      return { authorized: false, error: "Insufficient privileges. This action requires Superadmin clearance." };
    }
    const user = ADMIN_ACCOUNTS[1];
    return { authorized: true, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, clearanceLevel: user.clearanceLevel } };
  }
  if (token === "dispatch" || token === "admin-dispatch") {
    if (requiredLevel === "superadmin") {
      return { authorized: false, error: "Insufficient privileges. This action requires Superadmin clearance." };
    }
    const user = ADMIN_ACCOUNTS[2];
    return { authorized: true, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, clearanceLevel: user.clearanceLevel } };
  }
  if (token === "support" || token === "admin-support") {
    if (requiredLevel === "superadmin") {
      return { authorized: false, error: "Insufficient privileges. This action requires Superadmin clearance." };
    }
    const user = ADMIN_ACCOUNTS[3];
    return { authorized: true, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, clearanceLevel: user.clearanceLevel } };
  }
  if (token === "admin" || token === "admin-ops") {
    const user = ADMIN_ACCOUNTS[4];
    return { authorized: true, user: { id: user.id, username: user.username, email: user.email, name: user.name, role: user.role, clearanceLevel: user.clearanceLevel } };
  }

  // Token format: base64(userId:role:clearanceLevel:timestamp)
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, role] = decoded.split(":");

    const user = ADMIN_ACCOUNTS.find((a) => a.id === userId);
    if (!user) {
      return { authorized: false, error: "Invalid admin clearance token." };
    }

    if (requiredLevel === "superadmin" && user.role !== "SUPER_ADMIN") {
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

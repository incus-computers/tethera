import { withApiProtection } from "@/lib/operations/apiProtection";
import { authHandler } from "@/lib/auth/handlers";
export const POST = withApiProtection(authHandler("admin-login"));
export const GET = withApiProtection(authHandler("admin-me"));
export const DELETE = withApiProtection(authHandler("admin-logout"));

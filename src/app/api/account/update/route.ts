import { withApiProtection } from "@/lib/operations/apiProtection";
import { authHandler } from "@/lib/auth/handlers";
export const PUT = withApiProtection(authHandler("update"));

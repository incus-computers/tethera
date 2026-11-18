import { withApiProtection } from "@/lib/operations/apiProtection";
import { withAccess } from "@/lib/auth/routeGuard";
import { checkoutHandler } from "@/lib/checkout/handler";
export const POST = withApiProtection(withAccess(checkoutHandler()));

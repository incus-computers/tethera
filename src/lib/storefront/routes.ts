/** Keep storefront navigation out of the active checkout/payment steps. */
export function isPaymentFlowRoute(pathname: string | null | undefined): boolean {
  return pathname === "/checkout" || pathname === "/checkout/payment" || pathname?.startsWith("/checkout/payment/") === true;
}

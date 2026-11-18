/** Demo is explicit and cannot run in a production Next.js process. */
export function isDemoMode(): boolean {
  if (process.env.APP_ENV !== "demo") return false;
  if (process.env.NODE_ENV === "production") throw new Error("Demo mode requires the local development server.");
  return true;
}

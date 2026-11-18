export class CheckoutError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = "CheckoutError"; }
}

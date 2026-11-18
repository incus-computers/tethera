export class AuthError extends Error {
  constructor(message: string = "Authentication required.", public status = 401) { super(message); }
}

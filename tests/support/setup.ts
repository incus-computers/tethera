import { beforeEach, vi } from "vitest";
// No .env.local, real database, courier or email traffic is permitted in these tests.
process.env.APP_ENV = "demo";
beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("Unexpected external request in isolated test."); }));
});

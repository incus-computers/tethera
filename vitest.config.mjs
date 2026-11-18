import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  envDir: false,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./tests/support/server-only.ts"),
    },
  },
  oxc: {
    jsx: {
      runtime: "automatic",
    },
  },
  test: {
    ...(process.env.VALIDATION_RESULTS_DIR ? {
      reporters: ["default", "junit", "json"],
      outputFile: { junit: path.join(process.env.VALIDATION_RESULTS_DIR, "unit.xml"), json: path.join(process.env.VALIDATION_RESULTS_DIR, "unit.json") },
    } : {}),
    setupFiles: ["./tests/support/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    passWithNoTests: false,
    maxWorkers: 4,
  },
};

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { TEST_AUTH_SECRET, TEST_DATABASE_URL } from "./tests/test-env";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/stubs/server-only.ts") } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.ts"],
    // Integration tests share one test database, so test files run one after another.
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      AUTH_SECRET: TEST_AUTH_SECRET,
      PRIVATE_STORAGE_DIR: ".data/test-private",
      SMS_PROVIDER: "mock",
      PAYMENT_GATEWAY: "mock",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/server/**"],
      exclude: ["src/generated/**", "src/server/actions/**"],
    },
  },
});

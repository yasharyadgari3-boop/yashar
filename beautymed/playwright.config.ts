import { defineConfig } from "@playwright/test";
import { E2E_DATABASE_URL, TEST_AUTH_SECRET } from "./tests/test-env";

const PORT = Number(process.env.E2E_PORT ?? 3100);

/**
 * Every public page is checked at the two widths from the brief: 360px (phones) and 1440px.
 * PW_CHROMIUM_PATH lets an environment point at a pre-installed Chromium.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "fa-IR",
    trace: "off",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile-360", use: { viewport: { width: 360, height: 800 }, hasTouch: true, isMobile: true } },
    { name: "desktop-1440", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    // An up-to-date, emptied and re-seeded end-to-end database, then a production build served locally.
    command: `npx prisma migrate deploy && npx tsx tests/e2e/prepare-db.ts && npx tsx prisma/seed.ts && npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      AUTH_SECRET: TEST_AUTH_SECRET,
      PRIVATE_STORAGE_DIR: ".data/e2e-private",
      SMS_PROVIDER: "mock",
      PAYMENT_GATEWAY: "mock",
      // Mock adapters refuse to run in a production build unless this is set. Tests only.
      ALLOW_MOCKS_IN_PRODUCTION: "true",
      INSECURE_COOKIES: "true",
      APP_URL: `http://127.0.0.1:${PORT}`,
    },
  },
});

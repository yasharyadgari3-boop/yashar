import { defineConfig } from "@playwright/test";

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
  globalSetup: "./tests/e2e/global-setup.ts",
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
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: { NEWSLETTER_FILE: ".data/e2e-newsletter.json", E2E: "1" },
  },
});

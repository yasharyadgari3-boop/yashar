/** Databases used by automated tests. Override with TEST_DATABASE_URL / E2E_DATABASE_URL. */
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://beautymed:beautymed_dev@localhost:5432/beautymed_test";

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://beautymed:beautymed_dev@localhost:5432/beautymed_e2e";

export const TEST_AUTH_SECRET = "test-only-secret-0123456789abcdef0123456789";

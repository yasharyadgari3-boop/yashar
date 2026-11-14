import { execSync } from "node:child_process";
import { TEST_DATABASE_URL } from "./test-env";

/** Bring the test database up to date before the integration tests run. */
export default function globalSetup() {
  execSync("npx prisma migrate deploy", {
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}

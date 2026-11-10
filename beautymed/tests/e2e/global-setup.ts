import { rmSync } from "node:fs";

/** Start each run with an empty mock newsletter file. */
export default function globalSetup() {
  rmSync(".data/e2e-newsletter.json", { force: true });
}

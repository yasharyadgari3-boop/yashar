import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";
import { colors, textPairs } from "@/lib/tokens";

const root = path.resolve(__dirname, "../..");
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return name === "generated" ? [] : sourceFiles(full);
    return /\.(tsx?|css)$/.test(name) ? [full] : [];
  });
}

describe("design tokens", () => {
  it("contrast helper matches known WCAG values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
  });

  it.each(textPairs)("$text on $background meets WCAG AA", ({ text, background, large }) => {
    const ratio = contrastRatio(colors[text], colors[background]);
    expect(ratio).toBeGreaterThanOrEqual(large ? 3 : 4.5);
  });

  it("champagne gold fails even the large-text minimum, so it is never a text color", () => {
    expect(contrastRatio(colors.gold, colors.bg)).toBeLessThan(3);
    const offenders = sourceFiles(path.join(root, "src")).filter((file) =>
      /(?<![\w-])text-gold(?!-deep)/.test(readFileSync(file, "utf8").replace(/<[A-Z]\w*[^>]*aria-hidden="true"[^>]*>/g, "")),
    );
    // `text-gold` is allowed only on decorative icons (aria-hidden), which are stripped above.
    expect(offenders).toEqual([]);
  });

  it("globals.css defines exactly the seven approved colors", () => {
    const declared = [...css.matchAll(/--color-[a-z-]+:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!.toUpperCase()).sort();
    expect(declared).toEqual(Object.values(colors).map((c) => c.toUpperCase()).sort());
  });

  it("no component hard-codes a hex color", () => {
    const offenders = sourceFiles(path.join(root, "src")).filter((file) => {
      if (file.endsWith("globals.css") || file.endsWith(path.join("lib", "tokens.ts"))) return false;
      if (file.endsWith(path.join("app", "layout.tsx"))) return false; // themeColor meta mirrors the bg token
      return /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/.test(readFileSync(file, "utf8"));
    });
    expect(offenders).toEqual([]);
  });

  it("uses only the three approved motion effects", () => {
    const files = sourceFiles(path.join(root, "src"));
    const banned = /\banimate-(spin|ping|pulse|bounce)\b|@keyframes|parallax|marquee/;
    expect(files.filter((f) => banned.test(readFileSync(f, "utf8")))).toEqual([]);
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("avoids banned visual patterns (gradients, backdrop blur, pill buttons)", () => {
    const files = sourceFiles(path.join(root, "src"));
    const banned = /\bbg-gradient|\bbg-linear-|linear-gradient|backdrop-blur|backdrop-filter|rounded-full/;
    expect(files.filter((f) => banned.test(readFileSync(f, "utf8")))).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { checkUpload, detectFileType, MAX_DOCUMENT_BYTES, safeFileName } from "@/lib/upload";
import {
  canAccessTraining,
  canOrder,
  canSeePrices,
  canSubmitProducts,
  canViewDocument,
  dashboardPath,
  isAdmin,
  type Viewer,
} from "@/server/rbac/permissions";
import { generateOtpCode, hashOtp, safeEqualHex, safeNextPath, sha256 } from "@/server/security";

function viewer(overrides: Partial<NonNullable<Viewer>>): NonNullable<Viewer> {
  return {
    id: "u1",
    mobile: "09120000000",
    role: null,
    physicianStatus: null,
    importerStatus: null,
    importerProfileId: null,
    displayName: null,
    ...overrides,
  };
}

const visitor: Viewer = null;
const newUser = viewer({});
const pendingPhysician = viewer({ role: "PHYSICIAN", physicianStatus: "PENDING" });
const rejectedPhysician = viewer({ role: "PHYSICIAN", physicianStatus: "REJECTED" });
const physician = viewer({ role: "PHYSICIAN", physicianStatus: "APPROVED" });
const pendingImporter = viewer({ role: "IMPORTER", importerStatus: "PENDING", importerProfileId: "i1" });
const importer = viewer({ role: "IMPORTER", importerStatus: "APPROVED", importerProfileId: "i1" });
const admin = viewer({ role: "ADMIN" });

describe("role permissions (the table from the approved plan)", () => {
  it("only verified physicians can order", () => {
    expect(canOrder(physician)).toBe(true);
    for (const v of [visitor, newUser, pendingPhysician, rejectedPhysician, pendingImporter, importer, admin]) {
      expect(canOrder(v)).toBe(false);
    }
  });

  it("prices: verified accounts and admins always; everyone else follows the admin setting", () => {
    for (const v of [physician, importer, admin]) expect(canSeePrices(v, false)).toBe(true);
    for (const v of [visitor, newUser, pendingPhysician, rejectedPhysician, pendingImporter]) {
      expect(canSeePrices(v, false)).toBe(false);
      expect(canSeePrices(v, true)).toBe(true);
    }
  });

  it("physician training: verified physicians and admins only", () => {
    expect(canAccessTraining(physician)).toBe(true);
    expect(canAccessTraining(admin)).toBe(true);
    for (const v of [visitor, newUser, pendingPhysician, importer]) expect(canAccessTraining(v)).toBe(false);
  });

  it("product submission: verified importers only", () => {
    expect(canSubmitProducts(importer)).toBe(true);
    for (const v of [visitor, pendingImporter, physician, admin]) expect(canSubmitProducts(v)).toBe(false);
  });

  it("license documents: the owner and admins only", () => {
    expect(canViewDocument(physician, "u1")).toBe(true);
    expect(canViewDocument(admin, "someone-else")).toBe(true);
    expect(canViewDocument(physician, "someone-else")).toBe(false);
    expect(canViewDocument(importer, "someone-else")).toBe(false);
    expect(canViewDocument(visitor, "u1")).toBe(false);
  });

  it("each role lands on its own panel", () => {
    expect(dashboardPath(visitor)).toBe("/login");
    expect(dashboardPath(newUser)).toBe("/onboarding");
    expect(dashboardPath(physician)).toBe("/dashboard/physician");
    expect(dashboardPath(importer)).toBe("/dashboard/importer");
    expect(dashboardPath(admin)).toBe("/dashboard/admin");
    expect(isAdmin(physician)).toBe(false);
  });
});

describe("security helpers", () => {
  it("generates six-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it("binds the code hash to the mobile number and the secret", () => {
    const hash = hashOtp("09121234567", "123456", "secret-a");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashOtp("09121234567", "123456", "secret-a")).toBe(hash);
    expect(hashOtp("09121234568", "123456", "secret-a")).not.toBe(hash);
    expect(hashOtp("09121234567", "123457", "secret-a")).not.toBe(hash);
    expect(hashOtp("09121234567", "123456", "secret-b")).not.toBe(hash);
  });

  it("compares hashes safely", () => {
    expect(safeEqualHex(sha256("a"), sha256("a"))).toBe(true);
    expect(safeEqualHex(sha256("a"), sha256("b"))).toBe(false);
    expect(safeEqualHex("", "")).toBe(false);
    expect(safeEqualHex("abcd", "ab")).toBe(false);
  });

  it("accepts only same-site paths after login", () => {
    expect(safeNextPath("/dashboard", "/x")).toBe("/dashboard");
    for (const bad of ["https://evil.example", "//evil.example", "/\\evil.example", "dashboard", "", null, undefined]) {
      expect(safeNextPath(bad, "/x")).toBe("/x");
    }
  });
});

describe("upload checks", () => {
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

  it("detects the real type from the file's first bytes", () => {
    expect(detectFileType(pdf)?.ext).toBe("pdf");
    expect(detectFileType(png)?.ext).toBe("png");
    expect(detectFileType(jpg)?.ext).toBe("jpg");
    expect(detectFileType(new TextEncoder().encode("<script>alert(1)</script>"))).toBeNull();
  });

  it("rejects empty, oversized and unknown files", () => {
    expect(checkUpload(new Uint8Array()).ok).toBe(false);
    expect(checkUpload(new Uint8Array(MAX_DOCUMENT_BYTES + 1)).ok).toBe(false);
    expect(checkUpload(new TextEncoder().encode("MZ executable")).ok).toBe(false);
    expect(checkUpload(pdf).ok).toBe(true);
  });

  it("can restrict the accepted types", () => {
    expect(checkUpload(pdf, ["jpg", "png"]).ok).toBe(false);
    expect(checkUpload(png, ["jpg", "png"]).ok).toBe(true);
  });

  it("cleans file names", () => {
    expect(safeFileName("../../etc/passwd")).toBe("....etcpasswd");
    expect(safeFileName("")).toBe("file");
    expect(safeFileName("پروانه.pdf")).toBe("پروانه.pdf");
  });
});

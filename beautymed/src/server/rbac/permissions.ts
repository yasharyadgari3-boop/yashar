/**
 * Who may do what. Pure functions over the viewer, so the rules are easy to test and are the
 * single place the role table from the plan lives. Always called on the server.
 */
export type RoleName = "PHYSICIAN" | "IMPORTER" | "ADMIN";
export type VerificationState = "PENDING" | "APPROVED" | "REJECTED";

export type Viewer = {
  id: string;
  mobile: string;
  role: RoleName | null;
  physicianStatus: VerificationState | null;
  importerStatus: VerificationState | null;
  importerProfileId: string | null;
  displayName: string | null;
} | null;

export function isAdmin(viewer: Viewer): boolean {
  return viewer?.role === "ADMIN";
}

export function isVerifiedPhysician(viewer: Viewer): boolean {
  return viewer?.role === "PHYSICIAN" && viewer.physicianStatus === "APPROVED";
}

export function isVerifiedImporter(viewer: Viewer): boolean {
  return viewer?.role === "IMPORTER" && viewer.importerStatus === "APPROVED";
}

/** Only verified physicians can order. */
export function canOrder(viewer: Viewer): boolean {
  return isVerifiedPhysician(viewer);
}

/** Verified accounts and admins always see prices; everyone else follows the admin setting. */
export function canSeePrices(viewer: Viewer, visitorsSeePrices: boolean): boolean {
  return visitorsSeePrices || isAdmin(viewer) || isVerifiedPhysician(viewer) || isVerifiedImporter(viewer);
}

export function canAccessTraining(viewer: Viewer): boolean {
  return isAdmin(viewer) || isVerifiedPhysician(viewer);
}

export function canSubmitProducts(viewer: Viewer): boolean {
  return isVerifiedImporter(viewer);
}

/** License documents: the owner and admins only. */
export function canViewDocument(viewer: Viewer, ownerId: string): boolean {
  return viewer !== null && (isAdmin(viewer) || viewer.id === ownerId);
}

/** Where a signed-in person lands. */
export function dashboardPath(viewer: Viewer): string {
  if (!viewer) return "/login";
  switch (viewer.role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "PHYSICIAN":
      return "/dashboard/physician";
    case "IMPORTER":
      return "/dashboard/importer";
    case null:
      return "/onboarding";
  }
}

import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/server/db";
import { secureCookies } from "@/server/env";
import type { RoleName, Viewer } from "@/server/rbac/permissions";
import { randomToken, sha256 } from "@/server/security";

export const SESSION_COOKIE = "bm_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type CurrentUser = NonNullable<Viewer>;

/** Create a session row (token hash only) and set the HttpOnly cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { tokenHash: sha256(token), userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookies(),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Look a session token up. Exported for tests; pages use getCurrentUser(). */
export async function findUserBySessionToken(token: string, now: Date = new Date()): Promise<Viewer> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          mobile: true,
          role: true,
          deletedAt: true,
          physician: { select: { status: true, fullName: true } },
          importer: { select: { id: true, status: true, companyName: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt <= now || session.user.deletedAt) return null;
  const { user } = session;
  return {
    id: user.id,
    mobile: user.mobile,
    role: user.role,
    physicianStatus: user.physician?.status ?? null,
    importerStatus: user.importer?.status ?? null,
    importerProfileId: user.importer?.id ?? null,
    displayName: user.physician?.fullName ?? user.importer?.companyName ?? null,
  };
}

/** The signed-in user for this request (one database lookup per request), or null. */
export const getCurrentUser = cache(async (): Promise<Viewer> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return findUserBySessionToken(token);
});

/** Redirects to the login page when nobody is signed in. */
export async function requireUser(nextPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return user;
}

/**
 * Requires a role. Someone signed in with a different role gets a 404, so the existence of
 * other roles' pages is not revealed.
 */
export async function requireRole(role: RoleName, nextPath: string): Promise<CurrentUser> {
  const user = await requireUser(nextPath);
  if (user.role !== role) notFound();
  return user;
}

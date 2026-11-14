import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 proxy (formerly middleware). Only an early redirect for people with no session
 * cookie; the real permission checks run on the server in each page and action.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("bm_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*", "/cart/:path*", "/checkout/:path*", "/orders/:path*"],
};

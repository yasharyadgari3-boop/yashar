import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy for every page. Scripts and styles come only from this site.
 * 'unsafe-inline' is needed by Next.js's inline bootstrap scripts (nonces would force every page
 * to render per request); 'unsafe-eval' only in development, for React's debugging tools.
 * When the real payment gateway is chosen, its address is added to form-action.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Browsers ignore HSTS over plain http, so this only takes effect once the site is served over https.
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

/**
 * Uploaded files (license documents, product images) must never run anything, even if someone opens
 * their address directly. Next.js applies the site-wide policy above over whatever a route handler
 * sets (found in the final review: the routes' own sandbox policy never reached the browser), so
 * these two paths get their own stricter policy here. For the same header key the later rule wins.
 */
const uploadHeaders = [{ key: "Content-Security-Policy", value: "default-src 'none'; sandbox" }];

/**
 * Hosts a development proxy serves the site under (GitHub Codespaces: <name>-3000.app.github.dev).
 * Empty everywhere else, so on a normal setup only same-origin requests are accepted.
 */
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  // License documents and product images are uploaded through Server Actions (limit: 5 MB each).
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      ...(allowedDevOrigins.length > 0 ? { allowedOrigins: allowedDevOrigins } : {}),
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/documents/:path*", headers: uploadHeaders },
      { source: "/api/product-images/:path*", headers: uploadHeaders },
    ];
  },
};

export default nextConfig;

# ADR-0003: OTP login with our own sessions (better-auth evaluated and not adopted)

**Date**: 2026-11-09
**Status**: accepted (decided in Phase 2, 2026-11-10)
**Deciders**: owner, Claude

## Context

Login is by one-time password sent by SMS (through a mock adapter for now). Auth.js is built for OAuth and passwords, so it fits phone-only login poorly. The `better-auth` library (v1.7.x) may offer a phone-number OTP plugin that could replace custom code; this has not been verified against its documentation.

## Decision

Plan to implement OTP and signed-cookie sessions ourselves (HttpOnly, SameSite, rotating), with these rules: OTP stored hashed, short expiry, attempt counter, rate limits per phone and per IP, identical responses whether or not the number is registered. In Phase 2, before writing the code, compare `better-auth` against this design using its official docs and choose one.

## Phase 2 evaluation of better-auth

Checked against the published package `better-auth@1.7.18` (its `phone-number` plugin and type definitions), not from memory:
- It does offer phone-number OTP with `sendOTP`, `expiresIn` and `allowedAttempts` options.
- Its user model requires an email, so phone-only sign-up needs `getTempEmail` to invent a placeholder email per user.
- It brings its own tables (user, session, account, verification) next to ours, its own client, and 17 runtime dependencies.
- Our needs are small: one login method, sessions, and roles that live in our own profile tables.

Decision: keep our own implementation (`src/server/auth/otp.ts`, `src/server/auth/session.ts`, about 200 lines, covered by integration tests). Revisit only if more login methods are needed.

## Alternatives Considered

### Alternative 1: Auth.js
- **Pros**: widely used.
- **Cons**: poor fit for SMS-only login.
- **Why not**: extra workarounds.

### Alternative 2: better-auth with phone-number plugin
- **Pros**: less custom security code.
- **Cons**: new dependency; plugin behavior and SMS adapter fit unverified.
- **Why not (yet)**: evaluate in Phase 2.

## Consequences

### Positive
- Security rules are explicit and testable.

### Negative
- More code to own if we build it.

### Risks
- Subtle session or OTP bugs. Mitigation: `security-review` and `tdd-workflow` in Phase 2.

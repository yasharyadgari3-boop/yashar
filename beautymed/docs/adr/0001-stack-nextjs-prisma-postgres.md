# ADR-0001: Next.js + Prisma 7 (stable) + PostgreSQL

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

The brief fixes Next.js (App Router), TypeScript, Tailwind with RTL, PostgreSQL with Prisma, and server-side role-based access control. On 2026-11-09 the `latest` npm tag of `prisma` is an 8.0 release candidate, while `@prisma/client` latest is 7.10.1. The owner asked to stay on stable versions, not rc.

## Decision

Use the stack in the brief. Pin Prisma packages (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) to the stable 7.10.1 line and never follow the `latest` tag of `prisma` while it points to an rc. Pin Next.js 16.4.x, Tailwind 4.3.x, Vitest 5.1.x, Playwright 1.65.x, Zod 4.6.x.

## Alternatives Considered

### Alternative 1: Prisma 8 rc
- **Pros**: newest features.
- **Cons**: pre-release; breaking changes likely.
- **Why not**: owner asked for stable versions only.

### Alternative 2: Drizzle or raw SQL
- **Pros**: lighter runtime.
- **Cons**: leaves the brief's stack; the owner cannot debug it more easily.
- **Why not**: no concrete reason to deviate.

## Consequences

### Positive
- One typed data layer, migrations in version control.

### Negative
- Prisma 7 may require a driver adapter (`@prisma/adapter-pg`) and a `prisma.config.ts`; confirm against official docs in Phase 2.

### Risks
- A later forced upgrade to Prisma 8. Mitigation: revisit when 8.0 is stable.

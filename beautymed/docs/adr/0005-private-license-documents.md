# ADR-0005: Private storage and 404-style access for license documents

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

Medical-council license documents are sensitive and must be visible only to admins and to the person who uploaded them.

## Decision

Store them through the `FileStorage` adapter outside any public path. Serve them only through an authenticated route that checks ownership or admin role and returns short-lived responses. When a user asks for a document or order that is not theirs, answer 404 (not 403), so the existence of the resource is not revealed. Record each admin view in `AuditLog`.

## Alternatives Considered

### Alternative 1: Public bucket with obscure URLs
- **Pros**: simple.
- **Cons**: anyone with a link can read it.
- **Why not**: unacceptable for identity documents.

## Consequences

### Positive
- Minimal exposure; auditable.

### Negative
- Every download goes through the app.

### Risks
- Misconfigured storage path becoming public. Mitigation: test that the file URL is not reachable without a session.

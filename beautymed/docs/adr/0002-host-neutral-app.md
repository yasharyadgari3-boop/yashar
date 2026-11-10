# ADR-0002: Keep the app host-neutral until the owner decides

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

Hosting is not decided. Iranian payment gateways (Shaparak) and the e-Namad badge usually need an Iranian host, while NCBI and translation APIs may be unreachable from one. These forces pull in different directions and the owner has not chosen.

## Decision

No deployment configuration and no host-specific code until the owner decides. Configuration comes only from environment variables; files go through the `FileStorage` adapter; scheduled work sits behind a job interface.

## Alternatives Considered

### Alternative 1: Pick an Iranian host now (Docker on a VPS)
- **Pros**: matches gateway requirements.
- **Cons**: premature; locks files and scripts to one setup.
- **Why not**: owner did not decide.

### Alternative 2: Pick a foreign platform now
- **Pros**: easy deployment.
- **Cons**: likely incompatible with Shaparak gateway and e-Namad.
- **Why not**: same.

## Consequences

### Positive
- The decision can be made later without rework.

### Negative
- The deployment guide (Phase 6) and the job runner choice wait for the host.

### Risks
- A late choice may need adapter changes. Mitigation: adapters isolate every host-dependent piece.

# ADR-0004: External services behind adapters with mock implementations

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

The payment gateway, SMS provider, machine translation, PubMed access and file storage are not chosen or need real credentials. The site must run without them, and secrets must never be in the repository.

## Decision

Each service has a small TypeScript interface (`PaymentGateway`, `SmsProvider`, `TranslationProvider`, `FileStorage`, `PubmedClient`, and in Phase 1 a newsletter storage interface) and a mock implementation used by default and in tests. Real providers are added later by implementing the same interface; credentials live in `.env`.

## Alternatives Considered

### Alternative 1: Call providers directly
- **Pros**: less code.
- **Cons**: site cannot run or be tested without credentials; hard to switch providers.
- **Why not**: owner will fill providers in later.

## Consequences

### Positive
- Everything runs locally; tests are deterministic.

### Negative
- Mocks must stay faithful to real behavior (for example payment callbacks).

### Risks
- A mock hides a real-provider failure mode. Mitigation: contract tests when a real provider is added; payment verification must be idempotent.

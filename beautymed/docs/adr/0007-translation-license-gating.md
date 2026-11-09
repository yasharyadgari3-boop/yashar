# ADR-0007: Full-text translation only for commercially reusable open-access licenses

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

Abstracts and full texts are copyrighted by publishers unless the license says otherwise, and a translation is a derivative work. The platform is commercial.

## Decision

Offer a Persian full-text translation only for articles in the PMC Open Access subset whose stored license allows commercial derivative works (such as CC BY or CC0). All other articles show a Persian summary of the abstract, the link to the source, and a note that the full text is at the source. The license is checked and stored per article. Every translation is labeled machine-generated until an admin marks it physician-reviewed. Article text is treated as data and never as instructions to the translator.

## Alternatives Considered

### Alternative 1: Translate every article's full text
- **Pros**: richer library.
- **Cons**: copyright exposure.
- **Why not**: legal risk on a commercial site.

## Consequences

### Positive
- Clear, defensible rule; translation cost follows actual use (translate on open, then cache).

### Negative
- Fewer full-text translations.

### Risks
- Wrong license parsing. Mitigation: tests with CC BY, CC BY-NC and no-license fixtures in Phase 5; the owner confirms the legal rule with a lawyer.

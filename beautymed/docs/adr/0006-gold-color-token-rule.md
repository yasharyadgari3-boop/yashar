# ADR-0006: Champagne gold is decoration only; gold text uses deep gold

**Date**: 2026-11-09
**Status**: accepted
**Deciders**: owner, Claude

## Context

Champagne gold #C5A46D on white has a contrast ratio of about 2.4:1, below even the 3:1 minimum for large text (WCAG AA). The brief requires AA on every text pair and says to darken the text rather than relax the rule.

## Decision

#C5A46D is used only for non-text decoration (thin rules, borders, icons). All gold text, including large headings and links, uses deep gold #8A6A35 (about 5:1 on white). A script in Phase 1 computes the ratio of every text/background token pair and fails the build if any pair is below its threshold.

## Alternatives Considered

### Alternative 1: Champagne gold for large headings
- **Pros**: lighter, more luxurious look.
- **Cons**: fails the 3:1 minimum.
- **Why not**: unreadable on phones in daylight.

## Consequences

### Positive
- Accessible by construction; a test guards against regressions.

### Negative
- Gold headings are slightly darker than a pure champagne tone.

### Risks
- #F6F5F2 section background may look yellowish; owner will say so after seeing it.

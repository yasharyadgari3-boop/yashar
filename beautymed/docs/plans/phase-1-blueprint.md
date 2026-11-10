# Blueprint: Phase 1 — design system and public site

**Objective:** BeautyMed design tokens, components, header, footer, homepage (11 sections) and content hubs with placeholder content. Every public page works at 360px and 1440px and passes an automated accessibility check.

**Mode:** direct (no per-step branches or pull requests). All steps happen on the working branch. Git happens once, in the end-of-phase sequence, after owner approval.

**Status:** DRAFT, waits for owner approval together with the Phase 1 plan.

## Invariants (verified after every step)
1. `npm run lint`, `npm run typecheck`, `npm test` pass; from step 1 on, `npm run build` passes.
2. Only the 7 approved color tokens exist as CSS variables. No hard-coded hex values in components.
3. No gold text except `#8A6A35`; `#C5A46D` only on rules, borders, icons.
4. All text is RTL Persian; displayed numbers use Persian digits; Latin brand/drug names stay Latin.
5. No invented medical content, prices, IRC codes, reviews. Placeholders say «محتوای نمونه — جایگزین شود».
6. No file outside `beautymed/` changed (except `CLAUDE.md` when the owner approves).
7. No `.env` or secret committed.

## Dependency graph
```
1 scaffold ─┬─> 2 tokens+fonts ─┬─> 4 primitives ─┬─> 6 layout ─┬─> 7 hero ─┐
            │                   │                 │             │           ├─> 8 homepage ─┐
            └─> 3 formatters ───┘                 └─> 5 motion ─┘           │               ├─> 10 quality ─> 11 close
                                                                  9 hubs & pages ───────────┘
```
Parallel after step 6: **7**, **8a/8b/8c/8d** and **9** touch different files and may run together.

## Steps

### 1. Scaffold the app
- **Context:** empty `beautymed/` (docs only).
- **Do:** create Next.js 16.4.x (App Router, TypeScript, `src/`), Tailwind 4.3.x, ESLint, Vitest 5.1.x + Testing Library, Playwright 1.65.x + `@axe-core/playwright`; scripts `dev`, `build`, `lint`, `typecheck`, `test`, `e2e`; folders from the approved plan; `.env.example` (empty, Persian comment); `.gitignore` (includes `.env`, `.next`).
- **Verify:** `npm run dev` serves a blank RTL page (`<html lang="fa" dir="rtl">`); build passes.
- **Exit:** blank app runs; versions pinned (no rc).
- **Rollback:** delete the generated files inside `beautymed/` (not docs).
- **Model tier:** default.

### 2. Design tokens and fonts
- **Do:** 7 CSS variables; Tailwind theme mapped to them; `@fontsource/vazirmatn` loaded through a single font token; one high-contrast serif for Latin names and heading numerals; BeautyMed text wordmark; radius 0–4px; hover-only soft shadow token.
- **Verify:** `tests/unit/contrast.test.ts` computes the ratio of every text/background pair and asserts body ≥ 4.5, large ≥ 3.
- **Exit:** a token page shows palette and type scale; contrast test green.
- **Depends on:** 1.

### 3. Formatting helpers
- **Do:** Persian digits, Toman price, Jalali date via `Intl` (`fa-IR-u-ca-persian`), no date library; unit tests (`۱۸ آبان ۱۴۰۵`, `۱٬۲۳۴٬۵۶۷`).
- **Exit:** tests green. **Depends on:** 1. **Parallel with:** 2.

### 4. UI primitives
- **Do:** Button (primary/secondary, no gold fill), Link, Container, Section (white / alternate), Heading, labels («ترجمه‌ی ماشینی»، «بازبینی‌شده»، قفل)، SampleNotice («محتوای نمونه — جایگزین شود»)، ImageSlot (brief, aspect ratio, Persian alt), Field, Accordion (keyboard accessible), touch targets ≥ 44px.
- **Verify:** component tests (render, keyboard, ARIA).
- **Depends on:** 2, 3.

### 5. Motion
- **Do:** only fade-up reveal, slow image reveal, card image zoom; all disabled under `prefers-reduced-motion`.
- **Verify:** test that reduced-motion removes animations; grep that no other animation utilities exist.
- **Depends on:** 4.

### 6. Layout: header and footer
- **Do:** header transparent over hero and solid white after scroll; desktop horizontal nav, tablet condensed, mobile hamburger; footer with hub links, contact placeholders, social placeholders, e-Namad slot, copyright line.
- **Verify:** component tests; Playwright smoke at 360 and 1440 later in step 10.
- **Depends on:** 4, 5.

### 7. Hero
- **Do:** full-bleed, `100dvh`, subtle dark overlay; video only on desktop without Save-Data and without reduced-motion; otherwise poster; headline, supporting line, two buttons, search field (visual only) with the exact Persian copy; video and poster are placeholder slots with written briefs.
- **Verify:** unit test of the "show video?" decision; no horizontal scroll at 360px.
- **Depends on:** 6.

### 8. Homepage sections 2–10 (four parallel groups)
- **8a:** Methods (2), Products (3), PRP/PRF split (4).
- **8b:** Physician training with locked state (5), Research library with 3 placeholder articles (6).
- **8c:** Trust (7; only real features, no statistics), For importers (8; no logo row).
- **8d:** Newsletter (9) with email/phone + explicit consent + validation and a `NewsletterStore` interface with a file-backed mock; FAQ accordion with 5 questions and placeholder answers (10).
- **Verify:** tests per group; the exact copy strings from the brief appear.
- **Depends on:** 6.

### 9. Content hubs and public pages
- **Do:** shared hub template with sub-navigation and a "reviewed by" notice; hubs: aesthetic methods, filler types, mesotherapy, PRP, PRF, physician training (public landing), PubMed library (placeholder list); pages: store landing (categories + verified-physician note), about, contact, rules, and a placeholder login page («ورود در فاز ۲ فعال می‌شود»).
- **Depends on:** 6. **Parallel with:** 7, 8.

### 10. Quality gate
- **Do:** Playwright at 360×800 and 1440×900 on every public route; axe check with zero serious/critical violations; assertion of no horizontal scroll; touch-target check; reduced-motion check.
- **Fix** findings, then re-run.
- **Depends on:** 7, 8, 9.

### 11. Close the phase
- **Do:** ECC end-of-phase skills (`code-review`/`react-review`, `verification-loop`, `quality-gate`, `test-coverage`; `build-fix` if needed); update `PROGRESS.md` and `ECC_LOG.md`; Persian report to the owner.
- **Then:** only after owner approval, the end-of-phase git sequence.

## Review (self-check against the blueprint checklist)
- Cold-start: every step names its inputs, outputs, verification and exit. ✔
- Dependencies: no cycle; parallel steps touch different files. ✔
- Brief conflicts: motion limited to three; no gold fill; no new sections. ✔
- Adapted from the skill: no per-step branch/PR; no strongest-model sub-agent review (orchestration needs listing in the approved phase plan). If the owner wants it, add it to the Phase 1 plan.
- Open risks: no real hero video or images yet (placeholders only); Context7 unavailable for docs lookup, so official docs are read from the web; PostgreSQL not needed in Phase 1.

## Plan mutation log
(empty)

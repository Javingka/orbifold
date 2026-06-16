<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 11 Handoff — App internationalization (ES / EN / PT / ZH)

---

## Step 11.1 — Inventory + string catalog

**Date:** 2026-06-16
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

Performed full required reading (CLAUDE.md, decisions.md, phase-11.md, ADR 0004, Phase 10 handoff, all source files named in the step PROMPT), then produced `docs/orbifold-v2/inventories/phase-11-inventory.md` covering all six sections (a)–(f):

**(a) Marketing contract** — exact `LS_KEY = 'orbifold.lang'`, four codes and native labels (`es`/Español, `en`/English, `pt`/Português, `zh`/中文), the precise resolution order (`?lang=` → `localStorage['orbifold.lang']` → `navigator.language` with `zh` prefix special case → `'es'`), the `LANGS` array literal, write-back semantics, and a note that the marketing `rich()` token-array mechanism is a React rendering construct not carried into the Svelte app dictionaries.

**(b) String catalog** — full table of every user-facing string across all 14 source files, with source file, line reference, current Spanish text, proposed key (OQ-3 nested-by-component), and category (SL/OL/TT/PH/DI/AP/AC/EL). Technical tokens flagged [VERBATIM] per OQ-6. Interpolated strings identified with [INTERP]. Running total: **161 distinct translatable strings** (after deduplication of shared keys). Wave allocation (A/B) documented for steps 11.4–11.5.

**(c) Store integration point** — current bootstrap path (`src/main.ts` → `App.svelte` → `session.ts`), where `lang` store and `t` accessor hook in consistent with ADR 0004 (new `src/i18n/` layer, Svelte `writable` store, pure helpers in `src/i18n/runtime.ts`). Header selector placement per OQ-5.

**(d) Schema isolation confirmation** — confirmed `orbifold.lang` / language is absent from `SavedSessionSchema` in `src/lib/persistence.ts` and `AgentOutputSchema` in `src/agent/schema.ts`. Both schemas confirmed correct as-is; no changes needed to keep language out.

**(e) Agent-language surface** — documented `SYSTEM_PROMPT` (lines 75–119 of `agent.ts`, Spanish, stays Spanish per OQ-1), the `send()` call chain, the `buildContextAddendum()` injection point for the OQ-1 language directive, the `requestAutofix()` path, and the two injection points step 11.5 will apply. Surfaced a sub-question: whether `setNowPlaying()` in `session.ts` should store a key or a translated label. Flagged for ADR 0017 step 11.2 to resolve.

**(f) Quality baseline** — recorded:
- `pnpm exec vitest run` → **450 passed, 0 failed** (14 test files)
- `pnpm exec tsc --noEmit` → **exit 0, 0 errors**
- `pnpm lint` → **exit 0, 0 ESLint errors, 0 Prettier issues**
- `pnpm build` → **exit 0** (pre-existing chunk-size warning only)

### Files touched

- `docs/orbifold-v2/inventories/phase-11-inventory.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-11-handoff.md` — new file (this handoff)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly verified by this step (inventory step — no source code changes). The inventory records the data that downstream steps 11.2–11.7 use to satisfy A-11-01 through A-11-13.

### Routine validations (one-liner each, no transcripts)

No source files modified. Quality gates unchanged from baseline:
- `pnpm exec vitest run` → 450 passed, 0 failed
- `pnpm exec tsc --noEmit` → exit 0
- `pnpm lint` → exit 0
- `pnpm build` → exit 0

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-11-01 | Language carried from marketing: app starts in language chosen on landing/tutorial | — | manual | not covered — deferred to step 11.3+ |
| A-11-02 | In-app selector switches all text live and writes to `orbifold.lang` | — | manual | not covered — deferred to step 11.3 |
| A-11-03 | Resolution chain matches marketing exactly | — | unit + manual | not covered — deferred to step 11.3 |
| A-11-04 | Full coverage: every catalogued string routed through dictionary | — | manual + proxy | not covered — deferred to steps 11.4–11.5 |
| A-11-05 | Fallback: missing key renders `es` base text, never raw key or blank | — | unit | not covered — deferred to step 11.3 |
| A-11-06 | Interpolation: dynamic strings render correctly in every language | — | unit + manual | not covered — deferred to step 11.3 |
| A-11-07 | Four languages selectable, full UI with no Spanish leakage | — | manual | not covered — deferred to step 11.6 |
| A-11-08 | Agent replies in user's language; code/JSON contract unchanged | — | manual | not covered — deferred to step 11.5 |
| A-11-09 | Adding a new language = one dictionary; key-parity test fails build if missing/extra | — | unit | not covered — deferred to step 11.3 |
| A-11-10 | i18n runtime testable: resolution, fallback, interpolation pure/unit-tested | — | automated | not covered — deferred to step 11.3 |
| A-11-11 | Schema isolation: language absent from `SavedSchema` and agent schemas | — | automated (proxy: grep) | **PROXY-COVERED** — confirmed by direct inspection of `src/lib/persistence.ts` and `src/agent/schema.ts` in this step; grepped for "lang" in both files, confirmed 0 matches in schema definitions |
| A-11-12 | Quality gates green: tsc 0 errors, lint 0 errors, vitest ≥ baseline, build exit 0 | — | automated | **BASELINE RECORDED** — 450/450, 0 tsc, 0 lint, build exit 0 |
| A-11-13 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — both new docs files have AGPL header |

**Notes on partial coverage:** This step is inventory-only (no source code changes). A-11-11 is the schema-isolation check — confirmed negative (language absent) by direct code inspection, which is the full verification needed. A-11-12 baseline is recorded, not just "gates green at this step."

**Proxy disclosures:**
- A-11-11: `grep -n "lang" src/lib/persistence.ts src/agent/schema.ts` → 0 matches in schema field definitions (only in comments referencing `orbifold.lang` as a cross-surface key in the Decisions Register; no schema field named `lang`).
- A-11-13: `head -2` of both new files → `<!-- SPDX-License-Identifier: AGPL-3.0-only -->`.

### Decisions made (if any)

No new decisions introduced. The inventory faithfully reflects the six Pilot-resolved OQs and the existing Decisions Register entry for `orbifold.lang`. One sub-question surfaced (nowPlaying label i18n injection point in `session.ts`) and flagged for ADR 0017 resolution — not a decision by the Dev.

### Proposed Decisions Register entries (if any)

None. The `orbifold.lang` cross-surface contract is already in the Decisions Register (Phase 11, 2026-06-16). No new entries proposed.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Source code unmodified. Inventory and handoff committed. Phase 11 initiated.
- Branch: `orbifold-v2/phase-11` (to be cut at commit `068817e`).
- Quality gate baseline: 450 passed, 0 tsc errors, 0 lint errors, build clean.

### Next-step context (only if non-obvious)

Step 11.2 writes ADR 0017 (i18n architecture). The ADR author should resolve the nowPlaying label injection point (flagged in inventory §e) as D7 or an addendum to D1. The key catalog in the inventory §b is the authoritative list — the ADR should not recount strings but reference the inventory.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(orbifold-v2): Phase 11 step 11.1 — i18n inventory and string catalog`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 11.2 — ADR 0017 (i18n architecture)

**Date:** 2026-06-16
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed

Performed required reading (CLAUDE.md, methodology, dev-role, decisions.md, phase-11.md, phase-11-inventory.md, ADR 0004, phase-11-handoff.md step 11.1). Wrote `docs/adr/0017-i18n-architecture.md` recording eight decisions:

- **D1 — Language store and `$t` access API:** `lang` Svelte `writable` store of type `LangCode` in `src/i18n/index.ts`; a `t` Svelte `derived` store returning `TFunction`; components use `$t('key')` auto-subscription. Pure helpers (resolution, fallback, interpolation) live in `src/i18n/runtime.ts` with no DOM/Svelte dependency, importable by Vitest. Consistent with ADR 0004.

- **D2 — Dictionary format, location, and key convention:** Typed TypeScript modules (`satisfies Dictionary`) under `src/i18n/locales/{es,en,pt,zh}.ts`. Nested-by-component keys (`header.tagline`, `transport.rhythmPlay`, etc.) plus `common.*`. `es` is the canonical base; the `Dictionary` type is derived from its structure. Key-parity test fails build on any mismatch. Dictionary values are plain strings (no HTML, no `rich()` token arrays).

- **D3 — Language resolution chain and `orbifold.lang` contract:** Resolution chain mirrors `landing.html` `pickLang` exactly: `?lang=` → `localStorage['orbifold.lang']` → `navigator.language` (with `zh`-prefix special case) → `'es'`. Write-back on change via store subscriber. Key string `orbifold.lang`, codes, and native labels must match marketing exactly.

- **D4 — Fallback semantics:** Missing key in active dictionary → fall back to `es` base value; never a raw key or blank. Key-parity test enforces completeness, making the fallback a development-only safety net.

- **D5 — Interpolation mechanism and untranslatable-token boundary:** `{varName}` named placeholders; plural forms use two-key approach (no plural-rule library). Comprehensive verbatim token list (Strudel code, sample codes, `E(k,n)`, note literals, `P·L·R`, brand/proper nouns).

- **D6 — Schema isolation:** Language is UI-only ephemeral state in `localStorage['orbifold.lang']`; absent from `SessionState`, all persistence schemas (`SavedSessionSchema`, `SavedHarmonySchema`, etc.), and all agent schemas (`AgentOutputSchema`, etc.). Saved-session bytes unchanged by language.

- **D7 — Agent conversational language (OQ-1 = A):** Single Spanish `SYSTEM_PROMPT` unchanged. Dynamic language directive appended in `buildContextAddendum()` and `requestAutofix()`. `LANGUAGE_NAMES` constant maps `LangCode` → human name for the directive. `t_raw()` helper for one-shot store reads outside Svelte components. Agent JSON/Strudel output contract unchanged.

- **D8 — `setNowPlaying()` stores a translation key (OQ-7, Checkpoint #1):** `setNowPlaying()` stores the dictionary key (e.g., `'session.playing.rhythm'`) and optional `vars` for interpolation. `Transport.svelte` resolves via `$t` at render time. Switching language while playing updates the indicator live. `session.ts` does NOT import from `src/i18n/` — direction is `state/ produces key → ui/ resolves via $t`.

### Files touched

- `docs/adr/0017-i18n-architecture.md` — new file (created)
- `docs/orbifold-v2/handoffs/phase-11-handoff.md` — appended this step entry

### Validation evidence (per Acceptance ID)

This step writes the architecture document only; no source code changes. The ADR establishes the binding decisions that steps 11.3–11.7 implement. ADR-only steps do not directly satisfy runtime Acceptance IDs.

### Routine validations (one-liner each, no transcripts)

No source files modified. Quality gates unchanged from step 11.1 baseline:
- `pnpm exec vitest run` → 450 passed, 0 failed (unchanged)
- `pnpm exec tsc --noEmit` → exit 0 (unchanged)
- `pnpm lint` → exit 0 (unchanged)
- `pnpm build` → exit 0 (unchanged)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-11-01 | Language carried from marketing: app starts in language chosen on landing/tutorial | — | manual | not covered — deferred to step 11.3 |
| A-11-02 | In-app selector switches all text live and writes to `orbifold.lang` | — | manual | not covered — deferred to step 11.3 |
| A-11-03 | Resolution chain matches marketing exactly | — | unit + manual | not covered — deferred to step 11.3 |
| A-11-04 | Full coverage: every catalogued string routed through dictionary | — | manual + proxy | not covered — deferred to steps 11.4–11.5 |
| A-11-05 | Fallback: missing key renders `es` base text, never raw key or blank | — | unit | not covered — deferred to step 11.3 |
| A-11-06 | Interpolation: dynamic strings render correctly in every language | — | unit + manual | not covered — deferred to step 11.3 |
| A-11-07 | Four languages selectable, full UI with no Spanish leakage | — | manual | not covered — deferred to step 11.6 |
| A-11-08 | Agent replies in user's language; code/JSON contract unchanged | — | manual | not covered — deferred to step 11.5 |
| A-11-09 | Adding a new language = one dictionary; key-parity test fails build if missing/extra | — | unit | not covered — deferred to step 11.3 |
| A-11-10 | i18n runtime testable: resolution, fallback, interpolation pure/unit-tested | — | automated | not covered — deferred to step 11.3 |
| A-11-11 | Schema isolation: language absent from `SavedSchema` and agent schemas | — | automated (proxy: grep) | **COVERED** — confirmed in step 11.1; D6 in ADR 0017 codifies the constraint |
| A-11-12 | Quality gates green: tsc 0 errors, lint 0 errors, vitest ≥ baseline, build exit 0 | — | automated | **BASELINE HELD** — 450/450, 0 tsc, 0 lint, build exit 0 (no source changes this step) |
| A-11-13 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED for this step** — `docs/adr/0017-i18n-architecture.md` begins with `<!-- SPDX-License-Identifier: AGPL-3.0-only -->` |

**Notes on partial coverage:** This is an ADR-only step; no source code is changed. Runtime Acceptance IDs (A-11-01 through A-11-10) remain deferred to implementation steps 11.3–11.6. A-11-11 was proxy-covered in step 11.1 and is codified structurally by ADR 0017 D6. A-11-13 applies to the one new documentation file created.

**Proxy disclosures:**
- A-11-13: `head -2 docs/adr/0017-i18n-architecture.md` → `<!-- SPDX-License-Identifier: AGPL-3.0-only -->`

### Decisions made (if any)

- Resolved OQ-7 (nowPlaying i18n injection point) as D8: `setNowPlaying()` stores a translation key, `Transport.svelte` resolves via `$t`. Direction: `state/` produces keys, `ui/` resolves. No `state/ → i18n/` import dependency.

### Proposed Decisions Register entries (if any)

None beyond what is already in the Decisions Register. ADR 0017 D3 reaffirms the `orbifold.lang` cross-surface contract already recorded at Phase 11 scoping.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Source code unmodified. ADR 0017 committed. Phase 11 architecture decisions are fully specified.
- Branch: `orbifold-v2/phase-11`
- Quality gate baseline: 450 passed, 0 tsc errors, 0 lint errors, build clean.

### Next-step context (only if non-obvious)

Step 11.3 implements the i18n runtime per ADR 0017 D1–D5, adds the header selector (D3 write-back), and writes the key-parity test (D4). The `es` base dictionary in step 11.3 is seeded only with keys needed for the selector itself; full string extraction follows in steps 11.4–11.5.

D8 note for step 11.5: `setNowPlaying()` must be extended with an optional `vars: Record<string, string | number>` parameter, and `NowPlaying` in `SessionState` needs a `vars` field so `Transport.svelte` can pass them to `$t`. Step 11.5 handles this along with the other session.ts nowPlaying label sites.

**This step ends at mandatory Pilot Checkpoint #2 (ADR review).** Step 11.3 does not begin until the Pilot approves ADR 0017.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `docs(adr): Phase 11 step 11.2 — ADR 0017 i18n architecture`
- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

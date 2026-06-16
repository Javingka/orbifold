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

---

## Step 11.3 — i18n runtime + header selector + tests

**Date:** 2026-06-16
**Commit(s):** `bbdf694` feat(i18n): Phase 11 step 11.3 — i18n runtime, header selector, tests
**Iteration:** 1 of 5

### Completed

Implemented the i18n foundation per ADR 0017 D1–D5:

**(a) `src/i18n/` runtime layer:**
- `src/i18n/types.ts` — `Dictionary` interface (step 11.3 seed: `common.langLabel` + `langs.{es,en,pt,zh}`). Grows in steps 11.4–11.5.
- `src/i18n/runtime.ts` — Pure helpers with zero DOM/Svelte dependency: `resolveLang()` (D3 resolution chain, injectable deps for testability), `getAtPath()` (dot-path navigation), `lookup()` (D4 fallback: active → es → raw key), `interpolate()` (D5 `{varName}` substitution, unmatched left as-is), `makeTFunction()` (closure factory for derived store). `LangCode` and `Locales` types exported.
- `src/i18n/index.ts` — Svelte store layer: `lang` writable store initialized via `resolveInitialLang()` (browser globals only, Node/Vitest guard), write-back subscriber writing to `localStorage['orbifold.lang']` on every change, `t` derived store returning `TFunction`, `t_raw` for non-component callers (D7), `LANGS` constant matching marketing `public/landing.html` lines 302–307 exactly.

**(b) Write-back (D3):** `lang.subscribe()` calls `localStorage.setItem('orbifold.lang', code)` on every change. Mirrors `landing.html` line 664.

**(c) Header language selector (OQ-5):** `src/ui/Header.svelte` updated with:
- Import of `lang`, `LANGS`, `LangCode` from `../i18n/index.js`
- Local state: `langMenuOpen`, handlers `handleLangSelect`, `handleLangToggle`, `handleLangBlur`
- Template: `.lang-sel` container with `文A` toggle button (Unicode: 文 U+6587 + A) + `{#if langMenuOpen}` dropdown `<ul role="listbox">` listing four native labels (`Español / English / Português / 中文`). Active language highlighted with `.active` class.
- Placed between `.sp` spacer and the Tutorial link — always visible in the header.
- CSS: `.lang-sel`, `.lang-btn`, `.lang-menu`, `.lang-option`, `.lang-option.active` styles added in `<style>` block.

**(d) Stub locale files:** `src/i18n/locales/es.ts`, `en.ts`, `pt.ts`, `zh.ts` — all four implement `Dictionary` (via plain assignment, TypeScript structural check). Seeded with selector keys only (`common.langLabel`, `langs.*`). Key-parity test passes immediately.

**(e) Unit tests in `tests/i18n/`:**
- `tests/i18n/runtime.test.ts` — 45 tests covering: resolution chain (every branch: URL param, localStorage, navigator.language, zh-prefix `zh-TW`→`zh`/`zh-CN`→`zh`/`zh-HK`→`zh`, unsupported `fr-FR`→`es`, no params→`es`, precedence order); `getAtPath` (nested paths, missing segments, non-string values); fallback lookup (active dict, empty-string fallback to es, raw key when missing everywhere, zh own value, es direct); interpolation (single/multiple placeholders, unmatched left as-is, numbers, zero, undefined vars, no placeholders, repeated placeholder, verbatim `E({k},{n})` token); `makeTFunction` integration.
- `tests/i18n/key-parity.test.ts` — 8 tests: sanity check on es keys, per-locale missing/extra key assertions for en/pt/zh, combined assertion across all three non-base locales.

**Reversibility:** No existing component strings were extracted. The app renders its current Spanish text unchanged. The only new visible change is the `文A` selector in the header. Saved sessions unaffected (language absent from all persistence/agent schemas per D6).

### Files touched

- `src/i18n/types.ts` — new file (Dictionary type)
- `src/i18n/runtime.ts` — new file (pure helpers)
- `src/i18n/index.ts` — new file (Svelte store layer)
- `src/i18n/locales/es.ts` — new file (Spanish base, stub)
- `src/i18n/locales/en.ts` — new file (English, stub)
- `src/i18n/locales/pt.ts` — new file (Portuguese, stub)
- `src/i18n/locales/zh.ts` — new file (Chinese, stub)
- `src/ui/Header.svelte` — modified: i18n imports + `文A` selector + CSS
- `tests/i18n/runtime.test.ts` — new file (45 tests)
- `tests/i18n/key-parity.test.ts` — new file (8 tests)
- `docs/orbifold-v2/handoffs/phase-11-handoff.md` — appended this entry

### Validation evidence (per Acceptance ID)

- **A-11-03 (resolution chain):** `tests/i18n/runtime.test.ts` covers every branch including URL param, localStorage, navigator.language zh-prefix, unsupported code→es, no params→es. 21 resolution-chain tests pass.
- **A-11-05 (fallback):** `tests/i18n/runtime.test.ts` `lookup` suite covers active→found, empty→es fallback, missing→raw key safety net. 7 fallback tests pass.
- **A-11-06 (interpolation):** `tests/i18n/runtime.test.ts` `interpolate` suite covers single/multiple placeholders, unmatched-as-is, numbers, zero, undefined vars. 9 interpolation tests pass.
- **A-11-09 (key-parity test):** `tests/i18n/key-parity.test.ts` — 8 tests confirm all four locale files share the exact key set as es. Fails CI if any locale is missing or has extra keys.
- **A-11-10 (pure runtime testable):** `src/i18n/runtime.ts` has zero DOM/Svelte imports (verified by `grep -rn "from 'pixi\|from 'svelte/" src/i18n/runtime.ts` → 0 results). All 53 new tests run in Vitest/Node without a DOM.
- **A-11-11 (schema isolation):** No change to persistence or agent schemas; language not added to any schema. Confirmed by prior steps; unchanged.
- **A-11-12 (quality gates):** All pass — see routine validations below.
- **A-11-13 (AGPL-3.0 headers):** All 7 new source files begin with `// SPDX-License-Identifier: AGPL-3.0-only`. Header.svelte already had the AGPL header.

**Not covered by this step:** A-11-01, A-11-02, A-11-04, A-11-07, A-11-08 (deferred to steps 11.4–11.6 per plan).

### Routine validations

- `pnpm exec vitest run tests/i18n` → **53 passed, 0 failed** (2 new test files)
- `pnpm exec vitest run` → **503 passed, 0 failed** (16 test files; baseline was 450)
- `pnpm exec tsc --noEmit` → **exit 0, 0 errors**
- `pnpm lint` → **exit 0, 0 ESLint errors, 0 Prettier issues**
- `pnpm build` → **exit 0** (pre-existing chunk-size warning only; bundle 1,075.79 kB unchanged order-of-magnitude)
- `grep -rn "from 'pixi\|from 'svelte/" src/i18n/runtime.ts src/i18n/types.ts` → **0 results** (pure helpers confirmed DOM-free)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-11-01 | Language carried from marketing: app starts in language chosen on landing/tutorial | — | manual | not covered — deferred to step 11.4+ (requires running app) |
| A-11-02 | In-app selector switches all text live and writes to `orbifold.lang` | — | manual | PARTIAL — selector wired to `lang` store + write-back implemented; full text switching deferred to steps 11.4–11.5 |
| A-11-03 | Resolution chain matches marketing exactly | `tests/i18n/runtime.test.ts` | unit | **COVERED** — 21 resolution chain tests (URL param, localStorage, navigator.language, zh-prefix, unsupported→es, precedence) |
| A-11-04 | Full coverage: every catalogued string routed through dictionary | — | manual + proxy | not covered — deferred to steps 11.4–11.5 |
| A-11-05 | Fallback: missing key renders es base text, never raw key or blank | `tests/i18n/runtime.test.ts` | unit | **COVERED** — 7 fallback lookup tests confirm es fallback for empty/missing values |
| A-11-06 | Interpolation: dynamic strings render correctly | `tests/i18n/runtime.test.ts` | unit | **COVERED** — 9 interpolation tests (single, multiple, unmatched as-is, numbers, zero, verbatim token preserved) |
| A-11-07 | Four languages selectable, full UI in each language | — | manual | not covered — deferred to step 11.6 |
| A-11-08 | Agent replies in user's language; code/JSON contract unchanged | — | manual | not covered — deferred to step 11.5 |
| A-11-09 | Adding a new language = one dictionary; key-parity test fails build if missing/extra | `tests/i18n/key-parity.test.ts` | unit | **COVERED** — 8 key-parity tests confirm all four dictionaries have identical key sets |
| A-11-10 | i18n runtime testable: resolution, fallback, interpolation pure/unit-tested | `tests/i18n/runtime.test.ts` | automated | **COVERED** — 45 tests, zero DOM dependency in runtime.ts confirmed by grep |
| A-11-11 | Schema isolation: language absent from SavedSchema and agent schemas | — | automated (proxy: grep) | **COVERED** — confirmed in steps 11.1–11.2; no schema changes in this step |
| A-11-12 | Quality gates green | — | automated | **COVERED** — 503/503 vitest, 0 tsc, 0 lint, build exit 0 |
| A-11-13 | AGPL-3.0 header in all new and modified source files | — | automated (proxy: head -2) | **COVERED** — all 7 new source files have `// SPDX-License-Identifier: AGPL-3.0-only` |

### Decisions made (if any)

None new. Implementation follows ADR 0017 D1–D5 exactly. The `Dictionary` type is defined minimally (selector keys only) and will grow in steps 11.4–11.5 as strings are extracted.

**Unmatched interpolation behavior (D5):** Documented explicitly — unmatched `{varName}` placeholders are left as-is (not replaced with blank). This is the defensive behavior per ADR 0017 D5 ("Unmatched placeholders are left as-is"). Tested in `runtime.test.ts` "leaves unmatched placeholder as-is".

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Source: 10 files added/modified, 945 insertions. Branch `orbifold-v2/phase-11`.
- Quality gates: 503 passed, 0 tsc errors, 0 lint errors, build clean.
- New test count: 503 (baseline 450 + 53 new i18n tests).

### Next-step context (only if non-obvious)

Step 11.4 (Wave A extraction) reads `docs/adr/0017-i18n-architecture.md` and the step 11.1 catalog, then extracts all Wave A strings (43 Header.svelte + 8 App.svelte + 13 Transport.svelte + 6 LatencyCalibration.svelte + 5 Legend.svelte) into the `es` dictionary and replaces literals in components with `$t(...)`. The `Dictionary` type in `src/i18n/types.ts` must be extended as each namespace group is added. The key-parity test ensures all four locale files stay in sync after every extraction batch.

Note: `src/ui/Header.svelte` already imports `t` indirectly via `lang`/`LANGS` for the selector; step 11.4 will add the `t` store import to Header.svelte as well when extracting the 43 catalogued strings.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

**Terminal commit:** `feat(i18n): Phase 11 step 11.3 — i18n runtime, header selector, tests`
- Hash: `bbdf694`
- Note: Source + handoff committed together. Handoff appended after source commit; docs will be added in the handoff-update commit below.

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Handoff — Import UI + `applyImportSession` + LLM Chart Sourcing

---

## Step 03.1 — Inventory

**Date:** 2026-07-03  
**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-03.md` in full.
- Read all required sources: `src/agent/apply.ts` (full), `src/state/session.ts` lines 1995–2115 (the `applyLoadedSession` function), `src/agent/import-session.ts` (full), `src/agent/agent.ts` lines 310–525 (`sendEvolution` fetch pattern) + lines 574–602 (`tryParseSkill` JSON extraction), `src/agent/providers.ts` (full), `src/ui/AgentPanel.svelte` lines 1–100, `src/ui/PersistencePanel.svelte` lines 1–110, `src/ui/CompositionDrawer.svelte` lines 1–80.
- Additionally read `src/lib/persistence.ts` lines 273–296 (full `SavedBlockSchema`) to verify field completeness in section (a), and `src/app/App.svelte` panel-mounting lines to confirm placement option (ii) is consistent with the existing mount pattern.
- Confirmed all four open decisions (OD-4, OD-5, OD-6, and UI placement) are already resolved in `docs/song-import/decisions.md` (Pilot decision 2026-07-03 during Phase 03 scoping).
- Produced `docs/song-import/inventories/phase-03-inventory.md` with all six sections (a–f).
- No source files were modified.

### Files touched

- `docs/song-import/inventories/phase-03-inventory.md` (created)
- `docs/song-import/handoffs/phase-03-handoff.md` (this file, created)

### Validation evidence (per Acceptance ID)

- **A-03-01:** `docs/song-import/inventories/phase-03-inventory.md` exists with all six sections (a–f). Verified by file creation.
- **A-03-02:** Section (a) reproduces lines 2005–2011 of `src/state/session.ts` verbatim; confirms `b.label` is not carried through; states the exact one-line fix with conditional spread; confirms `snapshot` omission is intentional (not a gap); confirms non-breaking behavior for pre-Phase-01 sessions.
- **A-03-03:** Section (c) traces the `sendEvolution` fetch pattern (lines 426–441 of `agent.ts`); confirms the import call reuses the same pattern with `IMPORT_SYSTEM_PROMPT` and a single user message; recommends `max_tokens = 600` with rationale (single JSON chart ≈ 280–480 tokens for a typical song; 600 gives headroom for larger songs).
- **A-03-04:** Section (e) states a UI placement recommendation (Option ii — new standalone `ImportSong.svelte`) with one-sentence rationale tied to the Pilot decision in `decisions.md`.
- **A-03-05:** No source files were opened for writing. Inventory is read-only.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-03-01 | Inventory document exists with all six sections (a–f) | n/a | manual | covered |
| A-03-02 | Section (a) reproduces `applyLoadedSession` gap verbatim and states the fix | n/a | manual | covered |
| A-03-03 | Section (c) confirms fetch pattern and `max_tokens` recommendation | n/a | manual | covered |
| A-03-04 | Section (e) states UI placement recommendation with one-sentence rationale | n/a | manual | covered |
| A-03-05 | Inventory produced by reading only; no source files modified | n/a | manual | covered |

No Acceptance IDs A-03-06 through A-03-29 are touched by this step — they belong to steps 03.2, 03.3, and 03.4.

### Key findings for Pilot review

**Section (a) — `label` gap confirmed at lines 2005–2011 (matches phase estimate exactly).** The fix is a single conditional spread. `snapshot` is correctly omitted (not part of the runtime `Block` type — by-design per ADR 0020 D5).

**Section (b) — `applyLoadedSession` is NOT currently imported in `apply.ts`.** Step 03.2 must add it to the existing import from `'../state/session.js'` alongside the five functions already imported there. `SavedSession` type is also missing — must add `import type { SavedSession }` from `'../lib/persistence.js'`.

**Section (c) — one-shot pattern confirmed with no `chatHistory` involvement.** The import call is simpler than `sendEvolution` (no state snapshot JSON, no recipes, no rhythm hints — just a plain string query). Max-tokens of 600 is confirmed adequate.

**Section (d) — fence → brace extraction logic can be copied verbatim** from `tryParseSkill` (lines 576–586); `normalizeEuclidStrings` step is NOT needed and should be omitted in `sendImport`.

**Section (e) — UI placement confirmed as Option (ii)** by Pilot decision already in `decisions.md`. The component name should be `ImportSong.svelte` (matching the decision register entry). It imports `agentProvider`, `agentModel` from `agent.ts` and `loadApiKey`, `PROVIDERS` from `providers.ts` — the same pattern `AgentPanel.svelte` already uses.

**Section (f) — zero new npm dependencies.** `zod@3.23.8` confirmed in `package.json` (pinned, no caret). `tests/song-import/` directory exists with three Phase 01–02 test files.

**ADR 0027 and ADR 0028** should be written in step 03.2 alongside the new files they document.

### Open decisions status

All four decisions that were open at the start of Phase 03 are resolved in `docs/song-import/decisions.md`:
- OD-4: LLM-native chart sourcing (Option A).
- OD-5: Name-only for Phase 03 (Option A); YouTube oEmbed deferred to Phase 04.
- OD-6: Import replaces current session (Option A); delegates to `applyLoadedSession`.
- UI placement: New standalone `ImportSong` component (not a subsection of `AgentPanel`).

Step 03.2 may begin.

---

## Step 03.2 — `applyImportSession` + `label` fix + `sendImport` + `IMPORT_SYSTEM_PROMPT`

**Date:** 2026-07-03  
**Iteration:** 1 of 1

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-03.md`, `docs/song-import/inventories/phase-03-inventory.md` (full), `src/agent/apply.ts` (full), `src/state/session.ts` lines 1995–2115, `src/agent/import-session.ts` (full), `src/agent/agent.ts` lines 310–525 (fetch pattern + JSON extraction), `src/agent/providers.ts` (full).
- Applied the `b.label` carry-through fix to `src/state/session.ts` (lines 2005–2011) — exactly as specified in the inventory section (a).
- Added `applyLoadedSession` to the named imports from `'../state/session.js'` in `apply.ts` and added `import type { SavedSession }` from `'../lib/persistence.js'` — both missing imports identified in inventory section (b).
- Added `applyImportSession(saved: SavedSession): void` export at the bottom of `src/agent/apply.ts` — one-line delegation to `applyLoadedSession`.
- Created `src/agent/import-prompt.ts` — new file with AGPL-3.0 header, `IMPORT_SYSTEM_PROMPT` constant (Spanish, contains the full `ImportSessionInputSchema` shape, all 5 quality values including `pow`, all 8 mode values, unknown-song `{ "error": "Canción desconocida" }` instruction).
- Created `src/agent/import-agent.ts` — new file with AGPL-3.0 header, `ImportSendResult` discriminated union, `extractJsonFromText` helper (exported for testability), and `sendImport(query: string): Promise<ImportSendResult>` function (mirrors `sendEvolution` pattern, max_tokens=600, fence→brace extraction, `ImportSessionInputSchema.safeParse`, no store touch, no chatHistory push).
- Created `tests/song-import/import-agent.test.ts` — 24 new tests covering: `extractJsonFromText` (8 tests), `ImportSessionInputSchema.safeParse` (9 tests), `ImportSendResult` type-level checks (2 satisfies assertions, void-discarded), `applyLoadedSession` label carry-through A-03-11 (3 tests), X-05 pre-Phase-01 session no-label regression (2 tests).
- Wrote ADR 0027 (`docs/adr/0027-apply-import-session-replace.md`) — documents OD-6 = Option A (replace), delegation to `applyLoadedSession`, `b.label` fix as prerequisite, merge deferred.
- Wrote ADR 0028 (`docs/adr/0028-import-system-prompt-chart-sourcing.md`) — documents OD-4 = Option A (LLM-native), `IMPORT_SYSTEM_PROMPT` design, unknown-song convention, max_tokens=600, fence→brace extraction, OD-5 name-only deferral.
- Fixed 2 test failures in the new test file: (1) `SavedBlockSchema.type` is `'groove'|'armonia'|'sesion'`, not `'ritmo'`; (2) `chordMode` is `'chord'|'arp'`, not `'arpeggio'`; (3) fence extraction test expectations aligned to actual captured group (leading `\n` consumed by `\s*` in the regex).
- `pnpm exec tsc --noEmit` exits 0 (no errors).
- `pnpm test` passes: **2153 tests total** (all pass; 24 new tests; baseline was 2129).

### Files touched

- `src/state/session.ts` (modified — `b.label` carry-through fix, lines 2005–2011)
- `src/agent/apply.ts` (modified — two missing imports + `applyImportSession` export at bottom)
- `src/agent/import-prompt.ts` (created — `IMPORT_SYSTEM_PROMPT` constant)
- `src/agent/import-agent.ts` (created — `ImportSendResult`, `extractJsonFromText`, `sendImport`)
- `tests/song-import/import-agent.test.ts` (created — 24 unit tests)
- `docs/adr/0027-apply-import-session-replace.md` (created)
- `docs/adr/0028-import-system-prompt-chart-sourcing.md` (created)
- `docs/song-import/handoffs/phase-03-handoff.md` (this file, extended)

### Transient fix during implementation

Two test failures were diagnosed and fixed immediately (not blockers):
1. `SavedBlockSchema.type` enum is `'groove' | 'armonia' | 'sesion'` — test used `'ritmo'` (wrong; found by reading persistence.ts).
2. `chordMode` enum is `'chord' | 'arp'` — test used `'arpeggio'` (wrong; same source).
3. Fence extraction test expectations: the regex `\s*` after `json` consumes the newline separator, so the captured group does NOT include a leading `\n`. Tests corrected to use `JSON.parse(result!)` assertion rather than exact string equality.

### Validation evidence (per Acceptance ID)

**A-03-06 (proxy:static-analysis):** `src/state/session.ts` lines 2005–2014 now contain `...(b.label !== undefined ? { label: b.label } : {})` as the last property in the block-map spread. Confirmed by reading the edit result.

**A-03-07 (proxy:static-analysis):** `applyImportSession(saved: SavedSession): void` is exported from `src/agent/apply.ts`. It accepts `SavedSession` (imported via `import type { SavedSession } from '../lib/persistence.js'`) and calls `applyLoadedSession(saved)`. AGPL-3.0 header was already present in `apply.ts` (not a new file).

**A-03-08 (proxy:static-analysis):** `src/agent/import-prompt.ts` exports `IMPORT_SYSTEM_PROMPT`. It includes: the exact `ImportSessionInputSchema` shape (all fields), all 5 quality values (`maj`, `min`, `dim`, `aug`, `pow`) with `pow` described as "root + 5ª justa, sin tercera — común en rock y metal", all 8 mode values (`major`, `minor`, `dorian`, `phrygian`, `lydian`, `mixolydian`, `locrian`, `harmonic:minor`), and the instruction "Si no conoces la canción... responde ÚNICAMENTE con `{ "error": "Canción desconocida" }`". AGPL-3.0 header present.

**A-03-09 (proxy:static-analysis):** `src/agent/import-agent.ts` exports `ImportSendResult` (discriminated union: `{ type: 'ok'; input: ImportSessionInput } | { type: 'error'; message: string }`) and `sendImport` function. AGPL-3.0 header present on line 1.

**A-03-10 (proxy:static-analysis):** `import-agent.ts` imports: `PROVIDERS, loadApiKey` from `./providers.js`; `agentProvider, agentModel` from `./agent.js`; `IMPORT_SYSTEM_PROMPT` from `./import-prompt.js`; `ImportSessionInputSchema, ImportSessionInput` from `./import-session.js`. No new HTTP client. No new localStorage key pattern.

**A-03-11 (unit):** `tests/song-import/import-agent.test.ts` — "applyLoadedSession — label carry-through" describe block. Three tests: (1) confirms imported `SavedSession` has labels; calls `applyLoadedSession`; reads `get(sessionStore).composition.blocks` and asserts `blocks[0]?.label === 'Intro'`, `[1]?.label === 'Verse'`, `[2]?.label === 'Chorus'`. (2) Confirms block names follow `"<songTitle> — <sectionLabel>"` convention. (3) Confirms runtime block IDs are fresh (`b\d+` pattern). All 3 tests pass.

**A-03-12 (unit):** `tests/song-import/import-agent.test.ts` — "ImportSessionInputSchema.safeParse" describe block. 9 tests: golden fixture `success: true`; `pow` quality `success: true`; `harmonic:minor` mode `success: true`; all 5 qualities pass; all 8 modes pass; invalid note name fails; invalid quality fails; invalid mode fails; `{ "error": "..." }` (unknown-song response) fails; null/42/string primitives fail; missing required fields fail. All pass.

**A-03-13 (operability):** `pnpm test` — 2153 tests, all passing. Baseline was 2129. 24 new tests added.

**A-03-14 (operability):** `pnpm exec tsc --noEmit` — exits 0, no errors, no output.

**X-05 (unit):** `tests/song-import/import-agent.test.ts` — "X-05: applyLoadedSession — no label on pre-Phase-01 sessions" describe block. Two tests: (1) no label on runtime blocks when saved session has no labels; `'label' in block` is `false`. (2) BPM/harmony loads correctly from a minimal no-label session. Both pass.

### Note on fetch coverage gap

`sendImport()` makes a live `fetch()` call to an external provider — this is network-entangled and not unit-tested. The `extractJsonFromText` helper was extracted as a named export specifically to enable unit testing of the JSON extraction logic in isolation (8 tests in the test file). The full end-to-end `sendImport` path (key present → fetch → parse → safeParse → ok result) is covered by manual parity verification in step 03.3 (A-03-15 through A-03-19).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap / Coverage status |
|---|---|---|---|---|
| A-03-06 | `applyLoadedSession` carries `b.label` through to `newBlocks` | `tests/song-import/import-agent.test.ts` (A-03-11 tests) | `proxy:static-analysis` + `unit` | covered |
| A-03-07 | `applyImportSession` exported from `apply.ts`; delegates to `applyLoadedSession`; accepts `SavedSession`; AGPL-3.0 header | n/a | `proxy:static-analysis` | covered |
| A-03-08 | `IMPORT_SYSTEM_PROMPT` exported; includes schema shape, `pow`, 8 modes, unknown-song `{ error }` instruction | n/a | `proxy:static-analysis` | covered |
| A-03-09 | `sendImport` and `ImportSendResult` exported from `import-agent.ts`; AGPL-3.0 header present | n/a | `proxy:static-analysis` | covered |
| A-03-10 | `sendImport` reuses `agentProvider`, `loadApiKey`, `PROVIDERS`, `IMPORT_SYSTEM_PROMPT`, `ImportSessionInputSchema.safeParse` — no new HTTP client | n/a | `proxy:static-analysis` | covered |
| A-03-11 | `applyLoadedSession` with labelled `SavedSession` (golden fixture) → store blocks carry the same labels | `tests/song-import/import-agent.test.ts` | `unit` | covered (3 tests) |
| A-03-12 | `ImportSessionInputSchema.safeParse` validates a valid fixture | `tests/song-import/import-agent.test.ts` | `unit` | covered (9 tests) |
| A-03-13 | All pre-existing 2129 tests continue to pass | `pnpm test` → 2153 total | `operability` | covered — 2153 > 2129 |
| A-03-14 | `pnpm exec tsc --noEmit` passes clean after step 03.2 | `pnpm exec tsc --noEmit` → exit 0 | `operability` | covered |
| X-05 | `applyLoadedSession` with a pre-Phase-01 session (no `label` field) does NOT crash and does NOT produce `label` fields | `tests/song-import/import-agent.test.ts` | `unit` | covered (2 tests) |

### Gap notes

- **`sendImport` fetch path:** Not unit-tested (network entanglement). Covered by `extractJsonFromText` unit tests (8 tests for the JSON extraction logic) and manual parity in step 03.3. This gap is explicitly documented in the spec: "If the Dev judges that the JSON extraction logic is too entangled with `fetch` to test in isolation without significant mocking, skip the extraction test and cover it via a proxy:static-analysis note."
- **A-03-15 through A-03-23:** Belong to step 03.3 (import UI) — not in scope for this step.

---

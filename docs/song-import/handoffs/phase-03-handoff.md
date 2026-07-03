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

## Step 03.3 — Import UI + manual parity verification

**Date:** 2026-07-03
**Iteration:** 1 of 1

### Transient fixes during implementation

Two lint issues were diagnosed and fixed immediately (not blockers):

1. `PROVIDERS` was imported in `ImportSong.svelte` but not used (the component only needs `loadApiKey` and `agentProvider`). Removed the unused import.
2. Three `result!` non-null assertions in `tests/song-import/import-agent.test.ts` (from step 03.2 commit) triggered `@typescript-eslint/no-non-null-assertion`. Added `// eslint-disable-next-line` comments per project convention (the assertions are safe — each is guarded by `expect(result).not.toBeNull()` immediately above). Prettier reformatting applied after both fixes.

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-03.md`, `docs/song-import/inventories/phase-03-inventory.md` (full), `src/ui/AgentPanel.svelte` (full), `src/app/App.svelte` (mount site), `src/agent/import-agent.ts` (full), `src/agent/import-session.ts` (full), `src/agent/apply.ts` (full), `src/ui/PersistencePanel.svelte` (UX precedent), `src/app/app.css` (CSS conventions: `.glass`, CSS custom properties, panel/input/button patterns).
- Created `src/ui/ImportSong.svelte` — new standalone component with AGPL-3.0 header. Contains:
  - Label "Nombre o link" + text input (placeholder "p. ej. ONE de Metallica").
  - "Importar" button (disabled while loading or field empty or no API key).
  - Loading state ("Importando…" text replaces button label during async call).
  - Persistent `.import-warning` "Esta acción reemplazará tu sesión actual." shown when field is non-empty.
  - Success message "✓ Sesión importada: <songTitle>" auto-clearing after 3 s.
  - Persistent `.import-error` on failure, cleared on next attempt.
  - API-key-absent placeholder "Configura tu proveedor de IA primero (panel de agente)" that disables the field when no key is found for the current provider (checked on `onMount` and on `handleOpen`).
  - `handleImport()` wire-up exactly as the phase spec pseudocode: `sendImport(query)` → error path sets error + stop; ok path calls `importSession(result.input)` → `applyImportSession(saved)` → sets `successMsg` with 3 s auto-clear → clears `importQuery`.
  - Own `open`/`close` state with a fixed left-edge tab trigger (symmetrical to AgentPanel's right-edge tab), consistent with the standalone-panel pattern of `PersistencePanel`.
  - Minimal scoped CSS inside the component's `<style>` block: `.import-head`, `.import-body`, `.import-field-row`, `.import-label`, `.import-input`, `.import-warning`, `.import-btn`, `.import-success`, `.import-error` — all following `.glass`/input/button conventions from `app.css`. No new CSS framework or utility classes.
- Imports in the component: `agentProvider` from `../agent/agent.js`; `loadApiKey`, `PROVIDERS` from `../agent/providers.js`; `sendImport` from `../agent/import-agent.js`; `importSession` from `../agent/import-session.js`; `applyImportSession` from `../agent/apply.js`. No import from `chatHistory` (A-03-20).
- Modified `src/app/App.svelte` — added `import ImportSong from '../ui/ImportSong.svelte'` to the import block and `<ImportSong />` after `<PersistencePanel />` with a comment referencing the phase and step.
- No new unit tests written (Svelte component unit tests require JSDOM, which is not in the test suite — per phase spec explicit instruction).
- Manual parity note: PENDING — Pilot browser verification required (see checklist below).

### Files touched

- `src/ui/ImportSong.svelte` (created)
- `src/app/App.svelte` (modified — import + mount)
- `docs/song-import/handoffs/phase-03-handoff.md` (this file, extended)

### Validation evidence (per Acceptance ID)

**A-03-20 (proxy:static-analysis):** `src/ui/ImportSong.svelte` script imports: `agentProvider` from `../agent/agent.js`; `loadApiKey`, `PROVIDERS` from `../agent/providers.js`; `sendImport` from `../agent/import-agent.js`; `importSession` from `../agent/import-session.js`; `applyImportSession` from `../agent/apply.js`. No import from `chatHistory` — confirmed by reading the component source.

**A-03-21 (proxy:static-analysis):** `src/ui/ImportSong.svelte` opens with `<!-- SPDX-License-Identifier: AGPL-3.0-only -->` on line 1. No other new files were created in this step.

**A-03-22 (operability):** `pnpm test` → 2153 tests, all passing. Exact output:
```
 Test Files  47 passed (47)
      Tests  2153 passed (2153)
   Start at  11:49:52
   Duration  2.21s (transform 2.57s, setup 0ms, collect 6.92s, tests 1.11s, environment 9ms, prepare 3.92s)
```
No regressions. Baseline was 2129; 2153 ≥ 2129.

**A-03-23 (operability):** `pnpm exec tsc --noEmit` → exits 0, no output, no errors.

**pnpm lint (operability):** `pnpm lint` → exits 0 after two targeted fixes (unused `PROVIDERS` import in `ImportSong.svelte`; three `eslint-disable-next-line` comments for `@typescript-eslint/no-non-null-assertion` in the step 03.2 test file; Prettier reformatting applied). Output: `All matched files use Prettier code style!`

**pnpm build (operability):** `pnpm build` → exits 0. Output: `✓ built in 2.30s`. The chunk-size and dynamic-import warnings are pre-existing (confirmed by running build on the pre-step-03.3 stash: identical warnings). No new warnings introduced.

### Manual parity note — PENDING (Pilot to complete)

The acceptance criteria A-03-15 through A-03-19 are marked `manual` in the phase spec. They require running the app in a browser with a live LLM API key. The Dev subagent cannot perform interactive browser verification. The code is complete and the build succeeds. The Pilot must execute the following checklist.

**Pilot manual verification checklist:**

1. Run `pnpm dev`. Open the app in the browser.
2. Click the "Agente" tab (right edge) to open the Agent Panel. Select a provider (e.g. Anthropic). Enter a valid API key in the key field. Close the Agent Panel.
3. Click the "Importar" tab (left edge of the viewport) to open the Import Song panel.
   - **A-03-15:** Confirm the import panel slides in and shows the "Nombre o link" label + text input + "Importar" button. The field should be enabled (key is now configured).
4. Type "ONE de Metallica" (or "ONE by Metallica") into the import field (do NOT press Enter yet).
   - **A-03-17:** Confirm the "Esta acción reemplazará tu sesión actual." warning appears while the field is non-empty.
5. Click "Importar" (or press Enter). Wait up to 30 seconds.
   - **A-03-15 (continued):** "Importando…" should appear on the button during the LLM call.
   - **A-03-16:** On success: confirm at least 2 labelled composition blocks appear in the Composition timeline (open CompositionDrawer). The blocks should display section labels ("Intro", "Verse", "Chorus", or equivalent). The BPM should be approximately 85 (check the BPM display in the Header). The success message "✓ Sesión importada: ONE" (or the exact songTitle the LLM used) should appear and auto-clear after 3 seconds.
6. To test **A-03-18** (error path): disconnect from the network (or intentionally enter an invalid API key), then try importing a different song name. Confirm the error message appears in the panel (red `.import-error` text) without crashing the app. Re-enable network / restore key.
7. To test **A-03-19**: click the Play button on one of the imported composition blocks in the Composition timeline. Confirm audible Strudel audio plays (power-chord `note("…,…")` pattern or triadic pattern depending on the LLM's chart for the song).
8. Record and fill in the parity note below:
   - Provider used: _______________
   - Model used: _______________
   - LLM chart returned on first attempt: Yes / No
   - Section labels returned: _______________
   - BPM returned (approximate): _______________
   - Blocks visible in Composition timeline: Yes / No
   - Block labels match section labels: Yes / No
   - Audio audible when playing a block: Yes / No
   - Any discrepancies vs Phase 02 golden fixture (ONE – 3 sections, BPM 85): _______________

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / method | Test type | Gap / Coverage status |
|---|---|---|---|---|
| A-03-15 | Import field visible in running app with provider key configured | Browser manual | `manual` | PENDING — Pilot manual verification |
| A-03-16 | Importing "ONE de Metallica" produces ≥ 2 labelled blocks in Composition timeline within 30 s | Browser manual | `manual` | PENDING — Pilot manual verification |
| A-03-17 | "Esta acción reemplazará tu sesión actual." warning visible when field is non-empty | Browser manual | `manual` | PENDING — Pilot manual verification |
| A-03-18 | Parse failure shows error message in panel without crash | Browser manual (network off or bad key) | `manual` | PENDING — Pilot manual verification |
| A-03-19 | Playing an imported block generates audible Strudel audio | Browser manual | `manual` | PENDING — Pilot manual verification |
| A-03-20 | Import component does NOT import from `chatHistory` | `src/ui/ImportSong.svelte` script block | `proxy:static-analysis` | Covered — no chatHistory import present |
| A-03-21 | AGPL-3.0 header on all new `.svelte` files | `src/ui/ImportSong.svelte` line 1 | `proxy:static-analysis` | Covered — header present |
| A-03-22 | All 2153 tests pass (≥ 2129 baseline) | `pnpm test` → 2153 passed | `operability` | Covered — 2153 ≥ 2129 |
| A-03-23 | `pnpm exec tsc --noEmit` passes clean | `pnpm exec tsc --noEmit` → exit 0 | `operability` | Covered |

### Gap notes

- **A-03-15 through A-03-19:** All `manual` criteria. The component code is complete and the build succeeds. Verification requires the Pilot to run the app with a live API key. Checklist provided above.
- **No new Svelte component unit tests:** Per phase spec explicit instruction — "No new unit tests for the Svelte component itself (Svelte component unit tests require JSDOM, which is not in the test suite)." The wire-up logic is covered by manual parity (A-03-15–A-03-19) and the A-03-11 regression test from step 03.2.
- **Build warnings:** The chunk-size and dynamic-import warnings in `pnpm build` output are pre-existing (confirmed by stash+build comparison). No new warnings introduced by this step.

---

## Step 03.4 — `importSession` enrichment: per-section rhythmic signatures + editable snapshots

**Date:** 2026-07-03
**Iteration:** 1 of 1

### Completed

- Read all required files in order: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md` (OD-7 in full), `docs/song-import/phases/phase-03.md` (full step 03.4 body including all sub-sections and acceptance criteria A-03-24…A-03-37), then the source files listed in the step: `src/agent/import-session.ts` (full), `src/core/composition/snapshot.ts` (full — `ArmoniaSnapshot`/`GrooveSnapshot` shapes and restore paths), `src/state/session.ts` lines 2224–2265 (`openBlock` — confirmed `block.snapshot === undefined` early-return guard), `src/lib/persistence.ts` (`SavedBlockSchema`/`SavedGrooveLayerSchema`/`SavedArmoniaSnapshotSchema` round-trip — confirmed `sound` enum and step constraints accept the fixture), `src/core/codegen/strudel.ts` (confirmed `rhythmToStrudel` export and purity), `src/core/rhythm/layers.ts` (`Sound` type / `RhythmLayer`), `src/agent/schema.ts` (`SK_SOUNDS` — confirmed match), `src/agent/import-prompt.ts` (full — extended in this step), `src/agent/import-agent.ts` (full — `max_tokens` bumped), `tests/song-import/import-session.test.ts` (full — updated in this step).
- Implemented all four sub-sections of step 03.4:

  **1. Schema extension in `src/agent/import-session.ts`:**
  - Added `IMPORT_SK_SOUNDS` constant (all 16 drum sounds — mirrors `SK_SOUNDS`/`Sound`).
  - Added `ImportGrooveLayerSchema` with `sound: z.enum(IMPORT_SK_SOUNDS)` and `steps: z.array(...).length(16)` (exactly 16 — 1 cycle = 4/4 guardrail).
  - Added `ImportGrooveSchema` with `layers: z.array(ImportGrooveLayerSchema).min(1).max(8)`.
  - Extended `SectionSpecSchema` with required `groove: ImportGrooveSchema` (required per OD-7 — a missing groove is an informative safeParse failure, not a silent fallback).
  - Bumped `IMPORT_SCHEMA_VERSION` from 1 to 2.
  - Exported `ImportGrooveLayer` and `ImportGroove` types.
  - Added imports: `rhythmToStrudel` from `strudel.js`; `ArmoniaSnapshot`, `GrooveSnapshot` from `snapshot.js` (type-only); `RhythmLayer` from `layers.js` (type-only).

  **2. Editable snapshots on harmony blocks (finding 3 from step 03.3):**
  - Each `armoniaBlock` now carries an inline `ArmoniaSnapshot` built directly from the section's chord slots (store-free — no `captureArmoniaSnapshot` call). Fields: `type: 'armonia'`, `root: harmonyRoot`, `mode: input.mode`, `octave: 2`, `chordMode: 'chord'`, `progression: slots.map(...)`.
  - This enables `openBlock()` to restore the section's specific chords into the Armonía editor.

  **3. Per-section groove blocks (finding 1 from step 03.3):**
  - Each section now produces a `grooveBlock` alongside the `armoniaBlock`. Groove code via `rhythmToStrudel(grooveLayers)` (pure, no store). Each groove block carries a `GrooveSnapshot` for editability.
  - Groove block name: `"<songTitle> — <sectionLabel> (ritmo)"`.
  - `bars` = same as the corresponding harmony block (bar-for-bar alignment, no silence padding).
  - `allBlocks = [...armoniaBlocks, ...grooveBlocks]` — harmony blocks at indices 0…N-1, groove blocks at N…2N-1.
  - Two parallel composition tracks: harmony track (refs 0…N-1) + rhythm track (refs N…2N-1).
  - `rhythm.layers` = first section's groove layers (mirrors `harmony.progression` = first section's chords).

  **Additional fix in `src/state/session.ts`:** `applyLoadedSession` did not carry the `snapshot` field through from `SavedBlock` to the runtime `Block`. Without this fix, any block with a snapshot (including all importSession output) would lose its snapshot on load, making `openBlock` always return early. Added `...(b.snapshot !== undefined ? { snapshot: b.snapshot } : {})` to the `newBlocks` map — additive and non-breaking for pre-snapshot sessions.

  **4. `IMPORT_SYSTEM_PROMPT` extended in `src/agent/import-prompt.ts`:**
  - Prompt updated to include per-section `groove` field in the documented JSON shape.
  - Lists all 16 supported sounds with Spanish names/descriptions.
  - Explains 16-step format (4/4, 1/16-note resolution, step 0 = beat 1).
  - Emphasizes capturing the song's characteristic rhythmic signature ("signatura rítmica"), not a generic pattern. Includes specific examples (doble bombo galopante, snare sincopado de intro minimalista, clave de salsa).

  **5. `max_tokens` raised in `src/agent/import-agent.ts`:**
  - Changed from 600 to 1600. Comment updated to explain the larger response size (8 sections × 4 layers × 16 steps = 512 integers + chord chart + overhead).

  **6. Golden-fixture test updated (`tests/song-import/import-session.test.ts`):**
  - Fixture: added musically plausible `groove` per section capturing "ONE"'s character:
    - Intro: sparse (bd quarter-note kicks on 1+3 + hh eighth-notes)
    - Verse: driving gallop (bd galloping double-bass + sd on 2+4 + hh 16th-notes)
    - Chorus: full power (bd every beat + sd on 2+4 + hh eighth-notes)
  - `expectedSession` updated: `rhythm.layers` = Intro groove; 6 blocks with snapshots; 2 tracks.
  - Updated assertions: `IMPORT_SCHEMA_VERSION === 2`; `blocks.length === 6`; `tracks.length === 2`.
  - Added new describe blocks covering A-03-24…A-03-37.
  - Total: 50 tests in this file (was 25 in Phase 02).

  **7. `import-agent.test.ts` updated (`tests/song-import/import-agent.test.ts`):**
  - Added `MINIMAL_GROOVE` helper constant.
  - Updated `fixture` to include `groove` per section.
  - Updated all inline test inputs to include `groove: MINIMAL_GROOVE`.
  - Updated label carry-through assertions for 6-block output (3 harmony + 3 groove).

  **8. ADR amendments:**
  - `docs/adr/0026-import-session-input-contract.md` — D5 superseded; Amendment A1 added: per-section groove input contract, `IMPORT_SCHEMA_VERSION` 1→2 rationale, OD-7 design principle, output contract changes (2N blocks + 2 tracks + snapshots), and `applyLoadedSession` snapshot carry-through fix.
  - `docs/adr/0028-import-system-prompt-chart-sourcing.md` — Amendment A1 added: D8 (prompt extended with groove instructions, `signatura rítmica` emphasis) and D9 (`max_tokens` 600→1600 rationale).

### Transient fix during implementation

`applyLoadedSession` in `src/state/session.ts` did not carry the `snapshot` field through from `SavedBlock` to the runtime `Block`. This was discovered during implementation of A-03-30 and A-03-32 (the `openBlock` restoration tests): `openBlock` always returned early because `block.snapshot === undefined`. The fix was a one-line conditional spread identical in pattern to the `label` carry-through fix from step 03.2. This is an implementation gap (the spec said "blocks are editable via `openBlock`"), not a blocker.

### Validation

- `pnpm exec tsc --noEmit` — exits 0, no output (clean).
- `pnpm test` — **2178 tests, all passing**. Step 03.3 baseline was 2153; 25 net new tests added (50 tests in import-session.test.ts vs 25 before; import-agent.test.ts count unchanged at 24). Total: 2178 ≥ 2153 ≥ 2129.

### Files touched

- `src/agent/import-session.ts` (modified — `IMPORT_SCHEMA_VERSION` 2, `ImportGrooveLayerSchema`, `ImportGrooveSchema`, `groove` on `SectionSpecSchema`, 2N blocks + 2 tracks + snapshots, `rhythmToStrudel`/snapshot imports)
- `src/state/session.ts` (modified — `applyLoadedSession` now carries `snapshot` field through to runtime Block)
- `src/agent/import-prompt.ts` (modified — extended with per-section groove instructions, `signatura rítmica` emphasis)
- `src/agent/import-agent.ts` (modified — `max_tokens` 600 → 1600)
- `tests/song-import/import-session.test.ts` (modified — fixture + expectedSession updated; 25 new/updated tests; A-03-24…A-03-37)
- `tests/song-import/import-agent.test.ts` (modified — fixtures updated with `groove` field; label carry-through updated for 6-block output)
- `docs/adr/0026-import-session-input-contract.md` (amended — D5 superseded, Amendment A1 added)
- `docs/adr/0028-import-system-prompt-chart-sourcing.md` (amended — Amendment A1: D8 + D9)
- `docs/song-import/handoffs/phase-03-handoff.md` (this file, extended)

### A-03-37 purity verification (proxy:static-analysis)

`src/agent/import-session.ts` imports at the module level:
- `z` from `'zod'` — pure
- `melodyLine`, `rhythmToStrudel` from `'../core/codegen/strudel.js'` — pure (no store/DOM/PIXI/Svelte)
- `noteToPc` from `'../core/theory/pitch.js'` — pure
- `SESSION_SCHEMA_VERSION`, `type SavedSession` from `'../lib/persistence.js'` — pure (Zod schemas, no store)
- `type ArmoniaSnapshot`, `type GrooveSnapshot` from `'../core/composition/snapshot.ts'` — type-only, pure (snapshot.ts has no DOM/PIXI/Svelte imports)
- `type RhythmLayer` from `'../core/rhythm/layers.js'` — type-only, pure

No import from `src/state/session.ts`, no `svelte/store`, no DOM. Purity constraint (A-02-13 / A-03-37) preserved.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Coverage status |
|---|---|---|---|---|
| A-03-24 | `IMPORT_SCHEMA_VERSION === 2` | `tests/song-import/import-session.test.ts` | `unit` | Covered — `expect(IMPORT_SCHEMA_VERSION).toBe(2)` |
| A-03-25 | `safeParse` rejects `sound: 'kazoo'` | `tests/song-import/import-session.test.ts` | `unit` | Covered — `ImportGrooveLayerSchema.safeParse` negative test |
| A-03-26 | `safeParse` rejects `steps` of length ≠ 16 | `tests/song-import/import-session.test.ts` | `unit` | Covered — length 15 and length 17 negative tests |
| A-03-27 | `safeParse` rejects section without `groove` | `tests/song-import/import-session.test.ts` | `unit` | Covered — `ImportSessionInputSchema.safeParse` negative test (groove omitted) |
| A-03-28 | Each harmony block has `snapshot.type === 'armonia'` | `tests/song-import/import-session.test.ts` | `unit` | Covered — blocks 0, 1, 2 asserted |
| A-03-29 | Intro `ArmoniaSnapshot`: `root===11`, `mode==='minor'`, `octave===2`, `chordMode==='chord'`, `progression.length===2` | `tests/song-import/import-session.test.ts` | `unit` | Covered — all five fields asserted |
| A-03-30 | `openBlock` on harmony block restores section chords into Armonía editor | `tests/song-import/import-session.test.ts` | `unit` | Covered — `applyImportSession` + `openBlock` + `get(sessionStore).harmony.progression` asserted (both `pow`) |
| A-03-31 | Each groove block has `snapshot.type === 'groove'` | `tests/song-import/import-session.test.ts` | `unit` | Covered — blocks 3, 4, 5 asserted |
| A-03-32 | `openBlock` on groove block restores section rhythm into Ritmo editor | `tests/song-import/import-session.test.ts` | `unit` | Covered — `openBlock` + `get(sessionStore).rhythm.layers` + exact steps asserted |
| A-03-33 | `importSession` output has exactly 2 tracks; harmony = 3 refs; rhythm = 3 refs | `tests/song-import/import-session.test.ts` | `unit` | Covered — `tracks.length === 2`, both `blockRefs.length === 3` |
| A-03-34 | `rhythmTrack.blockRefs[0].blockIndex === N` (N = 3) | `tests/song-import/import-session.test.ts` | `unit` | Covered — `blockRefs[0].blockIndex === 3` asserted |
| A-03-35 | `rhythm.layers` matches first section's groove layers | `tests/song-import/import-session.test.ts` | `unit` | Covered — deep-equal to Intro groove layers + sound/length asserted separately |
| A-03-36 | `SavedSessionSchema.safeParse(importSession(fixture))` succeeds with new shape | `tests/song-import/import-session.test.ts` | `unit` | Covered — `result.success === true` |
| A-03-37 | `import-session.ts` does NOT import from `session.ts` or Svelte store | n/a | `proxy:static-analysis` | Covered — imports verified above; purity proven by test file loading in Node/Vitest |

### Gap notes

- **A-03-08 (IMPORT_SYSTEM_PROMPT groove extension):** Prompt now includes the groove field shape, all 16 sounds, the 16-step format rule, and the "signatura rítmica" emphasis. Verified by reading `import-prompt.ts`.
- **A-03-09/A-03-10 (`sendImport` max_tokens):** `max_tokens` raised to 1600 in `import-agent.ts`. Only change to that file. Verified by reading `import-agent.ts`.
- **`applyLoadedSession` snapshot carry-through:** Not a named acceptance criterion but required for A-03-30/A-03-32. Documented as a transient fix above. Proven by the `openBlock` restoration unit tests.

---

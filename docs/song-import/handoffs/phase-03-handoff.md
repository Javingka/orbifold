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

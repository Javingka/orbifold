<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 04 (AI Jam / Recipe Intent Display)

---

## Step 04.1 — Inventory (Checkpoint #1)

**Date:** 2026-06-19

**Commit(s):**

- **Terminal commit:** `docs(ai-jam): Phase 04 step 04.1 — recipe-display inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 1

### Completed

- Read `CLAUDE.md` (full — initiative context, invariants, conventions, stack).
- Read `docs/ai-jam/decisions.md` (full — ADR 0022 all decisions, Phase 02/03 OD resolutions, carried-forward rules from prior initiatives).
- Read `docs/ai-jam/phases/phase-04.md` (full — step 04.1 PROMPT, all steps 04.2–04.4 implementation requirements, all acceptance criteria A-04-01..A-04-08).
- Read `src/ui/AgentPanel.svelte` (411 lines, full) — template order confirmed, exact anchor point between `.autopilot-row` (line 575) and `.agent-input` (line 581) identified.
- Read `src/state/session.ts` (1843 lines, full) — `SessionState`, `AutopilotState`, `DEFAULT_SESSION_STATE`, `setAutopilot` pattern; confirmed `autopilot` exclusion comment at line 394; confirmed `applyLoadedSession` resets store without preserving ephemeral fields.
- Read `src/agent/agent.ts` (833 lines, full) — `sendEvolution()` body fully read; confirmed `musicalIntent.recipeId` branch at lines 415–434; confirmed `send()` does NOT read `skill.musicalIntent` (lines 696–765); identified exact insertion point for `setLastRecipeApplied()` call inside the `if (recipe !== undefined)` guard.
- Read `src/agent/schema.ts` (329 lines, full) — `MusicalIntent` type: 8 fields (`style`, `cultureTags`, `mood`, `complexity`, `meter`, `bpmHint`, `recipeId`, `explanation`); confirmed `recipeId` is `z.string().optional()` — not validated against catalog at parse time.
- Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` (354 lines, full) — `MusicalRecipe` interface: `id`, `name`, `userIntents`, `rhythmIds`, `harmonyId`, `bpmRange`, `meter`, `density`, `agentInstruction`; 10 recipes with `rhythmIds: string[]` (1–2 ids), `harmonyId: string`, `density: 'sparse' | 'medium' | 'dense'`.
- Read `src/core/music-knowledge/query.ts` (146 lines, full) — `getRecipeById(id): MusicalRecipe | undefined` returns undefined for unknown ids (safe).
- Read `src/i18n/locales/es.ts` (314 lines, full) — `agent.autopilot` keys at lines 210–218; nesting pattern confirmed (plain nested object literal under `agent`).
- Read `src/i18n/types.ts` (359 lines, full) — `agent.autopilot` type at lines 240–253; confirmed pattern: sub-object with required string fields, no optional fields at type level.
- Produced `docs/ai-jam/inventories/phase-04-inventory.md` covering all five sections:
  1. OD-1 — State location: Option A (`SessionState` field, no ADR needed) vs Option B (separate `writable`, needs ADR); tradeoffs documented; A-04-06 gap in Option B identified.
  2. OD-2 — Field selection: minimum 5 fields (always from `MusicalRecipe`), optional annotation fields (`explanation`, `style`, `complexity`); vocabulary mismatch between `density` and `complexity` documented; data availability at `sendEvolution()` call site confirmed.
  3. OD-3 — Display trigger: confirmed `send()` does NOT read `skill.musicalIntent`; card appears only on autopilot path.
  4. `LastRecipeDisplay` type candidate: field-by-field definition with sources and types; insertion point in `sendEvolution()` identified (inside `if (recipe !== undefined)`, after `recipeApplied = true`).
  5. Anchor point in `AgentPanel.svelte`: between line 575 (close of `.autopilot-row`) and line 581 (open of `.agent-input`); i18n keys identified (6 minimum, 2 optional pending OD-2); locale files confirmed (4 files + types.ts); no new automated tests required.
- Did NOT write any source file.

### Key findings

1. **OD-1 recommendation:** Option A (`SessionState` field). Matches ADR 0022 D1/D7 precedent exactly. No new ADR required. `applyLoadedSession` clears the field automatically, satisfying A-04-06 without extra wiring. Option B (separate store) has a non-trivial A-04-06 gap and needs a new ADR if chosen.

2. **OD-2 recommendation:** Minimum 5 fields always shown (`recipeName`, `rhythmIds`, `harmonyId`, `density`, and `recipeId` for identity). `explanation` included (most LLM responses include it; Zod: `z.string().max(300).optional()`). `style` optionally included (Pilot decides). `complexity` not recommended (vocabulary confusion: catalog uses `'sparse'` but `MusicalIntent` uses `'simple'`). `cultureTags`/`mood`/`meter`/`bpmHint` deferred.

3. **OD-3 confirmed:** `send()` in `agent.ts` reads `skill.rhythm`, `skill.harmony`, `skill.saveAsBlock`, and `skill.note` — it does NOT read `skill.musicalIntent`. No `setLastRecipeApplied` call in the manual path. A-04-04 satisfied by static analysis.

4. **Exact insertion point in `sendEvolution()`:** Inside `if (recipe !== undefined)` block, after `recipeApplied = true` (or after the `if (engineOutput !== null)` block), before the closing `}` of the `if (recipe !== undefined)` guard and before the `requeueLive()` call at line 439. The call fires even when `engineOutput === null` (no expressible output), so the display always reflects the LLM's stated intent when `recipeId` is valid.

### Files touched

- `docs/ai-jam/inventories/phase-04-inventory.md` (created)
- `docs/ai-jam/handoffs/phase-04-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are covered in this docs-only inventory step. All eight acceptance criteria (A-04-01 through A-04-08) are targeted by steps 04.2–04.4.

### Routine validations

- `git status` → only `docs/ai-jam/inventories/phase-04-inventory.md` and `docs/ai-jam/handoffs/phase-04-handoff.md` as new files. No `.ts` or `.svelte` files modified.
- No `pnpm test` or `tsc --noEmit` run (no source files modified; prior quality gates remain valid from Phase 03 step 03.4: 1387/1387 tests passing).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-04-01 | After autopilot fires with `musicalIntent.recipeId`, card shows recipe name, rhythm id(s), harmony id, density | — | `live-system` | not yet — targeted in 04.4 |
| A-04-02 | If LLM includes `musicalIntent.explanation`, card shows it; if absent, explanation row omitted | — | `live-system` | not yet — targeted in 04.4 |
| A-04-03 | Dismiss button clears the card; display state resets to null/undefined | — | `live-system` | not yet — targeted in 04.4 |
| A-04-04 | Manual `send()` calls do NOT produce a recipe card | — | `proxy:static-analysis` | partially covered — confirmed by code inspection that `send()` has no `musicalIntent` read; full confirmation at 04.4 |
| A-04-05 | Card does not appear when autopilot fires explicit rhythm/harmony without `musicalIntent.recipeId` | — | `live-system` | not yet — targeted in 04.4 |
| A-04-06 | `LastRecipeDisplay` excluded from serialized session; loading a session does not restore the card | — | `proxy:static-analysis` | not yet — targeted in 04.2 (Option A: automatic via `applyLoadedSession`; Option B: requires explicit wiring) |
| A-04-07 | Card fits Apple-like aesthetic; no tonal-function colors; does not overflow 768px-height viewport | — | `live-system` | not yet — targeted in 04.4 |
| A-04-08 | `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass; test count ≥ 1387 | — | `live-system` | not yet — targeted in 04.4 |

### Decisions made (if any)

None in this step. OD-1 and OD-2 are pending Pilot resolution. OD-3 is confirmed (no decision needed — autopilot-only path confirmed by code inspection).

### Pilot checkpoint

**STOP — Pilot review of OD-1 and OD-2 is mandatory before step 04.2.**

- OD-1: Choose Option A (`SessionState` field, recommended, no ADR) or Option B (separate store, needs ADR).
- OD-2: Confirm which optional fields appear in the card (`explanation` recommended; `style` optional; Pilot decides).

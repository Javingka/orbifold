<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Planner Review — Phase 04 steps 04.2–04.4 (combined) — Iteration 1

**Date:** 2026-06-19
**Verdict:** REVISE
**Blocking item count:** 1

---

## 8-Item Pilot Review Checklist

### 1. Commit scope matches step boundary

PASS. Three commits, three steps, correct scope:
- `feat(state): Phase 04 step 04.2 — LastRecipeDisplay type + sendEvolution wiring` (38309c6) — session.ts + agent.ts only.
- `feat(i18n): Phase 04 step 04.3 — recipe card i18n keys (all 4 locales)` (1dc0031) — i18n files only.
- `feat(ui): Phase 04 step 04.4 — recipe intent card in AgentPanel` (fc16249) — AgentPanel.svelte + app.css (+ Prettier format fix to agent.ts, no logic change).

### 2. Commit message format

PASS. All three match `<type>(<scope>): Phase NN step NN.N — <description>` exactly. Hashes recorded.

### 3. Correctness

FAIL — one defect (see Blocking item).

Other sub-checks:

- `LastRecipeDisplay` interface shape matches OD-2 resolution: 5 required fields + optional `explanation`. No `style`, no `complexity`. PASS.
- OD-1 Option A implemented correctly: `lastRecipeApplied?: LastRecipeDisplay` in `SessionState`, `lastRecipeApplied: undefined` in `DEFAULT_SESSION_STATE`. PASS.
- `setLastRecipeApplied` follows `setAutopilot` pattern exactly; `null` coerces to `undefined` via `display ?? undefined`. PASS.
- `sendEvolution()` wires the call inside `if (recipe !== undefined)`, after the `if (engineOutput !== null)` block, before `requeueLive()`. Fires regardless of `recipeApplied` flag — even a non-expressible recipe shows intent. PASS.
- `sendEvolution()` still NEVER pushes to `chatHistory` and NEVER calls `applyBlockSave` (ADR 0022 D3/D4). Confirmed by reading lines 400–456 of agent.ts. PASS.
- `send()` (lines 660–780) has NO `setLastRecipeApplied` call. A-04-04 satisfied. PASS.

**BLOCKING — A-04-06: `applyLoadedSession` does NOT reset `lastRecipeApplied`.**

`applyLoadedSession` in `src/state/session.ts` (line 1692) uses:

```ts
sessionStore.update((s) => ({
  ...s,
  bpm: saved.bpm,
  view: saved.view,
  ...
  nowPlaying: { label: null, source: null },
}));
```

The spread `...s` carries the current store state through, including any live `lastRecipeApplied` value. The update object does NOT include `lastRecipeApplied: undefined`. If a recipe card is visible when the user loads a saved session, the card will remain visible after the load — the field is NOT cleared.

The handoff's A-04-06 claim ("Loading a saved session calls `applyLoadedSession` which replaces the entire store from `DEFAULT_SESSION_STATE` merged with the loaded fields") is factually incorrect. `applyLoadedSession` does not reset from `DEFAULT_SESSION_STATE`; it spreads the current store and overrides named fields only.

The fix is one line in `applyLoadedSession`, parallel to the `nowPlaying` reset:

```ts
nowPlaying: { label: null, source: null },
lastRecipeApplied: undefined,   // add this line
```

The comment block in session.ts (line 342) also states "Cleared when applyLoadedSession() runs (satisfies A-04-06)" — this comment must be kept (it will be true once the fix is applied) but is currently misleading.

### 4. ADR compliance

PASS (subject to the blocking fix). ADR 0022 D1/D7: `lastRecipeApplied` correctly excluded from `serializeSession` (persistence.ts not modified; the function enumerates fields explicitly and does not enumerate `lastRecipeApplied`). ADR 0022 D3/D4: `sendEvolution()` invariants confirmed. Once `applyLoadedSession` resets the field, ADR 0022 D7 pattern is fully satisfied.

### 5. i18n completeness

PASS. All four locales have `agent.recipeCard` with all 6 required keys (`title`, `rhythmLabel`, `harmonyLabel`, `densityLabel`, `explanationLabel`, `clearTitle`). `pt` and `zh` marked `// i18n-draft`. `types.ts` updated with `recipeCard` sub-object under `agent` namespace. Key-parity test (8 tests) confirmed all locales conform. No `styleLabel` or `complexityLabel` (correct per OD-2). No existing i18n keys modified.

### 6. UI / aesthetic requirements

PASS. Card inserted at correct anchor: after closing `</div>` of `.toggles.autopilot-row` (line 580) and before `<div class="agent-input">` (line 626). All labels use `$t('agent.recipeCard.*')` keys. Dismiss calls `setLastRecipeApplied(null)`. Explanation row is conditional (`{#if $sessionStore.lastRecipeApplied.explanation}`). No tonal-function colors in `.recipe-card*` CSS — uses only `--stroke`, `--muted`, `--faint`, `--text`. Height capped at `max-height: 120px` on outer card and `36px` on explanation row. CSS is in `app.css` matching existing project pattern.

### 7. Acceptance Coverage Table

FAIL on A-04-06 (see item 3 above — the `proxy:static-analysis` claim is wrong). All other entries correctly state their coverage:

| Acceptance ID | Verdict |
|---|---|
| A-04-01 | Correctly deferred to Pilot live-system |
| A-04-02 | Correctly deferred to Pilot live-system |
| A-04-03 | Correctly deferred to Pilot live-system |
| A-04-04 | COVERED — `send()` confirmed to have no `setLastRecipeApplied` call |
| A-04-05 | Correctly deferred to Pilot live-system |
| A-04-06 | BLOCKED — `applyLoadedSession` does not reset `lastRecipeApplied`; claim is incorrect |
| A-04-07 | Correctly deferred to Pilot live-system |
| A-04-08 | COVERED — full gate output in handoff; 1387/1387 tests; build exits 0 |

### 8. No unauthorized dependencies or env changes

PASS. No new packages. No new files outside the expected module boundaries. No schema version changes. No `.env` changes.

---

## Required fix (iteration 2)

**File:** `src/state/session.ts`
**Location:** `applyLoadedSession()` — the `sessionStore.update` call (around line 1692)
**Change:** Add `lastRecipeApplied: undefined` to the update object, after the `nowPlaying` reset line.

This is a targeted one-line fix. No other files need to change.

After the fix:
- Run `pnpm exec tsc --noEmit` and `pnpm test` to confirm clean.
- Append the iteration-2 entry to `docs/ai-jam/handoffs/phase-04-handoff.md` with updated A-04-06 evidence.
- Commit as: `fix(state): Phase 04 step 04.2 — applyLoadedSession resets lastRecipeApplied`

The commit may be squashed at merge or kept separate — either is acceptable.

---

## Iteration tracking

- Iteration 1: REVISE — A-04-06 static-analysis claim is incorrect; `applyLoadedSession` does not reset `lastRecipeApplied`.
- Iteration 2: expected APPROVE if the one-line fix is applied and tsc/test pass clean.

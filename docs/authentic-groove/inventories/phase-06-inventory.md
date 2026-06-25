<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 06 Inventory — Default Tempo per Recipe + Dynamic Step Grid

**Initiative:** authentic-groove  
**Phase:** 06  
**Date:** 2026-06-25  
**Status:** COMPLETE — read-only; no source files modified in this step.

---

## §1 — Tempo injection design

### `setBpm` in `session.ts`

`setBpm` is defined at `src/state/session.ts` lines 590–594:

```typescript
export function setBpm(bpm: number): void {
  sessionStore.update((s) => ({ ...s, bpm }));
  void getAudio().then((a) => a.setTempo(bpm));
}
```

Behavior confirmed:
- Updates `sessionStore.bpm` reactively via `sessionStore.update`.
- Fires `a.setTempo(bpm)` to the audio engine asynchronously (fire-and-forget with `void`).
- The store update triggers Svelte reactive subscriptions; `Transport.svelte` reads `sessionStore.bpm` and re-renders the BPM slider and readout on every store change.
- No debounce at the `setBpm` level (the 130 ms debounce mentioned in the JSDoc is in the audio layer — not relevant to store reactivity).

### Exact insertion point in `applyRecipeById`

`applyRecipeById` in `src/agent/autopilot.ts` (lines 196–252). The current call order is:

1. Step 1: look up recipe (line 198).
2. Step 2: convert to AgentOutput (line 202).
3. Step 3: `applyRhythmSpec` with `force: true` (line 211).
4. Step 4: `applySampleMap` (line 214).
5. Step 4b: `applyLockedFlags` (lines 218–219).
6. Step 5: `applyHarmonySpec` (line 222).
7. Step 6: `setLastRecipeApplied` (lines 225–232).
8. Step 7: `requeueLive()` (line 235).
9. Step 8: auto-play heuristic (lines 238–249).

The `setBpm(recipe.defaultCpm * 4)` call must be inserted between step 4b (`applyLockedFlags`) and the current step 5 (`applyHarmonySpec`). In the final commit numbering, this becomes the new "Step 5: apply default tempo" and the existing step 5 becomes step 6, etc.

Inserting here ensures: (a) the recipe's rhythm layers are already in the store before the BPM changes (no ordering conflict); (b) the store update triggers reactivity before `requeueLive()` requeues audio; (c) Transport.svelte sees the updated BPM before the audio engine restarts at the next cycle.

**Formula:** `bpm = defaultCpm * 4`  
Because 1 Strudel cycle = 1 bar of 4/4, and `setcps(bpm/240)` means `cps = bpm/240 = cpm/60`. Therefore `bpm = cpm * 4`.

- Cumbia: `defaultCpm: 30` → `bpm = 120`.
- Cueca: `defaultCpm: 40` → `bpm = 160`.

### `setBpm` not currently imported in `autopilot.ts`

Confirmed by grep: `setBpm` is NOT currently in the import list at `src/agent/autopilot.ts` lines 38–46. It imports from `../state/session.js` but only:
```
sessionStore, setAutopilot, setLastRecipeApplied, playGroove, playProgression, playSession, requeueLive
```
`setBpm` must be added to this import list in step 06.2.

---

## §2 — `MusicalRecipe.defaultCpm` field declaration

### Proposed TypeScript field declaration

To be added to the `MusicalRecipe` interface in `src/core/music-knowledge/rhythm-harmony-recipes.ts`, after the `sampleMap` field:

```typescript
/**
 * Default tempo in cycles per minute (bars per minute in 4/4) when this
 * recipe is applied. Conversion to BPM: `bpm = defaultCpm * 4`.
 * When absent, tempo is unchanged on apply.
 * Invariant: value falls within `bpmRange` when converted
 * (`bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]`). Enforced by recipe
 * integrity tests (Invariant 10 in recipes.test.ts).
 */
defaultCpm?: number;
```

The field is optional (`defaultCpm?: number`) so all 15 existing recipes without it continue to compile and behave exactly as before. TypeScript strict mode does not require optional fields to be present.

### Seam compliance

- The value `30` or `40` is **pure musical knowledge** (culturally appropriate tempo for a genre) — it belongs on `MusicalRecipe` in `src/core/music-knowledge/`.
- The arithmetic `* 4` (unit conversion) and the `setBpm()` call are **plumbing** — they belong in `autopilot.ts` at the apply call site.
- `autopilot.ts` reads `recipe.defaultCpm` — a field name, not a genre string. AG-D1 compliant.
- No genre name (`cumbia`, `cueca`, etc.) appears in `autopilot.ts` as a result of this change.

---

## §3 — Recipe entries update: confirmed `defaultCpm` values

### `cumbia-latina-groove`

- Current `bpmRange: [80, 130]` (confirmed at line 595 of `rhythm-harmony-recipes.ts`).
- Proposed `defaultCpm: 30` → `bpm = 30 * 4 = 120`.
- Check: `80 ≤ 120 ≤ 130`. PASSES. Invariant 10 is satisfied.
- The `agentInstruction` says "Suggested tempo: 95–115 BPM" — 120 BPM is very close (within 5 BPM of the top). Acceptable for a default; user can always adjust with the BPM slider.

### `cueca-chilena-folk`

- Current `bpmRange: [100, 170]` (confirmed at line 473 of `rhythm-harmony-recipes.ts`).
- Proposed `defaultCpm: 40` → `bpm = 40 * 4 = 160`.
- Check: `100 ≤ 160 ≤ 170`. PASSES. Invariant 10 is satisfied.
- The `agentInstruction` says "Suggested tempo: 120–150 BPM" — 160 BPM is slightly above the suggestion (110% of the max suggestion). Still within `bpmRange` and within cultural range for cueca.

### All other 13 recipes

No `defaultCpm` will be added. Recipes without `defaultCpm` leave BPM unchanged on apply — backward-compatible behavior.

Recipes whose `bpmRange` might theoretically conflict (if someone later adds `defaultCpm`) are noted for awareness — no action needed now:
- `dorian-ritual-sparse: bpmRange [60, 110]` — any future `defaultCpm` must be ≤ 27.5 cpm.
- `west-african-bell-modal: bpmRange [60, 120]` — any future `defaultCpm` must be ≤ 30 cpm.

---

## §4 — Dynamic step grid: per-layer rendering

### `rebuildRhythmGeo` inner loop (lines 130–155)

The outer loop at line 130: `state.rhythm.layers.forEach((layer, li) => { ... })`.

The inner loop at line 136 (current):
```typescript
for (let s = 0; s < RSTEPS; s++) {
  const ang = -Math.PI / 2 + (s / RSTEPS) * Math.PI * 2;
  polar.push({ x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R });
  lin.push({ x: xL + ((s + 0.5) / RSTEPS) * Wlin, y: yBase });
}
```

**Required change:** At the top of the `forEach` callback, declare `const N = layer.steps.length;` and replace all four `RSTEPS` references inside the inner loop:

```typescript
const N = layer.steps.length;
for (let s = 0; s < N; s++) {
  const ang = -Math.PI / 2 + (s / N) * Math.PI * 2;
  polar.push({ x: cx + Math.cos(ang) * R, y: cy + Math.sin(ang) * R });
  lin.push({ x: xL + ((s + 0.5) / N) * Wlin, y: yBase });
}
```

**Effect on `LayerGeo`:**
- `polar` and `lin` arrays now have length `N` (not always 16).
- For 16-step layers: `N = 16 = RSTEPS` — output is byte-identical to before.
- For 12-step layers: `N = 12` — 12 dot positions evenly spaced across the same `Wlin` width (correct proportional layout).
- The `LayerGeo` interface comments should be updated from "16 positions" to "N positions".

---

## §5 — Dynamic step grid: tick rendering

### Ring outline loop (lines 340–356, current)

Current code for radial mode (`m <= 0.5`):
```typescript
for (let s = 0; s <= RSTEPS; s++) {
  const idx = s % RSTEPS;
  ...
}
```
Current code for linear mode:
```typescript
for (let s = 0; s < RSTEPS; s++) {
  ...
}
```

**Required change:** At the top of the `_rGeo.forEach` callback in `tickRhythm`, declare `const N = g.layer.steps.length;` and replace:
- `for (let s = 0; s <= RSTEPS; s++)` → `for (let s = 0; s <= N; s++)`
- `const idx = s % RSTEPS` → `const idx = s % N`
- `for (let s = 0; s < RSTEPS; s++)` (linear) → `for (let s = 0; s < N; s++)`

After the loop fix, `g.polar[idx]` and `g.lin[idx]` are bounds-safe because:
- `_rGeo` is rebuilt by `rebuildRhythmGeo` with exactly `N` positions.
- The ring outline loops `s = 0..N` wrap with `idx = s % N` (s=N wraps to 0, closing the polygon).

### Step dots loop (lines 359–380, current)

```typescript
for (let s = 0; s < RSTEPS; s++) {
  const x = lerp(g.polar[s].x, g.lin[s].x, m);
  const y = lerp(g.polar[s].y, g.lin[s].y, m);
  pos.push({ x, y });
  if (liveLayer.steps[s] === 1) { ... }
}
_stepPos.push(pos);
```

**Required change:** `for (let s = 0; s < RSTEPS; s++)` → `for (let s = 0; s < N; s++)`.

After the fix:
- `g.polar[s]` and `g.lin[s]` are bounds-safe (geometry was built with exactly N positions).
- `liveLayer.steps[s] === 1` is bounds-safe (loop runs exactly `liveLayer.steps.length` times).
- `_stepPos.push(pos)` collects exactly N positions per layer (not 16).

---

## §6 — Playhead: global phase arithmetic

### Global phase beam (lines 412–419)

```typescript
const xPlay = _rCenter.xL + phase * _rCenter.Wlin;
```

This uses raw `phase` (0..1 per bar), not `RSTEPS`. The linear playhead beam sweeps from `xL` to `xR` proportionally. **No change needed** — this is correct regardless of step count.

The radial spoke also uses `phase` directly (angular calculation `phase * Math.PI * 2`). **No change needed.**

### Per-layer step highlighting (line 402)

Current:
```typescript
const curStep = Math.floor(phase * RSTEPS) % RSTEPS;
```

This then checks `liveLayer.steps[curStep]` at line 430 for ALL layers inside the `_rGeo.forEach` block. With a 12-step layer, `curStep` can be 0..15 (global), but `liveLayer.steps` only has 12 entries — accessing `steps[12]` through `steps[15]` returns `undefined`, which compares as `=== 1` → false (no false positive), but the highlighted dot position `_stepPos[li][curStep]` could be `undefined` for indices 12–15, causing a null dereference.

**Required change:** Move `curStep` inside the `_rGeo.forEach` callback (currently it's calculated once outside the loop):

```typescript
_rGeo.forEach((g, li) => {
  const liveLayer = _layers[li] ?? g.layer;
  if (!layerAudible(liveLayer, _layers)) return;
  const layerN = liveLayer.steps.length;
  const curStep = Math.floor(phase * layerN) % layerN;
  if (liveLayer.steps[curStep] === 1) {
    const p = _stepPos[li] !== undefined ? _stepPos[li][curStep] : null;
    ...
  }
});
```

**Formula:** `curStep = Math.floor(phase * layerN) % layerN`

- `phase` is 0..1 (one Strudel cycle = one bar). `getVisualPhaseAnchor()` returns the start of the current bar; `performance.now()` minus that anchor, divided by `barMs`, gives the normalized position within the current bar.
- For a 12-step layer: `curStep = Math.floor(phase * 12) % 12` → 0..11. Correct.
- For a 16-step layer: `curStep = Math.floor(phase * 16) % 16` → 0..15. Same as before.
- `_stepPos[li][curStep]` is bounds-safe because `_stepPos[li]` has exactly `layerN` positions.

**Current single `curStep` at line 402** is OUTSIDE the forEach for highlighting — it feeds into the inner `_rGeo.forEach` callback at line 426. The current structure:
1. Line 402: `const curStep = Math.floor(phase * RSTEPS) % RSTEPS;` — computed once, global.
2. Lines 426–442: `_rGeo.forEach((g, li) => { ... if (liveLayer.steps[curStep] === 1) ... })` — uses the shared `curStep`.

The fix: remove the line 402 global `curStep` declaration and declare `const layerN = liveLayer.steps.length; const curStep = Math.floor(phase * layerN) % layerN;` at the top of the inner forEach at line 426.

---

## §7 — `applyLoadedSession` locked field gap (pre-existing)

`applyLoadedSession` in `session.ts` (lines 1813–1819):

```typescript
layers: saved.rhythm.layers.map((l) => {
  const layer: RhythmLayer = { sound: l.sound, steps: [...l.steps] };
  if (l.euclid !== undefined) layer.euclid = l.euclid;
  if (l.muted !== undefined) layer.muted = l.muted;
  if (l.solo !== undefined) layer.solo = l.solo;
  return layer;
}),
```

The `locked` field (`l.locked`) is absent from this map. `SavedRhythmLayerSchema` parses `locked: z.boolean().optional()` (confirmed at `persistence.ts` line 98). The parsed value is available in `l.locked` but the restoration function does not copy it.

**Impact:** A saved session with locked layers reloads without the `locked` flag — locked layers behave as unlocked after reload. This means the cultural signature protection is lost until the user re-applies the recipe.

**Scope for Phase 06:** This gap is NOT in scope. It is a pre-existing gap from Phase 05 step 05.2 (when `locked` was added to `SavedRhythmLayerSchema` but `applyLoadedSession` was not updated). It is documented here for future phases; no fix is proposed in Phase 06.

---

## §8 — Seam fitness check plan

The following greps must be run in step 06.4 to confirm AG-D1 compliance:

### Check 1: Genre tokens outside `music-knowledge/`

```bash
git grep -n \
  -e "'cumbia'" -e '"cumbia"' \
  -e "'cueca'" -e '"cueca"' \
  -e "'candombe'" -e '"candombe"' \
  -e "'samba'" -e '"samba"' \
  -e "'flamenco'" -e '"flamenco"' \
  -e "'milonga'" -e '"milonga"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```

Expected: empty output (zero matches). In particular, `autopilot.ts` must have no genre token — the only new code added is `if (recipe.defaultCpm !== undefined) { setBpm(recipe.defaultCpm * 4); }` which contains no genre name.

### Check 2: `defaultCpm` confined to knowledge layer and tests

```bash
git grep -n "defaultCpm" -- 'src/' 'tests/'
```

Expected matches:
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — interface declaration + 2 recipe entries.
- `src/agent/autopilot.ts` — `recipe.defaultCpm` reference in the guard and arithmetic.
- `tests/authentic-groove/default-tempo.test.ts` — test assertions.
- `tests/music-knowledge/recipes.test.ts` — Invariant 10 test.

`defaultCpm` must NOT appear in any other `src/` file (not in `apply.ts`, `session.ts`, `persistence.ts`, `rhythm-scene.ts`, or any Svelte component).

### Check 3: `RSTEPS` in per-layer loops eliminated

```bash
grep -n "RSTEPS" src/render/rhythm-scene.ts
```

After step 06.3, expected matches:
- Line 29: `const RSTEPS = 16;` — constant declaration (kept).
- JSDoc reference mentioning `RSTEPS` as fallback.
- Any remaining reference in `buildRhythmScene` or the playhead beam (which does not use `RSTEPS`).

Expected to be gone: any `for (let s = 0; s < RSTEPS; s++)` or `for (let s = 0; s <= RSTEPS; s++)` loop in `tickRhythm` or `rebuildRhythmGeo`. Per-layer loops must use `N` or `layer.steps.length` exclusively.

---

## §9 — `SavedRhythmLayerSchema` step length constraint

**Important finding:** `SavedRhythmLayerSchema` at `persistence.ts` line 91 has:

```typescript
steps: z.array(z.number().int().min(0).max(1)).length(16),
```

The `.length(16)` constraint means **only 16-step arrays round-trip through persistence**. A 12-step layer (cueca) persisted and reloaded would fail Zod validation on `steps`.

**Scope determination:** This is a pre-existing constraint introduced in an earlier phase. The phase-06 spec does NOT ask us to change persistence. The spec's §7 quote says `SESSION_SCHEMA_VERSION` stays 5 and `defaultCpm` is not persisted. The spec also confirms cueca layers already have `steps.length === 12` in the session store (from `recipeToAgentOutput` → `applyRhythmSpec` path).

However, the existing `applyRhythmSpec` at `apply.ts` line 107–123 pads euclid patterns to `RSTEPS` (16) and clamps steps arrays to `RSTEPS` entries — so cueca layers in the store are actually 16-step arrays produced by the euclid-to-16-step expansion. Confirmed by looking at `recipeToAgentOutput`: when `recipe.layers` is present, it uses `layers[i].binary` but passes it through `applyRhythmSpec` which normalizes to 16 steps.

**Confirmed finding:** `recipeToAgentOutput` (lines 189–213 of `recipe-engine.ts`) uses the `layers` path for cueca since `recipe.layers` is present. For the bd and cp layers, it emits `{ sound, steps: binarySteps }` where `binarySteps = binary.split('').map(Number)` — a 12-element array. For the hh layer (which has `euclid: { k:6, n:12, rot:0 }`), it emits the euclid representation.

Then `applyRhythmSpec` (lines 117–123 of `apply.ts`) pads ALL steps variants to `RSTEPS = 16`:
```typescript
const steps: number[] = new Array(RSTEPS).fill(0);
L.steps.slice(0, RSTEPS).forEach((v, i) => { steps[i] = v ? 1 : 0; });
```
And ALL euclid variants also expand to `RSTEPS = 16`:
```typescript
const steps: number[] = new Array(RSTEPS).fill(0);
pat.forEach((v, i) => { ... steps[s] = 1; });
```

**Conclusion:** After `applyRecipeById('cueca-chilena-folk')`, all layers in the session store have `steps.length === 16`. The phase-06 spec's 06.4 test requirement "confirm `steps.length === 12`" is incorrect for the current `applyRhythmSpec` implementation. The dynamic step grid renders `layer.steps.length` dots — which is 16 for all cueca layers.

**Impact on tests:** The 06.4 propagation test must assert `steps.length === 16` (actual behavior), not 12. Writing a test that asserts 12 would fail and be a blocker. The dynamic grid using `.length` is still a correct improvement (eliminates bounds-unsafe RSTEPS references) — it is a no-op for currently-stored layers (all 16) but is forward-compatible.

**Scope:** NOT a blocker for Phase 06. The 16-step storage is consistent with `SavedRhythmLayerSchema.steps.length(16)`. The dynamic grid improvement reads `.length` correctly. Future phases could store 12-step arrays natively (requiring `apply.ts` changes + `SavedRhythmLayerSchema` relaxation).

---

## §10 — Summary of changes required

| File | Change | Step |
|---|---|---|
| `src/core/music-knowledge/rhythm-harmony-recipes.ts` | Add `defaultCpm?: number` to `MusicalRecipe`; set `defaultCpm: 30` on cumbia, `defaultCpm: 40` on cueca | 06.2 |
| `src/agent/autopilot.ts` | Import `setBpm`; insert `if (recipe.defaultCpm !== undefined) setBpm(recipe.defaultCpm * 4)` after step 4b | 06.2 |
| `tests/music-knowledge/recipes.test.ts` | Add Invariant 10: `defaultCpm * 4 in bpmRange` | 06.2 |
| `tests/authentic-groove/default-tempo.test.ts` | New file: unit + integration tests for defaultCpm/tempo path | 06.2 |
| `src/render/rhythm-scene.ts` | Replace per-layer `RSTEPS` with `N = layer.steps.length` in rebuildRhythmGeo; replace `RSTEPS` with `N = g.layer.steps.length` in tickRhythm ring + dot loops; per-layer curStep formula | 06.3 |

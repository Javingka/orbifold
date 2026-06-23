<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0025 — Authentic Sample Palette + music-knowledge seam

- **Status:** Accepted — ratified by Pilot 2026-06-23
- **Date:** 2026-06-23
- **Initiative / Phase:** authentic-groove / Phase 01 (step 01.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 01 of the `authentic-groove` initiative introduces per-genre Strudel sample names so
that genre recipes (cumbia, samba, flamenco, etc.) produce code emitting culturally closer
instruments rather than the generic drum-machine abbreviations (`bd`, `hh`, `sd`, etc.).

The project will split into a **public AGPL executor** (runs Strudel) and a **proprietary
knowledge engine** (contains genre→instrument mappings). This ADR defines the seam between
those two layers and governs all design decisions for Phase 01.

### OD resolutions at Checkpoint #1

- **OD-1 → Option B:** Keep `AgentOutputSchema` pure. Add a generic `applySampleMap(layers,
  map)` helper in `apply.ts`; the recipe-application caller passes the map. `SCHEMA_VERSION`
  stays 6.
- **OD-2 → Option A:** Persist `strudelSample` — add `strudelSample: z.string().optional()`
  to `SavedRhythmLayerSchema` in `persistence.ts`. `SESSION_SCHEMA_VERSION` stays 5.
- **OD-3 → Option A:** Use nearest documented fallback where perceptibly closer; omit slots
  where no meaningful improvement exists. Document fallbacks with inline comments in the
  catalog.

---

## Decisions

### D1 — `RhythmLayer.strudelSample?: string`

**Decision:** Add an optional `strudelSample?: string` field to the `RhythmLayer` interface
in `src/core/rhythm/layers.ts`. The Strudel codegen (`rhythmLayerToStrudelLine`) emits
`strudelSample ?? sound` — that is, when `strudelSample` is present and non-empty it
overrides the generic `sound` name in the emitted pattern string; when absent the behavior
is identical to pre-Phase-01 code.

**JSDoc on the field (binding):**
```typescript
/**
 * Concrete Strudel sample name realizing this layer's abstract `sound` role
 * (ADR 0025 D1). When present, codegen emits it instead of `sound`.
 * Genre-agnostic — set only by the knowledge-side propagation path.
 */
strudelSample?: string;
```

**Codegen rule (binding):**
```typescript
// ADR 0025 D1: strudelSample overrides sound when set
const sampleName = layer.strudelSample ?? layer.sound;
```

This rule is applied in **both** code paths of `rhythmLayerToStrudelLine`:
- The euclid fallback path (empty `steps`, `euclid` present).
- The steps path (non-empty `steps`).

**Invariant:** `strudelSample` is never an empty string in practice — the knowledge catalog
only supplies verified non-empty names. The `?? sound` fallback handles `undefined`
(absent field) transparently.

**Rationale:** The `Sound` union (9 values: `bd`, `sd`, `hh`, etc.) is the **abstract role**
of the layer — what drum function it plays. `strudelSample` is the **concrete instrument
name** realizing it. The two must not be merged or conflated: the `Sound` field drives the
UI (icon, color, audibility logic) while `strudelSample` drives the audio output.

---

### D2 — `MusicalRecipe.sampleMap?: Partial<Record<Sound, string>>`

**Decision:** Add an optional `sampleMap` field to the `MusicalRecipe` interface in
`src/core/music-knowledge/rhythm-harmony-recipes.ts`:
```typescript
/**
 * Optional map from abstract Sound slot → concrete Strudel sample name (ADR 0025 D2).
 * Present only on genre-specific recipes. Values must be verified against the
 * inventory §2 (live tidalcycles/Dirt-Samples strudel.json, 2026-06-23).
 * Generic / pop recipes leave this undefined.
 */
sampleMap?: Partial<Record<Sound, string>>;
```

**Rules:**
- Only genre-specific recipes populate `sampleMap`. Generic/pop recipes (`pop-rock-backbeat`,
  `dorian-ritual-sparse`, `gospel-soul-euclid`, `aksak-dorian-odd`) omit it entirely
  (`undefined`).
- Every value in a `sampleMap` must appear in the inventory §2 verified sample list (or
  fallback list). No sample name may be introduced in code that was not confirmed in the
  inventory.
- Keys must be valid `Sound` values.

---

### D3 — Seam invariant (hardened from AG-D1)

**Decision:** The Strudel codegen (`src/core/codegen/`), `RhythmLayer` definition
(`src/core/rhythm/layers.ts`), `persistence.ts`, and any generic plumbing helper
(`src/agent/apply.ts`) must contain **no genre name** and **no hardcoded sample map**.
The only genre-to-sample knowledge lives inside `src/core/music-knowledge/`.

**What the codegen is permitted to know:** "When `strudelSample` is present, emit it
instead of `sound`." That is the entire contract. The codegen does not know which genres
exist, what instrument families map to which abbreviations, or that a fallback was used.

**Mechanical verification:** Before committing any step, run:
```bash
git grep -n \
  -e "'cumbia'" -e '"cumbia"' \
  -e "'cueca'" -e '"cueca"' \
  -e "'candombe'" -e '"candombe"' \
  -e "'samba'" -e '"samba"' \
  -e "'flamenco'" -e '"flamenco"' \
  -e "'milonga'" -e '"milonga"' \
  -e "'maqsum'" -e '"maqsum"' \
  -e "'baladi'" -e '"baladi"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```
Expected result: empty output (zero matches). A failing grep means the seam broke;
relocate the logic before committing.

---

### D4 — Propagation mechanism (OD-1 = Option B)

**Decision:** `recipeToAgentOutput` in `src/core/music-knowledge/recipe-engine.ts` is NOT
changed. It returns a standard `AgentOutput` with no `strudelSample` fields. The
`AgentOutputSchema` is NOT extended.

A generic plumbing helper is introduced in `src/agent/apply.ts`:

```typescript
/**
 * Overlay `strudelSample` onto a RhythmLayer array using a sample map
 * keyed by Sound slot (ADR 0025 D4). Genre-agnostic — receives the map
 * as a parameter; contains no genre name or hardcoded map of its own.
 * Layers whose Sound is absent from the map are returned unchanged.
 */
export function applySampleMap(
  layers: RhythmLayer[],
  map: Partial<Record<Sound, string>>
): RhythmLayer[]
```

The helper produces a new array (non-mutating) where each layer whose `sound` key is present
in `map` gains `strudelSample` set to `map[layer.sound]`. Layers not in the map are returned
unchanged (no `strudelSample`). Layers where `map[layer.sound]` is `undefined` are also
returned unchanged.

**Call site:** The call site that invokes both `recipeToAgentOutput` and then applies the
result via `applyRhythmSpec` is responsible for also calling `applySampleMap(layers,
recipe.sampleMap)` when `recipe.sampleMap` is defined. The helper is in plumbing (`apply.ts`)
but is handed the map from the knowledge side; it carries zero genre knowledge itself.

**Why Option B:** The consumer trace (inventory §1.4) confirms all paths from
`recipeToAgentOutput` to `RhythmLayer[]` pass through `apply.ts`. There is no non-`apply.ts`
consumer in the current codebase. Option B keeps `SCHEMA_VERSION = 6` unchanged and prevents
the LLM from emitting sample names (hallucinated sample names would produce Strudel silence).

---

### D5 — Persistence (OD-2 = Option A: persist)

**Decision:** Add `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema` in
`src/lib/persistence.ts`. Update `serializeSession` to include `strudelSample` when present.
Update `deserializeSession` to carry it through.

**Why no `SESSION_SCHEMA_VERSION` bump:** The change is additive and optional. Pre-Phase-01
sessions (version 5 blobs without `strudelSample`) parse cleanly — Zod treats the absent
field as `undefined`, and the codegen falls back to `sound`. No migration is needed; the
existing graceful-degradation mechanism handles it transparently.

**Benefit:** A session saved after applying a genre recipe reloads with authentic samples
intact. Without persistence, the session would sound generic on reload until the user
re-applies the recipe.

---

### D6 — Fallback policy (OD-3 = Option A: nearest documented fallback)

**Decision:** For genre recipes whose authentic instruments have no named sample in
`tidalcycles/Dirt-Samples` (as verified in inventory §2), the `sampleMap` entry uses the
nearest perceptibly closer sample from the verified list, with an inline comment:

```typescript
// fallback: no native '<authentic-instrument>' in @strudel/web@1.0.3
```

**Applied fallbacks (binding):**
- Struck idiophone roles (clave, caja, cajon, candombe drums): `'perc'` (ethnic percussion)
  rather than `'bd'` (kick drum). Comment: `// fallback: no native '<name>' in @strudel/web@1.0.3`.
- Snare/caixa roles emitted via the `hh` Sound slot: `'sd'` (snare drum) rather than `'hh'`
  (closed hi-hat). Comment: `// fallback: no native 'caixa' in @strudel/web@1.0.3`.
- Metal bell / shell roles (agogo, cascara): `'cb'` (cowbell). Comment: `// fallback: no native
  '<name>' in @strudel/web@1.0.3`.

**Omitted slots (Option A + selective):** Slots where no meaningful improvement is available
(guacharaca, tamborim, pandeiro — no close equivalent in pitch range or timbre) are omitted
from `sampleMap` entirely. The layer falls back to its generic `sound`. This is consistent
with OD-3 Option A ("omit slots where no meaningful improvement exists").

---

### D7 — Backward compatibility

**Decision:** All pre-Phase-01 sessions and all runtime states without `strudelSample` are
handled transparently:

1. **Codegen:** `const sampleName = layer.strudelSample ?? layer.sound;` — when `strudelSample`
   is `undefined` (absent), `sampleName === layer.sound`. Output is byte-identical to
   pre-Phase-01 codegen.

2. **Persistence:** `SavedRhythmLayerSchema` adds `strudelSample: z.string().optional()`.
   Pre-Phase-01 session blobs lack this key — Zod's default strip mode treats it as `undefined`.
   `deserializeSession` returns a layer without `strudelSample`. Codegen falls back to `sound`.
   No error, no data loss, no behavioral regression.

3. **`SESSION_SCHEMA_VERSION` stays 5:** No bump. The change is additive and optional; old
   sessions survive the parse without modification. The precedent is ADR 0020 D5 / ADR 0019
   D5 / ADR 0018 D3 / ADR 0013 D1.

4. **Reverting propagation wiring (step 01.4):** The `strudelSample` field on `RhythmLayer`
   and in the persistence schema is inert when no propagation path sets it. Reverting step 01.4
   alone restores the pre-phase-01 behavior with no other change needed.

---

## Consequences

### Files modified in Phase 01 steps 01.2–01.4

| File | Nature of change | Step |
|---|---|---|
| `docs/adr/0025-authentic-sample-palette.md` | This ADR | 01.2 |
| `src/core/rhythm/layers.ts` | Add `strudelSample?: string` to `RhythmLayer`; update `rhythmLayerToStrudelLine` | 01.2 |
| `src/lib/persistence.ts` | Add `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema`; update serialize/deserialize | 01.2 |
| `tests/authentic-groove/codegen-sample.test.ts` | New — plumbing codegen tests | 01.2 |
| `src/core/music-knowledge/rhythm-harmony-recipes.ts` | Add `sampleMap` to `MusicalRecipe`; populate for genre recipes | 01.3 |
| `tests/authentic-groove/sample-map.test.ts` | New — catalog data tests | 01.3 |
| `src/core/music-knowledge/recipe-engine.ts` | Wire propagation per D4 | 01.4 |
| `src/agent/apply.ts` | Add `applySampleMap` generic helper (D4, Option B) | 01.4 |
| `tests/authentic-groove/propagation.test.ts` | New — end-to-end propagation tests | 01.4 |

### Invariants preserved

- **`SCHEMA_VERSION` stays 6:** `AgentOutputSchema` is not extended (OD-1 Option B).
- **`SESSION_SCHEMA_VERSION` stays 5:** Additive optional field; old sessions parse cleanly (D7).
- **`core/**` purity:** `layers.ts` has no DOM/PIXI/Svelte imports. Unchanged.
- **Seam invariant (D3 / AG-D1):** No genre name or hardcoded sample map appears in
  plumbing files. Verified by the `git grep` command in D3.
- **AGPL-3.0 header:** Present and unchanged on all new files.

### Deferred

- **Custom sample packs (`samples()` call):** Loading ethnic sample packs beyond
  `tidalcycles/Dirt-Samples` is out of scope for Phase 01. Future phases may add
  `samples()` calls to load richer packs (authentic guacharaca, surdo, etc.).
- **Phase 02 — per-hit accent/velocity:** Not in scope.
- **Phase 03 — swing/groove feel:** Not in scope.
- **Phase 04 — role-based polyrhythmic layering:** Not in scope.

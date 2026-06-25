<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 Inventory — Multi-Layer Recipes + Base-Lock Mechanism

**Date:** 2026-06-25
**Phase file:** `docs/authentic-groove/phases/phase-05.md`
**Pilot clarifications in force:**
1. ONLY `bd` (the 12-step kick) is locked in cueca. `cp` (palmas) and `hh` (subdivision) are FREE layers — the agent can modify them.
2. `RecipeLayer` embeds the step pattern directly (`binary`, `steps`, `euclid?`). `rhythmId` is optional and for traceability only — NOT used at runtime by `recipeToAgentOutput`.
3. Option A for shaker: fetch FreePats world-percussion repo and check for shaker/maracas; if found CC0 propose as 4th FreePats sample; if not, `cp` fallback.

---

## §1 — Shaker / Maracas Inquiry

### Live fetch results

**Root folder listing** (`GET https://api.github.com/repos/freepats/world-percussion/contents/samples`):

```
Bongos
CajonFlamenco
Castanets
Claves
Conga
Darbuka
EggShaker
HandClap
HighConga
LowConga
Maracas
MutedConga
MutedLowConga
Tambourine
```

**`EggShaker` folder contents:** 11 FLAC files
```
fast_01.flac, fast_02.flac, fast_03.flac, fast_04.flac,
fast_06.flac, fast_07.flac, fast_08.flac, fast_09.flac,
fast_10.flac, fast_11.flac, fast_12.flac
```

**`Maracas` folder contents:** 18 FLAC files
```
01_01.flac, 01_02.flac, 01_03.flac, 01_04.flac, 01_05.flac, 01_06.flac,
01_07.flac, 01_08.flac, 02_01.flac, 02_02.flac, 02_04.flac, 02_05.flac,
02_06.flac, 02_07.flac, 02_08.flac, 02_09.flac, 02_10.flac, 02_12.flac
```

**License confirmation** (from `README.txt` at repo root):
> "Published under the terms of Creative Commons CC0 public domain dedication:
> https://creativecommons.org/publicdomain/zero/1.0/"

Both `EggShaker` and `Maracas` folders are CC0. The `README.txt` also confirms Claves and Conga were derived from the Versilian Community Sample Library (also CC0).

### Finding and proposal

Two shaker/rattle instruments are available CC0:
- **`EggShaker`** — 11 fast attack samples; bright rattling shaker texture. Best fit for a high-energy cumbia or guacharaca-style percussive layer.
- **`Maracas`** — 18 samples across two articulation groups (01_xx and 02_xx); softer maraca texture.

**Proposal:** Add `EggShaker` samples as a 4th FreePats sample named **`shaker`** in `buildSampleMap`. Select 4 files for round-robin variety, following the same pattern as Phase 04. The egg shaker is culturally closer to the guacharaca (Colombian scraper percussion) than `cp` (hand clap), which has a distinct sharp attack that doesn't approximate a shaker or guacharaca texture.

Recommended selection: `fast_01.flac`, `fast_04.flac`, `fast_07.flac`, `fast_10.flac` — these four provide round-robin variety across the set. All are confirmed CC0.

**Registration proposal:**
```typescript
// sample-map.ts buildSampleMap addition:
shaker: ['shaker_0', 'shaker_1', 'shaker_2', 'shaker_3'].map((f) => `${b}samples/${f}.ogg`),
```

OGG conversion: same ffmpeg command as Phase 04 (`-codec:a libvorbis -qscale:a 5 -ac 1 -ar 44100`).

**Fallback status:** `cp` fallback is NOT needed. A genuine CC0 shaker source has been found and is proposed. The cumbia `hh` layer will use `shaker` (FreePats EggShaker CC0), not `cp`.

**Prior Phase 01 inventory citation:** Phase 01 inventory §2 confirmed `'sh'` does not exist in dirt-samples (only `'sd'`, `'hh'`, etc. in the standard set). That finding is still in force — there is no `sh` or `shaker` in Dirt-Samples. The FreePats EggShaker is the authentic CC0 addition.

---

## §2 — `MusicalRecipe.layers` Field Design

### Exact TypeScript declarations

**New `RecipeLayer` interface** (in `rhythm-harmony-recipes.ts`, before `MusicalRecipe`):

```typescript
/**
 * A single self-contained layer in a multi-layer recipe declaration.
 *
 * The step pattern is embedded directly (binary/steps) so the recipe is
 * readable without looking up the rhythm catalog. `rhythmId` is an optional
 * cross-reference for traceability only — NOT used at runtime.
 *
 * When `layers` is present on a `MusicalRecipe`, `recipeToAgentOutput` reads
 * sound from `layers[i].sound` instead of the index-based `soundForIndex(i)`.
 */
export interface RecipeLayer {
  /** Abstract sound role. Drives UI icon/color and audibility logic. */
  sound: Sound;
  /**
   * When true, this layer is part of the recipe's cultural signature.
   * After `applyRecipeById`, `applyLockedFlags` stamps `locked: true` on the
   * session layer with matching `sound`. Genre-agnostic plumbing; the lock
   * flag is declared here in the knowledge layer, propagated by apply.ts.
   */
  locked?: boolean;
  /** Binary step pattern string; length must equal `steps`. */
  binary: string;
  /** Total step count (12 for 6/8 compound, 16 for 4/4). */
  steps: number;
  /**
   * Optional Euclidean parameters — descriptive only. Present when the
   * pattern was derived from `bjorklund(k, n, rot)`. Not used at runtime;
   * the binary string is the authoritative pattern.
   */
  euclid?: { k: number; n: number; rot: number };
  /**
   * Inline sampleMap override (ADR 0025 D2 extension). When present,
   * replaces the top-level `sampleMap` entry for this layer's sound slot.
   * `recipeToAgentOutput` does NOT read this field — it is consumed only by
   * the `applySampleMap` call in the recipe-application path.
   */
  strudelSample?: string;
  /**
   * Optional cross-reference into RHYTHM_CATALOG. For traceability only.
   * NOT used at runtime by `recipeToAgentOutput`. When present, integrity
   * tests assert it resolves in the catalog.
   */
  rhythmId?: string;
}
```

**Updated `MusicalRecipe` interface** (add `layers` field after `sampleMap`):

```typescript
/**
 * Optional multi-layer declaration. When present, supersedes `rhythmIds` for
 * sound assignment and lock propagation. Each RecipeLayer is self-contained:
 * the step pattern (binary/steps) is embedded directly so the recipe is
 * readable without looking up the rhythm catalog.
 *
 * Invariants (enforced by tests):
 *  7. Every `layers[i].sound` is a valid Sound value.
 *  8. `layers[i].binary.length === layers[i].steps`.
 *  9. If `layers[i].rhythmId` is present, it resolves in RHYTHM_CATALOG
 *     (optional cross-reference — not used at runtime).
 */
layers?: ReadonlyArray<RecipeLayer>;
```

### Consistency rule between `rhythmIds` and `layers`

`rhythmIds` is retained on `MusicalRecipe` and must be kept consistent with `layers` when both are present. The updated recipe integrity test enforces:
- When `recipe.layers` is present: `recipe.rhythmIds` must equal `recipe.layers.map(l => l.rhythmId ?? '')`.
- Every `recipe.layers[i].rhythmId` (when present) must resolve in `RHYTHM_CATALOG`.
- Every `recipe.layers[i].sound` must be a valid `Sound` value.

For recipes without `layers`, the existing `rhythmIds`-based tests are unchanged.

### Fallback behavior for recipes without `layers`

The 13 existing recipes without `layers` (all recipes except `cueca-chilena-folk` and `cumbia-latina-groove` after this phase) continue to use `rhythmIds` + index-based sound assignment via `soundForIndex(i)`. No change to their behavior.

### `readonly` recommendation

`layers` should be `ReadonlyArray<RecipeLayer>` (frozen at declaration time) matching the immutable nature of the recipe data. Individual `RecipeLayer` objects are plain object literals — no class needed.

---

## §3 — `RhythmLayer.locked` Field and `SavedRhythmLayerSchema` Update

### Field declaration in `RhythmLayer` (`src/core/rhythm/layers.ts`)

```typescript
/**
 * When true, this layer is part of a recipe's cultural signature and must not
 * be replaced by agent rhythm changes. Set by `applyLockedFlags()` after a
 * recipe is applied; cleared when a new recipe replaces all layers.
 *
 * Genre-agnostic plumbing: the flag value is stamped by the recipe-application
 * path (`applyLockedFlags` in apply.ts). The knowledge of WHICH layers to lock
 * lives only in `src/core/music-knowledge/` (RecipeLayer.locked declarations).
 *
 * Per Phase 05 §3 (ADR 0025 extension, additive optional).
 */
locked?: boolean;
```

### `SavedRhythmLayerSchema` addition (`src/lib/persistence.ts`)

Add after the existing `muted` and `solo` fields:

```typescript
/** Phase 05: additive optional — pre-Phase-05 sessions without this field parse cleanly. */
locked: z.boolean().optional(),
```

### `SESSION_SCHEMA_VERSION` stays 5

The change is additive and optional. Pre-Phase-05 sessions without `locked` parse cleanly under Zod's default strip mode — the absent field is treated as `undefined`. No migration is needed. This is the same precedent as `strudelSample` (Phase 01, ADR 0025 D5) and `muted`/`solo`.

### Backward-compatibility guarantee

`locked: undefined` is treated as `false` in ALL code paths:
- `applyRhythmSpec` merge logic: `if (currentLayer.locked === true)` — `undefined` passes through as "not locked" (full replace behavior preserved).
- Serialization: `serializeSession` only writes `locked` when truthy (same pattern as `strudelSample`). Sessions without locked layers produce identical blobs to pre-Phase-05.
- Deserialization: `deserializeSession` carries through `locked` when present; absent → `undefined` → treated as unlocked.

---

## §4 — `applyRhythmSpec` Lock-Preservation Logic

### Algorithm (verbatim, to be implemented exactly as stated)

1. Before building the new layer array, read `get(sessionStore).rhythm.layers` to identify currently locked layers:
   ```typescript
   const currentLayers = get(sessionStore).rhythm.layers;
   const lockedLayers = currentLayers.filter((l) => l.locked === true);
   const lockedSounds = new Set(lockedLayers.map((l) => l.sound));
   ```

2. Process `spec.layers` to build proposed unlocked layers: iterate as in the current implementation (euclid or steps variant), but SKIP any proposed layer whose `sound` is in `lockedSounds`:
   ```typescript
   for (const L of spec.layers) {
     const sound: Sound = SK_SOUNDS.includes(L.sound) ? (L.sound as Sound) : 'bd';
     if (lockedSounds.has(sound)) continue; // Skip — locked layer preserved
     // ... build layer as before, push to layers[]
   }
   ```

3. Assemble final layer array: **locked layers first** (their cultural signature role), then unlocked proposed layers:
   ```typescript
   const finalLayers = [...lockedLayers, ...newUnlockedLayers];
   ```

4. Store the final array (same `sessionStore.update` call as current implementation):
   ```typescript
   if (finalLayers.length === 0) return;
   sessionStore.update((s) => ({
     ...s,
     rhythm: { ...s.rhythm, layers: finalLayers },
   }));
   ```

### Order decision

Locked layers come FIRST in the resulting array. Rationale: locked base layers are the cultural signature (e.g., cueca zapateado kick); they define the pattern's identity. The UI renders layers in array order; having the signature layer first is semantically correct and consistent with how a musician thinks of "the foundation on top of which variations are layered."

### Backward-compatibility guarantee

When `lockedLayers` is empty (the normal case for all pre-Phase-05 sessions and for any session where no recipe has been applied), `lockedSounds` is an empty `Set`, no proposed layer is skipped, `finalLayers = [...[], ...newUnlockedLayers]`, and the behavior is **identical to the current implementation** (full replace). The early-return guard `if (finalLayers.length === 0) return` is preserved.

### `setLastRecipeApplied(null)` retention

The call at the top of `applyRhythmSpec` is kept — any direct agent call clears the recipe badge. `applyRecipeById` calls `setLastRecipeApplied(display)` after, which overwrites the null (last write wins — existing behavior unchanged).

### `applyRecipeById` vs direct call distinction

- **`applyRecipeById`**: calls `applyRhythmSpec` (which now merges locked) THEN immediately calls `applyLockedFlags` (see §5). Since `applyRhythmSpec` was called from within the recipe path, and the recipe defines a fresh set of layers, the merge behavior here is intentionally bypassed by design: the recipe application starts from a clean state because `applyRecipeById` first resets via `applyRhythmSpec` (which replaces ALL unlocked layers — and initially, before the recipe was applied, there are no locked layers from the previous recipe). Then `applyLockedFlags` stamps the new locks. This works correctly because the previous recipe's locks have been replaced (they were created by the previous `applyLockedFlags` call).
- **Direct agent call**: no `applyLockedFlags` call follows, so existing locked layers from the current recipe are preserved by the merge logic.

**Important subtlety for `applyRecipeById`:** When switching from recipe A to recipe B, recipe A's locked layers exist in the session. When `applyRhythmSpec` is called with recipe B's layers, the merge logic WOULD skip recipe B's layers whose sounds match recipe A's locked sounds. This would be wrong. The fix: `applyRecipeById` must call a new helper `clearLockedFlags()` (or directly call `setLockedFlags([])`) BEFORE calling `applyRhythmSpec`. Alternatively (simpler): `applyRecipeById` calls a new internal function `applyRhythmSpecFull` that bypasses the merge (or passes a `{ skipLockCheck: true }` flag). The recommended approach for Option B is:

**Recommended fix:** Add a `force?: boolean` parameter to `applyRhythmSpec`:
```typescript
export function applyRhythmSpec(spec: RhythmSpec, opts?: { force?: boolean }): void
```
When `opts?.force === true`, the lock-preservation logic is skipped (full replace). `applyRecipeById` calls `applyRhythmSpec(engineOutput.rhythm, { force: true })`. The agent always calls `applyRhythmSpec` without the `opts` argument (defaults to merge behavior). This is simpler and cleaner than `clearLockedFlags()`.

---

## §5 — `applyRecipeById` + `recipeToAgentOutput` Changes

### Option B: `applyLockedFlags` helper

The recommended approach is **Option B** as stated in the phase spec. The lock flag does NOT flow through `AgentOutputSchema` (that would break OD-1 from ADR 0025). Instead:

**New function in `apply.ts`:**

```typescript
/**
 * Stamp `locked: true` on session rhythm layers matching `lockedSounds`.
 *
 * Called by the recipe-application path after `applyRhythmSpec` to mark the
 * recipe's cultural signature layers. Genre-agnostic — receives a list of
 * Sound values, not genre names. Per Phase 05 §5 (Option B).
 *
 * Layers whose `sound` is NOT in `lockedSounds` are unchanged (locked remains
 * undefined or false). Layers already in the store with matching sounds get
 * `locked: true` stamped.
 */
export function applyLockedFlags(lockedSounds: Sound[]): void {
  const soundSet = new Set<Sound>(lockedSounds);
  sessionStore.update((state) => ({
    ...state,
    rhythm: {
      ...state.rhythm,
      layers: state.rhythm.layers.map((layer) =>
        soundSet.has(layer.sound) ? { ...layer, locked: true } : layer
      ),
    },
  }));
}
```

### AG-D1 compliance

`applyLockedFlags` is genre-agnostic: it receives a list of `Sound` values (e.g., `['bd']`), not genre names. The knowledge of WHICH sounds to lock is declared in `MusicalRecipe.layers[i].locked` inside `src/core/music-knowledge/`. The caller (`applyRecipeById` in `autopilot.ts`) extracts the locked sounds from the recipe and passes them to `applyLockedFlags`. Zero genre names in `apply.ts`.

### `applyRecipeById` call order (updated)

```
1. applyRhythmSpec(engineOutput.rhythm, { force: true })  — full replace (bypasses merge)
2. applySampleMap(recipe.sampleMap ?? {})                 — overlay strudelSample
3. applyLockedFlags(lockedSoundsFromRecipe)               — stamp locked: true
4. applyHarmonySpec(engineOutput.harmony)                 — clears lastRecipeApplied
5. setLastRecipeApplied(display)                          — re-sets badge (last write wins)
6. requeueLive()
7. auto-play heuristic
```

Where `lockedSoundsFromRecipe` is derived from the recipe's `layers` field:
```typescript
const lockedSounds: Sound[] = (recipe.layers ?? [])
  .filter((l) => l.locked === true)
  .map((l) => l.sound);
```

If `recipe.layers` is absent (10 existing recipes without multi-layer declaration), `lockedSounds` is `[]` and `applyLockedFlags([])` is a no-op.

### `recipeToAgentOutput` changes

When `recipe.layers` is present, use `recipe.layers[i].sound` for sound assignment instead of `soundForIndex(i)`:

```typescript
// Updated loop in recipeToAgentOutput:
for (let i = 0; i < recipe.rhythmIds.length; i++) {
  const rhythmId = recipe.rhythmIds[i];
  const entry = getRhythmById(rhythmId);
  if (entry === undefined) return null;

  // Sound: prefer recipe.layers[i].sound over index-based default
  const sound: SkSound =
    recipe.layers !== undefined && recipe.layers[i] !== undefined
      ? (recipe.layers[i].sound as SkSound)
      : recipe.rhythmIds.length === 1 && i === 0 && options?.layerSound !== undefined
        ? (options.layerSound as SkSound)
        : soundForIndex(i);

  // ... rest of euclid/steps expressibility logic unchanged
}
```

The `options.layerSound` override continues to apply only when `recipe.layers` is absent AND the recipe has exactly one layer.

`recipeToAgentOutput` does NOT read `RecipeLayer.locked`, `RecipeLayer.binary`, or `RecipeLayer.strudelSample` — those are consumed by the recipe-application path, not by the agent output translator.

### `setLastRecipeApplied` remains last

`setLastRecipeApplied(display)` is called after `applyLockedFlags` (step 3 in the new call order above). The `applyHarmonySpec` call at step 4 clears `lastRecipeApplied` (existing behavior); `setLastRecipeApplied(display)` at step 5 overwrites it. Last write wins is still correct.

---

## §6 — Agent `stateSnapshot` Locked Info

### `stateSnapshot` change

In `sendEvolution()` in `agent.ts`, the `stateSnapshot.rhythm.layers` mapping adds `locked`:

```typescript
layers: state.rhythm.layers.map((layer) => {
  if ('euclid' in layer && layer.euclid) {
    return { sound: layer.sound, euclid: layer.euclid, locked: layer.locked ?? false };
  }
  return { sound: layer.sound, steps: layer.steps.join(''), locked: layer.locked ?? false };
}),
```

This is a **payload-only change** — the LLM-facing JSON gains a `locked` field per layer. The `sessionStore` structure, `RhythmLayer` types, and `AgentOutputSchema` are unchanged. The stateSnapshot is never persisted or validated against a schema (it is constructed fresh per call, per ADR 0022 D3).

### `SYSTEM_PROMPT_EVOLUTION` update

Add a locked-layer rule **before** the existing rules (renumbering 1→2, 2→3, etc.) or after rule 1 as specified in the phase file. Per the phase spec instruction, add as rule 2 and renumber existing rules 2–7 to 3–8:

```
2. CAPAS BLOQUEADAS: si `locked: true` aparece en una capa del stateSnapshot, NO la modifiques ni la omitas. Solo propón cambios en capas con `locked: false` o sin campo `locked`. Las capas bloqueadas son la firma rítmica cultural de la receta activa.
```

This is in Spanish, consistent with the existing `SYSTEM_PROMPT_EVOLUTION` language (confirmed by reading the agent.ts file in Phase 05 required reading).

**Note:** The Dev reading the `agent.ts` file must confirm that `SYSTEM_PROMPT_EVOLUTION` is defined in Spanish before applying this change verbatim. If it is in English, the rule should be written in English to match.

### ADR 0022 D3 compliance

`sendEvolution()` never pushes to `chatHistory` and never calls `applyBlockSave`. The `stateSnapshot` is constructed fresh per call. This change does not violate D3 — the stateSnapshot is a ONE-WAY payload sent to the LLM; adding a `locked` field does not create a circular dependency or persistence concern.

---

## §7 — Cueca Multi-Layer Pattern Design

### Layer 1 — `bd` (kick / zapateado): LOCKED

- **Catalog entry:** `cueca-chilena-base` (id: `'cueca-chilena-base'`, steps: 12, binary: `'100100100100'`, euclid: `{k:4, n:12, rot:0}`)
- **Expressibility:** `strudelStrategy === 'euclid'` and `euclid.n = 12 ≤ 16` → euclid-expressible. Confirmed.
- **Locked:** `true` (Pilot-confirmed: the zapateado kick defines the cueca identity)
- **New catalog entry needed:** No — `cueca-chilena-base` already exists.

### Layer 2 — `cp` (palmas / clap): FREE (not locked)

- **Target pattern:** Onsets at steps 4 and 10 (0-indexed) in a 12-step pattern → binary `'000010000010'` (2 onsets)
- **Catalog check:** No existing 12-step struct entry with this binary exists in `RHYTHM_CATALOG`. The existing `buleria-12` (binary: `'100011010110'`) and `solea-12` (binary: `'100100101010'`) are different patterns. `standard-12` is `E(4,12,0)` = `'100100100100'` (same as the kick, wrong).
- **Decision: NEW catalog entry needed.**
  - Proposed id: `'cueca-palmas-12'`
  - Proposed name: `'Cueca Palmas (12-step, struct)'`
  - Family: `'cueca'`
  - Traditions: `['Chilean folk-inspired', 'cueca']`
  - Meter: `'6/8'`
  - Steps: 12
  - Binary: `'000010000010'`
  - Onsets: `[4, 10]`
  - Mini: `~ ~ ~ ~ x ~ ~ ~ ~ ~ x ~`
  - strudelStrategy: `'struct'` (non-Euclidean at 12 steps — `E(2,12,0)` = `'100000100000'` is different)
  - Roles: `['timeline', 'groove']`
  - **Note on expressibility:** Steps-12 struct entries are NOT currently expressible by `recipeToAgentOutput` (only `steps === 16` struct entries pass `isRhythmIdExpressible`). However, `recipeToAgentOutput` for recipes with `layers` present uses the binary from `RecipeLayer.binary` directly, bypassing catalog expressibility. The `rhythmId` on the `RecipeLayer` is for traceability only. The cueca palmas layer will be emitted correctly because the recipe's `layers` field carries the binary string directly. `getExpressibleRecipes()` does NOT need to filter on `layers` entries — it only checks `rhythmIds`. The cueca recipe will need an update to its `rhythmIds` to include the palmas entry IF we want `getExpressibleRecipes` to include it; but since the recipe uses `layers` for sound assignment, and expressibility is checked via `rhythmIds`, the `rhythmIds` array must remain consistent. **Resolution:** For recipes with `layers`, `getExpressibleRecipes` should check `layers[i].rhythmId` (when present) OR skip the check (since `layers` is self-contained). The inventory recommends keeping `rhythmIds` consistent with `layers` and updating `getExpressibleRecipes` to handle 12-step struct entries when they appear in recipes with `layers` — OR simply adding 12-step struct expressibility. The simpler resolution: update `getExpressibleRecipes` to also accept `strudelStrategy === 'struct' && steps === 12` when the recipe has a `layers` declaration (the binary is self-contained). See §2 note on consistency.

  **Practical resolution for step 05.4:** The cueca recipe's `layers` field carries the binary directly. `recipeToAgentOutput` reads rhythm from the catalog via `rhythmIds` (euclid/steps expressibility). Since palmas is NOT expressible via the standard euclid/steps16 path, the cueca recipe emits only the kick via `recipeToAgentOutput`. The palmas and hh layers are DEFINED in `recipe.layers` but `recipeToAgentOutput` still iterates `recipe.rhythmIds` to build the `AgentOutput`. This means `recipeToAgentOutput` needs a NEW path: when `recipe.layers` is present, iterate `recipe.layers` to build layers using `layers[i].binary` directly (steps variant: `layers[i].binary.split('').map(Number)`). This bypasses the catalog lookup entirely for the layer pattern — the catalog `rhythmId` is only for traceability. This is the intended design per the phase architectural note.

  **Updated `recipeToAgentOutput` path when `recipe.layers` is present:**
  - Iterate `recipe.layers` (NOT `recipe.rhythmIds`)
  - For each `RecipeLayer`:
    - Sound: `layers[i].sound`
    - If `layers[i].binary.length === layers[i].steps` (always true by invariant 8): emit as steps variant using `layers[i].binary.split('').map(Number)`
    - OR if `layers[i].euclid` is present AND `layers[i].euclid.n <= 16`: emit as euclid variant using the `euclid` field
  - The result is an `AgentOutput` with layers built from the recipe's self-contained patterns.
  - `AgentOutputSchema.safeParse` validates the final output.

- **`cueca-chilena-syncopated` reuse:** The existing `cueca-chilena-syncopated` (E(5,12,2), binary: `'010100101010'`) is NOT used in the new multi-layer cueca recipe. It remains in the catalog as a standalone rhythmic variation usable by the agent or other recipes; it is not assigned to any layer in `cueca-chilena-folk`.

### Layer 3 — `hh` (subdivision): FREE (not locked)

- **Target pattern:** E(6,12,0) = `'101010101010'` (alternating 8th notes, every 2nd step in 12)
- **Catalog check:** No existing 12-step entry with this binary. The `four-of-eight` entry is `E(4,8,0)` = `'10101010'` (8 steps, different). `eighth-notes-16` is E(8,16,0) (16 steps). Neither matches.
- **Decision: NEW catalog entry needed.**
  - Proposed id: `'cueca-subdivision-12'`
  - Proposed name: `'Cueca 8th-Note Subdivision (12-step, euclid)'`
  - Family: `'straight'`
  - Traditions: `['Chilean folk-inspired', 'cueca', '6/8 compound']`
  - Meter: `'6/8'`
  - Steps: 12
  - Binary: `'101010101010'` — E(6,12,0)
  - Euclid: `{k:6, n:12, rot:0}`
  - Onsets: `[0, 2, 4, 6, 8, 10]`
  - Mini: `'x ~ x ~ x ~ x ~ x ~ x ~'`
  - strudelStrategy: `'euclid'`
  - Roles: `['groove', 'decoration']`
  - **Expressibility:** euclid-expressible (`n=12 ≤ 16`). Confirmed.

### Cueca `RecipeLayer` declarations for step 05.4

```typescript
layers: [
  {
    sound: 'bd',
    binary: '100100100100',
    steps: 12,
    euclid: { k: 4, n: 12, rot: 0 },
    locked: true,           // zapateado kick — cultural signature, LOCKED
    rhythmId: 'cueca-chilena-base',
  },
  {
    sound: 'cp',
    binary: '000010000010',
    steps: 12,
    locked: false,          // palmas — FREE (agent can vary)
    rhythmId: 'cueca-palmas-12',
  },
  {
    sound: 'hh',
    binary: '101010101010',
    steps: 12,
    euclid: { k: 6, n: 12, rot: 0 },
    locked: false,          // subdivision — FREE
    rhythmId: 'cueca-subdivision-12',
  },
]
```

### Updated `rhythmIds` for cueca recipe

To maintain consistency (invariant: `rhythmIds` equals `layers.map(l => l.rhythmId ?? '')`):
```typescript
rhythmIds: ['cueca-chilena-base', 'cueca-palmas-12', 'cueca-subdivision-12'],
```

This means the catalog entries for `cueca-palmas-12` and `cueca-subdivision-12` must exist before step 05.4. They are proposed for step 05.2.

---

## §8 — Cumbia Multi-Layer Pattern Design

### Layer 1 — `bd` (conga caja): LOCKED

- **Catalog entry:** `cumbia-caja` (id: `'cumbia-caja'`, steps: 16, binary: `'1001001010001000'`, strudelStrategy: `'struct'`)
- **Expressibility:** `strudelStrategy === 'struct'` and `steps === 16` → steps16-expressible. Confirmed.
- **Locked:** `true` (Pilot-confirmed for cumbia)
- **New catalog entry needed:** No — `cumbia-caja` already exists.

### Layer 2 — `hh` (shaker / guacharaca): LOCKED

**§1 finding:** FreePats `EggShaker` (CC0, 11 FLAC files) is proposed as a 4th FreePats sample named `shaker`.

- **Pattern choice:** E(8,16,0) = `'1010101010101010'` (alternating 8th notes = `eighth-notes-16` in the catalog). This is the straight 8th-note subdivision, which approximates the continuous shaker texture of the cumbia guacharaca (a cylindrical scraper played on every 8th note in the bar).
- **Catalog check:** `eighth-notes-16` exists: id `'eighth-notes-16'`, binary `'1010101010101010'`, euclid `{k:8, n:16, rot:0}`. No new catalog entry needed.
- **Expressibility:** euclid-expressible (`n=16 ≤ 16`). Confirmed.
- **Locked:** `true` (the shaker layer is the second cultural signature element of cumbia alongside the caja)
- **Sound slot:** `hh` (consistent with ADR 0025 D6 precedent for shaker roles)
- **Sample override:** `strudelSample: 'shaker'` (the FreePats EggShaker)

### Cumbia `RecipeLayer` declarations for step 05.4

```typescript
layers: [
  {
    sound: 'bd',
    binary: '1001001010001000',
    steps: 16,
    locked: true,           // conga caja — cultural signature, LOCKED
    strudelSample: 'conga', // FreePats Conga CC0
    rhythmId: 'cumbia-caja',
  },
  {
    sound: 'hh',
    binary: '1010101010101010',
    steps: 16,
    euclid: { k: 8, n: 16, rot: 0 },
    locked: true,           // guacharaca/shaker — LOCKED
    strudelSample: 'shaker', // FreePats EggShaker CC0
    rhythmId: 'eighth-notes-16',
  },
]
```

### Updated `sampleMap` for cumbia recipe

The existing `sampleMap: { bd: 'conga' }` is retained. The `hh` entry is ADDED:
```typescript
sampleMap: {
  bd: 'conga',    // conga: FreePats Conga (CC0) — Phase 04
  hh: 'shaker',  // shaker: FreePats EggShaker (CC0) — Phase 05
},
```

The `strudelSample` fields on the `RecipeLayer` objects and the top-level `sampleMap` entries serve the same function. The `applySampleMap(recipe.sampleMap ?? {})` call in the recipe application path will stamp `strudelSample: 'conga'` on the `bd` layer and `strudelSample: 'shaker'` on the `hh` layer. The `RecipeLayer.strudelSample` field provides the same information inline for traceability.

### Updated `rhythmIds` for cumbia recipe

```typescript
rhythmIds: ['cumbia-caja', 'eighth-notes-16'],
```

### Audio file acquisition needed in step 05.4

If the `shaker` sample is added (Option A confirmed), step 05.4 must also update:
- `src/audio/sample-map.ts` — add `shaker` entry to `buildSampleMap`
- `src/audio/strudel.ts` — no separate registration needed if `buildSampleMap` is the sole registry
- `public/samples/` — add 4 OGG files: `shaker_0.ogg`, `shaker_1.ogg`, `shaker_2.ogg`, `shaker_3.ogg`
- `public/samples/LICENSE.txt` — update to include EggShaker source attribution
- `tests/authentic-groove/sample-registration.test.ts` — cover `shaker`
- `tests/authentic-groove/sample-map.test.ts` — cover cumbia `hh → 'shaker'`

EggShaker files to acquire from FreePats world-percussion: `fast_01.flac`, `fast_04.flac`, `fast_07.flac`, `fast_10.flac` → convert to `shaker_0.ogg`, `shaker_1.ogg`, `shaker_2.ogg`, `shaker_3.ogg` using the Phase 04 ffmpeg command.

---

## Summary of New Catalog Entries Required

| ID | Steps | Strategy | Binary | Needed for |
|---|---|---|---|---|
| `cueca-palmas-12` | 12 | struct | `'000010000010'` | cueca `cp` layer (§7) |
| `cueca-subdivision-12` | 12 | euclid E(6,12,0) | `'101010101010'` | cueca `hh` layer (§7) |

No new catalog entry for cumbia — `cumbia-caja` and `eighth-notes-16` already exist.

## Summary of New Sample Files Required

| Sample name | Source | Files | Action |
|---|---|---|---|
| `shaker` | FreePats EggShaker CC0 | `fast_01.flac`, `fast_04.flac`, `fast_07.flac`, `fast_10.flac` | Acquire in step 05.4, convert to OGG |

## Open Design Questions Resolved

1. **Cueca lock rule:** Only `bd` locked. `cp` and `hh` are free layers. (Pilot-confirmed)
2. **Shaker source:** FreePats EggShaker CC0 found — Option A proceeds. No `cp` fallback needed.
3. **`RecipeLayer.rhythmId` usage:** Optional traceability field only; not used at runtime. (Phase spec confirmed)
4. **`recipeToAgentOutput` iteration:** When `recipe.layers` is present, iterate `recipe.layers` (not `recipe.rhythmIds`) and build layers from `layers[i].binary` directly. This is the key implementation insight that makes 12-step palmas expressible without changing `AgentOutputSchema`.
5. **`applyRecipeById` force-replace:** Use `opts?: { force?: boolean }` parameter to bypass merge logic during recipe application.
6. **`cueca-chilena-syncopated` usage:** Not used in the new multi-layer cueca recipe. Remains in catalog as standalone.
7. **Catalog comment discrepancy:** Line 171 of `rhythm-catalog.ts` lists `cueca-chilena-syncopated` under "Struct 12-step" but the actual code uses `euclidEntry`. The comment is incorrect and should be updated: struct 12-step has 2 entries (bulería, soleá), not 3.

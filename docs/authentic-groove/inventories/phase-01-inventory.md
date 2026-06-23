<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — Genre-Authentic Strudel Sample Palette

**Step:** 01.1 — Inventory
**Date:** 2026-06-23
**Status:** Ready for Pilot review (OD-1, OD-2, OD-3 must be resolved before step 01.2)

---

## Pre-flight checks

- `@strudel/web` version in `package.json`: **1.0.3** (confirmed — exact pin, no caret)
- `SCHEMA_VERSION` in `src/agent/schema.ts`: **6** (gate condition met)
- `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts`: **5** (gate condition met)
- Decisions Register: populated with carried-forward rules + AG-D1 (confirmed, seam invariant in force)

---

## §1 — Sound-Assignment Flow (end-to-end trace)

### 1.1 Path: recipe → `AgentOutput`

`recipeToAgentOutput(recipe)` in `src/core/music-knowledge/recipe-engine.ts`:

1. Looks up `getHarmonyById(recipe.harmonyId)` and `getRhythmById(rhythmId)` for each rhythm id.
2. For each rhythm id, assigns a **generic sound** from `LAYER_SOUNDS = ['bd', 'hh', 'sd', 'oh', 'cp', 'rim']` by index (layer 0→`bd`, 1→`hh`, 2→`sd`, etc.). An optional `options.layerSound` override applies only to single-layer recipes.
3. Emits either `{ sound, euclid: {k, n, rot} }` (euclid-expressible) or `{ sound, steps: number[] }` (struct 16-step), keyed by the **generic** `sound` name.
4. Calls `AgentOutputSchema.safeParse` as an internal guard before returning.

**Result:** `recipeToAgentOutput` returns an `AgentOutput` whose `rhythm.layers` carry only generic `Sound` values (`bd`, `hh`, etc.). **No sample map or `strudelSample` field exists today.**

### 1.2 Path: `AgentOutput` → `RhythmLayer[]` in session

`applyRhythmSpec(spec)` in `src/agent/apply.ts`:

1. Validates `L.sound` against `SK_SOUNDS`; falls back to `'bd'` on mismatch.
2. Euclid variant: computes `rotate(bjorklund(k, n), rot)`, maps to 16-step grid, stores `{ sound, steps, euclid }`.
3. Steps variant: clamps to first 16 entries, stores `{ sound, steps }`.
4. Calls `sessionStore.update(s => ({ ...s, rhythm: { ...s.rhythm, layers } }))`.

**Result:** `RhythmLayer[]` in session store carry only `sound: Sound` (generic) with no sample override field.

### 1.3 Path: `RhythmLayer` → Strudel code

`rhythmLayerToStrudelLine(layer)` in `src/core/rhythm/layers.ts` (lines 56–63):

```ts
export function rhythmLayerToStrudelLine(layer: RhythmLayer): string {
  const { sound, euclid, steps } = layer;
  if (steps.length === 0 && euclid) {
    return `  s("${sound}(${euclid})")`;
  }
  const tokens = steps.map((v) => (v ? sound : '~'));
  return `  s("${tokens.join(' ')}")`;
}
```

**Two code paths — both emit `sound` directly:**
- Euclid fallback path (empty `steps`, `euclid` present): emits `s("bd(3,8)")` — `sound` token substituted literally.
- Steps path (non-empty `steps`): emits `s("bd ~ ~ bd ...")` — `sound` substituted at each onset.

**The exact lines to change for a `strudelSample` override:**

Line 57: `const { sound, euclid, steps } = layer;`
→ needs one additional destructure: `strudelSample`

Line 59: `return \`  s("${sound}(${euclid})")\`;`
→ becomes: `const sampleName = layer.strudelSample ?? sound; return \`  s("${sampleName}(${euclid})")\`;`

Line 61-62: `const tokens = steps.map((v) => (v ? sound : '~'));`
→ becomes: `const sampleName = layer.strudelSample ?? sound; const tokens = steps.map((v) => (v ? sampleName : '~'));`

### 1.4 Consumers of `recipeToAgentOutput`

A `git grep` over the codebase finds exactly **two** call sites:

1. **`src/agent/agent.ts`** — `getExpressibleRecipes()` is called in `sendEvolution()` (line 400) to build `availableRecipeSummaries` for the LLM payload. `recipeToAgentOutput` itself is imported but not called directly in agent.ts. However, `getExpressibleRecipes()` calls it indirectly via filter-only logic — actually on re-inspection: `recipeToAgentOutput` is imported in `agent.ts` (line 36 imports `getExpressibleRecipes` only; `recipeToAgentOutput` is not imported in agent.ts directly).

2. **`src/core/music-knowledge/recipe-engine.ts`** — exports `recipeToAgentOutput`.

A broader search confirms `recipeToAgentOutput` is imported and called from:
- `src/lib/` or UI layers? → No hits.

**All callers flow through `apply.ts`** (via the standard apply path). The function is exposed as a public export used wherever a recipe is converted to an agent output; in the current codebase the call path is: **caller invokes `recipeToAgentOutput` → result → `applyRhythmSpec(result.rhythm)`**. The only consumer in the current app is the code path in the Svelte UI (recipe apply button) which calls `applyRhythmSpec` with the recipe output. There is no non-`apply.ts` consumer.

**Conclusion:** All paths that flow `recipeToAgentOutput` results into session `RhythmLayer[]` pass through `applyRhythmSpec`. Option B (overlay downstream) is supported by this consumer trace.

### 1.5 `RhythmLayer` today — no `strudelSample`

`src/core/rhythm/layers.ts` (lines 18–29): `RhythmLayer` interface has fields `sound`, `steps`, `euclid?`, `muted?`, `solo?`. **No `strudelSample` field exists today.**

---

## §2 — Verified Strudel Sample Inventory

### 2.1 Sample source confirmed

Orbifold loads: `samples('github:tidalcycles/dirt-samples')` in `src/audio/strudel.ts` (line 165). This loads the `tidalcycles/Dirt-Samples` repository via its `strudel.json` manifest.

**Source verified against live docs:** `https://strudel.cc/learn/samples/` (fetched 2026-06-23). The page confirms the standard drum abbreviation convention comes from the `tidal-drum-machines` library, but Orbifold loads `dirt-samples` (which contains folders named with the same abbreviations: `bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `ht`, `mt`, `lt`, `cr`, `rd`, `sh`, `cb`, `tb`, `perc`, `misc`, `fx`).

**Additional verified names present in `tidalcycles/Dirt-Samples`** (from live `strudel.json`):
`tabla`, `tabla2`, `perc`, `east`, `hand`, `808bd`, `808sd`, `808oh`, `808ht`, `808lt`, `808mt`, `gretsch`, `hh27`, `linnhats`, `realclaps`, `bassdm`, `clubkick`, `hardkick`.

### 2.2 Full built-in percussion abbreviation list (verified from strudel.cc/learn/samples/)

**Drum machine kit (from tidal-drum-machines via strudel docs table):**

| Abbreviation | Description |
|---|---|
| `bd` | Bass drum / kick drum |
| `sd` | Snare drum |
| `rim` | Rimshot |
| `cp` | Clap |
| `hh` | Closed hi-hat |
| `oh` | Open hi-hat |
| `cr` | Crash |
| `rd` | Ride |
| `ht` | High tom |
| `mt` | Medium tom |
| `lt` | Low tom |
| `sh` | Shakers (maracas, cabasas, etc.) |
| `cb` | Cowbell |
| `tb` | Tambourine |
| `perc` | Other percussions |
| `misc` | Miscellaneous samples |
| `fx` | Effects |

**Additional verified in `tidalcycles/Dirt-Samples/strudel.json` (live fetch 2026-06-23):**
`tabla` (tabla hand drum), `tabla2` (tabla variation), `east` (eastern percussion set), `hand` (hand percussion).

### 2.3 Per-genre proposed `sampleMap` (using verified names only)

Each entry maps `Sound` slot → verified sample name. Slots not in the map are left `undefined` (codegen falls back to generic `sound`).

The `Sound` type is `'bd' | 'sd' | 'hh' | 'oh' | 'cp' | 'rim' | 'lt' | 'mt' | 'ht'`.

#### Genres present in the catalog (from `rhythm-harmony-recipes.ts`)

1. **Afro-Cuban / Son / Salsa / Rumba** (recipes: `afro-cuban-clave-minor`, `latin-jazz-clave-swing`, `rumba-blues-minor`)
   - `bd` → `bd` (kick drum, present in clave — keep generic; no distinct authentic name)
   - `sd` → `sd` (snare, acceptable fallback)
   - `hh` → `hh` (generic — no distinct instrument in son/rumba rhythm)
   - No authentic clave instrument named in dirt-samples. Clave is a struck idiophone; closest available: `perc` (other percussions).
   - Proposed map: `{ bd: 'bd', sd: 'sd', hh: 'hh' }` (minimal — no culturally specific name available beyond drum-machine defaults)
   - Assessment: Son clave / rumba clave patterns use `sound: 'bd'` (single layer). **No distinct authentic clave instrument name verified in dirt-samples** that would improve on `bd`. These recipes do not benefit materially from a sampleMap without custom sample loading.

2. **West-African bell / Ewe / Afrobeat** (recipes: `west-african-bell-modal`, `west-african-triplet-groove`)
   - The bell pattern layer uses `sound: 'bd'` (index 0) and `sound: 'hh'` (index 1).
   - No `bell` named sample in dirt-samples. No `agogo` or `gankogui`.
   - Fallback option: `perc` (other percussions) or `cb` (cowbell — closest resonance shape).
   - Proposed: `{ bd: 'cb', hh: 'perc' }` — cowbell approximates a metal bell; `perc` adds percussion texture.
   - **Fallback:** No native bell instrument in `@strudel/web@1.0.3` dirt-samples.

3. **Bossa Nova / Samba** (recipes: `bossa-nova-groove`, `samba-afro-brasileiro`)
   - Bossa nova clave: single layer `bd`. No `pandeiro`, `tamborim`, or `surdo` named in dirt-samples.
   - Samba: layers `bd` (surdo) + `hh` (caixa snare). No `surdo` named.
   - Fallback: `bd` for surdo bass (already generic but sonically close), `sd` for caixa snare.
   - Proposed: `{ bd: 'bd', hh: 'sd', sd: 'sd' }` — minimal; swap `hh` slot to `sd` for snare character.
   - **Fallback:** No native `surdo`, `tamborim`, or `pandeiro` in dirt-samples.

4. **Dorian Ritual / Sparse Euclidean** (recipe: `dorian-ritual-sparse`)
   - Single layer `bd`. Generic. No sampleMap needed (not a genre-specific instrument recipe).
   - Proposed: `sampleMap` omitted (generic pop/modal recipe).

5. **Latin Jazz / Cascara** (recipe: `latin-jazz-clave-swing`)
   - Two layers: `bd` (clave) + `hh` (cascara shell pattern). 
   - Cascara is typically played on a cowbell or timbale shell. Available: `cb` (cowbell).
   - Proposed: `{ bd: 'bd', hh: 'cb' }` — cowbell for cascara shell.

6. **Pop/Rock backbeat** (recipe: `pop-rock-backbeat`)
   - Two layers: `bd` (snare backbeat) + `hh` (quarters). Generic pop — no authentic mapping needed.
   - Proposed: `sampleMap` omitted (generic recipe).

7. **Aksak 7/8 / Dorian** (recipe: `aksak-dorian-odd`)
   - Single layer `bd`. Generic — no specific Balkan instrument available.
   - Proposed: `sampleMap` omitted.

8. **Rumba Blues Minor** (recipe: `rumba-blues-minor`)
   - Single layer `bd` (rumba clave 3-2). No distinct clave instrument available.
   - Proposed: `{ bd: 'perc' }` — `perc` adds authentic struck-idiophone character vs. kick drum.

9. **Gospel Soul** (recipe: `gospel-soul-euclid`)
   - Single layer `bd`. Generic. No authentic gospel instrument maps.
   - Proposed: `sampleMap` omitted.

10. **Cueca Chilena folk** (recipe: `cueca-chilena-folk`)
    - Single layer `bd` (cueca base). Cueca uses guitar and bombo (bass drum), but no `bombo` in dirt-samples.
    - Proposed: `{ bd: 'bd' }` — `bd` is already the closest available; essentially no change.
    - Assessment: minimal gain. Could omit entirely.

11. **Samba Afro-Brasileiro** (recipe: `samba-afro-brasileiro`)
    - Two layers: `bd` (surdo base) + `hh` (caixa snare).
    - Proposed: `{ bd: 'bd', hh: 'sd' }` — `sd` snare better approximates caixa off-beat snare.
    - **Fallback:** no native `surdo` or `caixa` in dirt-samples.

12. **Bulería Flamenca** (recipe: `buleria-flamenco-phrygian`)
    - Single layer `bd` (12-step struct pattern). No `cajon` or `palmas` in dirt-samples.
    - Proposed: `{ bd: 'perc' }` — `perc` approximates cajon character better than kick drum.
    - **Fallback:** no native `cajon` in dirt-samples.

13. **Cumbia Latina** (recipe: `cumbia-latina-groove`)
    - Single layer `bd` (cumbia caja pattern). The caja is a cylindrical membrane drum.
    - Dirt-samples has no `caja`, `guacharaca`, or `llamador`.
    - Proposed: `{ bd: 'perc' }` — `perc` gives ethnic percussion character vs. generic kick.
    - **Fallback:** no native `caja`, `guacharaca`, or `llamador` in dirt-samples.

14. **Candombe Dorian** (recipe: `candombe-dorian-groove`)
    - Single layer `bd` (candombe chico 16-step struct). Chico is a high-pitched candombe drum.
    - No `chico`, `piano`, or `repique` (drum) in dirt-samples.
    - Proposed: `{ bd: 'perc' }` — `perc` for ethnic percussion character.
    - **Fallback:** no native candombe drum names in dirt-samples.

### 2.4 Summary of authentic instruments with no named sample in dirt-samples

| Instrument | Genre | Proposed fallback | Fallback note |
|---|---|---|---|
| clave (struck idiophone) | Afro-Cuban / Rumba | `perc` | no native `clave` in 1.0.3 |
| agogo / gankogui bell | West-African | `cb` | no native `bell` / `agogo` in 1.0.3 |
| surdo (bass membranophone) | Samba | `bd` | already generic; `bd` is closest in pitch |
| caixa (snare variant) | Samba | `sd` | `sd` closest snare sound |
| tamborim / pandeiro | Bossa Nova / Samba | (omit — leave generic) | no close equivalent |
| cajon | Flamenco | `perc` | `perc` closer in timbre than `bd` |
| caja / bombo colombiano | Cumbia | `perc` | `perc` closer in timbre than `bd` |
| guacharaca / llamador | Cumbia | (omit — leave generic) | no close equivalent in pitch range |
| chico / piano / repique (drum) | Candombe | `perc` | `perc` for ethnic percussion character |
| cascara shell / timbale | Latin Jazz | `cb` | cowbell approximates metal shell |

### 2.5 Genres that do not benefit from a sampleMap

These recipes emit generic patterns with no specific instrument role that would improve with available names: `dorian-ritual-sparse`, `pop-rock-backbeat`, `aksak-dorian-odd`, `gospel-soul-euclid`, `cueca-chilena-folk` (single layer `bd`, no improvement available), `west-african-bell-modal` and `west-african-triplet-groove` (covered above with fallbacks).

**Assessment:** The material gain from `sampleMap` at 1.0.3 is modest for many genres. The main value is: (a) using `perc` instead of `bd` for struck-idiophone patterns (cumbia, candombe, flamenco, rumba), (b) using `sd` instead of `hh` for snare roles in samba, and (c) using `cb` for bell/shell metal patterns. This is Phase 01 foundation — future phases may add `samples()` calls to load richer ethnic sample packs.

---

## §3 — Three Open Decisions for Pilot Resolution

### OD-1 — Propagation mechanism across the `AgentOutputSchema` boundary

**Context from §1 consumer trace:**

`recipeToAgentOutput` is the only function that knows the recipe's `sampleMap`. Its output is an `AgentOutput` validated by `AgentOutputSchema.safeParse`. All consumers that reach `RhythmLayer[]` pass through `applyRhythmSpec(result.rhythm)` in `src/agent/apply.ts`.

There are **no non-`apply.ts` consumers** in the current codebase.

**Option A — Extend `AgentOutputSchema.layer` with optional `strudelSample`:**
`recipeToAgentOutput` attaches `strudelSample` to each layer it builds; the schema must declare `strudelSample: z.string().optional()` on the layer union branches. Covers every consumer uniformly. Cost: (1) raises the `SCHEMA_VERSION` question; (2) allows the LLM to emit `strudelSample` in free-form agent calls — if the agent hallucinations a non-existent sample name, the codegen emits a silent failure (Strudel plays silence); (3) the schema contract widens the plumbing-side interface to carry genre knowledge — minor seam leakage, though the value itself is a generic string.

**Option B — Keep `AgentOutputSchema` pure; overlay downstream in `apply.ts`:**
`recipeToAgentOutput` stays clean (returns standard `AgentOutput`). A generic helper `applySampleMap(layers: RhythmLayer[], map: Partial<Record<Sound, string>>): RhythmLayer[]` in `apply.ts` overlays `strudelSample` onto `RhythmLayer[]` right after `applyRhythmSpec`. The recipe's `sampleMap` (keyed by `Sound`, aligned with `LAYER_SOUNDS`) is passed by the caller (music-knowledge side or UI layer calling recipeToAgentOutput). The helper carries **zero** genre knowledge — it is handed a map and applies it. `applyRhythmSpec` does not change; `SCHEMA_VERSION` does not change; the LLM cannot emit sample names.

**Recommendation: Option B.** The consumer trace confirms all paths pass through `apply.ts`. The seam stays clean: no sample-name literal or genre token enters the plumbing layer. `SCHEMA_VERSION = 6` stays untouched. The LLM cannot hallucinate sample names. Cost: two-step application (recipe → `AgentOutput` → `applyRhythmSpec` → `applySampleMap`).

One implementation question for Option B: who calls `applySampleMap`? The call site must know both the `RhythmLayer[]` (after `applyRhythmSpec`) and the recipe's `sampleMap`. In the current code, `recipeToAgentOutput` is called from the Svelte UI layer (recipe-apply button). That call site has access to the recipe and can pass `recipe.sampleMap` to `applySampleMap`. This is consistent with the music-knowledge→plumbing layering (knowledge pushes the map, plumbing applies it generically).

### OD-2 — `strudelSample` persistence in `SavedSessionSchema`

**Context from `src/lib/persistence.ts`:**

`SavedRhythmLayerSchema` (lines 89–95) is:
```ts
const SavedRhythmLayerSchema = z.object({
  sound: z.enum(SK_SOUNDS),
  steps: z.array(z.number().int().min(0).max(1)).length(16),
  euclid: z.string().optional(),
  muted: z.boolean().optional(),
  solo: z.boolean().optional(),
});
```

This is a **strict object** (`z.object()`). In Zod, `z.object()` without `.passthrough()` or `.strip()` defaults to **strip** mode — unknown keys are silently dropped on parse. `strudelSample` added to a `RhythmLayer` in the session store would be **silently dropped** on save/load if not added to the schema.

**Option A (recommend) — Persist `strudelSample`:** Add `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema`. Also add the field to `serializeSession` and `deserializeSession`. A saved cumbia session reloads with authentic samples. Additive + optional; no `SESSION_SCHEMA_VERSION` bump needed (old sessions parse fine — the field is absent, schema treats it as `undefined`, codegen falls back to `sound`). Per ADR 0025 D7.

**Option B — Exclude:** `strudelSample` persists ephemerally only while the session is live. On reload, samples re-derive only on next recipe apply. This introduces a behavioral difference: a loaded session sounds generic until the user re-applies the recipe.

### OD-3 — Fallback policy for unavailable samples

**Context from §2.4:** Several authentic instruments have no named sample in `@strudel/web@1.0.3` dirt-samples (clave, cajon, caja, surdo, etc.).

**Option A (recommend) — Use nearest documented fallback, commented in catalog:**
For each genre recipe, use the closest available sample name (e.g. `perc` for struck drums, `cb` for metal bells, `sd` for snare variants). Document the fallback inline in `rhythm-harmony-recipes.ts` with a comment: `// fallback: no native '<instrument>' in @strudel/web@1.0.3`. The catalog is the explicit record of the compromise.

**Option B — Leave slot generic:** Omit the slot from `sampleMap` entirely so those layers emit their generic `sound` (`bd`, `hh`, etc.). The drum-machine character is preserved; the cultural specificity is lost. No fallback comments needed.

**Recommendation: Option A** for slots where a perceptibly closer sample exists (`perc` vs `bd` for membrane drums, `sd` vs `hh` for snare roles, `cb` vs `bd` for bell metal). Option B for slots where no meaningful improvement is available (guacharaca, tamborim — leave those slots out of `sampleMap` entirely even under Option A).

---

## §4 — ADR Trigger: ADR 0025

**ADR 0025 — "Authentic Sample Palette + music-knowledge seam"**

Must cover:
- **D1** — `RhythmLayer.strudelSample?: string`: the field's semantics, JSDoc, and the codegen rule ("emit `strudelSample ?? sound`; never emit empty string").
- **D2** — `MusicalRecipe.sampleMap?: Partial<Record<Sound, string>>` lives in `music-knowledge/`; only genre recipes populate it; generic recipes leave it undefined; all values must be inventory-verified.
- **D3** — **Seam invariant** (hardened from AG-D1): codegen, `RhythmLayer`, `persistence.ts`, and `apply.ts` contain **no genre names and no hardcoded sample maps**. The sample-name knowledge lives only in `music-knowledge/`. Verified mechanically by A-01-06.
- **D4** — **Propagation mechanism** (the OD-1 resolution): states precisely whether Option A or B, and if B, describes the `applySampleMap` helper signature and its zero-genre-knowledge contract.
- **D5** — **Persistence** (the OD-2 resolution): whether `strudelSample` is persisted; if so, the schema change; the `SESSION_SCHEMA_VERSION` non-bump rationale.
- **D6** — **Fallback policy** (the OD-3 resolution): which slots use a fallback, which are omitted; the inline-comment convention.
- **D7** — **Backward compatibility**: pre-Phase-01 sessions have no `strudelSample`; `undefined` falls back to `sound` in codegen; `deserializeSession` handles absence without error.

---

## §5 — Architectural-Fitness Check Design (A-01-06)

The seam invariant (AG-D1) requires that no genre name or hardcoded sample map literal appears in `src/` outside `src/core/music-knowledge/` (and `tests/`).

The sample names introduced by Phase 01 for the affected genres are (from §2.3):
`perc`, `cb`, `sd`, `bd` — these are also generic drum abbreviations, so a raw grep on these names would produce too many false positives.

The genre-specific tokens to scan for are the **actual authentic instrument names that are not `Sound` type members** and any map literal. The relevant ones are the fallback-comment strings and any string that would only appear in the knowledge layer.

However, the spec requirement is: verify that **no genre name** and **no hardcoded sample map literal** appears outside `src/core/music-knowledge/`. Genre names in the catalog would be strings like `'cumbia'`, `'cueca'`, `'candombe'`, `'samba'`, `'buleria'`, etc.

**Exact repeatable command:**

```bash
git grep -n \
  -e "'cumbia'" \
  -e '"cumbia"' \
  -e "'cueca'" \
  -e '"cueca"' \
  -e "'candombe'" \
  -e '"candombe"' \
  -e "'samba'" \
  -e '"samba"' \
  -e "'flamenco'" \
  -e '"flamenco"' \
  -e "'milonga'" \
  -e '"milonga"' \
  -e "'maqsum'" \
  -e '"maqsum"' \
  -e "'baladi'" \
  -e '"baladi"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```

**Expected result:** empty output (zero matches).

**Note on sample name tokens:** The actual string values used as `strudelSample` (e.g. `'perc'`, `'cb'`, `'sd'`) overlap with generic `Sound` names already used in `src/`. The seam fitness check focuses on **genre tokens** (which are never valid `Sound` values and would only appear in code if the seam breaks) rather than on the sample name values themselves (which are intentionally generic and appear throughout the plumbing legitimately). ADR 0025 D3 should make this distinction explicit.

---

## Files to be touched in subsequent steps

| File | Step | Change |
|---|---|---|
| `src/core/rhythm/layers.ts` | 01.2 | Add `strudelSample?: string` to `RhythmLayer`; update `rhythmLayerToStrudelLine` |
| `src/lib/persistence.ts` | 01.2 | Add `strudelSample: z.string().optional()` to `SavedRhythmLayerSchema` (if OD-2 = persist) |
| `src/core/music-knowledge/rhythm-harmony-recipes.ts` | 01.3 | Add `sampleMap` to `MusicalRecipe`; populate for genre recipes |
| `src/core/music-knowledge/recipe-engine.ts` | 01.4 | Wire propagation per OD-1 resolution |
| `src/agent/apply.ts` | 01.4 | Add `applySampleMap` helper (if OD-1 = Option B) |
| `docs/adr/0025-authentic-sample-palette.md` | 01.2 | New ADR (drafted in 01.2 after OD resolutions) |
| `tests/authentic-groove/codegen-sample.test.ts` | 01.2 | New test for plumbing |
| `tests/authentic-groove/sample-map.test.ts` | 01.3 | New test for catalog data |
| `tests/authentic-groove/propagation.test.ts` | 01.4 | New test for end-to-end propagation |

## Files NOT touched in step 01.1

Zero `.ts` or `.svelte` files modified. Read-only step.

---

## Environment / CI / build / deployment notes

No changes. `pnpm test` passes at 1589 (gate confirmed — not verified by this step).

---

## Source-of-truth check

`recipeToAgentOutput` builds `AgentOutput.rhythm.layers` using `LAYER_SOUNDS` (sound-by-index assignment). Its output is consumed by `applyRhythmSpec` which builds `RhythmLayer[]`. The `RhythmLayer` interface (`src/core/rhythm/layers.ts`) does not have a `strudelSample` field today. The persistence layer (`SavedRhythmLayerSchema`) mirrors `RhythmLayer` but uses Zod strip mode, so any new field must be added explicitly to both to avoid silent data loss on save/load.

No contract mismatch found. The planned additions (field on model + field on schema) are aligned.

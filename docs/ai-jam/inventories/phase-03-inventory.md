<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Inventory — Recipe Engine: Schema v6, Recipe→Agent Wiring

**Initiative:** ai-jam
**Step:** 03.1 — Inventory
**Date:** 2026-06-19
**Status:** Ready for Pilot review — OD-3 resolution required before step 03.2

---

## §1 — Current `AgentOutputSchema` v5 shape and what v6 must preserve

**Source:** `src/agent/schema.ts` (full, 274 lines)

### §1.1 Top-level structure

```typescript
// SCHEMA_VERSION = 5 (schema.ts line 25)

AgentOutputSchema = z.object({
  rhythm:      RhythmSpecSchema.optional(),       // schema v1+
  harmony:     HarmonySpecSchema.optional(),      // schema v1+
  note:        z.string().max(300).optional(),    // schema v1+ (freetext annotation)
  saveAsBlock: SaveAsBlockSpecSchema.optional(),  // NEW schema v5 (ADR 0021 D1)
}).superRefine(guard)
```

### §1.2 `superRefine` guard (current v5)

Source: `src/agent/schema.ts` lines 256–264.

```typescript
.superRefine((val, ctx) => {
  // At least one of rhythm, harmony, or saveAsBlock must be present.
  if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock',
    });
  }
});
```

The guard rejects a response that has **none** of the three named fields. A `note`-only response is rejected; a `note + rhythm` response is accepted.

### §1.3 Rhythm sub-schema

`RhythmSpecSchema` (schema.ts lines 100–102):
- `layers`: array of `RhythmLayerSchema`, min 1, max 6.
- Each layer is a discriminated union of **steps variant** or **euclid variant** (never both).

Steps variant (lines 50–55):
- `sound: z.enum(SK_SOUNDS)`
- `steps: z.array(z.literal(0)|z.literal(1)).length(16)` — exactly 16 elements.

Euclid variant (lines 63–83):
- `sound: z.enum(SK_SOUNDS)`
- `euclid.k ∈ [1,16]`, `euclid.n ∈ [2,16]`, `euclid.rot ∈ [0,n-1]` (superRefine enforces `rot ≤ n-1`).

`SK_SOUNDS = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht']` (9 values).

### §1.4 Harmony sub-schema

`HarmonySpecSchema` (schema.ts lines 189–194) — all fields optional:
- `root: z.string().optional()`
- `mode: z.enum(SK_MODES).optional()` (8 modes)
- `octave: z.number().int().min(2).max(5).optional()`
- `progression: z.array(HarmonyChordSchema).min(1).max(8).optional()`

Each chord in progression is `HarmonyChordSchema` — a union of:
- `HarmonyRestSchema`: `{ isRest: true, bars?: [0.25,8] }` — listed first per ADR 0012 D4.
- `HarmonyChordCoreSchema`: `{ root: string, quality: SK_QUAL, gain?, bars?, instrument?, room?, decay?, preset?, lpf?, attack?, sustain?, release?, lpenv?, lpa?, lpd?, lpq? }`.

`SK_QUAL = ['maj', 'min', 'dim', 'aug']` (4-member triad vocabulary).
`SK_MODES = ['major','minor','dorian','phrygian','lydian','mixolydian','locrian','harmonic:minor']` (8 modes).

### §1.5 `SaveAsBlockSpecSchema` (v5 addition)

Source: schema.ts lines 206–233.
- `name: z.string().min(1)` — block label.
- `type: z.enum(['groove','armonia','sesion'])` — which state to capture.
- `addToTrack: z.boolean().optional()`.

### §1.6 Inferred types exported by v5

```typescript
export type RhythmLayer = z.infer<typeof RhythmLayerSchema>;
export type RhythmSpec  = z.infer<typeof RhythmSpecSchema>;
export type HarmonyChord = z.infer<typeof HarmonyChordSchema>;
export type HarmonySpec  = z.infer<typeof HarmonySpecSchema>;
export type AgentOutput  = z.infer<typeof AgentOutputSchema>;
// SaveAsBlockSpec also exported (line 235)
```

### §1.7 What schema v6 must preserve for backward compatibility

1. **All four existing fields remain** (`rhythm`, `harmony`, `note`, `saveAsBlock`) with identical types and optionality.
2. **A response with only `rhythm`** (no `harmony`, no `saveAsBlock`, no `musicalIntent`) must still parse successfully.
3. **A response with only `harmony`** must still parse successfully.
4. **A response with only `saveAsBlock`** must still parse successfully.
5. **A response with none of the four** must still fail parsing.
6. **`SCHEMA_VERSION` bumps from 5 to 6** with a matching JSDoc entry following the pattern at lines 12–24.
7. **All existing exported types** (`RhythmLayer`, `RhythmSpec`, `HarmonyChord`, `HarmonySpec`, `AgentOutput`) gain the new optional field automatically via `z.infer`.

---

## §2 — `MusicalIntentSchema` candidate fields

**Source:** phase-03.md step 03.1 implementation requirements; catalog data from `rhythm-catalog.ts`, `harmony-catalog.ts`, `rhythm-harmony-recipes.ts`.

### §2.1 Proposed field-by-field spec

```typescript
export const MusicalIntentSchema = z.object({
  recipeId?:    z.string().optional(),                                    // catalog id
  style?:       z.string().optional(),                                    // free-text
  cultureTags?: z.array(z.string()).optional(),                           // free-text array
  mood?:        z.string().optional(),                                    // free-text
  complexity?:  z.enum(['simple','medium','dense']).optional(),           // enum
  meter?:       z.string().optional(),                                    // free-text
  bpmHint?:     z.number().min(40).max(240).optional(),                   // constrained
  explanation?: z.string().max(300).optional(),                           // constrained
});
```

All fields are optional. The entire `MusicalIntentSchema` object is optional on `AgentOutputSchema`.

### §2.2 Fields grounded in catalog data

| Field | Catalog ground | Source |
|---|---|---|
| `recipeId` | Every `MusicalRecipe.id` (10 known ids) | `RHYTHM_HARMONY_RECIPES[*].id` |
| `style` | `MusicalRecipe.userIntents[*]`, `HarmonyEntry.tags[*]` — free-text | Free annotation |
| `cultureTags` | `RhythmEntry.traditions[*]`, `HarmonyEntry.tags[*]` | Free annotation from catalog metadata |
| `mood` | `HarmonyEntry.tags[*]` (e.g., 'meditative', 'modal', 'soul') | Free annotation |
| `complexity` | `MusicalRecipe.density` — directly maps to `'sparse' | 'medium' | 'dense'` | `RHYTHM_HARMONY_RECIPES[*].density` |
| `meter` | `MusicalRecipe.meter` (e.g., '4/4', '12/8', '7/8') | `RHYTHM_HARMONY_RECIPES[*].meter` |
| `bpmHint` | `MusicalRecipe.bpmRange[0]` or midpoint | `RHYTHM_HARMONY_RECIPES[*].bpmRange` |
| `explanation` | Free-text annotation — no catalog ground, LLM-generated | Free annotation |

### §2.3 Key observation: `complexity` maps directly to `density`

`MusicalRecipe.density` uses `'sparse' | 'medium' | 'dense'`. The `complexity` field uses the same three-value vocabulary. The LLM can read the recipe's density and echo it into `musicalIntent.complexity`.

### §2.4 `recipeId` validation strategy

Per phase-03.md step 03.2: **catalog validation at parse time is NOT required** in Zod. The recipe engine validates the id at call time. Zod only constrains `recipeId` to `z.string()`. This is consistent with ADR 0021 D5's pattern (trigger phrases in the prompt rather than Zod constraints on the LLM's choice).

---

## §3 — Expressibility classification of all 10 recipes

**Classification rules:**
- **`euclid-expressible`**: `strudelStrategy === 'euclid'` AND `euclid.n ≤ 16`. Emitted as `{ sound, euclid: { k, n, rot } }`.
- **`steps16-expressible`**: `strudelStrategy === 'struct'` AND `steps === 16`. Emitted as `{ sound, steps: binary.split('').map(Number) }`.
- **`non-expressible`**: any other combination (e.g., `'struct'` with `steps !== 16`, or `'euclid'` with `n > 16`).

**Note:** The `AgentOutputSchema` euclid constraint requires `n ∈ [2,16]`. All euclid-strategy catalog entries have `n ≤ 16` (the largest euclid `n` in the catalog is 16). Therefore the constraint never blocks a catalog euclid entry — every euclid-strategy entry is euclid-expressible.

### §3.1 Rhythm id → classification table

| Rhythm id | `strudelStrategy` | `steps` / `euclid.n` | Classification |
|---|---|---|---|
| `son-clave-3-2` | `struct` | 16 | **steps16-expressible** |
| `bell-pattern-west-african` | `euclid` | n=12 | **euclid-expressible** |
| `bossa-nova-clave` | `struct` | 16 | **steps16-expressible** |
| `euclid-3-16` | `euclid` | n=16 | **euclid-expressible** |
| `son-clave-2-3` | `struct` | 16 | **steps16-expressible** |
| `cascara-euclid` | `euclid` | n=16 | **euclid-expressible** |
| `backbeat-snare` | `struct` | 16 | **steps16-expressible** |
| `quarter-notes-16` | `euclid` | n=16 | **euclid-expressible** |
| `aksak-7-sparse` | `euclid` | n=7 | **euclid-expressible** |
| `sparse-bell-12` | `euclid` | n=12 | **euclid-expressible** |
| `minimal-12` | `euclid` | n=12 | **euclid-expressible** |
| `rumba-clave-3-2` | `struct` | 16 | **steps16-expressible** |
| `euclid-9-16` | `euclid` | n=16 | **euclid-expressible** |

### §3.2 Recipe-level expressibility table

| # | Recipe id | Rhythm id(s) | Layer classification(s) | Recipe status |
|---|---|---|---|---|
| 1 | `afro-cuban-clave-minor` | `son-clave-3-2` | steps16 | **fully expressible** |
| 2 | `west-african-bell-modal` | `bell-pattern-west-african` | euclid (n=12) | **fully expressible** |
| 3 | `bossa-nova-groove` | `bossa-nova-clave` | steps16 | **fully expressible** |
| 4 | `dorian-ritual-sparse` | `euclid-3-16` | euclid (n=16) | **fully expressible** |
| 5 | `latin-jazz-clave-swing` | `son-clave-2-3`, `cascara-euclid` | steps16 + euclid (n=16) | **fully expressible** |
| 6 | `pop-rock-backbeat` | `backbeat-snare`, `quarter-notes-16` | steps16 + euclid (n=16) | **fully expressible** |
| 7 | `aksak-dorian-odd` | `aksak-7-sparse` | euclid (n=7) | **fully expressible** |
| 8 | `west-african-triplet-groove` | `sparse-bell-12`, `minimal-12` | euclid (n=12) + euclid (n=12) | **fully expressible** |
| 9 | `rumba-blues-minor` | `rumba-clave-3-2` | steps16 | **fully expressible** |
| 10 | `gospel-soul-euclid` | `euclid-9-16` | euclid (n=16) | **fully expressible** |

### §3.3 Counts

- **euclid-expressible layers** (across all recipe rhythmId references): 8 of 13 individual rhythm-id references.
- **steps16-expressible layers** (across all recipe rhythmId references): 5 of 13 individual rhythm-id references.
- **non-expressible layers**: **0 of 13**.
- **Recipes fully expressible** (every rhythmId expressible): **10 of 10**.
- **Recipes with at least one non-expressible layer**: **0 of 10**.

**Key finding:** Every recipe in the current `RHYTHM_HARMONY_RECIPES` catalog is fully expressible. There are zero non-expressible rhythm layers in the recipe set. OD-3 describes a theoretical concern; the actual catalog does not trigger it.

---

## §4 — OD-3: non-expressible rhythm layers (open decision — Pilot resolution required)

**Status:** OPEN — Pilot must resolve before step 03.2 begins.

**Context:** Even though the current 10-recipe catalog has no non-expressible layers (see §3), the recipe engine must define a policy for future catalog extensions that may add patterns with `strudelStrategy === 'struct'` and `steps !== 16` (e.g., a 12/8 struct entry or a 9/8 struct entry), or theoretical euclid entries with `n > 16`.

### Option A — Silent skip

`recipeToAgentOutput` silently omits any rhythm layer that is neither euclid-expressible nor steps16-expressible. The result may have fewer layers than the recipe specifies.

**Behavior:**
- If at least one layer is expressible → returns a valid `AgentOutput` with the expressible layers only.
- If ALL layers are non-expressible → returns `null` (no rhythm payload, which fails the schema guard unless harmony is present; `recipeToAgentOutput` must return `null` in this case).

**Pros:** Simplest to implement. No schema change. Non-expressible entries in the catalog remain valid catalog data — they can be used by future features (e.g., a struct-code path).

**Cons:** A recipe passed to `recipeToAgentOutput` with only non-expressible layers produces `null`. The caller must handle this. The LLM might reference such a recipe via `musicalIntent.recipeId`, causing a silent no-op.

**Impact on current catalog:** Zero impact — all 10 current recipes are fully expressible; no layer would be skipped.

### Option B — Recipe restriction

Only recipes whose every `rhythmId` is euclid-expressible or steps16-expressible are permitted as input to `recipeToAgentOutput`. Non-expressible recipes are filtered out upstream by `getExpressibleRecipes()` before being injected into the LLM's recipe list.

**Behavior:**
- `getExpressibleRecipes()` filters the catalog to only fully-expressible recipes.
- `sendEvolution()` injects only expressible recipe ids into the user message.
- `recipeToAgentOutput` can assume every layer it receives is expressible (it never encounters a non-expressible layer from a valid call).
- Calling `recipeToAgentOutput` with a non-expressible recipe would be a programming error — the function may still guard defensively.

**Pros:** Consistent guarantee within the engine. `recipeToAgentOutput` never needs to handle partial expressibility. The LLM is only offered ids it can actually use.

**Cons:** Non-expressible recipes are invisible to the LLM even if they represent valid musical contexts. Requires `getExpressibleRecipes()` to be called and its result used consistently.

**Impact on current catalog:** Zero impact — all 10 current recipes would pass the expressibility filter; `getExpressibleRecipes()` returns all 10.

### Per-recipe expressibility counts (for OD-3 decision framing)

- Fully expressible recipes: **10 of 10** (Option B would retain all 10).
- Recipes with at least one non-expressible layer: **0 of 10** (Option A would skip zero layers in the current catalog).
- Under either option, the current catalog behavior is identical.

**The OD-3 decision is purely forward-looking** — it governs how the engine handles future catalog additions. The Pilot's choice is binding for step 03.3 implementation.

---

## §5 — OD-1 downsample map (17→4) for `recipe-engine.ts`

**Source:** Phase 02 inventory §(e.1), confirmed against `rhythm-catalog.ts` lines 18–36 (`HARMONY_QUALITIES`) and `schema.ts` line 40 (`SK_QUAL`).

This map will be embedded as a `const` in `src/core/music-knowledge/recipe-engine.ts` (not only in tests). Every `HarmonyQuality` member must have an entry; the map must be total.

### §5.1 Complete downsample map

```typescript
// To be embedded in recipe-engine.ts:
const QUALITY_DOWNSAMPLE: Readonly<Record<HarmonyQuality, 'maj' | 'min' | 'dim' | 'aug'>> = {
  // Identity mappings (already schema-triad)
  maj:   'maj',
  min:   'min',
  dim:   'dim',
  aug:   'aug',
  // Extended → triad basis
  maj7:  'maj',   // major 7th — triad basis is major
  m7:    'min',   // minor 7th — triad basis is minor
  '7':   'maj',   // dominant 7th — triad basis is major
  m7b5:  'dim',   // half-diminished — triad basis is diminished
  dim7:  'dim',   // fully diminished — triad basis is diminished
  '6':   'maj',   // major 6th — triad basis is major
  m6:    'min',   // minor 6th — triad basis is minor
  sus2:  'maj',   // suspended 2nd — no third; functional triad = major
  sus4:  'maj',   // suspended 4th — no third; functional triad = major
  '9':   'maj',   // dominant 9th — triad basis is major
  maj9:  'maj',   // major 9th — triad basis is major
  m9:    'min',   // minor 9th — triad basis is minor
  add9:  'maj',   // add9 — triad basis is major
};
```

### §5.2 Totality confirmation

All 17 `HARMONY_QUALITIES` members are covered: 4 identity mappings + 13 non-triad mappings. The target set `{ maj, min, dim, aug }` matches `SK_QUAL` exactly (schema.ts line 40). The map is total.

### §5.3 Harmony entries used by recipes — quality analysis

Each recipe references one `harmonyId`. The qualities used in those harmonies and their downsampled values:

| Recipe | `harmonyId` | Qualities used | Post-downsample |
|---|---|---|---|
| `afro-cuban-clave-minor` | `latin-minor-dominant-loop` | m7, 7, maj7, 7 | min, maj, maj, maj |
| `west-african-bell-modal` | `west-african-modal-drone` | sus2, sus4 | maj, maj |
| `bossa-nova-groove` | `bossa-nova-loop` | maj7, m7, m7, 7 | maj, min, min, maj |
| `dorian-ritual-sparse` | `dorian-modal-drone` | min, maj, sus4 | min, maj, maj |
| `latin-jazz-clave-swing` | `jazz-ii-v-i-major` | m7, 7, maj7 | min, maj, maj |
| `pop-rock-backbeat` | `pop-i-v-vi-iv` | maj, maj, min, maj | maj, maj, min, maj |
| `aksak-dorian-odd` | `dorian-modal-drone` | min, maj, sus4 | min, maj, maj |
| `west-african-triplet-groove` | `west-african-modal-drone` | sus2, sus4 | maj, maj |
| `rumba-blues-minor` | `minor-blues-turnaround` | m7, m7, 7, dim7, m7 | min, min, maj, dim, min |
| `gospel-soul-euclid` | `gospel-soul-add9` | add9, add9, min, sus4, maj | maj, maj, min, maj, maj |

All downsample outputs are within `{ maj, min, dim, aug }`. Every recipe produces valid `AgentOutputSchema`-compatible harmony after downsampling.

### §5.4 Note on `mode` derivation

`HarmonyEntry` does not carry a `mode` field (it uses `modeCenter` and `chordMode`, which encode the tonal center and playback style, not a modal scale). The recipe engine will use `'minor'` as the safe default for `HarmonySpec.mode`. This is consistent with the catalog entries being modal/minor-leaning in character. The `recipeToAgentOutput` function documents this default. Improvement (using `modeCenter` + chord analysis to infer mode) is deferred to a future phase.

---

## §6 — `superRefine` guard update required for v6

### §6.1 Current guard (v5)

```typescript
// schema.ts lines 256–264
if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
  ctx.addIssue({ ... message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock' });
}
```

### §6.2 Required v6 guard

The guard must accept a response containing only `musicalIntent` (no `rhythm`, no `harmony`, no `saveAsBlock`). This is valid because the recipe engine resolves the `recipeId` to rhythm/harmony at call time.

```typescript
// schema.ts v6 guard (proposed)
if (
  val.rhythm === undefined &&
  val.harmony === undefined &&
  val.saveAsBlock === undefined &&
  val.musicalIntent === undefined
) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock, musicalIntent',
  });
}
```

The relaxation: add `val.musicalIntent === undefined` to the existing condition. This is a strictly additive change — all responses that passed v5 continue to pass v6.

### §6.3 Interaction when both `musicalIntent` and explicit fields are present

When a response contains both `musicalIntent.recipeId` and explicit `rhythm`/`harmony` fields, the phase-03.md spec (step 03.4) states: **explicit fields take precedence**. The schema does not need to enforce this precedence rule — it is a runtime concern in `sendEvolution()`. The schema simply accepts both being present simultaneously.

### §6.4 Error message update

The guard error message must be updated to name all four fields: `'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock, musicalIntent'`. This message appears in parse error output and in future test assertions.

---

## §7 — Placement and purity; backward-compat confirmation for existing `tryParseSkill` path

### §7.1 Placement of `recipe-engine.ts`

**File:** `src/core/music-knowledge/recipe-engine.ts`

This location places the file in the pure-core module layer (`src/core/**`), consistent with existing music-knowledge files:
- `src/core/music-knowledge/rhythm-catalog.ts`
- `src/core/music-knowledge/harmony-catalog.ts`
- `src/core/music-knowledge/rhythm-harmony-recipes.ts`
- `src/core/music-knowledge/query.ts`

**Tests:** `tests/music-knowledge/recipe-engine.test.ts`

### §7.2 Purity constraints confirmed

`recipe-engine.ts` must satisfy the `src/core/**` invariant from CLAUDE.md:

> "Engines in `core/**` have NO DOM/PIXI/Svelte imports → unit-testable."

**Required imports** (all pure):
- `import type { AgentOutput, RhythmSpec, HarmonySpec } from '../../agent/schema.js'` — **type-only import** (no runtime Zod import unless needed for the internal `safeParse` guard). The internal guard requires the Zod schema at runtime, so `AgentOutputSchema` must be imported as a value: `import { AgentOutputSchema } from '../../agent/schema.js'`. This is the sole import from `src/agent/`. Since `schema.ts` has no DOM/PIXI/Svelte imports (it is pure Zod), this is safe in a Node/Vitest environment.
- `import { getRhythmById, getHarmonyById } from './query.js'` — pure query functions.
- `import type { MusicalRecipe } from './rhythm-harmony-recipes.js'` — type-only.
- `import { RHYTHM_HARMONY_RECIPES } from './rhythm-harmony-recipes.js'` — runtime (needed for `getExpressibleRecipes()`).
- `import { HARMONY_QUALITIES, type HarmonyQuality } from './rhythm-catalog.js'` — for the downsample map type annotation.

**Forbidden imports:**
- Nothing from `src/state/` — `recipeToAgentOutput` returns data, does not write to sessionStore.
- Nothing from `src/ui/`, `src/lib/`, `src/audio/`.
- No DOM globals (`window`, `document`, `navigator`).

### §7.3 Static import vs. dynamic import assessment

`recipe-engine.ts` has no DOM/audio imports. Its import of `AgentOutputSchema` from `schema.ts` is safe in Node (Zod is a pure JS library with no browser-only APIs). Therefore `agent.ts` can use a **static import** of `recipeToAgentOutput` and `getExpressibleRecipes` from `recipe-engine.ts` rather than a dynamic import. This is simpler and avoids the dynamic-import overhead in the hot path of `sendEvolution()`.

The Node-testability concern for dynamic imports (raised in ADR 0022 D6 for `isPlaying()` from `strudel.ts`) does **not** apply to `recipe-engine.ts` — `strudel.ts` has audio/Web Audio globals; `recipe-engine.ts` has none.

### §7.4 Backward-compatibility of existing `tryParseSkill` path

**`tryParseSkill` (agent.ts lines 399–427):**
1. Extracts JSON from the response text.
2. Calls `normalizeEuclidStrings(raw)`.
3. Calls `AgentOutputSchema.safeParse(raw)`.
4. Returns `result.data` or `null`.

With schema v6, `AgentOutputSchema.safeParse` gains the optional `musicalIntent` field. A v5-format response (no `musicalIntent` key) parses through v6 unchanged:
- `musicalIntent` is `undefined` in the result (Zod treats missing optional fields as `undefined`).
- The v5 guard condition (`rhythm || harmony || saveAsBlock`) still passes if any of those is present.
- The parsed `AgentOutput` type now includes `musicalIntent?: MusicalIntent` — callers that did not expect it ignore the `undefined` field.

**`send()` function (agent.ts lines 551–682):**
- Reads `skill.rhythm`, `skill.harmony`, `skill.saveAsBlock`.
- Does NOT yet read `skill.musicalIntent` (step 03.4 wires that for `sendEvolution()`).
- The `send()` path is unaffected by the schema extension. If a response happens to include `musicalIntent`, `send()` ignores it (the field is simply present on the parsed object but not accessed).

**`sendEvolution()` function (agent.ts lines 280–347):**
- Step 03.4 will add the `musicalIntent.recipeId` handling here.
- Until step 03.4, `sendEvolution()` behaves identically to today: it only checks `skill.rhythm` and `skill.harmony`.

**Conclusion:** The v6 schema extension is purely additive. No existing call site requires modification for schema v6 compatibility. The `tryParseSkill` path, `send()` path, and existing test assertions are unaffected.

---

## §8 — Summary of decisions pending Pilot resolution

| Decision | Status | Required before |
|---|---|---|
| **OD-3** — non-expressible rhythm layers in `recipeToAgentOutput` | **OPEN** | Step 03.2 (schema v6) and step 03.3 (recipe engine) |

All other design questions are resolved:
- OD-1 (17-member quality vocabulary + downsample map) — RESOLVED, see §5.
- OD-2 (native step counts + `strudelStrategy`) — RESOLVED, see §3.
- `MusicalIntentSchema` field set — documented in §2, ready for ADR 0023.
- `superRefine` guard update — documented in §6, ready for step 03.2.
- Placement and purity — confirmed in §7.

**The inventory reveals that OD-3 has zero impact on the current 10-recipe catalog.** Both Option A and Option B produce identical behavior for all current recipes. The decision governs future catalog extensions only. Whichever option the Pilot chooses, step 03.3 can be implemented straightforwardly.

---

## §9 — No source files modified

This is a read-only inventory step. No `.ts`, `.svelte`, or other source file was created or modified.

**Files created in this step:**
- `docs/ai-jam/inventories/phase-03-inventory.md` (this file)
- `docs/ai-jam/handoffs/phase-03-handoff.md` (step 03.1 entry)

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0023 — Schema v6: `MusicalIntentSchema` and `musicalIntent` field on `AgentOutputSchema`

- **Status:** Accepted (Pilot approved at Checkpoint #2, 2026-06-19)
- **Date:** 2026-06-19
- **Initiative / Phase:** ai-jam / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 03 wires the music-knowledge catalog (Phase 02) into the agent by allowing the LLM to
reference a musical recipe by id. The `sendEvolution()` path needs a way for the LLM to
express recipe intent (`musicalIntent.recipeId`) without necessarily specifying explicit
`rhythm`/`harmony` fields. The current `AgentOutputSchema` v5 has no such field.

The phase-03 inventory (§2) documents the full `MusicalIntentSchema` candidate field set.
The inventory §4 documents OD-3 (non-expressible rhythm layers); the Pilot resolved OD-3 as
**Option B (upstream filter)** — `getExpressibleRecipes()` filters the catalog before
injecting ids into the LLM's context; `recipeToAgentOutput` is never called with a
non-expressible recipe.

---

## Schema v6 field-by-field shape

### `MusicalIntentSchema` (new, all fields optional)

```typescript
export const MusicalIntentSchema = z.object({
  style:       z.string().optional(),
  cultureTags: z.array(z.string()).optional(),
  mood:        z.string().optional(),
  complexity:  z.enum(['simple', 'medium', 'dense']).optional(),
  meter:       z.string().optional(),
  bpmHint:     z.number().min(40).max(240).optional(),
  recipeId:    z.string().optional(),
  explanation: z.string().max(300).optional(),
});
```

| Field | Type | Optionality | Source |
|---|---|---|---|
| `style` | `string` | optional | Free-text label (e.g. "bossa nova", "dorian modal") |
| `cultureTags` | `string[]` | optional | Tags from `RhythmEntry.traditions` / `HarmonyEntry.tags` |
| `mood` | `string` | optional | Emotional/expressive label |
| `complexity` | `'simple' \| 'medium' \| 'dense'` | optional | Maps to `MusicalRecipe.density` vocabulary |
| `meter` | `string` | optional | Time signature hint (e.g. "4/4", "12/8", "7/8") |
| `bpmHint` | `number ∈ [40, 240]` | optional | BPM suggestion (constrained to playable range) |
| `recipeId` | `string` | optional | Id of a known `MusicalRecipe` from the catalog |
| `explanation` | `string ≤ 300 chars` | optional | Brief human-readable note about the intent |

The entire `MusicalIntentSchema` object is optional on `AgentOutputSchema`:

```typescript
AgentOutputSchema = z.object({
  rhythm:        RhythmSpecSchema.optional(),
  harmony:       HarmonySpecSchema.optional(),
  note:          z.string().max(300).optional(),
  saveAsBlock:   SaveAsBlockSpecSchema.optional(),
  musicalIntent: MusicalIntentSchema.optional(),   // NEW in schema v6 (ADR 0023)
}).superRefine(guard)
```

---

## `superRefine` guard update

### v5 guard (old)

```typescript
if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
  ctx.addIssue({ message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock' });
}
```

### v6 guard (new)

```typescript
if (
  val.rhythm === undefined &&
  val.harmony === undefined &&
  val.saveAsBlock === undefined &&
  val.musicalIntent === undefined
) {
  ctx.addIssue({ message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock, musicalIntent' });
}
```

The relaxation adds `&& val.musicalIntent === undefined` to the existing condition. This is
strictly additive — all responses that passed v5 continue to pass v6.

When a response contains both `musicalIntent.recipeId` and explicit `rhythm`/`harmony`,
the schema accepts both simultaneously. Precedence (explicit fields win) is a runtime
concern in `sendEvolution()`, not a schema constraint.

---

## `SCHEMA_VERSION` bump

`SCHEMA_VERSION` in `src/agent/schema.ts` is bumped from `5` to `6`. A JSDoc annotation line
is added following the established pattern (lines 12–24 of schema.ts):

```typescript
 * Phase 03 (ai-jam): bumped from 5 to 6 — `AgentOutputSchema` gains
 * `musicalIntent?` field (`MusicalIntentSchema`); `superRefine` guard relaxed to accept
 * at least one of `rhythm`, `harmony`, `saveAsBlock`, or `musicalIntent` (ADR 0023).
```

---

## Backward-compatibility guarantee

All existing v5-compatible responses parse unchanged through v6:

1. A response with only `rhythm` (no `harmony`, no `saveAsBlock`, no `musicalIntent`)
   → `success: true`; `musicalIntent` is `undefined` in the parsed output.
2. A response with only `harmony` → `success: true`; `musicalIntent` is `undefined`.
3. A response with only `saveAsBlock` → `success: true`; `musicalIntent` is `undefined`.
4. A response with none of the four fields → `success: false` (guard unchanged).

No existing call site (`tryParseSkill`, `send()`) requires modification for v6 compatibility.
The `send()` function does not read `skill.musicalIntent`; it is simply present on the parsed
object but not accessed. `sendEvolution()` gains the musicalIntent wiring in step 03.4.

---

## OD-3 Option B reference (upstream filter)

**Pilot resolution (2026-06-19):** Option B — upstream filter.

`getExpressibleRecipes()` filters the catalog to recipes whose every `rhythmId` is
euclid-expressible or steps16-expressible before injecting ids into the LLM's context.
`recipeToAgentOutput` can assume every layer it receives is expressible; it adds a defensive
early return of `null` as a guard, not as a normal path.

Impact on the current 10-recipe catalog: zero — all 10 recipes are fully expressible.
`getExpressibleRecipes()` returns all 10.

---

## Byte-identical guarantee for existing responses

A response that does not contain `musicalIntent` produces bit-for-bit identical parsed output
through v6 vs. v5. The `musicalIntent` field is optional with no default — Zod treats missing
optional fields as `undefined`, which is the same runtime value as an absent field. The
serialized session (persistence layer) is unchanged (`SESSION_SCHEMA_VERSION` stays `5`).

---

## Decisions

### D1 — `MusicalIntentSchema` is a Zod object with 8 optional fields (see table above)

`recipeId` validation against the catalog is NOT enforced by Zod at parse time. The recipe
engine validates the id at call time. This is consistent with ADR 0021 D5's pattern (trigger
phrases in the prompt rather than Zod constraints on the LLM's choice).

### D2 — `superRefine` guard accepts `musicalIntent`-only responses

The guard condition adds `val.musicalIntent === undefined` alongside the existing three. This
allows the LLM to return only `musicalIntent.recipeId` without explicit rhythm/harmony, and
the recipe engine resolves it at call time.

### D3 — `SCHEMA_VERSION` bumped from 5 to 6

`SESSION_SCHEMA_VERSION` in `persistence.ts` is unchanged (stays 5) — `musicalIntent` is
not a persistence concern (it is agent-output-only and never stored in the session file).

### D4 — Exports: `MusicalIntentSchema`, `MusicalIntent` (inferred type)

```typescript
export const MusicalIntentSchema = z.object({ ... });
export type MusicalIntent = z.infer<typeof MusicalIntentSchema>;
```

`AgentOutput` already gains the new optional field automatically via `z.infer<typeof AgentOutputSchema>`.

---

## Consequences

### Files modified in step 03.2

| File | Nature of change |
|---|---|
| `src/agent/schema.ts` | Add `MusicalIntentSchema`; add `musicalIntent?` to `AgentOutputSchema`; update `superRefine` guard; bump `SCHEMA_VERSION` to 6; export `MusicalIntentSchema` and `MusicalIntent` type |
| `tests/schema.test.ts` | Extend with backward-compat tests, new-field tests, guard test, `SCHEMA_VERSION === 6` assertion, sub-field validation tests |
| `docs/adr/0023-musical-intent-schema.md` | This file |

### Invariants preserved

- `core/**` purity: `schema.ts` has no DOM/PIXI/Svelte imports (pure Zod).
- All existing tests pass unchanged.
- `AGPL-3.0` header on all modified files.
- No new runtime dependencies.

### Deferred

- Catalog-validation of `recipeId` at schema level — deferred; recipe engine validates at call time.
- `complexity` enum vocabulary alignment with `MusicalRecipe.density` ('sparse' vs 'simple') — noted: the schema uses `'simple'` and the catalog uses `'sparse'`; the LLM bridges the vocabulary gap with free-text in `style`/`explanation`. This is a known asymmetry, not a bug.

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 Inventory — `importSession` Skill

**Step:** 02.1 (read-only inventory)
**Date:** 2026-07-02
**Branch:** `song-import/phase-01` (Phase 02 will begin a new branch or extend this one)

---

## (a) Existing skill surface in `src/agent/`

### `src/agent/schema.ts` — exported symbols reusable or matchable by `importSession`

| Symbol | Type | Relevance to `importSession` |
|---|---|---|
| `SCHEMA_VERSION` | `const = 7` | `importSession` outputs `SavedSession` (not `AgentOutput`), so this constant is not embedded in the output schema. But `importSession` must assert `SCHEMA_VERSION === 7` to confirm alignment with the register. |
| `SK_QUAL` (internal const) | `['maj','min','dim','aug','pow']` | Mirrors the `Quality` union from `chords.ts`. `importSession`'s own `ChordSpecSchema` will redeclare this array as its `quality` enum — same values. |
| `SK_MODES` (internal const) | 8-mode enum | `importSession`'s `ImportSessionInputSchema.mode` field must match these exact values (resolved by OD-3). |
| `HarmonyChordCoreSchema` | Zod schema | Not directly reused in `importSession`'s input schema (which has a slightly different structure — `root: string` instead of `rootPc: number`). However the field names and constraints are the authoritative reference for `bars`, `gain`, `qual`. |
| `RhythmLayerSchema` / `RhythmSpecSchema` | Zod schemas | Not used in `importSession` input (groove is a hardcoded default). Referenced for the shape that `importSession`'s output rhythm must conform to when validated by `SavedSessionSchema`. |
| `SaveAsBlockSpecSchema` / `applyBlockSave` pattern | Zod + function | **Pattern to match:** `importSession` follows the same functional pattern — named exported pure function, companion Zod schema in the same file, no class, no side effects against the store. |

### `src/agent/apply.ts` — exported symbols

| Symbol | Type | Relevance to `importSession` |
|---|---|---|
| `applyRhythmSpec` | `(spec, opts?) => void` | Store-coupled. Not used by `importSession`. Pattern reference only. |
| `applyHarmonySpec` | `(spec) => void` | Store-coupled. Not used by `importSession`. Pattern reference only. |
| `applyBlockSave` | `(spec) => void` | **Closest pattern analog.** `importSession` follows the same functional shape (named, exported, pure function with no class/singleton). |
| `applyLockedFlags` | `(lockedSounds) => void` | Not relevant. |
| `applySampleMap` | `(map) => void` | Not relevant. |
| `getSessionState` | `() => SessionState` | Not relevant (store accessor). |

### Confirmation: no existing `importSession` export in `src/agent/`

The `src/agent/` directory contains exactly five files: `agent.ts`, `apply.ts`, `autopilot.ts`, `providers.ts`, `schema.ts`. Grep for `importSession` across `src/agent/` returns no results. No existing `importSession` export exists anywhere in the codebase.

---

## (b) Session construction path — CRITICAL: pure-function availability verdict

### The key question

Can `importSession` produce a valid `SavedSession` — specifically its blocks' `code` fields — without reading a live Svelte store?

### Call chain analysis

**Harmony codegen path (store-coupled wrappers vs pure sub-functions):**

`src/state/session.ts` exports two wrappers:

```
harmonyCode(state: SessionState): string
  └── calls: melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave)

sessionCode(state: SessionState): string
  └── calls: buildSession(layers, progression, chordMode, octave)
```

Both `harmonyCode` and `sessionCode` accept an **explicit `SessionState`** parameter — they are **not store-coupled in isolation**. However, `session.ts` itself imports from `svelte/store` and from multiple PIXI/DOM-touching modules at module load time. Importing `harmonyCode` or `sessionCode` from `session.ts` in a Node/test context would drag in the entire `session.ts` module graph, which includes Svelte store initialization. This creates a transitive Svelte dependency.

**Pure sub-functions in `src/core/codegen/strudel.ts` (no store coupling):**

```
melodyLine(
  progression: ReadonlyArray<HarmonySlotInput>,
  chordMode: 'chord' | 'arp',
  octave: number
): string
```

`melodyLine` is a pure function in `src/core/codegen/strudel.ts`. That file has **no DOM/PIXI/Svelte imports** — it only imports from `src/core/` modules (confirmed by the file header: "No DOM / PIXI / Svelte imports — pure engine, unit-testable"). `melodyLine` accepts all arguments explicitly; it does not read any store.

**VERDICT: `importSession` must call `melodyLine` directly from `src/core/codegen/strudel.ts`, NOT `harmonyCode` from `src/state/session.ts`.**

Calling `harmonyCode` from `session.ts` would pull in `svelte/store` transitively; calling `melodyLine` from `src/core/codegen/strudel.ts` is clean. This path is already used in tests for `chordToStrudel` and `melodyLine` (they run in Vitest/Node without any store setup).

### Full call sequence for `importSession`

For each section (producing one Block):

1. **Map `ChordSpec` → `HarmonySlotInput` compatible object:**
   ```
   { rootPc: noteToPc(spec.root), qual: spec.quality, gain: 0.6, bars?: spec.bars }
   ```
   — using `noteToPc` from `src/core/theory/pitch.ts` (pure, no store).

2. **Generate block code:**
   ```
   melodyLine(slots, 'chord', octave)
   ```
   — from `src/core/codegen/strudel.ts` (pure, no store).
   Result is the block's `code` field after `.trim()`.

3. **Compute block `bars`:** sum of each chord's `bars` (defaulting absent to 1), clamped to `[1, 64]`. No store needed — purely arithmetic.

4. **Assemble `Block` object** (plain object, not through `addBlock`):
   ```typescript
   {
     name: `${input.songTitle} — ${section.label}`,
     type: 'armonia',
     code: melodyLine(slots, 'chord', octave).trim(),
     bars: clampedSectionBars,
     label: section.label,
   }
   ```
   Note: `addBlock` in `session.ts` is **not used** — it reads the live store (calls `get(sessionStore)`) and writes back. `importSession` assembles the Block object directly (same shape as `SavedBlockSchema`).

5. **Assemble `SavedSession`** (plain object):
   ```typescript
   {
     version: SESSION_SCHEMA_VERSION,   // from persistence.ts (pure constant)
     bpm: input.bpm,
     view: 'harmony',
     chordMode: 'chord',
     harmony: { root: noteToPc(input.key), mode: input.mode, octave, progression: [...] },
     rhythm: { layers: [{ sound: 'bd', steps: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] }] },
     composition: { blocks: [...], tracks: [{ blockRefs: [...] }] },
   }
   ```

**Conclusion: no store coupling problem.** `importSession` is fully implementable as a pure function using `melodyLine` directly from `src/core/codegen/strudel.ts`, `noteToPc` from `src/core/theory/pitch.ts`, and `SESSION_SCHEMA_VERSION` from `src/lib/persistence.ts`. None of these paths require a live Svelte store. There is NO ADR-trigger #2 blocker — the pure path exists and is already exercised by existing tests.

### Note on `buildComposition`

`buildComposition` (from `src/core/composition/model.ts`) is pure and takes explicit `blocks`/`tracks` parameters. It is not needed by `importSession` — `importSession` produces a `SavedSession` (the serialized form), not a live Strudel composition string. `buildComposition` is the render step used when playing the composition timeline and is irrelevant to the pure translation.

---

## (c) `pow` quality in the codegen path

### Confirmation

Phase 01 delivered the full `pow` codegen path. Evidence:

- `QUAL_INTERVALS['pow'] = [0, 7]` in `src/core/theory/chords.ts` (root + perfect fifth, 2-element array).
- `chordVoicing(rootPc, 'pow', octave)` returns a 2-element array, e.g. for E (rootPc=4) at octave 2: `['E2', 'B2']`.
- `melodyLine` and `chordToStrudel` use `chordVoicing(…).join(',')` for chord mode → `"E2,B2"`.
- The `SavedChordSchema.qual` and `SavedChordSnapshotEntrySchema.qual` both include `'pow'` in `SK_QUAL`.

### Exact Strudel string for a representative power chord

**E5 (E power chord) at octave 2:**
```
note("E2,B2").s("sawtooth").lpf(20000.00).gain(0.60).room(0.25)
```

This is what `chordToStrudel(4, 'pow', 0.6, 'chord', 2)` produces (E = rootPc 4, default instrument/room). In the `melodyLine` arrange-form (when `bars !== 1`) the voicing appears inside brackets: `note("[E2,B2]")`.

For the golden fixture (B5 at octave 2, B = rootPc 11):
```
note("B2,F#3").s("sawtooth").lpf(20000.00).gain(0.60).room(0.30)
```
(B + perfect fifth = F#; octave wraps: (11+7)%12 = 6 = F#, octave 2+floor(18/12) = 3)

**OD-1 confirmed:** The `note("…")` comma-joined form is the canonical `pow` codegen, byte-identical to existing non-pow chord codegen. No new codegen code is needed.

---

## (d) `Block.label` in the composition path

### `SavedBlockSchema` accepts `label?: string`

Confirmed in `src/lib/persistence.ts` line 289:
```typescript
/** Optional section label — song-import Phase 01. Additive; absent in pre-Phase-01 sessions. */
label: z.string().optional(),
```

### `serializeSession` / `deserializeSession` round-trip

- `serializeSession` (line 435–436): `...(b.label !== undefined ? { label: b.label } : {})` — label is carried through when present, omitted otherwise.
- `deserializeSession` (line 572–573): `...(b.label !== undefined ? { label: b.label } : {})` — label is restored when present.

Phase 01 step 01.4 (quality gate) confirmed 2104 tests pass, including the block-label tests introduced in step 01.3 (A-01-18 / A-01-19).

### Conclusion for `importSession`

Setting `label: section.label` on each assembled block object will:
1. Pass `SavedBlockSchema.safeParse` (field is `z.string().optional()`).
2. Survive round-trip through `serializeSession`/`deserializeSession`.
3. Display correctly in the Composition timeline (Phase 01 step 01.3 wired this up).

No changes to any existing schema or serialization code are needed.

---

## (e) OD-3: Chart-acquisition input boundary

**OD-3 is RESOLVED (Pilot decision 2026-07-02). Option A is confirmed.** This section records the evaluation for documentation purposes and confirms the resolved shape.

### Option A — LLM-native structured chart (RESOLVED / SELECTED)

Input shape:
```typescript
{
  songTitle: string;
  artist?: string;
  bpm: number;           // int, [40, 280]
  key: string;           // root note name: "E", "A", "C#", etc.
  mode: string;          // one of the 8 SK_MODES values
  sections: Array<{
    label: string;       // "Intro", "Verse 1", "Chorus", etc.
    chords: Array<{
      root: string;      // note name
      quality: Quality;  // 'maj'|'min'|'dim'|'aug'|'pow'
      bars?: number;     // defaults to 1
    }>;
  }>;
}
```

This is a pure validator+translator: the function accepts a fully-structured object and maps it to a `SavedSession`. Whoever populates the object (an LLM using its own knowledge, a future scraper, a test fixture) is entirely out of scope for this phase.

**Rationale (one sentence):** Option A produces a clean, type-safe boundary that makes `importSession` a pure translator with a trivially testable golden fixture — the parsing/interpretation concern stays upstream and can be solved independently in a future scraping or LLM-prompt phase.

### Option B — Raw tab text (NOT selected)

Would have bundled free-text parsing + translation into a single function, creating brittleness against tab-format variations and mixing two concerns in one unit.

### What OD-3 resolution gates

- `ImportSessionInputSchema` is defined with the structured Option A fields.
- The golden fixture in step 02.2 is a hardcoded `ImportSessionInput` object (not a string).
- No tab-parsing logic is written in `src/agent/import-session.ts`.

---

## (f) Exhaustiveness / dependency audit

### Files to CREATE in step 02.2

| File | Description |
|---|---|
| `src/agent/import-session.ts` | New file: `IMPORT_SCHEMA_VERSION`, `ChordSpecSchema`, `SectionSpecSchema`, `ImportSessionInputSchema`, `ImportSessionInput` type, `importSession` function. AGPL-3.0 header required. |
| `tests/song-import/import-session.test.ts` | New test file: golden-fixture test, schema round-trip, `pow` codegen assertion, `Block.label` assertion, section count, track structure, version fields, regression guard. |

### Files to MODIFY in step 02.2

**None.** The skill is purely additive. No existing file outside `src/agent/` needs modification.

Verification:
- `src/lib/persistence.ts` — `SavedSessionSchema` already accepts `version: 7`, `qual: 'pow'`, and `label?: string`. No change needed.
- `src/agent/schema.ts` — `SCHEMA_VERSION = 7` already. `importSession` uses its own `IMPORT_SCHEMA_VERSION`. No change needed.
- `src/core/**` — all pure engine functions (`melodyLine`, `noteToPc`, `chordVoicing`) are already exported and accessible. No change needed.
- `src/state/session.ts` — `addBlock` and `harmonyCode` are NOT used by `importSession` (pure path via `melodyLine` directly). No change needed.

### Type imports needed from `src/core/**` and `src/lib/**`

| Import | Source file | Already exported? |
|---|---|---|
| `Quality` | `src/core/theory/chords.ts` | Yes (`export type Quality`) |
| `melodyLine` | `src/core/codegen/strudel.ts` | Yes (`export function melodyLine`) |
| `noteToPc` | `src/core/theory/pitch.ts` | Yes (`export function noteToPc`) |
| `SESSION_SCHEMA_VERSION` | `src/lib/persistence.ts` | Yes (`export const SESSION_SCHEMA_VERSION`) |
| `SavedSession` | `src/lib/persistence.ts` | Yes (`export type SavedSession`) |
| `SavedSessionSchema` | `src/lib/persistence.ts` | Yes (`export const SavedSessionSchema`) |

All needed exports are already present. No new exports need to be added to any existing file.

### Test directory check

`tests/song-import/` does not yet exist (Phase 01 tests for `pow` are in `tests/theory/chords.test.ts` and `tests/codegen/strudel.test.ts`). Step 02.2 must create the `tests/song-import/` directory along with `import-session.test.ts`. No `vitest.config` changes are needed — the existing config picks up all `tests/**/*.test.ts` files by glob.

### No new dependencies needed

`zod` is already in `package.json`. No additional packages are required for `importSession`.

### Summary of ADR triggers

- **ADR 0026 (OD-3 Option A canonical form):** OD-3 is resolved; step 02.2 should write ADR 0026 documenting Option A, the `ImportSessionInputSchema` shape, and the rationale. This is a pre-listed trigger in the phase file.
- **ADR-trigger #2 (store coupling):** RESOLVED — no store coupling problem exists (see section b). No ADR needed for a workaround. A comment in `import-session.ts` noting that `melodyLine` is called directly (not via `harmonyCode`) suffices.

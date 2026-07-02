<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — Song-Import Data Model Foundation

**Step:** 01.1 (read-only)
**Date:** 2026-07-02
**Branch:** main (no source files modified)

---

## (a) `Quality` enum — current members and narrowing sites

### Current definition

`src/core/theory/chords.ts` line 8:
```typescript
export type Quality = 'maj' | 'min' | 'dim' | 'aug';
```
Four-member union. No `'pow'` member exists.

### All narrowing sites

The following sites either key into `QUAL_INTERVALS` (implicit narrowing via `Record<Quality, …>` access), compare quality values in if/else or ternary chains, or declare `z.enum(SK_QUAL)` validators. Every site must receive a `'pow'` arm in step 01.2.

| File | Line(s) | Narrowing form |
|---|---|---|
| `src/core/theory/chords.ts` | 14–19 | `QUAL_INTERVALS: Record<Quality, readonly number[]>` — key access is the implicit narrowing. Adding `'pow'` extends the record; all callers of `QUAL_INTERVALS[qual]` will automatically include the new entry. |
| `src/core/theory/chords.ts` | 43 | `chordLabel`: ternary chain `qual === 'min' ? … : qual === 'dim' ? … : qual === 'aug' ? …` — `'pow'` falls through to the empty string (outputs root name only, which is wrong). **Must add explicit `'pow'` arm.** |
| `src/core/theory/chords.ts` | 27–35 | `triadQuality`: matches `t3`/`t5` pairs for the four existing qualities; `'pow'` has only two notes so `[t3, t5]` cannot be derived from a 2-element abs array using the same `[number, number, number]` signature. No change needed to `triadQuality` for Phase 01 (power chords are not created via Tonnetz triangles — they arrive via import). The function's return type already includes `'?'` for unrecognised structures; a 2-element input would not reach it. No code path in Phase 01 calls `triadQuality` on a power chord. |
| `src/core/theory/chords.ts` | 51–53 | `chordPcs`: calls `QUAL_INTERVALS[qual].map(…)` — no explicit narrowing, but the `Record<Quality, readonly number[]>` lookup means adding `pow: [0, 7]` is sufficient. Returns a 2-element array for `'pow'`. |
| `src/core/theory/chords.ts` | 61–67 | `chordVoicing`: same pattern as `chordPcs` — QUAL_INTERVALS lookup drives output. For `'pow'` this returns a 2-element voicing, not 3. |
| `src/lib/persistence.ts` | 53 | `const SK_QUAL = ['maj', 'min', 'dim', 'aug'] as const;` — `z.enum(SK_QUAL)` used in `SavedChordSchema.qual` (line 59) and `SavedChordSnapshotEntrySchema.qual` (line 202). **Must add `'pow'`.** |
| `src/agent/schema.ts` | 60 | `const SK_QUAL = ['maj', 'min', 'dim', 'aug'] as const;` — `z.enum(SK_QUAL)` used in `HarmonyChordCoreSchema.quality` (line 154). **Must add `'pow'`.** |
| `src/agent/apply.ts` | 60 | `const SK_QUAL: readonly string[] = ['maj', 'min', 'dim', 'aug'];` — local copy, not imported from schema.ts. Used for validation guard in `applyHarmonySpec` (line 268). **Must add `'pow'`.** |
| `src/core/composition/snapshot.ts` | 50 | `ChordSnapshotEntry.qual: 'maj' \| 'min' \| 'dim' \| 'aug'` — a hardcoded 4-member union literal. **Must add `'pow'`** so that a `pow` chord in a saved block snapshot round-trips correctly. |
| `src/core/harmony/voice-tracks.ts` | 237 | `chordPcs(ch.rootPc, ch.qual) as [number, number, number]` — **casts the return value to a 3-tuple**. For `'pow'`, `chordPcs` returns 2 elements; this cast would be wrong. The line is used inside `computeVoiceTracks` to feed `minimalVoiceLeading([prev], [next])` which expects `[number, number, number]` on both sides. **Must add a guard: if `qual === 'pow'`, skip or short-circuit the voice-tracks computation for that slot.** |
| `src/core/harmony/voice-tracks.ts` | 243 | `chordVoicing(ch.rootPc, ch.qual, octave)` followed by `for (let v = 0; v < 3; v++)` — iterates exactly 3 voices. For `'pow'`, voicing has 2 elements; index `[2]` would be undefined. **Must guard.** |
| `src/core/harmony/voice-tracks.ts` | 266 | `QUAL_INTERVALS[ch.qual][perm[v]]` — `perm` is a 3-element permutation from `minimalVoiceLeading` which expects 3-voice input. For `'pow'`, `perm` would have 2 elements; index `[2]` undefined. **Must guard.** |
| `src/core/music-knowledge/recipe-engine.ts` | 36 | `QUALITY_DOWNSAMPLE: Readonly<Record<HarmonyQuality, 'maj' \| 'min' \| 'dim' \| 'aug'>>` — its value type is `'maj' \| 'min' \| 'dim' \| 'aug'`, the pre-existing 4-member union. If the output type widens to include `'pow'` in a future phase (where recipe chords can be `pow`), this map's return type must also widen. For Phase 01, the recipe engine does not produce `'pow'` chords, so this site does **not** require a Phase 01 change. Noted for awareness. |
| `src/render/pentagrama-scene.ts` | 428, 516, 984, 1052 | `chordVoicing(slot.rootPc, slot.qual as Quality, octave)` and `chordLabel(chord.rootPc, chord.qual as Quality)` — these are render-layer casts; they do not narrow on `'pow'` independently but will receive `'pow'` if a `pow` chord enters the progression. `pChord` and `pArp` iterate over `voices.forEach(…)` which is length-agnostic — 2-element voicing is safe. The tonal-function color lookup (`dmap[key]`) will simply find no entry for `pow` chords (not diatonic) and fall back to `'#9097a6'` / `'#8aa0ff'` accent color — safe. **No crash; no change needed for Phase 01 render behavior**, but OD-2 resolution may dictate a distinct color treatment. |
| `src/render/tonnetz-scene.ts` | 431 | `d.qual === 'maj' \|\| d.qual === 'min'` — suggestion filter for tonal-function next-chord hints. Explicit `maj`/`min` guard; `'pow'` is not a Tonnetz triangle and will never be in `_renderTris`, so this site never sees `'pow'`. No change needed. |
| `src/ui/ProgressionChips.svelte` | 163 | `tonalClass(ch.rootPc, ch.qual, …)` — `qual` is passed as `string` (not `Quality`); `dmap` lookup uses `rootPc:qual` key string and falls back gracefully for unknown keys. Safe for `'pow'`; no change needed. |
| `src/ui/ProgressionStrip.svelte` | 623 | Same pattern as `ProgressionChips.svelte`. Safe. |

---

## (b) `chordPcs` and `chordVoicing` output shape

### Current output shape per quality

| Quality | `chordPcs` output | `chordVoicing` output | Element count |
|---|---|---|---|
| `'maj'` | `[root, (root+4)%12, (root+7)%12]` | 3 note strings | 3 |
| `'min'` | `[root, (root+3)%12, (root+7)%12]` | 3 note strings | 3 |
| `'dim'` | `[root, (root+3)%12, (root+6)%12]` | 3 note strings | 3 |
| `'aug'` | `[root, (root+4)%12, (root+8)%12]` | 3 note strings | 3 |
| `'pow'` (proposed) | `[root, (root+7)%12]` | 2 note strings | **2** |

### Callers that assume exactly 3 elements

The following callers will break if `chordPcs` or `chordVoicing` returns 2 elements without a guard:

1. **`src/core/harmony/voice-tracks.ts` line 237**: `chordPcs(ch.rootPc, ch.qual) as [number, number, number]` — hard 3-tuple cast. If `qual === 'pow'`, this cast is unsound; `chordPcs` returns `[rootPc, (rootPc+7)%12]` (2 elements). The cast does not throw at runtime (TypeScript casts are erased), but passing a 2-element array to `minimalVoiceLeading` which expects `[number, number, number]` will cause undefined `perm[2]` access downstream (line 266). **Must guard: treat `pow` chord slots in `voice-tracks.ts` as opaque — fall through to the "rest/note" branch (emit rest events for all 3 voices) or skip voice-leading for that slot.**

2. **`src/core/harmony/voice-tracks.ts` line 243**: `chordVoicing(ch.rootPc, ch.qual, octave)` — followed by `for (let v = 0; v < 3; v++)` (lines 246, 264). With 2 elements, `voicing[2]` is `undefined`; `fullNote` would be `undefined + octave` = `"undefined3"` — corrupt note name. **Must guard.**

3. **`src/core/harmony/voice-tracks.ts` line 266**: `QUAL_INTERVALS[ch.qual][perm[v]]` where `perm` is a 3-element permutation from `minimalVoiceLeading(prevPcs, nextPcs)` — both arguments are typed `[number, number, number]`. A `pow` chord would receive `nextPcs` as a 2-element array coerced to a 3-tuple; `minimalVoiceLeading` would access `nextPcs[2]` = `undefined`. **Must guard.**

No other callers destructure exactly 3 elements from `chordPcs`/`chordVoicing`. Callers that use `voices.forEach(…)` (pentagrama-scene.ts `pChord`, `pArp`) are length-agnostic and safe.

---

## (c) `Block` interface — current fields and `label` additive analysis

### Current fields in `src/core/composition/model.ts`

```typescript
export interface Block {
  id: string;
  name: string;
  type: 'groove' | 'armonia' | 'sesion';
  code: string;
  bars: number;
  snapshot?: BlockSnapshot;
}
```

`label` is **absent**. Confirmed by reading `src/core/composition/model.ts` lines 21–35.

### `SavedBlockSchema` in `src/lib/persistence.ts` (lines 280–287)

```typescript
const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
  snapshot: SavedBlockSnapshotSchema.optional(),
});
```

`label` is absent. Adding `label: z.string().optional()` is purely additive: Zod `.optional()` means old blobs (without the field) parse cleanly — `label` is `undefined`. **No `SESSION_SCHEMA_VERSION` bump is needed for the `label` field.** This is consistent with how `snapshot?` was added in editable-composition Phase 01 without a version bump (it was additive).

### `serializeSession` / `deserializeSession` analysis

`serializeSession` (persistence.ts lines 421–429) serializes blocks via:
```typescript
blocks: state.composition.blocks.map((b) => ({
  name: b.name,
  type: b.type,
  code: b.code,
  bars: b.bars,
  ...(b.snapshot !== undefined ? { snapshot: b.snapshot } : {}),
})),
```
`label` is not currently included in the spread. Step 01.3 must add `...(b.label !== undefined ? { label: b.label } : {})`.

`deserializeSession` similarly maps blocks without `label`; step 01.3 must add `label: b.label` (where `b` is the parsed `SavedSession` block). Because `SavedBlockSchema.label` is optional, `b.label` is `string | undefined` — safe assignment to `Block.label?: string`.

---

## (d) OD-1: Power chord Strudel codegen — evaluation and recommendation

### Options evaluated

**Option A: Two simultaneous notes in mini-notation**

`note("E2 B2").s("triangle").lpf(800).gain(0.60).room(0.30)`

Space-separated notes inside `note("…")` are interpreted by Strudel's mini-notation parser as a **sequence** (slowcat of the two notes within the slot's time span) — **not simultaneous**. To get simultaneity inside the `note()` mini-notation, Strudel uses `[…,…]` (stack/comma syntax within the string) rather than space-separated.

Thus `note("E2 B2")` in Strudel mini-notation plays E2 for the first half, then B2 for the second half of the cycle — an arpeggio of two notes, not a power chord.

To produce two simultaneous notes, the correct mini-notation form is `note("[E2,B2]")` — square brackets with a comma. This is the poly/chord stack form.

**Corrected Option A (recommended):** `note("[E2,B2]").s("triangle").lpf(800).gain(0.60).room(0.30)`

This is semantically equivalent to `note("E2,B2")` with implicit grouping. The bracket form `[E2,B2]` is unambiguous in Strudel mini-notation and produces two simultaneous notes — verified against Strudel's mini-notation documentation (strudel.cc/learn/mini-notation/#parallel-sequences).

For the `chordToStrudel` codegen path: the existing chord emit already uses `notes.join(',')` for chord mode → `note("C3,E3,G3")`. Power chord should follow the same pattern: `note("E2,B2")`. When placed inside the `arrange()` path, it becomes `note("[E2,B2]")` (the brackets come from the existing `'[' + voicing.join(sep) + ']'` pattern in `melodyLine`'s arrange branch — line 324). In `chordToStrudel` (used for the direct slowcat path and preview play), the pattern is `note("${inner}")` where `inner = notes.join(',')` — so `note("E2,B2")`.

**Option B: `stack(note("E2"), note("B2"))`**

This produces two separate patterns. It cannot be inlined in `arrange([bars, …])` as a single segment without wrapping in a function. It also breaks the existing chain pattern `.s(…).gain(…).room(…)` because `stack(…)` returns a pattern, not chainable with `.s()` globally. This option is more complex and less idiomatic for the single-slot use case. **Not recommended.**

**Option C: Strudel chord shorthand (e.g., `"E2'5"` or `"E25"`)**

Strudel's chord notation uses `note("C'maj")` for named chords. There is no standard named-chord shorthand for "power chord" (root + fifth, no third) in Strudel's chord vocabulary at `@strudel/web@1.0.3`. The `'5` suffix is not a registered chord name in Strudel's tonal library. Using an unverified shorthand risks silence or error at runtime. **Not recommended.**

### Recommendation: Option A (corrected)

**Recommended form:** Emit `note("${root}${octave},${fifth}${fifthOctave}")` using comma-separated simultaneous notes — the same pattern as existing chord codegen. For the `chordToStrudel` function: build `inner = [rootName, fifthName].join(',')` and emit `note("${inner}").s("${resolved.instrument}").lpf(${resolved.lpf}).gain(${g.toFixed(2)}).room(${resolved.room})…`. For the `melodyLine` arrange branch: emit `note("[${root},${fifth}]")` following the existing bracket-wrap pattern (line 324).

**Rationale:** Comma-separated simultaneous notes inside `note("…")` is the idiomatic Strudel mini-notation form for parallel (chord) playback; it is already used for all existing chord codegen, is unambiguous in `@strudel/web@1.0.3`, and requires no new API calls or pattern combinators.

---

## (e) OD-2: Power chord Tonnetz / Pentagrama rendering — evaluation and recommendation

### Context

Power chords (`'pow'`) have no canonical Tonnetz triangle because triangles encode triads (root + third + fifth). A `pow` slot in `harmony.progression` is a chord that arrived via import — it is never picked by clicking the Tonnetz. The Tonnetz paint path (`buildTonnetz`, `tickHarmony`) builds triangles from `computeTonnetzTriangles` which uses `triadQuality`; `'pow'` intervals `[0, 7]` would return `'?'` from `triadQuality` and never appear in `_renderTris`. No Tonnetz crash is expected from `pow` in the progression: `updateTonnetzDynamic` skips `'?'`-quality triangles naturally (they never appear in `_renderTris`).

The `pickChord()` path (Tonnetz triangle click) only operates on existing `_renderTris` — none will have `qual === 'pow'`. `findRenderTriForChord` for a `pow` chord returns `null` (no matching triangle) → the `_lastPick` is not updated → P·L·R neighbors are not computed → the suggestion strip is unaffected. **No Tonnetz render crash.**

For the Pentagrama progression strip, chord rendering uses `chordVoicing` to draw sustain bars and gemstone circles. With 2 voices (root + fifth), `voices.forEach(…)` iterates exactly 2 times — safe. The tonal-function color lookup (`dmap[key]` where `key = "${chord.rootPc}:${chord.qual}"`) will not find `"4:pow"` in the diatonic map → `dfn` is `undefined` → falls back to `'#9097a6'`/`'#8aa0ff'`.

### Options evaluated

**Option A: `accent` color (`#8aa0ff`) for `pow` chips — no Tonnetz highlighting**

Power chord has no third, so tonal function (T/SD/D) cannot be determined. Using `accent` (`#8aa0ff`) as the fallback is already what the existing code does for non-diatonic chords (dmap miss). This requires no new code changes for the basic render: the existing `dmap` miss falls back to `#9097a6` (gray) for the hover label and `#8aa0ff` for the NoteSlot accent in spotlight. A deliberate `accent` color for `pow` chips is consistent with the existing accent fallback and visually distinguishes power chords from triads.

The spotlight color in `pentagrama-scene.ts` (line 876–883) already handles non-triad slots with `'#8aa0ff'` accent. `pow` slots would follow the same path (they are not `isRest` and not `isNote` — they reach the `!('isRest' in activeSlot) && !isNoteSlot(activeSlot)` branch as `Chord`-type objects, get the dmap lookup, miss it, and keep `spotCol = '#8aa0ff'`).

**Option B: Tonic color (`#f3b15a`) regardless of root**

Simplest fallback but misleading — implies tonic function for a power chord that may not be functioning tonically. Not recommended.

**Option C: Compute tonal function from root pitch class only**

Root-only tonal function is possible but ambiguous — a root on scale degree 1 would show tonic color even for a chord whose third determines whether it is actually tonic or not. Power chords specifically avoid the third for a reason (ambiguity). Using this approach would produce misleading colors that contradict the Tymoczko-based color legend. Not recommended.

### Recommendation: Option A (`accent` color `#8aa0ff`)

**Rationale:** The existing code already falls back to `#8aa0ff` accent for non-diatonic chord slots (dmap miss), so `pow` chips will render with the accent color without any additional code. The OD-2 decision is to make this behavior explicit and intentional (document it) rather than relying on the implicit miss. No extra render code is needed for Phase 01 — the existing fallback handles `pow` correctly. Tonnetz highlighting is skipped entirely (no triangle for `pow` in `_renderTris`).

**Crash analysis:** No render crash expected. The three potential crash paths are:
1. `chordVoicing` called on `pow` → returns 2 elements; `forEach` is safe. No crash.
2. `dmap[key]` lookup for `pow` → `undefined`; existing guard `if (dfn !== undefined && dfn.func.cls !== '')` prevents the badge render. No crash.
3. Tonnetz `findRenderTriForChord` for `pow` → returns `null`; `_lastPick` not updated. No crash.

---

## (f) Exhaustiveness audit — all files that narrow on `Quality` values

Every file in this list must receive a `'pow'` arm or guard in step 01.2. Files where no change is needed are marked `no-change`.

| File | Change required |
|---|---|
| `src/core/theory/chords.ts` | **YES** — `QUAL_INTERVALS` add `pow: [0, 7]`; `chordLabel` add `'pow'` arm; `chordPcs` and `chordVoicing` inherently handle via QUAL_INTERVALS lookup (no explicit branch needed but callers must be audited). |
| `src/lib/persistence.ts` | **YES** — `SK_QUAL` add `'pow'`; `SavedChordSnapshotEntrySchema.qual` (uses `z.enum(SK_QUAL)`) updated automatically; `SESSION_SCHEMA_VERSION` bump to 7. |
| `src/agent/schema.ts` | **YES** — `SK_QUAL` add `'pow'`; `HarmonyChordCoreSchema.quality` (uses `z.enum(SK_QUAL)`) updated automatically; `SCHEMA_VERSION` bump to 7. |
| `src/agent/apply.ts` | **YES** — local `SK_QUAL` array add `'pow'` (line 60). |
| `src/core/composition/snapshot.ts` | **YES** — `ChordSnapshotEntry.qual` literal union add `'pow'` (line 50). |
| `src/core/harmony/voice-tracks.ts` | **YES** — guard `pow` chords at lines 237, 243, 266. `computeVoiceTracks` must skip or emit rest events for `pow` slots (2-voice input is incompatible with the 3-voice voice-leading pipeline). Per the `registerMode` decision (Decisions Register), `voice-tracks.ts` is visual-only and does not affect audio, so treating `pow` as an opaque duration (rest events for all 3 visual tracks) is safe. |
| `src/core/codegen/strudel.ts` | **YES** — `chordToStrudel` and the `melodyLine` arrange-branch chord arm must handle `'pow'` with the OD-1-resolved codegen form. |
| `src/render/pentagrama-scene.ts` | `no-change` — existing `dmap` miss and `forEach` length-agnostic iteration handle `pow` safely. No explicit `'pow'` guard needed. |
| `src/render/tonnetz-scene.ts` | `no-change` — `pow` never appears in `_renderTris`; all existing `qual`-based lookups are safe. |
| `src/core/music-knowledge/recipe-engine.ts` | `no-change` — `QUALITY_DOWNSAMPLE` maps `HarmonyQuality` (catalog vocabulary) to `'maj'\|'min'\|'dim'\|'aug'`; Phase 01 does not introduce `pow` into catalog recipes. |
| `src/ui/ProgressionChips.svelte` | `no-change` — `tonalClass` uses `qual` as a string key; dmap miss is graceful. |
| `src/ui/ProgressionStrip.svelte` | `no-change` — same pattern as ProgressionChips. |
| `src/state/session.ts` | Review required in step 01.2 — `Chord` type (line 154) uses `qual: Quality` which is a type alias; when `Quality` gains `'pow'`, `Chord` automatically accepts it. `playChord` (line 948) calls `chordToStrudel(rootPc, qual, …)` — the updated `chordToStrudel` handles `pow`. `chordLabel(rootPc, qual)` (line 965) — updated in `chords.ts`. No structural changes needed in `session.ts`, but the file should be read in step 01.2 to confirm. |

---

## (g) Schema version analysis

### Current versions

- `SESSION_SCHEMA_VERSION = 6` (`src/lib/persistence.ts` line 21)
- `SCHEMA_VERSION = 6` (`src/agent/schema.ts` line 28)

### Why bumping to 7 is required for `'pow'`

Both schemas use `z.enum(SK_QUAL)` to validate chord quality. This is a **strict** validator — it rejects any value not in the enum. Adding `'pow'` to `SK_QUAL` changes the validator from a strict 4-member enum to a strict 5-member enum.

**Backward incompatibility in two directions:**

1. **Old parser, new session with `pow` chord:** An old parser (v6) has `SK_QUAL = ['maj', 'min', 'dim', 'aug']`. A session blob containing `{ qual: 'pow' }` fails `z.enum(SK_QUAL)` → the entire session fails to parse. Old code cannot read new sessions with `pow` chords.

2. **New parser, old session:** Old sessions (v6) have no `'pow'` chords (they predate the feature). A new v7 parser can read old sessions cleanly — the `z.enum` widening is backward-compatible for old data.

The `version: z.literal(6)` check in `SavedSessionSchema` (line 320) ensures a v6-versioned session cannot accidentally be loaded by a v7 parser expecting `z.literal(7)`. Bumping the literal from `z.literal(6)` to `z.literal(7)` and updating `SESSION_SCHEMA_VERSION` to `7` ensures:
- Old v6 sessions fail the version check → dropped by `safeParse` graceful degradation (consistent with every prior bump: ADR 0020 D5, ADR 0019 D5, ADR 0018 D3, ADR 0013 D1).
- New v7 sessions are parseable only by code that includes `'pow'` in `SK_QUAL`.

**Additive `label` field does NOT require a version bump** (section c above). The `SESSION_SCHEMA_VERSION` bump to 7 is driven exclusively by the `SK_QUAL` extension for `'pow'`.

**Agent `SCHEMA_VERSION = 7`:** The agent schema's `SK_QUAL` is also extended. `HarmonyChordCoreSchema.quality: z.enum(SK_QUAL)` will accept `'pow'` once updated. The agent output schema version tracks the agent's ability to emit `pow` quality chords. Bumping from 6 to 7 is consistent with every prior bump (documented in `schema.ts` lines 12–27).

### Existing tests that assert version values

Tests that hard-assert `SESSION_SCHEMA_VERSION === 6` or `SCHEMA_VERSION === 6` must be updated to `=== 7` in step 01.2. These can be found by:
```
grep -rn "SESSION_SCHEMA_VERSION\|SCHEMA_VERSION" tests/
```
(to be confirmed in step 01.2 before editing).

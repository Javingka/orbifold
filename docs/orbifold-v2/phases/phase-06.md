# Phase 06 — Rests in the harmony progression

**Purpose:** Add silent (rest) slots to the harmony progression: data model, Strudel codegen, persistence, agent schemas, voice-tracks gap events, and ProgressionStrip rendering.
**Gate:** Phase 05 complete and Pilot-approved on `orbifold-v2/phase-05` branch; 307 tests passing; `tsc --noEmit` / `pnpm lint` / `pnpm build` exit 0.
**Expected phase result:** `ProgressionSlot = Chord | RestSlot` governs `HarmonyState.progression`; `melodyLine()` emits `[bars, silence]` for rest slots in the `arrange()` path; `SavedSessionSchema` and agent `HarmonyChordSchema` accept rest entries; `computeVoiceTracks()` produces `VoiceRestEvent` gap events; `ProgressionStrip` renders and edits rest slots with an "Add Rest" affordance; all quality gates pass.

---

## Step 06.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-05-handoff.md` (phase completion entry), and `docs/orbifold-v2/phases/phase-06.md` (this file). Then read: `src/state/session.ts` (complete), `src/core/codegen/strudel.ts` (complete), `src/lib/persistence.ts` (complete), `src/agent/schema.ts` (complete), `src/agent/apply.ts` (complete), `src/core/harmony/voice-tracks.ts` (complete), and `src/ui/ProgressionStrip.svelte` (lines 1–200 for structure and reactive state). Also read `src/core/composition/model.ts` lines 70–100 (confirm `silence` keyword and `arrange()` pattern). Produce `docs/orbifold-v2/inventories/phase-06-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the `Chord` interface fields in `session.ts`: `rootPc`, `qual`, `gain`, `cx?`, `cy?`, `bars?`. Record `HarmonyState.progression` type (`Chord[]`). Record all exported store actions that touch `progression`: `clearChordAt`, `setChordBars`, `clearProgression`. Note `deriveLiveCode` (lines 442–462) and its `source === 'chord'` branch (lines 456–461): it reads `progression[progression.length - 1]` and calls `chordToStrudel(ch.rootPc, ch.qual, ch.gain, ...)` — this branch must be guarded for rest slots in step 06.3.
- Confirm `melodyLine()` dual-mode condition in `strudel.ts`: `progression.every((ch) => (ch.bars ?? 1) === 1)`. Record the slowcat and `arrange()` path output formats. Record how `silence` is used in `composition/model.ts` line 94 (`segs.push(\`  [${tb - sum}, silence]\`)`) — exact format: two leading spaces, no quotes around `silence`.
- Confirm `SavedChordSchema` fields, `SESSION_SCHEMA_VERSION = 1`, and `SavedHarmonySchema.progression: z.array(SavedChordSchema).max(16)` in `persistence.ts`.
- Confirm `SCHEMA_VERSION = 1` and `HarmonyChordSchema` in `schema.ts`: requires `root: z.string()` and `quality: z.enum(SK_QUAL)` (no rest variant). Record that `applyHarmonySpec` skips any element where `noteToPc(c.root)` returns null (line 144–145) — rest elements from the agent must be a new discriminated variant, not a chord with a null root, to avoid silent omission.
- Confirm `VoiceEvent` interface, `VoiceTrack` type, `ChordInput` internal interface, and Phase 06 extension points in `voice-tracks.ts` comments (lines 4–6, 18–19, 43–45, 79–80).
- Record the `silence` keyword format confirmed from `composition/model.ts`: the literal string `silence` (no quotes, no surrounding string delimiters) is emitted directly into the pattern string.
- Confirm current test count: 307 (from Phase 05 completion entry in `phase-05-handoff.md`).
- Record open question for ADR 0012: Zod `z.union` tries schemas in order and returns the first match; if the rest schema is listed first, an entry with `isRest: true` plus chord fields (`root`, `quality`) will parse as a rest (chord fields stripped). Document whether this is the desired behavior.

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-06-inventory.md` present and complete.
- All Phase 06 extension points in `voice-tracks.ts` source comments explicitly noted and confirmed.

CHECKPOINT → Commit message:
`docs(harmony): Phase 06 step 06.1 — phase-06 inventory`

---

## Step 06.2 — ADR 0012: rest data model + Strudel silence codegen

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `docs/adr/0010-variable-chord-duration.md` (for `Chord.bars`, schema versioning precedents, and `arrange()` strategy), and `docs/adr/0011-harmony-view-architecture.md` (for `computeVoiceTracks` Phase 06 extension point). Write `docs/adr/0012-rest-data-model.md`. Do not write source code.

Implementation requirements:

The ADR records five locked Pilot decisions — it does NOT deliberate or re-open them. Use Status "Accepted" with date 2026-06-11.

**Section: Context.** Phase 06 extends the harmony progression to allow silent (rest) slots. A rest slot occupies a variable cycle span with no notes, analogous to a chord slot in duration. The existing `Chord` type and `melodyLine()` dual-mode codegen (ADR 0010) must be extended without breaking existing chord-only sessions. Five decisions govern the implementation.

**Section: Decisions (five sub-decisions, each with a brief justification):**

1. **D1 — `RestSlot` discriminated union with `isRest: true`.** Add `interface RestSlot { isRest: true; bars?: number }` alongside `Chord`. Export a union type `ProgressionSlot = Chord | RestSlot`. `HarmonyState.progression` becomes `ProgressionSlot[]`. The discriminant field `isRest: true` is required (literal `true`, not optional) so TypeScript narrows correctly using `'isRest' in slot`. `Chord` objects do not have `isRest` (the absence of the field is the discriminant for chord slots). Justification: a rest is structurally distinct from a chord — it has no `rootPc`, `qual`, or `gain`. Adding nullable or optional fields to `Chord` would lose type safety at every call site. The discriminated union keeps `Chord` unchanged and makes the structure explicit.

2. **D2 — `arrange()` path forced when any slot is a `RestSlot`.** The dual-mode condition in `melodyLine()` widens: use `arrange()` when (a) any chord has `bars !== 1`, OR (b) any slot is a `RestSlot`. A rest cannot be expressed in the slowcat `<…>` form — `note("<...>")` does not support a per-slot silence token. The condition: `const uniformDuration = progression.every(slot => !('isRest' in slot) && (slot.bars ?? 1) === 1)`. Justification: `arrange()` is the established multi-bar segment mechanism (ADR 0010). Rest slots are simply `arrange()` segments whose pattern is `silence` instead of a note pattern.

3. **D3 — Rest slot → `  [bars, silence]` in the `arrange()` form.** A rest slot of duration `bars` emits `  [${bars}, silence]` (two leading spaces, matching the chord segment format). The `silence` identifier is the same literal string used in `buildComposition` (`composition/model.ts` line 94: `segs.push(\`  [${tb - sum}, silence]\`)`), confirmed available in `@strudel/web@1.0.3`. No quotes around `silence` — it is a Strudel identifier. Justification: behavioral proof already exists in the app; no new API surface is introduced.

4. **D4 — No `SESSION_SCHEMA_VERSION` bump; agent `SCHEMA_VERSION` bumps to 2.** `SESSION_SCHEMA_VERSION` stays at 1. `SavedHarmonySchema.progression` changes from `z.array(SavedChordSchema)` to `z.array(z.union([SavedRestSchema, SavedChordSchema]))`, where `SavedRestSchema = z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })`. Rest schema is listed first so Zod parses `{ isRest: true, ... }` entries as rests regardless of other fields. Old sessions (version 1, chord-only) continue to parse correctly because all their elements lack `isRest: true` and thus fail `SavedRestSchema` (which requires `isRest: z.literal(true)`), then succeed `SavedChordSchema`. Agent `SCHEMA_VERSION` increments from 1 to 2 because `HarmonyChordSchema` changes shape — this is the documented intent in `schema.ts` ("bump if the shape changes in a future phase"). Justification: no session migration is required for the persistence version (additive union); the agent version bump is explicitly called for by the existing annotation.

5. **D5 — UI affordance for creating rests: "Add Rest" button in the ProgressionStrip.** A single "Add Rest" button is added to the right end of the ProgressionStrip (after the last slot, outside the scrollable segments area). Clicking it calls `appendRest()` (new store action: appends `{ isRest: true }` with default `bars: 1`). The button is only visible when the progression has not reached the maximum slot count (16, per `SavedHarmonySchema`). Justification: without a UI affordance, rests can only be created by the agent. Pilot testing of the rest feature requires the ability to add rests without agent invocation. The strip is the natural location since it is already the authoritative duration editor for the progression.

**Section: Consequences.** List: (1) `ProgressionSlot = Chord | RestSlot` is a new export from `session.ts`; all store actions and call sites that iterate `progression` must handle both variants. (2) `melodyLine()` and `buildSession()` in `strudel.ts` widen their input type from an anonymous chord-only structural type to a `HarmonySlotInput = { rootPc: number; qual: Quality; gain?: number | null; bars?: number } | { isRest: true; bars?: number }` union defined locally in `strudel.ts` (not imported from `session.ts`, which has Svelte-transitive dependencies). (3) `computeVoiceTracks()` in `voice-tracks.ts` gains a `RestInput = { isRest: true; bars?: number }` local type; the function parameter becomes `(progression: (ChordInput | RestInput)[], octave: number)`; a new exported `VoiceRestEvent = { isRest: true; slotIndex: number; bars: number; startCycle: number }` type is added; `VoiceTrack.events` becomes `(VoiceEvent | VoiceRestEvent)[]`; `prevPcs` is NOT updated when a rest slot is encountered (voices do not move through a rest — the next chord connects to the previous chord). (4) `SavedRestSchema` is a new Zod object schema in `persistence.ts`; `serializeSession`/`deserializeSession` must handle the union by narrowing on `'isRest' in slot`. (5) `HarmonyChordSchema` in `schema.ts` becomes `z.union([HarmonyRestSchema, HarmonyChordCoreSchema])` where `HarmonyRestSchema = z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })` and rest schema is listed first. (6) `applyHarmonySpec` in `apply.ts` detects `'isRest' in c` before calling `noteToPc` and appends a `RestSlot` instead of a `Chord`.

Validation:
- `docs/adr/0012-rest-data-model.md` is well-formed Markdown, has Status: Accepted, Date: 2026-06-11, Deciders: Pilot (Javier).
- No source code written.

Expected result:
- `docs/adr/0012-rest-data-model.md` committed.

CHECKPOINT → Commit message:
`docs(adr): Phase 06 step 06.2 — ADR 0012 rest data model and silence codegen`

---

## Step 06.3 — Data model, codegen, and voice-tracks

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0012-rest-data-model.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `src/state/session.ts` (complete), `src/core/codegen/strudel.ts` (complete), and `src/core/harmony/voice-tracks.ts` (complete). Modify `src/state/session.ts`, `src/core/codegen/strudel.ts`, and `src/core/harmony/voice-tracks.ts`; add tests to `tests/codegen.test.ts` and `tests/harmony/voice-tracks.test.ts`.

Implementation requirements:

**`src/state/session.ts` changes (ADR 0012 D1):**

Add after the `Chord` interface (before `HarmonyState`):
```typescript
/** A silent slot in the progression. Duration follows the same `bars` semantics as `Chord.bars`. */
export interface RestSlot {
  isRest: true;
  bars?: number;
}

/** A slot in the harmony progression: either a chord or a silent rest. */
export type ProgressionSlot = Chord | RestSlot;
```

Change `HarmonyState.progression` from `Chord[]` to `ProgressionSlot[]`.

Add two new exported store actions after `setChordBars`:
```typescript
/** Append a rest slot with bars: 1 to the end of the progression. Calls requeueLive(). */
export function appendRest(): void { ... }

/** Insert a rest slot with bars: 1 at the given index. Calls requeueLive(). */
export function addRestAt(index: number): void { ... }
```

`appendRest` delegates to `addRestAt(progression.length)`. `addRestAt` splices a `{ isRest: true as const, bars: 1 }` into `harmony.progression` at the given index (using array spread, consistent with existing pattern) and calls `requeueLive()`. Out-of-range index: clamp to `[0, progression.length]` — an index equal to `progression.length` appends.

Update `deriveLiveCode` (the `source === 'chord'` branch, lines 456–461): before calling `chordToStrudel`, check `if (!ch || 'isRest' in ch) return null`. A rest as the last slot has no playable chord; returning null silences that branch.

Update `requeueLive` (the `source === 'chord'` branch, lines 504–509): same guard — `if (!ch || 'isRest' in ch) return null`.

`setChordBars`: the function body spreads the slot (`{ ...slot, bars: clamped }`) — this works for both `Chord` and `RestSlot` because both have `bars?`. The only change needed is the internal type annotation (`slot: ProgressionSlot`) which TypeScript infers automatically once `progression: ProgressionSlot[]`. Rename the parameter from `ch` to `slot` for clarity if desired; no behavioral change.

`clearChordAt`, `clearProgression`: no changes required — `filter` by index works regardless of slot type.

AGPL-3.0 header unchanged. TS strict. No `any`.

**`src/core/codegen/strudel.ts` changes (ADR 0012 D2, D3):**

Define a local union type at the top of the file (NOT exported — avoids pulling session.ts into the pure engine):
```typescript
type HarmonySlotInput =
  | { rootPc: number; qual: Quality; gain?: number | null; bars?: number }
  | { isRest: true; bars?: number };
```

Update `melodyLine()` signature:
```typescript
export function melodyLine(
  progression: ReadonlyArray<HarmonySlotInput>,
  chordMode: 'chord' | 'arp',
  octave: number
): string
```

(Existing callers pass chord-only arrays; `ReadonlyArray<chord-only>` is assignable to `ReadonlyArray<HarmonySlotInput>` because the chord type is a subtype of the union. No callers need updating for type correctness.)

Update the dual-mode detection condition (ADR 0012 D2):
```typescript
// ADR 0010 dual-mode + ADR 0012 rest extension:
// use arrange() when any slot is a rest, OR when any chord has bars !== 1.
const uniformDuration =
  progression.every(
    (slot) => !('isRest' in slot) && ((slot as { bars?: number }).bars ?? 1) === 1
  );
```

In the `arrange()` path, map each slot (ADR 0012 D3):
```typescript
const segments = progression.map((slot) => {
  const numCycles = slot.bars ?? 1;
  if ('isRest' in slot) {
    return `  [${numCycles}, silence]`;
  }
  // chord path (unchanged from ADR 0010)
  const voicing = chordVoicing(slot.rootPc, slot.qual, octave).join(sep);
  const g = (slot.gain == null ? 0.6 : slot.gain).toFixed(2);
  return `  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)]`;
});
```

Update `buildSession()` signature similarly — change its `progression` parameter to `ReadonlyArray<HarmonySlotInput>`. The function body passes `progression` to `melodyLine()` which now accepts the wider type; no other changes needed.

AGPL-3.0 header unchanged. TS strict. No `any`. No DOM/PIXI/Svelte imports.

**`src/core/harmony/voice-tracks.ts` changes (ADR 0012 D1, Consequence 3):**

Add after `VoiceEvent`:
```typescript
/**
 * A rest gap event for a single voice within a rest slot.
 * All three voices in a VoiceTrack get a VoiceRestEvent for each rest slot.
 * The note is absent; prevPcs is unchanged so voice leading continues from
 * the last chord before the rest.
 */
export interface VoiceRestEvent {
  isRest: true;
  slotIndex: number;  // 0-based index into the progression
  bars: number;       // duration of this rest in cycles (slot.bars ?? 1)
  startCycle: number; // cumulative cycle offset
}
```

Change `VoiceTrack.events` type from `VoiceEvent[]` to `(VoiceEvent | VoiceRestEvent)[]`.

Add a local `RestInput` type alongside `ChordInput`:
```typescript
interface RestInput {
  isRest: true;
  bars?: number;
}
```

Change `computeVoiceTracks` signature to:
```typescript
export function computeVoiceTracks(
  progression: (ChordInput | RestInput)[],
  octave: number
): VoiceTrack[]
```

(Existing callers pass `ChordInput[]`, which is assignable to `(ChordInput | RestInput)[]`.)

In the main loop, add a rest branch before the chord branches:
```typescript
for (let i = 0; i < progression.length; i++) {
  const slot = progression[i];
  const bars = slot.bars ?? 1;

  if ('isRest' in slot) {
    // Rest slot: append VoiceRestEvent to each track; prevPcs unchanged.
    for (let v = 0; v < 3; v++) {
      tracks[v].events.push({
        isRest: true,
        slotIndex: i,
        bars,
        startCycle,
      });
    }
    startCycle += bars;
    continue;
  }

  // Chord slot (original logic, unchanged — replace `ch` with `slot` in casts).
  // ...existing chord processing...
}
```

The `prevPcs` variable is NOT updated when a rest slot is encountered. The next chord after a rest uses `minimalVoiceLeading(prevPcs, nextPcs)` where `prevPcs` is still the pitch classes of the last chord before the rest. This is the ADR 0012 D1 Consequence 3 rule: "voices do not move through a rest."

AGPL-3.0 header unchanged. TS strict. No `any`. No DOM/PIXI/Svelte imports.

**`tests/codegen.test.ts` additions (add a new `describe` block for rest-slot codegen):**

- Test: `melodyLine([{ isRest: true }], 'chord', 3)` → exact string `'arrange(\n  [1, silence]\n)'`.
- Test: `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` → exact string `'arrange(\n  [2, silence]\n)'`.
- Test: `melodyLine([{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 }, { isRest: true, bars: 1 }, { rootPc: 5, qual: 'maj', gain: 0.6, bars: 1 }], 'chord', 3)` → `arrange()` form with C major segment, silence segment, F major segment. Exact string:
  ```
  arrange(
    [1, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)],
    [1, silence],
    [1, note("[F3,A3,C4]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)]
  )
  ```
- Test: A chord-only progression `[{rootPc:0, qual:'maj', gain:0.6}]` with no `bars` field still emits the slowcat form — regression guard for A-06-03.
- Test: A mixed progression `[{rootPc:0, qual:'maj', gain:0.6, bars:1}, {isRest: true, bars:1}]` with bars:1 on the chord still emits `arrange()` (rest forces arrange even when chord bars === 1).
- AGPL-3.0 header on test file unchanged.

**`tests/harmony/voice-tracks.test.ts` additions:**

- Test: `computeVoiceTracks([{ isRest: true, bars: 2 }], 3)` → three tracks each with 1 event; each event has `isRest: true`, `slotIndex: 0`, `bars: 2`, `startCycle: 0`.
- Test: `computeVoiceTracks([{ rootPc: 0, qual: 'maj' }, { isRest: true, bars: 1 }], 3)` → track 0 has 2 events: `VoiceEvent` at chordIndex 0 followed by `VoiceRestEvent` at slotIndex 1 with `startCycle: 1`.
- Test: rest does not affect prevPcs — `computeVoiceTracks([C major, rest 1 bar, A minor octave 3], 3)`: after the rest, voice-0 of A minor = `'C4'`, voice-1 = `'E4'`, voice-2 = `'A3'` (same result as a direct C major → A minor transition; perm [1,2,0] from `minimalVoiceLeading([0,4,7], [9,0,4])`). Verify with exact `toEqual`.
- Test: `startCycle` accumulates correctly across mixed slots — `computeVoiceTracks([chord bars:1, rest bars:2, chord bars:0.5], 3)`: voice events have startCycle 0, 1, 3; rest events have startCycle 1, bars 2.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run tests/codegen.test.ts` — all pass.
- `pnpm exec vitest run tests/harmony/voice-tracks.test.ts` — all pass.
- `pnpm test` — all prior tests pass; count ≥ 314 (307 prior + ≥ 7 new minimum).
- `grep -rn "from 'pixi\|from 'svelte\|from '@pixi" src/core/codegen/strudel.ts src/core/harmony/voice-tracks.ts` — 0 matches.

Expected result:
- `src/state/session.ts`, `src/core/codegen/strudel.ts`, `src/core/harmony/voice-tracks.ts` modified and committed.
- `tests/codegen.test.ts`, `tests/harmony/voice-tracks.test.ts` updated with rest-slot tests.
- `ProgressionSlot`, `RestSlot`, `appendRest`, `addRestAt` exported from `session.ts`.
- `melodyLine()` and `computeVoiceTracks()` accept rest slots.

CHECKPOINT → Commit message:
`feat(harmony): Phase 06 step 06.3 — RestSlot data model, silence codegen, voice-tracks gap events`

---

## Step 06.4 — Persistence and agent schemas

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0012-rest-data-model.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `src/lib/persistence.ts` (complete), `src/agent/schema.ts` (complete), `src/agent/apply.ts` (complete), `src/state/session.ts` (complete — for `RestSlot` and `ProgressionSlot` types added in step 06.3), and `tests/persistence.test.ts` and `tests/schema.test.ts` (for existing test structure). Modify `src/lib/persistence.ts`, `src/agent/schema.ts`, and `src/agent/apply.ts`; add tests to `tests/persistence.test.ts` and `tests/schema.test.ts`.

Implementation requirements:

**`src/lib/persistence.ts` changes (ADR 0012 D4):**

Add `SavedRestSchema` after `SavedChordSchema`:
```typescript
const SavedRestSchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});
```

Change `SavedHarmonySchema.progression` from `z.array(SavedChordSchema).max(16)` to:
```typescript
progression: z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16),
```

(Rest schema listed first per ADR 0012 D4: if `isRest: true` is present, entry parses as rest regardless of other fields.)

`SESSION_SCHEMA_VERSION` stays at 1 (ADR 0012 D4). Do NOT change `z.literal(1)` in `SavedSessionSchema`.

Update `serializeSession`: in the `progression.map(...)` block, narrow on `'isRest' in ch`:
```typescript
progression: state.harmony.progression.map((slot) => {
  if ('isRest' in slot) {
    return slot.bars !== undefined ? { isRest: true as const, bars: slot.bars } : { isRest: true as const };
  }
  return {
    rootPc: slot.rootPc,
    qual: slot.qual,
    gain: slot.gain,
    ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
  };
}),
```

Update `deserializeSession`: in the `progression.map(...)` block, narrow on `'isRest' in ch` similarly:
```typescript
progression: saved.harmony.progression.map((slot) => {
  if ('isRest' in slot) {
    return slot.bars !== undefined ? { isRest: true as const, bars: slot.bars } : { isRest: true as const };
  }
  return {
    rootPc: slot.rootPc,
    qual: slot.qual,
    gain: slot.gain,
    ...(slot.bars !== undefined ? { bars: slot.bars } : {}),
  };
}),
```

Import `RestSlot` from `../state/session.js` if needed for type annotations. TS strict. No `any`.

**`src/agent/schema.ts` changes (ADR 0012 D4, D5):**

Bump `SCHEMA_VERSION` from `1` to `2`.

Add `HarmonyRestSchema` before `HarmonyChordSchema`:
```typescript
/**
 * A rest (silence) slot in the progression. `isRest: true` is the discriminant.
 * `bars` follows the same semantics as `HarmonyChord.bars` (default 1, multiples of 0.25).
 * Introduced in Phase 06 — ADR 0012.
 */
const HarmonyRestSchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});
```

Change `HarmonyChordSchema` from `z.object(...)` to a union — rename the existing object schema `HarmonyChordCoreSchema` (not exported) and define the exported union:
```typescript
const HarmonyChordCoreSchema = z.object({ ... }); // existing fields unchanged

/** A chord OR rest slot in the harmony progression. */
export const HarmonyChordSchema = z.union([HarmonyRestSchema, HarmonyChordCoreSchema]);
```

(Rest listed first so `{ isRest: true, ... }` always parses as a rest.)

Update `HarmonyChord` type alias to `z.infer<typeof HarmonyChordSchema>` (now a union type).

`HarmonySpecSchema.progression` is `z.array(HarmonyChordSchema).min(1).max(8)` — the element type change flows automatically via `HarmonyChordSchema`. The `.min(1)` constraint already counts rest slots (the agent must include at least 1 slot when providing a progression). Do NOT change the min/max values.

AGPL-3.0 header unchanged.

**`src/agent/apply.ts` changes (ADR 0012 Consequence 6):**

In `applyHarmonySpec`, update the progression-building loop to handle rest slots. Before calling `noteToPc(c.root)`, check whether the slot is a rest:
```typescript
if (Array.isArray(spec.progression)) {
  const newProg: ProgressionSlot[] = [];
  for (const c of spec.progression) {
    if ('isRest' in c && c.isRest === true) {
      // Rest slot (ADR 0012 D1)
      const restSlot: RestSlot = { isRest: true };
      if (c.bars !== undefined) restSlot.bars = clampBars(c.bars);
      newProg.push(restSlot);
      continue;
    }
    // Chord slot (unchanged logic below)
    const rootPc = noteToPc(c.root);
    if (rootPc == null) continue;
    // ... existing chord building ...
  }
  progression = newProg;
}
```

Import `RestSlot`, `ProgressionSlot` from `../state/session.js` (alongside existing `Chord` import).

Update the return type of `sessionStore.update` to accept `ProgressionSlot[]` (TypeScript should infer this from the `HarmonyState.progression: ProgressionSlot[]` change made in step 06.3).

AGPL-3.0 header unchanged. No DOM/PIXI/Svelte imports.

**`tests/persistence.test.ts` additions:**

- Test: round-trip a `SessionState` with one rest slot (bars:2) in the progression — `serializeSession(state)` produces `{ isRest: true, bars: 2 }` in the JSON; `SavedSessionSchema.parse(JSON.parse(JSON.stringify(serialized)))` succeeds; `deserializeSession(parsed).harmony.progression[0]` equals `{ isRest: true, bars: 2 }`.
- Test: round-trip preserves both chord and rest slots in mixed progression `[C major, rest bars:1, F major]`.
- Test: backward compat — a version-1 session JSON with chord-only progression parses successfully. Construct `SavedSessionSchema.parse({ version: 1, ..., harmony: { ..., progression: [{ rootPc: 0, qual: 'maj', gain: 0.6 }] } })` — should succeed with no error.
- Test: a session JSON with `{ isRest: true }` in the progression parses successfully (no bars field = optional).

**`tests/schema.test.ts` additions:**

- Test: `HarmonyChordSchema.safeParse({ isRest: true })` succeeds (rest with no bars).
- Test: `HarmonyChordSchema.safeParse({ isRest: true, bars: 2 })` succeeds.
- Test: `HarmonyChordSchema.safeParse({ isRest: true, bars: 0.1 })` fails (bars below minimum 0.25).
- Test: `HarmonyChordSchema.safeParse({ root: 'C', quality: 'maj' })` still succeeds (existing chord variant unaffected).
- Test: `SCHEMA_VERSION` equals 2.
- Test: `AgentOutputSchema.safeParse({ harmony: { progression: [{ root: 'C', quality: 'maj' }, { isRest: true, bars: 2 }] } })` succeeds (mixed progression with rest).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run tests/persistence.test.ts` — all pass.
- `pnpm exec vitest run tests/schema.test.ts` — all pass.
- `pnpm test` — all prior tests pass; count ≥ 324 (314 prior + ≥ 10 new minimum).

Expected result:
- `src/lib/persistence.ts`, `src/agent/schema.ts`, `src/agent/apply.ts` modified and committed.
- `tests/persistence.test.ts`, `tests/schema.test.ts` updated with rest-slot tests.
- Agent `SCHEMA_VERSION` = 2. Rest entries serialize and deserialize correctly.

CHECKPOINT → Commit message:
`feat(harmony): Phase 06 step 06.4 — persistence and agent schemas for rest slots`

---

## Step 06.5 — ProgressionStrip rest rendering and quality gates

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0012-rest-data-model.md`, `src/ui/ProgressionStrip.svelte` (complete), `src/state/session.ts` (for `appendRest`, `ProgressionSlot`, `RestSlot` exports added in step 06.3), and `src/lib/persistence.ts` (for `SESSION_SCHEMA_VERSION`). Modify `src/ui/ProgressionStrip.svelte`. After committing, run all quality gates and record the results.

Implementation requirements:

**Import changes:**
Add `appendRest` to the imports from `../state/session.js`. Import `ProgressionSlot` type for narrowing. The existing imports (`clearChordAt`, `requeueLive`, `playChord`, `setChordBars`, `barsLabel`) are unchanged.

**Template changes — narrowing on `'isRest' in ch`:**

The strip iterates `$sessionStore.harmony.progression` (typed as `ProgressionSlot[]`). For each slot:

- **Chord slot** (`!('isRest' in ch)`): render exactly as before — tonal-function border class, gain fill gradient, gain drag handler, barsLabel, remove button (✕), resize handle.
- **Rest slot** (`'isRest' in ch`): render a visually distinct segment:
  - Background: flat grey (e.g. `background: #3a3a3a` or a CSS class `.rest-seg`), no gradient, no tonal-function border class.
  - Label: `'–'` or `'rest'` in the segment body (replacing the chord name label). Also show `barsLabel(ch.bars)` if bars ≠ 1.
  - No gain fill. No gain drag (`handlePointerDown` must be a no-op or absent for rest segments — guard with `if ('isRest' in ch) return;` at the top of `handlePointerDown`).
  - Resize handle: present and functional (same `handleResizePointerDown` / `handleResizePointerMove` / `handleResizePointerUp` logic). `setChordBars(i, newBars)` works for rest slots because `RestSlot` also has `bars?` — the spread `{ ...slot, bars: clamped }` is valid.
  - Remove button (✕): present and functional (`clearChordAt(index)` works regardless of slot type).

**`totalBars` reactive statement:**
The existing `$: totalBars = $sessionStore.harmony.progression.reduce((s, c, i) => s + (resizeBars[i] ?? c.bars ?? 1), 0)` works for both slot types without changes (both have `bars?`).

**"Add Rest" button (ADR 0012 D5):**
Add outside the `.strip-scroll` wrapper, after the scrollable area:
```html
{#if $sessionStore.harmony.progression.length < 16}
  <button class="add-rest-btn" on:click={appendRest}>+ rest</button>
{/if}
```
Style: small, low-contrast button consistent with the strip aesthetic. Position: to the right of the strip (flex layout) or below it — consistent with how the overall strip container lays out. The exact style details are at the Dev's discretion as long as the button is visible and functional in the harmony view.

**Prototype parity note:**
Rest slot rendering has no prototype equivalent (new feature per ADR 0012). The `barsLabel`, `clearChordAt`, and resize-handle patterns are reused from existing chord slot rendering.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm exec vitest run` — all prior tests pass (no new tests expected from this step — ProgressionStrip.svelte is not covered by Vitest); count ≥ 324 (unchanged from step 06.4).
- `pnpm build` — exits 0.
- Manual/live-system spot-checks: run `pnpm dev`, load the app in Harmony view, click "+ rest" to add a rest slot, verify it appears in the ProgressionStrip as a grey segment with duration label, verify the resize handle adjusts its duration, verify the ✕ removes it, verify that clicking "▶ Armonía" plays a pattern that includes silence for the rest duration (live-system evidence in handoff: note the Strudel code visible in the live-code drawer).

Expected result:
- `src/ui/ProgressionStrip.svelte` modified and committed.
- All quality gates pass.
- Dev records manual verification notes in the handoff.

CHECKPOINT → Commit message:
`feat(ui): Phase 06 step 06.5 — ProgressionStrip rest slot rendering and Add Rest button`

---

## Phase Acceptance

Each criterion has a unique ID used in handoff Acceptance Coverage Tables:

- **A-06-01** — `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns the exact string `'arrange(\n  [2, silence]\n)'`.
  - Validation method: `unit`

- **A-06-02** — A mixed progression `[C major chord, rest 1 bar, F major chord]` passed to `melodyLine()` emits an `arrange()` form where the rest slot is `[1, silence]` and both chord slots are note patterns (exact string assertion).
  - Validation method: `unit`

- **A-06-03** — A chord-only progression with all `bars === 1` (or `bars` absent) still emits the slowcat `<…>` form unchanged — no regression from ADR 0010 backward-compat guarantee.
  - Validation method: `unit`

- **A-06-04** — `computeVoiceTracks([C major, { isRest: true, bars: 1 }, A minor], 3)` produces `VoiceRestEvent` events (with `isRest: true`) for each voice at `slotIndex: 1`; after the rest, the A minor chord's voice assignment uses `minimalVoiceLeading([0,4,7], [9,0,4])` (perm `[1,2,0]`): voice-0 = `'C4'`, voice-1 = `'E4'`, voice-2 = `'A3'` (same result as a direct C major → A minor transition — rest does not affect `prevPcs`).
  - Validation method: `unit`

- **A-06-05** — A `SessionState` with one rest slot (`{ isRest: true, bars: 2 }`) round-trips through `serializeSession` → `JSON.stringify` → `JSON.parse` → `SavedSessionSchema.safeParse` → `deserializeSession` without data loss: the rest slot is preserved as `{ isRest: true, bars: 2 }`.
  - Validation method: `unit`

- **A-06-06** — A version-1 session JSON (chord-only, no `isRest` fields) parses successfully against the updated `SavedSessionSchema` — `safeParse` returns `success: true`.
  - Validation method: `unit`

- **A-06-07** — An agent payload `{ harmony: { progression: [{ root: 'C', quality: 'maj' }, { isRest: true, bars: 2 }] } }` validates against `AgentOutputSchema` (`safeParse` returns `success: true`); calling `applyHarmonySpec(spec.harmony)` updates `sessionStore.harmony.progression` to contain `[Chord(rootPc:0, qual:'maj', gain:0.6), RestSlot(isRest:true, bars:2)]`.
  - Validation method: `unit`

- **A-06-08** — `SCHEMA_VERSION` exported from `src/agent/schema.ts` equals `2`.
  - Validation method: `proxy:static-analysis`

- **A-06-09** — `ProgressionStrip` renders rest slots as grey segments (no tonal-function border color, no gain fill), with a duration label from `barsLabel`, a functional resize handle, and a functional ✕ remove button. Chord slot rendering is visually unchanged.
  - Validation method: `manual`

- **A-06-10** — The "+ rest" button appends a `RestSlot` with `bars: 1` to the store; clicking "▶ Armonía" with a progression containing a rest slot plays audio where the rest cycle is silent; the Strudel code visible in the live-code drawer contains `silence` at the rest position.
  - Validation method: `live-system`

- **A-06-11** — All quality gates pass: `tsc --noEmit` 0 errors; `pnpm lint` 0 errors; `pnpm test` all pass with count ≥ 325; `pnpm build` exits 0.
  - Validation method: `automated`

---

## Partial coverage from prior phase

No prior partials to address. Phase 05 closed all 13 A-05-xx criteria with zero gaps (confirmed in `phase-05-handoff.md` completion entry).

---

## ADR Triggers

- **ADR 0012 — Rest data model and Strudel silence codegen** — Trigger: step 06.2. Records all five locked design decisions (D1–D5) for rest slots: discriminated union, `arrange()` forcing rule, `[bars, silence]` segment format, schema versioning, and UI affordance.

No other ADR is required. The changes extend existing patterns (`arrange()` from ADR 0010, `ProgressionSlot` as a simple union) without introducing new architectural dependencies or reversals.

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-06-handoff.md`. See `handoff-template.md`.

The handoff completion entry must confirm: (1) ADR 0012 committed; (2) `RestSlot` and `ProgressionSlot` exported from `session.ts`; (3) `melodyLine()` emits `silence` for rest slots; (4) `computeVoiceTracks()` produces `VoiceRestEvent` events; (5) `SavedRestSchema` added to `persistence.ts`; (6) agent `SCHEMA_VERSION = 2`; (7) `ProgressionStrip` renders rest slots and has "+ rest" button; (8) `pnpm test` count ≥ 325; (9) all quality gates pass; (10) manual verification notes for A-06-09 and live-system evidence for A-06-10.

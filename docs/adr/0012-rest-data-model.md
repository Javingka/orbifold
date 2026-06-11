# ADR 0012 — Rest data model and Strudel silence codegen

- **Status:** Accepted
- **Date:** 2026-06-11
- **Initiative / Phase:** orbifold-v2 / Phase 06 (step 06.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 06 extends the harmony progression to allow silent (rest) slots. A rest slot occupies a variable cycle span with no notes, analogous to a chord slot in duration. The existing `Chord` type and `melodyLine()` dual-mode codegen (ADR 0010) must be extended without breaking existing chord-only sessions.

The `arrange()` mechanism for multi-bar chord durations (ADR 0010) is the natural carrier for rest segments: a rest slot is simply an `arrange()` segment whose pattern is the `silence` identifier rather than a note pattern. The `silence` keyword is already proven in production via `buildComposition` in `src/core/composition/model.ts` (line 94), which pads tracks using `[bars, silence]` segments.

Five decisions govern the implementation.

---

## Decisions

### D1 — `RestSlot` discriminated union with `isRest: true`

Add `interface RestSlot { isRest: true; bars?: number }` alongside `Chord`. Export a union type `ProgressionSlot = Chord | RestSlot`. `HarmonyState.progression` becomes `ProgressionSlot[]`.

The discriminant field `isRest: true` is required (literal `true`, not optional) so TypeScript narrows correctly using `'isRest' in slot`. `Chord` objects do not have `isRest` — the absence of the field is the discriminant for chord slots.

**Justification:** A rest is structurally distinct from a chord — it has no `rootPc`, `qual`, or `gain`. Adding nullable or optional fields to `Chord` would lose type safety at every call site. The discriminated union keeps `Chord` unchanged and makes the structure explicit.

### D2 — `arrange()` path forced when any slot is a `RestSlot`

The dual-mode condition in `melodyLine()` widens: use `arrange()` when (a) any chord has `bars !== 1`, OR (b) any slot is a `RestSlot`. A rest cannot be expressed in the slowcat `<…>` form — `note("<...>")` does not support a per-slot silence token.

The updated condition:

```typescript
// ADR 0010 dual-mode + ADR 0012 rest extension:
// use arrange() when any slot is a rest, OR when any chord has bars !== 1.
const uniformDuration =
  progression.every(
    (slot) => !('isRest' in slot) && ((slot as { bars?: number }).bars ?? 1) === 1
  );
```

**Justification:** `arrange()` is the established multi-bar segment mechanism (ADR 0010). Rest slots are simply `arrange()` segments whose pattern is `silence` instead of a note pattern. The backward-compatibility guarantee from ADR 0010 is preserved: a chord-only progression with all `bars === 1` (or `bars` absent) still emits the slowcat `<…>` form unchanged (byte-identical output).

### D3 — Rest slot → `  [bars, silence]` in the `arrange()` form

A rest slot of duration `bars` emits `  [${bars}, silence]` (two leading spaces, matching the chord segment format). The `silence` identifier is the same literal string used in `buildComposition` (`composition/model.ts` line 94):

```typescript
segs.push(`  [${tb - sum}, silence]`);
```

This is confirmed available in `@strudel/web@1.0.3`. No quotes around `silence` — it is a Strudel identifier. In the `arrange()` mapping:

```typescript
if ('isRest' in slot) {
  return `  [${slot.bars ?? 1}, silence]`;
}
```

**Justification:** Behavioral proof already exists in the app; no new API surface is introduced. The format is identical to the padding segment used in composition codegen, ensuring consistent Strudel evaluation semantics.

### D4 — No `SESSION_SCHEMA_VERSION` bump; agent `SCHEMA_VERSION` bumps to 2

`SESSION_SCHEMA_VERSION` stays at `1`. `SavedHarmonySchema.progression` changes from `z.array(SavedChordSchema)` to `z.array(z.union([SavedRestSchema, SavedChordSchema]))`, where:

```typescript
const SavedRestSchema = z.object({
  isRest: z.literal(true),
  bars: z.number().min(0.25).max(8).optional(),
});
```

Rest schema is listed first so Zod parses `{ isRest: true, ... }` entries as rests regardless of other fields. Old sessions (version 1, chord-only) continue to parse correctly because all their elements lack `isRest: true` and thus fail `SavedRestSchema` (which requires `isRest: z.literal(true)`), then succeed on `SavedChordSchema`.

Agent `SCHEMA_VERSION` increments from `1` to `2` because `HarmonyChordSchema` changes shape — this is the documented intent in `schema.ts` at the `SCHEMA_VERSION` declaration ("bump if the shape changes in a future phase").

**Zod union ordering:** Rest schema is listed first in both `SavedHarmonySchema.progression` and `HarmonySpecSchema.progression` unions. This ensures that an entry with `{ isRest: true, root: 'C', quality: 'maj' }` (malformed: both `isRest: true` and chord fields) is parsed as a rest with chord fields stripped — progressive degradation: the slot becomes a rest, not a chord. An entry with only `{ rootPc: 0, qual: 'maj', gain: 0.6 }` fails `SavedRestSchema` (no `isRest: z.literal(true)`) and succeeds on `SavedChordSchema` as before.

**Justification:** No session migration is required for the persistence version (additive union — adding an optional first-schema alternative is backward-compatible). The agent version bump is explicitly called for by the existing `schema.ts` annotation. Keeping `SESSION_SCHEMA_VERSION` at `1` avoids a forced re-parse of all existing user sessions with no data migration benefit.

### D5 — UI affordance for creating rests: "Add Rest" button in the ProgressionStrip

A single "Add Rest" button (`+ rest`) is added to the right end of the ProgressionStrip (after the last slot, outside the scrollable segments area). Clicking it calls `appendRest()` — a new store action that appends `{ isRest: true as const, bars: 1 }` to `harmony.progression` and calls `requeueLive()`. The button is only visible when the progression has not reached the maximum slot count (16, per `SavedHarmonySchema`):

```svelte
{#if $sessionStore.harmony.progression.length < 16}
  <button class="add-rest-btn" on:click={appendRest}>+ rest</button>
{/if}
```

**Justification:** Without a UI affordance, rests can only be created by the agent. Pilot testing of the rest feature requires the ability to add rests without agent invocation. The ProgressionStrip is the natural location since it is already the authoritative duration editor for the progression (ADR 0011 D2).

---

## Consequences

1. **`ProgressionSlot = Chord | RestSlot` is a new export from `session.ts`.** All store actions and call sites that iterate `progression` must handle both variants. The `deriveLiveCode` and `requeueLive` `source === 'chord'` branches must add `if (!ch || 'isRest' in ch) return null` before calling `chordToStrudel`. `setChordBars` requires no change — the spread `{ ...slot, bars: clamped }` is valid for `RestSlot` because both types have `bars?`.

2. **`melodyLine()` and `buildSession()` in `strudel.ts` widen their input type.** The parameter changes to `ReadonlyArray<HarmonySlotInput>` where `HarmonySlotInput` is a local union type (NOT exported — avoids pulling `session.ts` Svelte-transitive dependencies into a pure-engine module, per the `src/core/**` invariant):

   ```typescript
   type HarmonySlotInput =
     | { rootPc: number; qual: Quality; gain?: number | null; bars?: number }
     | { isRest: true; bars?: number };
   ```

   Existing callers pass `ChordInput[]`-compatible arrays; the chord type is assignable to the union, so no callers require updating.

3. **`computeVoiceTracks()` in `voice-tracks.ts` gains a `RestInput` local type and a `VoiceRestEvent` exported type.** The function signature becomes `(progression: (ChordInput | RestInput)[], octave: number)`. A new exported type:

   ```typescript
   export interface VoiceRestEvent {
     isRest: true;
     slotIndex: number;   // 0-based index into the progression
     bars: number;        // duration of this rest in cycles (slot.bars ?? 1)
     startCycle: number;  // cumulative cycle offset
   }
   ```

   `VoiceTrack.events` becomes `(VoiceEvent | VoiceRestEvent)[]`. `prevPcs` is NOT updated when a rest slot is encountered — voices do not move through a rest. The next chord after a rest uses `minimalVoiceLeading(prevPcs, nextPcs)` where `prevPcs` is still the pitch classes of the last chord before the rest.

4. **`SavedRestSchema` is a new Zod object schema in `persistence.ts`.** `serializeSession` and `deserializeSession` must handle the union by narrowing on `'isRest' in slot`. `SESSION_SCHEMA_VERSION` stays at `1`.

5. **`HarmonyChordSchema` in `schema.ts` becomes `z.union([HarmonyRestSchema, HarmonyChordCoreSchema])`.** The existing object schema is renamed `HarmonyChordCoreSchema` (not exported). A new `HarmonyRestSchema = z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })` is added. Rest schema listed first. `SCHEMA_VERSION` bumps from `1` to `2`.

6. **`applyHarmonySpec` in `apply.ts` detects `'isRest' in c` before calling `noteToPc`.** This eliminates the silent-omission risk confirmed in the inventory (step 06.1): the existing code calls `noteToPc(c.root)` unconditionally, which returns `null` for a rest entry lacking `root`, silently dropping the slot. After Phase 06, the loop checks `if ('isRest' in c && c.isRest === true)` first and appends a `RestSlot` directly, bypassing `noteToPc`.

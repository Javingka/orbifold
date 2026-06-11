# Phase 06 Inventory — Rests in the harmony progression

**Date:** 2026-06-11
**Step:** 06.1 (inventory)
**Branch:** orbifold-v2/phase-05 (will branch to orbifold-v2/phase-06 at kickoff)

---

## 1. Baseline confirmed

| Item | Value | Source |
|---|---|---|
| Current test count | 307 passing (11 test files) | Phase 05 completion entry + `pnpm exec vitest run` |
| `tsc --noEmit` | 0 errors | Phase 05 completion entry |
| `pnpm lint` | 0 errors | Phase 05 completion entry |
| `pnpm build` | exits 0 | Phase 05 completion entry |

---

## 2. `src/state/session.ts` — confirmed fields and actions

### `Chord` interface (lines 130–143)

| Field | Type | Notes |
|---|---|---|
| `rootPc` | `number` | pitch class 0–11 |
| `qual` | `Quality` | `'maj' \| 'min' \| 'dim' \| 'aug'` |
| `gain` | `number` | 0–1.2; default 0.6 |
| `cx?` | `number \| undefined` | Tonnetz centroid x (render hint; excluded from persistence) |
| `cy?` | `number \| undefined` | Tonnetz centroid y (render hint; excluded from persistence) |
| `bars?` | `number \| undefined` | cycles; default 1; multiples of 0.25; range [0.25, 8] |

### `HarmonyState.progression` (line 154)

```typescript
progression: Chord[];   // ordered list; empty = silent
```

Phase 06 will change this to `ProgressionSlot[]` (ADR 0012 D1).

### Exported store actions that touch `progression`

| Action | Signature | Lines | Notes |
|---|---|---|---|
| `clearChordAt` | `(index: number): void` | 746–755 | filters by index; works for any slot type |
| `setChordBars` | `(index: number, bars: number): void` | 771–781 | spreads `{ ...ch, bars: clamped }`; spread works for `RestSlot` too (both have `bars?`) |
| `clearProgression` | `(): void` | 727–733 | sets `progression: []` |
| `applyLoadedSession` | `(saved: SavedSession): void` | 1116–1164 | rebuilds `progression` from saved data; must be updated to handle `isRest` slots |

### `deriveLiveCode` — `source === 'chord'` branch (lines 456–461)

```typescript
if (source === 'chord') {
  const ch = state.harmony.progression[state.harmony.progression.length - 1];
  if (!ch) return null;
  return chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
}
```

**Phase 06 guard required:** before calling `chordToStrudel`, must add `if (!ch || 'isRest' in ch) return null`. A rest as the last slot has no playable chord.

### `requeueLive` — `source === 'chord'` branch (lines 502–510)

```typescript
if (source === 'chord') {
  const progression = state.harmony.progression;
  const ch = progression[progression.length - 1];
  if (!ch) return null;
  const code = chordToStrudel(ch.rootPc, ch.qual, ch.gain, state.chordMode, state.harmony.octave);
  ...
}
```

**Phase 06 guard required:** same — add `if (!ch || 'isRest' in ch) return null` before calling `chordToStrudel`.

### `clampBars` (lines 91–94)

```typescript
export function clampBars(bars: number): number {
  const rounded = Math.round(bars * 4) / 4;
  return Math.max(0.25, Math.min(8, rounded));
}
```

Reused in `applyHarmonySpec` for rest slot `bars` clamping (ADR 0012 D1).

---

## 3. `src/core/codegen/strudel.ts` — confirmed dual-mode logic

### `melodyLine` dual-mode condition (line 87)

```typescript
const uniformDuration = progression.every((ch) => (ch.bars ?? 1) === 1);
```

**Phase 06 change (ADR 0012 D2):** must widen to:
```typescript
const uniformDuration =
  progression.every(
    (slot) => !('isRest' in slot) && ((slot as { bars?: number }).bars ?? 1) === 1
  );
```

A rest slot forces `arrange()` path because `note("<...>")` has no per-slot silence token.

### Slowcat form (lines 89–95)

```typescript
const seq = progression
  .map((ch) => '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']')
  .join(' ');
const gains = progression.map((ch) => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
return `  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`;
```

Slowcat form is unchanged for chord-only progressions with all `bars === 1`.

### `arrange()` form (lines 99–105)

```typescript
const segments = progression.map((ch) => {
  const voicing = chordVoicing(ch.rootPc, ch.qual, octave).join(sep);
  const g = (ch.gain == null ? 0.6 : ch.gain).toFixed(2);
  const numCycles = ch.bars ?? 1;
  return `  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)]`;
});
return `arrange(\n${segments.join(',\n')}\n)`;
```

**Phase 06 change (ADR 0012 D3):** the `progression.map` must branch on `'isRest' in slot`:
- Rest slot → `` `  [${numCycles}, silence]` ``
- Chord slot → unchanged format above

### `buildSession` `progression` parameter type (lines 142–147)

```typescript
progression: ReadonlyArray<{
  rootPc: number;
  qual: Quality;
  gain?: number | null;
  bars?: number;
}>
```

**Phase 06 change:** must accept the wider `ReadonlyArray<HarmonySlotInput>` union. The type is defined locally in `strudel.ts` to avoid importing from `session.ts` (which carries Svelte-transitive dependencies — CLAUDE.md invariant: `src/core/**` must have no DOM/PIXI/Svelte imports).

---

## 4. `src/lib/persistence.ts` — confirmed schemas

### `SESSION_SCHEMA_VERSION` (line 10)

```typescript
export const SESSION_SCHEMA_VERSION = 1;
```

**Phase 06 decision (ADR 0012 D4):** stays at `1`. No version bump for persistence — the union `z.union([SavedRestSchema, SavedChordSchema])` is additive; old chord-only sessions still parse.

### `SavedChordSchema` (lines 29–34)

```typescript
const SavedChordSchema = z.object({
  rootPc: z.number().int().min(0).max(11),
  qual: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2),
  bars: z.number().min(0.25).max(8).optional(),
});
```

No changes to `SavedChordSchema` itself in Phase 06.

### `SavedHarmonySchema.progression` (lines 40)

```typescript
progression: z.array(SavedChordSchema).max(16),
```

**Phase 06 change:** will become `z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16)`. New `SavedRestSchema` = `z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })`. Rest schema listed first so `{ isRest: true, ... }` entries always match `SavedRestSchema` before `SavedChordSchema` is attempted.

### `serializeSession` progression map (lines 106–112)

Currently accesses `ch.rootPc`, `ch.qual`, `ch.gain` directly (line 107). After Phase 06 changes `progression: Chord[]` to `progression: ProgressionSlot[]`, this map must narrow on `'isRest' in slot`.

### `deserializeSession` progression map (lines 167–172)

Same — must narrow on `'isRest' in slot` after type changes.

### `applyLoadedSession` (session.ts lines 1145–1150)

Currently maps `(ch) => ({ rootPc: ch.rootPc, qual: ch.qual, gain: ch.gain, ... })`. After Phase 06, must narrow `if ('isRest' in ch)` to reconstruct `RestSlot` objects.

---

## 5. `src/agent/schema.ts` — confirmed schemas and version

### `SCHEMA_VERSION` (line 13)

```typescript
export const SCHEMA_VERSION = 1;
```

**Phase 06 change (ADR 0012 D4):** bumps to `2`. The agent comment at line 12 ("bump if the shape changes in a future phase") explicitly marks this intent. The bump is triggered by `HarmonyChordSchema` changing from a plain object to a union.

### `HarmonyChordSchema` (lines 103–109)

```typescript
export const HarmonyChordSchema = z.object({
  root: z.string(),
  quality: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2).optional(),
  bars: z.number().min(0.25).max(8).optional(),
});
```

**Phase 06 change (ADR 0012 D4):** existing object becomes `HarmonyChordCoreSchema` (unexported); new `HarmonyRestSchema` added; exported `HarmonyChordSchema` becomes `z.union([HarmonyRestSchema, HarmonyChordCoreSchema])`. Rest listed first.

### `HarmonySpecSchema.progression` (line 123)

```typescript
progression: z.array(HarmonyChordSchema).min(1).max(8).optional(),
```

The `.min(1)` and `.max(8)` constraints are unchanged. Since `HarmonyChordSchema` becomes a union, rest slots count toward both limits — the agent must include at least 1 slot (chord or rest) when providing a progression.

---

## 6. `src/agent/apply.ts` — confirmed `applyHarmonySpec` logic

### Progression-building loop (lines 141–170)

```typescript
if (Array.isArray(spec.progression)) {
  const newProg: Chord[] = [];
  for (const c of spec.progression) {
    const rootPc = noteToPc(c.root);
    if (rootPc == null) continue;
    ...
    newProg.push(chord);
  }
  progression = newProg;
}
```

**Phase 06 issue confirmed (per spec line 17):** `applyHarmonySpec` calls `noteToPc(c.root)` unconditionally. If a rest element `{ isRest: true }` is passed without a `root` field, `noteToPc(undefined)` returns null and the rest entry is silently omitted. This is the "silent omission" risk documented in the step PROMPT. After Phase 06, the loop must check `'isRest' in c` before calling `noteToPc`.

### `Chord` type imported (line 21)

```typescript
import type { Chord } from '../state/session.js';
```

After Phase 06, must also import `RestSlot` and `ProgressionSlot` for type annotation.

---

## 7. `src/core/harmony/voice-tracks.ts` — confirmed extension points

### Phase 06 extension points (from file comments)

| Location | Lines | Comment text |
|---|---|---|
| Module header | 4–6 | "Chord-only; rest/silence support is deferred to Phase 06. The per-chord loop structure below is kept clean and documented so a future rest branch (Phase 06) can be added at the chord-boundary without restructuring." |
| `VoiceEvent` JSDoc | 18–19 | "Phase 06 will add a parallel `VoiceRestEvent` type for silence slots; the loop structure below (one branch per slot type) will host that extension." |
| `ChordInput` block | 43–45 | "Phase 06 will add an equivalent RestInput type alongside this one." |
| Loop JSDoc | 79–80 | "Phase 06 extension point: the loop below iterates chord slots. A rest slot will be a separate branch that appends a VoiceRestEvent (gap) to each track while keeping prevPcs unchanged." |

All four extension points confirmed present and correctly describe the Phase 06 changes.

### `VoiceEvent` interface (lines 21–27)

```typescript
export interface VoiceEvent {
  chordIndex: number;
  noteName: string;
  octave: number;
  bars: number;
  startCycle: number;
}
```

**Phase 06 addition:** parallel `VoiceRestEvent` interface with `{ isRest: true; slotIndex: number; bars: number; startCycle: number }`. The `chordIndex` field is replaced by `slotIndex` to reflect that both chord and rest slots are addressed by position.

### `VoiceTrack.events` type (line 31)

```typescript
events: VoiceEvent[];
```

**Phase 06 change:** `events: (VoiceEvent | VoiceRestEvent)[]`.

### `computeVoiceTracks` parameter type (line 85)

```typescript
export function computeVoiceTracks(progression: ChordInput[], octave: number): VoiceTrack[]
```

**Phase 06 change:** `progression: (ChordInput | RestInput)[]`. Existing chord-only callers (`ChordInput[]`) remain assignable — subtype compatibility maintained.

### `prevPcs` behavior through rests (line 147)

`prevPcs = nextPcs` is set after each chord. For rest slots, `prevPcs` must NOT be updated — ADR 0012 Consequence 3: "voices do not move through a rest — the next chord connects to the previous chord."

---

## 8. `src/ui/ProgressionStrip.svelte` — confirmed structure (lines 1–200)

### Key reactive state

| Variable | Type | Purpose |
|---|---|---|
| `PX_PER_CYCLE` | `const = 48` | absolute px/cycle (line 98); must match `time-map.ts` (vigent rule) |
| `dragging` | `boolean[]` | per-segment gain drag active flag (line 131) |
| `resizeBars` | `(number \| null)[]` | live bars override during resize (line 155) |
| `totalBars` | reactive | sum of all `ch.bars ?? 1` (line 180) |

### `totalBars` reactive statement (line 180–183)

```typescript
$: totalBars = $sessionStore.harmony.progression.reduce(
  (s, c, i) => s + (resizeBars[i] ?? c.bars ?? 1),
  0
);
```

Works unchanged for rest slots — both `Chord` and `RestSlot` have `bars?`. No change needed in Phase 06.

### `handlePointerDown` (line 190–199)

Currently reads `$sessionStore.harmony.progression[i]?.gain ?? 0.6` (line 200, outside the read range). After Phase 06, must add an early return `if ('isRest' in ch) return;` to prevent gain drag on rest segments — rests have no `gain` field.

### Phase 06 additions to ProgressionStrip

1. **Import `appendRest`** from `../state/session.js`.
2. **Template narrowing** on `'isRest' in ch` for each slot:
   - Chord slot: render unchanged (tonal-function border, gain fill, barsLabel, ✕, resize handle).
   - Rest slot: grey background (`#3a3a3a`), no tonal-function border, no gain fill, label `'–'` or `'rest'`, barsLabel if bars ≠ 1, resize handle present, ✕ present, gain drag no-op.
3. **"Add Rest" button** (`+ rest`) after the scrollable area, visible when `progression.length < 16`.

---

## 9. `src/core/composition/model.ts` — confirmed `silence` keyword format (lines 70–102)

### `buildComposition` uses `silence` (line 94)

```typescript
if (sum < tb) segs.push(`  [${tb - sum}, silence]`);
```

**Confirmed format:** the literal string `silence` (no quotes, no surrounding delimiters) is emitted directly into the Strudel pattern string. Two leading spaces before `[`. Comma-separated segments inside `arrange(...)`.

This is the identical format required for ADR 0012 D3: a rest slot emits `` `  [${bars}, silence]` `` (exactly matching the padding segment format from `buildComposition`). Behavioral proof already exists in production.

---

## 10. Open question for ADR 0012 (per step PROMPT)

**Zod `z.union` ordering and rest schema placement:**

Per step PROMPT, document whether listing `SavedRestSchema` (and `HarmonyRestSchema`) first in the union is the desired behavior.

Confirmed desired: listing the rest schema first ensures that an entry with `{ isRest: true, root: 'C', quality: 'maj' }` (malformed: has both `isRest: true` and chord fields) is parsed as a rest, with chord fields stripped. This is safe because:
- `SavedRestSchema` requires only `isRest: z.literal(true)` (plus optional `bars`). It does NOT have `root` or `quality` fields, so extraneous fields are stripped by Zod's default behavior.
- `SavedChordSchema` requires `rootPc`, `qual`, `gain` — fields absent from a rest. An entry with only `isRest: true` would fail `SavedChordSchema` (missing `rootPc`, `qual`, `gain`), so the union ordering only matters when both schemas would match.
- In practice, an entry `{ isRest: true }` can only match `SavedRestSchema`; an entry `{ rootPc: 0, qual: 'maj', gain: 0.6 }` can only match `SavedChordSchema`. The ordering guards against a malformed agent payload with both discriminant and chord fields — rest schema first silently strips the chord fields, which is the desired behavior (progressive degradation: the slot becomes a rest, not a chord).

**Decision recorded in ADR 0012 D4:** rest schema listed first in both `SavedHarmonySchema.progression` and `HarmonySpecSchema.progression` unions.

---

## 11. Phase 06 acceptance criteria summary

| ID | Description | Primary file | Validation |
|---|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns `'arrange(\n  [2, silence]\n)'` | `strudel.ts` | unit |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` emits `arrange()` with `[1, silence]` at rest position | `strudel.ts` | unit |
| A-06-03 | Chord-only progression all `bars === 1` still emits slowcat `<…>` (regression guard) | `strudel.ts` | unit |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` → `VoiceRestEvent` at slotIndex 1; A min uses perm `[1,2,0]` same as direct C maj → A min | `voice-tracks.ts` | unit |
| A-06-05 | Session with rest slot `{ isRest: true, bars: 2 }` round-trips through serialize → JSON → parse → deserialize | `persistence.ts` | unit |
| A-06-06 | Version-1 session JSON (chord-only) still parses against updated `SavedSessionSchema` | `persistence.ts` | unit |
| A-06-07 | Agent payload with mixed progression validates; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | `apply.ts` | unit |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | `schema.ts` | proxy:static-analysis |
| A-06-09 | Rest slots render as grey segments; chord slot rendering unchanged | `ProgressionStrip.svelte` | manual |
| A-06-10 | "+ rest" button appends `RestSlot`; playing harmony with a rest produces silence; Strudel drawer shows `silence` | `ProgressionStrip.svelte` + store | live-system |
| A-06-11 | `tsc 0`, `lint 0`, `pnpm test` count ≥ 325, `pnpm build` exits 0 | all | automated |

---

## 12. Files to be created or modified in Phase 06

### New files

| File | Step | Description |
|---|---|---|
| `docs/adr/0012-rest-data-model.md` | 06.2 | ADR recording 5 locked decisions |

### Modified source files

| File | Step | Changes |
|---|---|---|
| `src/state/session.ts` | 06.3 | Add `RestSlot`, `ProgressionSlot`; change `progression: Chord[]` → `ProgressionSlot[]`; add `appendRest`, `addRestAt`; guard `deriveLiveCode` and `requeueLive` for rest slots; update `applyLoadedSession` |
| `src/core/codegen/strudel.ts` | 06.3 | Add local `HarmonySlotInput` union; update `melodyLine` dual-mode condition and `arrange()` map; update `buildSession` parameter type |
| `src/core/harmony/voice-tracks.ts` | 06.3 | Add `VoiceRestEvent`; change `VoiceTrack.events` type; add `RestInput`; change `computeVoiceTracks` signature; add rest branch in main loop |
| `src/lib/persistence.ts` | 06.4 | Add `SavedRestSchema`; change `progression` schema to union; update `serializeSession` and `deserializeSession` to narrow on `'isRest'` |
| `src/agent/schema.ts` | 06.4 | Bump `SCHEMA_VERSION` to 2; add `HarmonyRestSchema`; change `HarmonyChordSchema` to union |
| `src/agent/apply.ts` | 06.4 | Import `RestSlot`, `ProgressionSlot`; update loop to check `'isRest' in c` before `noteToPc` |
| `src/ui/ProgressionStrip.svelte` | 06.5 | Import `appendRest`; template narrowing for rest vs. chord slots; add "+ rest" button |

### Modified test files

| File | Step | Changes |
|---|---|---|
| `tests/codegen.test.ts` | 06.3 | Add rest-slot codegen tests (5+ tests) |
| `tests/harmony/voice-tracks.test.ts` | 06.3 | Add rest-slot voice-tracks tests (4+ tests) |
| `tests/persistence.test.ts` | 06.4 | Add rest round-trip, mixed progression, backward-compat tests (4+ tests) |
| `tests/schema.test.ts` | 06.4 | Add `HarmonyChordSchema` rest tests, `SCHEMA_VERSION` test (6+ tests) |

### Total expected new test count

Minimum: 307 + 7 (step 06.3) + 10 (step 06.4) = 324; final gate ≥ 325 (step 06.5 — no new unit tests from ProgressionStrip.svelte but quality gates reconfirm all prior tests).

---

## 13. No source code written

This is an inventory step only. All source and test files are unmodified.

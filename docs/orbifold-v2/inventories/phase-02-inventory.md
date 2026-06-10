# Phase 02 Inventory — Variable Chord Duration

**Written:** 2026-06-10
**Step:** 02.1 (Inventory)
**Phase:** 02 — Variable Chord Duration

---

## Files that will be touched

| File | Planned change |
|---|---|
| `src/state/session.ts` | Add `bars?: number` to `Chord` interface; add `setChordBars` action (step 02.3) |
| `src/lib/persistence.ts` | Add `bars: z.number().min(0.5).max(8).optional()` to `SavedChordSchema`; update `serializeSession` and `applyLoadedSession` (step 02.3) |
| `src/core/codegen/strudel.ts` | Widen `melodyLine()` parameter to include `bars?: number`; add dual-mode logic emitting `arrange()` when any chord has `bars !== 1` (step 02.4) |
| `src/ui/ProgressionStrip.svelte` | Replace `flex: 1` with proportional `flex-basis`; add horizontal resize handle; add `barsLabel` helper; add `resizeBars` local state (step 02.5) |
| `docs/adr/0010-variable-chord-duration.md` | New ADR: `arrange()` vs. `@`-operator vs. `timeCat()` (step 02.2) |
| `docs/orbifold-v2/handoffs/phase-02-handoff.md` | New handoff file; step entries appended after each step |

---

## Confirmed: `Chord` interface

**File:** `src/state/session.ts` lines 86–94

```typescript
export interface Chord {
  rootPc: number; // 0–11 (pitch class)
  qual: Quality;  // 'maj' | 'min' | 'dim' | 'aug'
  gain: number;   // 0–1.2; default 0.6
  cx?: number;    // Tonnetz centroid x (optional render hint)
  cy?: number;    // Tonnetz centroid y (optional render hint)
}
```

- `bars` does NOT yet exist. It will be added in step 02.3.
- `gain` is **required** (not optional) — type is `number`, not `number | undefined`. This is confirmed by the field declaration and by its use in `serializeSession` (`gain: ch.gain`, no null-guard). The `melodyLine()` parameter uses `gain?: number | null` (optional in the codegen API for callers that don't set gain), but the `Chord` interface itself carries it as required.

---

## Confirmed: `melodyLine()` signature and return shape

**File:** `src/core/codegen/strudel.ts` lines 66–78

```typescript
export function melodyLine(
  progression: ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null }>,
  chordMode: 'chord' | 'arp',
  octave: number
): string
```

Current slowcat form (verbatim, returned when progression is non-empty):

```
  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)
```

Where `seq` is the space-joined `[voicing]` brackets and `gains` is the space-joined per-chord gain values. The leading two-space indent is part of the return string (callers trim it: `harmonyCode(state).trim()`).

Empty progression returns `''`.

---

## Confirmed: `SavedChordSchema` Zod shape and schema version

**File:** `src/lib/persistence.ts` lines 10, 29–33

```typescript
export const SESSION_SCHEMA_VERSION = 1;

const SavedChordSchema = z.object({
  rootPc: z.number().int().min(0).max(11),
  qual: z.enum(SK_QUAL),
  gain: z.number().min(0).max(1.2),
});
```

- `bars` is NOT present yet.
- Schema version is `SESSION_SCHEMA_VERSION = 1`.
- **No version bump required** when adding `bars?: number` as an optional field. The new field uses `.optional()` → Zod `safeParse` succeeds on existing saved sessions that lack `bars`; the field resolves to `undefined`, which codegen treats as 1 (the uniform-duration case). Additive optional fields are backward-compatible by definition. A version bump would only be needed if the Pilot decides old sessions without `bars` should be rejected — which would be a behavioral choice, not a technical necessity.

---

## Confirmed: `arrange()` already used in the app

**File:** `src/core/composition/model.ts` lines 81–102 (`buildComposition`)

```typescript
export function buildComposition(blocks: Block[], tracks: Track[]): string {
  // ...
  segs.push(`  [${ref.bars}, ${b.code}]`);
  // ...
  return `arrange(\n${segs.join(',\n')}\n)`;
}
```

`arrange([numCycles, patternString], …)` is already used to build the composition timeline. This confirms `arrange()` is available in `@strudel/web@1.0.3` and that the codegen pattern is proven in the app.

---

## Confirmed: `Block.bars` vs `Chord.bars` naming

**File:** `src/core/composition/model.ts` line 19

```typescript
/** Duration in bars (1 Strudel cycle = 1 bar of 4/4). */
bars: number;
```

`Block.bars` and `Track.blocks[].bars` (model.ts lines 19, 29) are integer bar counts used in the composition layer. The new `Chord.bars` field introduced in step 02.3 uses the same field name but **allows fractional values** (multiples of 0.5, range [0.5, 8]). This naming overlap is **intentional** — both measure the same unit: 1 Strudel cycle = 1 bar of 4/4. The distinction between integer (`Block.bars`) and fractional (`Chord.bars`) is documented in the JSDoc.

---

## Confirmed: `ProgressionStrip.svelte` uses `flex: 1` on `.seg`

**File:** `src/ui/ProgressionStrip.svelte` lines 277–278

```css
.seg {
  flex: 1;
  /* ... */
}
```

Comment at line 260–261: `flex:1 (equal width) instead of flex:0 0 auto (auto-shrink chip)` and `Variable-width segments (Phase 02) will replace flex:1 with computed widths.`

In step 02.5 this must change from `flex: 1` to a computed `flex: 0 0 {pct}%` where `pct` is proportional to `ch.bars ?? 1` relative to `totalBars`. The `.seg` element also needs `position: relative` added for the `.resize-handle` to be absolutely positioned within it.

---

## Confirmed: next available ADR number is 0010

**Directory:** `docs/adr/`

Existing ADRs: `0001` through `0009` (0001–0009 confirmed present). Next available: **0010**.

ADR to write in step 02.2: `docs/adr/0010-variable-chord-duration.md`.

---

## Open decisions for ADR (step 02.2)

### OD-02-01: Dual-mode vs. unified codegen path

**Question:** Should `melodyLine()` always use `arrange()` (unified path), or only when at least one chord has `bars !== 1` (dual-mode path)?

**Option A — Dual-mode path:** `melodyLine()` uses the existing `<…>` slowcat form when all chords have `bars === 1` (or `bars` is undefined), and switches to `arrange()` only when at least one chord has `bars !== 1`. Advantage: byte-identical audio for the common uniform case; no change to the well-tested codegen path for existing sessions. Disadvantage: two code paths to maintain.

**Option B — Unified path (always `arrange()`):** `melodyLine()` always emits `arrange()`, even when all bars are 1. Advantage: single code path. Disadvantage: the output is NOT byte-identical to pre-phase `main` for existing sessions — the `<…>` slowcat form and `arrange([1, …], …)` produce the same _audio_ behavior but different _code strings_, which would be detected by the A-02-02 backward-compat test and would change the code displayed in the live code drawer.

**Phase 02 spec (step 02.2 requirement):** The ADR decides. The spec's implementation requirements section already documents the dual-mode rationale; the ADR captures it formally.

---

## Confirmed: `src/agent/schema.ts` — agent schema analysis

**File:** `src/agent/schema.ts` lines 100–104

```typescript
export const HarmonyChordSchema = z.object({
  root: z.string(),          // note name string (e.g. "C"), NOT a pitch class integer
  quality: z.enum(SK_QUAL),  // 'maj' | 'min' | 'dim' | 'aug'
  gain: z.number().min(0).max(1.2).optional(),
});
```

The agent's `HarmonyChordSchema` is **structurally different** from `persistence.ts`'s `SavedChordSchema`:
- Uses `root: z.string()` (note name) vs. `rootPc: z.number()` (pitch class integer).
- Uses `quality` (not `qual`).
- The agent schema models the JSON the AI generates; `apply.ts` translates it to the `Chord` shape before writing to the store.

There is **no `bars` field** in `HarmonyChordSchema`. Adding `bars` to the agent schema would allow the AI to set chord durations. This is a **potential scope item** — noted here for Pilot awareness. It is **out of scope for this phase** unless the Pilot explicitly includes it. The phase-02 scope covers only: `Chord` interface, `setChordBars` action, `SavedChordSchema`, `melodyLine()` codegen, and `ProgressionStrip` UI.

---

## Existing behavior to preserve

- `melodyLine()` output is byte-identical to pre-phase `main` when all chords have `bars === 1` or `bars` is undefined (the uniform case). This is the A-02-02 acceptance criterion.
- All `ProgressionStrip` interactions: vertical gain drag (3px threshold, 0.006/px, clamp [0,1.2]), tap-to-preview, ✕ remove button, keyboard Enter/Space. These must be completely independent of the new horizontal resize gesture (A-02-06, A-02-07).
- Sessions saved before Phase 02 (without `bars` field) load, parse, and play identically. The `SavedChordSchema.safeParse()` on data without `bars` must succeed (A-02-08).

---

## New behavior to introduce

- `Chord.bars?: number` — optional, multiples of 0.5, range [0.5, 8], default 1.
- `setChordBars(index, bars)` store action — clamps to nearest 0.5 in [0.5, 8], updates store, calls `requeueLive()`.
- `melodyLine()` dual-mode: slowcat when uniform (all bars === 1), `arrange()` when any bar differs.
- `ProgressionStrip` proportional-width segments.
- `ProgressionStrip` horizontal drag-to-resize gesture on right-edge handle.
- `ProgressionStrip` bar count label (only shown when `bars !== 1` and not undefined).

---

## Tests to add or modify

- **Step 02.3**: No new tests required (additive interface change and store action; clamping will be exercised by codegen tests in 02.4).
- **Step 02.4**: Add 4 new Vitest tests to the existing test file for `strudel.ts` (or create `src/core/codegen/__tests__/strudel.test.ts` if necessary):
  - Test 1: uniform durations (bars === 1 or undefined) → slowcat form, byte-identical to pre-phase output.
  - Test 2: mixed durations → `arrange()` form, exact string assertion.
  - Test 3: single chord with bars === 1 → slowcat form.
  - Test 4: empty progression → `''`.
  - Total test count must reach ≥ 184 (from 180 at Phase 01 close).
- **Step 02.5**: No new tests (UI component; manual parity note required in handoff).

---

## New dependencies needed

None. `arrange()` is already available in `@strudel/web@1.0.3` (confirmed by `buildComposition` in `model.ts`). No new npm packages are required.

---

## Environment, CI, build, deployment changes needed

None. This phase adds an optional field to the data model and an alternative codegen path. No schema migrations, no new environment variables, no CI changes.

---

## Project-specific verifications required by `CLAUDE.md`

- `pnpm exec tsc --noEmit` — 0 errors after each code-touching step.
- `pnpm lint` — 0 errors after each code-touching step.
- `pnpm test` — all tests pass; count ≥ 184 after step 02.4.
- `pnpm build` — exits 0 after each code-touching step.
- AGPL-3.0 headers intact on all modified/created files.
- No `.fast()`/`.slow()` calls introduced (invariant).
- No DOM/PIXI/Svelte imports in `src/core/**` (invariant).
- Prototype parity: step 02.5 modifies interaction logic from `ProgressionChips.svelte`; handoff must cite source lines and confirm behavioral fidelity.
- `src/agent/schema.ts` — `HarmonyChordSchema` is **not** modified in this phase (out of scope per analysis above).

---

## Source-of-truth check

- `harmonyCode(state)` in `session.ts` (line 227) calls `melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave)`. After step 02.3 adds `bars` to `Chord`, and step 02.4 widens `melodyLine()` to accept `bars?`, the call site passes `state.harmony.progression` which is of type `Chord[]`. `Chord` will have `bars?: number`, and `melodyLine()`'s widened parameter type will accept it. No call-site update needed.
- `buildSession()` in `strudel.ts` (line 123) calls `melodyLine(progression, chordMode, octave)` where `progression` is `ReadonlyArray<{ rootPc, qual, gain? }>`. After widening, existing callers remain valid (widening is backward-compatible).
- `requeueLive()` in `session.ts` (line 448) calls `harmonyCode(state).trim()`, which delegates to `melodyLine()`. No call-site update needed.

# ADR 0010 — Variable chord duration via `arrange()`

- **Status:** Accepted
- **Date:** 2026-06-10
- **Initiative / Phase:** orbifold-v2 / Phase 02 (step 02.2)
- **Deciders:** Pilot (Javier)

## Context

### Current state

`melodyLine()` in `src/core/codegen/strudel.ts` (lines 66–78) emits a slowcat sequence:

```
  note("<[A] [B] …>").s("sawtooth").lpf(1200).gain("<g1 g2 …>").room(0.3)
```

Each chord occupies exactly one Strudel cycle. There is no mechanism for chords to occupy different cycle counts. The `Chord` interface in `src/state/session.ts` has no duration field; every chord implicitly lasts one bar.

The Phase 02 goal is to let each chord carry an optional `bars` field so that, for example, one chord can last two cycles while the next lasts half a cycle, all within the same progression.

### Why the `@`-weight operator inside `<…>` is wrong

Strudel allows proportional weighting within a cycle: `note("<[c,e,g]@2 [f,a,c]>")`. This gives `[c,e,g]` 2/3 of one cycle and `[f,a,c]` 1/3 of one cycle. It does **not** give them 2 cycles and 1 cycle respectively. The `@` operator is a within-cycle proportional weight, not a multi-cycle duration operator. Using `@` to express variable chord durations would silently alter the musical result — the total pattern would still be one cycle long, with chords compressed or stretched within it. This approach is rejected.

### Why `arrange()` is correct

`arrange([numCycles, patternString], …)` assigns each segment an absolute duration of `numCycles` Strudel cycles. The total pattern length is the sum of all segment durations. This is semantically correct: a chord with `bars: 2` occupies exactly two cycles, independent of any other chord's duration.

Key reasons `arrange()` is the right tool:

1. **Absolute duration, not proportional:** `arrange([2, expr], [1, expr])` produces 2 cycles + 1 cycle = 3 cycles total, exactly as expected. No compression or stretching of neighboring segments.
2. **No `.fast`/`.slow`:** The pattern duration is determined by the `numCycles` argument, not by time-stretching. The global `setcps` clock continues to govern absolute tempo. The kickoff §6 invariant ("never use `.fast`/`.slow` for tempo") is fully respected.
3. **Already proven in the app:** `buildComposition` in `src/core/composition/model.ts` (lines 81–102) uses `arrange()` for the composition timeline, confirming the function is available and working in `@strudel/web@1.0.3`. No new API surface is introduced.

### Alternative considered: `stepcat()` / `timeCat()`

`timeCat()` provides proportional step durations, similar conceptually to `@` but as a top-level combinator. It was considered and rejected for the same reason as `@`: it expresses proportional weights within a cycle context, making it harder to reason about absolute cycle counts for each chord. `arrange()` is preferred because it already uses the same "absolute bar count" unit as `Block.bars` in the composition model, making the codebase semantically consistent.

---

## Decision

### 1. The `Chord.bars` field

Add `bars?: number` to the `Chord` interface in `src/state/session.ts`:

- **Type:** optional `number`; `undefined` is treated as `1` throughout codegen.
- **Valid values:** multiples of 0.5, minimum 0.5, maximum 8.
- **Clamping:** a dedicated `clampBars(bars: number): number` helper (exported from `session.ts`) enforces the constraint: `Math.round(bars * 2) / 2`, then clamped to `[0.5, 8]`. Used by both the `setChordBars` store action and the agent `apply.ts`.
- **Field name rationale:** Consistent with `Block.bars` in `src/core/composition/model.ts` (same unit: 1 Strudel cycle = 1 bar of 4/4). `Block.bars` is an integer; `Chord.bars` allows fractional values (multiples of 0.5). The shared name reflects the shared unit.
- **Placement:** after the `cy?` field in the interface, to minimize diff noise.

### 2. Codegen strategy: dual-mode `melodyLine()`

`melodyLine()` uses a **dual-mode** approach:

- **Uniform case** (all chords have `bars === 1` or `bars === undefined`): emit the existing `<…>` slowcat form unchanged. Output is byte-identical to pre-phase `main`. No change to the well-tested codegen path for existing sessions.
- **Variable case** (at least one chord has `bars !== 1`): emit the `arrange(…)` form.

The detection condition is:

```ts
const uniformDuration = progression.every(ch => (ch.bars ?? 1) === 1);
```

Rationale for dual-mode over unified: the `<…>` slowcat form is proven, pedagogically readable in the live code drawer, and the byte-identical guarantee for the common case is an explicit acceptance criterion (A-02-02). Switching all sessions to `arrange()` would change the code string displayed in the drawer even for sessions that never use variable durations, for no musical benefit.

### 3. The `arrange()` form for the harmony line

When the variable path is taken, each chord becomes one `arrange` segment:

```
[${ch.bars ?? 1}, `note("[${voicing}]").s("sawtooth").lpf(1200).gain(${gain.toFixed(2)}).room(0.3)`]
```

where `voicing` uses `chordVoicing(ch.rootPc, ch.qual, octave).join(sep)` with the same separator as the slowcat path (`','` for chord mode, `' '` for arp mode). The full output:

```
arrange(
  [2, note("[C3,E3,G3]").s("sawtooth").lpf(1200).gain(0.60).room(0.3)],
  [0.5, note("[F3,A3,C4]").s("sawtooth").lpf(1200).gain(0.80).room(0.3)]
)
```

Per-chord gain is **inline** in each segment's pattern string. The parallel `.gain("<g1 g2 …>")` pattern used in the slowcat form does **not** work with `arrange()` — each segment is an independent pattern expression with its own gain.

### 4. Backward compatibility

Existing sessions where all `Chord.bars` are 1 or `undefined`:

- Parse correctly: `SavedChordSchema` gains `bars: z.number().min(0.5).max(8).optional()`. An absent `bars` field resolves to `undefined` — `safeParse` succeeds on existing saved data.
- Play identically: `melodyLine()` takes the slowcat path (uniform case) — output is byte-identical to pre-phase `main`.
- **No schema version bump:** `SESSION_SCHEMA_VERSION` stays at 1. Adding an optional field is backward-compatible by definition; existing sessions without `bars` parse correctly and produce the same audio output.

---

## Consequences

### What changes in implementation (steps 02.3–02.5)

- **`melodyLine()` parameter type widens** (step 02.4): each element gains `bars?: number`. This is a backward-compatible widening; existing callers that pass objects without `bars` continue to compile and run correctly.
- **Downstream callers are unchanged:** `buildSession()` and `harmonyCode()` both delegate to `melodyLine()` — they pick up variable-duration support automatically without modification.
- **`requeueLive()`** calls `harmonyCode()` — live hot-swap (re-queue to next cycle) works for variable durations without additional changes.
- **`setChordBars(index, bars)` store action** (step 02.3): new exported function in `session.ts` that calls `clampBars`, updates the store, and calls `requeueLive()`.
- **`ProgressionStrip.svelte`** (step 02.5): `flex: 1` replaced by proportional `flex-basis`; horizontal drag-to-resize gesture added on a `.resize-handle` element.

### `.gain("<…>")` parallel pattern is not used in the `arrange()` path

The `arrange()` path uses per-chord inline gain. The `<…>` slowcat form continues to use the parallel `.gain("<g1 g2 …>")` pattern. These two forms are mutually exclusive and switched by the dual-mode condition.

### No `.fast()`/`.slow()` — invariant preserved

The `arrange()` form controls cycle duration via the `numCycles` argument, not via `.fast()`/`.slow()`. The kickoff §6 invariant is fully respected.

### Agent `HarmonyChordSchema` extension (step 02.3)

The AI agent's `HarmonyChordSchema` in `src/agent/schema.ts` will be extended with `bars: z.number().min(0.5).max(8).optional()` in step 02.3. This allows the agent to specify chord durations when building a progression. The `apply.ts` mapping will pass agent-supplied `bars` through `clampBars()` before writing to the store, ensuring valid values even if the LLM produces a non-multiple-of-0.5. This is a direct consequence of `Chord.bars` existing: the agent can only set what the UI supports (kickoff §7).

### Session schema version stays at 1

No migration is required. The `bars` field is additive and optional. Existing saved sessions without `bars` load, parse, and produce identical audio output.

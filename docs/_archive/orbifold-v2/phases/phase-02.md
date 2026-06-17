# Phase 02 — Variable Chord Duration

**Purpose:** Allow each chord in the progression to occupy a variable number of Strudel cycles (not fixed at 1 cycle per chord), with the ProgressionStrip showing proportionally-sized segments and a drag-to-resize gesture, backed by an ADR-approved `arrange()`-based codegen path.
**Gate:** orbifold-v2 Phase 01 complete and Pilot-approved (all three UX quick-wins shipped: harmony selectors hidden in Rhythm mode, drawer tabs repositioned, ProgressionStrip equal-segment timeline live; `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0 on `main`).
**Expected phase result:** Each chord in `HarmonyState.progression` carries an optional `bars` field (default 1, step 0.5, min 0.5, max 8); `melodyLine()` emits an `arrange(...)` pattern when any chord has `bars !== 1`; the ProgressionStrip renders variable-width segments proportional to `bars` and exposes a horizontal drag handle on each segment's right edge to resize; existing sessions without `bars` data play identically to pre-phase `main`; all quality gates pass.

---

## Step 02.1 — Inventory

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, and the Phase 01 completion handoff. Then read in full: `src/core/codegen/strudel.ts`, `src/state/session.ts` (complete), `src/ui/ProgressionStrip.svelte` (complete), `src/lib/persistence.ts` (complete), and `src/core/composition/model.ts`. Produce `docs/orbifold-v2/inventories/phase-02-inventory.md`. Do not write source code.

Implementation requirements:
- Confirm the exact shape of the `Chord` interface (fields, optionality, types) in `src/state/session.ts`. Note that `bars` does NOT yet exist. Confirm `gain` is required (not optional).
- Confirm the `melodyLine()` signature and return shape in `src/core/codegen/strudel.ts`. State the current `<...>` slowcat form verbatim.
- Confirm the `SavedChordSchema` Zod shape in `src/lib/persistence.ts`. Note the schema version is `SESSION_SCHEMA_VERSION = 1`. State whether a version bump is needed when adding `bars?: number` as an optional field (with default 1, it is backward-compatible — existing sessions without `bars` will parse cleanly; a bump is NOT required).
- Confirm that `arrange()` is already used in `src/core/composition/model.ts` (`buildComposition`), establishing that the function is available in `@strudel/web@1.0.3`.
- Confirm the exact field name used for durations in the composition model: `Block.bars` and `Track.blocks[].bars` are integer bar counts there. The new `Chord.bars` field in this phase uses the same field name but allows fractional values (multiples of 0.5). Note this naming overlap and confirm it is intentional — they measure the same unit (Strudel cycles = bars of 4/4).
- Confirm that `ProgressionStrip.svelte` uses `flex: 1` on `.seg` elements (equal-width Phase 01 invariant) and note where that must change for proportional widths in step 02.5.
- Note the next available ADR number by reading `docs/adr/` — confirm it is `0010` (0001–0009 are taken).
- Note any open decisions for the ADR (step 02.2). Key open decision: whether `melodyLine()` uses `arrange()` always (unified path) or only when durations differ (dual-mode path). Surface both options without resolving — the ADR decides.
- Confirm that `src/agent/schema.ts` exists and check whether `ChordSchema` or equivalent is defined there. If so, note that it may need a `bars` field update in a later step (or confirm it is out of scope for this phase if the agent schema is independent of the persistence schema).

Validation:
- No source code written.

Expected result:
- `docs/orbifold-v2/inventories/phase-02-inventory.md` present and complete.

CHECKPOINT → Commit message:
`docs(harmony): Phase 02 step 02.1 — phase-02 inventory`

---

## Step 02.2 — ADR: Variable Chord Duration via arrange()

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/orbifold-v2/inventories/phase-02-inventory.md, `src/core/codegen/strudel.ts`, `src/core/composition/model.ts`, and all existing ADRs in `docs/adr/`. Write `docs/adr/0010-variable-chord-duration.md`. Do not write any source code.

Implementation requirements:
- **ADR structure:** Follow the existing ADR style (Status, Context, Decision, Consequences). Mark status as `Accepted`.
- **Context section must cover:**
  - Current state: `melodyLine()` emits a slowcat `note("<[A] [B] …>")` where each chord occupies exactly 1 cycle. There is no mechanism for chords to occupy different cycle counts.
  - Why `@` inside `<…>` is wrong: `note("<[c,e,g]@2 [f,a,c]>")` gives 2/3 + 1/3 of ONE cycle — it does not give 2 cycles and 1 cycle. It is a proportional-weight operator within a single cycle, not a multi-cycle duration operator.
  - Why `arrange()` is correct: `arrange([numCycles, patternString], …)` gives each segment `numCycles` cycles of absolute duration. Safe: no `.fast`/`.slow`, inherits the global `setcps` clock. Already used in the app (`buildComposition` in `src/core/composition/model.ts`), confirming availability in `@strudel/web@1.0.3`.
  - Alternative considered: `stepcat()` / `timeCat()` — proportional steps, not absolute cycles. Rejected because `arrange()` already proven in the app and uses the same API pattern as the composition layer.
- **Decision section must cover:**
  - The `Chord.bars` field: `bars?: number` defaulting to 1, multiples of 0.5, min 0.5, max 8. Field name rationale: consistent with `Block.bars` (same unit: 1 Strudel cycle = 1 bar of 4/4).
  - The codegen strategy: **dual-mode** — `melodyLine()` uses the existing `<…>` slowcat when all chords have `bars === 1` (or `bars` is undefined), and switches to `arrange()` only when at least one chord has `bars !== 1`. Rationale: byte-identical audio for the common uniform case; no need to change the well-tested codegen path for existing sessions.
  - The `arrange()` form for the harmony line: each segment emits `[bars, \`note("[voicing]").s("sawtooth").lpf(1200).gain(${gain.toFixed(2)}).room(0.3)\`]`. Gain must be per-chord inline (the parallel `.gain("<…>")` pattern does not work with `arrange()` — each segment is an independent pattern string).
  - Backward compatibility: existing sessions where all `Chord.bars` are 1 (or undefined) produce the `<…>` slowcat form — the output is byte-identical to pre-phase `main`. Stated explicitly.
  - The `SavedChordSchema` Zod schema gains `bars: z.number().min(0.5).max(8).optional()`. Schema version stays at 1 (additive optional field; existing saved sessions without `bars` parse correctly — the field is absent, `undefined`, and treated as 1 by codegen).
- **Consequences section must cover:**
  - `melodyLine()` parameter type widens: `progression` items must expose `bars?: number` in addition to `rootPc`, `qual`, `gain`.
  - `buildSession()` and `harmonyCode()` delegate to `melodyLine()` — they pick up the change automatically.
  - `requeueLive()` calls `harmonyCode()` — the live hot-swap works for variable durations without additional changes.
  - The `.gain("<g1 g2 …>")` parallel gain pattern is NOT used in the `arrange()` path. Per-chord gain is inline.
  - No `.fast()`/`.slow()` — invariant respected.
- **This ADR is a Pilot Checkpoint (Checkpoint #2).** The Dev commits this file and STOPS. No model, codegen, or UI changes proceed until this ADR is reviewed and approved.

Validation:
- No source code written.
- `docs/adr/0010-variable-chord-duration.md` exists and follows the ADR format.

Expected result:
- `docs/adr/0010-variable-chord-duration.md` present, complete, and accurately describing the decisions above.

CHECKPOINT → Commit message:
`docs(adr): Phase 02 step 02.2 — ADR 0010 variable chord duration via arrange()`

**PILOT CHECKPOINT — STOP AFTER THIS STEP.** The Planner reviews the ADR commit. The Dev must not proceed to step 02.3 until the Planner explicitly approves and the Pilot confirms the ADR.

---

## Step 02.3 — Data model: Chord.bars field and store action setChordBars

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/adr/0010-variable-chord-duration.md, `src/state/session.ts` (complete), `src/lib/persistence.ts` (complete), `src/agent/schema.ts` (complete), and `src/agent/apply.ts` (complete). Add `bars?: number` to the `Chord` interface, add the `setChordBars` store action, update the persistence Zod schema, and extend the agent schema to support `bars`. Do not touch `src/core/codegen/strudel.ts` or `src/ui/ProgressionStrip.svelte` in this step.

Implementation requirements:
- **`clampBars` helper** (`src/state/session.ts`): Extract the clamping logic as a named exported pure function `export function clampBars(bars: number): number` — rounds to nearest 0.5 (`Math.round(bars * 2) / 2`) then clamps to `[0.5, 8]`. Used by both `setChordBars` and the agent `apply.ts`.
- **`Chord` interface** (`src/state/session.ts`): Add `bars?: number` as an optional field. JSDoc: `Duration in Strudel cycles (default 1; multiples of 0.5; min 0.5, max 8). Introduced in Phase 02 — ADR 0010.` Place it after the `cy?` field to minimise diff noise.
- **`setChordBars` action** (`src/state/session.ts`): New exported function `setChordBars(index: number, bars: number): void`. Uses `clampBars(bars)`. Updates `harmony.progression[index].bars` in the store via `sessionStore.update`. Calls `requeueLive()` on commit. No-op if `index` is out of range. Include comment: `No prototype equivalent — new feature (Phase 02 ADR 0010).`
- **Zod schema** (`src/lib/persistence.ts`): In `SavedChordSchema`, add `bars: z.number().min(0.5).max(8).optional()`. No change to `SESSION_SCHEMA_VERSION` (stays at 1 — additive optional field; existing saved data remains valid per ADR 0010).
- **`serializeSession`** (`src/lib/persistence.ts`): In the `progression` map, include `...(ch.bars !== undefined ? { bars: ch.bars } : {})` to preserve `bars` when set. Chords where `bars` is `undefined` are serialized without the field — existing sessions remain byte-identical.
- **`applyLoadedSession`** (`src/lib/persistence.ts`): In the `progression.map`, add `...(ch.bars !== undefined ? { bars: ch.bars } : {})` so loaded sessions restore the `bars` value.
- **Agent schema** (`src/agent/schema.ts`): In `HarmonyChordSchema`, add `bars: z.number().min(0.5).max(8).optional()`. Add a JSDoc comment on the field: `Duration in Strudel cycles (0.5 = half bar, 1 = one bar, 2 = two bars; multiples of 0.5; default 1).` This allows the AI agent to set chord duration when building a progression.
- **Agent apply** (`src/agent/apply.ts`): In the mapping from agent chord → `Chord`, add `...(ch.bars !== undefined ? { bars: clampBars(ch.bars) } : {})`. Import `clampBars` from `../state/session.js`. The `clampBars` call here ensures agent-supplied values are always valid even if the LLM produces a non-multiple-of-0.5.
- **`DEFAULT_SESSION_STATE`** (`src/state/session.ts`): No change — the default empty progression `[]` needs no update.
- AGPL-3.0 headers intact on all modified files.
- TS strict: no `any`, no `// @ts-ignore`.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count must not regress below 180).
- `pnpm build` — exits 0.
- No new tests required for this step (the `Chord` interface change is purely additive; `setChordBars` and agent pass-through will be exercised by codegen tests in step 02.4).

Expected result:
- `clampBars(bars)` exported from `src/state/session.ts`.
- `Chord` interface has `bars?: number`.
- `setChordBars(index, bars)` is exported from `src/state/session.ts`.
- `SavedChordSchema` validates optional `bars` in `[0.5, 8]`.
- Serialization round-trips `bars` when set; omits it when undefined.
- `HarmonyChordSchema` in `src/agent/schema.ts` has optional `bars` field.
- `apply.ts` maps agent `bars` → `Chord.bars` via `clampBars`.
- All quality gates pass.

CHECKPOINT → Commit message:
`feat(harmony): Phase 02 step 02.3 — Chord.bars field, setChordBars action, Zod schema, agent schema`

---

## Step 02.4 — Codegen: melodyLine() with arrange() for variable durations

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/adr/0010-variable-chord-duration.md, `src/core/codegen/strudel.ts` (complete), and `src/state/session.ts` (the updated `Chord` interface from step 02.3). Update `melodyLine()` in `src/core/codegen/strudel.ts` to emit `arrange(...)` when any chord has `bars !== 1`. Add unit tests. Do not touch `src/ui/ProgressionStrip.svelte` or `src/lib/persistence.ts` in this step.

Implementation requirements:
- **`melodyLine()` signature widening** (`src/core/codegen/strudel.ts`): The `progression` parameter type already accepts `ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null }>`. Widen to include `bars?: number` on each element: `ReadonlyArray<{ rootPc: number; qual: Quality; gain?: number | null; bars?: number }>`. This is a backward-compatible widening (existing callers pass objects without `bars`, which is valid since `bars` is optional).
- **Dual-mode logic (per ADR 0010):**
  - Compute `const uniformDuration = progression.every(ch => (ch.bars ?? 1) === 1)`.
  - If `uniformDuration` is `true`: emit the existing `<…>` slowcat form unchanged. Output is byte-identical to pre-phase `main`.
  - If `uniformDuration` is `false`: emit `arrange(…)` form.
- **`arrange()` form:** Each chord becomes `  [${ch.bars ?? 1}, \`note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.3)\`]` where `voicing` uses the same `chordVoicing(ch.rootPc, ch.qual, octave).join(sep)` as the slowcat path. The full output is: `arrange(\n${segments.join(',\n')}\n)` (no leading two-space indent — unlike the slowcat form which has `  note(…)`). The trim in callers (`harmonyCode`, `requeueLive`) handles any surrounding whitespace.
- The separator (`sep`) for voicing notes is the same as the slowcat path: `','` for `chordMode === 'chord'`, `' '` for `chordMode === 'arp'`.
- **Update JSDoc** on `melodyLine()` to document the dual-mode behavior and cite ADR 0010.
- **Unit tests** (add to the existing Vitest test file for `strudel.ts`, or create `src/core/codegen/__tests__/strudel.test.ts` if the existing test file is elsewhere):
  - **Test 1 — uniform durations (backward compat):** Given a 2-chord progression where both `bars` are 1 (or undefined), assert the output is the `<…>` slowcat form matching the exact string produced by the pre-phase function. This is the byte-identical guarantee from ADR 0010.
  - **Test 2 — mixed durations:** Given a progression `[{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 2 }, { rootPc: 5, qual: 'min', gain: 0.8, bars: 0.5 }]` with `chordMode: 'chord'` and `octave: 3`, assert the output is the expected `arrange(…)` string. The test must assert the full string exactly — not a substring match.
  - **Test 3 — single chord with bars === 1 (uniform path):** Assert `melodyLine([{ rootPc: 0, qual: 'maj', gain: 0.6, bars: 1 }], 'chord', 3)` uses the slowcat form.
  - **Test 4 — empty progression:** Assert `melodyLine([], 'chord', 3)` returns `''` (unchanged behavior).
- AGPL-3.0 header intact on modified/created files.
- TS strict throughout.
- Engines in `core/**` have NO DOM/PIXI/Svelte imports (invariant check).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass; new tests added (count must be ≥ 184 — the 4 new tests above; prior 180 must not regress).
- `pnpm build` — exits 0.

Expected result:
- `melodyLine()` emits `arrange(…)` when any chord has `bars !== 1`.
- `melodyLine()` output is byte-identical to pre-phase `main` when all `bars === 1` or `bars` is undefined.
- Unit tests pass and assert exact string output for both paths.
- All quality gates pass.

CHECKPOINT → Commit message:
`feat(codegen): Phase 02 step 02.4 — melodyLine arrange() for variable chord durations, unit tests`

---

## Step 02.5 — UI: ProgressionStrip variable-width segments and horizontal resize gesture

PROMPT → Read CLAUDE.md, docs/orbifold-v2/decisions.md, docs/adr/0010-variable-chord-duration.md, `src/ui/ProgressionStrip.svelte` (complete), `src/state/session.ts` (the updated `Chord` interface and the `setChordBars` action from step 02.3), and `docs/orbifold-v2/inventories/phase-02-inventory.md`. Update `ProgressionStrip.svelte` to render variable-width segments and add the horizontal drag-to-resize gesture. Do not touch `src/core/**`, `src/lib/persistence.ts`, or `src/state/session.ts` in this step.

Implementation requirements:
- **Proportional widths:** Replace the CSS `flex: 1` on `.seg` with a computed `flex-basis` proportional to `ch.bars ?? 1` relative to the total sum of all bars. Use an inline style: `style="flex: 0 0 {pct}%; background: {chipGainCss(displayGain)}"` where `pct = ((ch.bars ?? 1) / totalBars) * 100` and `totalBars` is the reactive sum `$sessionStore.harmony.progression.reduce((s, c) => s + (c.bars ?? 1), 0)`. When the progression is empty `totalBars` is 0 — guard against division by zero (fall back to equal distribution).
- **Horizontal drag-to-resize gesture (new, separate from vertical gain drag):**
  - Each `.seg` gets a `.resize-handle` child element: a thin vertical bar on the right edge, `cursor: ew-resize`, width 8 px, height 100%, positioned absolutely at `right: 0`. The `.seg` must have `position: relative` for this to work.
  - `pointerdown` on `.resize-handle` starts a horizontal resize: capture the pointer, record `startX = e.clientX`, `startBars = ch.bars ?? 1`.
  - `pointermove` (while resize active for segment `i`): `dx = e.clientX - startX`; convert pixels to bars: `deltaBars = dx / segWidth` where `segWidth` is the current rendered width of the `.segments` container divided by `totalBars` (i.e., the pixel width of 1 bar). Compute `newBars = Math.round((startBars + deltaBars) * 2) / 2` (nearest 0.5), clamped to `[0.5, 8]`. Update a local `resizeBars` array (same pattern as `localGain`) so the segment reflows live while dragging.
  - `pointerup`: commit via `setChordBars(i, newBars)` (which calls `requeueLive()` internally). Release pointer capture.
  - The `.resize-handle` `pointerdown` must call `e.stopPropagation()` so it does not trigger the parent `.seg`'s `handlePointerDown` (gain drag). These are two completely separate gestures.
  - `touch-action: none` on `.resize-handle`.
- **Bar count label:** Display the chord's duration as a small label below the chord label (or as a suffix). Format: `½×` for 0.5, `1×` for 1, `1½×` for 1.5, `2×` for 2, etc. Use a helper function `barsLabel(bars: number): string`. The label is small (9 px, color `var(--faint)`). Do not show the label when `bars === 1` and `bars` is undefined (i.e., only show when the duration is non-default, to keep the UI clean for the common case). Open decision for Dev: always show or only show non-1 — pick "only show when non-1" per the phase scope rationale.
- **Vertical gain drag:** Must remain fully functional and completely independent of the horizontal resize gesture. The two gestures are distinguished by their target: gain drag starts on the `.seg` body (not the handle), resize drag starts on `.resize-handle`.
- **Tap-to-preview:** Must remain fully functional. Tap detection is on the `.seg` body (not the handle).
- **Remove button:** Must remain fully functional.
- **Segment `cursor`:** `.seg` retains `cursor: ns-resize` (vertical drag). `.resize-handle` uses `cursor: ew-resize`.
- AGPL-3.0 header intact on `ProgressionStrip.svelte`.
- TS strict. No DOM/PIXI imports (this is a Svelte component, not a core engine — Svelte imports are fine here).
- The prototype-parity checklist applies to this step because it modifies existing interaction logic from `ProgressionChips.svelte` (the gain drag, tap, and remove interactions must still be cited and still work correctly).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count must not regress below step 02.4 count).
- `pnpm build` — exits 0.
- Manual parity note in handoff:
  - With a 4-chord progression where all `bars === 1`: segments are equal-width (same as Phase 01 behavior).
  - After dragging the resize handle of chord 0 to 2 bars: that segment is twice as wide as the 1-bar segments; the strip still fills the full available width; the ProgressionStrip codegen produces an `arrange()` pattern with `[2, …]` for that chord.
  - Vertical gain drag still works independently.
  - Tap-to-preview still works.
  - Remove button still works.

Expected result:
- `ProgressionStrip.svelte` renders segments with widths proportional to `ch.bars ?? 1`.
- Horizontal drag on the resize handle resizes the chord and calls `setChordBars`.
- All prior interactions (gain drag, tap-preview, remove) work without regression.
- All quality gates pass.

CHECKPOINT → Commit message:
`feat(ux): Phase 02 step 02.5 — ProgressionStrip variable-width segments and resize gesture`

---

## Phase Acceptance

- **A-02-01** — Each chord in the progression can have a variable duration in Strudel cycles (`bars` field: multiples of 0.5, min 0.5, max 8, default 1); the `Chord` interface exposes `bars?: number` and `setChordBars(index, bars)` clamps and commits the value.
  - Validation method: `unit` (store action test via codegen test in step 02.4; clamping covered by the store action contract)
- **A-02-02** — When all chords have `bars === 1` (or `bars` is undefined), `melodyLine()` produces the same `note("<…>").s("sawtooth").lpf(1200).gain("<…>").room(0.3)` slowcat string as pre-phase `main` — byte-identical.
  - Validation method: `unit` (Test 1 and Test 3 in step 02.4)
- **A-02-03** — When at least one chord has `bars !== 1`, `melodyLine()` produces an `arrange([bars, noteExpr], …)` string with per-chord inline gain.
  - Validation method: `unit` (Test 2 in step 02.4)
- **A-02-04** — The ProgressionStrip renders each segment with a width proportional to its `bars` value; the sum of all segment widths always fills the available footer width.
  - Validation method: `manual`
- **A-02-05** — Dragging the right-edge resize handle of a segment horizontally changes that chord's `bars` value (nearest 0.5, clamped to [0.5, 8]) and updates the strip width live while dragging; releasing commits via `setChordBars` and calls `requeueLive()`.
  - Validation method: `manual`
- **A-02-06** — The resize gesture and the vertical gain-drag gesture are fully independent: starting a drag on the resize handle does not trigger gain drag, and starting a vertical drag on the segment body does not trigger resize.
  - Validation method: `manual`
- **A-02-07** — All prior Phase 01 interactions are preserved without regression: vertical gain drag changes gain (threshold 3px, 0.006/px, clamp [0,1.2]); tap-to-preview plays chord; ✕ removes chord.
  - Validation method: `manual`
- **A-02-08** — Existing saved sessions (without `bars` field in the chord data) load, parse, and play correctly — the missing `bars` field defaults to `undefined`, treated as 1 by `melodyLine()`, producing the same audio output.
  - Validation method: `unit` (Zod schema `safeParse` roundtrip — SavedChordSchema with no `bars` field parses successfully)
- **A-02-09** — `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean at phase completion; test count is ≥ 184 (180 prior + at least 4 new codegen tests).
  - Validation method: `unit` (automated gate)

## Partial coverage from prior phase

No prior partials to address from Phase 01. All nine Phase 01 acceptance criteria (A-01-01 through A-01-09) were fully covered. This phase introduces net-new capability.

## ADR Triggers

- **Variable chord duration: `arrange()` vs. `@`-operator vs. `timeCat()`** — Trigger: step 02.2. The ADR (`docs/adr/0010-variable-chord-duration.md`) is written in step 02.2 and is a Pilot Checkpoint before implementation proceeds. This is the primary ADR for this phase.
- **Session schema version bump** — Trigger: step 02.3. If the Pilot decides `bars` should NOT be backward-compatible (i.e., old sessions without `bars` should be rejected), a schema version bump would be required. Per the ADR, the field is optional and backward-compatible — no bump needed. Surface to Pilot if they disagree.
- **Agent schema update for `bars`** — Trigger: step 02.3 inventory check. If `src/agent/schema.ts` contains a `ChordSchema` or equivalent that models the `Chord` type, the Dev must note it in the inventory. Updating the agent schema to allow the agent to set `bars` is a potential scope item; if desired, surface as an open decision for the Pilot before step 02.3 proceeds. Updating it is out of scope for this phase unless the Pilot explicitly includes it.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-02-handoff.md`. See `handoff-template.md`.

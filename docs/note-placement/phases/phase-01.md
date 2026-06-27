<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — NoteSlot: Single-Note Placement on the Pentagrama

**Purpose:** Introduce a third progression-slot type — `NoteSlot` — that represents a single pitched note rather than a full triad. The user toggles into note mode, clicks a Tonnetz vertex to capture its pitch class, adjusts the pitch vertically on the Pentagrama staff (or via an offset control), and hears the note rendered by Strudel's `note()` function. This phase wires the complete pipeline: type model → Zod persistence schema → codegen → Tonnetz interaction → Pentagrama rendering.

**Gate:** `authentic-groove` initiative complete and merged to `main` (commit `8aadd3d`, 2026-06-26); `pnpm test` passes clean at 2020; `tsc --noEmit`, `pnpm lint`, and `pnpm build` all pass clean; SESSION_SCHEMA_VERSION = 5; SCHEMA_VERSION = 6. Open decisions OD-1, OD-2, and OD-3 (defined in step 01.1) must be resolved by the Pilot before step 01.2 begins.

**Expected phase result:** After this phase the user can toggle into note mode via a UI affordance, click a Tonnetz vertex to add a `NoteSlot` to the progression, drag the note-head vertically on the Pentagrama staff (or use an offset numeric input) to shift pitch by octave and semitone, and play the result — Strudel will emit a `note("…")` pattern for that slot. All existing chord and rest behavior is unchanged, the discriminated union is fully exhaustive-checked in TypeScript, `SESSION_SCHEMA_VERSION` is bumped to 6 to account for the new serialized slot variant, `pnpm test` count increases above 2020, and all quality-gate commands pass clean.

---

## Architecture constraints for every step

**Discriminated-union exhaustiveness:** `ProgressionSlot` (in `src/state/session.ts`) is currently `Chord | RestSlot`. After step 01.2 it becomes `Chord | RestSlot | NoteSlot`. Every switch or if/else chain in the codebase that pattern-matches on `ProgressionSlot` must be updated with a `NoteSlot` branch and — where appropriate — a TypeScript `never` exhaustiveness check. A step that leaves any existing switch arm silently untouched is REVISED.

**Core/render boundary:** `NoteSlot` type definition and any pure-engine helpers (pitch conversion, codegen) live in `src/core/**` or `src/state/session.ts`. Zero DOM/PIXI/Svelte imports in `src/core/**`. Render-layer code (`src/render/**`, Svelte components) may import core types but never vice-versa.

**Codegen seam:** The `melodyLine` / `chordToStrudel` functions in `src/core/codegen/strudel.ts` are the only place that emits Strudel patterns for harmony slots. The `NoteSlot` branch is added there; no other codegen site may emit `note()` patterns for `NoteSlot` independently.

**Persistence schema version bump:** Adding `NoteSlot` to the serialized `progression` array is a breaking schema change. Sessions saved before this phase cannot contain `NoteSlot` entries and will parse correctly because the new schema union lists the old variants first. However, `SESSION_SCHEMA_VERSION` must be bumped to 6 so the load path can distinguish blobs. No migration function is needed — old sessions degrade gracefully (chord-only progressions continue to load). This bump must be applied in step 01.2 simultaneously with the schema addition.

**Agent schema:** The agent schema (`src/agent/schema.ts` `SCHEMA_VERSION`) is NOT bumped in this phase if no `NoteSlot` support is added to the agent (see OD-3). If the Pilot resolves OD-3 to Option A (extend agent schema), the Dev must bump `SCHEMA_VERSION` to 7 in the same step that adds the agent schema change.

**No ADR anticipated unless OD-3 resolves to Option A.** Steps 01.2–01.5 are additive: a new slot variant, a new codegen branch, a new render branch. If OD-3 resolves to Option A, an ADR must be written before or during step 01.2. Surface a blocker if any other unexpected governance constraint appears.

**Strudel `note()` pattern format:** The `note()` function takes a note-name string (e.g. `"C4"`, `"F#3"`, `"Bb5"`). For a `NoteSlot` in a slot lasting N bars, the generated Strudel code uses the `arrange()` form if any slot in the progression is non-uniform, or the slowcat `<…>` form if all slots are uniform. A `NoteSlot` is always considered to have non-uniform timbre (it is a different pattern type from chord slots), so the presence of any `NoteSlot` forces the `arrange()` form for the whole progression. Exact output format is specified in step 01.3.

**Strudel expressiveness — hard design principle (Pilot directive, 2026-06-26):** The `NoteSlot` type and codegen must be designed so that Strudel's full `note()` plasticity is *preserved and exploitable from the UI*, not reduced to a minimal stub. Strudel's `note()` supports: chaining `.s()` (instrument), `.gain()`, `.room()`, `.lpf()`, `.decay()`, and full mini-notation sequences (e.g. `note("C4 E4 G4")` for a melodic fragment within a slot). Concrete implications:

- `NoteSlot` interface must be open to future optional attribute fields (`instrument?`, `gain?`, `room?`, `decay?`, `lpf?`) that parallel the `Chord` attributes already in the system. Do NOT design a closed or minimal struct — the type must visibly invite extension.
- The codegen branch in step 01.3 must document (in a comment) which `note()` capabilities are emitted now and which are reserved for future phases. It must emit the full chain of *any* attributes already present on the slot (not just the pitch), even if Phase 01 only populates the pitch field.
- A Dev may NOT narrow the `HarmonySlotInput` union or the codegen output in a way that would require a breaking change to emit `.s()`, `.gain()`, or a mini-notation sequence in a future step. Surface a blocker if the step 01.3 design would foreclose those.
- At inventory (step 01.1), the OD-1 recommendation must explicitly address Strudel's codegen implications of each pitch model option — not just the TypeScript type shape.

**AGPL-3.0 header:** Every new file created in this phase must open with `// SPDX-License-Identifier: AGPL-3.0-only`.

**Decisions Register (`docs/note-placement/decisions.md`):** Required reading every invocation. The Pilot is the only writer.

---

## Step 01.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, and `docs/note-placement/phases/phase-01.md` (this file) before doing anything else. Then perform a read-only code inventory of the files listed below. Produce `docs/note-placement/inventories/phase-01-inventory.md` containing: (a) the current `ProgressionSlot` union members and discriminants as found in `src/state/session.ts`; (b) the `HarmonySlotInput` local union in `src/core/codegen/strudel.ts` and whether it would need to grow for `NoteSlot`; (c) the `SavedHarmonySchema` progression array union and `SESSION_SCHEMA_VERSION` current value from `src/lib/persistence.ts`; (d) the `AgentOutputSchema` current slots and `SCHEMA_VERSION` current value from `src/agent/schema.ts`; (e) the `onStagePointerDown` dispatch path in `src/render/tonnetz-scene.ts` — describe how a click is routed to `pickChord` and where note-mode branching would be inserted; (f) the slot paint branches in `src/render/pentagrama-scene.ts` — identify the `pChord`/`pArp`/`pRest` branches and where a `pNote` branch would live; (g) all exhaustive switch/if-else chains that match on `ProgressionSlot` across the codebase (grep for `isRest`); (h) the three open decisions OD-1, OD-2, OD-3 as specified in the phase file, with recommendations; (i) schema-version bump recommendation (whether `SESSION_SCHEMA_VERSION` and/or `SCHEMA_VERSION` need bumping and when). STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)
4. `src/state/session.ts` lines 1–300 (ProgressionSlot, Chord, RestSlot, HarmonyState)
5. `src/core/codegen/strudel.ts` (full — HarmonySlotInput, melodyLine, chordToStrudel)
6. `src/core/theory/chords.ts` (full — chordPcs, chordVoicing)
7. `src/render/tonnetz-scene.ts` lines 1–550 (RenderNode, onStagePointerDown, pickChord)
8. `src/render/pentagrama-scene.ts` lines 1–400 (slot paint branches — pChord, pArp, pRest)
9. `src/lib/persistence.ts` lines 1–180 (SavedHarmonySchema, SESSION_SCHEMA_VERSION)
10. `src/agent/schema.ts` lines 1–140 (AgentOutputSchema, SCHEMA_VERSION)

**What to produce:**

`docs/note-placement/inventories/phase-01-inventory.md` containing sections (a) through (i) as listed in the PROMPT. The document must include:

- Section **OD-1: Pitch-offset model** — evaluate the three options (A: `{ rootPc: number; octaveOffset: number }`, B: `{ midiNote: number }`, C: `{ noteName: string }`) against the `HarmonyState.octave` global and the Strudel `note()` API. State a clear recommendation with rationale.

- Section **OD-2: Tonnetz interaction model** — describe how `onStagePointerDown` routes clicks to `pickChord` and where a note-mode branch would sit. Evaluate: (A) use `HarmonyState.octave` + vertex `pc` → `NOTE_NAMES[pc] + octave`; (B) auto-place on nearest free staff line. State a recommendation.

- Section **OD-3: Agent schema extension** — evaluate Option A (extend agent schema with an optional `notes` array; bump `SCHEMA_VERSION` to 7) vs. Option B (defer agent support). Cite CLAUDE.md guardrail "the agent may only generate what the UI supports" and note that the UI support for `NoteSlot` will exist after this phase.

- Section **Schema version bump** — confirm `SESSION_SCHEMA_VERSION` must bump from 5 to 6 (new slot variant in persistence); state whether `SCHEMA_VERSION` bumps in this phase (depends on OD-3 resolution).

- Section **Exhaustiveness audit** — list every file that contains `isRest` pattern-matches, so step 01.2 knows exactly where to add `NoteSlot` branches.

**Acceptance criteria:**

- A-01-01: `docs/note-placement/inventories/phase-01-inventory.md` exists and contains all nine sections (a–i / OD-1 / OD-2 / OD-3 / schema version / exhaustiveness audit).
- A-01-02: Sections OD-1, OD-2, and OD-3 each state a recommended option with a one-sentence rationale.
- A-01-03: The inventory was produced by reading only — no source files were modified.
- A-01-04: The exhaustiveness audit lists all files with `isRest` pattern-matches found by grep.

---

## Step 01.2 — `NoteSlot` model, persistence schema, and store action

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, `docs/note-placement/phases/phase-01.md`, and `docs/note-placement/inventories/phase-01-inventory.md` before editing. The Pilot has resolved OD-1, OD-2, and OD-3 — apply the resolved pitch-offset model exactly. (1) Add the `NoteSlot` interface to `src/state/session.ts` and expand `ProgressionSlot` to `Chord | RestSlot | NoteSlot`. (2) Add a guard function `isNoteSlot(slot: ProgressionSlot): slot is NoteSlot`. (3) Add an `addNote` store action that appends a new `NoteSlot` to `harmony.progression`. (4) Add a `setNoteOffset` store action to update a `NoteSlot`'s pitch offset by index. (5) Update every exhaustive branch in the codebase (as listed in the inventory) with a `NoteSlot` arm. (6) Update `src/lib/persistence.ts`: add `SavedNoteSlotSchema`, add it to the `progression` union, bump `SESSION_SCHEMA_VERSION` to 6. (7) If OD-3 resolved to Option A, extend `src/agent/schema.ts` accordingly and bump `SCHEMA_VERSION` to 7. (8) Write unit tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)
4. `docs/note-placement/inventories/phase-01-inventory.md` (full — especially OD-1 resolution and exhaustiveness audit)
5. `src/state/session.ts` lines 1–350 (full Chord, RestSlot, ProgressionSlot, HarmonyState, addChord / existing store actions)
6. `src/lib/persistence.ts` lines 1–180 (SavedHarmonySchema, SESSION_SCHEMA_VERSION)
7. `src/agent/schema.ts` lines 1–160 (AgentOutputSchema, SCHEMA_VERSION — if OD-3 → Option A)
8. Every file listed in the inventory's exhaustiveness audit section

**What to produce:**

**`src/state/session.ts`** — add after `RestSlot`:

The exact shape of `NoteSlot` depends on the Pilot's OD-1 resolution. The three candidate shapes are:

- Option A (recommended if Pilot chooses it): `{ isNote: true; rootPc: number; octaveOffset: number; bars?: number }` — where `rootPc` (0–11) is the pitch class from the Tonnetz vertex, and `octaveOffset` is an integer relative to `HarmonyState.octave` (e.g., `0` = same octave as `HarmonyState.octave`, `-1` = one octave lower). The resulting MIDI pitch = `rootPc + (HarmonyState.octave + octaveOffset) * 12 + 12` and the note name is derived via `NOTE_NAMES[rootPc] + (HarmonyState.octave + octaveOffset)`.
- Option B: `{ isNote: true; midiNote: number; bars?: number }` — absolute MIDI pitch 0–127.
- Option C: `{ isNote: true; noteName: string; bars?: number }` — e.g. `"C4"`.

Regardless of option, the discriminant field is `isNote: true` (analogous to `isRest: true`). The `bars` field follows the same `clampBars` semantics as `Chord.bars`. The JSDoc must cite this phase and the OD-1 resolution.

Add guard function:

```typescript
export function isNoteSlot(slot: ProgressionSlot): slot is NoteSlot {
  return 'isNote' in slot && slot.isNote === true;
}
```

Add store actions:

- `addNote(rootPc: number): void` — appends a new `NoteSlot` with `rootPc`, `octaveOffset: 0` (Option A) or equivalent default, `bars: 1`. Calls `requeueLive` if harmony is playing.
- `setNoteOffset(idx: number, octaveOffset: number): void` (Option A) or `setNotePitch(idx: number, value: number | string): void` (Options B/C) — updates the pitch field on the slot at index `idx`. No-ops if `idx` out of bounds or slot is not a `NoteSlot`. Calls `requeueLive` if harmony is playing.

Update `ProgressionSlot`:

```typescript
export type ProgressionSlot = Chord | RestSlot | NoteSlot;
```

Update every exhaustive branch listed in the inventory with a `NoteSlot` arm. Where a `never` check applies, add it.

**`src/lib/persistence.ts`** — add `SavedNoteSlotSchema` (shape mirrors `NoteSlot` with appropriate Zod validators), add it to the `progression` union before `SavedChordSchema` (so it is checked before the catch-all chord shape), and bump `SESSION_SCHEMA_VERSION` to 6.

The `SavedNoteSlotSchema` must include:

- `isNote: z.literal(true)` (discriminant — required)
- `rootPc: z.number().int().min(0).max(11)` (Options A and B: rootPc; Option B uses `midiNote` instead)
- For Option A: `octaveOffset: z.number().int().min(-4).max(4)` (semitone shift in octave units)
- For Option B: `midiNote: z.number().int().min(0).max(127)`
- For Option C: `noteName: z.string()`
- `bars: z.number().min(0.25).max(8).optional()`

**`src/agent/schema.ts`** — if OD-3 resolves to Option A: add a `NoteSlotAgentSchema`, add an optional `notes?: NoteSlotAgentSchema[]` field to `AgentOutputSchema`, update `superRefine` guard to include `notes`, and bump `SCHEMA_VERSION` to 7. If OD-3 resolves to Option B (defer): no change to this file.

**Tests** — create `tests/note-placement/note-slot-model.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Tests: NoteSlot type guard, addNote/setNoteOffset store actions,
//        persistence schema roundtrip, SESSION_SCHEMA_VERSION = 6.
```

Test cases must include:

- `isNoteSlot` returns true for a valid `NoteSlot` and false for `Chord` and `RestSlot`.
- A serialized `NoteSlot` blob parses correctly via `SavedNoteSlotSchema`.
- An old v5 session blob (chord-only progression) still parses after the schema upgrade (no `NoteSlot` entries, `SavedChordSchema` still valid).
- `SESSION_SCHEMA_VERSION` equals 6.
- `addNote` appends the correct `NoteSlot` structure to the store state (test via `get(sessionStore).harmony.progression`).
- `setNoteOffset` (or equivalent) mutates the correct slot and leaves others unchanged.

**Commit:** `feat(model): Phase 01 step 01.2 — NoteSlot type, persistence schema v6, store actions`

**Acceptance criteria:**

- A-01-05: `NoteSlot` interface exists in `src/state/session.ts` with `isNote: true` discriminant and a pitch field matching the OD-1 resolution.
- A-01-06: `ProgressionSlot = Chord | RestSlot | NoteSlot` — TypeScript compiles clean (`tsc --noEmit`) with no type errors.
- A-01-07: `isNoteSlot` guard function exists and is exported from `src/state/session.ts`.
- A-01-08: `addNote` and `setNoteOffset` (or equivalent) store actions exist and are exported.
- A-01-09: Every exhaustive branch listed in the inventory's audit has a `NoteSlot` arm — verified by reading each modified file.
- A-01-10: `SESSION_SCHEMA_VERSION = 6` in `src/lib/persistence.ts`.
- A-01-11: `SavedNoteSlotSchema` exists, `isNote: z.literal(true)` is the discriminant, and it appears in the `progression` union.
- A-01-12: A v5 session blob (chord-only) still parses correctly after the schema change — test passes.
- A-01-13: `pnpm test` passes clean; new test file `tests/note-placement/note-slot-model.test.ts` contains at least 6 test cases and all pass.
- A-01-14: `pnpm exec tsc --noEmit` passes clean.

---

## Step 01.3 — Codegen branch for `NoteSlot`

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, `docs/note-placement/phases/phase-01.md`, and `docs/note-placement/inventories/phase-01-inventory.md` before editing. Add a `NoteSlot` codegen branch to `src/core/codegen/strudel.ts`. The `HarmonySlotInput` local union must gain a `NoteSlot`-compatible arm. The `melodyLine` function must emit a `note("…")` segment for a `NoteSlot` in the `arrange()` path; the presence of any `NoteSlot` forces `arrange()`. Add codegen unit tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)
4. `docs/note-placement/inventories/phase-01-inventory.md` (HarmonySlotInput analysis, OD-1 resolution)
5. `src/core/codegen/strudel.ts` (full — HarmonySlotInput, melodyLine, chordToStrudel)
6. `src/state/session.ts` lines 230–310 (NoteSlot definition from step 01.2, HarmonyState.octave)
7. `src/core/theory/pitch.ts` (NOTE_NAMES — needed to construct the note name string)

**What to produce:**

**`src/core/codegen/strudel.ts`** — extend `HarmonySlotInput`:

```typescript
type HarmonySlotInput =
  | ({ rootPc: number; qual: Quality; gain?: number | null; bars?: number } & ChordAttrs)
  | { isRest: true; bars?: number }
  | { isNote: true; bars?: number /* + pitch field matching OD-1 resolution */ };
```

Extend the `uniformDuration` guard and `uniformAttrs` guard in `melodyLine` so that the presence of any `NoteSlot` forces the `arrange()` path (a `NoteSlot` is never uniform with chord slots):

```typescript
const hasNoteSlot = progression.some((slot) => 'isNote' in slot);
// Force arrange() when any NoteSlot is present.
if (uniformDuration && uniformAttrs && !hasNoteSlot) {
  // existing slowcat path — unchanged
}
```

In the `arrange()` segment builder, add the `NoteSlot` branch after the `isRest` branch:

```typescript
if ('isNote' in slot) {
  // Derive the note name from the slot's pitch field + HarmonyState.octave context.
  // Option A: noteName = NOTE_NAMES[slot.rootPc] + (octave + slot.octaveOffset)
  // Option B: noteName = midiToNoteName(slot.midiNote)  [helper needed]
  // Option C: noteName = slot.noteName
  const noteName = /* derived per OD-1 resolution */;
  const slowStr = numCycles !== 1 ? `.slow(${numCycles})` : '';
  return `  [${numCycles}, note("${noteName}")${slowStr}]`;
}
```

The generated Strudel segment for a `NoteSlot` must be:

- `[1, note("C4")]` — for a 1-bar slot with pitch C4, no octave shift.
- `[2, note("F#3").slow(2)]` — for a 2-bar slot with pitch F#3.
- The note name must be in scientific notation using sharp spelling (e.g., `"C#4"` not `"Db4"`), consistent with `NOTE_NAMES` from `src/core/theory/pitch.ts`.

The `melodyLine` function signature gains the `octave: number` parameter it already has (no change to the external API); the `NoteSlot` branch reads it to compute note names for Option A.

**No change to `chordToStrudel`** — it only handles full chords; `NoteSlot` codegen lives entirely in `melodyLine`.

**Tests** — create `tests/note-placement/codegen-note.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Tests: melodyLine NoteSlot codegen — note name output, arrange() forcing,
//        mixed chord+note progressions, bars != 1 with .slow().
```

Test cases must include:

- A progression with a single `NoteSlot` (rootPc=0 / octave=4, Option A) produces `arrange(\n  [1, note("C4")]\n)`.
- A `NoteSlot` with `bars=2` produces `[2, note("C4").slow(2)]`.
- A mixed progression `[Chord, NoteSlot]` forces `arrange()` (not slowcat).
- A mixed `[NoteSlot, RestSlot]` progression produces correct `arrange()` output with both `note(…)` and `silence` segments.
- A chord-only progression (no `NoteSlot`) is NOT affected — existing slowcat output is byte-identical (regression guard).
- The generated note name matches `NOTE_NAMES[rootPc] + (octave + octaveOffset)` for Option A, or the correct derivation for Options B/C.

**Commit:** `feat(codegen): Phase 01 step 01.3 — NoteSlot codegen branch in melodyLine`

**Acceptance criteria:**

- A-01-15: `HarmonySlotInput` in `strudel.ts` includes a `NoteSlot`-compatible arm.
- A-01-16: `melodyLine` forces `arrange()` whenever any slot has `isNote: true`.
- A-01-17: The `NoteSlot` segment in `arrange()` output is `[N, note("<noteName>")]` (with `.slow(N)` when N ≠ 1).
- A-01-18: Generated note names use sharp spelling consistent with `NOTE_NAMES`.
- A-01-19: Existing chord-only `melodyLine` output is byte-identical to pre-phase output — verified by the regression test.
- A-01-20: `pnpm exec vitest run codegen-note` passes with at least 6 test cases.
- A-01-21: `pnpm exec tsc --noEmit` passes clean.

---

## Step 01.4 — Tonnetz vertex → note pick

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, `docs/note-placement/phases/phase-01.md`, and `docs/note-placement/inventories/phase-01-inventory.md` before editing. Add a note-mode toggle to `HarmonyState`, wire a new `pickNote` path in `src/render/tonnetz-scene.ts` that calls `addNote` when the session is in note mode, and add a UI affordance (a toggle button in the relevant Svelte component) to switch between chord mode and note mode. Existing chord-pick behavior is unchanged in chord mode. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)
4. `docs/note-placement/inventories/phase-01-inventory.md` (OD-2 resolution, tonnetz interaction model)
5. `src/state/session.ts` lines 240–400 (HarmonyState, addNote action, ProgressionSlot)
6. `src/render/tonnetz-scene.ts` lines 440–560 (onStagePointerDown, pickChord — the dispatch path to extend)
7. `src/ui/HarmonyPanel.svelte` OR the component that renders the Tonnetz subview controls — read in full to find where to add the mode toggle
8. `src/core/theory/pitch.ts` (NOTE_NAMES — used by pickNote to display the chosen pitch class)

**What to produce:**

**`src/state/session.ts`** — add `noteMode: boolean` to `HarmonyState`:

```typescript
/**
 * When true, Tonnetz clicks add a NoteSlot instead of a Chord.
 * EPHEMERAL — not persisted, not in agent schema.
 * Default: false (chord mode, preserves existing behavior on load).
 */
noteMode: boolean;
```

Add a `setNoteMode(on: boolean): void` store action that toggles `noteMode` and emits no audio change.

Initialize `noteMode: false` in the default state.

**`src/render/tonnetz-scene.ts`** — extend `onStagePointerDown` to branch on `noteMode`:

```typescript
export function onStagePointerDown(e: PointerEvent): void {
  const localX = e.offsetX;
  const localY = e.offsetY;
  const state = get(sessionStore);

  for (const tri of _renderTris) {
    if (pointInTri(localX, localY, tri)) {
      if (state.harmony.noteMode) {
        pickNote(tri.rootPc);   // new path
      } else {
        pickChord(tri, state);  // unchanged path
      }
      return;
    }
  }
}
```

Add a `pickNote` function (module-internal, not exported):

```typescript
function pickNote(rootPc: number): void {
  addNote(rootPc);
  // No voice-leading computation, no _lastPick, no click-pulse on the triangle.
}
```

Import `addNote` from `../state/session.js`.

**UI toggle** — in the component that hosts the Tonnetz subview controls (identify the exact file by reading the component tree; likely `src/ui/HarmonyPanel.svelte` or similar): add a small toggle button that calls `setNoteMode`. The button label must clearly indicate the current mode (e.g., "Chord" / "Note"). When `noteMode` is true the button appears in an active/pressed state using existing CSS conventions. No new CSS files.

**Tests** — note-mode is a UI interaction; no pure-engine unit tests apply here. The Dev must add a note in the handoff confirming: (a) clicking a Tonnetz vertex in chord mode still calls `pickChord` (behavior unchanged), and (b) clicking in note mode calls `addNote` with the correct `rootPc`.

**Commit:** `feat(interaction): Phase 01 step 01.4 — Tonnetz note-mode pick, setNoteMode action`

**Acceptance criteria:**

- A-01-22: `HarmonyState.noteMode: boolean` exists with default `false` and is EPHEMERAL (absent from `SavedHarmonySchema` and `AgentOutputSchema`).
- A-01-23: `setNoteMode` store action exists and is exported.
- A-01-24: `onStagePointerDown` in tonnetz-scene.ts branches on `noteMode`; existing chord-pick path is unchanged.
- A-01-25: A UI toggle exists that lets the user switch between chord and note mode; it is visually distinct (active state) when note mode is on.
- A-01-26: `pnpm exec tsc --noEmit` passes clean.
- A-01-27: `pnpm lint` passes clean.
- A-01-28: Handoff contains parity note confirming chord-mode click behavior is unchanged.

---

## Step 01.5 — Pentagrama slot paint for `NoteSlot`

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, `docs/note-placement/phases/phase-01.md`, and `docs/note-placement/inventories/phase-01-inventory.md` before editing. Add a `pNote` rendering branch to `src/render/pentagrama-scene.ts` that paints a single note-head on the staff at the correct vertical position derived from the slot's pitch. Add an inline pitch-offset control to the slot hover state so the user can shift the note's pitch. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)
4. `docs/note-placement/inventories/phase-01-inventory.md` (pentagrama slot-paint branches, OD-2 resolution)
5. `src/render/pentagrama-scene.ts` (full — all existing paint branches, interaction model, slotX/slotW/ny/m2p helpers)
6. `src/state/session.ts` lines 230–420 (NoteSlot, setNoteOffset action, HarmonyState.octave)
7. `src/core/theory/pitch.ts` (NOTE_NAMES)

**What to produce:**

**`src/render/pentagrama-scene.ts`** — add a `pNote` paint function modeled after the existing `pChord`/`pArp`/`pRest` functions:

- Compute the note name from the slot's pitch field + `state.harmony.octave` context (matching the codegen derivation exactly).
- Derive the MIDI value via `noteNameToMidi(noteName)` (already present in the module).
- Derive the staff position via `m2p(midi)` (already present in the module).
- Paint a filled circle (note-head) at `{ x: slotX + slotW/2, y: ny(pos, H, ls) }` using `OR` (onset-circle radius, = 4.5, already defined as a constant).
- Use the accent color `#8aa0ff` (from CLAUDE.md §guardrails tonal-function colors — `accent`) for the note-head, to visually distinguish it from chord-mode slot paint (which uses tonal-function colors tonic/subdominant/dominant).
- If the slot is active (the playhead is over it), apply the same isAct pulse pattern as the other slot types.
- Add a ledger line when the note falls above or below the five staff lines (if `|pos| > 5`; a single ledger line suffices for this phase).

In the main `paint(ts)` loop, add the dispatch to `pNote` after the `pRest` branch. The pattern must be exhaustive — add a TypeScript `never` check for any unrecognized slot type.

**Pitch-offset control** — when a `NoteSlot` is hovered, add a `+`/`-` button overlay (or an inline `<input type="number">`) rendered on the canvas element (as a DOM overlay, not a PIXI object — consistent with existing Pentagrama interaction pattern) that calls `setNoteOffset(idx, offset ± 1)`. The control must be within the slot's bounding box as defined by `slotX`/`slotW`. The exact DOM approach (absolute-positioned `<div>`) is left to the Dev, but must not use any PIXI primitives.

**Tests** — render-layer code is not unit-testable in Vitest. The Dev must include a parity note in the handoff describing: (a) the note-head vertical position for a known test case (e.g., C4 on a standard treble staff), (b) that the existing chord/arp/rest paint branches are unchanged (no regression).

**Commit:** `feat(render): Phase 01 step 01.5 — pNote paint branch, pitch-offset control`

**Acceptance criteria:**

- A-01-29: `pNote` paint function exists in `pentagrama-scene.ts`; it uses `m2p` + `noteNameToMidi` to place the note-head vertically.
- A-01-30: The note-head is painted in accent color `#8aa0ff`.
- A-01-31: The `paint()` loop slot dispatch is exhaustive (TypeScript `never` check on unrecognized variant).
- A-01-32: A pitch-offset DOM control appears on hover for `NoteSlot` slots and calls `setNoteOffset`.
- A-01-33: Existing chord/arp/rest paint branches are unchanged — handoff parity note confirms this.
- A-01-34: `pnpm exec tsc --noEmit` passes clean.
- A-01-35: `pnpm lint` passes clean.

---

## Step 01.6 — Quality gate

PROMPT → Read `CLAUDE.md`, `docs/note-placement/decisions.md`, and `docs/note-placement/phases/phase-01.md` before doing anything else. Run the full quality gate in order: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. Report exact output for each command. Confirm total test count is above 2020 (the `authentic-groove` baseline). If any command fails, fix the issue and re-run before reporting. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/note-placement/decisions.md`
3. `docs/note-placement/phases/phase-01.md` (this file)

**What to produce:**

Run each command and capture output:

1. `pnpm test` — must exit 0; report test count (must be > 2020).
2. `pnpm exec tsc --noEmit` — must exit 0 with no errors.
3. `pnpm lint` — must exit 0 with no errors or warnings.
4. `pnpm build` — must exit 0.

If any command fails: diagnose the root cause, apply a targeted fix (do NOT refactor unrelated code), re-run the failing command, and report both the original failure and the fix.

**What to produce:**

In the handoff entry, include:

- The exact final output of each command (last 10 lines or the summary line is sufficient for passing commands).
- The total test count from `pnpm test` output.
- Confirmation that test count is strictly greater than 2020.
- If fixes were needed: the file(s) changed and the nature of the fix (one sentence each).

**Commit:** `chore(quality): Phase 01 step 01.6 — quality gate: all checks pass`

**Acceptance criteria:**

- A-01-36: `pnpm test` exits 0.
- A-01-37: Test count is strictly greater than 2020.
- A-01-38: `pnpm exec tsc --noEmit` exits 0.
- A-01-39: `pnpm lint` exits 0.
- A-01-40: `pnpm build` exits 0.
- A-01-41: Handoff includes exact test count and confirmation it exceeds the 2020 baseline.

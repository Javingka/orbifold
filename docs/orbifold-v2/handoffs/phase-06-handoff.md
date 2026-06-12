# Phase 06 Handoff — Rests in the harmony progression

---

## Step 06.1 — Inventory

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(harmony): Phase 06 step 06.1 — phase-06 inventory`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/handoffs/phase-05-handoff.md` (phase completion entry), `docs/orbifold-v2/phases/phase-06.md`.
- Read all source files named in step 06.1 PROMPT:
  - `src/state/session.ts` (complete — 1253 lines)
  - `src/core/codegen/strudel.ts` (complete — 161 lines)
  - `src/lib/persistence.ts` (complete — 271 lines)
  - `src/agent/schema.ts` (complete — 158 lines)
  - `src/agent/apply.ts` (complete — 186 lines)
  - `src/core/harmony/voice-tracks.ts` (complete — 153 lines)
  - `src/ui/ProgressionStrip.svelte` lines 1–200 (structure and reactive state)
  - `src/core/composition/model.ts` lines 70–100 (`silence` keyword and `arrange()` pattern)
- Confirmed test count: 307 passing (11 test files) — matches Phase 05 completion entry.
- Produced `docs/orbifold-v2/inventories/phase-06-inventory.md`.
- No source code written.

### Key confirmed values

| Item | Value | Source |
|---|---|---|
| `Chord` fields | `rootPc`, `qual`, `gain`, `cx?`, `cy?`, `bars?` | `session.ts:130–143` |
| `HarmonyState.progression` type | `Chord[]` | `session.ts:154` |
| Store actions touching `progression` | `clearChordAt`, `setChordBars`, `clearProgression`, `applyLoadedSession` | `session.ts:746–755, 771–781, 727–733, 1116–1164` |
| `deriveLiveCode` `source==='chord'` branch | reads last chord, calls `chordToStrudel` — no rest guard | `session.ts:456–461` |
| `requeueLive` `source==='chord'` branch | reads last chord, calls `chordToStrudel` — no rest guard | `session.ts:502–510` |
| `melodyLine` dual-mode condition | `progression.every((ch) => (ch.bars ?? 1) === 1)` | `strudel.ts:87` |
| slowcat form (uniform) | `note("<…>").s("sawtooth").lpf(1200).gain("<…>").room(0.3)` | `strudel.ts:89–95` |
| `arrange()` form segment format | `` `  [${numCycles}, note("[${voicing}]").s("sawtooth").lpf(1200).gain(${g}).room(0.3)]` `` | `strudel.ts:99–104` |
| `buildSession` progression param type | anonymous chord-structural type `ReadonlyArray<{ rootPc, qual, gain?, bars? }>` | `strudel.ts:142–147` |
| `silence` keyword format in `composition/model.ts` | `` `  [${tb - sum}, silence]` `` (two leading spaces, no quotes around `silence`) | `model.ts:94` |
| `SESSION_SCHEMA_VERSION` | `1` | `persistence.ts:10` |
| `SavedChordSchema` fields | `rootPc`, `qual`, `gain`, `bars?` | `persistence.ts:29–34` |
| `SavedHarmonySchema.progression` type | `z.array(SavedChordSchema).max(16)` | `persistence.ts:40` |
| `SCHEMA_VERSION` (agent) | `1` | `schema.ts:13` |
| `HarmonyChordSchema` | `z.object({ root, quality, gain?, bars? })` | `schema.ts:103–109` |
| `HarmonySpecSchema.progression` | `z.array(HarmonyChordSchema).min(1).max(8).optional()` | `schema.ts:123` |
| `applyHarmonySpec` — rest slot silent-omission risk | `noteToPc(c.root)` called unconditionally → rest with no `root` silently skipped | `apply.ts:144–145` |
| Phase 06 extension points in `voice-tracks.ts` | 4 locations confirmed (lines 4–6, 18–19, 43–45, 79–80) | `voice-tracks.ts` |
| `VoiceEvent` interface | `chordIndex`, `noteName`, `octave`, `bars`, `startCycle` | `voice-tracks.ts:21–27` |
| `VoiceTrack.events` type | `VoiceEvent[]` | `voice-tracks.ts:31` |
| `computeVoiceTracks` signature | `(progression: ChordInput[], octave: number): VoiceTrack[]` | `voice-tracks.ts:85` |
| `PX_PER_CYCLE` in ProgressionStrip | `48` (line 98) — matches `time-map.ts` per vigent rule | `ProgressionStrip.svelte:98` |
| `totalBars` reactive statement | uses `resizeBars[i] ?? c.bars ?? 1` — works for `RestSlot` unchanged | `ProgressionStrip.svelte:180–183` |
| Current test count | 307 | `pnpm exec vitest run` |

### Critical notes for subsequent steps

**Step 06.3 (`session.ts`, `strudel.ts`, `voice-tracks.ts`):**
1. `deriveLiveCode` and `requeueLive` both have `source === 'chord'` branches that access `ch.rootPc`, `ch.qual`, `ch.gain` without a rest guard. Both must add `if (!ch || 'isRest' in ch) return null` before calling `chordToStrudel`.
2. The local `HarmonySlotInput` union in `strudel.ts` must NOT be exported (avoids pulling `session.ts` Svelte-transitive deps into a pure-engine module — CLAUDE.md invariant).
3. `computeVoiceTracks`: existing callers pass `ChordInput[]` which is assignable to `(ChordInput | RestInput)[]` — no callers require updates.
4. `setChordBars` uses `{ ...slot, bars: clamped }` spread — works for `RestSlot` without changes since both have `bars?`.
5. `applyLoadedSession` in `session.ts` (lines 1145–1150) also rebuilds `progression` from saved data and must handle `isRest` slots after the persistence schema changes in step 06.4.

**Step 06.4 (`persistence.ts`, `schema.ts`, `apply.ts`):**
1. `SESSION_SCHEMA_VERSION` stays at `1` (ADR 0012 D4 — additive union, no migration needed).
2. Agent `SCHEMA_VERSION` bumps from `1` to `2` (per existing annotation at `schema.ts:12`).
3. Rest schema must be listed FIRST in both `SavedHarmonySchema` and `HarmonySpecSchema` unions — ensures `{ isRest: true, ... }` always parses as rest regardless of additional fields.

**Step 06.5 (`ProgressionStrip.svelte`):**
1. `handlePointerDown` reads `progression[i]?.gain` outside the lines-1–200 window. Must add an early return `if ('isRest' in ch) return;` to prevent gain-drag gestures on rest segments.
2. The `totalBars` reactive statement requires no changes — works for both `Chord` and `RestSlot`.

### Zod union ordering rationale (open question resolved)

Per ADR 0012 D4 (documented in inventory §10): listing the rest schema first in `z.union([SavedRestSchema, SavedChordSchema])` is correct and desired. An entry with `isRest: true` will always parse as a rest (chord fields ignored). A chord-only entry `{ rootPc, qual, gain }` fails `SavedRestSchema` (no `isRest: z.literal(true)` field) and falls through to `SavedChordSchema` successfully. Old sessions (version 1, chord-only) parse correctly because no element has `isRest: true`.

### Files touched

- `docs/orbifold-v2/inventories/phase-06-inventory.md` — created
- `docs/orbifold-v2/handoffs/phase-06-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations

No source code written; no build/test/lint runs required for this step. Test count confirmed: 307 passing (run: `pnpm exec vitest run`).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns `'arrange(\n  [2, silence]\n)'` | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` emits `arrange()` with `[1, silence]` at rest position | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-03 | Chord-only progression all `bars === 1` still emits slowcat `<…>` (regression guard) | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` → `VoiceRestEvent` at slotIndex 1; A min uses perm `[1,2,0]` (same as direct C maj → A min) | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-05 | Session with rest slot round-trips through serialize → JSON → parse → deserialize | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-06 | Version-1 session JSON (chord-only) parses against updated `SavedSessionSchema` | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-07 | Agent payload with mixed progression validates; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | `tests/schema.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | `schema.ts` | proxy:static-analysis | not covered — deferred to step 06.4 |
| A-06-09 | Rest slots render as grey segments; chord slot rendering unchanged | `ProgressionStrip.svelte` | manual | not covered — deferred to step 06.5 |
| A-06-10 | "+ rest" button appends `RestSlot`; playing harmony with rest produces silence; Strudel drawer shows `silence` | `ProgressionStrip.svelte` + store | live-system | not covered — deferred to step 06.5 |
| A-06-11 | `tsc 0`, `lint 0`, `pnpm test ≥ 325`, `pnpm build 0` | all | automated | not covered — deferred to step 06.5 |

### Decisions made (if any)

None — inventory step only. All five Phase 06 design decisions (D1–D5) are pre-locked by the Pilot per the phase spec; ADR 0012 records them in step 06.2.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 307 tests passing (unchanged from Phase 05 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.

### Next-step context

Step 06.2 writes `docs/adr/0012-rest-data-model.md` — a recording ADR (Status: Accepted, Date: 2026-06-11) for the five locked design decisions (D1–D5). No deliberation required; the spec text in the phase file provides the exact content verbatim (including Consequences section with 6 downstream impacts).

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Pilot approval required before step 06.2, reason: step 06.2 is Pilot Checkpoint #2 (ADR authoring — all five D1–D5 decisions must be locked by Pilot before Dev writes ADR 0012).

---

## Step 06.2 — ADR 0012: rest data model + Strudel silence codegen

**Date:** 2026-06-11
**Commit(s):**

- **Terminal commit:** `docs(adr): Phase 06 step 06.2 — ADR 0012 rest data model and silence codegen`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `docs/adr/0010-variable-chord-duration.md`, `docs/adr/0011-harmony-view-architecture.md`.
- Wrote `docs/adr/0012-rest-data-model.md` — Status: Accepted, Date: 2026-06-11, Deciders: Pilot (Javier).
- Five decisions recorded: D1 (`RestSlot` discriminated union), D2 (`arrange()` forced by any rest), D3 (`[bars, silence]` segment format), D4 (no session version bump; agent `SCHEMA_VERSION` → 2), D5 ("Add Rest" button in ProgressionStrip).
- Consequences section records all six downstream implementation impacts (session.ts, strudel.ts, voice-tracks.ts, persistence.ts, schema.ts, apply.ts).
- No source code written.

### Files touched

- `docs/adr/0012-rest-data-model.md` — created
- `docs/orbifold-v2/handoffs/phase-06-handoff.md` — this file (step 06.2 entry appended)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are directly covered by this step (ADR authoring step only — no source code written). ADR 0012 defines the contracts that steps 06.3–06.5 will implement and test.

### Routine validations

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns `'arrange(\n  [2, silence]\n)'` | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` emits `arrange()` with `[1, silence]` at rest position | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-03 | Chord-only progression all `bars === 1` still emits slowcat `<…>` (regression guard) | `tests/codegen.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` → `VoiceRestEvent` at slotIndex 1; A min uses perm `[1,2,0]` (same as direct C maj → A min) | `tests/harmony/voice-tracks.test.ts` | unit | not covered — deferred to step 06.3 |
| A-06-05 | Session with rest slot round-trips through serialize → JSON → parse → deserialize | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-06 | Version-1 session JSON (chord-only) parses against updated `SavedSessionSchema` | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-07 | Agent payload with mixed progression validates; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | `tests/schema.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | `src/agent/schema.ts` | proxy:static-analysis | not covered — deferred to step 06.4 |
| A-06-09 | Rest slots render as grey segments; chord slot rendering unchanged | `src/ui/ProgressionStrip.svelte` | manual | not covered — deferred to step 06.5 |
| A-06-10 | "+ rest" button appends `RestSlot`; playing harmony with rest produces silence; Strudel drawer shows `silence` | `src/ui/ProgressionStrip.svelte` + store | live-system | not covered — deferred to step 06.5 |
| A-06-11 | `tsc 0`, `lint 0`, `pnpm test ≥ 325`, `pnpm build 0` | all | automated | not covered — deferred to step 06.5 |

**Notes on partial coverage:** This step is a documentation-only step (ADR authoring). All eleven Acceptance IDs are deferred to their respective implementation steps (06.3, 06.4, 06.5).

**Proxy disclosures:** A-06-08 uses `proxy:static-analysis` — the value `SCHEMA_VERSION = 2` will be verified by reading `src/agent/schema.ts` line 13 after step 06.4 implementation.

### Decisions made (if any)

None — all five decisions (D1–D5) are pre-locked by the Pilot per the phase spec. This step records them verbatim.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 307 tests passing (unchanged from Phase 05 close and step 06.1).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged).
- No source code changed.
- `docs/adr/0012-rest-data-model.md` committed.

### Next-step context

Step 06.3 implements `RestSlot` and `ProgressionSlot` in `session.ts`, updates `melodyLine()` and `buildSession()` in `strudel.ts`, and adds `VoiceRestEvent` + rest branch in `voice-tracks.ts`. All three files have extension points explicitly marked in their Phase 06 comments (confirmed in inventory §7). Callers of `computeVoiceTracks` and `melodyLine` pass chord-only arrays today; the widened `(ChordInput | RestInput)[]` / `ReadonlyArray<HarmonySlotInput>` types maintain subtype compatibility — no callers require updating.

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 06.3

---

## Step 06.3 — Data model, codegen, and voice-tracks

**Date:** 2026-06-11
**Commit(s):**

- `feat(harmony): Phase 06 step 06.3 — RestSlot data model, silence codegen, voice-tracks gap events`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0012-rest-data-model.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `src/state/session.ts` (complete), `src/core/codegen/strudel.ts` (complete), `src/core/harmony/voice-tracks.ts` (complete).

**`src/state/session.ts` changes:**
- Added `RestSlot` interface (`isRest: true; bars?: number`) and `ProgressionSlot = Chord | RestSlot` union type, both exported.
- Changed `HarmonyState.progression` from `Chord[]` to `ProgressionSlot[]`.
- Added `appendRest()` and `addRestAt(index)` exported store actions. `appendRest` delegates to `addRestAt(progression.length)`. `addRestAt` clamps index to `[0, progression.length]`, splices `{ isRest: true as const, bars: 1 }`, and calls `requeueLive()`.
- Guarded `deriveLiveCode` source === 'chord' branch: `if (!ch || 'isRest' in ch) return null` before `chordToStrudel` call.
- Guarded `requeueLive` source === 'chord' branch: same guard.
- Fixed cascading type errors in `src/agent/agent.ts` (progression description map), `src/lib/persistence.ts` (serialize skips rest slots with `flatMap`; step 06.4 will add `SavedRestSchema`), `src/render/tonnetz-scene.ts` (four locations: `findRenderTriForChord` calls and `prevProg` voice-leading block guarded with `'isRest' in` checks).

**`src/core/codegen/strudel.ts` changes:**
- Added local `HarmonySlotInput` union type (NOT exported — pure engine invariant).
- Updated `melodyLine()` signature to `ReadonlyArray<HarmonySlotInput>`.
- Updated dual-mode condition (ADR 0012 D2): rest slot forces `arrange()` path.
- Updated `arrange()` segment map (ADR 0012 D3): rest slot emits `  [${bars}, silence]`.
- Updated `buildSession()` progression parameter type to `ReadonlyArray<HarmonySlotInput>`.

**`src/core/harmony/voice-tracks.ts` changes:**
- Added `VoiceRestEvent` exported interface: `{ isRest: true; slotIndex: number; bars: number; startCycle: number }`.
- Changed `VoiceTrack.events` from `VoiceEvent[]` to `(VoiceEvent | VoiceRestEvent)[]`.
- Added local `RestInput` interface alongside `ChordInput`.
- Changed `computeVoiceTracks` signature to `(ChordInput | RestInput)[]`.
- Added rest branch in main loop: appends `VoiceRestEvent` to all three tracks; `prevPcs` NOT updated (ADR 0012 Consequence 3). The "first chord" detection uses `prevPcs === null` sentinel which correctly handles leading rest slots.

**Tests added:**
- `tests/codegen.test.ts`: 6 new tests in `describe('melodyLine — rest-slot codegen (ADR 0012)')` covering A-06-01, A-06-02, A-06-03 and variants.
- `tests/harmony/voice-tracks.test.ts`: 4 new tests in `describe('computeVoiceTracks — rest slot (Phase 06, ADR 0012)')` covering single rest, chord+rest, A-06-04 (prevPcs invariant), and startCycle accumulation.

### Files touched

- `src/state/session.ts` — modified (RestSlot, ProgressionSlot, appendRest, addRestAt, deriveLiveCode/requeueLive guards)
- `src/core/codegen/strudel.ts` — modified (HarmonySlotInput, melodyLine, buildSession)
- `src/core/harmony/voice-tracks.ts` — modified (VoiceRestEvent, RestInput, VoiceTrack, computeVoiceTracks)
- `src/agent/agent.ts` — modified (progression description map for rest slots)
- `src/lib/persistence.ts` — modified (flatMap guard to skip rest slots; full rest support deferred to step 06.4)
- `src/render/tonnetz-scene.ts` — modified (four 'isRest' in guards)
- `tests/codegen.test.ts` — extended (6 new rest-slot tests)
- `tests/harmony/voice-tracks.test.ts` — extended (4 new rest-slot tests)
- `docs/orbifold-v2/handoffs/phase-06-handoff.md` — this file (step 06.3 entry appended)
- `docs/orbifold-v2/phases/phase-06.md` — added to commit (first appearance)

### Validation evidence (per Acceptance ID)

| Acceptance ID | Test / Check | Result |
|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` exact string | PASS — `'arrange(\n  [2, silence]\n)'` |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` exact arrange() form | PASS — exact string matches spec |
| A-06-03 | Chord-only progression all bars===1 still emits slowcat (regression guard) | PASS |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` — rest does not affect prevPcs | PASS — voice-0=C4, voice-1=E4, voice-2=A3 same as direct transition |

### Routine validations

```
pnpm exec tsc --noEmit   → 0 errors
pnpm lint                → 0 errors (eslint + prettier)
pnpm exec vitest run tests/codegen.test.ts            → 39 tests pass
pnpm exec vitest run tests/harmony/voice-tracks.test.ts → 18 tests pass
pnpm test                → 317 tests pass (11 test files)
grep no pixi/svelte/DOM imports in pure engine files  → 0 matches
```

Test count: 317 (was 307; +10 new tests, spec required ≥ 314).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns `'arrange(\n  [2, silence]\n)'` | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` emits `arrange()` with `[1, silence]` at rest position | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-03 | Chord-only progression all `bars === 1` still emits slowcat `<…>` (regression guard) | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` → `VoiceRestEvent` at slotIndex 1; A min uses perm `[1,2,0]` (same as direct C maj → A min) | `tests/harmony/voice-tracks.test.ts` | unit | COVERED — step 06.3 |
| A-06-05 | Session with rest slot round-trips through serialize → JSON → parse → deserialize | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-06 | Version-1 session JSON (chord-only) parses against updated `SavedSessionSchema` | `tests/persistence.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-07 | Agent payload with mixed progression validates; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | `tests/schema.test.ts` | unit | not covered — deferred to step 06.4 |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | `src/agent/schema.ts` | proxy:static-analysis | not covered — deferred to step 06.4 |
| A-06-09 | Rest slots render as grey segments; chord slot rendering unchanged | `src/ui/ProgressionStrip.svelte` | manual | not covered — deferred to step 06.5 |
| A-06-10 | "+ rest" button appends `RestSlot`; playing harmony with rest produces silence; Strudel drawer shows `silence` | `src/ui/ProgressionStrip.svelte` + store | live-system | not covered — deferred to step 06.5 |
| A-06-11 | `tsc 0`, `lint 0`, `pnpm test ≥ 325`, `pnpm build 0` | all | automated | partial — tsc 0, lint 0, test 317; build and final count deferred to step 06.5 |

### Decisions made (if any)

One scope extension needed: the type change to `HarmonyState.progression: ProgressionSlot[]` caused cascading type errors in `src/agent/agent.ts`, `src/lib/persistence.ts`, and `src/render/tonnetz-scene.ts`. These files are outside step 06.3's listed target files but required minimal guards to satisfy the `tsc --noEmit` 0-errors validation:
- `agent.ts`: maps rest slots to `'–'` in the progression description string.
- `persistence.ts`: uses `flatMap` to skip rest slots in `serializeSession` (step 06.4 will add the full `SavedRestSchema` support; skipping prevents type errors now without data loss for chord-only sessions).
- `tonnetz-scene.ts`: four locations guard with `'isRest' in ch` before calling chord-specific functions.

These are minimal, non-breaking guards — they do not change behavior for chord-only progressions (the only type in use before this step).

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 317 tests passing (+10 from step 06.3).
- `tsc --noEmit` 0 errors.
- `pnpm lint` 0 errors.
- `pnpm build` not run (deferred to step 06.5 quality gate; no structural changes expected to break build).
- `RestSlot`, `ProgressionSlot`, `appendRest`, `addRestAt` exported from `session.ts`.
- `melodyLine()` and `buildSession()` accept rest slots.
- `computeVoiceTracks()` produces `VoiceRestEvent` gap events.

### Next-step context

Step 06.4 implements persistence (`SavedRestSchema`, `SavedHarmonySchema` union update, `serializeSession`/`deserializeSession` rest narrowing), agent schemas (`HarmonyRestSchema`, `SCHEMA_VERSION` bump to 2, `HarmonyChordSchema` union), and `apply.ts` rest detection. The `persistence.ts` `flatMap` guard added in this step will be replaced by the full `SavedRestSchema` logic in step 06.4.

**Planner Review:** APPROVED on 2026-06-11. Iteration: 1 of 5.
**Next action:** Dev proceeds to step 06.4

---

## Step 06.4 — Persistence and agent schemas

**Date:** 2026-06-11
**Commit(s):**

- `feat(harmony): Phase 06 step 06.4 — persistence and agent schemas for rest slots`
  - Hash: self-referential — not recorded

**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, `docs/adr/0012-rest-data-model.md`, `docs/orbifold-v2/inventories/phase-06-inventory.md`, `src/lib/persistence.ts`, `src/agent/schema.ts`, `src/agent/apply.ts`, `src/state/session.ts`, `tests/persistence.test.ts`, `tests/schema.test.ts`.

**`src/lib/persistence.ts` changes (ADR 0012 D4):**
- Added `SavedRestSchema = z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })` after `SavedChordSchema`.
- Changed `SavedHarmonySchema.progression` from `z.array(SavedChordSchema).max(16)` to `z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16)` — rest schema listed first per ADR 0012 D4.
- Updated `serializeSession` `progression.map`: replaced the `flatMap` guard (step 06.3 placeholder) with full rest narrowing — `'isRest' in slot` branch serializes `{ isRest: true, bars? }`.
- Updated `deserializeSession` `progression.map`: same narrowing — `'isRest' in slot` branch returns `{ isRest: true, bars? }` or `{ isRest: true }`.
- `SESSION_SCHEMA_VERSION` stays at `1` (ADR 0012 D4 — additive union, no migration needed).

**`src/state/session.ts` changes:**
- Updated `applyLoadedSession` `progression.map` to narrow on `'isRest' in slot`, returning `ProgressionSlot` for both rest and chord elements. Required because `SavedHarmonySchema.progression` is now typed as the union and TypeScript raised 3 errors on the old `.rootPc`, `.qual`, `.gain` direct accesses.

**`src/agent/schema.ts` changes (ADR 0012 D4):**
- Bumped `SCHEMA_VERSION` from `1` to `2`.
- Added `HarmonyRestSchema = z.object({ isRest: z.literal(true), bars: z.number().min(0.25).max(8).optional() })` with JSDoc.
- Renamed existing `HarmonyChordSchema` object to `HarmonyChordCoreSchema` (unexported).
- Exported `HarmonyChordSchema = z.union([HarmonyRestSchema, HarmonyChordCoreSchema])` — rest schema listed first.
- Updated `HarmonyChord` type alias to `z.infer<typeof HarmonyChordSchema>` (now a discriminated union type).

**`src/agent/apply.ts` changes (ADR 0012 Consequence 6):**
- Imported `RestSlot`, `ProgressionSlot` from `../state/session.js`.
- Updated progression-building loop: `const newProg: ProgressionSlot[] = []`. Added `if ('isRest' in c && c.isRest === true)` branch before calling `noteToPc` — appends `RestSlot` directly, bypassing the silent-omission risk. Narrowed chord-slot property access via type assertions (required because `HarmonyChord` is now a union).

**Tests added:**
- `tests/schema.test.ts`: updated SCHEMA_VERSION test (was `1`, now `2`); added 8 new tests in `describe('HarmonyChordSchema — rest slot union')` and `describe('applyHarmonySpec — rest slot')` covering A-06-07, A-06-08, and rest union validation.
- `tests/persistence.test.ts`: added 4 new tests in `describe('rest-slot persistence')` covering A-06-05, A-06-06, and rest-without-bars round-trip.

### Files touched

- `src/lib/persistence.ts` — modified (SavedRestSchema, union schema, serialize/deserialize rest narrowing)
- `src/agent/schema.ts` — modified (SCHEMA_VERSION→2, HarmonyRestSchema, HarmonyChordSchema union)
- `src/agent/apply.ts` — modified (RestSlot/ProgressionSlot imports, rest detection in applyHarmonySpec loop)
- `src/state/session.ts` — modified (applyLoadedSession progression.map narrowed to ProgressionSlot union)
- `tests/persistence.test.ts` — extended (4 new rest-slot persistence tests)
- `tests/schema.test.ts` — extended (SCHEMA_VERSION updated + 8 new rest-slot schema/apply tests)
- `docs/orbifold-v2/handoffs/phase-06-handoff.md` — this file (step 06.4 entry appended)

### Validation evidence (per Acceptance ID)

| Acceptance ID | Test / Check | Result |
|---|---|---|
| A-06-05 | Rest slot `{ isRest: true, bars: 2 }` round-trips serialize → JSON.stringify → JSON.parse → SavedSessionSchema.safeParse → deserialize | PASS |
| A-06-06 | Version-1 chord-only session JSON parses against updated `SavedSessionSchema` | PASS |
| A-06-07 | Agent payload `[C maj, rest bars:2]` validates via `AgentOutputSchema`; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | PASS |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | PASS — static-analysis confirmed |

### Routine validations

```
pnpm exec tsc --noEmit   → 0 errors
pnpm lint                → 0 errors (eslint + prettier)
pnpm exec vitest run tests/persistence.test.ts  → 31 tests pass
pnpm exec vitest run tests/schema.test.ts       → 41 tests pass
pnpm test                → 329 tests pass (11 test files)
```

Test count: 329 (was 317; +12 new tests, spec required ≥ 324).

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-06-01 | `melodyLine([{ isRest: true, bars: 2 }], 'chord', 3)` returns `'arrange(\n  [2, silence]\n)'` | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-02 | Mixed progression `[C maj, rest 1 bar, F maj]` emits `arrange()` with `[1, silence]` at rest position | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-03 | Chord-only progression all `bars === 1` still emits slowcat `<…>` (regression guard) | `tests/codegen.test.ts` | unit | COVERED — step 06.3 |
| A-06-04 | `computeVoiceTracks([C maj, rest 1 bar, A min], 3)` → `VoiceRestEvent` at slotIndex 1; A min uses perm `[1,2,0]` (same as direct C maj → A min) | `tests/harmony/voice-tracks.test.ts` | unit | COVERED — step 06.3 |
| A-06-05 | Session with rest slot round-trips through serialize → JSON → parse → deserialize | `tests/persistence.test.ts` | unit | COVERED — step 06.4 |
| A-06-06 | Version-1 session JSON (chord-only) parses against updated `SavedSessionSchema` | `tests/persistence.test.ts` | unit | COVERED — step 06.4 |
| A-06-07 | Agent payload with mixed progression validates; `applyHarmonySpec` produces `[Chord, RestSlot]` in store | `tests/schema.test.ts` | unit | COVERED — step 06.4 |
| A-06-08 | `SCHEMA_VERSION` exported from `schema.ts` equals `2` | `tests/schema.test.ts` | unit + proxy:static-analysis | COVERED — step 06.4 |
| A-06-09 | Rest slots render as grey segments; chord slot rendering unchanged | `src/ui/ProgressionStrip.svelte` | manual | not covered — deferred to step 06.5 |
| A-06-10 | "+ rest" button appends `RestSlot`; playing harmony with rest produces silence; Strudel drawer shows `silence` | `src/ui/ProgressionStrip.svelte` + store | live-system | not covered — deferred to step 06.5 |
| A-06-11 | `tsc 0`, `lint 0`, `pnpm test ≥ 325`, `pnpm build 0` | all | automated | partial — tsc 0, lint 0, test 329; build and final count deferred to step 06.5 |

### Decisions made (if any)

One `session.ts` change was required beyond what step 06.4 listed: `applyLoadedSession` needed `progression.map` narrowing because `SavedHarmonySchema.progression` became a union type and TypeScript raised 3 errors on the old direct property accesses. This is a minimal mechanical fix (7 lines) — no behavioral change, no governance impact.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 329 tests passing (+12 from step 06.4).
- `tsc --noEmit` 0 errors.
- `pnpm lint` 0 errors.
- `pnpm build` not run (deferred to step 06.5 quality gate).
- `SavedRestSchema` added to `persistence.ts`; rest slots round-trip correctly.
- Agent `SCHEMA_VERSION = 2`; `HarmonyChordSchema` union accepts rest entries.
- `applyHarmonySpec` correctly creates `RestSlot` objects without silent omission.

### Next-step context

Step 06.5 implements ProgressionStrip rest rendering: import `appendRest`, template narrowing on `'isRest' in ch`, grey rest segment style, "Add Rest" button, and `handlePointerDown` guard. All quality gates (including `pnpm build`) are confirmed at step 06.5.

**Planner Review:** pending
**Next action:** Planner reviews step 06.4

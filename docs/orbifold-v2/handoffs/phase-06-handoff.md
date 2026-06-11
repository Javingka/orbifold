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

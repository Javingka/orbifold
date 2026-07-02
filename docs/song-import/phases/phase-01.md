<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — Song-Import Data Model Foundation: Power Chords and Section Labels

**Purpose:** Extend the vocabulary of Orbifold's data model with two additions needed to represent real songs: a `'pow'` (power chord) quality in the `Quality` enum and an optional `label` field on `Block` for section markers (Intro, Verse, Chorus, etc.), producing the schema foundation that a future `importSession` agent skill will build on.

**Gate:** `note-placement` Phase 01 complete (commit `abf213d`, 2026-07-01), `SESSION_SCHEMA_VERSION = 6`, `SCHEMA_VERSION = 6`; `pnpm test` passes with 2069 tests; `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` pass clean. Open decisions OD-1 and OD-2 (defined in step 01.1) must be resolved by the Pilot before step 01.2 begins.

**Expected phase result:** After this phase `Quality` includes `'pow'`; `chordPcs` and all codegen/render paths handle power chords (root + fifth, no third); `SESSION_SCHEMA_VERSION` is bumped to 7 to account for the extended `SK_QUAL` union; the agent `SCHEMA_VERSION` is bumped to 7 for the same reason; `Block` carries an optional `label?: string` field visible in the Composition timeline; all existing chord/rest/note behavior is byte-identical with non-power-chord input; `pnpm test` count exceeds 2069; all quality-gate commands pass clean.

---

## Architecture constraints for every step

**`Quality` enum exhaustiveness:** `Quality = 'maj' | 'min' | 'dim' | 'aug'` is currently a 4-member union. Adding `'pow'` makes it 5. Every switch or if/else that narrows on `Quality` — especially `QUAL_INTERVALS`, `chordLabel`, `chordPcs`, `chordVoicing`, `chordToStrudel`, the persistence SK_QUAL validator, the agent SK_QUAL validator, and the Tonnetz triangle-paint color logic — must be updated with a `'pow'` arm. A step that leaves any existing quality branch silently untouched is REVISED.

**No third in power chords:** `pow` = `[0, 7]` (root + perfect fifth, no third). `chordPcs` for `pow` returns two pitch classes, not three. Downstream code that assumes `chordPcs` always returns exactly three elements must be audited and defended (the inventory step documents this). Voice-leading for `pow` is defined only over two voices; voice-leading functions that assume three-voice input must be guarded.

**Strudel codegen for power chords:** A power chord with root `R` at octave `O` is best represented as two simultaneous notes: `note("<R_O> <R_O+7semis>")` or as a Strudel chord shorthand if one exists. The exact codegen form is an **open decision (OD-1)** to be resolved in the inventory. The codegen must be unambiguous and playable with the pinned `@strudel/web@1.0.3`.

**Tonnetz rendering for power chords:** The Tonnetz renders major triangles (▲) and minor triangles (▼) based on quality. `'pow'` has no canonical Tonnetz triangle. Rendering of picked `pow` chords in the progression strip and in the Pentagrama is an **open decision (OD-2)** resolved in the inventory. Tonnetz navigation is not affected (power chords are not navigated on the Tonnetz, they are picked by other means in the future import flow).

**Schema version bumps:** Adding `'pow'` to `SK_QUAL` in `src/lib/persistence.ts` and `src/agent/schema.ts` is a breaking change for parsers that use the strict `z.enum([...])` call — old sessions with `'pow'` quality would fail on old parsers, and vice versa. Bump `SESSION_SCHEMA_VERSION` from 6 to 7 and `SCHEMA_VERSION` from 6 to 7 in the same step that adds `'pow'`.

**Block `label` additive:** Adding `label?: string` to `Block` is purely additive. It requires no `SESSION_SCHEMA_VERSION` bump (existing sessions parse cleanly with the new optional field). No `SCHEMA_VERSION` bump for the agent (the agent does not set block labels in Phase 01). The field is persisted and round-tripped in existing save/load paths.

**Core/render boundary:** All pure-engine changes (`chords.ts`, codegen, theory) live in `src/core/**`. Zero DOM/PIXI/Svelte imports in `src/core/**`.

**Byte-identical guarantee (non-`pow` input):** With `pow` quality absent from any session, `chordToStrudel`, `melodyLine`, `buildSession`, `chordVoicing`, and `chordLabel` must produce output byte-identical to their pre-phase behavior for any input that was valid before this phase.

**AGPL-3.0 header:** Every new file created in this phase must open with `// SPDX-License-Identifier: AGPL-3.0-only`.

**Decisions Register (`docs/song-import/decisions.md`):** Required reading every invocation. The Pilot is the only writer.

---

## Step 01.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md` (create this file if absent — it must exist even if empty, for the Register pattern), and `docs/song-import/phases/phase-01.md` (this file) before doing anything else. Then perform a read-only code inventory of the files listed below. Produce `docs/song-import/inventories/phase-01-inventory.md` containing sections (a) through (g) as specified. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md` (create empty if absent)
4. `docs/song-import/phases/phase-01.md` (this file)
5. `src/core/theory/chords.ts` (full — `Quality`, `QUAL_INTERVALS`, `triadQuality`, `chordLabel`, `chordPcs`, `chordVoicing`)
6. `src/core/codegen/strudel.ts` (full — `chordToStrudel`, `melodyLine`, all quality-branching logic)
7. `src/lib/persistence.ts` lines 1–160 (`SK_QUAL`, `SavedChordSchema`, `SESSION_SCHEMA_VERSION`)
8. `src/agent/schema.ts` lines 1–120 (`SK_QUAL`, `SCHEMA_VERSION`, `HarmonyChordCoreSchema`)
9. `src/core/composition/model.ts` (full — `Block` interface)
10. `src/render/tonnetz-scene.ts` lines 1–200 (triangle/quality color mapping — `buildTonnetz`, `paintTonnetz`)

**What to produce:**

`docs/song-import/inventories/phase-01-inventory.md` containing:

- **(a) `Quality` enum** — exact current members; all sites in the codebase where `Quality` is narrowed (switch/if-else on quality value, `QUAL_INTERVALS` key access, `z.enum(SK_QUAL)` validators, codegen branches, Tonnetz paint). Result from `grep -rn "qual\|Quality\|SK_QUAL" src/` restricted to narrowing sites.

- **(b) `chordPcs` and `chordVoicing` output shape** — confirm how many pitch classes each returns for each quality; document whether any downstream caller assumes exactly 3 elements; identify callers by file and line.

- **(c) `Block` interface** — exact current fields; confirm `label` is absent; confirm the persistence schema for `Block` (in `SavedBlockSchema` in `persistence.ts`) and whether it would need a version bump for an optional `label` field.

- **(d) OD-1: Power chord Strudel codegen** — evaluate the following options and state a clear recommendation with rationale:
  - **Option A:** Emit two simultaneous notes as `note("<R_O> <R_O+7semis>")` (e.g., `note("E2 B2")`) — pure Strudel mini-notation, no chord shorthand.
  - **Option B:** Emit a two-element array of notes stacked with `stack()` (e.g., `stack(note("E2"), note("B2"))`) — works but produces two separate patterns.
  - **Option C:** Look up whether `@strudel/web@1.0.3` has a chord shorthand for power chords (e.g., `"E2'5"` or `"E25"`) — consult Strudel docs reference; if found, prefer it; if not confirmed, default to Option A.
  - The recommendation must state which option produces the most Strudel-idiomatic and verifiable output with the pinned version.

- **(e) OD-2: Power chord Tonnetz / Pentagrama rendering** — evaluate:
  - **Option A:** Render `'pow'` chips in the Pentagrama with the `accent` color (`#8aa0ff`) — not tonic/subdominant/dominant (which require a third to compute tonal function) — and skip Tonnetz highlighting entirely.
  - **Option B:** Render `'pow'` using the tonic color (`#f3b15a`) regardless of root (simplest fallback).
  - **Option C:** Compute tonal function from the root pitch class only (ignore the missing third) — may produce misleading colors.
  - State a recommendation; also note whether any Tonnetz paint path would crash or produce a type error if a `'pow'` quality chord appeared in `harmony.progression` (since `pow` has no triangle in the Tonnetz).

- **(f) Exhaustiveness audit** — list every file that narrows on `Quality` values (switch arms, `QUAL_INTERVALS` access, codegen if/else, Zod enum). This is the complete list step 01.2 must update.

- **(g) Schema version analysis** — confirm current `SESSION_SCHEMA_VERSION` and `SCHEMA_VERSION`; confirm that adding `'pow'` to the `z.enum(SK_QUAL)` call is breaking (cannot parse old `pow` sessions with old code and vice versa) and that bumping both to 7 is required.

**Acceptance criteria:**

- A-01-01: `docs/song-import/inventories/phase-01-inventory.md` exists and contains all seven sections (a–g).
- A-01-02: Sections OD-1 and OD-2 each state a recommended option with a one-sentence rationale.
- A-01-03: The inventory was produced by reading only — no source files were modified.
- A-01-04: The exhaustiveness audit (section f) lists all files with `Quality`-narrowing sites found by grep.

CHECKPOINT → Commit message:
`docs(inventory): Phase 01 step 01.1 — read-only inventory, OD-1/OD-2 recommendations`

---

## Step 01.2 — `pow` quality: type, theory, codegen, schema

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-01.md`, and `docs/song-import/inventories/phase-01-inventory.md` before editing. The Pilot has resolved OD-1 (codegen form) and OD-2 (render color). Apply both resolutions exactly. (1) Add `'pow'` to the `Quality` type in `src/core/theory/chords.ts`. (2) Add `[0, 7]` intervals for `'pow'` to `QUAL_INTERVALS`. (3) Update `chordLabel` with a `'pow'` arm. (4) Audit and update every site in the exhaustiveness audit from step 01.1. (5) Update `SK_QUAL` in `src/lib/persistence.ts` and bump `SESSION_SCHEMA_VERSION` to 7. (6) Update `SK_QUAL` in `src/agent/schema.ts` and bump `SCHEMA_VERSION` to 7. (7) Update `chordToStrudel` and `melodyLine` in `src/core/codegen/strudel.ts` with the OD-1-resolved codegen form. (8) Write unit tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-01.md` (this file)
5. `docs/song-import/inventories/phase-01-inventory.md` (full — especially OD-1, OD-2 resolutions and exhaustiveness audit)
6. `src/core/theory/chords.ts` (full)
7. `src/core/codegen/strudel.ts` (full)
8. `src/lib/persistence.ts` (lines 1–100)
9. `src/agent/schema.ts` (lines 1–120)
10. Every file listed in the inventory exhaustiveness audit

**What to produce:**

**`src/core/theory/chords.ts`** — add to `Quality` union:

```typescript
export type Quality = 'maj' | 'min' | 'dim' | 'aug' | 'pow';
```

Add to `QUAL_INTERVALS`:

```typescript
pow: [0, 7],   // root + perfect fifth; no third
```

Update `chordLabel` with a `'pow'` arm:

```typescript
// Power chord label: "E5" convention (root + "5")
export function chordLabel(rootPc: number, qual: Quality): string {
  if (qual === 'pow') return NOTE_NAMES[rootPc] + '5';
  return NOTE_NAMES[rootPc] + (qual === 'min' ? 'm' : qual === 'dim' ? '°' : qual === 'aug' ? '+' : '');
}
```

Update `chordPcs` (if it exists in `chords.ts`) to handle the 2-element interval array for `'pow'`:

- `chordPcs(rootPc, 'pow')` must return `[rootPc, (rootPc + 7) % 12]` — two elements, not three.
- Any caller that destructures exactly three elements from `chordPcs` must be updated with a guard.

Update `chordVoicing` (if it exists in `chords.ts`) to return two voices for `'pow'`, not three.

Add `triadQuality` guard: if the interval structure is `[0, 7]` (two voices), return `'pow'`. If three voices, current logic unchanged.

**`src/core/codegen/strudel.ts`** — add `'pow'` handling:

In `chordToStrudel` (the single-chord Strudel emitter), add a `'pow'` branch using the OD-1-resolved form. Per the phase architecture constraints and the likely Option A recommendation:

```typescript
// Power chord: root + fifth, emitted as two simultaneous notes in mini-notation.
// OD-1 resolution: note("<R_O> <R_O+7semis>") — confirmed with @strudel/web@1.0.3.
if (chord.qual === 'pow') {
  const rootName = NOTE_NAMES[chord.rootPc] + octave;
  const fifthPc = (chord.rootPc + 7) % 12;
  const fifthOctave = chord.rootPc + 7 >= 12 ? octave + 1 : octave;
  const fifthName = NOTE_NAMES[fifthPc] + fifthOctave;
  // Emit: note("<root fifth>").s(...).gain(...) chain
  return `note("${rootName} ${fifthName}")${attrChain}`;
}
```

The exact form depends on OD-1 resolution. If Option A is confirmed, the above template applies. Apply the resolved form exactly.

In `melodyLine`, the `HarmonySlotInput` chord arm already receives the full `{ rootPc, qual, ... }` object; the `chordToStrudel` call handles the `'pow'` branch — no separate `melodyLine` change needed unless the progression arrangement logic branches on quality.

**`src/lib/persistence.ts`** — update `SK_QUAL` and bump version:

```typescript
const SK_QUAL = ['maj', 'min', 'dim', 'aug', 'pow'] as const;
```

Bump:

```typescript
export const SESSION_SCHEMA_VERSION = 7;
```

Update the schema version comment block to document the v7 change: "`SavedChordSchema.qual` accepts `'pow'`; `SESSION_SCHEMA_VERSION` bumped from 6 to 7."

**`src/agent/schema.ts`** — update `SK_QUAL` and bump version:

```typescript
const SK_QUAL = ['maj', 'min', 'dim', 'aug', 'pow'] as const;
```

Bump:

```typescript
export const SCHEMA_VERSION = 7;
```

Update the version comment block to document the v7 change.

**Exhaustiveness audit sites** — update every file from the inventory audit with a `'pow'` arm. Where a TypeScript `never` check applies, add it or update it.

**Tests** — create `tests/song-import/pow-quality.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Tests: 'pow' quality in chordLabel, chordPcs, chordVoicing;
//        Strudel codegen for power chords; persistence schema roundtrip;
//        SESSION_SCHEMA_VERSION = 7; SCHEMA_VERSION = 7.
```

Test cases must include:

- `chordLabel(4, 'pow')` returns `'E5'` (E power chord).
- `chordPcs(0, 'pow')` returns exactly two elements: `[0, 7]`.
- `chordPcs(5, 'pow')` returns `[5, 0]` (F + C, wraps mod 12).
- `chordToStrudel` with `{ rootPc: 4, qual: 'pow', gain: 0.7 }` at octave 2 produces the OD-1-resolved Strudel string (e.g., `note("E2 B2")…`).
- A serialized `{ rootPc: 4, qual: 'pow', gain: 0.7 }` blob parses correctly via `SavedChordSchema`.
- An old v6 session blob (no `'pow'` chords) fails `SESSION_SCHEMA_VERSION = 7` check (z.literal(7)) and is dropped by `safeParse` — confirm graceful degradation.
- `SESSION_SCHEMA_VERSION` equals 7.
- `SCHEMA_VERSION` equals 7.
- Chord-only (non-`pow`) `chordToStrudel` output is byte-identical to pre-phase — regression guard (at least one golden string from existing `tests/codegen.test.ts`).
- `chordLabel` for all four pre-existing qualities (`'maj'`, `'min'`, `'dim'`, `'aug'`) is byte-identical to pre-phase — regression guard.

Update existing test files that assert `SESSION_SCHEMA_VERSION` or `SCHEMA_VERSION` to the new value (6 → 7).

**Commit:**
`feat(model): Phase 01 step 01.2 — pow quality, schema v7, codegen power chord`

**Acceptance criteria:**

- A-01-05: `Quality` type includes `'pow'` and TypeScript compiles clean (`tsc --noEmit`).
- A-01-06: `chordPcs(rootPc, 'pow')` returns exactly two pitch classes (root and fifth mod 12) — unit test covers this.
- A-01-07: `chordLabel(rootPc, 'pow')` returns `<NOTE_NAMES[rootPc]>5` — unit test covers this.
- A-01-08: `chordToStrudel` emits the OD-1-resolved Strudel string for `'pow'` — unit test covers this with a golden string.
- A-01-09: `SESSION_SCHEMA_VERSION = 7` in `src/lib/persistence.ts`.
- A-01-10: `SCHEMA_VERSION = 7` in `src/agent/schema.ts`.
- A-01-11: `SK_QUAL` in both `persistence.ts` and `agent/schema.ts` includes `'pow'`.
- A-01-12: Every exhaustiveness site from the inventory audit has a `'pow'` arm — verified by reading each modified file.
- A-01-13: Non-`pow` `chordToStrudel` output is byte-identical to pre-phase — regression test passes.
- A-01-14: `pnpm test` passes; test file `tests/song-import/pow-quality.test.ts` contains at least 9 test cases and all pass.
- A-01-15: `pnpm exec tsc --noEmit` passes clean.

CHECKPOINT → Commit message:
`feat(model): Phase 01 step 01.2 — pow quality, schema v7, codegen power chord`

---

## Step 01.3 — Block `label` field and Composition timeline display

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-01.md`, and `docs/song-import/inventories/phase-01-inventory.md` before editing. Add optional `label?: string` to the `Block` interface and its persistence schema. Wire the field to display in the Composition timeline. Write tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-01.md` (this file)
5. `docs/song-import/inventories/phase-01-inventory.md` (section c — Block interface and persistence schema)
6. `src/core/composition/model.ts` (full)
7. `src/lib/persistence.ts` lines 160–350 (`SavedBlockSchema`, `serializeSession`, `deserializeSession`)
8. The Svelte component that renders the timeline block chip (identify by reading the component tree; likely `src/ui/Timeline.svelte` or `src/ui/CompositionDrawer.svelte`)

**What to produce:**

**`src/core/composition/model.ts`** — add `label` to `Block`:

```typescript
/**
 * Optional section label for this block (e.g., "Verse", "Chorus", "Bridge").
 * Used to annotate blocks created during song import or manual organization.
 * Ephemeral in the sense that it carries no musical semantics — it is purely
 * organizational metadata. Persisted in the session schema (additive field).
 * Introduced in song-import Phase 01.
 */
label?: string;
```

**`src/lib/persistence.ts`** — add `label` to `SavedBlockSchema`:

```typescript
/** Optional section label — song-import Phase 01. Additive; absent in pre-Phase-01 sessions. */
label: z.string().optional(),
```

No `SESSION_SCHEMA_VERSION` bump — the field is optional and additive; existing sessions parse cleanly.

Confirm that `serializeSession` serializes `block.label` and `deserializeSession` reads it back. If the session is created by `captureGrooveSnapshot` / `captureArmoniaSnapshot` / `captureSesionSnapshot` (agent or UI paths), confirm these paths either carry `label` forward or leave it undefined (both are acceptable — it is organizational metadata, not state that changes with capture).

**Timeline display** — in the Svelte component that renders a block chip in the timeline, add a visible label when `block.label` is non-empty. The label must:

- Appear above or below the `block.name` in the chip, in a smaller font.
- Not overflow the chip width (use CSS `text-overflow: ellipsis; overflow: hidden; white-space: nowrap`).
- Be absent (no empty element rendered) when `block.label` is `undefined` or `''`.
- Use no new i18n keys (the label content is raw text set by the user or the import tool, not a UI string).

No editing UI for `label` is required in Phase 01 — it is set programmatically by the future import skill. The display is read-only.

**Tests** — create `tests/song-import/block-label.test.ts`:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Tests: Block label field presence; persistence roundtrip; absent label
//        produces no error in parse; buildComposition unaffected by label.
```

Test cases must include:

- A `Block` with `label: 'Verse'` serializes and deserializes with `label` intact via `SavedBlockSchema.parse`.
- A `Block` without `label` (legacy shape) still parses via `SavedBlockSchema` — `label` is `undefined`.
- A full session blob containing a labelled block round-trips correctly through `serializeSession` / `deserializeSession`.
- `buildComposition` is unaffected by `label` — its output for a labelled block is byte-identical to the unlabelled output (label carries no musical semantics).

**Commit:**
`feat(model): Phase 01 step 01.3 — Block label field, timeline display`

**Acceptance criteria:**

- A-01-16: `Block.label?: string` field exists in `src/core/composition/model.ts`.
- A-01-17: `SavedBlockSchema` includes `label: z.string().optional()`.
- A-01-18: A `Block` with `label` round-trips correctly through persistence — unit test passes.
- A-01-19: A legacy `Block` without `label` still parses cleanly — unit test passes.
- A-01-20: The timeline component renders `block.label` when non-empty and renders nothing for the label slot when absent.
- A-01-21: `buildComposition` output is unaffected by the presence or absence of `label` — regression test passes.
- A-01-22: `pnpm exec tsc --noEmit` passes clean.
- A-01-23: `pnpm lint` passes clean.

CHECKPOINT → Commit message:
`feat(model): Phase 01 step 01.3 — Block label field, timeline display`

---

## Step 01.4 — Quality gate

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-01.md` before doing anything else. Run the full quality gate in order: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. Report exact output for each command. Confirm total test count is above 2069 (the `note-placement` baseline). If any command fails, fix the issue and re-run before reporting. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-01.md` (this file)

**What to produce:**

Run each command and capture output:

1. `pnpm test` — report test count (must be > 2069).
2. `pnpm exec tsc --noEmit` — must exit 0 with no errors.
3. `pnpm lint` — must exit 0 with no errors or warnings.
4. `pnpm build` — must exit 0.

If any command fails: diagnose the root cause, apply a targeted fix (do NOT refactor unrelated code), re-run the failing command, and report both the original failure and the fix.

In the handoff entry, include:

- The exact final output of each command (last 10 lines or the summary line is sufficient for passing commands).
- The total test count from `pnpm test` output.
- Confirmation that test count is strictly greater than 2069.
- If fixes were needed: the file(s) changed and the nature of the fix (one sentence each).

**Acceptance criteria:**

- A-01-24: `pnpm test` all tests pass (test count strictly greater than 2069).
- A-01-25: `pnpm exec tsc --noEmit` exits 0.
- A-01-26: `pnpm lint` exits 0.
- A-01-27: `pnpm build` exits 0.
- A-01-28: Handoff includes exact test count and confirmation it exceeds the 2069 baseline.

CHECKPOINT → Commit message:
`chore(quality): Phase 01 step 01.4 — quality gate: all checks pass`

---

## Phase Acceptance

- **A-01-01** — Inventory document exists with all seven sections (a–g) including OD-1 and OD-2 recommendations.
  - Validation method: `manual`
- **A-01-02** — OD-1 and OD-2 each state a recommended option with one-sentence rationale.
  - Validation method: `manual`
- **A-01-03** — Inventory produced by reading only; no source files modified.
  - Validation method: `manual`
- **A-01-04** — Exhaustiveness audit lists all `Quality`-narrowing sites.
  - Validation method: `manual`
- **A-01-05** — `Quality` includes `'pow'`; TypeScript compiles clean with the extended union.
  - Validation method: `unit` (tsc + tests)
- **A-01-06** — `chordPcs(rootPc, 'pow')` returns exactly two pitch classes (root and fifth mod 12).
  - Validation method: `unit`
- **A-01-07** — `chordLabel(rootPc, 'pow')` returns `<root name>5` (power chord notation).
  - Validation method: `unit`
- **A-01-08** — `chordToStrudel` emits the OD-1-resolved Strudel string for `'pow'` quality.
  - Validation method: `unit` (golden string test)
- **A-01-09** — `SESSION_SCHEMA_VERSION = 7` in `src/lib/persistence.ts`.
  - Validation method: `unit`
- **A-01-10** — `SCHEMA_VERSION = 7` in `src/agent/schema.ts`.
  - Validation method: `unit`
- **A-01-11** — `SK_QUAL` in both persistence and agent schemas includes `'pow'`.
  - Validation method: `unit` (proxy:static-analysis)
- **A-01-12** — Every exhaustiveness site from the audit has a `'pow'` arm.
  - Validation method: `proxy:static-analysis` (tsc --noEmit + code read)
- **A-01-13** — Non-`pow` `chordToStrudel` output byte-identical to pre-phase.
  - Validation method: `unit` (regression golden string)
- **A-01-14** — `tests/song-import/pow-quality.test.ts` has at least 9 test cases and all pass.
  - Validation method: `unit`
- **A-01-15** — `pnpm exec tsc --noEmit` passes clean after step 01.2.
  - Validation method: `operability`
- **A-01-16** — `Block.label?: string` exists in `src/core/composition/model.ts`.
  - Validation method: `proxy:static-analysis`
- **A-01-17** — `SavedBlockSchema` includes `label: z.string().optional()`.
  - Validation method: `unit`
- **A-01-18** — `Block` with `label` round-trips through persistence.
  - Validation method: `unit`
- **A-01-19** — Legacy `Block` without `label` still parses cleanly.
  - Validation method: `unit`
- **A-01-20** — Timeline displays `block.label` when non-empty; absent otherwise.
  - Validation method: `manual`
- **A-01-21** — `buildComposition` output unaffected by `label`.
  - Validation method: `unit`
- **A-01-22** — `pnpm exec tsc --noEmit` passes clean after step 01.3.
  - Validation method: `operability`
- **A-01-23** — `pnpm lint` passes clean after step 01.3.
  - Validation method: `operability`
- **A-01-24** — `pnpm test` all pass; count strictly greater than 2069.
  - Validation method: `operability`
- **A-01-25** — `pnpm exec tsc --noEmit` exits 0 (final gate).
  - Validation method: `operability`
- **A-01-26** — `pnpm lint` exits 0 (final gate).
  - Validation method: `operability`
- **A-01-27** — `pnpm build` exits 0.
  - Validation method: `operability`
- **A-01-28** — Handoff includes exact test count and confirmation exceeds 2069.
  - Validation method: `manual`

## Partial coverage from prior phase

No prior partials from `note-placement` Phase 01 apply to this initiative. The note-placement phase's A-01-36 was `partial` (pnpm test exits 1 due to pre-existing Strudel unhandled rejections, not a test failure) — this is a pre-existing baseline condition, not a defect this phase must address. Permanently deferred: the Strudel `window is not defined` exit-code issue is a pre-existing limitation of `@strudel/web@1.0.3` in Vitest's Node environment; not addressable without patching or replacing the dependency.

Deferred items from `note-placement` carried forward:
- Agent `notes` schema extension (OD-3 from note-placement, deferred) — addressed in `song-import` Phase 02 (importSession skill) or a dedicated follow-on.
- Semitone-level pitch drag on `NoteSlot` in Pentagrama — deferred from note-placement Phase 01 step 01.5; not in scope for this initiative.

## ADR Triggers

- **Power chord codegen form** — Trigger: step 01.1 OD-1 resolution. If Option A (`note("<R_O> <R_O+7semis>")`) is confirmed as the canonical form, an ADR should document the choice and why `chordToStrudel` emits `note()` (not a chord shorthand) for `'pow'`. Open one at or before step 01.2.
- **`'pow'` Tonnetz rendering strategy** — Trigger: step 01.1 OD-2 resolution. If the choice deviates from using tonal-function colors (which require a third), document the decision in an ADR so future rendering phases can reference it.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/song-import/handoffs/phase-01-handoff.md`. See `handoff-template.md`.

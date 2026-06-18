<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0020 — Block-as-State data model

- **Status:** Accepted (Pilot approved at Checkpoint #2, 2026-06-18)
- **Date:** 2026-06-18
- **Initiative / Phase:** editable-composition / Phase 01 (step 01.2)
- **Deciders:** Pilot (Javier)

## Context

The current `Block` interface (`src/core/composition/model.ts` lines 12–20) stores only a
derived Strudel code string (`code`) plus metadata (`id`, `name`, `type`, `bars`). No
editable state is persisted at block-creation time, so a block cannot be re-opened in the
Ritmo or Armonía editor without re-parsing the generated code string — a brittle, lossy
operation.

The Phase 01 discovery inventory (`docs/editable-composition/inventories/phase-01-inventory.md`)
identified the exact gap: at `addBlock` time, the full `SessionState` is available, but only
the derived string survives. The inventory proposed a `BlockSnapshot` discriminated union that
captures all editable inputs at save time, enabling lossless round-trips.

The Pilot resolved all four open questions at Checkpoint #1 (2026-06-18):

- **OQ-1 → A:** Include `root`, `mode`, `octave` in `ArmoniaSnapshot` (harmonic content, not
  transport context). Exclude `bpm` from all snapshots; `openBlock` does not touch `state.bpm`.
- **OQ-2 → A/B:** Keep `Block.code` alongside the optional `snapshot`. `addBlock` keeps
  generating `code` via the existing codegen path and additionally captures a snapshot.
  `buildComposition` is unchanged (preserves byte-identical-at-default, A-01-06).
- **OQ-3 → indicator:** Snapshot-less ("legacy") blocks show a discreet visual indicator
  (badge/tooltip, muted) and **no** "open in editor" button.
- **OQ-4 → Option B:** `SesionSnapshot = { type: 'sesion'; groove: GrooveSnapshot; armonia: ArmoniaSnapshot }`
  (composite, not flat).

Seven decisions govern the implementation.

---

## Decisions

### D1 — `BlockSnapshot` discriminated union: exact TypeScript shape

**Decision:** Introduce three snapshot types and a discriminated union in
`src/core/composition/snapshot.ts`:

```typescript
// ── GrooveSnapshot ─────────────────────────────────────────────────────────
// Captures all rhythm layers with steps, euclid strings, mute, and solo flags.
// Sufficient to fully restore the Ritmo editor (no additional context needed).
//
// Source fields:
//   layers  →  SessionState.rhythm.layers  (src/core/rhythm/layers.ts lines 18–29)

interface GrooveSnapshot {
  type: 'groove';
  layers: Array<{
    sound: Sound;       // 'bd'|'sd'|'hh'|'oh'|'cp'|'rim'|'lt'|'mt'|'ht'
    steps: number[];    // 16 elements, 0 or 1
    euclid?: string;    // compact 'k,n' or 'k,n,rot'
    muted?: boolean;
    solo?: boolean;
  }>;
}

// ── ArmoniaSnapshot ────────────────────────────────────────────────────────
// Captures the full harmony state including the progression and all harmonic
// context fields needed to correctly display the Armonía editor (Tonnetz,
// scale ring, octave selector, chord-mode toggle).
//
// Source fields:
//   progression  →  SessionState.harmony.progression
//   chordMode    →  SessionState.chordMode
//   root         →  SessionState.harmony.root
//   mode         →  SessionState.harmony.mode
//   octave       →  SessionState.harmony.octave
//
// bpm is NOT included — see D3 rationale.

interface ChordSnapshotEntry {
  rootPc: number;         // 0–11
  qual: 'maj' | 'min' | 'dim' | 'aug';
  gain: number;
  bars?: number;
  // Sound attributes (ADR 0018 D1, ADR 0019 D4a — all preserved per A-01-04):
  instrument?: string;
  room?: number;
  decay?: number;
  preset?: 'piano' | 'guitar' | 'synth-bass';
  lpf?: number;
  attack?: number;
  sustain?: number;
  release?: number;
  lpenv?: number;
  lpa?: number;
  lpd?: number;
  lpq?: number;
}

interface RestSnapshotEntry {
  isRest: true;
  bars?: number;
}

type ProgressionSnapshotEntry = ChordSnapshotEntry | RestSnapshotEntry;

interface ArmoniaSnapshot {
  type: 'armonia';
  root: number;             // 0–11; from SessionState.harmony.root
  mode: string;             // from SessionState.harmony.mode
  octave: number;           // 2–5; from SessionState.harmony.octave
  chordMode: 'chord' | 'arp'; // from SessionState.chordMode
  progression: ProgressionSnapshotEntry[];
}

// ── SesionSnapshot ─────────────────────────────────────────────────────────
// Composite of groove + armonia sub-snapshots (OQ-4 → Option B).
// restoreSesionSnapshot delegates to restoreGrooveSnapshot +
// restoreArmoniaSnapshot on the typed sub-objects — no code duplication.

interface SesionSnapshot {
  type: 'sesion';
  groove: GrooveSnapshot;
  armonia: ArmoniaSnapshot;
}

// ── Discriminated union ────────────────────────────────────────────────────

type BlockSnapshot =
  | GrooveSnapshot
  | ArmoniaSnapshot
  | SesionSnapshot;
```

**Discrimination field:** `type` (`'groove' | 'armonia' | 'sesion'`) — matches the existing
`Block.type` discriminant so switch statements are unsurprising.

**`SesionSnapshot` sub-object `type` fields:** `groove.type === 'groove'` and
`armonia.type === 'armonia'` inside a `SesionSnapshot`. This is intentional — it allows the
`restore*Snapshot` functions to accept sub-snapshots by their own type without an outer-type
adapter. The outer `type: 'sesion'` is the discriminant at the `BlockSnapshot` union level.

**`cx` / `cy` Tonnetz render hints on `Chord`:** Not included. These are ephemeral render
hints that are recomputed from `rootPc` by the Tonnetz scene and need not be persisted in the
snapshot.

**Immutable shape from OQ-4 resolution:** `SesionSnapshot` is composite (Option B). Any
future field additions to `GrooveSnapshot` or `ArmoniaSnapshot` automatically propagate to
`SesionSnapshot` without changing the top-level type shape.

---

### D2 — `code` field fate: kept always; snapshot is an additive, optional aide

**Decision (OQ-2 → A/B):** `Block.code` is **kept** as the canonical "Strudel to play"
field in all blocks — new and old. The `snapshot` field is additive and optional:

```typescript
interface Block {
  id: string;
  name: string;
  type: 'groove' | 'armonia' | 'sesion';
  /** Strudel code string for this block. Canonical playback field. */
  code: string;
  /** Duration in bars. */
  bars: number;
  /** Editable-state snapshot captured at save time. Present on blocks created
   *  after Phase 01 step 01.3. Absent on legacy blocks. */
  snapshot?: BlockSnapshot;
}
```

**`addBlock` behavior after step 01.3:**
1. Generate `code` via the existing codegen path (unchanged — `rhythmCode` / `harmonyCode` /
   `sessionCode` → `stripComments`).
2. Capture the appropriate snapshot via `captureGrooveSnapshot` / `captureArmoniaSnapshot` /
   `captureSesionSnapshot`.
3. Construct `Block` with both `code` and `snapshot` populated.

**`buildComposition` is unchanged:** It references `block.code` only
(`src/core/composition/model.ts` lines 81–102). The snapshot is restore-only; it is never
consulted during playback or composition export.

**Byte-identical-at-default guarantee (A-01-06):** For any block where `snapshot` is absent
(legacy or manually constructed without a snapshot), `buildComposition` uses `block.code`
exactly as before. No behavior change. The test in `tests/snapshot.test.ts` asserts this.

**Rejected alternative — derive `code` from snapshot at play time (Option C):**
Requires rewriting `buildComposition` to accept snapshots; breaks backward compatibility for
snapshot-less blocks; substantially increases implementation scope with no user-visible benefit
in this phase. Deferred.

---

### D3 — Global context in snapshots: `root`, `mode`, `octave` included; `bpm` excluded

**Decision (OQ-1 → A):**

| Context field | Included in snapshot? | Snapshot type(s) | Rationale |
|---|---|---|---|
| `root` | Yes | `ArmoniaSnapshot` | Part of Armonía editor's visible state (Tonnetz navigation, scale ring). Required to correctly re-display the progression in context. |
| `mode` | Yes | `ArmoniaSnapshot` | Required by the Tonnetz display and scale-ring indicator. |
| `octave` | Yes | `ArmoniaSnapshot` | Governs voice placement; used by `melodyLine`; required for codegen parity on re-open. |
| `bpm` | **No** | — | Global transport setting not displayed in the Armonía or Ritmo editors. Restoring bpm on `openBlock` would be surprising if the user changed tempo since saving. `openBlock` does NOT touch `state.bpm`. |

**`GrooveSnapshot` carries no context fields** beyond its `layers` array. The Ritmo editor
does not use `root`, `mode`, `octave`, or `bpm` — it is self-contained in its layer data.

**`SesionSnapshot` inherits:** The composite structure means `SesionSnapshot.armonia`
carries `root`, `mode`, `octave`, `chordMode`, and `progression`; `SesionSnapshot.groove`
carries `layers`. No additional context fields are needed at the `SesionSnapshot` level.

**`chordMode` is harmonic content, not transport context:** It determines whether the harmony
emits block chords or arpeggios. It belongs in `ArmoniaSnapshot` alongside the progression.

---

### D4 — Snapshot-less block behavior: discreet legacy indicator, no edit button

**Decision (OQ-3 → indicator):** Blocks loaded without a `snapshot` field (legacy blocks,
or blocks created before step 01.3) are:

1. **Fully playable** — `playBlockById` and `addBlockAsNewTrack` are unaffected and continue
   to operate on `block.code` as before. No behavior regression.

2. **Not editable via open-in-editor** — the "open in editor" button is **not rendered** for
   snapshot-less blocks. Per step 01.5 spec: `block.snapshot !== undefined` is the visibility
   condition.

3. **Visually distinguished** — a small, muted "legacy" label (or equivalent discreet badge)
   is shown on the block card in `CompositionDrawer.svelte`. This indicator:
   - Uses a muted/subdued color (not a warning or error tone — playback is unaffected).
   - Is styled consistently with the existing block card design (ADR 0011 aesthetic: sober,
     Apple-like).
   - Includes a `title` tooltip with a brief explanation (e.g., "Created before editable
     snapshots were available. Playable but cannot be re-opened in the editor."). The tooltip
     text uses i18n key `composition.legacyBlockTip` in all four locales.

**Backward-compatibility with v4 sessions:**

Under the v4-drop rule (D5 below), no v4 sessions survive the v5 schema bump. In practice,
users encounter snapshot-less blocks only if:
- A session was created between step 01.3 and some edge case (unlikely in a single-user app).
- A developer manually constructs a `Block` without a `snapshot` for testing.

The indicator is defensive/future-proof: if a softer migration is introduced in a later phase
(allowing v4 blocks to survive), the indicator will correctly mark them without code changes.

---

### D5 — Schema version: `SESSION_SCHEMA_VERSION` 4 → 5; lossy drop for v4 blobs

**Decision:**

- `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts` bumps from `4` to `5`.
- `SavedSessionSchema` `version` literal changes from `z.literal(4)` to `z.literal(5)`.
- `SavedBlockSchema` gains one new optional field:

```typescript
const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
  // New in v5 (Phase 01 step 01.3–01.4):
  snapshot: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('groove'),
      layers: z.array(z.object({
        sound: SoundSchema,        // z.enum(['bd','sd','hh','oh','cp','rim','lt','mt','ht'])
        steps: z.array(z.number().int().min(0).max(1)).length(16),
        euclid: z.string().optional(),
        muted: z.boolean().optional(),
        solo: z.boolean().optional(),
      })),
    }),
    z.object({
      type: z.literal('armonia'),
      root: z.number().int().min(0).max(11),
      mode: z.string(),
      octave: z.number().int().min(2).max(5),
      chordMode: z.enum(['chord', 'arp']),
      progression: z.array(z.discriminatedUnion('isRest', [
        ChordSnapshotEntrySchema,  // z.object({ isRest: z.undefined()... }) — see step 01.4
        z.object({ isRest: z.literal(true), bars: z.number().int().optional() }),
      ])),
    }),
    z.object({
      type: z.literal('sesion'),
      groove: GrooveSnapshotSchema,    // the z.object for 'groove' variant above
      armonia: ArmoniaSnapshotSchema,  // the z.object for 'armonia' variant above
    }),
  ]).optional(),
});
```

The exact Zod schema factoring (inlined vs. extracted named schemas) is left to step 01.4's
implementation; the shape above is the canonical contract.

**Migration strategy — lossy drop (established precedent):**

A v4 session blob carries `version: 4`, which fails `z.literal(5)`. The existing
`loadSavedSession` `safeParse` path returns `null`, and the app loads its default state — no
crash, no user-visible error. This is the same tradeoff accepted at:
- Phase 09 / ADR 0013 D1 (v2 → v3 bump)
- harmonic-rhythm-improvements Phase 02 / ADR 0018 D3 (v2 → v3 bump)
- harmonic-rhythm-improvements Phase 03 / ADR 0019 D5 (v3 → v4 bump)

**No migration function.** Consistent with all prior precedents.

**Why not a softer migration (keep v4 loading):** Technically feasible (snapshot is optional;
a v4 block would parse as snapshot-less). However:
1. A version bump is consistent with established precedent across all prior phases.
2. The lossy-drop path is already implemented and tested. Soft migration requires additional
   discriminated parsing logic.
3. In a single-user app without sync, the session loss impact is low and clearly communicated
   to the Pilot.

If the Pilot directs a soft migration in a future phase, the legacy-block indicator (D4)
is already in place to mark the blocks that loaded without a snapshot.

**`SESSION_SCHEMA_VERSION` alignment:** The agent schema version (`SCHEMA_VERSION` in
`src/agent/schema.ts`) is NOT bumped in this phase — it remains at `4` (per D7 below).

---

### D6 — `openBlock(blockId)` action contract

**Decision:** Export `openBlock(blockId: string): void` from `src/state/session.ts`.

**What it does:**

1. Reads `get(sessionStore)` to find the block with the matching `id`.
2. If the block is not found, returns immediately (no-op, no error).
3. If `block.snapshot === undefined`, returns immediately (no-op, no error, no view switch).
   This is the graceful fallback for legacy blocks (D4).
4. Calls the appropriate restore function from `src/core/composition/snapshot.ts`:
   - `snapshot.type === 'groove'` → `restoreGrooveSnapshot(snapshot)` → `Partial<SessionState>`
   - `snapshot.type === 'armonia'` → `restoreArmoniaSnapshot(snapshot)` → `Partial<SessionState>`
   - `snapshot.type === 'sesion'` → `restoreSesionSnapshot(snapshot)` → `Partial<SessionState>`
5. Writes the resulting `Partial<SessionState>` delta into `sessionStore` via
   `sessionStore.update((s) => ({ ...s, ...delta }))`.
6. Switches `state.view`:
   - `'groove'` snapshot → switches to `'rhythm'`
   - `'armonia'` snapshot → switches to `'harmony'`
   - `'sesion'` snapshot → switches to `'harmony'` (harmony is the lead view for sesion;
     the rhythm half is also restored but the Armonía view is presented first)
7. Does **NOT** call `runNow()`, `stopAll()`, or any audio transport operation. The user
   resumes playback manually. This preserves the "always make it obvious what is playing"
   invariant from kickoff §6 — the transport state is unchanged.

**What it does NOT do:**

- Does not auto-play the restored state.
- Does not clear or modify the composition track list (`state.composition.tracks`).
- Does not modify `state.bpm` (D3 — bpm is excluded from all snapshots).
- Does not modify any `Chord.cx` / `Chord.cy` render hint (these are recomputed by the
  Tonnetz scene on next render).
- Does not throw or log warnings on snapshot-less blocks (silent no-op per D4).

**`core/**` purity preserved:** `openBlock` lives in `src/state/session.ts`, which is
a Svelte store module, not a `core/**` engine. The restore functions it calls
(`restoreGrooveSnapshot`, `restoreArmoniaSnapshot`, `restoreSesionSnapshot`) live in
`src/core/composition/snapshot.ts` and have no DOM/PIXI/Svelte imports — they are
pure TypeScript functions that accept a snapshot and return a `Partial<SessionState>`.

**Test coverage:** `openBlock` is exercised by the integration path in `tests/snapshot.test.ts`
(A-01-01 through A-01-05) through the restore functions. The `openBlock` action itself
(store-write + view-switch) is part of the manual acceptance items A-01-08 through A-01-10.

---

### D7 — Agent schema: no block fields added in this phase; JSDoc guard added

**Decision (OQ from §(d) of inventory):** `src/agent/schema.ts` gains **no structural
changes** in this phase. The agent output schema (`AgentOutputSchema`) contains only
`rhythm?`, `harmony?`, and `note?` — it has no reference to blocks, the composition library,
or `SavedBlockSchema`. This remains the case after Phase 01.

`SCHEMA_VERSION` in `src/agent/schema.ts` stays at `4`.

**JSDoc guard added in step 01.4:** A single JSDoc comment is added to `HarmonyChordCoreSchema`
(currently line 122 of `src/agent/schema.ts`) noting:

```typescript
/**
 * …existing doc…
 *
 * NOTE: Block snapshot fields (GrooveSnapshot, ArmoniaSnapshot, SesionSnapshot)
 * are a composition-layer concern defined in src/core/composition/snapshot.ts.
 * They are NOT part of agent output and must NOT be added here. Agent output
 * describes live session mutations; block persistence is a separate concern.
 */
```

**Rationale:** Block snapshots are a persistence / editor-round-trip concern. The agent
operates on the live session (harmony progression, rhythm layers) and produces mutations that
`apply.ts` writes to `sessionStore`. Adding block IDs or snapshot content to agent output
would couple the agent protocol to the composition library, which is out of scope for this
phase and would violate the separation of concerns established in kickoff §7 ("the agent may
only generate what the UI supports").

**Future phase consideration:** If a future F3 (AI improvisation) phase requires the agent to
save or reference blocks, a new ADR will govern that change. The JSDoc guard prevents
accidental scope creep in the interim.

---

## Consequences

### Changed files (projected — implementation in steps 01.3–01.5)

| File | Nature of change |
|---|---|
| `src/core/composition/snapshot.ts` | New file: `GrooveSnapshot`, `ArmoniaSnapshot`, `SesionSnapshot`, `BlockSnapshot` types; `capture*` and `restore*` functions; AGPL-3.0 header (step 01.3) |
| `src/core/composition/model.ts` | `Block.snapshot?: BlockSnapshot` added (step 01.3) |
| `src/state/session.ts` | `addBlock` captures snapshot; `openBlock` exported (steps 01.3, 01.5) |
| `tests/snapshot.test.ts` | New file: A-01-01 through A-01-06 unit tests (step 01.3) |
| `src/lib/persistence.ts` | `SESSION_SCHEMA_VERSION` 4→5; `SavedBlockSchema` gains `snapshot?`; Zod discriminated union (step 01.4) |
| `src/agent/schema.ts` | JSDoc guard on `HarmonyChordCoreSchema` only; no structural change (step 01.4) |
| `tests/persistence.test.ts` | v4 drop + v5 snapshot round-trip + snapshot-absent block (step 01.4) |
| `src/ui/CompositionDrawer.svelte` | "Open in editor" button (snapshot-only); legacy badge on snapshot-less blocks (step 01.5) |
| `src/i18n/types.ts` | New keys: `composition.openBlock`, `composition.openBlockTip`, `composition.legacyBlockTip` (step 01.5) |
| `src/i18n/locales/es.ts` | New keys (step 01.5) |
| `src/i18n/locales/en.ts` | New keys (step 01.5) |
| `src/i18n/locales/pt.ts` | New keys (step 01.5) |
| `src/i18n/locales/zh.ts` | New keys (step 01.5) |

### Invariants preserved

- **`buildComposition` is unchanged.** Playback and composition export are byte-identical to
  pre-phase behavior for all existing blocks (A-01-06 guarantee).
- **`core/**` purity.** `src/core/composition/snapshot.ts` has no DOM/PIXI/Svelte imports —
  it is unit-testable in Vitest/Node.
- **Lossy-drop precedent followed.** v4 sessions are dropped silently per ADR 0013 D1 /
  ADR 0018 D3 / ADR 0019 D5.
- **Agent schema untouched.** No agent protocol change.
- **No new runtime dependencies.** All new behavior uses existing TypeScript, Svelte store
  primitives, and Zod.

### Deferred

- **Soft migration for v4 sessions** — technically feasible but inconsistent with precedent;
  deferred unless the Pilot directs it in a future phase.
- **`code` removal / snapshot-as-sole-source** — Option C (D2); higher complexity, deferred.
- **Block saving from agent output** — out of scope; guard comment added to prevent creep.

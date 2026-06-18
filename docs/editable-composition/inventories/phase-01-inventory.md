# Phase 01 Discovery Inventory — Block Round-Trip (editable-composition)

**Date:** 2026-06-18
**Author:** Dev (step 01.1)
**Phase file:** `docs/editable-composition/phases/phase-01.md`
**Status:** Complete — awaiting Pilot resolution of OQ-1 through OQ-4 at Checkpoint #1.

---

## §(a) Current Block model and codegen path

### `Block` interface

Source: `src/core/composition/model.ts` lines 12–20.

```ts
export interface Block {
  id: string;
  name: string;
  type: 'groove' | 'armonia' | 'sesion';
  /** Strudel code string for this block. */
  code: string;
  /** Duration in bars (1 Strudel cycle = 1 bar of 4/4). */
  bars: number;
}
```

`Block` carries five fields: a runtime `id` (ephemeral — excluded from persistence per ADR 0009, `src/lib/persistence.ts` line 215 comment), a user-editable `name`, a discriminant `type`, the generated Strudel `code` string, and a `bars` duration. There is no snapshot of the editable inputs from which `code` was produced.

### `addBlock` derivation path

Source: `src/state/session.ts` lines 1233–1263.

```
addBlock(type) reads get(sessionStore):
  'groove'  → rhythmCode(state)       → rhythmToStrudel(state.rhythm.layers)
  'armonia' → harmonyCode(state)      → melodyLine(state.harmony.progression,
                                          state.chordMode, state.harmony.octave)
  'sesion'  → sessionCode(state)      → buildSession(layers, progression,
                                          chordMode, octave)
              then stripComments(code)

Block object constructed at lines 1249–1255:
  { id: 'b' + _blkSeq++, name: defName, type, code: stripComments(code), bars: 4 }
```

**What state is consumed** (at snapshot time, from `SessionState`):
- `groove`: `state.rhythm.layers` (all `RhythmLayer` objects: `sound`, `steps`, `euclid?`, `muted?`, `solo?`).
- `armonia`: `state.harmony.progression` (all `ProgressionSlot` entries — `Chord` or `RestSlot`), `state.chordMode`, `state.harmony.octave`. Also implicitly: `state.harmony.root` and `state.harmony.mode` are consumed indirectly by `chordLabel`/UI context but **not** by `melodyLine` directly (confirmed: `src/state/session.ts` line 408 — `melodyLine(state.harmony.progression, state.chordMode, state.harmony.octave)` — root and mode are not passed).
- `sesion`: all of the above via `buildSession`.

**What is stripped:**
- `stripComments` removes comment lines (lines starting with `//`) before saving code — `src/core/composition/model.ts` lines 47–53.
- `Chord.cx` and `Chord.cy` (Tonnetz render hints) are never passed through codegen — not part of `melodyLine` output.
- `HarmonyState.subview` and `HarmonyState.registerMode` — ephemeral UI fields, never consumed by codegen (`src/state/session.ts` lines 243–266).
- The counter `_blkSeq` is module-level, ephemeral, not persisted (`src/state/session.ts` JSDoc line 1227).

**What is lost at save time (the round-trip gap):**
- The full `RhythmLayer[]` array (steps, euclid string, muted, solo) — only the Strudel code string survives. A block cannot be re-opened in the Ritmo editor without re-parsing the code.
- The full `ProgressionSlot[]` array (rootPc, qual, gain, bars, instrument, room, decay, preset, lpf, attack, sustain, release, lpenv, lpa, lpd, lpq on each Chord) — only the Strudel code string survives.
- `chordMode` ('chord' | 'arp') — consumed by `melodyLine` but not embedded in the code in a way that is reversible.
- `harmony.root` and `harmony.mode` — not embedded in block code at all for `armonia` type (root/mode context used only by Tonnetz UI navigation, not codegen).
- `harmony.octave` — used in `melodyLine` but not separately recoverable from the output string.
- `state.bpm` — not embedded in block code (tempo header is added at play time via `tempoWrap`, not at save time).

---

## §(b) What each block type needs to round-trip

### `groove` block

To re-open in the **Ritmo editor** with no data loss, the following must be preserved:

| Field | Type | Source |
|---|---|---|
| `layers` | `RhythmLayer[]` | `state.rhythm.layers` |

Each `RhythmLayer` carries: `sound: Sound`, `steps: number[]` (16 elements), `euclid?: string`, `muted?: boolean`, `solo?: boolean`. Source: `src/core/rhythm/layers.ts` lines 18–29.

The Ritmo editor displays these directly — grid step toggles, euclid mode toggle, mute/solo buttons. No additional context (bpm, root, mode, octave) is required to restore the Ritmo editor to an identical state.

### `armonia` block

To re-open in the **Armonía editor** (Pentagrama + chord slots) with no data loss:

| Field | Type | Source |
|---|---|---|
| `progression` | `ProgressionSlot[]` | `state.harmony.progression` |
| `chordMode` | `'chord' \| 'arp'` | `state.chordMode` |
| `root` | `number` (0–11) | `state.harmony.root` |
| `mode` | `string` | `state.harmony.mode` |
| `octave` | `number` (2–5) | `state.harmony.octave` |

`chordMode` is required because it determines arpeggio vs. block chord output. `root` and `mode` are required because the Tonnetz and scale indicators display based on them. `octave` governs voice placement.

`ProgressionSlot` can be a `Chord` (rootPc, qual, gain, bars?, instrument?, room?, decay?, preset?, lpf?, attack?, sustain?, release?, lpenv?, lpa?, lpd?, lpq?) or a `RestSlot` (isRest: true, bars?). All Chord fields introduced in harmonic-rhythm-improvements Phase 02 and Phase 03 must be preserved — these are acceptance items A-01-04 and A-01-05.

### `sesion` block

A `sesion` block is a combined snapshot of both groove and harmony state. Two design options exist (resolved by OQ-4):

**Option A — flat combined type:** a single `SesionSnapshot` carrying all groove + harmony fields flat.

**Option B — composite type:** `SesionSnapshot = { groove: GrooveSnapshot; armonia: ArmoniaSnapshot }`.

Option B is recommended (see §(g) OQ-4) because it allows `restoreGrooveSnapshot` and `restoreArmoniaSnapshot` to be called independently on sub-snapshots without code duplication, and it mirrors the natural composition of the two editor types.

For `sesion`, restoring opens one view (Armonía or Ritmo); the step 01.5 spec says the view switch goes to `'harmony'` for sesion — the harmony half becomes the lead view.

---

## §(c) Persistence impact

### Current `SavedBlockSchema`

Source: `src/lib/persistence.ts` lines 100–105.

```ts
const SavedBlockSchema = z.object({
  name: z.string().max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  code: z.string(),
  bars: z.number().int().min(1).max(64),
});
```

Four fields: `name`, `type`, `code`, `bars`. No snapshot field. `id` is excluded at serialization (line 215 comment: "id excluded — ADR 0009").

The current schema version is `SESSION_SCHEMA_VERSION = 4` (`src/lib/persistence.ts` line 18). The version literal is enforced via `z.literal(4)` in `SavedSessionSchema` (line 134).

### New fields required

Add `snapshot?: BlockSnapshot` as an optional field on `SavedBlockSchema`. The shape must be a Zod discriminated union on the `type` field:

```ts
snapshot: z.discriminatedUnion('type', [
  z.object({ type: z.literal('groove'), /* GrooveSnapshot fields */ }),
  z.object({ type: z.literal('armonia'), /* ArmoniaSnapshot fields */ }),
  z.object({ type: z.literal('sesion'), /* SesionSnapshot fields */ }),
]).optional()
```

### Additive migration

The change is **additive** (backward-safe) for the snapshot field itself: existing saved sessions that do not have a `snapshot` field in each block will parse correctly because `snapshot` is optional. **However**, the version literal bump from 4 → 5 means that existing v4 blobs fail `z.literal(5)` and are dropped by `safeParse` — consistent with established precedent (ADR 0013 D1, ADR 0018 D3, ADR 0019 D5). This is the version-bump tradeoff.

### `SESSION_SCHEMA_VERSION` must become 5

`src/lib/persistence.ts` line 18: `export const SESSION_SCHEMA_VERSION = 4;` → must become `5`.

---

## §(d) Agent schema impact

Source: `src/agent/schema.ts` (full file, lines 1–218).

The agent output schema (`AgentOutputSchema`, line 196) contains only `rhythm?: RhythmSpecSchema`, `harmony?: HarmonySpecSchema`, and `note?: string`. It has **no reference to blocks, the composition library, or `SavedBlockSchema`**.

The agent schema does not reference composition blocks at all. No agent schema change is required in this phase. `SCHEMA_VERSION` (line 22, currently 4) remains unchanged.

A JSDoc comment should be added to `HarmonyChordCoreSchema` (line 122) noting that block snapshot fields are a composition-layer concern outside agent output scope, so future engineers do not accidentally add them to the agent schema.

---

## §(e) UI touchpoints for "open block in editor"

### `CompositionDrawer.svelte` — primary composition view

Source: `src/ui/CompositionDrawer.svelte` lines 661–703 (the block list `{#each}` loop).

Each block card (`.blk`) currently renders:
- Type tag (`<span class="tag">`)
- Contenteditable name (`<span class="nm">`)
- Mini code preview (`<span class="mini">`)
- `▶` play button → `playBlockById(b.id)` (line 686)
- `↳ pista` button → `addBlockAsNewTrack(b.id)` (line 693)
- `🗑` delete button → `deleteBlock(b.id)` (line 699)

**New touchpoint required:** An "open in editor" button on each `.blk` card, visible only when `b.snapshot !== undefined`. On click, calls `openBlock(b.id)` (new action to be added to `src/state/session.ts` in step 01.5). This button does not exist today.

### `src/state/session.ts` — new `openBlock` action

A new `openBlock(blockId: string): void` export is required in `src/state/session.ts`. It is not a DOM/PIXI/Svelte function — it is a pure store action that:
1. Finds the block in `sessionStore`.
2. Reads `block.snapshot`.
3. Calls the appropriate `restore*Snapshot` function from `src/core/composition/snapshot.ts`.
4. Writes the resulting `Partial<SessionState>` delta into the store via `sessionStore.update`.
5. Switches `state.view` to `'rhythm'` (for groove) or `'harmony'` (for armonia / sesion).
6. Does NOT call `runNow` / auto-play.
7. If `block.snapshot` is undefined, does nothing (no error, no view switch).

### Other Svelte components

No other Svelte components render the block library or call `addBlock` directly as a block-opening touchpoint:
- `src/app/App.svelte` — mounts `CompositionDrawer` conditionally (view === 'composition') but does not render block cards.
- `src/ui/AgentPanel.svelte` — references `addBlock` only to save blocks (confirmed by grep: "addBlock" present in the file per the find-svelte scan, but in the context of "save current state as block", not "open block").
- `src/ui/Header.svelte` — references composition only for nav tab switching, not block library.
- `src/ui/HarmonyControls.svelte`, `src/ui/ProgressionStrip.svelte` — reference `addBlock` in the context of a "save to composition" button, not block-opening.

Only `CompositionDrawer.svelte` renders block cards and needs the "open in editor" button added.

---

## §(f) Concrete proposed `BlockSnapshot` shape

The following TypeScript types are proposed for `src/core/composition/snapshot.ts`. These are pseudo-code in the inventory; source file is NOT modified in this step.

```ts
// ── GrooveSnapshot ─────────────────────────────────────────────────────────
// Captures the full rhythm state: all layers with their steps, euclid strings,
// mute, and solo flags. Sufficient to restore the Ritmo editor completely.
// Source fields: SessionState.rhythm.layers (src/core/rhythm/layers.ts lines 18–29).

interface GrooveSnapshot {
  type: 'groove';
  layers: Array<{
    sound: Sound;         // 'bd'|'sd'|'hh'|'oh'|'cp'|'rim'|'lt'|'mt'|'ht'
    steps: number[];      // 16 elements, 0 or 1
    euclid?: string;      // compact 'k,n' or 'k,n,rot'
    muted?: boolean;
    solo?: boolean;
  }>;
}

// ── ArmoniaSnapshot ────────────────────────────────────────────────────────
// Captures the full harmony state including:
//   - progression: all ProgressionSlot entries (Chord | RestSlot)
//   - chordMode: 'chord' | 'arp' (needed by melodyLine)
//   - root, mode, octave: global harmonic context
//
// Fields sourced from:
//   progression  → SessionState.harmony.progression
//   chordMode    → SessionState.chordMode
//   root         → SessionState.harmony.root
//   mode         → SessionState.harmony.mode
//   octave       → SessionState.harmony.octave
//
// bpm is NOT included — see OQ-1. root/mode/octave ARE included — they are part
// of the harmonic content, not just playback context.

interface ChordSnapshotEntry {
  rootPc: number;       // 0–11
  qual: 'maj'|'min'|'dim'|'aug';
  gain: number;
  bars?: number;
  // Sound attributes (ADR 0018, ADR 0019 — must all be preserved per A-01-04):
  instrument?: string;
  room?: number;
  decay?: number;
  preset?: 'piano'|'guitar'|'synth-bass';
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
  root: number;         // 0–11; from SessionState.harmony.root
  mode: string;         // from SessionState.harmony.mode
  octave: number;       // 2–5; from SessionState.harmony.octave
  chordMode: 'chord'|'arp'; // from SessionState.chordMode
  progression: ProgressionSnapshotEntry[];
}

// ── SesionSnapshot ─────────────────────────────────────────────────────────
// Composite of groove + armonia sub-snapshots (Option B, recommended per OQ-4).
// restoreSesionSnapshot calls restoreGrooveSnapshot + restoreArmoniaSnapshot
// on the sub-snapshots without code duplication.

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

**Field-source mapping:**

| Snapshot field | Source in SessionState | Persisted in v4? |
|---|---|---|
| `GrooveSnapshot.layers[*].sound` | `state.rhythm.layers[*].sound` | No (not in block schema) |
| `GrooveSnapshot.layers[*].steps` | `state.rhythm.layers[*].steps` | No |
| `GrooveSnapshot.layers[*].euclid?` | `state.rhythm.layers[*].euclid` | No |
| `GrooveSnapshot.layers[*].muted?` | `state.rhythm.layers[*].muted` | No |
| `GrooveSnapshot.layers[*].solo?` | `state.rhythm.layers[*].solo` | No |
| `ArmoniaSnapshot.root` | `state.harmony.root` | Yes (SavedHarmonySchema) |
| `ArmoniaSnapshot.mode` | `state.harmony.mode` | Yes |
| `ArmoniaSnapshot.octave` | `state.harmony.octave` | Yes |
| `ArmoniaSnapshot.chordMode` | `state.chordMode` | Yes |
| `ArmoniaSnapshot.progression[*].*` | `state.harmony.progression[*].*` | Yes |

---

## §(g) Open Questions

### OQ-1 — Do bpm/root/mode/octave belong in the snapshot or are they playback context?

**Question:** `bpm` is a global parameter not embedded in block code. Should a snapshot capture the bpm at save time and restore it when the block is opened (making the editor match the original tempo exactly), or is bpm treated as a non-captured playback context parameter?

**Analysis:** `root`, `mode`, and `octave` are part of the Armonía editor's visible state (Tonnetz navigation, scale ring, octave selector) and are needed to correctly display the progression in context. They belong in the snapshot. `bpm` is different: it is a global transport setting not displayed in the Armonía or Ritmo editors directly. Restoring bpm on block-open would be surprising if the user has changed tempo since saving.

**Recommendation:** Include `root`, `mode`, `octave` in `ArmoniaSnapshot` (they are harmonic content, not transport context). Exclude `bpm` from all snapshot types. The `openBlock` action does not touch `state.bpm`.

**Pilot resolution needed:** Accept or override the recommendation to exclude `bpm`.

---

### OQ-2 — Is `Block.code` kept redundantly alongside the snapshot, or removed?

**Question:** After adding `snapshot?` to `Block`, the `code` field is still used by `buildComposition` (which references `block.code` directly — `src/core/composition/model.ts` line 89: `segs.push(\`  [${ref.bars}, ${b.code}]\``). If we remove `code`, `buildComposition` breaks. If we keep it, the block carries both the derived code and the source snapshot.

**Analysis:** Three options:
- **Option A — keep `code` always, snapshot is optional:** `code` is the canonical "Strudel to play" field; snapshot is an additional round-trip aid. Old blocks (no snapshot) still play via `code`. This is additive with zero risk of breaking `buildComposition`.
- **Option B — derive `code` from snapshot at save time, keep both:** `addBlock` captures snapshot AND generates code in one operation. `code` remains present for playback; snapshot enables editing. This is Option A with a naming clarity point.
- **Option C — remove `code`, derive at play time from snapshot:** requires rewriting `buildComposition` to accept snapshots. Higher complexity, breaks backward compatibility for snapshot-less blocks.

**Recommendation:** Option A/B — keep `code` always. `addBlock` continues to generate `code` via the codegen path as today, and additionally captures a `snapshot`. `buildComposition` is unchanged (byte-identical-at-default guarantee for A-01-06). For snapshot-less old blocks, only `code` is used.

**Pilot resolution needed:** Confirm Option A/B (keep `code` alongside snapshot). If Option C is preferred, this requires a separate ADR decision.

---

### OQ-3 — Snapshot-less blocks: silently playable-only, or with a visual indicator?

**Question:** Blocks saved before this phase have no `snapshot` field. When deserialized from v5 (after the schema bump), they load as snapshot-less. Should the UI silently suppress the "open in editor" button (step 01.5 already says: "visible only when `block.snapshot !== undefined`"), or should it show a visual indicator (e.g. a `"legacy"` badge or muted label) to explain why the button is absent?

**Analysis:** The step 01.5 spec mentions "if the ADR directs a visual indicator, add a small badge or muted label." However, v4 blobs fail `z.literal(5)` and are dropped (reset to default) per established precedent — so in practice, there are no in-the-wild snapshot-less blocks to encounter at launch. The only snapshot-less blocks would arise from:
1. Manual construction (developer testing).
2. A future version that adds blocks without snapshots.

Given the v4 drop behavior, the indicator is mostly cosmetic for the launch window. However, it helps defensively if the migration strategy is ever softened in a future phase (soft migration would mean old blocks survive).

**Recommendation:** Add a small visual indicator (`"legacy"` badge or `title` tooltip) on blocks without a snapshot, styled unobtrusively (muted color). The "open in editor" button remains absent. This is low-cost and future-proof.

**Pilot resolution needed:** Accept or override. If override (no indicator), the spec for step 01.5 UI section becomes simpler.

---

### OQ-4 — Is `SesionSnapshot` flat or `{ groove: GrooveSnapshot; armonia: ArmoniaSnapshot }`?

**Question:** The `sesion` block type captures both rhythm and harmony state. Should `SesionSnapshot` be:
- **Option A (flat):** a single object with all groove fields + all harmony fields merged at the top level (e.g. `{ type: 'sesion', layers: [...], root: ..., mode: ..., ... }`).
- **Option B (composite):** `{ type: 'sesion', groove: GrooveSnapshot; armonia: ArmoniaSnapshot }`.

**Analysis:**
- Option A is simpler to serialize but couples the two type shapes. If either sub-type evolves (e.g. harmony gains a new field), the merged flat type requires care to avoid field name collisions.
- Option B allows `restoreGrooveSnapshot` and `restoreArmoniaSnapshot` to be called on sub-snapshots directly, avoids code duplication, and aligns with the domain model (groove and armonia are independent sub-systems).
- The phase-01.md spec (step 01.3) references `restoreGrooveSnapshot(snap: GrooveSnapshot)` and `restoreArmoniaSnapshot(snap: ArmoniaSnapshot)` as separate functions that accept their own types — Option B maps directly to that signature without adapter code.
- The `SesionSnapshot.groove` field has `type: 'groove'` which conflicts with the outer `type: 'sesion'` discriminant if flat. Option B avoids this.

**Recommendation:** Option B — composite `{ type: 'sesion'; groove: GrooveSnapshot; armonia: ArmoniaSnapshot }`. This is the shape already reflected in §(f) above.

**Pilot resolution needed:** Confirm Option B or choose Option A. This decision directly affects the `BlockSnapshot` type shape, Zod schema, persistence, and restore functions.

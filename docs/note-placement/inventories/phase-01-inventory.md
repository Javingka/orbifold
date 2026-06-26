<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — NoteSlot: Single-Note Placement on the Pentagrama

**Produced by:** Dev (step 01.1, read-only)
**Date:** 2026-06-26
**Status:** Awaiting Pilot review (STOP — no source files were modified)

---

## (a) Current `ProgressionSlot` union members and discriminants

**File:** `src/state/session.ts`

```typescript
// Line 150–229: Chord interface
export interface Chord {
  rootPc: number;     // 0–11 (pitch class)
  qual: Quality;      // 'maj' | 'min' | 'dim' | 'aug'
  gain: number;       // 0–1.2; default 0.6
  cx?: number;        // Tonnetz centroid x (disambiguation)
  cy?: number;        // Tonnetz centroid y (disambiguation)
  bars?: number;      // duration in cycles; default 1
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

// Line 235–238: RestSlot interface
export interface RestSlot {
  isRest: true;   // discriminant
  bars?: number;
}

// Line 244: union
export type ProgressionSlot = Chord | RestSlot;
```

**Discriminant pattern in use:** `'isRest' in slot` — present only on `RestSlot`. `Chord` has no own discriminant field; it is identified by absence of `isRest`. After adding `NoteSlot`, the discriminant will be `'isNote' in slot` (analogous pattern).

**Guard functions:** `isRest` is not currently a named guard function — callers inline `'isRest' in slot` checks directly. Step 01.2 adds the first named guard function (`isNoteSlot`).

---

## (b) `HarmonySlotInput` local union in `src/core/codegen/strudel.ts`

**File:** `src/core/codegen/strudel.ts` (lines 20–22)

```typescript
type HarmonySlotInput =
  | ({ rootPc: number; qual: Quality; gain?: number | null; bars?: number } & ChordAttrs)
  | { isRest: true; bars?: number };
```

This is a **local union** (not exported) used as the parameter type of `melodyLine` and `buildSession`. It was deliberately separated from `ProgressionSlot` (in `state/session.ts`) to avoid importing Svelte-transitive dependencies into the pure-engine module.

**Does it need to grow for `NoteSlot`?** Yes. A third arm must be added:

```typescript
| { isNote: true; bars?: number /* + pitch field matching OD-1 resolution */ }
```

The structural type compatibility is maintained: callers pass arrays whose elements satisfy the expanded union. The `NoteSlot` from `session.ts` is a structural subtype of the new arm (no import of `session.ts` into `strudel.ts` is required).

---

## (c) `SavedHarmonySchema` progression union and `SESSION_SCHEMA_VERSION`

**File:** `src/lib/persistence.ts`

```
SESSION_SCHEMA_VERSION = 5   (line 19)
```

Current progression union (lines 96–103):

```typescript
const SavedHarmonySchema = z.object({
  ...
  progression: z.array(z.union([SavedRestSchema, SavedChordSchema])).max(16),
});
```

- `SavedRestSchema` (lines 91–94): `{ isRest: z.literal(true), bars? }`
- `SavedChordSchema` (lines 55–84): full chord object with all optional sound-attribute fields
- **Order:** `SavedRestSchema` first (ADR 0012 D4), so `{ isRest: true }` entries are never misidentified as chords

**Step 01.2 will:**
1. Add `SavedNoteSlotSchema` with `isNote: z.literal(true)` discriminant
2. Add it to the union: `z.union([SavedRestSchema, SavedNoteSlotSchema, SavedChordSchema])`
3. Bump `SESSION_SCHEMA_VERSION` from 5 to 6

---

## (d) `AgentOutputSchema` current slots and `SCHEMA_VERSION`

**File:** `src/agent/schema.ts`

```
SCHEMA_VERSION = 6   (line 28)
```

The agent schema version history (lines 15–27):
- v1 → v2: rest union added (ADR 0012)
- v2 → v3: `instrument?`, `room?`, `decay?` (ADR 0018)
- v3 → v4: preset + filter/envelope fields (ADR 0019)
- v4 → v5: `saveAsBlock?` (ADR 0021)
- v5 → v6: `musicalIntent?` (ADR 0023)

Current `HarmonyChordSchema` union (lines 192–199):
```typescript
export const HarmonyChordSchema = z.union([HarmonyRestSchema, HarmonyChordCoreSchema]);
// HarmonyRestSchema: { isRest: z.literal(true), bars? }
// HarmonyChordCoreSchema: full chord fields including all Phase 03 attributes
```

**Agent schema does NOT currently have a `NoteSlot` entry.** Whether it gains one depends on the OD-3 resolution (see below).

---

## (e) `onStagePointerDown` dispatch path in `src/render/tonnetz-scene.ts`

**File:** `src/render/tonnetz-scene.ts` (lines 455–469)

```typescript
export function onStagePointerDown(e: PointerEvent): void {
  const localX = e.offsetX;
  const localY = e.offsetY;

  for (const tri of _renderTris) {
    if (pointInTri(localX, localY, tri)) {
      pickChord(tri, get(sessionStore));  // ← only path
      return;
    }
  }
}
```

**`pickChord` (lines 480–569):** Appends a `Chord` object to `harmony.progression`, triggers a click-pulse, computes voice-leading via `minimalVoiceLeading`, and calls `requeueLive()`.

**Where note-mode branching would be inserted:** Inside the `for (const tri of _renderTris)` loop, after `pointInTri` succeeds, before `pickChord`:

```typescript
if (pointInTri(localX, localY, tri)) {
  if (state.harmony.noteMode) {
    pickNote(tri.rootPc);   // new path — reads rootPc from vertex
  } else {
    pickChord(tri, state);  // unchanged path
  }
  return;
}
```

`state` must be read at the top of the function (currently read inline inside the loop at `get(sessionStore)`). The `pickNote` function will call `addNote(tri.rootPc)` and skip voice-leading and click-pulse (a `NoteSlot` has no Tonnetz centroid representation).

**Key detail:** Each `RenderTri` carries `rootPc` (the pitch class of the triangle's root). The `tri.rootPc` is the vertex value needed for note-mode. There is no `tri.pc` for individual vertices — `rootPc` identifies the triangle root (not an individual vertex). If the intended behavior is "click a vertex and capture that vertex's pitch class," the hit-test must be against `_renderNodes` (vertex circles), not `_renderTris` (triangles). However, the phase spec says "clicks a Tonnetz vertex" — this may require testing against `_renderNodes`. The `RenderNode` carries `{ i, j, pc, x, y }` where `pc` is the vertex's pitch class. See OD-2 below for the interaction model recommendation.

---

## (f) Slot paint branches in `src/render/pentagrama-scene.ts`

**File:** `src/render/pentagrama-scene.ts`

The main `paint(ts)` loop dispatch (lines 763–938) iterates `progression.forEach((slot, idx) => { ... })` and contains this branching structure:

```
Line 784: if ('isRest' in slot && slot.isRest) {
             pRest(ctx, x, w, cy);
          } else {
             // Chord slot — type guard
             const chord = slot as Chord;
             if (chordMode === 'chord') {
               pChord(ctx, chord, x, w, H, ls, octave, isAct, ts);
             } else {
               pArp(ctx, chord, x, w, H, ls, octave, isAct, ts);
             }
             // ... hover, badge, selection chrome
          }
```

**Where `pNote` branch would live:**

```
if ('isNote' in slot && slot.isNote) {
  pNote(ctx, slot, x, w, H, ls, octave, isAct, ts);
} else if ('isRest' in slot && slot.isRest) {
  pRest(ctx, x, w, cy);
} else {
  // Chord slot
  ...
}
```

**Existing paint functions:**

- `pChord(ctx, slot, x, w, H, ls, octave, isAct, ts)` — 3 sustain bars + gemstone onset circles (lines 391–465)
- `pArp(ctx, slot, x, w, H, ls, octave, isAct, ts)` — per-note stagger within slot (lines 468–497 area)
- `pRest(ctx, x, w, cy)` — silence marker (lines 500–506 area)

**Helpers available for `pNote`:**
- `noteNameToMidi(name: string): number` — parse scientific notation → MIDI (lines 121–128)
- `m2p(midi: number): { pos: number; sh: boolean }` — MIDI → staff position (lines 137–144)
- `ny(pos, H, ls)` — staff position → canvas y (line 152–153)
- `ldg(ctx, pos, nx, H, ls)` — ledger lines (lines 274–300)
- `OR = 4.5` — onset circle radius constant (line 85)
- Accent color for `pNote` head: `#8aa0ff` (CLAUDE.md §guardrails)

**Active-slot spotlight (line 732):** Currently uses `!('isRest' in activeSlot && activeSlot.isRest)` to detect chords. This needs to be extended to handle `NoteSlot` (where spotlight should use accent color, which it already defaults to `'#8aa0ff'`).

---

## (g) Exhaustiveness audit — all files with `isRest` pattern-matches

All files where `'isRest' in slot` (or equivalent) is used and will need a `NoteSlot` arm:

### Files requiring `NoteSlot` arm addition

| File | Line(s) | Pattern | Action required |
|---|---|---|---|
| `src/state/session.ts` | 780, 828 | `!ch \|\| 'isRest' in ch` in `deriveLiveCode` and `requeueLive` | Add `NoteSlot` guard in the 'chord' source branch — a `NoteSlot` at end of progression should not be treated as a chord to re-emit via `chordToStrudel` |
| `src/state/session.ts` | 1226 | `'isRest' in slot` in `setChordInstrument` | No-op for `NoteSlot` (instrument on NoteSlot is a future-phase concern, but guard must be updated to not accidentally write chord fields) |
| `src/state/session.ts` | 1255 | `'isRest' in slot` in `setChordSoundAttrs` | Same as above |
| `src/state/session.ts` | 1288 | `'isRest' in slot` in `setChordPreset` | Same as above |
| `src/state/session.ts` | 1788–1793 | `'isRest' in slot` in `applyLoadedSession` narrowing | Add `NoteSlot` arm to correctly reconstruct `NoteSlot` objects from persisted blobs |
| `src/render/tonnetz-scene.ts` | 315 | `!('isRest' in last)` in `updateTonnetzDynamic` | `NoteSlot` also has no Tonnetz centroid — skip it like `RestSlot` |
| `src/render/tonnetz-scene.ts` | 510–511 | `!('isRest' in s)` in `pickChord` — find last chord | `NoteSlot` also has no chord representation — skip when searching for prev chord for voice-leading |
| `src/render/tonnetz-scene.ts` | 616, 660 | `'isRest' in ch` in `tickHarmony` progression loops | `NoteSlot` also has no Tonnetz centroid — skip similarly to `RestSlot` |
| `src/render/pentagrama-scene.ts` | 784 | `'isRest' in slot && slot.isRest` in `paint()` dispatch | Add `NoteSlot` branch before the rest branch |
| `src/render/pentagrama-scene.ts` | 732 | `!('isRest' in activeSlot && activeSlot.isRest)` in spotlight | Add `NoteSlot` guard — spotlight already defaults to accent color `#8aa0ff` which is correct for `NoteSlot` |
| `src/render/pentagrama-scene.ts` | 906 | `'isRest' in slot && slot.isRest` in selection chrome | `NoteSlot` needs its own selection chrome (or reuse rest chrome with note-specific label) |
| `src/core/harmony/voice-tracks.ts` | 204 | `'isRest' in slot` in `computeVoiceTracks` | `NoteSlot` should be treated similarly to `RestSlot` for voice-track purposes (it is a single note, not a triad; no voice-leading computation applies) |
| `src/core/harmony/staff-layout.ts` | 110 | `'isRest' in event` in layout dispatch | Only `VoiceRestEvent` carries `isRest`; this is VoiceTrack-level not ProgressionSlot-level. No change needed until `NoteSlot` creates a corresponding `VoiceNoteEvent` (future phase). |
| `src/core/composition/snapshot.ts` | 142, 242 | `'isRest' in slot && slot.isRest` in `captureArmoniaSnapshot` and `restoreArmoniaSnapshot` | Add `NoteSlot` arm — snapshots must round-trip `NoteSlot` entries |
| `src/agent/apply.ts` | 227–228 | `'isRest' in c && c.isRest === true` in `applyHarmony` | Add `NoteSlot` arm — agent may supply note entries if OD-3 resolves to Option A; otherwise no-op |
| `src/agent/autopilot.ts` | 103 | `'isRest' in slot` in progression filtering | Add `NoteSlot` arm — autopilot must pass `NoteSlot` entries through unchanged |
| `src/agent/agent.ts` | 367–368 | `'isRest' in ch` in progression serialization to prompt | `NoteSlot` should be serialized to the prompt similarly (e.g., `'♩' + noteName`) |
| `src/agent/agent.ts` | 678 | `'isRest' in c ? '–'` in progression summary | Add `NoteSlot` label (e.g., `'♩' + noteName` or `rootPc + 'pc'`) |
| `src/ui/ProgressionStrip.svelte` | 322, 388, 541 | `'isRest' in slot` in chip rendering | Add `NoteSlot` chip rendering branch |
| `src/ui/Header.svelte` | 281, 287, 294 | `'isRest' in selSlot` for sound controls visibility | `NoteSlot` does not support chord sound controls in Phase 01 — treat as not-a-chord |
| `src/lib/persistence.ts` | 291–297 | `'isRest' in slot` in `serialize` | Add `NoteSlot` arm to correctly serialize `NoteSlot` objects |
| `src/lib/persistence.ts` | 387–392 | `'isRest' in slot` in `deserialize` | Add `NoteSlot` arm |

**Files where `isRest` appears only in comments/docs/type definitions (no logic change needed):**
- `src/core/harmony/voice-tracks.ts` lines 36, 80: type field declarations
- `src/core/composition/snapshot.ts` line 69, 135: type field / comment
- `src/agent/schema.ts` lines 15, 127–132, 135: comments and schema definition (schema extended if OD-3 = Option A)
- `src/lib/persistence.ts` lines 87–89: comment only

---

## OD-1: Pitch-offset model

**Options:**
- **Option A:** `{ rootPc: number; octaveOffset: number }` — pitch class from the Tonnetz vertex, with octave expressed as an integer offset relative to `HarmonyState.octave`.
- **Option B:** `{ midiNote: number }` — absolute MIDI pitch 0–127.
- **Option C:** `{ noteName: string }` — e.g., `"C4"` (scientific notation string).

**Analysis against `HarmonyState.octave` and Strudel `note()` API:**

The `HarmonyState.octave` global (default 4) is already the anchor for chord voicings (`chordVoicing(rootPc, qual, octave)`). For consistency and UX coherence, a `NoteSlot` should live in the same "register universe" as the chords surrounding it on the staff.

- **Option A** is the most coherent with the existing architecture. When the user changes `HarmonyState.octave` (the key's global octave), chord slots automatically shift; with Option A, `NoteSlot` shifts with them because the absolute pitch is computed at render/codegen time. The note name is always `NOTE_NAMES[rootPc] + (HarmonyState.octave + octaveOffset)` — trivially recomputable without storing stale absolute names. The `octaveOffset` range `[-4, 4]` covers all musically useful positions. Codegen implication: `melodyLine` already receives `octave` as a parameter, so deriving `NOTE_NAMES[slot.rootPc] + (octave + slot.octaveOffset)` is one arithmetic operation with no new imports.
- **Option B** stores an absolute MIDI note, decoupling the slot from `HarmonyState.octave`. This is simpler for the codegen side (direct `midiToNoteName` lookup), but creating a dissonance: changing the global octave shifts chords but not notes, breaking the user's mental model that all harmony is in the same key/register. It also loses the connection to the pitch-class that was clicked on the Tonnetz vertex.
- **Option C** stores a pre-computed note name string. This is most direct for codegen (`note("C4")` uses the string verbatim), but suffers from the same decoupling problem as Option B when the global octave changes, and adds a string-parsing step if the pitch class or octave need to be recovered for the staff rendering.

**Codegen implications of each option:**
- Option A: `melodyLine` derives `noteName = NOTE_NAMES[slot.rootPc] + (octave + slot.octaveOffset)` inline. No new helpers needed. Sharp spellings are guaranteed because `NOTE_NAMES` uses sharp notation. Future `.s()`, `.gain()`, `.room()` chaining appends naturally to `note("${noteName}")`.
- Option B: `melodyLine` needs a `midiToNoteName(midiNote)` helper (not currently in core/codegen). The `noteNameToMidi` inverse is available in `pentagrama-scene.ts`, but it is in the render layer. A new `midiToNoteName` pure helper would need to be added to `src/core/theory/pitch.ts`. Future chaining is identical.
- Option C: codegen is trivially `note("${slot.noteName}")`. Future chaining is identical. But the noteName is frozen at the time of slot creation, which is wrong when `HarmonyState.octave` changes.

**Recommendation: Option A** (`{ rootPc: number; octaveOffset: number }`) — aligns with the `HarmonyState.octave` global, preserves Tonnetz vertex identity (rootPc is directly from the clicked vertex), enables the pitch-drag UX to operate in octave-offset space (natural for music), requires no new helpers in the core engine, and produces sharp-spelled note names consistent with `NOTE_NAMES`. The `NoteSlot` interface is visibly open to future extension (`instrument?`, `gain?`, `room?`, `decay?`, `lpf?`) parallel to the `Chord` interface.

---

## OD-2: Tonnetz interaction model

**Current routing:** `onStagePointerDown` (line 455) hits against `_renderTris` (triangles). The clicked triangle's `rootPc` is the root of the triad. A vertex (node) is shared by multiple triangles.

**Option A (HarmonyState.octave + vertex pc → note name):** Hit-test against `_renderNodes` (vertex circles) in addition to or instead of `_renderTris` when in note mode. Each `RenderNode` carries `{ i, j, pc, x, y }` where `pc` is the pitch class. The note name is then `NOTE_NAMES[node.pc] + HarmonyState.octave`. This is the direct interpretation of "click a Tonnetz vertex."

**Option B (auto-place on nearest free staff line):** Hit-test against triangles (existing machinery), derive the root `pc` from the triangle, then auto-place vertically on the nearest free staff line. This avoids adding node hit-testing but produces confusing UX (which vertex was clicked?).

**Routing analysis:**

The existing `onStagePointerDown` iterates `_renderTris` (14 lines of code). Adding a `_renderNodes` loop in note mode is straightforward:

```typescript
if (state.harmony.noteMode) {
  for (const node of _renderNodes) {
    const d = Math.hypot(localX - node.x, localY - node.y);
    if (d <= NODE_RADIUS) {         // NODE_RADIUS ≈ 13px (from buildTonnetz)
      pickNote(node.pc);
      return;
    }
  }
} else {
  for (const tri of _renderTris) {
    if (pointInTri(localX, localY, tri)) {
      pickChord(tri, state);
      return;
    }
  }
}
```

This separates note-mode and chord-mode paths cleanly.

**Recommendation: Option A** (hit-test `_renderNodes` in note mode). It correctly captures the pitch class of the clicked vertex (not the triangle root), is conceptually clean ("you clicked a note, you get that note"), and requires only ~10 lines of new code in `onStagePointerDown`. The default octave for the resulting `NoteSlot` is `HarmonyState.octave + octaveOffset: 0`, matching the global register.

---

## OD-3: Agent schema extension

**Option A:** Extend the agent schema with a `NoteSlotAgentSchema` and an optional `notes?: NoteSlotAgentSchema[]` field (or integrate into `HarmonyChordSchema` as a third union arm). Bump `SCHEMA_VERSION` from 6 to 7.

**Option B (Defer):** Do not extend the agent schema in Phase 01. The agent cannot generate `NoteSlot` entries until Option A is implemented.

**CLAUDE.md guardrail:** "The agent may only generate what the UI supports." After Phase 01, the UI will support `NoteSlot` — so CLAUDE.md's guardrail would technically permit Option A. However, the guardrail is a floor, not a ceiling: the agent can be restricted to a subset of what the UI supports.

**Analysis:**

Option A is more architecturally complete and prevents the agent from being a second-class citizen that cannot use the new feature. After Phase 01, a user could manually create `NoteSlot` entries but the autopilot/agent could not. This creates an asymmetry that will need to be resolved in a future phase anyway.

However, Option A adds significant scope to Phase 01:
- A new `NoteSlotAgentSchema` must be designed (how the agent refers to notes: by root + quality like chords, by MIDI, by name string?)
- The `superRefine` guard in `AgentOutputSchema` must be updated
- The `apply.ts` `applyHarmony` function must handle the new note entries
- The agent prompt (`agent.ts`) must explain note syntax to the LLM
- More tests required

Option B keeps Phase 01 focused on the model-persistence-codegen-render pipeline. The agent schema extension is a natural follow-on step and can be its own focused step or phase.

**Recommendation: Option B (defer).** Phase 01 already spans 6 steps (01.1–01.6). Adding full agent support would make the phase too broad and risk introducing defects in the existing agent pipeline. The `SCHEMA_VERSION` remains at 6 in Phase 01. The agent cannot yet generate `NoteSlot` entries; this is consistent with the incremental approach used in prior initiatives (RestSlot was not agent-supported at the time it was first added in Phase 06).

---

## Schema version bump

### `SESSION_SCHEMA_VERSION` — must bump

`SESSION_SCHEMA_VERSION` must bump from **5 to 6** in step 01.2, simultaneous with adding `SavedNoteSlotSchema` to the persistence union. The new slot variant in the `progression` array is a schema change. Old v5 blobs degrade gracefully: elements fail `SavedNoteSlotSchema` (no `isNote: true`) and parse as chords or rests as before.

### `SCHEMA_VERSION` (agent) — does NOT bump in Phase 01

If the Pilot resolves OD-3 to Option B (recommended): `SCHEMA_VERSION` stays at 6. No change to `src/agent/schema.ts` in Phase 01.

If the Pilot resolves OD-3 to Option A: `SCHEMA_VERSION` must bump to 7, and an ADR must be written before or during step 01.2.

---

## (h) Open decisions

### OD-1: Pitch-offset model

**Question:** Which pitch representation should `NoteSlot` use?

| Option | Type fields | Codegen derivation | Strudel flexibility |
|---|---|---|---|
| A (recommended) | `rootPc: number; octaveOffset: number` | `NOTE_NAMES[rootPc] + (octave + octaveOffset)` | Full — chaining `.s()`, `.gain()` etc. is additive |
| B | `midiNote: number` | `midiToNoteName(midiNote)` (new helper needed) | Full — same |
| C | `noteName: string` | Pass-through | Full — same |

**Recommendation:** Option A.

**Rationale:** Preserves the `HarmonyState.octave` anchor (note shifts with the key's octave globally); rootPc from the Tonnetz vertex is preserved for Tonnetz highlighting; no new helpers in core engine; sharp-spelled note names guaranteed by `NOTE_NAMES`.

### OD-2: Tonnetz interaction model

**Question:** In note mode, should clicking a Tonnetz vertex be hit-tested against vertex circles (`_renderNodes`) or triangles (`_renderTris`)?

| Option | Hit-test target | Pitch source | UX clarity |
|---|---|---|---|
| A (recommended) | `_renderNodes` (vertex circles) | `node.pc` | High — you click a note, you get that note |
| B | `_renderTris` (triangles) | `tri.rootPc` | Low — which vertex was intended? |

**Recommendation:** Option A — hit-test `_renderNodes` in note mode, using `node.pc` as the pitch class.

**Rationale:** The Tonnetz vertex is labeled with a note name; clicking it in note mode should yield that note's pitch class directly, not the triangle root.

### OD-3: Agent schema extension

**Question:** Should `src/agent/schema.ts` be extended with `NoteSlot` support in Phase 01, bumping `SCHEMA_VERSION` to 7?

| Option | Scope impact | Agent capability after Phase 01 | Recommended |
|---|---|---|---|
| A (extend) | High — schema, apply.ts, agent.ts, tests | Agent can generate NoteSlot entries | No |
| B (defer) | None | Agent cannot generate NoteSlot (asymmetry, deferred) | Yes |

**Recommendation:** Option B — defer agent schema extension to a follow-on phase.

**Rationale:** Phase 01 already spans 6 steps. Keeping the agent extension separate maintains focus and reduces blast radius.

---

## (i) Schema version bump recommendation

| Schema | Current version | Bump in Phase 01? | New value | Trigger |
|---|---|---|---|---|
| `SESSION_SCHEMA_VERSION` | 5 | Yes — step 01.2 | 6 | `NoteSlot` added to `progression` union |
| `SCHEMA_VERSION` (agent) | 6 | No (OD-3 = Option B) | 6 | No change if OD-3 deferred; bump to 7 if OD-3 = Option A |

---

## Files to be touched in subsequent steps

| Step | Files | Description |
|---|---|---|
| 01.2 | `src/state/session.ts` | Add `NoteSlot` interface, `isNoteSlot` guard, `addNote`, `setNoteOffset` store actions; expand `ProgressionSlot` union; update all exhaustive branches |
| 01.2 | `src/lib/persistence.ts` | Add `SavedNoteSlotSchema`; add to union; bump `SESSION_SCHEMA_VERSION` to 6 |
| 01.2 | `tests/note-placement/note-slot-model.test.ts` | New test file (6+ cases) |
| 01.3 | `src/core/codegen/strudel.ts` | Extend `HarmonySlotInput`; add NoteSlot branch in `melodyLine` |
| 01.3 | `tests/note-placement/codegen-note.test.ts` | New test file (6+ cases) |
| 01.4 | `src/state/session.ts` | Add `noteMode: boolean` to `HarmonyState`; add `setNoteMode` action |
| 01.4 | `src/render/tonnetz-scene.ts` | Branch on `noteMode` in `onStagePointerDown`; add `pickNote` |
| 01.4 | `src/ui/HarmonyPanel.svelte` (or equivalent) | Mode toggle button |
| 01.5 | `src/render/pentagrama-scene.ts` | Add `pNote` paint function; update `paint()` dispatch; add pitch-offset DOM control |

---

*Produced by read-only inventory pass. No source files were modified.*

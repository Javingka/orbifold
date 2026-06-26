# Decisions Register — note-placement

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Active decisions

### OD-1 — NoteSlot pitch model: `{ rootPc, octaveOffset }`

**Decision:** `NoteSlot` encodes pitch as `{ rootPc: number; octaveOffset: number }` — the pitch class (0–11) from the Tonnetz vertex, plus an integer offset relative to `HarmonyState.octave`. The absolute note name is derived at codegen/render time: `NOTE_NAMES[rootPc] + (HarmonyState.octave + octaveOffset)`. The `octaveOffset` range is `[-4, 4]`.
**Decided:** Phase 01 step 01.1, 2026-06-26
**Why:** Preserves the `HarmonyState.octave` anchor so a NoteSlot shifts with the key's global octave, same as chord slots. rootPc from the Tonnetz vertex is preserved for future Tonnetz highlighting. No new helpers needed in core/. Sharp-spelled note names guaranteed by `NOTE_NAMES`.
**Source:** Pilot resolution of OD-1 (Phase 01 inventory).
**Applies to:** `src/state/session.ts` `NoteSlot` interface; `src/core/codegen/strudel.ts` NoteSlot branch; `src/render/pentagrama-scene.ts` `pNote` paint function.

### OD-2 — Note-mode Tonnetz interaction: hit-test `_renderNodes`

**Decision:** In note mode, `onStagePointerDown` hit-tests against `_renderNodes` (vertex circles, each carrying `{ pc, x, y }`), NOT against `_renderTris`. `node.pc` is the pitch class of the clicked vertex.
**Decided:** Phase 01 step 01.1, 2026-06-26
**Why:** The Tonnetz vertex is labeled with a note name; clicking it in note mode should yield that note's pitch class directly, not the triangle root (`tri.rootPc`). Produces unambiguous UX.
**Source:** Pilot resolution of OD-2 (Phase 01 inventory).
**Applies to:** `src/render/tonnetz-scene.ts` `onStagePointerDown` note-mode branch.

### OD-3 — Agent schema extension: deferred

**Decision:** `src/agent/schema.ts` is NOT extended with `NoteSlot` support in Phase 01. `SCHEMA_VERSION` remains 6. Agent cannot generate `NoteSlot` entries after Phase 01; that is deferred to a follow-on phase.
**Decided:** Phase 01 step 01.1, 2026-06-26
**Why:** Phase 01 already spans 6 steps covering model, codegen, interaction, and render. Adding full agent schema extension (NoteSlotAgentSchema, apply.ts, agent.ts prompt, tests) would bloat the phase and risk defects in the existing agent pipeline.
**Source:** Pilot resolution of OD-3 (Phase 01 inventory).
**Applies to:** `src/agent/schema.ts`; `src/agent/apply.ts`; `src/agent/agent.ts`.

## Superseded decisions

(empty)

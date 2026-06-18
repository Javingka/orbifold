# Decisions Register — AI Composition Authoring

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Carried-forward rules (in force project-wide)

From `docs/editable-composition/decisions.md`:
- **`Block.code` is the canonical playback source; `Block.snapshot` is the editable source** (ADR 0020 D2/D3): any code that creates a block must populate both; `buildComposition` reads only `code`; `bpm` excluded from all snapshots.
- **`openBlock` is restore-only and never touches the transport** (ADR 0020 D6): restore-only, no auto-play, no bpm change, silent no-op on snapshot-less blocks.

From `docs/harmonic-rhythm-improvements/decisions.md` (still in force):
- **Staff vertical coordinate is diatonic, not chromatic** (ADR 0011 D3).
- **`PX_PER_CYCLE = 48` is a cross-module coordination point** (`time-map.ts` ⇄ `ProgressionStrip.svelte`).
- **`orbifold.lang` is the cross-surface language contract** (ADR 0017).

## Active decisions

_(none yet — first decisions expected from the Phase 01 discovery inventory + ADR)_

## Superseded decisions

_(none)_

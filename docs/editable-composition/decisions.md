# Decisions Register — Editable Composition

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Carried-forward rules (pending Pilot ratification at Checkpoint #1)

The three vigent decisions from `docs/harmonic-rhythm-improvements/decisions.md`
remain in force project-wide and apply here unchanged until the Pilot says otherwise:

- **Staff vertical coordinate is diatonic, not chromatic** (ADR 0011 D3).
- **`PX_PER_CYCLE = 48` is a cross-module coordination point** (`time-map.ts` ⇄ `ProgressionStrip.svelte`).
- **`orbifold.lang` is the cross-surface language contract** (ADR 0017).

Until ratified, treat the prior initiative's register as authoritative for these.

## Active decisions

### `Block.code` is the canonical playback source; `Block.snapshot` is the editable source

**Decision:** A `Block` carries **both** `code` (the Strudel string — canonical for playback; `buildComposition` reads only `code`) and an optional `snapshot` (the editable state captured at save time, for round-trip into the Ritmo/Armonía editors). Any code that creates or mutates a block **must keep the two consistent**: regenerate `code` from the same `SessionState` the snapshot captures, via the existing codegen path. `bpm` is **excluded** from all snapshot variants (it is transport, not harmonic/rhythmic content).
**Decided:** Phase 01 (editable-composition), 2026-06-18.
**Why:** Reverse-parsing Strudel `code` into editable state is brittle and unsupported (`@strudel/web` exposes no parser). Storing the editable state as the authoritative source while keeping `code` for playback preserves the byte-identical-at-default guarantee (A-01-06) and lets blocks round-trip losslessly. A future block-author (the agent) that writes `code` without a matching `snapshot` would produce a non-editable block — the inconsistency this rule forbids.
**Source:** `docs/adr/0020-block-as-state.md` D2/D3; `docs/editable-composition/inventories/phase-01-inventory.md`.
**Applies to:** `addBlock` (`src/state/session.ts`), `src/core/composition/snapshot.ts`, `src/core/composition/model.ts`, and any future agent-driven block authoring.

---

### `openBlock` is restore-only and never touches the transport

**Decision:** `openBlock(blockId)` restores a block's `snapshot` into the live session stores and switches the active view (groove → Ritmo; armonia/sesion → Armonía), but it **never auto-plays, never modifies `state.bpm`, and is a silent no-op on a block with no snapshot** (and on a missing block id). Any future feature that re-opens a block into the editors (AI composition authoring, AI jam mode) must preserve this contract.
**Decided:** Phase 01 (editable-composition), 2026-06-18.
**Why:** Transport stays under explicit user control — the kickoff §6 invariant "always make it obvious what is playing and how to stop it." Auto-playing on open, or silently changing tempo, would violate that and surprise the user mid-session.
**Source:** `docs/adr/0020-block-as-state.md` D6.
**Applies to:** `openBlock` (`src/state/session.ts`) and any future block-reopen path.

## Superseded decisions

_(none)_

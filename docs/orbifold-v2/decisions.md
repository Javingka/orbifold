# Decisions Register — Orbifold v2

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Active decisions

### Staff vertical coordinate is diatonic, not chromatic

**Decision:** In `src/core/harmony/staff-map.ts`, `steps` is a **diatonic** position (one unit per letter-name: C=0, D=1, E=2, … so C4=0, E4=2, G4=4, B4=6, D5=8, F5=10), NOT semitones. A note's vertical position is its natural-letter position; accidentals (`#`) are a separate flag that does **not** change `steps` (so F#3 and F3 share `steps`, and C#4 sits on the C4 line with a sharp). Staff lines are therefore equidistant (every 2 units) and ledger lines fall every 2 units (below: C4=0, A3=−2, F3=−4, D3=−6; above F5=10: A5=12, C6=14), making the `k -= 2` ledger walk correct.
**Decided:** Phase 05, 2026-06-11
**Why:** ADR 0011 D3 mandates a *real* treble-clef staff (pedagogical, "clave de sol"). A chromatic (semitone) vertical coordinate renders sharps off their natural line and spaces staff lines unevenly — that is a pitch-height/piano-roll view, not standard notation. Diatonic positioning fixes line spacing, sharp placement, and ledger lines together. (Resolves blocker `phase-05-blocker-staff-ledger-line-algorithm.md`, ESCALATE on step 05.4.)
**Source:** `docs/orbifold-v2/phases/phase-05.md` step 05.4; `docs/adr/0011-harmony-view-architecture.md` D3.
**Applies to:** `staff-map.ts` and all harmony-view rendering (Phases 07–08) that consume `StaffPosition`.

---

### PX_PER_CYCLE = 48 is a cross-module coordination point

**Decision:** The absolute pixels-per-cycle grid constant is `48` and is duplicated in `src/core/harmony/time-map.ts` (`PX_PER_CYCLE`) and `src/ui/ProgressionStrip.svelte`. The duplication is deliberate (the pure engine must not import a Svelte module). Any change to one **must** change the other in the **same commit**; the two values must never diverge.
**Decided:** Phase 05, 2026-06-11
**Why:** The linear harmony view (Phase 07) and the ProgressionStrip render the progression on the same horizontal timeline; a divergence would misalign the staff/playhead from the duration editor with no compile-time error to catch it. ADR 0011 Consequence 3 documents this; elevated to a vigent rule so future phases cannot silently change one constant.
**Source:** `docs/adr/0011-harmony-view-architecture.md` Consequence 3.
**Applies to:** `time-map.ts`, `ProgressionStrip.svelte`, and any future harmony-view layer rendering on the cycle grid.

## Superseded decisions

(empty)

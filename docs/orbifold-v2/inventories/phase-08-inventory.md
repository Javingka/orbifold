# Phase 08 Inventory

**Phase:** 08 — Harmony-view UX
**Date:** 2026-06-12
**Step:** 08.1

---

## (a) Confirmed Values Table

### STEP_PX, HALF_STEP_PX
- **Current value:** `STEP_PX = 10`, `HALF_STEP_PX = STEP_PX / 2 = 5`
- **Location:** `src/render/harmony-staff-scene.ts` lines 49–52
- **Planned change (step 08.4):** Increase `STEP_PX` to `16` (per ADR 0011 amendment target for legibility); `HALF_STEP_PX` becomes `8`. Value to be confirmed in ADR amendment at step 08.2.

### staffBaseY formula (current)
- **Current formula:** `_staffBaseY = app.screen.height - 60`
- **Location:** `src/render/harmony-staff-scene.ts` line 248
- **Planned change (step 08.4):** Center the staff — step 6 (B4, middle staff line) at canvas center:
  `staffBaseY = app.screen.height / 2 − (6 * HALF_STEP_PX)`
  With `HALF_STEP_PX = 8`, this becomes `staffBaseY = height / 2 − 48`.

### PX_PER_CYCLE locations (vigent coordination-point rule)
- **`src/core/harmony/time-map.ts`** — exported constant `PX_PER_CYCLE = 48` (imported by `harmony-staff-scene.ts` line 39; confirmed in decisions.md).
- **`src/ui/ProgressionStrip.svelte`** — local `const PX_PER_CYCLE = 48` at line 117. This is the deliberate duplication as a coordination point (ADR 0011 Consequence 3). These two constants must never diverge and any change must happen in the same commit.

### harmonyLayer child list (current, from `stage.ts`)
All seven Tonnetz objects are added **directly** to `harmonyLayer` (not inside a sub-container) in `stage.ts` line 104:
```
harmonyLayer.addChild(hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels)
```
Add order (prototype-preserved): hGrid → hPath → hDyn → hNRG → hNodes → hNRL → hLabels.

The four staff scene objects are added **directly** to `harmonyLayer` in `buildHarmonyStaffScene` (`harmony-staff-scene.ts` lines 267–270):
```
harmonyLayer.addChild(_staffGfx)
harmonyLayer.addChild(_accidentalContainer)
harmonyLayer.addChild(_clefText)
harmonyLayer.addChild(_dynGfx)
```

**Step 08.5 will introduce `_tonnetzContainer` and `_staffContainer` sub-containers** inside `harmonyLayer` and migrate these children accordingly.

### Octave-derivation formula (the register-jump cause)
- **Location:** `src/core/harmony/voice-tracks.ts` line 176
- **Formula:** `const noteOctave = octave + Math.floor((ch.rootPc + iv) / 12);`
- **Root cause of register jumps:** This formula computes the octave absolutely from the base `octave` parameter, independent of the previous voice note. When adjacent chords have large rootPc or interval differences, the expression `(ch.rootPc + iv) / 12` can cross an integer boundary and shift the voice by one octave, causing a sudden visual jump on the staff.
- **The `suavizado` mode fix (step 08.3):** For each voice on chord `i > 0`, compute the candidate at the `estricto` octave, then also consider the candidate one octave above and one octave below. Pick the closest (by semitone distance) to the previous note for that voice. Ties (exactly ±6 semitones) go to the lower octave.

---

## (b) Audio-path Isolation Verdict

**VERDICT: NO — `computeVoiceTracks` output does NOT reach audio codegen.**

Evidence (file citations):

1. **`src/core/harmony/voice-tracks.ts`** exports `computeVoiceTracks`, which returns `VoiceTrack[]` (arrays of `VoiceEvent | VoiceRestEvent`). These types contain note names and diatonic staff positions; they are NOT Strudel pattern strings.

2. **`src/render/harmony-staff-scene.ts`** line 251:
   ```ts
   const tracks = computeVoiceTracks(state.harmony.progression, state.harmony.octave);
   ```
   The result `tracks` is passed to `computeStaffLayout(tracks, PX_PER_CYCLE)` (line 252), which returns `StaffLayout` — a purely visual descriptor (note-head pixel coordinates, accidentals, ledger lines, rest glyphs). `StaffLayout` is then passed to `drawStaticStaff` and `drawAccidentals`, both PIXI rendering functions. No audio function is called with `tracks` or `_layout`.

3. **`src/core/harmony/staff-layout.ts`** — `computeStaffLayout` consumes `VoiceTrack[]` and returns `StaffLayout`. It has no audio imports; the module header explicitly states it is a pure engine with no DOM/PIXI/Svelte imports, consumed only by `harmony-staff-scene.ts`.

4. **`src/state/session.ts`** — the audio codegen path for harmony is `melodyLine` (line 291 in `harmonyCode`, line 468 in `deriveLiveCode`). `melodyLine` is imported from `src/core/codegen/strudel.ts` (line 40) and is called with `state.harmony.progression`, `state.chordMode`, and `state.harmony.octave` — NOT with `VoiceTrack[]`. The `melodyLine` function (in `strudel.ts` lines 83–126) calls `chordVoicing` directly from `src/core/theory/chords.ts`, entirely bypassing `voice-tracks.ts`.

5. **`src/core/codegen/strudel.ts`** — `melodyLine` (line 83) and `chordToStrudel` (line 54) both call `chordVoicing`. Neither function accepts a `VoiceTrack[]` argument, and neither imports from `voice-tracks.ts`. There is no import of `voice-tracks.ts` anywhere in `src/core/codegen/`.

6. **Grep confirmation:** `voice-tracks.ts` is imported in exactly two files:
   - `src/render/harmony-staff-scene.ts` (visual consumer)
   - `src/core/harmony/staff-layout.ts` (pure engine, visual pipeline)
   Neither feeds into Strudel audio codegen.

**Consequence for Phase 08:** The `registerMode` parameter in step 08.3 controls only the octave-assignment in `computeVoiceTracks`. Since this output is visual-only, changing the register mode is a **visual-only change** — it does NOT alter the Strudel pattern string sent to the audio engine. Audio output is byte-identical regardless of `registerMode`. This is the invariant the ADR 0011 amendment (step 08.2) must state explicitly.

---

## (c) Open Questions (Pre-Resolved by Pilot)

All three open decisions flagged by the Planner in the phase-08 scoping have been pre-resolved by the Pilot (Javier) on 2026-06-12, as recorded in `docs/orbifold-v2/phases/phase-08.md` §"Pilot decisions":

| # | Question | Resolution | Binding since |
|---|---|---|---|
| OQ-1 | Default `harmony.subview` | `'tonnetz'` (preserves Phase 07 reversibility; user sees Tonnetz on load) | phase-08.md pre-resolution |
| OQ-2 | Default `harmony.registerMode` | `'suavizado'` (smooth contour default, friendly for free music-making) | phase-08.md pre-resolution |
| OQ-3 | `marco` button placement | Top bar, alongside relocated `acorde/arpegio` control (step 08.6); canvas fully freed | phase-08.md pre-resolution |

These are **RESOLVED**. Steps 08.5 and 08.6 use these values directly without re-asking.

---

## (d) Tonnetz Sub-container Design Decision (for step 08.5)

### Current state (before step 08.5)
All seven Tonnetz children (hGrid, hPath, hDyn, hNRG, hNodes, hNRL, hLabels) are direct children of `harmonyLayer`. The four staff children (_staffGfx, _accidentalContainer, _clefText, _dynGfx) are also direct children of `harmonyLayer`. There are no sub-containers today.

### Required for step 08.5
The phase-08 spec mandates two child containers inside `harmonyLayer`:
- `_tonnetzContainer` — holds the seven Tonnetz objects in their existing relative order.
- `_staffContainer` — holds the four staff scene objects in their existing build order.

### Design constraints to respect
1. **Z-order preservation:** The seven Tonnetz children must retain their exact relative order within `_tonnetzContainer` (hGrid is lowest, hLabels is topmost). Staff children retain their build order (_staffGfx → _accidentalContainer → _clefText → _dynGfx) inside `_staffContainer`.
2. **Mutual exclusion:** `setHarmonySubview(subview)` sets exactly one container visible and the other hidden. Default: `_tonnetzContainer.visible = true`, `_staffContainer.visible = false`.
3. **`setView` unchanged:** The existing `setView('harmony')` / `setView('rhythm')` API at `stage.ts` line 138 toggles `harmonyLayer.visible` — this must not change.
4. **`getStageRefs()` extended:** Must export `tonnetzContainer` and `staffContainer` on the `StageRefs` interface.
5. **`buildHarmonyStaffScene` updated:** Must add staff objects to `refs.staffContainer` instead of `refs.harmonyLayer`. The existing removal logic must also target `staffContainer`.
6. **Tonnetz scene untouched:** `tonnetz-scene.ts` calls `getStageRefs()` and uses `refs.hGrid`, `refs.hPath`, etc. These refs still exist and still point to the same Graphics objects — they just live inside `_tonnetzContainer` now. No changes to `tonnetz-scene.ts` are needed unless the hGrid/hPath/etc. refs are added to it via `harmonyLayer` indirectly; they are not — they are accessed by direct module-level variable reference via `getStageRefs()`.

---

## Files Touched per Step

### Step 08.3 — `voice-tracks.ts` revision + tests
| File | Change |
|---|---|
| `src/core/harmony/voice-tracks.ts` | Add `RegisterMode` type; add `registerMode` param to `computeVoiceTracks` (default `'suavizado'`); implement both modes |
| `tests/harmony/voice-tracks-register.test.ts` | New test file: estricto/suavizado behavior, rest passthrough, default param |

### Step 08.4 — Central staff + cyclic playhead
| File | Change |
|---|---|
| `src/render/harmony-staff-scene.ts` | Increase `STEP_PX` to ADR-confirmed value; update `staffBaseY` formula; replace clamp with modulo playhead |

### Step 08.5 — Sub-toggle (stage + store + Header)
| File | Change |
|---|---|
| `src/render/stage.ts` | Add `_tonnetzContainer`, `_staffContainer`; migrate children; export via `StageRefs`; add `setHarmonySubview` |
| `src/render/harmony-staff-scene.ts` | Use `refs.staffContainer` instead of `refs.harmonyLayer` for add/remove |
| `src/state/session.ts` | Add `subview` and `registerMode` to `HarmonyState`; add `setHarmonySubview` and `setRegisterMode` actions |
| `src/ui/Header.svelte` | Add Tonnetz⇄Pentagrama seg control and register-mode seg control inside harmony `{#if}` block |

### Step 08.6 — Relocate acorde/arpegio + ProgressionStrip cursor
| File | Change |
|---|---|
| `src/ui/Header.svelte` | Add chord-mode seg and marco button inside harmony `{#if}` block (after sub-toggle/register controls) |
| `src/ui/HarmonyControls.svelte` | Remove chord-mode seg and marco button; evaluate whether component can be removed or left as empty shell |
| `src/ui/ProgressionStrip.svelte` | Add rAF-driven cursor div (absolute, white 1px line) using `getVisualPhaseAnchor()` and `PX_PER_CYCLE` local const |

### Step 08.7 — Quality gates
No source changes; runs quality gate commands and records evidence.

### Files explicitly NOT modified (any phase step)
| File | Reason |
|---|---|
| `src/lib/persistence.ts` | `subview` and `registerMode` are ephemeral UI state; not persisted |
| `src/agent/schema.ts` | Same reason; agent schema is version-gated and not involved in ephemeral view state |
| `src/core/harmony/staff-layout.ts` | Visual-only consumer of `voice-tracks.ts`; no change needed for register mode |
| `src/core/harmony/staff-map.ts` | Diatonic coordinate system unchanged |
| `src/core/harmony/time-map.ts` | `PX_PER_CYCLE` unchanged |
| `src/render/tonnetz-scene.ts` | Accesses stage refs by name; refs still exist after sub-container split |

---

## Existing Behavior to Preserve

- With `subview === 'tonnetz'` (default), harmony view is byte-identical to Phase 07 delivery.
- `PX_PER_CYCLE = 48` must remain in sync between `time-map.ts` and `ProgressionStrip.svelte`.
- All existing ProgressionStrip interactions (gain drag, resize, tap-to-preview, rest slots, add buttons) unchanged.
- `setView('harmony')` / `setView('rhythm')` API unchanged.
- No existing callers of `computeVoiceTracks(progression, octave)` (two-arg form) break — the default `registerMode = 'suavizado'` makes the two-arg call equivalent to the explicit `'suavizado'` call.
- AGPL-3.0 headers must remain on all modified files.

---

## New Behavior to Introduce

1. **Register mode engine** (`estricto` vs `suavizado`) in `voice-tracks.ts`.
2. **Central staff geometry** (STEP_PX increased; staffBaseY centered) in `harmony-staff-scene.ts`.
3. **Cyclic playhead** (modulo loop width, handles negative rawX) in `harmony-staff-scene.ts`.
4. **Sub-containers** (`tonnetzContainer`, `staffContainer`) in `stage.ts`.
5. **`subview` and `registerMode` fields** in `HarmonyState` (ephemeral, not persisted).
6. **Tonnetz⇄Pentagrama and register-mode controls** in `Header.svelte`.
7. **`acorde/arpegio` + `marco` relocated** to `Header.svelte`; removed from `HarmonyControls.svelte`.
8. **ProgressionStrip cursor** — rAF-driven, looping with progression.

---

## Tests to Add or Modify

- **New:** `tests/harmony/voice-tracks-register.test.ts` (step 08.3) — 4 test scenarios listed in phase spec.
- **Possibly modified:** Any existing session.ts tests that check `HarmonyState` shape may need updating if the new `subview`/`registerMode` fields cause a shape mismatch (step 08.5).
- No other existing tests are expected to break; the sub-container split is transparent to `tonnetz-scene.ts` since it accesses refs by name.

---

## Current Test Count Baseline

**361 tests passing** (12 test files) as of branch `orbifold-v2/phase-05` tip (confirmed by `pnpm exec vitest run` output). Phase 08 must finish with ≥ 361 + new test count (minimum 4 new tests from step 08.3).

---

## New Dependencies

None required. All implementation uses existing PIXI v7, Svelte, and TypeScript in the project.

---

## Environment / CI / Build / Deployment Changes

None required.

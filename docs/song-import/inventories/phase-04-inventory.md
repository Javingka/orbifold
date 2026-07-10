<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 Inventory — Song-Import Closing Polish: Manual Chord-Quality Placement + Latency Offset Recalibration

**Step:** 04.1 — Read-only inventory
**Date:** 2026-07-10
**Branch:** `song-import/phase-02`
**Status:** STOP — awaiting Pilot resolution of OD-8, OD-9, and OD-10 before steps 04.2/04.3 can begin.

This inventory is read-only. No source file was modified while producing it (verified in §(h) and confirmed again at the end of this document via `git status`/`git diff`).

---

## (a) `setChordQuality` design

### Confirmed: `Quality` is already imported in `session.ts`

`src/state/session.ts` line 32: `import type { Quality } from '../core/theory/chords.js';`. The `Chord` interface (line 152–154) already carries `qual: Quality`. **No new import needed.**

### Guard pattern mirrored from `setChordPreset` (lines 1420–1437)

`setChordPreset` (and identically `setChordInstrument`, `setChordSoundAttrs`) follows: range guard → `slot === undefined || 'isRest' in slot || isNoteSlot(slot)` guard → `.map` update → `requeueLive()`. `setChordQuality` mirrors it exactly:

```typescript
/**
 * Set the quality (maj/min/dim/aug/pow) for the chord slot at `index`.
 *
 * Updates `progression[index].qual` and calls `requeueLive()` so a running
 * harmony engine picks up the change at the next cycle boundary. Has no
 * effect if `index` is out of range or points to a rest slot / NoteSlot.
 *
 * The only setter that changes a slot's *musical identity* rather than a
 * sound/timing attribute — `qual` drives codegen (chordToStrudel), voice-track
 * rendering, and Pentagrama color, all of which already handle all five
 * qualities uniformly (see below). Does NOT touch Tonnetz triangle logic
 * (OD-2 invariant) — a slot's qual changing has no effect on which triangles
 * exist on the grid.
 *
 * Introduced in Phase 04 (song-import) step 04.2 — OD-8/OD-9.
 *
 * @param index - Zero-based progression slot index.
 * @param qual  - New quality ('maj' | 'min' | 'dim' | 'aug' | 'pow').
 */
export function setChordQuality(index: number, qual: Quality): void {
  sessionStore.update((s) => {
    if (index < 0 || index >= s.harmony.progression.length) return s;
    const slot = s.harmony.progression[index];
    if (slot === undefined || 'isRest' in slot || isNoteSlot(slot)) return s;
    const updated: Chord = { ...slot, qual };
    const progression: ProgressionSlot[] = s.harmony.progression.map((ch, i) =>
      i === index ? updated : ch
    );
    return { ...s, harmony: { ...s.harmony, progression } };
  });
  requeueLive();
}
```

Placement: alongside the other per-slot chord setters (`setChordBars` at line 1334, `setChordInstrument` at 1359, `setChordSoundAttrs` at 1386, `setChordPreset` at 1420, `setChordOscillator` at 1452) — i.e. immediately after `setChordOscillator` (~line 1456) is a natural insertion point.

### Confirmed: codegen, voice-track rendering, and Pentagrama render already handle all five qualities — zero changes required

| Consumer | File | Evidence |
|---|---|---|
| Codegen | `src/core/codegen/strudel.ts` `chordToStrudel` (lines 83–94) | Calls `chordVoicing(rootPc, qual, octave)` (`src/core/theory/chords.ts` lines 71–77), which does `QUAL_INTERVALS[qual].map(...)` — generic over any `Quality`, any interval-array length. `dim`/`aug` (3 voices) and `pow` (2 voices, per OD-1) both flow through the identical `notes.join(',')` path (comment at strudel.ts lines 76–79 confirms this was already proven byte-identical in Phase 01). **No change needed for `dim`/`aug` — they were already valid `Quality` members with 3-element `QUAL_INTERVALS` entries since Phase 01** (`chords.ts` lines 21–27: all five qualities defined together). |
| Voice-track rendering (visual only, ADR 0011 D6 — never reaches audio) | `src/core/harmony/voice-tracks.ts` lines 236–257 | `dim`/`aug` fall through to the generic 3-voice path (`chordPcs(ch.rootPc, ch.qual) as [number,number,number]`, line 259) — no guard needed, they always had 3 voices. Only `pow` (2 voices) needed — and already has (lines 246–257) — a guard that emits rest events on all 3 visual voice tracks without disturbing `prevPcs`/`prevMidi` continuity. |
| Pentagrama render (color fallback) | `src/render/pentagrama-scene.ts` — `dmap` (diatonic lookup) miss → `?? '#8aa0ff'` fallback at lines 434, 532, 565, 876, 882, 939, 1002 | Any `(rootPc, qual)` pair not present in the diatonic map (`dia[key]` in `tonnetz.ts` — built only from `maj`/`min` triangle keys) falls through to the accent color `#8aa0ff`. This already covers `dim`/`aug`/`pow` uniformly — confirmed by OD-2 (Phase 01) for `pow` specifically, and the same fallback mechanism applies verbatim to `dim`/`aug` since neither is ever a key in `dia`. |

**Conclusion: `setChordQuality` is a pure, additive state setter. No codegen, voice-track, or render file needs modification in step 04.2** — the phase file's own claim (line 115: "Do NOT touch codegen or render") is confirmed correct by this trace.

---

## (b) Header UI insertion point + i18n audit

### Confirmed location and always-rendered status

The `.sound-ctl` panel lives in `src/ui/Header.svelte` lines 800–834, inside the `{#if $sessionStore.view === 'harmony'}` block that opens at line 674 and closes at line 835. **It is always rendered in Harmony view** — presence does not depend on `$selectedSlotIdxStore`. What *does* change reactively on selection:

- `class:sound-ctl--active={$selectedSlotIdxStore !== null}` (line 802) — persistent accent border while a slot is selected.
- `class:sound-ctl--pulse={soundCtlPulsing}` (line 803) — a transient ~320ms flash on selection change (reactive block, lines 303–318).
- The `title` tooltip (lines 804–806) switches between `soundEditTip` and `soundIntentTip`.
- `displaySound` (lines 291–295) — the `<select>`'s bound value — reads from the selected slot when one is selected, or from `$soundIntentStore` (a module-level "what new chords will get" default) otherwise.

This "always visible, edit vs. intent" pattern exists **because timbre has a meaningful intent concept**: a newly-placed chord (via Tonnetz click) needs *some* default oscillator/preset, and `$soundIntentStore` supplies it (`handleSoundChange`, lines 325–348, writes to `soundIntentStore` unconditionally, and additionally to the selected slot's fields only `if ($selectedSlotIdxStore !== null && selIsChord)`).

### Recommendation: quality control should be **edit-only** (disabled/hidden when `$selectedSlotIdxStore === null`), not the always-visible intent pattern

**Rationale (one sentence):** Unlike timbre, chord quality has no meaningful "intent for the next chord" — every new chord is created by a Tonnetz vertex/triangle click, which is hard-wired to produce `maj`/`min` (OD-2; `mkTri` call sites at `tonnetz.ts` lines 124 and 129 pass only those two literals), so there is no sensible default quality to preview or pre-select when nothing is selected, and an always-editable control with no target would be dead/misleading UI.

This is a recommendation for the Pilot to confirm alongside OD-8 — the phase file's Option A (Header selected-slot control) does not by itself dictate always-visible vs. edit-only; that is a second, independent design axis this inventory surfaces.

### Full i18n key list (mirrors `soundLabel`/`instrSawtooth` convention at `types.ts` lines 108, 112–127 and `es.ts` lines 90–104)

Reuse note: `chordLabel` (`src/core/theory/chords.ts` lines 50–55) already has a display-suffix convention (`m` for min, `°` for dim, `+` for aug, `5` for pow, none for maj) available for reuse as compact visual symbols on the control (e.g. button-group glyphs) — an alternative to full-word `<option>` labels. This is a Pilot call at OD-8 resolution time (symbol buttons vs. `<select>` with words), not decided here.

Proposed new keys (added to `src/i18n/types.ts` **and** all four locale files `en.ts`, `es.ts`, `pt.ts`, `zh.ts` — **`es.ts` is the key-parity base**, see §(h) note on `tests/i18n/key-parity.test.ts`):

| Key | Purpose | Technical token (VERBATIM, not translated) |
|---|---|---|
| `qualityLabel` | Control's label (mirrors `soundLabel: 'timbre'`) | — |
| `qualityMaj` | Display label for `'maj'` | `maj` stays in `value` attr |
| `qualityMin` | Display label for `'min'` | `min` |
| `qualityDim` | Display label for `'dim'` | `dim` |
| `qualityAug` | Display label for `'aug'` | `aug` |
| `qualityPow` | Display label for `'pow'` (e.g. "Power chord") | `pow` |
| `qualityEditTip` | Tooltip shown when a slot is selected (mirrors `soundEditTip`) | — |
| `qualityDisabledTip` | Tooltip/aria explaining why the control is disabled when no slot is selected (only needed if the Pilot confirms the edit-only recommendation above) | — |

7–8 new keys × 5 files (types.ts + 4 locales) = up to 40 lines. Per OQ-6/ADR 0017, the technical quality tokens (`maj`/`min`/`dim`/`aug`/`pow`) stay `[VERBATIM]` in `value` attributes — only the display-label strings above are localized.

---

## (c) Playhead consumer census

`grep -rn "getVisualPhaseAnchor" src/ tests/` returns:

| File | Line | Usage |
|---|---|---|
| `src/state/phase-anchor.ts` | 19 | Declaration (`export function getVisualPhaseAnchor()`) |
| `src/ui/ProgressionStrip.svelte` | 109 | Import |
| `src/ui/ProgressionStrip.svelte` | 195 | `const rawX = ((now - getVisualPhaseAnchor()) / barMs) * PX_PER_CYCLE;` |
| `src/render/rhythm-scene.ts` | 20 | Import |
| `src/render/rhythm-scene.ts` | 323 | `const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs;` |
| `src/render/pentagrama-scene.ts` | 81 | Import |
| `src/render/pentagrama-scene.ts` | 223 | `const elapsedMs = performance.now() - getVisualPhaseAnchor();` |
| `src/render/pentagrama-scene.ts` | 1232 | `const rawX = ((performance.now() - getVisualPhaseAnchor()) / barMs) * PX;` |
| `src/render/tonnetz-scene.ts` | 27 | Import |
| `src/render/tonnetz-scene.ts` | 665 | `const phase = ((now - getVisualPhaseAnchor()) % barMs) / barMs;` |
| `src/render/tonnetz-scene.ts` | 716 | `activeIdx = Math.floor((now - getVisualPhaseAnchor()) / barMs) % prog.length;` |

**Exact count: FOUR consumer files** — `ProgressionStrip.svelte`, `rhythm-scene.ts`, `pentagrama-scene.ts`, **and `tonnetz-scene.ts`**, across 6 usage expressions (not counting imports). **The phase file's architecture-constraints section (line 29) names only three** (`pentagrama-scene.ts`, `ProgressionStrip.svelte`, `rhythm-scene.ts`) — `tonnetz-scene.ts` is a fourth consumer the brief did not name. This matters directly for step 04.3's validation A-04-22 ("no playhead-consumer render file is modified") — the Dev must check `tonnetz-scene.ts`'s diff too, not just the three named files.

**Centralization confirmed:** every usage reads `getVisualPhaseAnchor()` directly and combines it only with locally-computed `now`/`barMs`/`PX_PER_CYCLE` — none of the four files caches its own offset or maintains per-consumer latency state. A correction to `_anchorMs` (via `anchorVisualPhase(offsetMs)`) in `phase-anchor.ts` propagates automatically to all four without any render-file change, confirming Win B is provably centralized in `phase-anchor.ts`/`strudel.ts` per the phase file's architecture constraint (line 29).

---

## (d) `Cyclist.latency` technical verdict — hard prerequisite for OD-10

### Verdict

**`Cyclist.latency` (the `_scheduler.latency` field, default `0.1` s / 100 ms) DOES shift the actual Web-Audio-scheduled trigger time of every hap forward by exactly that amount. It is NOT a purely internal scheduling-buffer detail with no audible effect.** The existing JSDoc in `src/state/phase-anchor.ts` (lines 36–40) and the identical reasoning previously recorded in the archived `orbifold-v2` Phase 04 inventory (`docs/_archive/orbifold-v2/inventories/phase-04-inventory.md` §6) are **factually incorrect** — both assert this without tracing Strudel's actual scheduling source; this inventory's trace (below, against the pinned `@strudel/web@1.0.3` bundle) contradicts them directly.

### Evidence trail (all citations against `node_modules/@strudel/web/dist/index.mjs`, the pinned `@strudel/web@1.0.3` bundle)

1. **`Cyclist` class (minified as `ji`), constructor, line 3545:** `constructor({ interval: t, onTrigger: u, ..., getTime: i, latency: s = 0.1 })` — `latency` defaults to `0.1` (seconds). Line 3546: `this.latency = s`. This is the exact property our app's `strudel.ts` calls `_scheduler.latency` (OD-10 Option A).

2. **Per-tick callback, lines 3549–3562** (inside the `Cyclist` constructor, run on every scheduler tick):
   ```javascript
   const f = i(), d = this.lastEnd;        // f = getTime() = AudioContext.currentTime "now"
   ...
   const M = this.pattern.queryArc(d, D, { _cps: this.cps }), y = c - f;  // y = lookahead-to-tick gap
   M.forEach((b) => {
     if (b.part.begin.equals(b.whole.begin)) {
       const S = (b.whole.begin - d) / this.cps + y + s, k = b.duration / this.cps;
       u?.(b, S, k, this.cps);   // u = onTrigger
     }
   });
   ```
   `s` (`this.latency`) is summed **directly and unconditionally** into `S`, the deadline-offset value passed to `onTrigger` for every hap. `s` is distinct from `y` (the tick's own natural scheduling gap) — it is an *additional* forward push, not something `y` already absorbs.

3. **`webaudioScheduler` (minified `Ho`), lines 5465–5476** — the exact function our `strudel.ts` calls (`_scheduler = webaudioScheduler();`, `strudel.ts` line 148, no options): wires `onTrigger: zi({ defaultOutput: t, getTime: u })`, where `defaultOutput` = `webaudioOutput` (`Wo`, line 5461) = `(hap, t, u) => dr(Go(hap), t, u)` — `dr` is **`superdough`**, the actual sound-trigger function.

4. **`superdough` (minified `dr`), line 4967, line 4975:** `let r = n.currentTime + t` — `n = ye()` = the live `AudioContext`, `t` is the incoming deadline-offset (our `S`, which already contains `+ s`). So **`r` = `AudioContext.currentTime` + (cycle-position offset) + (tick lookahead `y`) + (`Cyclist.latency`, `s`)** — an absolute future `AudioContext` timestamp.

5. **`r` flows to the native Web Audio scheduling call for BOTH sound-source types:**
   - **Sample playback** — `onTriggerSample` (minified `xo`), line 4806 (`e` param = `r`), line 4832: `const W = e + l` (nudge), then (confirmed via direct read, `awk 'NR==4806,NR==4900'`): `N.start(W, L)` — the literal `AudioBufferSourceNode.start(when, offset)` call.
   - **Synth oscillators** (`registerSynthSounds`, minified `To`, lines 5202–5238; the sound-play callback receives `t` = `r`) → `getOscillator` (minified `Lo`), line 5274: `k.start(t)` — the literal `OscillatorNode.start(when)` call.

6. **Corroborating evidence at line 5059–5062** (inside `superdough`/`dr`): `if (n.currentTime > r) { iu("[webaudio] skip hap: still loading", ...); return; }` — the hap is **dropped entirely** if `r` (the deadline that includes `+ s`) has already passed by the time this async code runs. This treats `r` as a hard, literal future deadline — not a "buffering" abstraction — reinforcing that `s` is part of the real scheduled trigger instant.

### Interpretation

`.start(when)` is the browser's native Web Audio API primitive that determines the exact moment a sound source begins producing audio, propagating to the speakers after only the hardware output path (`outputLatency + baseLatency`) — which is *downstream* of, and additive with, this deadline. Since `Cyclist.latency` is summed into `when` for every hap, it delays the actual audible onset of every hap by exactly that amount, on top of whatever hardware latency further adds. This is precisely the kind of **fixed (non-progressive)** offset Win B targets — `s` is a constant set once at scheduler construction (never mutated afterward; confirmed no other write to `this.latency` in the class body, lines 3544–3599) — so it does not itself cause progressive drift, only a constant one-time gap between "pattern-time zero" (evaluate-time) and "the moment its downbeat is actually audible."

### Disambiguation (avoids a common confusion point)

`ym`'s own internal lookahead parameter (default `r = 0.1`, `ym` signature line 3527: `function ym(e, t, u = 0.05, n = 0.1, r = 0.1)`) is a **different constant** from `Cyclist.latency` (`s`), even though both default to `0.1`. `ym`'s `r` only controls *when the periodic `setInterval` callback fires* relative to `getTime()` (i.e., how far ahead ticks are pre-computed) — it is absorbed into `y` in step 2 above and does not separately appear in the final deadline formula. `Cyclist.latency` (`s`) is the term this inventory (and OD-10) is about; it is summed **in addition to** `y`.

### Consequence for OD-10

This verdict makes **Option A (or C)** technically sound: `measureLatencyOffsetMs` should include `schedulerLatencySec * 1000` (reading `_scheduler.latency`) to correctly account for this additional forward shift, exactly as OD-10 Option A proposes. **Option B alone (adjust the manual knob's default) remains viable as a fallback the Pilot could still choose**, but per the phase file's own framing (line 65), it "hides the root cause inside a manual value" rather than fixing the measured formula — now that the root cause is confirmed real and precisely quantifiable (a constant `_scheduler.latency` seconds, default 100 ms), Option A/C directly address it instead of merely papering over it.

---

## (e) Manual-knob interaction / double-compensation risk

### Current additive formula

`syncVisualPhaseAfterRunNow` (`src/audio/strudel.ts` lines 98–115):

```typescript
function syncVisualPhaseAfterRunNow(queued: boolean): void {
  if (!queued) {
    try {
      const offsetMs = measureLatencyOffsetMs(getAudioContext()) + getCalibrationOffsetMs();
      anchorVisualPhase(offsetMs);
    } catch {
      anchorVisualPhase(0);
    }
  }
}
```

`offsetMs = measureLatencyOffsetMs(ctx) [hardware path only, today] + getCalibrationOffsetMs() [manual knob]`.

### Manual knob mechanics (`src/state/phase-anchor.ts` lines 9–16, 65–84; `src/ui/LatencyCalibration.svelte`)

- `_calibrationOffsetMs` initialized from `localStorage['orbifold:latencyCalibMs']` (parsed float, default `0` if absent/`NaN`; guarded for Vitest/Node with `typeof localStorage === 'undefined'`).
- `setCalibrationOffsetMs(ms)` clamps to `[-200, 200]` and persists to the same `localStorage` key.
- UI (`LatencyCalibration.svelte`): `±10 ms` nudge buttons (`decrement`/`increment`, lines 35–46), a reset-to-`0` button (`reset`, lines 48–51), and a readout (`fmtMs`, lines 54–57). Visible once audio has been initialized at least once in the session (lines 21–28, 60).

### Double-compensation risk (raw material for OD-10, not resolved here)

If a Pilot or user has already nudged the manual knob toward roughly `+100 ms` (or any positive value) to *informally* compensate for the missing scheduler-lookahead term identified in §(d), then landing OD-10 Option A/C — which folds that same ~100 ms into the now-corrected `measureLatencyOffsetMs` — would **double-count** it: the total offset becomes `hardware (~10–30 ms, unchanged) + scheduler latency (100 ms, newly auto-included) + user's stale manual nudge (~100 ms, left over from before the fix)` ≈ 100 ms of net over-compensation, pushing the visual playhead in the *opposite* direction from today's under-compensation. The user would need to re-zero (or reduce) their manual knob after the fix lands for it to remain a pure fine-tune on top of a now-more-correct baseline — exactly the concern OD-10 Option C's framing anticipates ("leave the manual knob's default at 0 so it is purely a fine-tune on top of a now-more-correct baseline"). Since the manual knob is **user-local `localStorage` state** (not shared/committed), this risk is confined to whichever machine/browser profile a given user (including the Pilot, during manual verification) has already tuned — a fresh install / cleared `localStorage` starts at `0` and is unaffected.

This inventory surfaces the risk; it does not resolve which OD-10 option to take.

---

## (f) `Cyclist` interface gap

### Current interface (`src/vite-env.d.ts` lines 45–53)

```typescript
export interface Cyclist {
  setCps(cps: number): void;
  setPattern(pat: unknown, autostart?: boolean): void;
  stop(): void;
  start(): void;
  pause(): void;
  started: boolean;
  cps: number;
}
```

**Confirmed: `latency` is omitted.** The runtime instance (per §(d) evidence #1) does carry `this.latency` (a plain numeric instance property, seconds, default `0.1`), but reading `_scheduler.latency` under TS `strict` today is a type error (`Property 'latency' does not exist on type 'Cyclist'`).

### Exact one-line addition needed if OD-10 requires reading it

```typescript
  latency: number;
```

Inserted alongside the existing `started: boolean;` / `cps: number;` properties (after line 52, before the closing brace at line 53).

---

## (g) `measureLatencyOffsetMs` signature options

`tests/phase-anchor.test.ts` (full file, 41 lines) — confirmed: **all four existing tests call `measureLatencyOffsetMs` with a single argument**:

| Test (line) | Call |
|---|---|
| `'sums outputLatency and baseLatency...'` (line 16) | `measureLatencyOffsetMs({ outputLatency: 0.05, baseLatency: 0.01 } as AudioContext)` |
| `'returns 0 when both properties are zero'` (line 21) | `measureLatencyOffsetMs({ outputLatency: 0, baseLatency: 0 } as AudioContext)` |
| `'guards absent properties with \|\| 0...'` (line 28) | `measureLatencyOffsetMs({ outputLatency: undefined, baseLatency: undefined } as AudioContext)` |
| `'handles output-latency-only scenario...'` (line 37) | `measureLatencyOffsetMs({ outputLatency: 0.1, baseLatency: 0 } as AudioContext)` |

Current signature: `export function measureLatencyOffsetMs(ctx: AudioContext): number` (`phase-anchor.ts` line 61).

**Constraint confirmed:** any signature change (e.g. adding `schedulerLatencySec: number = 0` as a second parameter, per OD-10 Option A's proposal in the phase file line 63) must default the new parameter so that calling with exactly one argument reproduces today's behavior. All four calls above pass a single argument and must need **no edits** — a default of `0` on the new parameter satisfies this exactly (adds `0 * 1000 = 0` to the returned value, byte-identical to current output).

---

## (h) Exhaustiveness / dependency audit

### Files to modify in step 04.2 (Win A)

| File | Change |
|---|---|
| `src/state/session.ts` | Add `setChordQuality(index, qual)` per §(a) |
| `src/ui/Header.svelte` | Add quality control UI + handler, per resolved OD-8/OD-9 and §(b) |
| `src/i18n/types.ts` | Add new quality-control keys, per §(b) |
| `src/i18n/locales/en.ts`, `es.ts`, `pt.ts`, `zh.ts` | Add new quality-control key values, per §(b) — **`es.ts` is the key-parity reference file** (`tests/i18n/key-parity.test.ts` flattens `es.ts`'s keys and requires `en`/`pt`/`zh` to match exactly, both missing and extra; `types.ts` is not itself the parity source, though it must stay structurally in sync by convention). Any key added to one locale must be added to **all five files** (`types.ts` + 4 locales) or `pnpm test` fails on `tests/i18n/key-parity.test.ts`. |
| `tests/session.test.ts` | New `describe('setChordQuality', ...)` block, mirroring the existing `describe('setChordBars', ...)` pattern (line 384) |

### Files to modify in step 04.3 (Win B)

| File | Change |
|---|---|
| `src/vite-env.d.ts` | Add `latency: number;` to `Cyclist`, per §(f) |
| `src/state/phase-anchor.ts` | Extend `measureLatencyOffsetMs` signature per §(g); correct the JSDoc (lines 36–40) per the §(d) verdict |
| `src/audio/strudel.ts` | Pass `_scheduler?.latency ?? 0` into `measureLatencyOffsetMs` inside `syncVisualPhaseAfterRunNow` |
| `tests/phase-anchor.test.ts` | Add new test(s) asserting the lookahead term's exact contribution, per A-04-19 — the four existing tests stay unmodified per §(g) |

**No new files expected** for either Win — matches the phase file's explicit statement (line 27). If the Dev's step 04.2/04.3 design genuinely needs a new file, that is a scope escalation to flag to the Pilot, not a default action.

**No new npm dependencies** — confirmed. Every identifier needed (`Quality`, `isNoteSlot`, `Chord`, `_scheduler`, `getAudioContext`, `Cyclist`) is already imported/declared somewhere in the touched files; no `package.json` change is implicated by either Win.

### Test count going in

`pnpm test` run during this inventory (read-only — running tests does not modify source): **2178 tests passed (47 test files)**, exactly matching the phase file's stated Phase 03 baseline (gate line 9, expected-result line 11). Confirmed by direct execution, not just the phase file's claim.

---

## Open Decisions status (unchanged by this step)

**OD-8, OD-9, and OD-10 remain formally open in `docs/song-import/phases/phase-04.md`.** This inventory maps facts (the technical verdict in §(d), the UI-mechanics recommendation in §(b), the consumer census in §(c), the double-compensation risk in §(e)) to support the Pilot's resolution — it does not resolve any of the three itself, and no edit was made to `docs/song-import/decisions.md` or the phase file's Open Decisions section.

---

## Source-of-truth check

No cross-source data contract is consumed by this phase (no backend, no producer/consumer schema boundary crossed) — Win A is a pure in-app state setter + UI wiring, Win B is a pure recalibration of an existing local computation. The only "source of truth" concern is the Strudel scheduling internals traced in §(d), which this inventory grounds directly against the pinned bundle rather than against the phase file's or the archived inventory's prior (incorrect) assumptions.

---

## Pre-existing working-tree state (not caused by this step)

At the start of this session, `git status` already showed an uncommitted modification to `docs/song-import/decisions.md` (the OD-5 Amendment 2026-07-10 text, already present in the content read during required reading — this is Pilot-authored Register content, not something this Dev session produced) and an untracked `docs/song-import/phases/phase-04.md` (the Planner's phase file for this phase, apparently not yet committed via a `docs(scope):` commit). Neither is touched, added, or committed by this step — both predate this session and are outside step 04.1's scope. Flagged here for the Pilot's awareness, not as a blocker.

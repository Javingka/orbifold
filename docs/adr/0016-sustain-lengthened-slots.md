# ADR 0016 — Each variable-duration harmony slot plays exactly once (sustain on lengthen, no over-sustain on shorten)

- **Status:** Accepted
- **Date:** 2026-06-15
- **Initiative / Phase:** orbifold-v2 / Phase 10 (Checkpoint #5 acceptance fix)
- **Deciders:** Pilot (Javier) — pre-authorized "Opción 1" on 2026-06-15
- **Amends:** ADR 0010 (variable chord duration via `arrange()`)
- **Scopes:** ADR 0005 (the `.fast`/`.slow` ban)

## Context

During Phase 10 Checkpoint #5 the Pilot, listening in the browser, found that
**lengthening** a chord or arpeggio on the staff/ProgressionStrip (e.g. `bars: 2`)
did not make it *last longer* — it made it **re-attack** once per cycle. In his
words: a doubled chord sounded "como si hubiese apretado 2 veces la misma nota";
a doubled arpeggio repeated the arpeggio twice instead of spreading one pass over
the whole span.

### Root cause

ADR 0010 expresses variable duration via `arrange([numCycles, pattern])`. ADR 0010
assumed `numCycles` alone expressed duration "preserving the `setcps` invariant".
Empirically that assumption was wrong for the *audible* result: **`arrange` replays
its inner segment once per cycle.** A one-cycle chord pattern given a 2-cycle segment
therefore fires **twice** — the re-attack the Pilot heard.

### Empirical verification (live engine, not docs)

The Strudel docs do not document `arrange`'s per-cycle internals, so the correct
idiom was verified by querying real hap onsets from the pinned `@strudel/web@1.0.3`
engine in Node (the pattern is built and `queryArc`-ed; audio output is stubbed).
An *onset* = a hap with `hasOnset()` true (a real attack). Over `[0, 2)` cycles for
a 3-voice chord:

| Idiom | Onsets | Windows | Verdict |
|---|---|---|---|
| `arrange([2, …])` (ADR 0010 baseline) | 6 = 3 voices × **2 attacks** | `0→1`, `1→2` | re-attack (the bug) |
| `arrange([2, ….slow(2)])` | 3 = 3 voices × **1 attack** | `0→2` | ✅ **true sustain** |
| `arrange([2, ….clip(2)])` | 6 | `0→1`, `1→2` | re-attacks |
| `arrange([2, ….legato(2)])` | 6 | first rings to `0→2`, **2nd onset** `1→2` | rings longer, **still re-strikes** |

Arpeggio (`note("c4 e4 g4")`) + `.slow(2)`: 3 onsets spread `0→0.67, 0.67→1.33,
1.33→2.00` — one pass across the full span, exactly the requested behavior. A
3-cycle chord + `.slow(3)` → single onset `0→3`. A fractional 1.5-cycle segment +
`.slow(1.5)` sustains once per segment occurrence.

**Conclusion:** only `.slow(N)` produces a single sustained attack. `.clip`/`.legato`
extend ring-out but do **not** suppress the cycle-boundary re-strike.

## Decision

In `melodyLine()`'s `arrange()` branch, append `.slow(numCycles)` to a **chord/arp**
segment **iff `numCycles !== 1`** (lengthened OR shortened). Rest segments
(`[N, silence]`) and `bars === 1` slots are unchanged.

### Why this cancels `arrange`'s internal `.fast`

The pinned engine defines (paraphrased):

```js
arrange(...segs) {
  const total = segs.reduce((s, [n]) => s + n, 0);
  return timeCat(...segs.map(([u, p]) => [u, p.fast(u)])).slow(total);
}
```

`arrange` **`.fast(u)`-es every segment internally**. For a lengthened slot that
replays the chord `u` times (the re-attack); for a *shortened* slot it is
`.fast(0.5)` = `.slow(2)`, which **stretches the chord past its 0.5-cycle slot,
overlapping the next slot and de-syncing the loop** (the second bug the Pilot
reported: shortened notes over-sustain, then alternate silent / overlapping across
loops). Pre-applying `.slow(numCycles)` cancels the internal `.fast(numCycles)`
exactly (`slow(u).fast(u) = identity`), so each segment plays its chord/arp once
across its true span — for any `u`, lengthened or shortened. `bars === 1` needs
nothing (`.fast(1)` is already identity), so it is left byte-identical.

### Shortening — empirical confirmation (5 chords, last 2 at bars:0.5, over 2 loops)

| | cyc 3 (shortened pair) | cyc 7 (2nd loop) |
|---|---|---|
| **without `.slow`** | `F 3.0→4.0` (full cycle!), `G 3.5→4.5` (overlaps cyc 4) | **silence** — loop de-synced |
| **with `.slow(0.5)`** | `F 3.0→3.5`, `G 3.5→4.0` (each exactly ½ cycle, no overlap) | `F 7.0→7.5`, `G 7.5→8.0` — clean loop |

Arpeggio shortened (`.slow(0.5)`): the 3-note arp compresses once into its 0.5-cycle
slot (`f4 3.00→3.17, a4 3.17→3.33, c5 3.33→3.50`), adjacent to the next slot with no
overlap.

### Why this does not violate the ADR 0005 `.fast`/`.slow` ban

ADR 0005 / kickoff §6 ban `.fast`/`.slow` because they were a tempo lever that
**time-stretches the whole pattern and breaks chord-geometry / voice-leading
timing**. The ban's target is *global tempo*. Here `.slow(N)` is applied to a
**single arrange segment** purely to express that segment's **duration** (how long
one chord/arp sounds), with tempo still wholly owned by `scheduler.setCps(bpm/240)`.
The geometry and voice-leading are unaffected: the same voicing sounds, once, for
its intended span. The Pilot ratified this scoping ("acotar el veto solo al tempo")
in advance, conditional on the empirical verification above — which passed.

### Visual consequence — Pentagrama arpeggio rendering (supersedes ADR 0015 D5)

The audio change has a matching visual obligation. The Pentagrama's arpeggio
renderer (`pArp` in `src/render/pentagrama-scene.ts`) drew the arpeggio group
**once per cycle** (`cycleCount = Math.ceil(bars)`), an intentional divergence
(ADR 0015 D5) chosen to mirror the *old* per-cycle re-attack audio: a 2-bar arp
was drawn twice. Now that the arp plays **once across its whole span**, that visual
repetition is wrong — the Pilot reported it directly ("el sonido está ok, es solo
la representación visual que no acompaña … que está solamente sonando 1 vez cada
nota del acorde a lo largo del tiempo del acorde").

`pArp` is revised to a **per-slot spread**: the `n` voices divide the slot into `n`
equal horizontal portions (`seg = w / n`), each voice rendered once at its onset
fraction (`vi/n`) with its own sustain bar across that portion — restoring the
prototype's original behavior (Pentagrama.dc.html lines 468–476) and matching the
audio onsets (verified `c@0→⅓, e@⅓→⅔, g@⅔→1` for a 1-cycle arp). **ADR 0015 D5's
per-cycle stagger is superseded.** `pChord` already drew one full-width sustain bar
per voice (correct for a sustained block chord) and is unchanged. This is render-only
(Canvas 2D, no unit tests); verified via `tsc`/`lint`/`build` clean and Pilot visual
acceptance.

### Scope boundary — composition/rhythm `arrange` is NOT affected

The composition-track codegen also uses `arrange([bars, code])` for drum/groove
blocks. Those **must keep replaying** every cycle (a 4-bar drum loop plays its
pattern each bar). This decision touches **only `melodyLine`'s chord/arp segments**.
No `.slow` is added to composition tracks or to `silence` segments.

## Consequences

- A lengthened chord/arp now sounds for its full span with one attack; a shortened
  one sounds once within its slot without over-sustaining or de-syncing the loop —
  the behavior the Pilot asked for.
- ADR 0010's "no `.fast`/`.slow`" framing is amended: the arrange path may carry a
  per-segment `.slow(N)` for duration whenever `N !== 1`.
- Codegen output for any `bars !== 1` chord slot changes (adds `.slow(N)`); the one
  affected golden test (codegen `Test 2`) was updated and regression tests added for
  lengthened (bars 2, 3) and shortened (bars 0.5) chords and a lengthened arp.
- Uniform-duration progressions (slowcat form) and `bars === 1` slots are unchanged
  — byte-identical to pre-fix `main`.

## Verification

- `pnpm test` — codegen golden + ADR-0016 regression tests green.
- Behavioral proof: the onset tables above, reproduced against `@strudel/web@1.0.3`
  (lengthen, shorten, arp, and clean 2-loop looping).
- Live acceptance: Pilot to confirm by ear in the browser that a doubled chord/arp
  sustains across its span and a halved one ends on time without overlap.

# ADR 0016 — Sustain (not re-attack) for lengthened harmony slots

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
segment **iff `numCycles > 1`**. Unit (`= 1`) and sub-cycle (`< 1`) slots are left
byte-identical — they never re-attacked, and `.slow(<1)` has fraught speed-up
semantics not requested here. Rest segments (`[N, silence]`) are unchanged.

### Why this does not violate the ADR 0005 `.fast`/`.slow` ban

ADR 0005 / kickoff §6 ban `.fast`/`.slow` because they were a tempo lever that
**time-stretches the whole pattern and breaks chord-geometry / voice-leading
timing**. The ban's target is *global tempo*. Here `.slow(N)` is applied to a
**single arrange segment** purely to express that segment's **duration** (how long
one chord/arp sounds), with tempo still wholly owned by `scheduler.setCps(bpm/240)`.
The geometry and voice-leading are unaffected: the same voicing sounds, once, for
its intended span. The Pilot ratified this scoping ("acotar el veto solo al tempo")
in advance, conditional on the empirical verification above — which passed.

### Scope boundary — composition/rhythm `arrange` is NOT affected

The composition-track codegen also uses `arrange([bars, code])` for drum/groove
blocks. Those **must keep replaying** every cycle (a 4-bar drum loop plays its
pattern each bar). This decision touches **only `melodyLine`'s chord/arp segments**.
No `.slow` is added to composition tracks or to `silence` segments.

## Consequences

- A lengthened chord/arp now sounds for its full span with one attack — the
  behavior the Pilot asked for.
- ADR 0010's "no `.fast`/`.slow`" framing is amended: the arrange path may carry a
  per-segment `.slow(N)` for duration when `N > 1`.
- Codegen output for `bars > 1` chord slots changes (adds `.slow(N)`); the one
  affected golden test (codegen `Test 2`) was updated and two regression tests added.
- Uniform-duration progressions (slowcat form) and `bars <= 1` slots are unchanged
  — byte-identical to pre-fix `main`.

## Verification

- `pnpm test` — codegen golden + ADR-0016 regression tests green.
- Behavioral proof: the onset-count table above, reproduced against `@strudel/web@1.0.3`.
- Live acceptance: Pilot to confirm by ear in the browser that a doubled chord/arp
  sustains across its span.

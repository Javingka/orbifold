# ADR 0005 — Tempo via `setcps`, not `setcpm` (amends the kickoff §6 tempo invariant)

- **Status:** Accepted
- **Date:** 2026-06-06
- **Initiative / Phase:** orbifold-v1 / Phase 02 (operability smoke test, step 02.5)
- **Deciders:** Pilot (Javier)

## Context

The kickoff §6 and CLAUDE.md carried a hard invariant: *"Tempo is set via `setcpm`; never `setcps`/`.fast`/`.slow`."*

During the Phase 02 operability smoke test the Pilot found that changing BPM did not change the audible tempo. Diagnostic logging in `runNow` showed, on every evaluate:

```
[DIAG runNow] _currentBpm= 90 | header= setcpm(22.5000)
[DIAG runNow] PRIMARY evaluate threw → fallback strips setcpm: ReferenceError: setcpm is not defined
```

Investigation of the pinned package (`@strudel/web@1.0.3`) confirmed the root cause:

- **`setcpm` does not exist** anywhere in `@strudel/web@1.0.3` (`grep "cpm"` across `node_modules/@strudel/` returns nothing). The lowercase `setcpm` global the invariant assumed is a feature of the strudel.cc REPL bundle, not of the npm `initStrudel` path we use.
- `@strudel/core/repl.mjs` defines `setCps`/`setCpm` (camelCase) **inside `repl()`**, bound to a scheduler — but `@strudel/web`'s `initStrudel` does not call `repl()`, so those are never exposed.
- The functions that ARE registered in the evaluate scope are **`setcps`** and **`setbpm`** (seen in `@strudel/mini` token registration).
- Because the prepended `setcpm(...)` threw, `runNow`'s fallback re-evaluated the pattern **without any tempo header**, so tempo was always the default.

The Pilot additionally disclosed that **tempo change never worked in the original prototype either** — it was a latent, never-corrected bug (the prototype's `setcpm` failed and its `setcps` fallback was a global call that was also undefined).

The kickoff §8 and Phase 02 acceptance **A-02-05** explicitly require *"changing BPM changes the audible tempo."* So this behavior must work, regardless of the prototype's bug.

## Decision

Amend the tempo invariant:

- Tempo is set via **`setcps`** (cycles per second). For 4/4 with 1 cycle = 1 bar: `cps = bpm / 240`. The value is emitted into the **re-evaluated pattern header** (`setcps(${bpm/240})\n<code>`), where `setcps` IS registered in the evaluate scope (unlike `setcpm`).
- **`.fast`/`.slow` remain forbidden** for tempo — that is the real intent of the original invariant (they time-stretch patterns and distort the chord-geometry timing). Only the global-clock unit changed (`setcpm` → `setcps`), because `setcpm` does not exist in the pinned version.

This means `tempoWrap` (in `src/core/codegen/strudel.ts`) emits `setcps(...)` instead of `setcpm(...)`; the Phase 01 codegen parity tests are updated accordingly.

## Consequences

**Positive**
- BPM actually changes audible tempo (meets A-02-05 / kickoff §8) — a correctness fix over the buggy prototype.
- Uses the function that genuinely exists in `@strudel/web@1.0.3`.

**Negative / deviation from prototype parity**
- `tempoWrap` output diverges from the prototype's `setcpm(...)` string. This is a deliberate, Pilot-approved deviation: the prototype's tempo behavior was a known no-op bug, so byte-identical parity there would reproduce a defect. The codegen tests assert the corrected `setcps` output.
- The `.gain`, voicing, and all other codegen output remain byte-identical to the prototype; only the tempo header changed.

**Neutral**
- `setbpm` was considered but `setcps` is preferred: it composes with the existing `bpm/240` math and the project's explicit "1 cycle = 1 bar" convention without relying on `setbpm`'s cycle-length assumptions.

## Reversibility

Reversible: the tempo unit lives in one function (`tempoWrap`) plus the audio layer's live-nudge. If a future Strudel version restores `setcpm`, switching back is a one-line change in `tempoWrap` and its test.

## Verification

Headless tests cannot prove audio tempo. Verified by the Pilot's manual browser smoke test (Phase 02 step 02.5): after the fix, changing BPM audibly changes the tempo of the playing pattern.

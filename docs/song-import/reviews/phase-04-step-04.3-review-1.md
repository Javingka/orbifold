<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Planner Review — Phase 04 Step 04.3

**Step:** 04.3 — Win B: latency offset recalibration
**Initiative:** song-import
**Date:** 2026-07-15
**Iteration:** 1 of 5
**Verdict:** APPROVE

---

## Method note (tool constraint)

This review invocation had no shell/Bash access (Read/Write/Glob/Grep only). Verification below is by direct source read of the post-commit working tree (confirmed via `.git/logs/HEAD` to be exactly `e605b808c81537bc51c629051faae5bb385ec33a`, the tip of the branch, parent `efcbc217...` = the step 04.2 review-commit — i.e. no commits landed after e605b80 that could have altered the state read here), cross-referenced against `docs/song-import/inventories/phase-04-inventory.md` §(g) (which quotes the four pre-existing tests' exact call sites verbatim, pre-dating this step) and against a `Glob` mtime ordering of `src/**/*.{ts,svelte}` (ascending — the three files this step touched, `vite-env.d.ts`/`phase-anchor.ts`/`strudel.ts`, sort to the very end, immediately after the step 04.2 cluster, with no playhead-consumer render file anywhere near that tail). This is the same level of rigor the prior review (`phase-04-step-04.2-review-1.md`) applied under the same constraint, disclosed there identically.

---

## Pilot Review Checklist

### 1. Commit scope clean — only relevant files; no "while I was there" changes

PASS. Files touched, confirmed by direct read and by grep-for-new-identifiers across `src/`: `src/vite-env.d.ts` (`Cyclist.latency` added), `src/state/phase-anchor.ts` (`measureLatencyOffsetMs` signature + JSDoc), `src/audio/strudel.ts` (`syncVisualPhaseAfterRunNow` wiring), `tests/phase-anchor.test.ts` (4 new tests appended). `grep -rn "measureLatencyOffsetMs|schedulerLatencySec|_scheduler?.latency" src/` returns exactly `phase-anchor.ts` and `strudel.ts` — no other file references the new mechanism, which is exactly the declared touch-list. No drive-by edits found.

### 2. Commit message format

PASS. `fix(audio): Phase 04 step 04.3 — recalibrate fixed latency offset` (commit `e605b80`, confirmed present as the tip of `.git/logs/HEAD`) matches the phase file's CHECKPOINT line and project convention exactly.

### 3. Acceptance Coverage Table present and complete

PASS. The table maps all nine Acceptance IDs assigned to this step by the phase file's Validation section (A-04-17 through A-04-25) with test file, test type, and gap status — nothing omitted, nothing hand-waved. A-04-23's gap status is deliberately not marked a plain "covered" but a qualified "mechanism verified; perceptual judgment explicitly deferred to Pilot, not self-graded" — correct, since the phase file itself frames A-04-23 as Pilot-adjudicated, not Dev-provable.

### 4. Tests are relevant, not just green

PASS.

- `tests/phase-anchor.test.ts` (read in full): the four pre-existing tests (`'sums outputLatency and baseLatency...'`, `'returns 0 when both properties are zero'`, `'guards absent properties with || 0...'`, `'handles output-latency-only scenario...'`) are, character-for-character, the same call sites quoted in inventory §(g) (produced *before* this step existed) — same descriptions, same single-argument calls, same `AudioContext` casts. New content is appended as four sibling `it()` blocks inside the same `describe`, after the fourth original test and before the closing brace; this pushes the closing `});`'s line number down but does not alter one character of the original four tests. This satisfies the phase file's "must keep working unchanged" constraint in its actual intent (behavior and text unmodified), not merely "still green."
- The new tests are genuine, not tautological: `'a non-zero schedulerLatencySec changes the result by exactly that amount, in ms'` asserts `withLookahead - withoutLookahead` ≈ 100 for a `0.1`s input — this exercises the real formula change, not a mocked/stubbed helper. `'treats a zero schedulerLatencySec explicitly the same as the default'` closes an edge the default-param mechanism specifically needs proven (explicit `0` vs. omitted argument).
- Proxy:static-analysis entries (A-04-17, A-04-20, A-04-21, A-04-22) are disclosed as such and independently re-verified by direct read: `Cyclist.latency: number` is present in `vite-env.d.ts` with a doc comment citing the inventory's traced evidence; `strudel.ts` line 110 passes `_scheduler?.latency ?? 0` as the literal second argument; `phase-anchor.ts`'s JSDoc (lines 36–44, 50–61) states the corrected understanding with an explicit acknowledgment that the prior claim was untraced and wrong — a genuine reconciliation, not a silent overwrite (see dedicated section below); `git diff`'s claimed file list is corroborated by both the identifier-grep above and a Glob mtime-ordering check (the four playhead-consumer render files — `pentagrama-scene.ts`, `ProgressionStrip.svelte`, `rhythm-scene.ts`, `tonnetz-scene.ts` — sort well before the step 04.2/04.3 cluster in modification time, and none references any of the new symbols).

### 5. Live-system / manual / operability evidence provided where claimed

PASS, with the same disclosed limitation as the prior review: no shell access in this review invocation to independently re-run `pnpm exec vitest run tests/phase-anchor.test.ts`, `pnpm test`, or `pnpm exec tsc --noEmit`. Verification here is by direct source read plus arithmetic consistency: 2178 (Phase 03 baseline) + 4 (step 04.2 Win A tests) = 2182 (matches the 04.2 handoff exactly) + 4 (this step's new tests) = 2186, matching the handoff's reported `2186/2186`. The manual smoke-test narrative (Playwright + cached Chromium, same live session used for 04.2, HMR picking up the three edited files, harmony + rhythm play/hush cycles, zero console errors) is specific and internally consistent with the code read. A-04-23's manual criterion is correctly *not* self-graded — see dedicated section below.

### 6. Register respected — no vigent entry violated

PASS. OD-10's Register text (`docs/song-import/decisions.md`, "OD-10 — Win B: auto-incluir el scheduler lookahead en el offset (Option A)") is applied exactly, with no improvisation: `measureLatencyOffsetMs` gains an optional `schedulerLatencySec = 0` parameter (Register: "La firma se extiende con un parámetro opcional `schedulerLatencySec = 0` ... los 4 tests existentes pasan sin editarse" — confirmed true); `syncVisualPhaseAfterRunNow` passes `_scheduler?.latency ?? 0` (Register: "`syncVisualPhaseAfterRunNow` pasa `_scheduler?.latency ?? 0`" — verbatim match); the manual knob's default stays `0` (Register: "El knob manual de calibración conserva su default `0`" — confirmed: `setCalibrationOffsetMs`/`getCalibrationOffsetMs` in `phase-anchor.ts` are untouched by this step's diff). No Option B/C drift, no invented middle ground.

**Pending, not a violation of this step:** the phase file's "ADR Triggers" section assigns an ADR (documenting the corrected `Cyclist.latency` semantics, the new signature, its interaction with the manual knob, and the honesty framing) as owed once OD-10 resolves to Option A — "The Pilot writes it." No such ADR exists yet in `docs/adr/` (last is `0028`). This is correctly not a per-step Validation item for 04.3 (the phase file's own Validation list for this step does not include it) — it is a phase-level Definition-of-Done item, due by step 04.4's merge-readiness declaration. Flagging forward for that review, not blocking this one.

### 7. Reversibility intact

PASS, under the phase file's own explicit exemption (Win B is not flag-gated; the "reversibility" proof here is the default-parameter backward-compatibility guarantee plus "a plain `git revert` away"). Confirmed structurally: `schedulerLatencySec` defaults to `0`, so any caller (present or future) that omits the second argument gets byte-identical output to pre-step-04.3 — proven by the two dedicated new tests for exactly this (`'defaults schedulerLatencySec to 0...'` and `'treats a zero schedulerLatencySec explicitly the same as the default'`). The only real caller, `syncVisualPhaseAfterRunNow`, now passes a live (non-default) value, which is the step's intended behavior change — correctly unconditional per the phase file's own framing, not a bug.

### 8. No unauthorized new dependencies or env/CI changes

PASS. No `package.json` change. `vite-env.d.ts`'s edit is a type-only addition to an existing ambient interface declaration; no new import, no new module.

---

## Project-specific checklist additions

### Prototype parity

NOT APPLICABLE, per the phase file's explicit architecture-constraints exemption (Win B is a bug fix to `orbifold-v2` Phase 04 logic, not a prototype port). The handoff correctly does not attempt a citation to `reference/orbifold.html`.

### Reversibility / flag-off

Addressed under checklist item 7 above, per the phase file's own non-standard framing for this phase.

---

## Dedicated check: JSDoc reconciliation (not a silent override)

Read `src/state/phase-anchor.ts` lines 36–44 and 50–61 directly. The corrected comment does not merely assert the opposite of the old claim — it (a) states the new, verified position ("Scheduler lookahead ... DOES shift the audible Web-Audio-scheduled trigger time of every hap forward by that amount"), (b) cites the specific evidence trail backing it ("confirmed by tracing the pinned `@strudel/web@1.0.3` bundle's Cyclist → superdough → `.start(when)` path", pointing at the inventory's §(d)), and (c) explicitly names the prior claim and says why it was wrong ("A prior version of this comment claimed the opposite ... that claim was never traced against the actual scheduling source and was factually incorrect"). This is a genuine reconciliation as the architecture constraint demands, not a drive-by contradiction.

## Dedicated check: honesty framing on A-04-23

Read the full "Completed" narrative and Acceptance Coverage Table row for A-04-23. The handoff states plainly: "I did not attempt to judge, by ear, whether the constant see-vs-hear gap feels smaller — that requires the Pilot's own listening comparison against pre-phase `main`, on their own hardware, which I have no basis to substitute for." Nowhere in the step 04.3 entry does the Dev claim perceptible improvement was proven, nor use "eliminates"/"perfectly synced" language — the phase-file-mandated wording ("reduces", never "eliminates") is used consistently in both `phase-anchor.ts`'s own JSDoc and the handoff's restated honesty paragraph. This is exactly the required framing — no overselling found.

## Dedicated check: OD-10 applied exactly, no improvisation

Cross-read against the Register entry line-by-line (see checklist item 6 above) — every mechanism detail (optional second parameter, default `0`, `_scheduler?.latency ?? 0` wiring, manual knob default untouched) matches the Pilot's recorded decision text with no deviation.

---

## Carry-forward reminder for step 04.4 (merge-readiness declaration)

Two items must be explicitly triaged by the Pilot before step 04.4 declares Phases 01–04 merge-ready — neither is new to this step, and Win B does not change either:

1. **`src/render/tonnetz-scene.ts` `_lastPick` staleness** (surfaced in step 04.2, carried forward verbatim in the step 04.3 handoff's "Key findings" section: "None new. The `tonnetz-scene.ts` `_lastPick` staleness finding from step 04.2 remains open... Win B did not touch that file and does not change the finding's status"). Confirmed still true by this review: `tonnetz-scene.ts` does not appear anywhere in step 04.3's diff. The Pilot must make an explicit call at 04.4 — small scoped fast-follow, or a documented deferred known-issue — either is legitimate, but a silent omission from the merge-ready statement is not.
2. **The OD-10 ADR** (see checklist item 6 above): owed by the phase's own "ADR Triggers" section once OD-10 resolved to Option A. Not yet written (`docs/adr/` tops out at `0028`). This is the Pilot's deliverable ("The Pilot writes it"), but step 04.4's Definition-of-Done check ("ADRs in 'ADR Triggers' are committed") cannot be satisfied until it exists — flag this explicitly in 04.4's handoff rather than let it pass unnoticed alongside item 1.

---

## Acceptance Coverage Table — Planner Verification

| Acceptance ID | Required behavior | Status | Verification method |
|---|---|---|---|
| A-04-17 | `Cyclist.latency` declared | COVERED | Source read: `src/vite-env.d.ts` lines 53–61 |
| A-04-18 | Four pre-existing tests pass unmodified | COVERED | Source read `tests/phase-anchor.test.ts` cross-checked verbatim against inventory §(g)'s pre-existing quotes |
| A-04-19 | New test: lookahead term's exact ms contribution | COVERED | `tests/phase-anchor.test.ts` lines 57–62 (`toBeCloseTo(100, 10)` on the delta) |
| A-04-20 | `syncVisualPhaseAfterRunNow` passes live scheduler latency | COVERED | Source read: `src/audio/strudel.ts` line 110 |
| A-04-21 | JSDoc no longer contradicts implemented behavior | COVERED | Source read: `src/state/phase-anchor.ts` lines 36–44; genuine reconciliation confirmed (see dedicated section above) |
| A-04-22 | No playhead-consumer render file touched | COVERED | `grep` for new symbols across `src/` (only `phase-anchor.ts`/`strudel.ts` match) + Glob mtime-ordering corroboration |
| A-04-23 | Manual: perceptibly smaller constant offset | MECHANISM COVERED / PERCEPTUAL EXPLICITLY DEFERRED TO PILOT | Handoff narrative — correctly not self-graded |
| A-04-24 | All tests pass, count ≥ 2178 + Win A's tests | COVERED (2186, arithmetic-consistent: 2178+4+4) | Handoff report; not independently re-run (no shell access this review) |
| A-04-25 | `tsc --noEmit` clean | COVERED | Handoff report; not independently re-run this review |

No gaps in the Acceptance Coverage Table itself. Two non-blocking carry-forward items (above) require explicit Pilot triage at step 04.4, not before this step's approval.

---

## Summary

Step 04.3 implements OD-10 (Option A) exactly as the Pilot resolved it — no improvisation, no drift toward Option B/C beyond what the Register text itself already folds in (manual knob default unchanged). It stays strictly within its declared four-file touch-list, the four pre-existing `phase-anchor.test.ts` call sites are verified unmodified (cross-checked against the pre-existing inventory's verbatim quotes), no playhead-consumer render file is touched (grep + mtime corroboration), the JSDoc correction genuinely reconciles the prior incorrect claim with cited evidence rather than silently overwriting it, and the A-04-23 honesty framing ("reduces, not eliminates"; perceptual judgment explicitly deferred to the Pilot) is stated plainly with no overselling anywhere in the handoff. The Acceptance Coverage Table is complete and honest about what is and is not self-gradable.

**Decision:** APPROVE
**Next action:** Dev proceeds to step 04.4 (quality gate + Phases 01–04 merge-readiness declaration). Before declaring merge-readiness, the Pilot must explicitly triage two carried-forward items: (1) the `tonnetz-scene.ts` `_lastPick` staleness finding from step 04.2 (fast-follow vs. documented deferred known-issue — either acceptable, but must be a stated decision), and (2) the still-unwritten OD-10 ADR owed by this phase's "ADR Triggers" section (Pilot-authored; step 04.4's Definition-of-Done check on "ADRs in 'ADR Triggers' are committed" cannot pass without it). Neither blocks step 04.3's own approval; both must be resolved, not silently omitted, before the merge-ready statement.

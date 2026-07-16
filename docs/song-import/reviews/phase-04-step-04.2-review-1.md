<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Planner Review — Phase 04 Step 04.2

**Step:** 04.2 — Win A: `setChordQuality` + Header quality control
**Initiative:** song-import
**Date:** 2026-07-15
**Iteration:** 1 of 5
**Verdict:** APPROVE

---

## Pilot Review Checklist

### 1. Commit scope clean — only relevant files; no "while I was there" changes

PASS.

Files touched per the handoff and confirmed by direct read: `src/state/session.ts` (new `setChordQuality`, inserted after `setChordOscillator` at line 1456, alongside the other per-slot chord setters), `src/ui/Header.svelte` (new `.sound-ctl.quality-ctl` block + `handleQualityChange` + `selQual` reactive), `src/i18n/types.ts` + all four locale files (8 new keys each, nested under `header.harmony.*`, same level as `soundLabel`), `tests/session.test.ts` (new `describe('setChordQuality', ...)` block, 4 tests, inserted cleanly between the existing `setChordBars` and `clampBars` describe blocks with zero edits to either). This is exactly the file list declared in inventory §(h) and the phase file's Implementation requirements — no extra files, no drive-by edits. `src/core/theory/tonnetz.ts` (`mkTri`), `src/core/codegen/strudel.ts`, `src/core/harmony/voice-tracks.ts`, and all render files are confirmed untouched by direct read (`mkTri` still calls only `'maj'`/`'min'` at lines 124/129, byte-identical to the inventory's citation).

### 2. Commit message format

PASS. `feat(harmony): Phase 04 step 04.2 — setChordQuality + Header quality control` (commit `a1e2667`) matches the phase file's CHECKPOINT line exactly and the project convention.

### 3. Acceptance Coverage Table present and complete

PASS. The table maps all ten Acceptance IDs scoped to this step (A-04-07 through A-04-16) with test file, test type, and gap status. This is the full set the phase file's Validation section assigns to 04.2 — nothing hand-waved, nothing omitted.

### 4. Tests are relevant, not just green

PASS.

- `tests/session.test.ts` `describe('setChordQuality', ...)` (read directly, lines 436–499): four real tests — valid update (asserts `qual` changes to `'pow'` while `rootPc`/`gain` stay untouched), out-of-range no-op (both `index=1` on a 1-element progression and `index=-1`), rest-slot no-op, `NoteSlot` no-op. Each asserts against `get(sessionStore)`, not a helper — genuine behavior coverage of A-04-08/09/10.
- `tests/i18n/key-parity.test.ts` (8 `it` blocks, confirmed by read) genuinely fails if a key is missing/extra in any of the 5 files; the 8 new quality keys are present, correctly nested, in `types.ts` and all four locales — verified by direct grep of each file. Satisfies A-04-12.
- Proxy:static-analysis entries (A-04-07, A-04-11, A-04-14) are disclosed as such in the table and independently re-verified: `setChordQuality`'s guard sequence (range → `slot === undefined || 'isRest' in slot || isNoteSlot(slot)` → immutable `.map` → `requeueLive()`) is byte-identical in shape to `setChordPreset`; the Header control's `disabled={!selIsChord}` and five `<option value="maj|min|dim|aug|pow">` match OD-8/OD-9 exactly; `git diff` claim on `tonnetz.ts` is corroborated by direct read of the current file (unchanged from the inventory's citation).
- A-04-13 (manual) gives specific, checkable claims — e.g., the Pentagrama chip label sequence `C → C° → C+ → C5` — which I cross-checked against `chordLabel` (`src/core/theory/chords.ts:50-55`: `dim→'°'`, `aug→'+'`, `pow→'<root>5'`) and it is exactly correct. The screenshots the handoff references are not committed to the repo (expected — a scratch Playwright session's artifacts, not a project convention), so I cannot independently view them, but the narrative is specific (exact selectors, exact port, exact console-error count) and consistent with the code read, which is what this checklist item asks for in lieu of re-execution.

### 5. Live-system / manual / operability evidence provided where claimed

PASS, with the caveat noted above (screenshots not persisted — narrative evidence only, which is acceptable and consistent with precedent for this kind of ad hoc browser check). Operability entries (A-04-15/16) report exact numbers (`2182/2182`, `47 files`, `tsc` exit 0) that are internally consistent: 2178 baseline + 4 new `setChordQuality` tests = 2182, matching the diff I read. I did not have shell/Bash access in this review invocation to re-run `pnpm test`/`tsc`/`lint` myself; verification here is by source inspection and arithmetic consistency, which surfaced no contradiction.

### 6. Register respected — no vigent entry violated

PASS, for this step's own changes. OD-8 (edit-only Header control) — implemented via `disabled={!selIsChord}`. OD-9 (all five qualities exposed) — implemented via five `<option>`s. OD-2 (`pow`/non-triadic qualities never get a Tonnetz triangle) — `mkTri` confirmed unmodified.

One nuance for Pilot awareness, not a violation caused by this step's diff: the "Key findings" section reports a **pre-existing** latent gap in `src/render/tonnetz-scene.ts`'s `_lastPick` cache (outside this step's touch-list, not modified here) that is now reachable for the first time because `setChordQuality` is the first user action that can change an already-`_lastPick`-tracked chord's quality away from `maj`/`min`. The symptom — a stale `maj` triangle outline remaining highlighted in the Tonnetz view after a chord is changed to `dim`/`aug`/`pow` — is adjacent to OD-2's intent ("no Tonnetz highlight for a non-triadic quality") even though OD-2 itself, which governs triangle *creation*, is not violated by any code this step wrote. See "Next action" below for triage.

### 7. Reversibility intact

PASS. No flag; matches the phase file's own framing that Win A is "opt-in by construction" (a user must select a slot and change its quality). Confirmed: `setChordQuality` is a new export, nothing else calls it, so no existing behavior path changes for a user who never touches the new control. The insertion into `tests/session.test.ts` is additive only — no existing `describe` block's tests were edited.

### 8. No unauthorized new dependencies or env/CI changes

PASS. No `package.json` change claimed or evident. All identifiers used (`Quality`, `isNoteSlot`, `Chord`) were already imported/declared in `session.ts` per the inventory's §(a) confirmation.

---

## Project-specific checklist additions

### Prototype parity

NOT APPLICABLE, per the phase file's explicit architecture-constraints exemption ("Neither Win is a port from `reference/orbifold.html`"). The handoff correctly does not attempt a prototype citation.

### Reversibility / flag-off

NOT APPLICABLE in its usual form, per the same exemption — covered under checklist item 7 above.

---

## Key finding triage: `tonnetz-scene.ts` `_lastPick` staleness

This is a real, correctly root-caused, correctly-out-of-scope-for-04.2 finding (verified by direct read of `updateTonnetzDynamic`, `src/render/tonnetz-scene.ts` lines 318–333: `_lastPick` is reassigned only inside `if (sel !== null)`, i.e. only when a matching triangle is found; there is no `else` clearing it, so it retains its previous value when the tracked chord's quality changes to something with no triangle). It does not affect audio, session data, or the progression-strip label. It is cosmetic, confined to the Tonnetz view's sustained-highlight overlay, in a PIXI-coupled file with no existing unit-test scaffolding.

**Decision:** Do not fold into step 04.2 (correctly out of scope — the Dev was right not to touch `tonnetz-scene.ts` here) and do not fold into step 04.3 (that step is explicitly barred from touching any playhead-consumer render file, and `tonnetz-scene.ts` is one of the four — folding an unrelated fix into that diff would itself be a scope violation of Win B's own architecture constraint). Recommending the Pilot authorize a small, scoped fast-follow — a single `else { _lastPick = null; }` clause, no test scaffolding change beyond what already exists for this file — either as a short step 04.3b inserted before 04.4, or as a small addendum folded into step 04.4's handoff if the Pilot prefers not to expand the step count. Alternatively, the Pilot may choose to accept it as a documented, deferred known-issue for a future initiative (it is low-severity and non-blocking for every acceptance criterion in this phase). Either resolution is legitimate; what is not legitimate is declaring Phases 01–04 "merge-ready" at step 04.4 without this finding being explicitly triaged one way or the other, since it directly touches OD-2's spirit (no Tonnetz highlight for a non-triadic quality) even though not literally caused by this step's code.

---

## Acceptance Coverage Table — Planner Verification

| Acceptance ID | Required behavior | Status | Verification method |
|---|---|---|---|
| A-04-07 | `setChordQuality` exported, guard pattern matches convention | COVERED | Source read: `session.ts` lines 1477–1490; matches `setChordPreset`'s guard shape line-for-line |
| A-04-08 | Unit test: valid update | COVERED | `tests/session.test.ts` lines 437–452 |
| A-04-09 | Unit test: out-of-range no-op | COVERED | `tests/session.test.ts` lines 454–468 |
| A-04-10 | Unit test: rest-slot/NoteSlot no-op | COVERED | `tests/session.test.ts` lines 470–498 (both rest and NoteSlot cases) |
| A-04-11 | Header control present, wired, OD-8/OD-9 shape | COVERED | Source read: `Header.svelte` lines 364–368, 866–888 |
| A-04-12 | i18n keys present in all 5 files | COVERED | Direct grep of `types.ts` + `en/es/pt/zh.ts`: 8 keys each, consistent nesting |
| A-04-13 | Manual: quality change updates Pentagrama render + audio | COVERED | Narrative evidence cross-checked against `chordLabel`'s glyph convention — consistent |
| A-04-14 | `mkTri` unmodified (OD-2 preserved) | COVERED | Source read: `tonnetz.ts` lines 122–130, unchanged from inventory citation |
| A-04-15 | All tests pass, count ≥ 2178 | COVERED (2182, arithmetic-consistent with +4 new tests) | Handoff report; not independently re-run (no shell access this review) |
| A-04-16 | `tsc --noEmit` clean | COVERED | Handoff report; not independently re-run this review |

No gaps in the Acceptance Coverage Table itself. One non-blocking finding (above) requires Pilot triage before phase completion, not before this step's approval.

---

## Summary

Step 04.2 implements `setChordQuality` and the Header quality control exactly per OD-8/OD-9's resolved shape, stays strictly within its declared touch-list, leaves `mkTri`/Tonnetz triangle logic and all codegen/render files untouched, adds real unit tests (not helpers) and a complete i18n key set across all five files, and reports an internally consistent test count (2182 = 2178 + 4). The Dev correctly identified and did **not** fix an adjacent, newly-reachable latent bug in `tonnetz-scene.ts` outside this step's scope, and flagged it clearly with an accurate root cause and a low-risk proposed fix — this is exactly the right discipline ("spec first, no implicit implementation").

**Decision:** APPROVE
**Next action:** Dev proceeds to step 04.3 (Win B is unaffected by the `tonnetz-scene.ts` finding and does not touch that file). Before step 04.4 (the Phases 01–04 merge-readiness declaration), the Pilot must explicitly triage the `_lastPick` staleness finding in `src/render/tonnetz-scene.ts` — Planner recommends a small scoped fast-follow (one `else` clause) inserted as step 04.3b or a 04.4 addendum, but accepting it as a documented deferred known-issue is also acceptable; either way it must be an explicit decision, not a silent omission from the merge-ready statement.

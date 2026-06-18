<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Handoff — Phase 01 (Sound-capability discovery)

---

## Step 01.1 — Current sound surface + feature mapping

**Date:** 2026-06-17
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed
- Read all required files: `CLAUDE.md`, `references/dev-role.md`, `docs/_archive/orbifold-v2/decisions.md`, `ORBIFOLD_KICKOFF.md` §6–§7, `phase-01.md`, and every source file named in the PROMPT.
- Wrote section (a) of `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` covering:
  - Harmony sound chain: both hardcoded strings in `chordToStrudel` and `melodyLine`; exact injection points for an `instrument` parameter while preserving byte-identical output when unset.
  - Rhythm sound model: `Sound` union in `layers.ts`, `rhythmLayerToStrudelLine` codegen, and where sample-variant (`bd:n`) and sound-swap would attach.
  - Tonnetz preview loop path: `onStagePointerDown` → `pickChord` → `playChord` → `audio.runNow` → Strudel cyclic scheduler; why it loops; three candidate one-shot preview mechanisms with tradeoffs.
  - Chord/órbita selection state: `_selectedSlotIdx` in `pentagrama-scene.ts` (module-level, not reactive); rhythm layer index in Header.svelte local state.
  - Agent + persistence contracts: `SCHEMA_VERSION`, `SK_SOUNDS`, `HarmonyChordCoreSchema`, `SavedChordSchema`, `SavedRhythmLayerSchema`; bump cost summary table.

### Files touched
- `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` (created, section (a))
- `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md` (created, this entry)

### Validation evidence (per Acceptance ID)

- A-01-01: Section (a) maps the harmony sound chain (`chordToStrudel` line 64, `melodyLine` lines 115, 141), the rhythm sound model (`Sound` union `layers.ts` line 9, `rhythmLayerToStrudelLine` line 56), and the Tonnetz preview loop path (`tonnetz-scene.ts` line 446 → `session.ts` line 601 → `audio/strudel.ts` line 196), with file+line citations throughout. F1/F2/F3 injection points and the byte-identical default guarantee are explicitly mapped.
- A-01-05: Only `docs/` files created; no `src/**` files touched. See git status below.

### Routine validations

- `git status` → only `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` and `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md` as new untracked files; no `src/` modifications.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Section (a) accurately maps chord-sound chain, rhythm-sound model, and Tonnetz preview/loop path, all file+line-cited, with F1/F2/F3 injection points preserving byte-identical default | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) | manual | covered |
| A-01-02 | Section (b) triages all listed Strudel functions | (not yet — step 01.2) | — | not covered — step 01.2 |
| A-01-03 | Section (c) proposes candidate set and deferred register | (not yet — step 01.3) | — | not covered — step 01.3 |
| A-01-04 | Section (d) gives Pilot all decisions needed to scope Phase 02 as numbered OQs | (not yet — step 01.3) | — | not covered — step 01.3 |
| A-01-05 | No source files modified; saved-session bytes and audio output for existing SessionState unaffected | `git status` (docs-only diff) | proxy:static-analysis | covered |

**Proxy disclosures:** A-01-05 verified via `git status` showing only `docs/` files as new/modified; no `src/` entries.

### Decisions made (if any)
- None — this is a pure-discovery step; no architectural decisions made.

### Proposed Decisions Register entries (if any)
- None proposed at this step; candidates will surface from sections (b)–(d).

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Branch: `harmonic-rhythm-improvements/phase-01` (clean, docs-only commit)
- No source code changed; app behavior unchanged from `main`.

### Next-step context
- Step 01.2 must consult live Strudel docs per CLAUDE.md "Live sources" rule before writing section (b).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 01.2 — Strudel attribute survey + triage

**Date:** 2026-06-17
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed
- Consulted live Strudel docs (10 pages, all cited with URLs) per CLAUDE.md "Live sources" rule.
- Verified `@strudel/web@1.0.3` behavior by reading `node_modules/@strudel/web/dist/index.mjs` directly:
  - `registerSynthSounds()` (line 5202) registers only `['sine','square','triangle','sawtooth','pink','white','brown','crackle']` — `supersaw` and `pulse` absent.
  - `registerSoundfonts()` is commented out in `web.mjs` lines 3 and 25; `gm_*` soundfonts not available in the app's init path.
- Appended section (b) to the inventory with a 27-row triage table covering every function the Pilot listed (brief §2–§7) plus F1–F3-relevant attributes.
- Documented 6 `@strudel/web@1.0.3` discrepancies vs. current docs.
- Identified that `slider()`, `._pianoroll()`, `._scope()` are REPL-only tools inapplicable to Orbifold.

### Files touched
- `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` (section (b) appended)
- `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md` (this entry)

### Validation evidence (per Acceptance ID)

- A-01-02: Section (b) covers all functions listed by the Pilot (§2–§7 of the brief) in a triage table with risk/impact/implementation-surface/live-doc-citation columns. Every `@strudel/web@1.0.3` discrepancy is flagged (supersaw/pulse absent; soundfonts commented-out; slider/pianoroll/scope REPL-only; round/time/mul not confirmed). Where Orbifold already solves the need (geometric voice-leading vs. `.add()`/`.scale()`; own UI vs. `slider()`; PIXI vs. `._scope()`), the triage row says so.
- A-01-05: Only `docs/` files modified. See git status.

### Routine validations

- `git status` → only `docs/` files modified; no `src/` changes.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Section (a) accurately maps chord-sound chain, rhythm-sound model, Tonnetz preview/loop path | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) | manual | covered (step 01.1) |
| A-01-02 | Section (b) triages every listed Strudel function with risk, impact, surface, live-doc citation, and 1.0.3 discrepancies | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(b) | manual | covered |
| A-01-03 | Section (c) proposes candidate set and deferred register | (not yet — step 01.3) | — | not covered — step 01.3 |
| A-01-04 | Section (d) gives Pilot all decisions as numbered OQs | (not yet — step 01.3) | — | not covered — step 01.3 |
| A-01-05 | No source files modified | `git status` (docs-only diff) | proxy:static-analysis | covered |

**Proxy disclosures:** A-01-05 verified via `git status`; no `src/` entries.

### Decisions made (if any)
- None — pure discovery.

### Proposed Decisions Register entries (if any)
- None at this step.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Branch: `harmonic-rhythm-improvements/phase-01` (clean, docs-only)
- `@strudel/web@1.0.3` behavioral facts confirmed from installed `node_modules`.

### Next-step context
- Step 01.3 reads sections (a) and (b) to derive the candidate set and open questions.

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 01.3 — Candidate set, deferred register, and open questions

**Date:** 2026-06-17
**Commit(s):** (terminal commit — see note below)
**Iteration:** 1 of 5

### Completed

- Read sections (a) and (b) from the inventory document.
- Appended section (c) — Candidate set vs. deferred register: 9 candidates (C-1 through C-9) with implementation surfaces, ADR/schema-bump flags; 15 deferred items (D-1 through D-15) with reasons. Three ADR triggers confirmed for Phase 02 scoping.
- Appended section (d) — 8 numbered OQs (OQ-1 through OQ-8) with options and one-line Planner recommendations.
- Did NOT resolve any OQ, did NOT invent Phase 02+.

### Files touched

- `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` (sections (c) and (d) appended)
- `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md` (this entry + phase-completion entry below)

### Validation evidence (per Acceptance ID)

- A-01-03: Section (c) proposes candidates (C-1 through C-9) with implementation surface, ADR/schema flags, and the "no added complexity" criterion applied. Deferred register (D-1 through D-15) captures high-risk/complexity-adding items with reasons. No item is silently resolved.
- A-01-04: Section (d) gives 8 OQs covering all decision areas needed before Phase 02 scoping: instrument set (OQ-1), rhythm sounds (OQ-2), selection surface (OQ-3), preview mechanism (OQ-4), secondary attributes (OQ-5), schema bump strategy (OQ-6), agent exposure (OQ-7), ADR triggers (OQ-8). Each has options and a Planner recommendation.
- A-01-05: Only `docs/` files modified.

### Routine validations

- `git status` → only `docs/` files modified; no `src/` changes.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-01-01 | Section (a) accurately maps chord-sound chain, rhythm-sound model, Tonnetz preview/loop path | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(a) | manual | covered (step 01.1) |
| A-01-02 | Section (b) triages every listed Strudel function with risk, impact, surface, live-doc citation, 1.0.3 discrepancies | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(b) | manual | covered (step 01.2) |
| A-01-03 | Section (c) proposes candidate set (low-risk/high-impact) and deferred register (high-risk/complexity-adding) with reasons, surfaces, and ADR/schema-bump flags — proposed, not decided | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(c) | manual | covered |
| A-01-04 | Section (d) gives the Pilot every decision needed to scope Phase 02 as numbered OQs with options and a recommendation; nothing silently resolved, no future phase invented | `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` §(d) | manual | covered |
| A-01-05 | No source files modified; saved-session bytes and audio output for existing SessionState unaffected | `git status` (docs-only diff) | proxy:static-analysis | covered |

**Proxy disclosures:** A-01-05 verified via `git status`; no `src/` entries across all three steps.

### Decisions made (if any)

- None — all decisions proposed to the Pilot via OQ-N.

### Proposed Decisions Register entries (if any)

- None. Decisions Register entries flow from Pilot OQ resolutions and ADR authoring in Phase 02.

### Blockers resolved during this step (if any)

- None.

### Environment state after this step

- Branch: `harmonic-rhythm-improvements/phase-01` (clean, docs-only, three commits)
- No source code changed across all three steps.

### Next-step context

- The Pilot reviews at Checkpoint #1, resolves OQ-1 through OQ-8, and that resolution scopes Phase 02 (the first code phase, with its own inventory step).

### Planner Review

(Filled by the Planner in review mode)

**Decision:** (pending)
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Handoff — Phase 01 (Sound-capability discovery)

**Phase completed:** 2026-06-17

### Completed

- Produced `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` with four sections (a)–(d).
- Section (a): Current sound surface mapped to file+line — harmony sound chain (`chordToStrudel` line 64, `melodyLine` lines 115/141), rhythm sound model (`Sound` union line 9, `rhythmLayerToStrudelLine` line 56), Tonnetz preview loop path (tonnetz-scene → session.ts → audio/strudel.ts), selection state, agent/persistence contracts.
- Section (b): 27-row triage table covering every Pilot-listed Strudel function with risk/impact/surface/live-doc-URL and six `@strudel/web@1.0.3` discrepancies confirmed from installed `node_modules`.
- Section (c): 9 candidates (C-1 through C-9) and 15 deferred items (D-1 through D-15); three ADR triggers.
- Section (d): 8 numbered OQs (OQ-1 through OQ-8) for Pilot resolution before Phase 02 scoping.
- Zero source files modified across all three steps.

### Acceptance Coverage Summary

| Acceptance ID | Required behavior | Covered in step | Status |
|---|---|---|---|
| A-01-01 | Section (a): chord-sound chain, rhythm-sound model, Tonnetz preview loop path, each file+line-cited | 01.1 | covered |
| A-01-02 | Section (b): triage of every listed Strudel function, live-doc citations, 1.0.3 discrepancies | 01.2 | covered |
| A-01-03 | Section (c): candidate set + deferred register, proposed not decided | 01.3 | covered |
| A-01-04 | Section (d): numbered OQs with options and recommendations, nothing silently resolved | 01.3 | covered |
| A-01-05 | No source files modified; docs-only git diff | 01.1, 01.2, 01.3 | covered |

### Decisions made

- None — pure discovery phase; all decisions proposed to the Pilot via OQ-N.

### ADRs committed

- None — this phase produces no ADRs; candidate triggers surfaced in sections (c)/(d) for Pilot confirmation at Phase 02 scoping.

### Register entries added

- None.

### Pending Register proposals resolved at phase approval

- None pending.

### Deferred

- Phase 02+ implementation (first code phase with inventory step) — awaits Pilot OQ resolution at Checkpoint #1.
- Note-level free placement (`NoteSlot`, D-15) — remains parked from Phase 10 deferral; unrelated to this initiative.
- `supersaw`/`pulse` (D-1), soundfonts (D-2), user-supplied samples (D-8) — deferred to later phases; reasons in section (c).

### Blockers and review escalations

- None.

### Iteration counts

- All three steps approved on iteration 1 (docs-only phase; no REVISE loop triggered).

### Next focus

- Pilot reviews `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` at Checkpoint #1 and resolves OQ-1 through OQ-8.
- Planner then scopes Phase 02 (the first code phase: sound-attribute data model ADR + codegen + UI for F1/F2/F3, per the Pilot's OQ resolutions).

**Terminal commit:** `docs(harmonic-rhythm-improvements): Phase 01 step 01.3 — candidate set, deferred register, open questions`

- Hash: self-referential — not recorded
- Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

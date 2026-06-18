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

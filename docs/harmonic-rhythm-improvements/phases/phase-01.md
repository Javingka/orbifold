<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — Sound-capability discovery: chord/rhythm sound selection, short Tonnetz preview, and a risk/impact triage of Strudel attributes

**Purpose:** Map the current sound surface and the Pilot's three target features (selectable chord sounds, selectable/expanded rhythm sounds + samples, and a short non-looping Tonnetz chord preview) to the exact code that must change, and triage the Strudel functions the Pilot listed by risk and impact — producing one discovery document and consolidated open questions so the Pilot can scope the implementation work; this is a **pure-discovery phase** that writes **no source code** and stands in for the usual per-phase inventory step.

**Gate:** `orbifold-v2` complete and merged to `main`. Branch `harmonic-rhythm-improvements/phase-01` cut from `main`. The Pilot has added the `harmonic-rhythm-improvements` initiative block to `CLAUDE.md` (or explicitly authorized scoping ahead of it). No source code is touched, so no test/quality baseline is required yet (the first code phase's inventory step records it).

**Expected phase result:** A discovery document at `docs/harmonic-rhythm-improvements/inventories/phase-01-inventory.md` capturing (a) the current sound surface and the three target features mapped to file + line, (b) a survey + risk/impact triage of the Strudel functions the Pilot listed (sections 2–7 of the brief) verified against live docs and `@strudel/web@1.0.3`, (c) a proposed candidate set for this initiative vs. a deferred-register of high-risk/paradigm-shifting functions, and (d) numbered open questions (OQ-N) for the Pilot. No source files changed. The Pilot reviews at Checkpoint #1, resolves the OQs, and that resolution scopes Phase 02 (the first code phase, with its own inventory step).

---

## Target features (Pilot brief, 2026-06-17)

- **F1 — Selectable chord sound.** Today harmony is hardcoded to one timbre (`s("sawtooth").lpf(1200)…` in `chordToStrudel`/`melodyLine`). The user must be able to change the sound of new chords/notes **and** of already-chosen ones — by selecting a chord on the Pentagrama and changing how it sounds. The control belongs in the top-bar menu **after** tonalidad / escala / octava.
- **F2 — Selectable rhythm sound + samples.** Evaluate adding new sounds and **samples** for rhythm layers, and allow changing the sound of an **already-defined órbita/layer** (today the 9 sounds are fixed: `bd|sd|hh|oh|cp|rim|lt|mt|ht`).
- **F3 — Short Tonnetz chord preview.** Clicking a triad currently calls `playChord → runNow`, which loops the chord indefinitely (annoying). Make it sound briefly, once, just to hear the chord — a short non-looping preview decoupled from the transport.

**Design principle (Pilot):** more options and creative versatility for harmony and rhythm **without increasing use complexity**. Not every Strudel function is in scope — low-risk/high-impact ones are candidates; high-risk ones are recorded as future options.

---

## Invariants to maintain (non-negotiable)

- **No `.fast`/`.slow` for tempo;** the `setcps` scheduler owns tempo (ADR 0005). Any new attribute is a timbre/space/shape parameter, never a tempo manipulation.
- **`core/**` stays pure** — no DOM/PIXI/Svelte imports; new sound attributes are expressed in the pure codegen engine and unit-testable.
- **Default = current behavior (byte-identical).** A session that does not specify the new attributes must produce the exact current code — `s("sawtooth").lpf(1200).gain(…).room(…)` for chords and `s("bd")…` for rhythm — so saved-session bytes and audio output for existing content are unchanged. This is the reversibility guarantee for the whole initiative.
- **Schema discipline.** New attributes that persist or that the agent may set require a versioned bump of `SCHEMA_VERSION` (agent) and `SavedSchema` (persistence), with backward-compatible reads of old sessions.
- **AGPL-3.0 headers on all new/modified source files** (this phase modifies none).

---

## Step 01.1 — Current sound surface + the three features mapped to code

PROMPT → Read `CLAUDE.md`, `references/methodology.md`, `docs/_archive/orbifold-v2/decisions.md` (the authoritative vigent rules carry over until the Pilot opens this initiative's Register at `docs/harmonic-rhythm-improvements/decisions.md`), `ORBIFOLD_KICKOFF.md` §6–§7, and this phase file. Then read every file that defines, shapes, persists, exposes, or previews sound: `src/core/rhythm/layers.ts`, `src/core/codegen/strudel.ts`, `src/audio/strudel.ts`, `src/agent/schema.ts`, `src/agent/apply.ts`, `src/lib/persistence.ts`, `src/state/session.ts` (esp. `playChord`, `previewChord`/preview paths, `nowPlaying`), `src/render/tonnetz-scene.ts` (the triad-click path, ~line 535), `src/ui/RhythmControls.svelte`, `src/ui/HarmonyControls.svelte`, `src/ui/ProgressionStrip.svelte`, `src/ui/ProgressionChips.svelte`. Cross-check `reference/orbifold.html` where relevant.

Produce section **(a) Current sound surface + feature mapping** of the discovery document, with file + line citations:
- The harmony sound chain (`chordToStrudel`, `melodyLine`): what is hardcoded vs. variable, and exactly where an `s(<instrument>)` selection and per-chord attributes would be injected to keep the no-attribute case byte-identical.
- The rhythm sound model (`Sound` union, `rhythmLayerToStrudelLine`): how a layer becomes `s("bd …")` and where a sound swap / sample variant (`bd:n`) / expanded set would attach.
- The Tonnetz preview path (F3): `tonnetz-scene` triad click → `playChord` → `audio.runNow`, and why the pattern loops (Strudel cyclic playback until `hush`); identify what a short one-shot preview decoupled from the transport `nowPlaying` would require.
- Where chord/órbita **selection** state lives so an already-defined element's sound can be changed (Pentagrama chord-select from Phase 10; layer/órbita selection in RhythmControls).
- The agent + persistence contracts (`SK_SOUNDS`, `SCHEMA_VERSION`, `SavedSchema` + its version) so the cost of adding attributes is visible.

Implementation requirements:
- Read every file before writing; cite file + line for every behavioral claim.
- Do NOT write or edit source code.

Validation:
- The document exists with a complete, citation-backed section (a) covering F1, F2, F3.
- No source files modified (`git status` shows only the new doc).

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 01 step 01.1 — sound surface + feature mapping`

---

## Step 01.2 — Strudel attribute survey + risk/impact triage

PROMPT → Read section (a). Consult the **live** Strudel docs (per CLAUDE.md "Live sources — do not assume from memory": `https://strudel.cc/learn/`, sounds/samples/effects/synths pages), pinning each claim to a URL and noting `@strudel/web@1.0.3` behavior where it differs from current docs. Cover **every function the Pilot listed** (brief sections 2–7) plus the few needed for F1–F3.

Append section **(b) Attribute survey + triage**: a table with one row per function — **what it does**, **which target feature (if any) it serves**, **implementation surface** (codegen / data model / agent schema+version / persistence schema+version / UI / audio-preview path), **risk** (low/med/high, with the reason — especially "increases use complexity" or "conflicts with the geometric Tonnetz/voice-leading model"), **impact** (low/med/high), and a **live-doc citation**. At minimum cover: `s()`, sample variants `bd:n` and `.bank()`, `n()`+`.scale()`, `.add()`, the mini-notation operators, `.seg()`/`.struct()`/`.ribbon()`/`.round()`/`.mul()` and `rand`/`time`, `.clip()`/legato, `.lpf()`/`.hpf()`, the filter envelope (`.lpenv/.lpa/.lpd/.lps/.lpq`), `.gain()`, `.dec()`, `.fm()/.fmh()`, `.orbit()`, `.pan()`, `.delay()`, `.room()`, `slider()`, `._pianoroll()/._scope()`. Note where Orbifold already does the job by other means (e.g. geometric voice-leading vs. `.add()`; Euclidean/step grid vs. the `rand`/`struct` trance-gate; Orbifold's own UI vs. `slider()`).

Implementation requirements:
- One live-doc URL per function group; flag any 1.0.3-vs-docs discrepancy; verify samples/soundfont availability under 1.0.3 (`registerSynthSounds`, `samples('github:…')`, soundfonts).
- Do NOT write or edit source code.

Validation:
- Section (b) appended; every listed function has a triage row with risk, impact, and a doc citation.
- No source files modified.

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 01 step 01.2 — Strudel attribute survey and triage`

---

## Step 01.3 — Candidate set, deferred register, and open questions

PROMPT → Read sections (a) and (b). Append section **(c) Candidate set vs. deferred register** and section **(d) Open questions for the Pilot**.

Section (c): from the triage, propose (do **not** decide) two lists — **Candidates for this initiative** (low-risk/high-impact, serving F1–F3 and the "no added complexity" principle) and **Deferred register** (high-risk, paradigm-shifting, or complexity-adding, recorded as future options with the reason). For each candidate, give the implementation surface and whether it needs an ADR or a schema bump. Do NOT author a phase plan — that follows the Pilot's resolution.

Section (d): a numbered `OQ-N` list the Pilot must resolve before Phase 02 scoping, each with options and a one-line Planner recommendation. Expected OQ areas (refine from what (a)/(b) reveal; add more as needed):
- **OQ — chord instrument set (F1):** basic waveforms only (sawtooth/square/triangle/sine) vs. + `supersaw`/`pulse` vs. + soundfonts (piano/GM) — weighing 1.0.3 availability and load cost.
- **OQ — rhythm sounds & samples (F2):** expand the built-in set + expose dirt-sample variants (`bd:n`) only, vs. also allow **user-supplied samples** (load/persist/security model, no assets in repo — likely an ADR and higher risk).
- **OQ — changing an already-defined element's sound (F1/F2):** confirm the selection surfaces — Pentagrama chord-select for chords (per top-bar menu after octava) and órbita/layer-select in RhythmControls — and per-element vs. global scope.
- **OQ — Tonnetz preview behavior (F3):** one-shot decoupled from transport; the duration/shaping mechanism (e.g. short `.clip`/`.dec`/envelope, single fire) and whether it interrupts current playback or layers over it.
- **OQ — secondary timbre/space attributes:** which of `lpf`, `pan`, `delay`, `room`, `clip`, `dec` (if any) join F1/F2 this initiative vs. defer.
- **OQ — data model & schema bump:** how new attributes attach to the chord/layer model and the agent (`SCHEMA_VERSION`) + persistence (`SavedSchema`) bump strategy, with backward-compatible reads.
- **OQ — agent exposure:** whether/how the agent may set new attributes, keeping technical tokens verbatim (i18n OQ-6 precedent).
- **OQ — ADR triggers:** sound-attribute data model (parallels ADR 0010/0012); user-sample loading (if in scope).

Implementation requirements:
- Do NOT write or edit source code; do NOT resolve the OQs; do NOT invent Phase 02+.

Validation:
- Sections (c) and (d) appended; the document now has (a)–(d), internally consistent.
- No source files modified.

CHECKPOINT → Commit message:
`docs(harmonic-rhythm-improvements): Phase 01 step 01.3 — candidate set, deferred register, open questions`

---

## Phase Acceptance

- **A-01-01** — Section (a) accurately maps the current chord-sound chain, rhythm-sound model, and the Tonnetz preview/loop path, each claim file+line-cited, and identifies exactly where F1/F2/F3 changes attach while preserving the byte-identical no-attribute default.
  - Validation method: `manual`
- **A-01-02** — Section (b) triages every Strudel function the Pilot listed with risk, impact, implementation surface, and a live-doc citation, and flags any `@strudel/web@1.0.3` discrepancy or where Orbifold already solves the need by other means.
  - Validation method: `manual`
- **A-01-03** — Section (c) proposes a candidate set (low-risk/high-impact) and a deferred register (high-risk/complexity-adding) with reasons, surfaces, and ADR/schema-bump flags — proposed, not decided.
  - Validation method: `manual`
- **A-01-04** — Section (d) gives the Pilot every decision needed to scope Phase 02 as numbered OQs with options and a recommendation; nothing silently resolved, no future phase invented.
  - Validation method: `manual`
- **A-01-05** — No source files modified; saved-session bytes and audio output for existing `SessionState` unaffected.
  - Validation method: `automated (proxy: docs-only git diff)`

## Partial coverage from prior phase

No prior partials to address. `orbifold-v2` closed all acceptance at its own checkpoints; its deferred *feature* (note-level free placement / `NoteSlot`, Phase 10) is unrelated to this initiative and remains parked for a future initiative.

## ADR Triggers

This phase produces no code and opens no ADR; it surfaces candidate ADR triggers (in section (c)/(d)) for the Pilot to confirm at Phase 02 scoping:

- **Sound-attribute data model** — Trigger: Phase 02 scoping, if selectable instruments / per-element attributes need a typed model + codegen form (parallels ADR 0010 variable duration / ADR 0012 rests).
- **User-supplied sample loading & persistence** — Trigger: Phase 02 scoping, if user samples are in scope (load path, persistence, no-assets-in-repo).
- **Non-looping preview audio path** — Trigger: Phase 02 scoping, if F3 needs a one-shot fire decoupled from the cyclic scheduler/`nowPlaying`.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/harmonic-rhythm-improvements/handoffs/phase-01-handoff.md`. See `handoff-template.md`. Because this is a pure-discovery phase, the Acceptance Coverage Table maps the `manual`/`proxy` IDs to the document sections and the docs-only `git status`.

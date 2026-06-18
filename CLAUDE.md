# CLAUDE.md

This file is the project-specific layer of the Pilot+Planner+Machine methodology. It overrides defaults from the methodology skill where needed and provides project-specific context.

## About this project

Orbifold is a web-based live-coding music instrument built on **Strudel** (a JS port of TidalCycles), with a **PIXI/WebGL** interface in a sober "Apple"-like aesthetic. It organizes music with **Tymoczko's chord geometry**: a navigable Tonnetz, neo-Riemannian P·L·R transformations, minimal voice-leading, and Euclidean rhythms, plus a DAW-style composition timeline and an AI Agent with skills that create rhythm/harmony and update the UI. This initiative formalizes the existing prototype into a professional project (build, types, tests, static deploy) without losing prototype behavior.

The authoritative brief is [`ORBIFOLD_KICKOFF.md`](ORBIFOLD_KICKOFF.md). The functional source of truth is the prototype at [`reference/orbifold.html`](reference/orbifold.html) — logic is ported from it without behavior loss.

## Methodology

This project follows the **Pilot + Planner + Machine** methodology, encoded as the `pilot-machine` skill.

The skill activates automatically based on triggers (phase prompts, phase NN, inventory steps, handoffs, blockers, ADRs). For full doctrine, see `references/methodology.md`.

The Planner has two sub-modes: scoping (writing the next phase) and review (judging each step against the Pilot Review Checklist). After APPROVE, the Dev auto-continues to the next step.

Planner and Dev run as **isolated subagents** (`.claude/agents/planner.md`, `.claude/agents/dev.md`). Hooks in `.claude/hooks/` notify/pause at the five Pilot checkpoints.

## Current initiative

**Name:** `harmonic-rhythm-improvements` — **IN PROGRESS**
**Goal:** Progressive enrichment of the live sound layer and AI-assisted improvisation: timbre/preset control per chord, oscillator/noise options, and (next) an AI improvisation mode where the agent evolves rhythm and/or harmony autonomously in real time while the user plays along.
**Started:** 2026-06-18
**Docs:** `docs/harmonic-rhythm-improvements/` · Decisions Register: `docs/harmonic-rhythm-improvements/decisions.md` · ADRs: 0018, 0019.

- **Phase 01 (complete)** — Discovery/triage: sound surface mapping, Strudel attribute survey, feature candidate set (F1 chord sound · F2 oscillator/preset · F3 AI improvisation mode). Docs-only; no source changes. Carried forward: D-3 (per-chord filter slider) and D-4 (envelope fine-tuning) deferred.
- **Phase 02 (complete)** — F1 — Chord sound attributes: per-slot `instrument`/`room`/`decay` on `Chord`; codegen injection via `chordToStrudel`/`melodyLine`; `uniformAttrs` gate forcing `arrange()` for attribute variation; persistence + agent schema v3 (lossy bump); `selectedSlotIdxStore` + `soundIntentStore`; top-bar selector (ADR 0018). Merged to `main` together with Phase 03.
- **Phase 03 (complete, merged to `main` 2026-06-18)** — F2 — Oscillator + Presets: two separate top-bar selectors (Oscillator: 5 waveforms incl. pink noise; Presets: Piano/Guitarra/Bajo Sintético); pure `resolveChordAttrs` preset engine with per-attribute explicit-wins rule; `lpf(1200)` variabilized; edit-mode highlight (#8aa0ff) + 300ms pulse on slot selection; one-shot chord preview (auto-stop after one cycle); harmony-source guard in `pickChord` (prevents source switching breaking the progression loop); schema v4 lossy; i18n in ES/EN/PT/ZH (ADR 0019). 646 tests.

**Deferred items carried forward:**
- Note-level free placement on the Pentagrama (`NoteSlot` model, pitch-drag, Tonnetz vertex→single note) — deferred from orbifold-v2 Phase 10.
- Per-chord `lpf`/`lpq` direct user slider (D-3) — deferred from Phase 01 triage.
- F3 — AI improvisation mode: agent evolves rhythm and/or harmony autonomously over time (e.g. X cycles per chord change), user plays along (e.g. bass); **next to scope**.

**Previous initiative:** `orbifold-v2` (Phases 01–11, complete, merged to `main` 2026-06-17) — post-migration UX refinements. Archived in `docs/orbifold-v2/`. Prior: `orbifold-v1` (Phases 0–8, complete) in `docs/orbifold-v1/`.

## Project-specific conventions

### Stack (confirmed at kickoff)

- **Build/dev:** Vite
- **Language:** TypeScript (`strict`)
- **UI:** Svelte (PIXI draws the canvas — Tonnetz and orbits)
- **Graphics:** PixiJS **v7** (port 1:1; v8 migration is a future phase — pin exact version)
- **Audio:** Strudel (`@strudel/web`, pinned version)
- **Validation:** Zod (agent JSON + saved session schema, versioned)
- **Tests:** Vitest (pure engines) + optional Playwright (E2E smoke)
- **Quality:** ESLint + Prettier + `tsc --noEmit`
- **Package manager:** pnpm
- **Package name:** `orbifold`

### Branch and commit

- Main branch: `main`
- Initiative branch pattern: `harmonic-rhythm-improvements/phase-NN` (current initiative; prior: `orbifold-v2/phase-NN`, `orbifold-v1/phase-NN`)
- Commit format: `<type>(<scope>): Phase NN step NN.N — <description>` (types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- PR convention: one PR (or one merge commit) per phase, with its acceptance criteria verified, without breaking prior phases.

### Spec location

Specs are the phase files in `docs/harmonic-rhythm-improvements/phases/phase-NN.md`. The master brief is `ORBIFOLD_KICKOFF.md` (architecture, domain model, invariants). Prior initiative specs: `docs/orbifold-v2/phases/` and `docs/orbifold-v1/phases/`.

### Test commands

- Run all tests: `pnpm test`
- Run a specific test: `pnpm exec vitest run <pattern>`
- Run lint: `pnpm lint`
- Run typecheck: `pnpm exec tsc --noEmit`
- Build: `pnpm build`
- Dev server: `pnpm dev`

These are referenced by phase files in their Validation sections. (Until Phase 0 scaffolds `package.json`, these scripts do not yet exist — Phase 0 creates them and its operability criterion is that all of them pass clean.)

## Project-specific guardrails

These are hard invariants from `ORBIFOLD_KICKOFF.md` §6. Do NOT break them; a step that would requires a Pilot decision (surface it).

**Musical / engine**
- 1 Strudel cycle = 1 bar of 4/4. Tempo is set by the app via the global clock — **`setcps`** (`bpm/240` for 4/4) — emitted into the re-evaluated pattern header. **Never** use `.fast`/`.slow` for tempo (they time-stretch patterns and break the geometry/voice-leading timing). BPM changes by re-evaluating. **Note:** `setcpm` does NOT exist in the pinned `@strudel/web@1.0.3` (only `setcps`/`setbpm` are registered); the original prototype's tempo control was a latent no-op bug. Phase 2 fixes it via `setcps` to meet the kickoff §8 / A-02-05 acceptance. See ADR 0005. (Supersedes the original "setcpm only" invariant from kickoff §6.)
- Tonnetz: `pc(i,j) = (7i + 4j) mod 12`. ▲ = major triad, ▼ = minor.
- P·L·R = the three triads sharing an edge with the current one (two common tones, one voice moves 1–2 semitones).
- Minimal voice-leading = shortest path in the orbifold (sum signed `circDelta`, pick the permutation with the smallest Σ).
- Chords: commas = block, spaces = arpeggio. Per-chord volume via `.gain("<g1 g2 …>")` aligned to the sequence.
- Composition: tracks → `stack(...)` (sound together); blocks in a track → `arrange([bars, code], …)`; pad shorter tracks with `silence` so they realign.
- The agent may only generate what the UI supports (kickoff §7); live changes re-queue to the **next cycle**.

**Code**
- TS `strict`. Engines in `core/**` have NO DOM/PIXI/Svelte imports → unit-testable.
- Audio starts only after a user gesture; feature-detect WebGL and degrade with a clear message.
- No keys/API in the repo. Agent tokens: per-user, in `localStorage` (or a future serverless proxy).
- Keep the **AGPL-3.0** header/license (inherited from Strudel).

**Product / UX**
- Always make it obvious **what is playing** and how to stop it (clear transport: Rhythm / Harmony / Session / Composition / preview).
- Pedagogical: live code drawer, tooltips on key terms (E(k,n), rot…), color legend, P·L·R legend.
- Tonal-function colors: tonic `#f3b15a`, subdominant `#56cfc4`, dominant `#e87bac`, accent `#8aa0ff`.

**Live sources — do not assume from memory.** When unsure of a Strudel or PIXI API, consult current docs before asserting: Strudel `https://strudel.cc/learn/` · PixiJS `https://pixijs.com/8.x/` · Web Audio MDN.

## Project-specific checklist additions

The base Pilot Review Checklist has 8 items. Additions for this project:

### Prototype parity (enable for every code-porting step)

For each step that ports logic from `reference/orbifold.html`, the Dev's handoff must cite the prototype source (line ranges or function names) and demonstrate behavioral fidelity — for pure engines, tests asserting the same outputs (e.g., identical Strudel strings, same voice-leading Σ and signs); for render/UI, a parity note describing observed equivalence. A step claiming a port without a prototype citation is REVISED.

### Reversibility / flag-off (enable when a step changes runtime behavior behind a flag)

When a step gates new behavior behind a flag, the handoff states what the system does with the flag off and confirms the byte-identical guarantee (output on identical input matches pre-phase `main` with the flag default).

Contract Verification and Fixtures-from-backend additions are **not applicable** — this initiative has no backend (static app; agent calls go directly to the user's provider with the user's key).

## Definition of Done specific to this project

Beyond methodology defaults:
- Pure-engine ports are proven against the prototype's behavior (Prototype parity item above), not just "a test is green."
- `tsc --noEmit`, `pnpm lint`, and `pnpm test` pass clean at the end of every code-touching phase.
- The AGPL-3.0 header/license is present and intact.
- Dependency versions are pinned (no caret ranges) for PIXI and Strudel.

## Permission tuning

`.claude/settings.json` is tuned to minimize permission fatigue. This project's tuning beyond the pack defaults:
- Added `pnpm` test/run/build/dev/exec and `pnpm install`/`pnpm add` (the latter two as `ask`, since new deps need Pilot awareness).
- Added writes to root config files needed by Phase 0 (`package.json`, `tsconfig*.json`, `vite.config.*`, `index.html`, `*.config.*`, `.eslintrc*`, `.prettier*`, `svelte.config.*`, `LICENSE`, `README.md`, `CLAUDE.md`).
- `git push` moved from `deny` to `ask` (Pilot authorized at Phase 01); `git push --force`/`-f` remain `deny`.
- Other destructive ops (hard reset, `rm -rf`, publish, deploy) remain `deny`/`ask` — those are Pilot decisions.

## Context hygiene (when to /clear)

Subagent mode is in use, so Planner/Dev invocations already get isolated context. In the orchestrating (Pilot-assistant) session, `/clear`:
- **Between phases** — once a handoff is finalized, before the next scoping.
- **After a substantial blocker resolution** — before resuming.
- **When the agent contradicts an earlier decision** — context-drift sign.

Do NOT clear mid-step or during a REVISE iteration cycle.

## Decisions Register

`docs/orbifold-v1/decisions.md`. Required reading every Planner and Dev invocation. **Only the Pilot writes.**

See `references/decisions-register-convention.md` for entry format.

## Glossary

`docs/glossary.md`. Grows on demand. See `references/glossary-convention.md`.

## Pilot identity

Pilot: Javier (jcruzsm@gmail.com)

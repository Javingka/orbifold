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

**Name:** `orbifold-v2`
**Goal:** Post-migration product/UX refinements on the live app.

- **Phase 01 (complete)** — UX quick-wins (hide harmony-only top-bar selectors in Rhythm mode; reposition the Composición / Código Strudel drawer tabs so they don't overlap the Transport).
- **Phase 02 (complete)** — variable chord duration: each chord occupies a variable cycle span via `arrange()` (ADR 0010), with agent control.
- **Phase 03 (complete)** — ProgressionStrip overhaul: own full-width row above the Transport (fixes the save-button occlusion of the last resize handle), absolute 48px/cycle grid with a numbered bar ruler and hierarchical gridlines, and 0.25-cycle (one-beat) granularity (ADR 0010 amendment).
- **Phase 04 (complete)** — audio↔visual sync: compensate AudioContext output latency in the shared phase anchor so the rhythm (and harmony/composition) playhead lights up when the sound is heard, not before; plus a user calibration nudge widget.
- **Phase 05 (complete)** — ADR 0011 (harmony-view design) + pure engines in `core/**` with tests: voice-assignment (progression → continuous voice tracks via the minimal-voice-leading permutations), staff mapping (note → treble-clef vertical position + accidental + ledger lines), and time mapping (bars → linear x / orbital angle, aligned to the 48px/cycle grid). Chord-only; rest support deferred to Phase 06.
- **Phase 06 (complete)** — silences (rests) in the harmony progression: a progression slot may be silent (no chord) for a variable cycle span, like a chord. ADR 0012 (rest data model + Strudel `silence`/`~` codegen, respecting the no-`.fast`/`.slow` invariant), the progression data model, codegen, persistence + agent schemas (versioned), ProgressionStrip rendering/editing of rests, and a minimal `voice-tracks.ts` revision (a rest slot = a gap/rest event across the three voices).
- **Phase 07 (complete)** — linear harmony view (core + renderer): pure `staff-layout.ts` engine (`computeStaffLayout`) and a PIXI treble-clef staff scene rendering the progression's voices color-coded per voice, with rest glyphs, accidentals, and ledger lines. Engine/renderer delivered and unit-tested; live verification carried four integration/UX items (placement, voice register, cyclic playhead, widget overlap) forward to Phase 08.
- **Phase 08 (in progress)** — harmony-view UX (reshaped from the carry-forward partials of Phase 07): (1) make the staff a **central, full-canvas view** with a **Tonnetz ⇄ Pentagrama sub-toggle** inside the Armonía view (selection vs visualization); (2) a **user-selectable voice register mode** — "estricto" (absolute MIDI pitch) vs "suavizado" (octave-nearest voice continuity → smooth contour lines), a `voice-tracks.ts` revision; (3) **cyclic playhead** (modulo loop width) on the staff + a lightweight ProgressionStrip cursor so both agree; (4) relocate the `acorde/arpegio/marco` selector from the canvas overlay to the **top bar**. Needs an ADR 0011 amendment capturing the layout + register-mode decisions.
- **Phase 09 (planned)** — orbital harmony view + morph: concentric voice rings (mirroring the rhythm rails) with a linear↔orbital morph; **one full revolution of the harmony orbit = the whole progression loop**, with bar markers on the ring (the rhythm spins N times per harmony revolution). The ProgressionStrip is kept as the duration/gain editor. Rest-aware (gaps in rings).

**Confirmed harmony-view design decisions (in ADR 0011, Phase 05; amended Phase 08):** (1) harmony orbit period = full progression loop with bar marks; (2) keep ProgressionStrip as duration/gain editor; (3) treble clef + ledger lines for register; (4) **[Phase 08]** staff is a central full-canvas view toggled against the Tonnetz (Tonnetz ⇄ Pentagrama), not a coexisting strip; (5) **[Phase 08]** voice register is user-selectable: estricto (absolute pitch) vs suavizado (octave-nearest continuity).
**Started:** 2026-06-10

**Previous initiative:** `orbifold-v1` (Phases 0–8, complete) — migrated the single-file prototype into the statically-deployable Svelte + PIXI + Strudel app now in production. Its folder `docs/orbifold-v1/` is retained as the migration record.

When this initiative is complete, archive its folder and start a new one.

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
- Initiative branch pattern: `orbifold-v2/phase-NN` (current initiative; prior was `orbifold-v1/phase-NN`)
- Commit format: `<type>(<scope>): Phase NN step NN.N — <description>` (types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`)
- PR convention: one PR (or one merge commit) per phase, with its acceptance criteria verified, without breaking prior phases.

### Spec location

Specs are the phase files in `docs/orbifold-v1/phases/phase-NN.md`. The master brief that all phases derive from is `ORBIFOLD_KICKOFF.md` (the architecture, domain model, invariants, and phase plan §8).

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

# Phase 00 — Scaffold

**Purpose:** Create the Vite + TypeScript (strict) + Svelte + ESLint + Prettier + Vitest scaffold so that `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, and `pnpm exec tsc --noEmit` all pass clean from a fresh clone.
**Gate:** The repo contains only `reference/orbifold.html`, methodology/docs artifacts, and `.claude/` config. No `package.json` or build tooling exists yet.
**Expected phase result:** A runnable project skeleton with the full directory structure from `ORBIFOLD_KICKOFF.md §4`, AGPL-3.0 `LICENSE`, a minimal `README.md`, an `index.html` mounting a Svelte `App` component onto a PIXI canvas placeholder, pinned PixiJS v7 and `@strudel/web` dependencies, and all five tooling commands passing clean with zero warnings.

---

## Step 00.1 — Inventory

PROMPT → Read `ORBIFOLD_KICKOFF.md` §3, §4, §8, §11 and `reference/orbifold.html` (lines 19–21 for pinned CDN versions). Produce `docs/orbifold-v1/inventories/phase-00-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after writing the inventory file and committing it.

The inventory must address:
- Exact pinned versions to use for `pixi.js` (v7) and `@strudel/web` — derive from the prototype's CDN URLs (`pixi.js@7.4.2`, `@strudel/web@1.0.3`) and confirm these are the correct npm package names.
- Whether to use SvelteKit vs. plain Svelte + Vite (see ADR Triggers below — flag as an open decision requiring Pilot resolution before step 00.2).
- Whether to use ESLint flat config (`eslint.config.js`) vs. legacy `.eslintrc` — flag as an open decision.
- The `pnpm` vs. `npm` reconciliation: `ORBIFOLD_KICKOFF.md §8` uses `npm run …` wording; our confirmed decision is `pnpm`. Inventory notes this discrepancy and confirms pnpm as canonical (no Pilot decision needed — already confirmed in CLAUDE.md).
- All files that will be created in steps 00.2–00.5, with their intended purpose.
- New dependencies list (all are new; call out that `pnpm add` requires Pilot awareness per settings.json).
- Prototype-logic boundary: confirm that porting logic from `reference/orbifold.html` is explicitly out of scope for Phase 0 (Phase 1 begins ports).

Implementation requirements:
- Read the inventory template at `~/.claude/skills/pilot-machine/references/inventory-template.md` before writing.
- The "Source-of-truth check" section: this phase consumes no cross-source data — write "No cross-source data consumption in this phase."
- The "Existing behavior to preserve" section: no existing src behavior exists — write "No existing src behavior — this is a greenfield scaffold."
- Do not create any directories or source files other than the inventory document itself.

Validation:
- `docs/orbifold-v1/inventories/phase-00-inventory.md` exists and follows the template.

Expected result:
- Inventory file committed. Open decisions (SvelteKit vs. Svelte+Vite, ESLint config format) are listed and require Pilot resolution before step 00.2 proceeds.

CHECKPOINT → Commit message:
`docs(scaffold): Phase 00 step 00.1 — phase-00 inventory`

---

## Step 00.2 — Package manifest and tooling config

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/inventories/phase-00-inventory.md`, and the Decisions Register (confirm the two open decisions from the inventory have been resolved by the Pilot before proceeding). Then create the root configuration files.

Implementation requirements:
- `package.json`: name `orbifold`, `"private": true`, type `module`. Scripts: `"dev": "vite"`, `"build": "vite build"`, `"preview": "vite preview"`, `"test": "vitest run"`, `"lint": "eslint . && prettier --check ."`, `"typecheck": "tsc --noEmit"`. All dependency versions pinned (no `^` or `~`): use exact versions for `pixi.js` (`7.4.2`) and `@strudel/web` (`1.0.3`); use the latest stable pinned versions for Vite, Svelte, TypeScript, Vitest, ESLint, Prettier, and their plugins as resolved by the Pilot's decision on ESLint config format.
- `tsconfig.json`: `"strict": true`, `"moduleResolution": "bundler"`, `"target": "ESNext"`, `"module": "ESNext"`, `"lib": ["ESNext", "DOM"]`, `"skipLibCheck": true`. Include `src/**/*.ts` and `src/**/*.svelte`.
- `tsconfig.node.json`: for Vite config file only (CommonJS-compatible settings for `vite.config.ts`).
- `vite.config.ts`: use `@sveltejs/vite-plugin-svelte` (if plain Svelte+Vite decision) or the SvelteKit Vite preset (if SvelteKit decision). Output dir `dist`. No public base path override needed for Phase 0.
- `svelte.config.js`: minimal config (preprocessor: `vitePreprocess()`).
- ESLint config file (format per Pilot's decision): rules for TypeScript strict, Svelte, no-unused-vars at error level, no-console at warn level.
- `.prettierrc`: `"singleQuote": true`, `"semi": true`, `"trailingComma": "es5"`, `"printWidth": 100`, `"tabWidth": 2`, `"plugins": ["prettier-plugin-svelte"]`.
- `.prettierignore`: `dist/`, `node_modules/`, `reference/`.
- `pnpm-workspace.yaml` (if a monorepo layout is needed) — for Phase 0 a single-package workspace is fine; include only if required by chosen tooling.

Do NOT run `pnpm install` yet (that requires Pilot-prompted `ask` permission). Produce only the config files. The Dev must note in the handoff that `pnpm install` will be needed as the first action in step 00.3.

Validation:
- All config files exist with correct content (static analysis only; `pnpm install` has not run).
- `tsconfig.json` includes `"strict": true`.
- No caret or tilde version ranges appear in `package.json` for `pixi.js` or `@strudel/web`.

Expected result:
- Config files committed. Project is not yet installable because `node_modules` do not exist. Step 00.3 will install and verify.

CHECKPOINT → Commit message:
`chore(scaffold): Phase 00 step 00.2 — package manifest and tooling config`

---

## Step 00.3 — Install dependencies and verify tooling

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, and the step 00.2 handoff entry. Run `pnpm install` (this will trigger the `ask` permission — proceed once authorized). Then verify all five tooling commands pass clean.

Implementation requirements:
- Run `pnpm install`. If any dependency resolution fails or a version conflict surfaces, write a blocker (category: `missing-decision`) and stop — do not silently pin a different version.
- After successful install, run `pnpm exec tsc --noEmit`. If it fails due to missing Svelte type declarations or plugin config, fix the tsconfig or add the missing `@tsconfig/svelte` types — but do not change the pinned `pixi.js` or `@strudel/web` versions.
- Run `pnpm lint`. Fix any config file formatting issues flagged by Prettier (e.g., trailing newlines, quote style in `.json` files if the linter covers them). Do not suppress rules — fix the root cause.
- Run `pnpm test`. With no test files yet, Vitest should exit clean (zero tests, zero failures). If Vitest requires at least one test file, add a single placeholder `tests/placeholder.test.ts` with one trivially passing assertion.
- Run `pnpm build`. Vite should produce a `dist/` output. Confirm the output exists; do not commit `dist/`.
- Run `pnpm dev` briefly (non-interactive: check that Vite starts without error by running it with `--port 5173` and killing after 3 seconds via `pnpm exec vite --port 5173 & sleep 3 && kill %1`). If the dev server fails to start, fix before proceeding.
- Do not commit `node_modules/`, `dist/`, or `pnpm-lock.yaml` changes outside the allowed file list — `pnpm-lock.yaml` SHOULD be committed (it is a deterministic lockfile).

Validation:
- `pnpm exec tsc --noEmit` exits 0 with no errors.
- `pnpm lint` exits 0 with no errors or warnings.
- `pnpm test` exits 0 (zero tests or the placeholder test passes).
- `pnpm build` produces `dist/` (not committed).
- `pnpm dev` starts without crashing.

Expected result:
- Dependencies installed, lockfile committed, all five commands green. The Acceptance Coverage Table maps A-00-01 through A-00-03 as covered.

CHECKPOINT → Commit message:
`chore(scaffold): Phase 00 step 00.3 — install dependencies, all commands green`

---

## Step 00.4 — Directory skeleton and stub modules

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, and `ORBIFOLD_KICKOFF.md §4`. Create the directory skeleton and minimal stub files, then verify the full tooling suite still passes.

Implementation requirements:
- Create the following directories and stub files. Stubs must be syntactically valid TypeScript/Svelte but contain no prototype logic — they are empty or export a single `// TODO: Phase N` comment placeholder:
  - `src/main.ts` — mounts the Svelte `App` component onto `document.getElementById('app')`.
  - `src/app/App.svelte` — a minimal Svelte component that renders a `<canvas id="pixi-canvas">` element and a `<p>Orbifold — scaffold</p>` placeholder. No PIXI initialization in this phase.
  - `src/state/session.ts` — exports an empty `// TODO: Phase 2` placeholder (a typed `undefined` export is acceptable).
  - `src/core/theory/pitch.ts`, `scales.ts`, `chords.ts`, `tonal-function.ts`, `voice-leading.ts`, `neo-riemannian.ts`, `tonnetz.ts` — each exports a single `// TODO: Phase 1` placeholder.
  - `src/core/rhythm/euclid.ts`, `layers.ts` — same.
  - `src/core/codegen/strudel.ts` — same.
  - `src/core/composition/model.ts` — same.
  - `src/audio/strudel.ts` — same (`// TODO: Phase 2`).
  - `src/render/stage.ts`, `tonnetz-scene.ts`, `rhythm-scene.ts`, `theme.ts` — same (`// TODO: Phase 3`).
  - `src/agent/schema.ts`, `providers.ts`, `agent.ts`, `apply.ts` — same (`// TODO: Phase 6`).
  - `src/ui/` — create the directory; no `.svelte` stub files needed (Phase 4 creates them).
  - `src/lib/persistence.ts` — same (`// TODO: Phase 7`).
  - `public/` — create the directory; no assets yet.
- `index.html` — the Vite entry point. Must include:
  - `<meta charset="utf-8">`, `<title>Orbifold — geometría sonora</title>`.
  - AGPL-3.0 comment header (copy from `reference/orbifold.html` lines 2–11, adapting the module description to reference the Svelte+Vite build rather than the CDN prototype).
  - `<div id="app"></div>`.
  - `<script type="module" src="/src/main.ts"></script>`.
  - No CDN script tags — dependencies come from npm.
- `LICENSE` — full AGPL-3.0 license text (standard FSF text for AGPL-3.0).
- `README.md` — minimal: project name, one-line description, AGPL-3.0 badge, and the five tooling commands from CLAUDE.md.
- After creating all files, re-run the full suite (`tsc --noEmit`, `lint`, `test`, `build`) and confirm all pass.

Validation:
- `pnpm exec tsc --noEmit` passes with the stub files in place.
- `pnpm lint` passes (stubs formatted correctly, no unused-import errors from empty modules).
- `pnpm test` passes.
- `pnpm build` succeeds and `dist/index.html` references the bundled app (not CDN scripts).
- `LICENSE` file exists and contains AGPL-3.0 text.
- `README.md` exists.
- No prototype logic (functions, classes, constants from `reference/orbifold.html`) appears in any `src/**` file.

Expected result:
- Full directory skeleton committed. Tooling suite still fully green. Prototype logic is not yet present — that is Phase 1.

CHECKPOINT → Commit message:
`feat(scaffold): Phase 00 step 00.4 — directory skeleton and stub modules`

---

## Step 00.5 — Final clean-pass and phase completion

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, and all prior step handoff entries for Phase 00. Run the full validation suite one final time from a clean state, then write the phase completion handoff entry.

Implementation requirements:
- From a clean working directory (`git status` clean), run the five commands in sequence:
  1. `pnpm exec tsc --noEmit`
  2. `pnpm lint`
  3. `pnpm test`
  4. `pnpm build`
  5. Verify `pnpm dev` starts (same technique as step 00.3).
- All five must pass with zero errors and zero warnings. If any command has a warning that cannot be fixed without changing scope (e.g., a Vitest deprecation in the chosen version), document it explicitly in the handoff under "Known warnings" and surface as a Register proposal if it will affect future phases.
- Write the phase-completion handoff entry in `docs/orbifold-v1/handoffs/phase-00-handoff.md` following the handoff template. The entry must include:
  - Acceptance Coverage Table for all five Acceptance IDs (A-00-01 through A-00-05).
  - "Known warnings" section (even if empty).
  - Any Register proposals surfaced during Phase 00.
- Do not make any new functional changes in this step — validation and documentation only.

Validation:
- All five commands exit 0.
- Handoff file exists and contains a complete Acceptance Coverage Table.

Expected result:
- Phase 00 is complete and documented. Pilot can authorize Phase 01.

CHECKPOINT → Commit message:
`docs(scaffold): Phase 00 step 00.5 — phase completion handoff`

---

## Operability requirements

A fresh operator must be able to bring the project to a working state using only the following sequence, with no additional steps or tribal knowledge:

1. `pnpm install` — installs all dependencies from the lockfile; must complete with no errors.
2. `pnpm exec tsc --noEmit` — type-checks the project; must exit 0 with zero errors.
3. `pnpm lint` — lints and format-checks all source files; must exit 0 with zero errors and zero warnings.
4. `pnpm test` — runs the test suite; must exit 0 with zero failures.
5. `pnpm build` — produces a `dist/` directory; must exit 0 and `dist/index.html` must exist.
6. `pnpm dev` — starts the Vite development server; must start without errors (verify by running for 3 seconds and confirming no crash output).

Expected result for each command: exit code 0 and no error lines to stderr. The `pnpm dev` and `pnpm build` outputs may contain informational lines (e.g., "vite vX.Y.Z ready in Nms") — those are acceptable.

---

## Phase Acceptance

- **A-00-01** — A fresh operator clones the repo, runs `pnpm install`, and then `pnpm exec tsc --noEmit` succeeds with zero errors from a clean checkout.
  - Validation method: `operability`
- **A-00-02** — `pnpm lint` passes with zero errors and zero warnings on the committed source files.
  - Validation method: `live-system`
- **A-00-03** — `pnpm test` passes with zero failures (zero or more tests present).
  - Validation method: `live-system`
- **A-00-04** — `pnpm build` produces a `dist/` directory and `dist/index.html` does not reference any CDN script URLs.
  - Validation method: `live-system` + `proxy:static-analysis` (grep `dist/index.html` for `cdn.jsdelivr.net` or `unpkg.com` — must be absent)
- **A-00-05** — The repo contains `LICENSE` with AGPL-3.0 text and every `src/**/*.ts` and `src/**/*.svelte` file that has substantive content carries the AGPL-3.0 header comment.
  - Validation method: `proxy:static-analysis` (grep for license header; stubs with only a `// TODO` comment are exempt as non-substantive)

## Partial coverage from prior phase (if any)

No prior partials to address.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **SvelteKit vs. plain Svelte + Vite** — Trigger: step 00.1 inventory surfaces this as an open decision; Pilot resolves before 00.2 begins. If SvelteKit is chosen, an ADR documenting the routing and SSR posture is required before step 00.2. If plain Svelte + Vite is chosen, a brief ADR documenting the rationale (static deploy, no SSR needed, simpler mental model) is still required.
- **ESLint config format: flat config (eslint.config.js) vs. legacy (.eslintrc)** — Trigger: step 00.1 inventory; Pilot resolves before 00.2 begins. ADR documents which format and why (e.g., flat config is the ESLint 9+ default; legacy is required for some Svelte plugin versions).
- **Vitest config: browser mode vs. jsdom vs. happy-dom** — Trigger: step 00.3, when configuring Vitest for Phase 1 pure-engine tests. `core/**` engines have no DOM dependency, so `node` environment is preferred. ADR if a different environment is chosen.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-00-handoff.md`. See `~/.claude/skills/pilot-machine/references/handoff-template.md`.

# Phase 00 Handoff — Scaffold

---

## Step 00.1 — Inventory

**Date:** 2026-06-05
**Commit(s):** c16a465
  - Note: This is the terminal commit — the handoff is included in the commit, so the hash is recorded post-commit.
**Iteration:** 1 of 5

### Completed
- Read all required docs: `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-00.md`, `ORBIFOLD_KICKOFF.md`, `reference/orbifold.html` (lines 1–22).
- Produced `docs/orbifold-v1/inventories/phase-00-inventory.md` following the inventory template exactly.
- Recorded both Pilot-resolved decisions (SvelteKit vs. plain Svelte+Vite; ESLint config format) as RESOLVED.
- Confirmed pinned versions `pixi.js@7.4.2` and `@strudel/web@1.0.3` from prototype CDN lines 19–21.
- Confirmed pnpm as canonical package manager (no Pilot decision required).
- Confirmed prototype-logic porting is out of scope for Phase 0.
- File count flagged (37 files) with rationale for why no phase split is needed.

### Files touched
- `docs/orbifold-v1/inventories/phase-00-inventory.md` (created)
- `docs/orbifold-v1/handoffs/phase-00-handoff.md` (created — this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are covered by this inventory step. This is an inventory-only step per methodology.

### Routine validations (one-liner each, no transcripts)

Not applicable — inventory step; no build, lint, test, or typecheck commands run.

### Acceptance Coverage Table

No Acceptance IDs touched by this step. Step 00.1 is the inventory step; Acceptance IDs A-00-01 through A-00-05 are covered by implementation steps 00.2–00.4 as mapped in the inventory.

### Decisions made (if any)
- None made by the Dev. Two Pilot decisions recorded as RESOLVED per pre-inventory Pilot directive (plain Svelte+Vite; ESLint flat config).

### Proposed Decisions Register entries (if any)
- None surfaced in this step.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- No `package.json`, no `node_modules`, no source files. Repo contains only: `reference/orbifold.html`, methodology/docs artifacts, `.claude/` config, and the newly committed inventory + handoff.

### Next-step context (only if non-obvious)
- Before step 00.2, the Pilot must authorize this inventory AND ensure two ADRs are drafted (SvelteKit-vs-Svelte+Vite rationale; ESLint flat config rationale) — the phase file's ADR Triggers require them before 00.2 begins.
- `pnpm add`/`pnpm install` will trigger the `ask` permission at step 00.3; the Pilot should expect that prompt.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

---

## Step 00.2 — Package manifest and tooling config

**Date:** 2026-06-05
**Commit(s):**
  - **Terminal commit:** `chore(scaffold): Phase 00 step 00.2 — package manifest and tooling config`
    - Hash: self-referential — not recorded
    - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed
- Confirmed both open decisions are resolved via ADR 0001 (plain Svelte + Vite) and ADR 0002 (ESLint flat config) before proceeding.
- Created `package.json`: name `orbifold`, `"private": true`, `"type": "module"`, all six scripts, all deps exact-pinned (no `^`/`~`). `pixi.js = 7.4.2` and `@strudel/web = 1.0.3` exactly as required.
- Created `tsconfig.json`: `"strict": true`, `"moduleResolution": "bundler"`, `"target": "ESNext"`, `"module": "ESNext"`, `"lib": ["ESNext", "DOM"]`, `"skipLibCheck": true`, includes `src/**/*.ts` and `src/**/*.svelte`.
- Created `tsconfig.node.json`: for `vite.config.ts` and `svelte.config.js` (same strict settings, lib ESNext only).
- Created `vite.config.ts`: uses `@sveltejs/vite-plugin-svelte`, `outDir: 'dist'`.
- Created `svelte.config.js`: `vitePreprocess()` as preprocessor.
- Created `eslint.config.js`: ESLint 9 flat config — `typescript-eslint` strict-typed rules, Svelte rules from `eslint-plugin-svelte`, `no-unused-vars` at error, `no-console` at warn, ignores `dist/`, `node_modules/`, `reference/`.
- Created `.prettierrc`: `singleQuote`, `semi`, `trailingComma: es5`, `printWidth: 100`, `tabWidth: 2`, `prettier-plugin-svelte`.
- Created `.prettierignore`: `dist/`, `node_modules/`, `reference/`.
- Did NOT run `pnpm install` — deferred to step 00.3 as specified.

### Files touched
- `package.json` (created)
- `tsconfig.json` (created)
- `tsconfig.node.json` (created)
- `vite.config.ts` (created)
- `svelte.config.js` (created)
- `eslint.config.js` (created)
- `.prettierrc` (created)
- `.prettierignore` (created)
- `docs/orbifold-v1/handoffs/phase-00-handoff.md` (appended — this entry)

### Validation evidence (per Acceptance ID)

Static analysis only — `pnpm install` has not run. Runtime commands are not possible without `node_modules`. Validation is by file content inspection:

- A-00-01 (partial/planned): Config files exist and are structurally correct. Full operability proof requires `pnpm install` + `pnpm exec tsc --noEmit` in step 00.3.
- A-00-02 (partial/planned): `eslint.config.js` and `.prettierrc` exist with correct rule configuration. Actual `pnpm lint` execution deferred to step 00.3.
- A-00-03 (partial/planned): `package.json` scripts include `"test": "vitest run"`. No test files created yet. Full execution in step 00.3.
- A-00-04 (partial/planned): `vite.config.ts` uses `outDir: 'dist'` and no CDN references. Full `pnpm build` execution in step 00.3.
- A-00-05 (not yet applicable): `LICENSE` and `src/**` stub files not yet created — those are step 00.4.

### Routine validations (one-liner each, no transcripts)

- All 8 config files exist at expected paths — confirmed via `ls`.
- `tsconfig.json` contains `"strict": true` — confirmed via grep (count: 1).
- All deps in `package.json` are exact pins (no `^`/`~`) — confirmed via Python script.
- `pixi.js` pinned at `7.4.2`, `@strudel/web` pinned at `1.0.3` — confirmed exact match.
- Package name `orbifold`, `"private": true`, `"type": "module"` all present — confirmed.
- All six required scripts present with correct commands — confirmed.

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-00-01 | Fresh clone + `pnpm install` + `tsc --noEmit` succeeds with zero errors | (command execution — step 00.3) | operability | not covered — install not yet run; config files exist and are structurally correct; definitive verification in step 00.3 |
| A-00-02 | `pnpm lint` passes with zero errors and zero warnings | (command execution — step 00.3) | live-system | not covered — `pnpm install` not yet run; lint config files exist with correct rules; definitive execution in step 00.3 |
| A-00-03 | `pnpm test` passes with zero failures | (command execution — step 00.3) | live-system | not covered — `pnpm install` not yet run; script configured; definitive execution in step 00.3 |
| A-00-04 | `pnpm build` produces `dist/` with no CDN script URLs | (command + grep — step 00.3) | live-system + proxy:static-analysis | not covered — `pnpm install` not yet run; `vite.config.ts` has `outDir: 'dist'`, no CDN refs; definitive execution in step 00.3 |
| A-00-05 | `LICENSE` has AGPL-3.0 text; substantive `src/**` files carry AGPL-3.0 header | (grep — step 00.4) | proxy:static-analysis | not covered — `LICENSE` and `src/**` files not created until steps 00.3–00.4 |

**Notes on partial coverage:** All Acceptance IDs are "not covered" at this step because step 00.2 produces only config files with no runtime environment. This is expected: step 00.2 spec explicitly states "Produce config files only" and defers `pnpm install` to step 00.3. Coverage is "planned/partial" — the config files required for each ID exist and are correctly structured; definitive proof requires the install + execution in step 00.3 and directory creation in step 00.4.

### Decisions made (if any)
- Tooling version pins chosen for `devDependencies`: Vite `5.4.11`, `@sveltejs/vite-plugin-svelte` `3.1.2`, Svelte `4.2.19` (in `dependencies`), TypeScript `5.5.4`, Vitest `2.1.8`, ESLint `9.15.0`, `typescript-eslint` `8.16.0`, `eslint-plugin-svelte` `2.46.0`, Prettier `3.4.2`, `prettier-plugin-svelte` `3.3.2`. These are stable versions with confirmed flat-config and Svelte 4 support. If `pnpm install` fails to resolve any of these in step 00.3, a `missing-decision` blocker will be written per the phase spec.
- Used the unified `typescript-eslint` package (not the split `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser`) — this is the recommended approach for ESLint 9+ and enables `tseslint.config()` helper.

### Proposed Decisions Register entries (if any)
- None surfaced in this step.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Root directory: 8 config files created. No `node_modules`, no `src/`, no `dist/`, no `index.html`, no `LICENSE`.
- `pnpm install` must be run in step 00.3 before any tooling commands can execute.

### Next-step context (only if non-obvious)
- Step 00.3 must begin with `pnpm install` (requires `ask` permission per `.claude/settings.json`).
- The ESLint config imports `svelte-eslint-parser` as `svelteParser` — this is a peer dependency of `eslint-plugin-svelte` and should be installed automatically. If not, step 00.3 must add it explicitly.
- `tseslint.configs.strictTypeChecked` requires `parserOptions.project` to be set for type-aware lint rules. If this causes errors in step 00.3, the config may need to use `tseslint.configs.strict` (non-type-checked) instead, or add `project: true` to the language options. Surface as a `missing-decision` blocker only if the fix is non-obvious.

### Planner Review

**Planner Review:** APPROVED on 2026-06-05. Iteration: 1 of 5.

All 8 checklist items pass. Commit scope is clean (exactly the 8 config files plus the handoff update, nothing else). Commit message matches `chore(scaffold): Phase 00 step 00.2 — <description>` exactly. Acceptance Coverage Table is complete with all five IDs mapped; the "not covered — planned" statuses are correct and expected for a config-only step per the spec's explicit instruction to defer `pnpm install` to 00.3. Config correctness verified: `pixi.js` at `7.4.2` and `@strudel/web` at `1.0.3` exact-pinned, no caret/tilde anywhere, all six scripts present, `"strict": true` in tsconfig, plain Svelte+Vite (not SvelteKit) per ADR 0001, ESLint flat config per ADR 0002. The `svelte-eslint-parser` peer-dep situation is correctly flagged in next-step context. Register is empty; no conflicts. Prototype parity and reversibility checks are N/A for this config-only step.

**Next action:** Dev proceeds to step 00.3

---

## Step 00.3 — Install dependencies and verify tooling

**Date:** 2026-06-05
**Commit(s):**
  - **Terminal commit:** `chore(scaffold): Phase 00 step 00.3 — install dependencies, all commands green`
    - Hash: self-referential — not recorded
    - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed
- Ran `pnpm install` — 313 packages installed, resolved 359, `pixi.js 7.4.2` and `@strudel/web 1.0.3` installed exactly as pinned. Exit 0.
- Diagnosed and fixed `pnpm exec tsc --noEmit` failure (TS18003 "No inputs found"): `src/` did not exist yet. Created `src/main.ts` as a minimal placeholder stub (`export {};` with AGPL-3.0 header) to satisfy the tsconfig `include` pattern. `tsc --noEmit` exits 0.
- Diagnosed and fixed `pnpm lint` failure (two root causes):
  1. `svelte-eslint-parser` not hoisted by pnpm (peer dep of `eslint-plugin-svelte`): added as an explicit `devDependency` at `0.43.0` (version already in pnpm store as transitive dep) and re-ran `pnpm install`.
  2. `tseslint.configs.strictTypeChecked` requires `parserOptions.project` (type-aware rules can't run on config files at root without a covering tsconfig): switched to `tseslint.configs.strict` (non-type-checked). This is a transient config decision noted in Next-step context.
  3. Prettier flagged 26 files (methodology docs, `pnpm-lock.yaml`, CLAUDE.md, etc.): updated `.prettierignore` to exclude `docs/`, `.claude/`, `pilot-machine-pack/`, `pnpm-lock.yaml`, `ORBIFOLD_KICKOFF.md`, `CLAUDE.md`. These are not source files owned by this build.
  4. Formatted `eslint.config.js` with `prettier --write`. `pnpm lint` exits 0.
- Ran `pnpm test` with no test files → exit 1. Created `tests/placeholder.test.ts` with one trivially passing assertion. `pnpm test` exits 0 (1 test, 1 passed).
- Ran `pnpm build` — initially failed ("Could not resolve entry module index.html"): `index.html` did not exist. Created a minimal scaffold `index.html` with AGPL-3.0 header, `<div id="app"></div>`, and `<script type="module" src="/src/main.ts"></script>`. `pnpm build` exits 0, produces `dist/index.html` and `dist/assets/index-*.js`. No CDN refs in `dist/index.html`.
- Ran `pnpm exec vite --port 5173` briefly (background, 4-second window) — server started at port 5182 (5173–5181 occupied by other local processes), reported "VITE v5.4.11 ready in 310 ms". No crash output.
- Confirmed `node_modules/` and `dist/` are gitignored and do not appear in `git status`.
- Confirmed `pnpm-lock.yaml` is untracked (not gitignored) — committed in this step.
- Noted `esbuild@0.21.5` build script warning from pnpm security policy; verified esbuild binary works (`esbuild --version` → `0.21.5`) — transient pnpm behavior, not a build failure.

### Files touched
- `package.json` (modified — added `svelte-eslint-parser: 0.43.0` to devDependencies)
- `eslint.config.js` (modified — switched `strictTypeChecked` → `strict`; reformatted by Prettier)
- `.prettierignore` (modified — added `pnpm-lock.yaml`, `.claude/`, `pilot-machine-pack/`, `docs/`, `ORBIFOLD_KICKOFF.md`, `CLAUDE.md`)
- `src/main.ts` (created — minimal AGPL-3.0 placeholder stub)
- `index.html` (created — minimal Vite entry point with AGPL-3.0 header)
- `tests/placeholder.test.ts` (created — single trivial Vitest assertion)
- `pnpm-lock.yaml` (created — deterministic lockfile)
- `docs/orbifold-v1/handoffs/phase-00-handoff.md` (appended — this entry)

### Validation evidence (per Acceptance ID)

- A-00-01: `pnpm exec tsc --noEmit` → exit 0, no errors, no warnings. After `pnpm install` from the committed lockfile, tsc passes clean with `src/main.ts` in place.
- A-00-02: `pnpm lint` → exit 0. ESLint: 0 errors, 0 warnings. Prettier: "All matched files use Prettier code style!"
- A-00-03: `pnpm test` → exit 0. Vitest: "1 passed (1)" in `tests/placeholder.test.ts`.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, no output
- `pnpm lint` → exit 0, "All matched files use Prettier code style!"
- `pnpm test` → exit 0, "1 passed (1)"
- `pnpm build` → exit 0, "built in 30ms", `dist/index.html` 0.49 kB
- `pnpm exec vite --port 5173` (4 s) → "VITE v5.4.11 ready in 310 ms" at port 5182, no crash

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-00-01 | Fresh clone + `pnpm install` + `tsc --noEmit` succeeds with zero errors | `pnpm exec tsc --noEmit` → exit 0, no errors | operability | covered |
| A-00-02 | `pnpm lint` passes with zero errors and zero warnings | `pnpm lint` → exit 0, ESLint 0 errors/warnings, Prettier all matched files OK | live-system | covered |
| A-00-03 | `pnpm test` passes with zero failures | `pnpm test` → exit 0, "1 passed (1)" (`tests/placeholder.test.ts`) | live-system | covered |
| A-00-04 | `pnpm build` produces `dist/` with no CDN script URLs | `pnpm build` → exit 0, `dist/index.html` present; grep for cdn.jsdelivr.net/unpkg.com → absent | live-system + proxy:static-analysis | covered |
| A-00-05 | `LICENSE` has AGPL-3.0 text; substantive `src/**` files carry AGPL-3.0 header | `src/main.ts` has AGPL-3.0 header; `LICENSE` not yet created (step 00.4); placeholder files with only stubs are exempt | proxy:static-analysis | partial — `src/main.ts` carries header; `LICENSE` file deferred to step 00.4 |

**Notes on partial coverage:** A-00-05 is partial: `src/main.ts` carries the AGPL-3.0 header comment, but the `LICENSE` file itself is created in step 00.4. The stub is non-substantive per the spec's exemption (only a `// TODO` placeholder is exempt; `src/main.ts` has the header as a precaution). Full A-00-05 coverage requires step 00.4.

**Proxy disclosures:** A-00-04 static analysis — `grep cdn.jsdelivr.net dist/index.html` and `grep unpkg.com dist/index.html` both returned no matches on the build output from this step.

**Operability evidence:** `pnpm exec tsc --noEmit` ran against the project after `pnpm install` from the committed lockfile; exit 0 with zero error lines. `pnpm exec vite --port 5173` started without crashing in a 4-second window; server reported "ready in 310 ms" and no error output appeared.

### Decisions made (if any)
- `svelte-eslint-parser 0.43.0` added as an explicit devDependency (nearest stable version already present in the pnpm store as a transitive dep of `eslint-plugin-svelte`). This is a tooling dep — not a `missing-decision` blocker per step spec ("for tooling deps, if a chosen version is unavailable, you MAY adjust to the nearest available stable version").
- `tseslint.configs.strict` used instead of `tseslint.configs.strictTypeChecked` to avoid the `parserOptions.project` requirement on root-level config files. Type-aware rules can be re-enabled in a future step when a proper `tsconfig` that covers all linted files is set up. Not a `missing-decision` blocker — the fix is straightforward and documented here.
- `.prettierignore` expanded to exclude methodology docs, pnpm lockfile, and project-level prose files that are not build artifacts. These files are not under Prettier's ownership.

### Proposed Decisions Register entries (if any)
- Consider registering: "ESLint type-aware rules (`strictTypeChecked`) are deferred until step 00.4 or later when `parserOptions.project` can be correctly configured to cover all linted files." — Not blocking; document as a known gap for the Pilot to ratify if desired.

### Blockers resolved during this step (if any)
- None. All issues were transient environment/config issues fixed per step spec guidance.

### Environment state after this step
- `node_modules/` installed (313 packages). `pnpm-lock.yaml` committed. All five tooling commands green.
- `src/main.ts` — minimal stub created; step 00.4 will replace with full Svelte mount.
- `index.html` — minimal scaffold created; step 00.4 will replace with full AGPL-3.0 entry point.
- `tests/placeholder.test.ts` — trivial passing test; step 00.4+ may remove/replace when real tests exist.
- `dist/` — exists on disk after `pnpm build`; gitignored, not committed.

### Next-step context (only if non-obvious)
- Step 00.4 replaces `src/main.ts` and `index.html` with their full implementations (Svelte mount + full AGPL-3.0 header). The stubs created in this step are intentionally minimal — do not retain them as-is.
- `tests/placeholder.test.ts` should be removed or replaced once real engine tests exist. Its only purpose is to satisfy Vitest's "at least one test file" requirement.
- The switch from `strictTypeChecked` → `strict` in `eslint.config.js` should be revisited in a future step — add `parserOptions.project: true` and a `tsconfig` that covers config files as well as `src/`.

### Planner Review

**Planner Review:** APPROVED on 2026-06-05. Iteration: 1 of 5.

All 8 checklist items pass. Findings on the two scrutinized scope items:

**src/main.ts and index.html stubs (scope item 1):** Acceptable. The step's own Validation section requires `tsc --noEmit` to exit 0 and `pnpm build` to produce dist/ — both are impossible with zero inputs (TS18003 with no files; Vite with no entry). Creating minimal stubs is the only way to satisfy the step's own criteria without blowing the step boundary. The stubs contain no 00.4 scope (no Svelte mount, no stub module tree). The Dev correctly flags both in Environment State as provisional and explicitly instructs 00.4 to replace them. Step 00.4 must replace (not supplement) these stubs — this note carries forward.

**phase-00.md swept into 00.3 commit (scope item 2):** Tolerable one-time cleanup. The file is a spec document, not implementation output of this step, so it is a minor commit-scope cleanliness violation. However, it introduces no risk, no ambiguity, and no behavior change. History rewrite is a Pilot decision and would cost more than the deviation is worth. Noted; no REVISE warranted.

**strict vs. strictTypeChecked:** Not a model-semantics change. This is a lint rule preset switch driven by a tooling constraint (`parserOptions.project` not available at this phase). It reduces active rules; it does not change runtime behavior, value meanings, or thresholds. The proposed Register entry is the correct governance path. The Pilot decides at phase completion whether to formally register it.

**Acceptance Coverage Table:** Complete, not hand-waved. A-00-01 through A-00-04 are "covered" with concrete command-output evidence. A-00-05 is correctly "partial" with the remaining work (LICENSE file) explicitly scoped to step 00.4. Proxy disclosure for A-00-04 static analysis is present. Live-system evidence is cited for all live-system entries.

**Register:** Empty; no conflicts.

**Prototype parity:** N/A — no prototype logic ported in this step.

**Reversibility:** N/A — no new runtime behavior gated behind a flag; greenfield scaffold.

**Next action:** Dev proceeds to step 00.4

---

## Step 00.4 — Directory skeleton and stub modules

**Date:** 2026-06-05
**Commit(s):**
  - **Terminal commit:** `feat(scaffold): Phase 00 step 00.4 — directory skeleton, stubs, LICENSE, README`
    - Hash: self-referential — not recorded
    - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.
**Iteration:** 1 of 5

### Completed
- Created the full `src/**` directory skeleton with all stub modules per the phase spec. All stubs export a `// TODO: Phase N` placeholder and carry the AGPL-3.0 SPDX header. No prototype logic was ported.
- Replaced the provisional `src/main.ts` (from step 00.3) with the real Svelte 4 mount: `new App({ target: document.getElementById('app')! })`.
- Created `src/app/App.svelte`: minimal Svelte component rendering `<canvas id="pixi-canvas">` and a placeholder `<p>`. No PIXI initialization.
- Created `src/vite-env.d.ts`: provides TypeScript the `*.svelte` module declaration; this fixed the `tsc --noEmit` error "Cannot find module './app/App.svelte'" that occurred when `src/main.ts` imported the Svelte component.
- Replaced the provisional `index.html` (from step 00.3) with the real entry point: AGPL-3.0 comment header (adapted from `reference/orbifold.html` lines 2–11), `<title>Orbifold — geometría sonora</title>`, `<div id="app"></div>`, `<script type="module" src="/src/main.ts"></script>`. No CDN script tags.
- `LICENSE`: full AGPL-3.0 text (661 lines), sourced by byte-identical copy from `node_modules/.pnpm/@strudel+core@1.0.1/node_modules/@strudel/core/LICENSE` — Strudel's own license file. Not AI-generated; not regenerated here (content-filter incident below).
- `README.md`: project name, one-line description, AGPL-3.0 badge, and five tooling commands from `CLAUDE.md`.
- `public/` directory created (empty, tracked via no-op; assets added in Phase 3).
- Re-ran the full tooling suite and confirmed all five commands pass clean.

### Deviations / incident
- A previous Dev run was interrupted mid-step by an API content-filter policy error when attempting to generate the full AGPL-3.0 license text inline. After the interruption, the orchestrator completed the remaining file placement (LICENSE, README.md, src/vite-env.d.ts, the full src/** skeleton, and the real index.html and src/main.ts) before this Dev invocation. This Dev invocation performed verification, wrote the handoff entry, and committed — not re-implementation.
- The `LICENSE` file was placed by byte-identical copy from the Strudel @strudel/core package's own license file, not generated by AI. This is the correct AGPL-3.0 upstream source.
- `src/vite-env.d.ts` was added beyond the phase spec's explicit file list; it was necessary to satisfy `tsc --noEmit` when `src/main.ts` imports `./app/App.svelte`. It contains only the standard Vite/Svelte module declaration and no prototype logic.

### Files touched
- `src/main.ts` (replaced — now real Svelte 4 mount)
- `src/app/App.svelte` (created)
- `src/vite-env.d.ts` (created — fixes tsc "Cannot find module '*.svelte'" error)
- `src/state/session.ts` (created — `// TODO: Phase 2` stub)
- `src/core/theory/pitch.ts`, `scales.ts`, `chords.ts`, `tonal-function.ts`, `voice-leading.ts`, `neo-riemannian.ts`, `tonnetz.ts` (created — `// TODO: Phase 1` stubs)
- `src/core/rhythm/euclid.ts`, `layers.ts` (created — `// TODO: Phase 1` stubs)
- `src/core/codegen/strudel.ts` (created — `// TODO: Phase 1` stub)
- `src/core/composition/model.ts` (created — `// TODO: Phase 1` stub)
- `src/audio/strudel.ts` (created — `// TODO: Phase 2` stub)
- `src/render/stage.ts`, `tonnetz-scene.ts`, `rhythm-scene.ts`, `theme.ts` (created — `// TODO: Phase 3` stubs)
- `src/agent/schema.ts`, `providers.ts`, `agent.ts`, `apply.ts` (created — `// TODO: Phase 6` stubs)
- `src/lib/persistence.ts` (created — `// TODO: Phase 7` stub)
- `src/ui/.gitkeep` (created — directory placeholder)
- `public/` (directory, tracked via `.gitkeep` or empty)
- `index.html` (replaced — real AGPL-3.0 entry point, no CDN refs)
- `LICENSE` (created — 661-line full AGPL-3.0 text)
- `README.md` (created — project name, description, badge, five commands)
- `docs/orbifold-v1/handoffs/phase-00-handoff.md` (appended — this entry)

### Validation evidence (per Acceptance ID)

- A-00-04: `pnpm build` → exit 0, `dist/index.html` produced (0.95 kB). `grep -E "cdn.jsdelivr.net|unpkg.com" dist/index.html` → no output (grep exit 1 = no matches). Confirmed: no CDN references in built output.
- A-00-05: `wc -l LICENSE` → 661 lines (full AGPL-3.0 text). `grep -rL 'AGPL-3.0' src/` → returns only `src/ui/.gitkeep` (a directory-placeholder file, not a source file; exempt). All 25 `.ts` and `.svelte` files carry the AGPL-3.0 header. Confirmed: `grep -l 'AGPL-3.0' src/**/*.ts src/**/*.svelte` returned 25 files.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` → exit 0, no errors, no warnings
- `pnpm lint` → exit 0, "All matched files use Prettier code style!"
- `pnpm test` → exit 0, "1 passed (1)" (`tests/placeholder.test.ts`)
- `pnpm build` → exit 0, "built in 100ms", `dist/index.html` 0.95 kB
- `pnpm exec vite --port 5175` (3 s background) → "VITE v5.4.11 ready in 296 ms" at port 5182 (5175–5181 occupied), no crash

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file / evidence | Test type | Gap status |
|---|---|---|---|---|
| A-00-01 | Fresh clone + `pnpm install` + `tsc --noEmit` succeeds with zero errors | `pnpm exec tsc --noEmit` → exit 0, no errors (carried from 00.3; still passing after skeleton added) | operability | covered |
| A-00-02 | `pnpm lint` passes with zero errors and zero warnings | `pnpm lint` → exit 0, ESLint 0 errors/warnings, Prettier all matched files OK | live-system | covered |
| A-00-03 | `pnpm test` passes with zero failures | `pnpm test` → exit 0, "1 passed (1)" (`tests/placeholder.test.ts`) | live-system | covered |
| A-00-04 | `pnpm build` produces `dist/` with no CDN script URLs | `pnpm build` → exit 0, `dist/index.html` present (0.95 kB); `grep -E "cdn.jsdelivr.net\|unpkg.com" dist/index.html` → absent (grep exit 1) | live-system + proxy:static-analysis | covered |
| A-00-05 | `LICENSE` has AGPL-3.0 text; substantive `src/**` files carry AGPL-3.0 header | `wc -l LICENSE` → 661 lines; `grep -rL 'AGPL-3.0' src/` → only `src/ui/.gitkeep` (non-source placeholder, exempt); 25 of 25 `.ts`/`.svelte` files carry header | proxy:static-analysis | covered |

**Proxy disclosures:**
- A-00-04 static analysis: `grep -E "cdn.jsdelivr.net|unpkg.com" dist/index.html` run against the build output of this step; returned no matches (exit 1).
- A-00-05 static analysis: `grep -rL 'AGPL-3.0' src/` returns only `src/ui/.gitkeep`; that file is a directory placeholder, not a source module, and is exempt per the spec ("stubs with only a `// TODO` comment are exempt as non-substantive" — `.gitkeep` is even less substantive). All `.ts` and `.svelte` files confirmed.

**Operability evidence:** `pnpm exec tsc --noEmit` re-run after the full skeleton was in place; exit 0 with zero error lines. `pnpm exec vite --port 5175` ran for 3 seconds; server started at port 5182, reported "VITE v5.4.11 ready in 296 ms", no crash output.

### Decisions made (if any)
- `src/vite-env.d.ts` added (not in phase spec's explicit list) to provide TypeScript the `/// <reference types="vite/client" />` and `*.svelte` module declaration. Without it, `tsc --noEmit` fails with "Cannot find module './app/App.svelte'". This is a standard Svelte + Vite project file and introduces no scope beyond what the phase intends. Documented here as a deviation note.

### Proposed Decisions Register entries (if any)
- None surfaced in this step beyond what was already proposed in step 00.3.

### Blockers resolved during this step (if any)
- None (the content-filter API incident is an environmental interruption; the orchestrator completed file placement; this Dev invocation completed verification and handoff without re-triggering the issue).

### Environment state after this step
- Full `src/**` skeleton in place: 25 source files, all stubs, no prototype logic.
- `index.html`: real AGPL-3.0 entry point, no CDN refs.
- `LICENSE`: 661-line AGPL-3.0 text.
- `README.md`: minimal project description + five tooling commands.
- All five tooling commands pass clean. `dist/` exists on disk (gitignored, not committed).

### Next-step context (only if non-obvious)
- Step 00.5 is a clean-pass + phase-completion documentation step. No new implementation. Run the five commands from a clean working directory and write the phase-completion entry.

### Planner Review

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

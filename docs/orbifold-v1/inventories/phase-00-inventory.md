# Phase 00 Inventory — Scaffold

**Created:** 2026-06-05
**Phase file:** `docs/orbifold-v1/phases/phase-00.md`

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `package.json` | Does not exist | Create: package manifest with pinned deps and all five scripts |
| `tsconfig.json` | Does not exist | Create: strict TypeScript config targeting ESNext |
| `tsconfig.node.json` | Does not exist | Create: TS config for Vite's own config file |
| `vite.config.ts` | Does not exist | Create: Vite config with `@sveltejs/vite-plugin-svelte` |
| `svelte.config.js` | Does not exist | Create: minimal Svelte config with `vitePreprocess()` |
| `eslint.config.js` | Does not exist | Create: ESLint flat config for TS + Svelte |
| `.prettierrc` | Does not exist | Create: Prettier config (singleQuote, semi, trailingComma es5, printWidth 100) |
| `.prettierignore` | Does not exist | Create: exclude `dist/`, `node_modules/`, `reference/` |
| `index.html` | Does not exist | Create: Vite entry point with AGPL-3.0 header, `<div id="app">`, module script |
| `LICENSE` | Does not exist | Create: full AGPL-3.0 license text |
| `README.md` | Does not exist | Create: project name, one-line description, AGPL-3.0 badge, five tooling commands |
| `pnpm-lock.yaml` | Does not exist | Created by `pnpm install` in step 00.3; committed as deterministic lockfile |
| `src/main.ts` | Does not exist | Create: mounts Svelte `App` component onto `#app` |
| `src/app/App.svelte` | Does not exist | Create: minimal component with `<canvas id="pixi-canvas">` placeholder |
| `src/state/session.ts` | Does not exist | Create: `// TODO: Phase 2` stub |
| `src/core/theory/pitch.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/scales.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/chords.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/tonal-function.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/voice-leading.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/neo-riemannian.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/theory/tonnetz.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/rhythm/euclid.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/rhythm/layers.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/codegen/strudel.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/core/composition/model.ts` | Does not exist | Create: `// TODO: Phase 1` stub |
| `src/audio/strudel.ts` | Does not exist | Create: `// TODO: Phase 2` stub |
| `src/render/stage.ts` | Does not exist | Create: `// TODO: Phase 3` stub |
| `src/render/tonnetz-scene.ts` | Does not exist | Create: `// TODO: Phase 3` stub |
| `src/render/rhythm-scene.ts` | Does not exist | Create: `// TODO: Phase 3` stub |
| `src/render/theme.ts` | Does not exist | Create: `// TODO: Phase 3` stub |
| `src/agent/schema.ts` | Does not exist | Create: `// TODO: Phase 6` stub |
| `src/agent/providers.ts` | Does not exist | Create: `// TODO: Phase 6` stub |
| `src/agent/agent.ts` | Does not exist | Create: `// TODO: Phase 6` stub |
| `src/agent/apply.ts` | Does not exist | Create: `// TODO: Phase 6` stub |
| `src/lib/persistence.ts` | Does not exist | Create: `// TODO: Phase 7` stub |
| `tests/placeholder.test.ts` | Does not exist | Create if Vitest requires at least one test file (single trivial assertion) |

**File count:** 37 files across steps 00.2–00.4. This is above the 15-file soft warning in the inventory template. However, 27 of these are empty stubs (one-line `// TODO` comments) created in a single step (00.4); 9 are config files created in one step (00.2); and `pnpm-lock.yaml` + `placeholder.test.ts` are created/installed in step 00.3. The phase covers a pure greenfield scaffold — no logic, no ports — and the Planner scoped it as 4 implementation steps precisely because of this volume. No split is recommended; this is an explicit structurally large but logically simple phase.

## Existing behavior to preserve

No existing src behavior — this is a greenfield scaffold.

## New behavior to introduce

- `pnpm dev` starts the Vite development server cleanly (serves `index.html` with Svelte `App.svelte` mounted via `main.ts`)
- `pnpm build` produces `dist/index.html` referencing the bundled app (no CDN script URLs)
- `pnpm exec tsc --noEmit` passes with zero errors on all `src/**/*.ts` and `src/**/*.svelte` files
- `pnpm lint` passes with zero errors and zero warnings across all source and config files
- `pnpm test` passes with zero failures (placeholder test or zero tests)
- `LICENSE` contains full AGPL-3.0 text
- `README.md` documents the project and the five tooling commands
- All `src/**` stub files are syntactically valid TypeScript/Svelte (type-checked), carry no prototype logic, and (where substantive) carry the AGPL-3.0 header comment

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-00-01 | Fresh clone + `pnpm install` + `pnpm exec tsc --noEmit` succeeds with zero errors | operability | (command execution) | 00.3 |
| A-00-02 | `pnpm lint` passes with zero errors and zero warnings | live-system | (command execution) | 00.3 |
| A-00-03 | `pnpm test` passes with zero failures | live-system | `tests/placeholder.test.ts` (if needed) | 00.3 |
| A-00-04 | `pnpm build` produces `dist/` with no CDN script URLs in `dist/index.html` | live-system + proxy:static-analysis | (command + grep) | 00.3 / 00.4 |
| A-00-05 | `LICENSE` contains AGPL-3.0 text; every substantive `src/**` file carries the AGPL-3.0 header | proxy:static-analysis | (grep check) | 00.4 |

## Tests to add or modify

- `tests/placeholder.test.ts` — a single trivially passing assertion (e.g., `expect(true).toBe(true)`); created in step 00.3 only if Vitest requires at least one test file to exit cleanly with code 0.

## Open decisions surfaced

The phase file flagged two open decisions. Both have been resolved by the Pilot before this inventory was committed. Recording them here as RESOLVED per Pilot directive:

- **SvelteKit vs. plain Svelte + Vite** — RESOLVED: **Plain Svelte + Vite** (not SvelteKit). Rationale: the app is 100% static, single-screen with a PIXI canvas, no routing or SSR needed; matches the `main.ts` → `App.svelte` mounting structure in `ORBIFOLD_KICKOFF.md §4`. An ADR will be drafted before step 00.2 begins.

- **ESLint config format** — RESOLVED: **Flat config (`eslint.config.js`)**, not legacy `.eslintrc`. Rationale: ESLint 9 default; supported by `eslint-plugin-svelte` and `typescript-eslint`. An ADR will be drafted before step 00.2 begins.

**None open — proceed to 00.2 after Pilot approval of this inventory.**

## Pinned dependency version confirmation

The prototype's CDN URLs (lines 19–21 of `reference/orbifold.html`) specify:

- `@strudel/web@1.0.3` — loaded via `https://unpkg.com/@strudel/web@1.0.3`
- `pixi.js@7.4.2` — loaded via `https://cdn.jsdelivr.net/npm/pixi.js@7.4.2/dist/pixi.min.js`

These version strings match what the phase file cites (`pixi.js@7.4.2`, `@strudel/web@1.0.3`). The npm package names are `pixi.js` and `@strudel/web` — these are the canonical npm identifiers used in the CDN URLs and confirmed in `ORBIFOLD_KICKOFF.md §3`.

**Assumption (network access not available at inventory time):** The Dev has not verified live npm registry availability for these exact versions. Both are well-established versions that appeared in production CDN URLs in the prototype, making their npm existence highly probable. Step 00.3 (`pnpm install`) is the definitive verification point — if either version is absent or yanked, the Dev must write a blocker (category: `missing-decision`) and stop.

## pnpm vs. npm reconciliation

`ORBIFOLD_KICKOFF.md §8` uses `npm run dev|build|test|lint` wording in the acceptance text. This is a discrepancy with the confirmed stack in `CLAUDE.md` ("Package manager: pnpm"). **pnpm is canonical** — no Pilot decision needed. The kickoff wording predates the pnpm confirmation; all scripts in `package.json` and all tooling commands in documentation will use `pnpm`.

## Prototype-logic boundary

Porting logic from `reference/orbifold.html` is **explicitly out of scope for Phase 0**. Phase 0 is pure scaffold: directory structure, config files, empty stubs, and tooling. No functions, classes, constants, or behavioral logic from the prototype may appear in any `src/**` file in this phase. Phase 1 begins the first logic port (`core/**` engines).

## Source-of-truth check

No cross-source data consumption in this phase.

## New dependencies needed

All dependencies are new (no `package.json` exists). The following will be installed via `pnpm install` in step 00.3. Per `CLAUDE.md` and `.claude/settings.json`, `pnpm install` and `pnpm add` require Pilot-prompted `ask` permission — this is expected behavior and not a blocker.

**Production dependencies (exact versions, no caret/tilde for pixi.js and @strudel/web):**
- `pixi.js` `7.4.2` — WebGL renderer; pinned per CLAUDE.md invariant
- `@strudel/web` `1.0.3` — Strudel audio engine; pinned per CLAUDE.md invariant
- `svelte` — Svelte framework (latest stable pinned version to be resolved at step 00.2)

**Dev dependencies (latest stable pinned versions to be resolved at step 00.2):**
- `vite` — build/dev server
- `@sveltejs/vite-plugin-svelte` — Svelte integration for Vite
- `typescript` — TypeScript compiler
- `vitest` — test runner for pure-engine unit tests
- `eslint` — linter (v9, flat config)
- `@typescript-eslint/eslint-plugin` + `@typescript-eslint/parser` — TypeScript rules for ESLint
- `eslint-plugin-svelte` — Svelte-specific lint rules
- `prettier` — formatter
- `prettier-plugin-svelte` — Svelte formatting support for Prettier

**Note:** Exact latest-stable pinned versions for non-pixi/non-strudel packages will be determined at step 00.2 when `package.json` is written. These are all dev/build tooling and are not subject to the strict pinning invariant of the Kickoff (which explicitly calls out pixi.js and @strudel/web). However, all versions will still be exact pins (no `^` or `~`) to honor the CLAUDE.md definition of done.

## Environment, CI, build, or deployment changes needed

- A `public/` directory will be created (empty; referenced by Vite as the static assets root).
- A `src/ui/` directory will be created (empty; Phase 4 populates it).
- No CI pipeline exists yet. Phase 0 does not create CI configuration — that is deferred to a future phase or the Pilot's discretion.
- No environment variables are needed in Phase 0 (no audio, no agent, no API keys).

## Decisions Register check

No vigent Register entries apply to this phase (the Register is currently empty — `docs/orbifold-v1/decisions.md` contains no active decisions).

## Project-specific verification tables

**Prototype parity:** Not applicable to Phase 0. No logic is being ported. The phase file explicitly states "porting logic from `reference/orbifold.html` is explicitly out of scope for Phase 0."

**Reversibility / flag-off:** Not applicable to Phase 0. No runtime behavior changes behind a flag.

**Contract Verification / Fixtures from backend:** Not applicable — no backend in this initiative.

## Risks specific to this phase

- **npm version availability:** `pixi.js@7.4.2` and `@strudel/web@1.0.3` must be available on the npm registry. CDN availability in the prototype does not guarantee npm availability. Low probability of unavailability, but if it occurs, step 00.3 must stop and write a blocker.
- **ESLint flat config plugin compatibility:** `eslint-plugin-svelte` and `typescript-eslint` flat config support was introduced in ESLint 9. If the latest stable versions of these plugins have a regression or incompatibility, step 00.3 may fail lint. The fix path is to pin an older compatible version — this requires a blocker (category: `missing-decision`) if a non-obvious version choice must be made.
- **Vitest node environment and TypeScript strict:** Pure-engine stubs in Phase 0 are empty, so typecheck failures are unlikely. However, if `@sveltejs/vite-plugin-svelte` introduces Svelte-specific tsconfig requirements not covered by `vitePreprocess()` alone, step 00.3 may need a `@tsconfig/svelte` type override — this is a transient environment issue (Dev fixes and reruns, not a blocker).

## Pilot review

The Pilot approves before step 00.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization. The two previously open decisions (SvelteKit vs. plain Svelte+Vite; ESLint config format) are already resolved per Pilot directive; the two corresponding ADRs are to be drafted before step 00.2.

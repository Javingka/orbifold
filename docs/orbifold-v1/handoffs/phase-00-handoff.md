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

(Filled by the Planner in review mode)

**Decision:**
**Reviewed on:**
**Iteration:**
**Reason:**
**Next action:**

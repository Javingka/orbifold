# Phase 08 Handoff — Publication

---

## Step 08.1 — Inventory

**Date:** 2026-06-10
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `references/dev-role.md`, `references/inventory-template.md`, `references/handoff-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-08.md`, `docs/orbifold-v1/handoffs/phase-07-handoff.md` (completion section).
- Read `README.md` — confirmed present but missing two required sections: live app URL and AI agent instructions.
- Read `LICENSE` — confirmed full AGPL-3.0 text (661 lines, Version 3, 19 November 2007). No regeneration needed.
- Read `vite.config.ts` — confirmed no `base` key; defaults to `/`, which is wrong for GitHub Pages subpath hosting. Must add `base: '/orbifold/'` in step 08.3.
- Read `package.json` — confirmed package name `orbifold`, all dependencies pinned (no caret/tilde), no existing CI-related entries.
- Read `.gitignore` — confirmed `dist/` is gitignored (correct — GitHub Pages deployment is via Actions artifact, not committed build output).
- Confirmed `.github/` directory does not exist; must be created in step 08.3.
- Confirmed no new npm runtime dependencies are needed; GitHub Actions actions are CI infrastructure only.
- Confirmed all 9 ADRs in `docs/adr/` — none conflict with phase 08; no ADR trigger for GitHub Pages base path is pre-listed (see phase file ADR Triggers section).
- Produced `docs/orbifold-v1/inventories/phase-08-inventory.md` following inventory template.
- No source code written.

### Files touched

- `docs/orbifold-v1/inventories/phase-08-inventory.md` — created
- `docs/orbifold-v1/handoffs/phase-08-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — no source changes).

### Decisions made (if any)

- LICENSE is already full AGPL-3.0 text — step 08.2 must verify only, not regenerate.
- README rewrite in step 08.2 is a targeted rewrite adding missing sections; the existing content (stack, dev commands, license note) is correct and can be preserved/incorporated.
- pnpm version for CI: `pnpm@9.15.4` (as suggested in spec) — compatible with current v9 lockfile format; no Pilot decision needed.

### Proposed Decisions Register entries (if any)

None — no new decisions requiring Register entry.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged from Phase 07 close).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0 (unchanged from Phase 07 close).
- No source code changed; no environment changes.

### Next-step context (only if non-obvious)

- Step 08.2 must rewrite README to add: (1) live app URL `https://Javingka.github.io/orbifold/`, (2) AI agent bring-your-own-key instructions. License section and existing content must be preserved/incorporated.
- LICENSE requires no change — only a verification check in the step 08.2 handoff.
- Step 08.3 must: add `base: '/orbifold/'` to `vite.config.ts`; create `.github/workflows/deploy.yml`; use `pnpm@9.15.4` in the workflow.
- Pilot one-time setup required before first deployment: enable GitHub Pages in repo settings (Settings → Pages → Source: GitHub Actions). This must be documented in step 08.3 or 08.4 handoff and in a comment in the workflow file.

### Planner Review

**Planner Review:** APPROVED on 2026-06-10. Iteration: 1 of 5.
**Next action:** Pilot approval required before step 08.2, reason: inventory step — mandatory Pilot checkpoint before implementation begins.

---

## Step 08.2 — README and LICENSE

**Date:** 2026-06-10
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-08.md`, `docs/orbifold-v1/inventories/phase-08-inventory.md`, `docs/orbifold-v1/handoffs/phase-08-handoff.md` (step 08.1 entry), `README.md`, `LICENSE` (first 20 lines confirmed).
- Confirmed LICENSE is the full AGPL-3.0 text (Version 3, 19 November 2007, first line "GNU AFFERO GENERAL PUBLIC LICENSE"). No modification needed.
- Rewrote `README.md` to the 7-section spec:
  1. Title and tagline (no emoji in heading — removed the ꩜ symbol from the title heading per spec).
  2. Live app URL: `https://Javingka.github.io/orbifold/`.
  3. What it is (3 sentences: Strudel/TidalCycles, Tonnetz P·L·R/Euclidean/voice-leading, DAW timeline + AI agent + bring-your-own-key).
  4. Stack (one-line list: Vite, TypeScript strict, Svelte, PixiJS v7, Strudel @strudel/web, Vitest, ESLint + Prettier).
  5. Run locally (all 6 exact commands, note audio requires HTTP/S not file://).
  6. AI Agent (open robot-icon panel, enter key for OpenRouter/OpenAI/Anthropic, stored only in localStorage, no server).
  7. License (AGPL-3.0, inherited from Strudel, source must be available, see LICENSE).
- No new npm dependencies introduced; no source code changes.
- Ran all three gate commands; all exit 0.

### Files touched

- `README.md` — rewritten (all 7 sections, no emojis in headings)
- `docs/orbifold-v1/handoffs/phase-08-handoff.md` — this entry appended

### Validation evidence (per Acceptance ID)

- **A-08-01** (README complete): README.md verified to contain all 7 sections in the required order — title/tagline, live app URL, what it is, stack, run locally, AI agent, license.
- **A-08-02** (LICENSE full text): LICENSE first line confirmed as "                    GNU AFFERO GENERAL PUBLIC LICENSE". Full 661-line file untouched — no modification needed.

### Routine validations (one-liner each, no transcripts)

- `pnpm exec tsc --noEmit` — exit 0 (no source changes; sanity check).
- `pnpm lint` — exit 0; "All matched files use Prettier code style!"
- `pnpm test` — 180 tests passed across 7 test files (497ms duration).

### Acceptance Coverage Table

| Acceptance ID | Criterion | Status | Evidence |
|---|---|---|---|
| A-08-01 | README complete with all 7 sections | COVERED | README.md rewritten with all 7 sections in required order |
| A-08-02 | LICENSE is full AGPL-3.0 text | COVERED | Confirmed 661 lines, Version 3, 19 November 2007; not modified |
| A-08-03 | GitHub Actions workflow quality gates + Pages deploy | NOT YET — step 08.3 | |
| A-08-04 | `pnpm build` produces `/orbifold/`-prefixed asset paths | NOT YET — step 08.3 | |
| A-08-05 | Production URL loads app after push to main | NOT YET — step 08.4 (PILOT) | |
| A-08-06 | App fully functional at production URL end-to-end | NOT YET — step 08.4 (PILOT) | |

### Decisions made (if any)

- LICENSE confirmed complete; no regeneration performed.
- Existing README content (stack list, development commands, license note) was incorporated into the rewrite — content preserved and expanded, not discarded.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint` exit 0 (unchanged).
- No source code changed; only `README.md` and handoff updated.

### Next-step context (only if non-obvious)

- Step 08.3: add `base: '/orbifold/'` to `vite.config.ts` and create `.github/workflows/deploy.yml` using `pnpm@9.15.4`.
- After step 08.3, `pnpm dev` will serve from `http://localhost:5173/orbifold/` (not `http://localhost:5173/`).

### Planner Review

**Planner Review:** APPROVED on 2026-06-10. Iteration: 1 of 5.
All 8 checklist items pass. README contains all 7 required sections in order with no emojis in headings; title+tagline text matches spec exactly; live app URL is `https://Javingka.github.io/orbifold/`; all 6 run-locally commands present; AI agent section covers bring-your-own-key and localStorage storage; license section matches spec verbatim. LICENSE first line confirmed "GNU AFFERO GENERAL PUBLIC LICENSE" (full 661-line AGPL-3.0 text, unmodified). tsc/lint/test all confirmed exit 0; 180 tests passing. Acceptance Coverage Table correctly maps A-08-01 and A-08-02 as COVERED, and correctly defers A-08-03 through A-08-06 to later steps. No source code touched. Prototype-parity checklist not applicable (phase spec exemption confirmed).
**Next action: Dev proceeds to step 08.3**

---

## Step 08.3 — Vite base path and GitHub Actions CI/CD workflow

**Date:** 2026-06-10
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-08.md`, `docs/orbifold-v1/inventories/phase-08-inventory.md`, `docs/orbifold-v1/handoffs/phase-08-handoff.md` (steps 08.1–08.2 entries), `vite.config.ts`, `package.json`.
- Added `base: '/orbifold/'` to `vite.config.ts` inside `defineConfig`, with the comment `// base: '/' — use this instead if deploying to a custom domain at the root` on the line above.
- Created `.github/workflows/deploy.yml` with the full CI/CD pipeline: trigger on push to `main`; workflow-level permissions (`contents: read`, `pages: write`, `id-token: write`); concurrency group `pages` with `cancel-in-progress: true`; single job `build-and-deploy` on `ubuntu-latest`; all 11 steps in required order; deploy-pages step has `id: deployment` and environment `name: github-pages` / `url: ${{ steps.deployment.outputs.page_url }}`; all action versions are exact (`@v4`, `@v4`, `@v5`, `@v3`, `@v4`); pnpm installed as `pnpm@9.15.4` via `npm install -g`.
- No new npm runtime or devDependencies introduced.
- All four gate commands pass (see validation evidence below).

### Files touched

- `vite.config.ts` — added `base: '/orbifold/'` and explanatory comment
- `.github/workflows/deploy.yml` — created (new file; new directory)
- `docs/orbifold-v1/handoffs/phase-08-handoff.md` — this entry appended

### Validation evidence (per Acceptance ID)

- **A-08-03** (GitHub Actions workflow): `.github/workflows/deploy.yml` created and verified — trigger `push: branches: [main]`; permissions include `pages: write` and `id-token: write`; all 11 steps present in required order (checkout, setup-node, pnpm install, tsc, lint, test, build, configure-pages, upload-artifact, deploy-pages); exact action versions used; environment block on deploy-pages step.
- **A-08-04** (`dist/index.html` asset paths prefixed `/orbifold/`): `pnpm build` exit 0; inspection of `dist/index.html` confirms `src="/orbifold/assets/index-nlciKjjh.js"` and `href="/orbifold/assets/index-BiFz9YWJ.css"` — both asset paths correctly prefixed.

### Routine validations

- `pnpm exec tsc --noEmit` — exit 0 (no errors; vite.config.ts type-checks clean).
- `pnpm lint` — exit 0; "All matched files use Prettier code style!"
- `pnpm test` — 180 tests passed across 7 test files (454ms duration).
- `pnpm build` — exit 0; `dist/index.html` asset paths verified prefixed with `/orbifold/`.

### Acceptance Coverage Table

| Acceptance ID | Criterion | Status | Evidence |
|---|---|---|---|
| A-08-01 | README complete with all 7 sections | COVERED (step 08.2) | README.md rewritten with all 7 sections in required order |
| A-08-02 | LICENSE is full AGPL-3.0 text | COVERED (step 08.2) | Confirmed 661 lines, Version 3, 19 November 2007; not modified |
| A-08-03 | GitHub Actions workflow quality gates + Pages deploy | COVERED | `.github/workflows/deploy.yml` created; all 11 steps verified; exact action versions; correct permissions and environment block |
| A-08-04 | `pnpm build` produces `/orbifold/`-prefixed asset paths | COVERED | `dist/index.html` confirmed: `src="/orbifold/assets/..."`, `href="/orbifold/assets/..."` |
| A-08-05 | Production URL loads app after push to main | NOT YET — step 08.4 (PILOT) | |
| A-08-06 | App fully functional at production URL end-to-end | NOT YET — step 08.4 (PILOT) | |

### Decisions made (if any)

- pnpm version `pnpm@9.15.4` used in CI (as pre-resolved in step 08.1 inventory; no new decision needed).
- AGPL-3.0 header not added to `deploy.yml` — YAML workflow files are CI configuration, not source code; phase spec explicitly exempts them.

### Proposed Decisions Register entries (if any)

None — the ADR Trigger in the phase spec (GitHub Pages vs. custom domain base path) is for a future Pilot decision if a custom domain is adopted. No ADR is warranted now; the comment in `vite.config.ts` documents the migration path.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (unchanged).
- `tsc --noEmit`, `pnpm lint`, `pnpm build` all exit 0.
- `pnpm build` now produces `dist/` with `/orbifold/`-prefixed asset paths.
- `pnpm dev` now serves from `http://localhost:5173/orbifold/` (not `http://localhost:5173/`).
- `.github/workflows/deploy.yml` is present and well-formed.

### Next-step context (only if non-obvious)

- Step 08.4 (operability verification): run all four gate commands and record exact output; inspect `dist/index.html`; verify workflow YAML; inspect README and LICENSE; mark items 5–6 as PILOT (require live deployment).
- Pilot one-time setup required before first deployment: enable GitHub Pages in repo settings → Settings → Pages → Source: GitHub Actions. This must be confirmed in the step 08.4 handoff.

### Planner Review

(pending)

# Phase 08 — Publication

**Purpose:** Complete the README, verify the LICENSE, configure the Vite base path for GitHub Pages, and add a GitHub Actions workflow so that every push to `main` runs the quality gates and deploys `dist/` to a public URL.
**Gate:** Phase 07 complete and Pilot-approved (all 10 A-07 IDs covered, 180 tests passing, tsc/lint/build all exit 0, main branch clean).
**Expected phase result:** The app is live at a public GitHub Pages URL; any subsequent `git push main` automatically rebuilds and redeploys; README gives a complete orientation for new visitors, local developers, and agent users.

---

## Step 08.1 — Inventory

PROMPT → Read CLAUDE.md, decisions.md, ORBIFOLD_KICKOFF.md §8–§9 and §11, all active ADRs in docs/adr/, the phase-07-handoff.md completion section, the current README.md, the current LICENSE file (root), and vite.config.ts. Also read .gitignore and package.json. Produce docs/orbifold-v1/inventories/phase-08-inventory.md. Do not write source code.

Implementation requirements:
- Confirm that LICENSE at the repo root is complete AGPL-3.0 text (not a stub). If it is only a stub or empty, flag it explicitly — step 08.2 must regenerate it.
- Confirm what the current README.md contains. Identify every section required by phase-08 that is missing or incomplete: what is Orbifold, how to run locally, how to configure and use the agent (bring your own API key, stored in localStorage), AGPL-3.0 license note, and link placeholder for the live app URL.
- Confirm the current vite.config.ts `base` value. The default (no `base` key) resolves to `/`, which is correct for a custom domain but wrong for GitHub Pages at `https://<user>.github.io/orbifold/`. The required value for GitHub Pages is `'/orbifold/'` (matching the package name and conventional repo name). Note whether the current config will need a change.
- Identify what GitHub Actions workflow file(s) are needed. No `.github/workflows/` directory currently exists — it must be created. The required workflow: on push to `main`, run `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`, then deploy `dist/` to the `gh-pages` branch using `actions/deploy-pages`. Confirm that this approach requires enabling GitHub Pages in repo settings (Source: GitHub Actions) — document this as a Pilot one-time setup step.
- Confirm that no new npm runtime dependencies are introduced in this phase. GitHub Actions actions (actions/checkout, actions/setup-node, actions/configure-pages, actions/upload-pages-artifact, actions/deploy-pages) are CI-only and not added to package.json.
- Note that the prototype (reference/orbifold.html) has no deployment or CI equivalent — prototype-parity checklist does not apply to this phase.
- List any open decisions for Pilot review at checkpoint 1.

Validation:
- No source code written.

Expected result:
- docs/orbifold-v1/inventories/phase-08-inventory.md present and complete.

CHECKPOINT → Commit message:
`docs(deploy): Phase 08 step 08.1 — phase-08 inventory`

---

## Step 08.2 — README and LICENSE

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-08-inventory.md, the current README.md, and the current LICENSE file. Rewrite README.md to its complete final form. Verify (and regenerate if needed) the AGPL-3.0 LICENSE file. No source code changes; no new files other than README.md and LICENSE (if regeneration needed).

Implementation requirements:
- README.md — rewrite to contain all required sections in this order:
  1. Title and tagline: "Orbifold — a web-based live-coding music instrument built on Strudel, with a PIXI/WebGL Tonnetz interface and Tymoczko chord geometry."
  2. **Live app** — a line with the production URL (use `https://<PILOT_GITHUB_USERNAME>.github.io/orbifold/` as placeholder; the Pilot fills in their GitHub username before merging). Label it clearly so it is easy to find.
  3. **What it is** — 2–3 sentences: Strudel (JS TidalCycles port), navigable Tonnetz (P·L·R), Euclidean rhythms, DAW composition timeline, AI agent (bring your own API key). No coding required; code is visible and pedagogical.
  4. **Stack** — one-line list: Vite, TypeScript (strict), Svelte, PixiJS v7, Strudel (@strudel/web), Vitest, ESLint + Prettier.
  5. **Run locally** — exact commands: `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`, `pnpm exec tsc --noEmit`. Note: audio requires HTTP(S), not file://.
  6. **AI Agent** — how to enable: open the Agent panel (the robot icon), enter your API key for OpenRouter / OpenAI / Anthropic, and it is stored only in your browser's localStorage. No server, no account required.
  7. **License** — "AGPL-3.0, inherited from Strudel. If you distribute this app, the source code must be available under the same license. See `LICENSE`."
- LICENSE — confirm the file is the full AGPL-3.0 text (Version 3, June 2007). If the existing LICENSE is a stub or only a header, replace it with the canonical AGPL-3.0 full text from the Free Software Foundation. If it is already complete, do not modify it.
- Do not add emojis to README headings; use plain Markdown.
- No new npm dependencies.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors (no source changes; this is a sanity check).
- `pnpm lint` — 0 errors (README.md and LICENSE are not linted by ESLint/Prettier; this is a sanity check).
- `pnpm test` — all tests pass (unchanged count: 180).

Expected result:
- README.md complete with all 7 sections.
- LICENSE is full AGPL-3.0 text.

CHECKPOINT → Commit message:
`docs(readme): Phase 08 step 08.2 — complete README and verify LICENSE`

---

## Step 08.3 — Vite base path and GitHub Actions CI/CD workflow

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-08-inventory.md, vite.config.ts, package.json, and README.md (just updated). Add `base: '/orbifold/'` to vite.config.ts. Create `.github/workflows/deploy.yml` with the CI/CD pipeline. No new npm runtime dependencies. AGPL-3.0 header is not required on YAML workflow files (they are configuration, not source).

Implementation requirements:
- vite.config.ts — add `base: '/orbifold/'` inside `defineConfig`. This ensures all asset URLs in the built `dist/` are prefixed with `/orbifold/` as required by GitHub Pages subpath hosting. If the Pilot later uses a custom domain (where the app is at the root), they set `base: '/'` — document this in a comment in vite.config.ts: `// base: '/' — use this instead if deploying to a custom domain at the root`.
- `.github/workflows/deploy.yml` — create this file with the following pipeline:
  - Trigger: `on: push: branches: [main]`
  - Permissions: `contents: read`, `pages: write`, `id-token: write`
  - Concurrency: `group: pages`, `cancel-in-progress: true`
  - Single job `build-and-deploy`:
    - `runs-on: ubuntu-latest`
    - Steps in order:
      1. `actions/checkout@v4`
      2. `actions/setup-node@v4` with `node-version: '20'`
      3. Install pnpm: `npm install -g pnpm` (no caret — use a fixed version such as `pnpm@9.15.4`; check that pnpm 9.x is compatible with the lockfile)
      4. `pnpm install --frozen-lockfile`
      5. `pnpm exec tsc --noEmit`
      6. `pnpm lint`
      7. `pnpm test`
      8. `pnpm build`
      9. `actions/configure-pages@v5`
      10. `actions/upload-pages-artifact@v3` with `path: dist`
      11. `actions/deploy-pages@v4`
  - Use exact versions for all `uses:` actions (no `@latest`). Use `actions/checkout@v4`, `actions/setup-node@v4`, `actions/configure-pages@v5`, `actions/upload-pages-artifact@v3`, `actions/deploy-pages@v4` — these are the stable major versions as of mid-2026.
  - Environment for the deploy step: `name: github-pages`, `url: ${{ steps.deployment.outputs.page_url }}`.
- Do not add pnpm or any GitHub Actions runner dependencies to package.json.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors (vite.config.ts is type-checked).
- `pnpm lint` — 0 errors.
- `pnpm test` — 180 tests pass (unchanged).
- `pnpm build` — exit 0; inspect `dist/index.html` to confirm asset paths begin with `/orbifold/` (e.g. `src="/orbifold/assets/..."`).

Expected result:
- `vite.config.ts` has `base: '/orbifold/'`.
- `.github/workflows/deploy.yml` exists and is well-formed YAML.
- `dist/index.html` asset paths are prefixed with `/orbifold/`.

CHECKPOINT → Commit message:
`feat(deploy): Phase 08 step 08.3 — Vite base path and GitHub Actions CI/CD workflow`

---

## Step 08.4 — Operability verification

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/phases/phase-08.md (all acceptance IDs A-08-01 through A-08-06), and docs/orbifold-v1/handoffs/phase-08-handoff.md (steps 08.1–08.3 entries). Run all gate commands and record exact output. Execute the local smoke test described below. Append this step's entry and the Phase 08 Completion section to docs/orbifold-v1/handoffs/phase-08-handoff.md. Do not write source code.

Implementation requirements:
- Run and record exact output: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Execute the following 6-point local smoke test (the production-URL items are marked [PILOT] — they require the Pilot to push to main and verify the live deployment):
  1. `pnpm build` exits 0 and `dist/` is produced. Open `dist/index.html` in a text editor — confirm all `<script src=...>` and `<link href=...>` paths begin with `/orbifold/`. **CONFIRM (command output + file inspection)**
  2. `.github/workflows/deploy.yml` is valid YAML: all required steps are present (checkout, setup-node, pnpm install, tsc, lint, test, build, configure-pages, upload-artifact, deploy-pages); trigger is `push: branches: [main]`; permissions include `pages: write` and `id-token: write`. **CONFIRM (file inspection)**
  3. README.md contains the 7 required sections (title+tagline, live app URL placeholder, what it is, stack, run locally, AI agent, license). **CONFIRM (file inspection)**
  4. LICENSE is the full AGPL-3.0 text (first line: "GNU AFFERO GENERAL PUBLIC LICENSE"). **CONFIRM (file inspection)**
  5. [PILOT] Push the phase-08 branch to main (or merge the PR). GitHub Actions runs the `build-and-deploy` job. All steps pass (green). The app is accessible at `https://<username>.github.io/orbifold/` — confirm the URL loads.
  6. [PILOT] At the live URL: confirm the app loads (canvas renders), audio starts after clicking play, the Agent panel accepts a key, and a share URL round-trips correctly.
- Record each item as CONFIRMED or FAILED with a note.
- Append the Phase 08 Completion section with the final acceptance coverage table.

Validation:
- All 4 gate commands exit 0.
- Smoke items 1–4 CONFIRMED by code/output inspection.
- Items 5–6 require Pilot live-deployment confirmation.
- Test count ≥ 180 (no new tests in this phase; count must not regress).

Expected result:
- All 6 A-08 acceptance IDs addressed in the Acceptance Coverage Table (items 5–6 marked PILOT).
- Phase 08 Completion section appended to handoff.

CHECKPOINT → Commit message:
`feat(deploy): Phase 08 step 08.4 — operability verification and phase-08 completion handoff`

---

## Phase Acceptance

- **A-08-01** — README.md is complete: title, live app URL, what it is, stack, local run commands, AI agent instructions (bring your own key, stored in localStorage), and AGPL-3.0 license note.
  - Validation method: `operability`
- **A-08-02** — LICENSE is the full AGPL-3.0 text (not a stub) and is present at the repo root.
  - Validation method: `operability`
- **A-08-03** — The GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main`, runs tsc/lint/test/build quality gates, and deploys `dist/` to GitHub Pages. All workflow steps use exact action versions.
  - Validation method: `operability`
- **A-08-04** — `pnpm build` produces `dist/index.html` with all asset paths prefixed `/orbifold/` (confirming the Vite `base` config is correct for GitHub Pages subpath hosting).
  - Validation method: `operability`
- **A-08-05** — The production URL (`https://<username>.github.io/orbifold/`) loads the app after a push to `main`; the canvas renders and audio starts after a user gesture.
  - Validation method: `live-system`
- **A-08-06** — At the production URL: the app is fully functional end-to-end — Tonnetz navigation, rhythm playback, agent panel (with user's own key), and share URL round-trip all work correctly.
  - Validation method: `live-system`

## Operability requirements

- **Boot commands**: `pnpm dev` → app loads at `http://localhost:5173/orbifold/` (note: with base `/orbifold/`, the dev server also serves from that subpath). `pnpm build` → `dist/` produced with prefixed asset paths.
- **Required data**: none (100% static; no database, no seeds).
- **Required env vars / flags**: none for the app itself. GitHub Actions requires the repo to have GitHub Pages enabled (Settings > Pages > Source: GitHub Actions) — this is a one-time Pilot setup step documented in the README or Phase 08 Completion section.
- **Required headers / inter-service contracts**: not applicable (static app; agent calls go directly from the browser to the user's AI provider).
- **Migrations**: not applicable.
- **Smoke checks**: (1) `pnpm build` exits 0 and `dist/index.html` has `/orbifold/`-prefixed asset paths. (2) GitHub Actions workflow runs green on push to `main`. (3) Live URL loads and app is functional.
- **Idempotency**: `pnpm build` is idempotent; re-running overwrites `dist/` cleanly.

## Partial coverage from prior phase

No prior partials to address. All 10 A-07 IDs were fully covered at Phase 07 completion (Pilot live-browser confirmed 2026-06-10).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **GitHub Pages vs. custom domain base path** — Trigger: step 08.3. If the Pilot decides to use a custom domain (e.g. `orbifold.app`) where the app is served from the root, the Vite `base` must be changed from `/orbifold/` to `/`. Document the decision and the reason for the chosen value in an ADR so future contributors understand why the base is set as it is.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-08-handoff.md`. See `handoff-template.md`.

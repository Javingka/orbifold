# Phase 08 Inventory — Publication

**Created:** 2026-06-10
**Phase file:** `docs/orbifold-v1/phases/phase-08.md`

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `README.md` | Sparse: tagline, stack, dev commands, license note. Missing: live-app URL, AI agent instructions. | Rewrite to all 7 required sections per step 08.2. |
| `LICENSE` | Full AGPL-3.0 text (661 lines). First line: "GNU AFFERO GENERAL PUBLIC LICENSE". | No change needed — already complete. |
| `vite.config.ts` | Defines Svelte plugin and `outDir: 'dist'`. No `base` key set (resolves to `/`). | Add `base: '/orbifold/'` plus explanatory comment per step 08.3. |
| `.github/workflows/deploy.yml` | Does not exist (`.github/` directory absent). | Create CI/CD pipeline per step 08.3. |
| `docs/orbifold-v1/handoffs/phase-08-handoff.md` | Does not exist. | Created in this step; appended after each subsequent step. |
| `docs/orbifold-v1/inventories/phase-08-inventory.md` | Does not exist. | Created in this step (this file). |

Total file count: 6 (including docs). 4 source/config files — well within the 15-file threshold.

## Existing behavior to preserve

- All 180 tests pass (`pnpm test`). No tests are added in this phase.
- `tsc --noEmit` exits 0 and `pnpm lint` exits 0 — the Vite config change and README/LICENSE edits must not introduce type errors or lint violations.
- `pnpm build` exits 0 and produces `dist/` cleanly (idempotent).
- All prior phase behavior (Tonnetz, rhythm, composition, agent, persistence) is unchanged — this phase is purely deploy/docs.
- AGPL-3.0 license remains intact at root.

## New behavior to introduce

- `pnpm build` produces `dist/index.html` with all asset paths prefixed `/orbifold/` (required for GitHub Pages subpath hosting at `https://Javingka.github.io/orbifold/`).
- `pnpm dev` serves the app from `http://localhost:5173/orbifold/` (the dev server mirrors the `base` setting).
- A GitHub Actions workflow triggers on every push to `main`, runs the full quality gate (`tsc`, lint, test, build), and deploys `dist/` to GitHub Pages automatically.
- README.md gives a complete orientation for new visitors, local developers, and agent users — including the live app URL placeholder and bring-your-own-key instructions.

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-08-01 | README complete with all 7 required sections | operability (file inspection) | (none — static file) | 08.4 |
| A-08-02 | LICENSE is full AGPL-3.0 text at repo root | operability (file inspection) | (none — static file) | 08.4 |
| A-08-03 | GitHub Actions workflow runs quality gates and deploys to GitHub Pages | operability (file inspection) | (none — YAML file) | 08.4 |
| A-08-04 | `pnpm build` produces `dist/index.html` with `/orbifold/`-prefixed asset paths | operability (build + output inspection) | (none — build output) | 08.4 |
| A-08-05 | Production URL loads the app after push to `main` | live-system (Pilot) | (none — requires live deployment) | 08.4 (PILOT) |
| A-08-06 | App fully functional at production URL end-to-end | live-system (Pilot) | (none — requires live deployment) | 08.4 (PILOT) |

## Tests to add or modify

None. Phase 08 is purely deployment/documentation. The 180 existing tests are unchanged.

## Open decisions surfaced

**Resolution required before step 08.2.** These cannot be silently inherited:

- **pnpm version for the CI workflow** — The phase spec says "fixed version such as `pnpm@9.15.4`; check that pnpm 9.x is compatible with the lockfile." The current `pnpm-lock.yaml` was generated with pnpm 9.x (confirmed by lockfile format). Step 08.3 must select an exact pnpm version. Recommendation: use `pnpm@9.15.4` as suggested in the spec (no blocking issue; this is an implementation detail the Dev resolves in step 08.3 without Pilot input).

None requiring Pilot resolution before step 08.2. Proceed to 08.2 after Pilot approval.

## Source-of-truth check

No cross-source data consumption in this phase. Phase 08 is static-deploy configuration only. The build output (`dist/`) is produced by Vite from the existing source tree; no external data producer is involved.

## New dependencies needed

None. GitHub Actions runner actions (`actions/checkout`, `actions/setup-node`, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`) are CI infrastructure and must NOT be added to `package.json`. No new npm runtime or devDependencies.

## Environment, CI, build, or deployment changes needed

- **Vite `base` path** — Add `base: '/orbifold/'` to `vite.config.ts`. This changes the dev server root from `/` to `/orbifold/`; local dev must use `http://localhost:5173/orbifold/` after this change.
- **GitHub Actions workflow** — Create `.github/workflows/deploy.yml` with the specified pipeline. No package.json changes.
- **GitHub Pages one-time setup (Pilot action)** — After creating the workflow, the Pilot must enable GitHub Pages in the repository settings: Settings → Pages → Source: GitHub Actions. This is a one-time, manual step. The workflow will fail silently (or queue) until this is enabled. Must be documented in the phase-08 completion handoff and noted in README or a comment.
- **Repository visibility** — The repo must be public (or GitHub Pages must be enabled on a private repo with a paid plan). AGPL-3.0 requires public source availability; the Pilot confirmed the repo will be public.

## Decisions Register check

- **Exact dependency version pinning** (Phase 00): GitHub Actions action versions are not npm dependencies and not subject to this rule. pnpm itself in the workflow is installed globally via `npm install -g` and should use a pinned version — consistent with the spirit of this decision.
- No other vigent Register entries apply to this phase (Chord cx/cy: not applicable).

## Project-specific verification tables

### Prototype parity

Not applicable. Phase 08 contains no logic ported from `reference/orbifold.html`. No prototype-parity checklist items apply.

### Flag-off request audit

Not applicable. Phase 08 introduces no feature flags.

### Contract Verification and Fixtures-from-backend

Not applicable. This initiative has no backend.

## Findings: current state of files

### README.md — current state

Present. Contains:
- Title (with ꩜ emoji) and tagline paragraph
- "Stack" section (one-line list)
- "Development" section (pnpm commands)
- "License" section (AGPL-3.0 note with link)

Missing sections per phase-08 spec:
- **Live app URL** — no link to `https://Javingka.github.io/orbifold/`
- **AI Agent instructions** — no section explaining bring-your-own-key, localStorage storage, or how to open the Agent panel
- The existing content is a subset of required; a targeted rewrite (not from scratch) is appropriate

### LICENSE — current state

**COMPLETE.** The file is 661 lines and contains the full AGPL-3.0 Version 3, 19 November 2007 text, including preamble, terms, and "How to Apply" section. First line: "                    GNU AFFERO GENERAL PUBLIC LICENSE". No regeneration needed in step 08.2.

### vite.config.ts — current state

No `base` key present. Current config:
```ts
export default defineConfig({
  plugins: [svelte()],
  build: { outDir: 'dist' },
});
```
The default `base` is `/` — correct for a custom domain but wrong for GitHub Pages subpath. Step 08.3 must add `base: '/orbifold/'`.

### .github/workflows/deploy.yml — current state

**Does not exist.** The `.github/` directory is absent. Step 08.3 must create both the directory and the workflow file.

## Risks specific to this phase

- **Dev server subpath change**: Adding `base: '/orbifold/'` changes the local dev server URL. Any developer with a bookmark to `http://localhost:5173/` will need to update it to `http://localhost:5173/orbifold/`. This is a cosmetic inconvenience, not a functional regression.
- **GitHub Pages first-deployment**: The Pages source must be set to "GitHub Actions" in repo settings before the first push. If the Pilot pushes without enabling this first, the deployment step will fail (the quality gates and build will still pass). Document the setup order clearly.
- **pnpm lockfile compatibility**: The frozen lockfile install (`pnpm install --frozen-lockfile`) in CI depends on the lockfile matching the installed pnpm version. The current lockfile is pnpm v9 format; using `pnpm@9.15.4` in CI is compatible.

## Pilot review

Pilot approves before step 08.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization.

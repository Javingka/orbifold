# ADR 0001 — Svelte tooling: plain Svelte + Vite (not SvelteKit)

- **Status:** Accepted
- **Date:** 2026-06-05
- **Initiative / Phase:** orbifold-v1 / Phase 00
- **Deciders:** Pilot (Javier)

## Context

Phase 00 scaffolds the build tooling. The UI framework is Svelte (confirmed at kickoff, `ORBIFOLD_KICKOFF.md §3`). Svelte can be used two ways:

- **SvelteKit** — a full application framework: file-based routing, SSR/SSG, server endpoints, adapters.
- **Plain Svelte + Vite** — Svelte compiled by `@sveltejs/vite-plugin-svelte`, mounted manually into a single `index.html`.

Orbifold is a 100% static, single-screen instrument: one PIXI/WebGL canvas plus overlay panels, no routing, no server-side rendering, no server endpoints. Agent API calls go directly from the browser to the user's provider with the user's key (no backend in this initiative). The folder structure in `ORBIFOLD_KICKOFF.md §4` is shaped for manual mounting (`src/main.ts` mounts `src/app/App.svelte` onto `#app`), not for SvelteKit's `routes/+page.svelte` convention. Target deployment is a static `dist/` on a static host (§9).

## Decision

Use **plain Svelte + Vite** (`@sveltejs/vite-plugin-svelte`), not SvelteKit.

## Consequences

**Positive**
- Simpler mental model and fewer moving parts; no adapter/routing/SSR layer to configure or reason about.
- Matches the kickoff §4 structure (`main.ts` → `App.svelte`) and the static-deploy target (§9) directly.
- `vite build` already emits a static `dist/` suitable for any static host.

**Negative / risks**
- If the project later needs routing, SSR, or server endpoints, migrating to SvelteKit would be a non-trivial restructuring. Judged unlikely given the product's no-objectives (no accounts, no heavy backend, no real-time collaboration in this stage).

**Neutral**
- Svelte component authoring, `vitePreprocess()`, and TypeScript usage are identical either way; only the app shell and tooling differ.

## Reversibility

Reversible at a cost: adopting SvelteKit later means introducing the framework, moving the mount into its routing model, and choosing an adapter. No data migration involved.

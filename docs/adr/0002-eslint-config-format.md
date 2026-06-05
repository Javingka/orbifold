# ADR 0002 — ESLint config format: flat config (not legacy .eslintrc)

- **Status:** Accepted
- **Date:** 2026-06-05
- **Initiative / Phase:** orbifold-v1 / Phase 00
- **Deciders:** Pilot (Javier)

## Context

Phase 00 sets up linting. ESLint supports two configuration formats:

- **Flat config** (`eslint.config.js`) — the default since ESLint 9, an explicit array of config objects.
- **Legacy** (`.eslintrc.*` + `.eslintignore`) — the historical format, deprecated and slated for removal in a future major.

The project is greenfield (no existing ESLint config to preserve), TypeScript `strict`, with Svelte files. Both `typescript-eslint` and `eslint-plugin-svelte` ship first-class flat-config support in their current versions.

## Decision

Use **ESLint flat config** (`eslint.config.js`), not legacy `.eslintrc`.

## Consequences

**Positive**
- Aligns with the ESLint 9 default and the direction of the ecosystem; avoids adopting a format already marked for removal.
- Single, explicit config file; `.eslintignore` is replaced by `ignores` entries in the config.

**Negative / risks**
- Flat-config support depends on current plugin versions. If a pinned version of `eslint-plugin-svelte` or `typescript-eslint` has a flat-config regression, the Dev pins a known-compatible version (surfaced as a `missing-decision` blocker if the choice is non-obvious). Noted as a risk in the Phase 00 inventory.

**Neutral**
- Rule selection (TS strict rules, Svelte rules, `no-unused-vars` error, `no-console` warn) is independent of the file format.

## Reversibility

Reversible: converting flat config to legacy (or vice versa) is a mechanical rewrite of one config file with no impact on source code.

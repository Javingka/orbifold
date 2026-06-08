# Handoff — Phase 04 (Svelte UI Layer)

---

## Step 04.1 — Inventory

**Date:** 2026-06-08
**Commit(s):** (terminal commit — see below)
**Iteration:** 1 of 5

### Completed
- Read all required files: CLAUDE.md, decisions.md, phase-04.md, App.svelte, session.ts, reference/orbifold.html (lines 1–580, 638–693, 838–877, 1410–1535, 2128–2148), tonnetz-scene.ts, src/ui/ directory, src/state/ directory, main.ts, ORBIFOLD_KICKOFF.md §4–6, euclid.ts, tonal-function.ts, scales.ts, handoff-template.md.
- Produced `docs/orbifold-v1/inventories/phase-04-inventory.md` covering: component map (9 components), App.svelte changes, layer-overlay decision, state additions, session.ts additions, CSS strategy, open decisions, source-of-truth check, dependency needs, environment changes, Register check, risks.
- Open Decision 2 (code-drawer currentCode) confirmed resolved by Pilot (OD-2: local state in CodeDrawer.svelte).
- One open decision remains for Pilot: font loading strategy (Google Fonts @import vs. fontsource packages vs. system fallbacks).

### Files touched
- `docs/orbifold-v1/inventories/phase-04-inventory.md` — created
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by the inventory step.

### Routine validations (one-liner each, no transcripts)

None — inventory step does not run validation commands.

### Acceptance Coverage Table

No Acceptance IDs touched by this step.

### Decisions made (if any)
- Layer-control DOM overlay stays in App.svelte through Phase 04 (no dedicated `LayerCtl.svelte`). Rationale documented in inventory §Layer-overlay refactor.

### Proposed Decisions Register entries (if any)
- "Layer-control DOM overlay stays in App.svelte until an explicit refactor phase" — surfaced in step 04.1; low stakes, Pilot may accept or defer.

### Blockers resolved during this step (if any)
- None.

### Environment state after this step
- Codebase unchanged (no source code written).
- 119 tests still passing (no changes to src/).
- One open decision awaiting Pilot resolution: font loading strategy.

### Next-step context (only if non-obvious)
- Before step 04.2 begins, the Pilot must choose the font loading strategy (Open Decision 1 in inventory). If option (b) is chosen, a `pnpm add` command with three exact-version fontsource packages must be authorized.
- Step 04.2 creates `src/app/app.css` and adds session.ts action functions. It also removes the rhythm-seed block in App.svelte `onMount` (the temporary 4-on-the-floor BD seeded for Phase 02/03 smoke tests).

### Planner Review

**Planner Review:** APPROVED on 2026-06-08. Iteration: 1 of 5.
**Reason:** Inventory step passes all 8 checklist items: docs-only commit with no source changes, correct commit type (`docs`), no Acceptance IDs to cover (correctly declared N/A), Register entries confirmed consistent (dependency pinning noted conditional on font option; Chord.cx/cy decision respected), 119-test baseline confirmed unchanged, no new dependencies or env/CI changes, one open decision (font loading) correctly surfaced and escalated to Pilot rather than self-resolved. The inventory itself is complete against every item the phase spec required: all 9 components mapped with prototype line ranges, props, store reads/writes, and pure-presentational determination; App.svelte removal plan; layer-overlay decision with Register candidate; transient vs. store state distinctions; all 10 session.ts additions itemized; CSS strategy; source-of-truth alignment table; risk section. Prototype parity item is N/A for an inventory step.
**Next action:** Pilot checkpoint 1 — Pilot reviews inventory and resolves open decisions before step 04.2.

---

## Step 04.2 — Global styles, CSS tokens, and `session.ts` additions

**Date:** 2026-06-08
**Commit(s):** see below
**Iteration:** 1 of 1

### Completed

- Created `src/app/app.css` with all prototype CSS tokens (`:root` custom properties, body gradient + grain overlay, `.glass`, base resets, `#app` flex layout, `.seg`/`.seg2` segment controls, `.field`/`.keypill` key selector helpers, `@keyframes pulse`/`dot`, media query). No font `@import` added per OD-1 resolution (fonts are in `index.html` `<link>` tags).
- Added `import './app/app.css'` to `src/main.ts` (before App import so tokens cascade globally).
- Added eight new action functions to `src/state/session.ts`: `setChordMode`, `setHarmonyKey`, `addEuclidLayer`, `addEmptyLayer`, `previewEuclid`, `runEditor`, `queueEditor`, `clearProgression`, `clearChordAt`. Each has JSDoc citing prototype line ranges.
- Added imports for `bjorklund`, `rotate`, `RSTEPS` from `core/rhythm/euclid.ts` and `Sound` type from `core/rhythm/layers.ts` to support `addEuclidLayer`/`addEmptyLayer`.
- Removed temporary rhythm seed in `App.svelte` `onMount` (the 4-on-the-floor BD layer seeded for Phase 02/03 smoke tests); Phase 04 starts with an empty session per prototype default (lines 717, 815).
- Did NOT touch any render scene files.
- Did NOT remove the temporary transport panel (deferred to step 04.4 per spec).

### Prototype parity

All new `session.ts` functions cite prototype source line ranges:
- `setChordMode` — prototype line 897 (`chordMode` global), `requeueLive` lines 1307–1315.
- `setHarmonyKey` — prototype lines 369–395 (HTML selects), `requeueLive` lines 1307–1315.
- `addEuclidLayer` — prototype `addEuclid.onclick` handler, lines 849–857.
- `addEmptyLayer` — prototype `addLayerEmpty.onclick` handler, lines 858–861.
- `previewEuclid` — prototype `euclidPreview.onclick` handler, lines 862–876. Toggle logic: `nowPlaying.source === 'preview'` → `hushAll()`.
- `runEditor` — prototype `runEditor.onclick` handler, lines 524–526.
- `queueEditor` — prototype `updateEditor.onclick` handler, line 527.
- `clearProgression` — prototype `hushBtn.onclick` context, line 1506. 
- `clearChordAt` — prototype chip `.rm` click handler, line 1440.

### Files touched

- `src/app/app.css` — created
- `src/main.ts` — added CSS import
- `src/state/session.ts` — added imports + 8 new action functions; removed rhythm seed
- `src/app/App.svelte` — removed temporary rhythm seed block in `onMount`
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (infrastructure only; UI components come in steps 04.3–04.5).

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` (ESLint + Prettier) — 0 errors. (One Prettier formatting pass on `app.css` was run.)
- `pnpm test` — 119 tests pass (5 files; no regressions).
- Visual check: `pnpm dev` — PIXI canvas renders as before; the body background now shows the dark gradient matching the prototype. The old temporary transport panel is still present (removed in step 04.4). No seeded rhythm layers on load (empty session).

### Acceptance Coverage Table

| Acceptance ID | Behavior | Test type | Covered? |
|---|---|---|---|
| A-04-01 | Header render + view-toggle | live-system | Not yet (step 04.3) |
| A-04-02 | Now-playing pill | live-system | Not yet (step 04.3) |
| A-04-03 | Engine buttons | live-system | Not yet (step 04.3) |
| A-04-04 | BPM slider + tap-tempo | live-system | Not yet (step 04.3) |
| A-04-05 | Progression chips | live-system | Not yet (step 04.4) |
| A-04-06 | Chord-mode toggle | live-system | Not yet (step 04.4) |
| A-04-07 | Euclidean controls | live-system | Not yet (step 04.4) |
| A-04-08 | Morph toggle | live-system | Not yet (step 04.4) |
| A-04-09 | Code drawer | live-system | Not yet (step 04.4) |
| A-04-10 | HUD + legend | live-system | Not yet (step 04.5) |
| A-04-11 | Tooltip | live-system | Not yet (step 04.5) |
| A-04-12 | Layer overlay glass styling | live-system | Not yet (step 04.5) |
| A-04-13 | All A-03 IDs preserved | unit | Confirmed — 119 tests pass (no regressions) |
| A-04-14 | Gate commands exit 0 | unit + proxy:static-analysis | Partial — tsc, lint, test all pass; build not yet run (deferred to step 04.6) |

### Decisions made (if any)

- No new decisions. OD-1 (font loading: option a — `<link>` tags in `index.html`, no `@import` in `app.css`) confirmed implemented exactly as resolved.

### Proposed Decisions Register entries (if any)

None — no new architectural decisions introduced in this step.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/app/app.css` exists with all prototype CSS tokens.
- `src/state/session.ts` exports 8 new action functions (total exported functions: 18).
- `src/main.ts` imports `app.css` before `App.svelte`.
- `App.svelte` `onMount` no longer seeds a default rhythm layer.
- 119 tests still passing.
- `tsc --noEmit` 0 errors; `pnpm lint` 0 errors.

### Next-step context (only if non-obvious)

Step 04.3 creates `src/ui/Header.svelte` and `src/ui/Transport.svelte` and imports them in `App.svelte`. The header reads `$sessionStore.view` and `$sessionStore.harmony.{root,mode,octave}`; the transport reads `$sessionStore.nowPlaying` and `$sessionStore.bpm`. Both use the new `setHarmonyKey`, `playGroove`, `playProgression`, `playSession`, `hushAll`, `setBpm` actions. The `.glass` class and `.seg` classes from `app.css` are now available globally for component use.

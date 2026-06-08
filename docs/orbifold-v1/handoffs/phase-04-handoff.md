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

### Planner Review

**Planner Review:** APPROVED on 2026-06-08. Iteration: 1 of 5.
**Reason:** All 8 standard checklist items and the prototype parity item pass. Commit scope is clean (4 source files + handoff, all within step spec scope; render scene files untouched; transport panel correctly preserved). Commit message format is correct. Acceptance Coverage Table covers all 14 A-04 IDs with appropriate "not yet" for live-system items and correct partial/confirmed for A-04-13/A-04-14. Test evidence is relevant (119 existing tests confirm no regressions; optional new unit tests acknowledged as not written, which is within spec). No live-system IDs claimed. Register respected: exact-version pinning holds (no new dependencies added; `bjorklund`/`rotate`/`RSTEPS`/`Sound` imports are from existing core modules); `Chord.cx/cy` ephemeral decision respected. Reversibility intact: no flags, no migrations, existing tests pass. Prototype parity: all 9 session.ts functions have JSDoc with prototype line citations verified against actual source. `app.css` contains every required token group from the spec. AGPL-3.0 header present on `app.css` and `main.ts`. The `clearChordAt` function (9th, beyond the 8 specified) is in-scope additive work anticipated by step 04.4's spec for `ProgressionChips.svelte`.
**Next action:** Dev proceeds to step 04.3

---

## Step 04.3 — Header and Transport components

**Date:** 2026-06-08
**Commit(s):** see below
**Iteration:** 1 of 1

### Completed

- Created `src/ui/Header.svelte` — ports `<header class="glass">` (prototype lines 358–395 HTML, CSS lines 68–98):
  - Brand: `꩜` glyph, `h1` "Orbifold", `.tag` "geometría sonora".
  - View-toggle: `.seg#viewSeg` with two buttons (`data-view="harmony"`, `data-view="rhythm"`). Active state driven by `$sessionStore.view`. On click: `sessionStore.update(s => ({ ...s, view }))`.
  - Key selector: three `<select>` elements for `melRoot` (12 note names, 0–11), `melMode` (8 modes), `melOctave` (2/3/4). On change: calls `setHarmonyKey(root, mode, octave)`.
  - Spacer `.sp` (flex: 1). Mic button deferred.
  - `NOTE_NAMES` array defined inline (prototype line 592).
- Created `src/ui/Transport.svelte` — ports `<footer class="glass">` (prototype lines 484–513 HTML, CSS lines 180–222):
  - Now-playing pill: `.now#nowPlaying` with pulsing `.dot`, `.nlbl` "sonando", `.nval` shows `nowPlaying.label ?? 'silencio'`. `.live` class when `source !== null`.
  - Engine buttons: `▶ Ritmo` (`.ebtn.rhythm`), `▶ Armonía` (`.ebtn.harmony`), `▶ Sesión` (`.play-session`). Wire to `playGroove()` / `playProgression()` / `playSession()`.
  - Silence: `.tbtn.warm#hushBtn` → `hushAll()`.
  - BPM slider: `input#cps` range min `0.166` max `1.166` step `0.001`. Readout `.bpm#bpmReadout` shows `$sessionStore.bpm`. Conversion: `cps * 240 = bpm`.
  - Tap-tempo: `.taptempo#tapBtn`. Local `tapTimes[]`. Gap > 2 s resets. Keeps last 6. Flashes `.flash` class for 90 ms. Computes `setBpm(Math.round(60000/avg))`. Space-bar listener via `document.addEventListener('keydown', ...)` on mount/destroy; guard against `INPUT|TEXTAREA|SELECT` focus.
  - Progression chips area deferred to step 04.4.
- Updated `src/app/App.svelte`:
  - Added imports for `Header` and `Transport`.
  - Wrapped layout: `<Header />` above `#stage`; `<Transport />` below `#stage` (above temporary panel).
  - Changed `#stage` CSS from `position:fixed; top:0; left:0; width:100%; height:100%` to `position:relative; flex:1; margin:10px 12px; border-radius:22px; overflow:hidden; min-height:0` to integrate into the `#app` flex column.
  - Temporary transport panel retained (removed in step 04.5 per spec).
- Did NOT modify any render scene files.
- Prettier formatting applied on new Svelte files.

### Prototype parity

- `Header.svelte` — HTML structure: prototype lines 358–395. CSS: prototype lines 68–98. `NOTE_NAMES` array: prototype line 592. View-toggle data attributes: prototype lines 365–368. Mode options: prototype lines 373–382.
- `Transport.svelte` — HTML structure: prototype lines 484–513. CSS: prototype lines 180–222. BPM conversion (`cpsToBpm`/`bpmToCps`): prototype lines 644–645. BPM slider input handler: prototype line 669. Tap-tempo `registerTap()`: prototype lines 672–691 (gap > 2 s, keep last 6, flash 90 ms, space-bar guard).
- `#stage` flex layout: prototype line 106 (`position:relative; flex:1; margin:10px 12px; border-radius:22px; overflow:hidden`).

### Files touched

- `src/ui/Header.svelte` — created
- `src/ui/Transport.svelte` — created
- `src/app/App.svelte` — imports added; `<Header />` and `<Transport />` inserted; `#stage` CSS changed to flex:1
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-04-01** — `Header.svelte` renders brand glyph + "Orbifold" + "geometría sonora" tag; view-toggle `.seg#viewSeg` with two buttons; active class driven by `$sessionStore.view`. Clicking a view button calls `sessionStore.update(s => ({ ...s, view }))` which will switch the PIXI scene (store subscription in App.svelte already calls `setView(state.view)`). Covered for live-system verification in step 04.6.
- **A-04-02** — `Transport.svelte` `.now.live` class driven by `$sessionStore.nowPlaying.source !== null`; `.nval` reflects `nowPlaying.label`. Covered for live-system verification in step 04.6.
- **A-04-03** — Engine buttons bound to `playGroove()`, `playProgression()`, `playSession()`, `hushAll()`. Covered for live-system verification in step 04.6.
- **A-04-04** — BPM slider + `registerTap()` with correct prototype algorithm. Covered for live-system verification in step 04.6.

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (ESLint clean; Prettier formatted both Svelte files).
- `pnpm test` — 119 tests pass (5 files; no regressions).
- Visual check: `pnpm dev` — Header renders at top with brand, view-toggle, and key selector; Transport renders at bottom with engine buttons, BPM slider, now-playing pill, and TAP button; `#stage` with PIXI canvas fills the middle flex slot; old temporary transport panel still visible below Transport (will be removed in step 04.5).

### Acceptance Coverage Table

| Acceptance ID | Behavior | Test type | Covered? |
|---|---|---|---|
| A-04-01 | Header brand + view-toggle + key-selector render; view-toggle switches PIXI scene | live-system | Partial — component built; live-system verification in step 04.6 |
| A-04-02 | Now-playing pill label and pulsing dot; resets on hush | live-system | Partial — component built; live-system verification in step 04.6 |
| A-04-03 | Engine buttons call transport actions and update nowPlaying | live-system | Partial — component built; live-system verification in step 04.6 |
| A-04-04 | BPM slider + tap-tempo (button + space-bar) | live-system | Partial — component built; live-system verification in step 04.6 |
| A-04-05 | Progression chips drag/tap/remove | live-system | Not yet (step 04.4) |
| A-04-06 | Chord-mode toggle | live-system | Not yet (step 04.4) |
| A-04-07 | Euclidean controls | live-system | Not yet (step 04.4) |
| A-04-08 | Morph toggle | live-system | Not yet (step 04.4) |
| A-04-09 | Code drawer | live-system | Not yet (step 04.4) |
| A-04-10 | HUD + legend | live-system | Not yet (step 04.5) |
| A-04-11 | Tooltip | live-system | Not yet (step 04.5) |
| A-04-12 | Layer overlay glass styling | live-system | Not yet (step 04.5) |
| A-04-13 | All A-03 IDs covered | unit | Confirmed — 119 tests pass (no regressions) |
| A-04-14 | Gate commands exit 0 | unit + proxy:static-analysis | Partial — tsc 0 errors, lint 0 errors, 119 tests; build deferred to step 04.6 |

### Decisions made (if any)

- `#stage` CSS changed from `position:fixed` to `flex:1` within `#app` flex column. This was anticipated in the inventory (§Risks: "#stage becomes a proper flex-column layout"). PIXI `resizeTo: stageEl` continues to work correctly since `stageEl` fills the flex slot.

### Proposed Decisions Register entries (if any)

None — no new architectural decisions beyond those already documented.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/ui/Header.svelte` — created (178 lines).
- `src/ui/Transport.svelte` — created (414 lines).
- `src/app/App.svelte` — 3 changes: two new component imports, two new component usages, `#stage` CSS updated.
- 119 tests still passing.
- `tsc --noEmit` 0 errors; `pnpm lint` 0 errors.

### Next-step context (only if non-obvious)

Step 04.4 creates `ProgressionChips.svelte`, `HarmonyControls.svelte`, `RhythmControls.svelte`, and `CodeDrawer.svelte`. The chips area slot in `Transport.svelte` is intentionally empty — `ProgressionChips` will be imported in `App.svelte` and placed inside the footer layout area (or the Transport component can be refactored to accept it as a slot if the Planner prefers; spec says it goes in the footer area).

### Planner Review

**Planner Review:** APPROVED on 2026-06-08. Iteration: 1 of 5.
**Reason:** All 8 standard checklist items and the prototype parity item pass. Commit scope is clean: 2 new Svelte components + App.svelte layout update + handoff, all within step 04.3 spec scope; render scene files untouched; temporary transport panel correctly preserved per spec. Commit message format matches the required pattern. Acceptance Coverage Table is complete for all 14 A-04 IDs: A-04-01 through A-04-04 correctly marked Partial with live-system deferral to step 04.6, A-04-05 through A-04-12 correctly Not Yet, A-04-13 confirmed via 119 tests, A-04-14 Partial with build deferred to step 04.6. Test evidence is relevant (119 existing tests confirm no regressions; no live-system IDs claimed). Register respected: no new deps, exact-version pinning intact, Chord.cx/cy decision untouched. Reversibility intact: no flags, no migrations, 119 tests pass. Prototype parity: Header.svelte cites prototype HTML lines 358–395, CSS lines 68–98, NOTE_NAMES line 592; Transport.svelte cites prototype HTML lines 484–513, CSS lines 180–222, BPM conversion lines 644–645, tap-tempo lines 672–691 with all four fidelity details confirmed (gap>2s reset, keep-last-6, flash-90ms, space-bar guard with INPUT/TEXTAREA/SELECT exclusion); stage flex layout cites prototype line 106. AGPL-3.0 headers present on both new files. No unauthorized deps or env/CI changes.
**Next action:** Dev proceeds to step 04.4

---

## Step 04.4 — Progression chips, HarmonyControls, RhythmControls, and CodeDrawer

**Date:** 2026-06-08
**Commit(s):** see below
**Iteration:** 1 of 1

### Completed

- Created `src/ui/ProgressionChips.svelte` — ports `#progChips` (prototype HTML lines 505–508, CSS lines 224–234, JS lines 1413–1468):
  - Empty state: `<span class="prog-empty">toca acordes en el Tonnetz…</span>`.
  - Each chip: `.prog-chip` + tonal-function class derived from `diatonicLookup(root, mode)` keyed by `rootPc:qual` (prototype `ch.info.func.cls` line 1435).
  - Chip label: `chordLabel(ch.rootPc, ch.qual)` from `core/theory/chords.ts`.
  - Remove button `.rm ✕`: calls `clearChordAt(index)`.
  - Volume drag: `pointerdown` captures pointer, `pointermove` computes `dy = startY - e.clientY`, `gain = clamp(startGain + dy * 0.006, 0, 1.2)`, updates chip background via `chipGainCss(gain)` gradient. On `pointerup`: if moved → `requeueLive()`; if tap → `playChord(ch.rootPc, ch.qual, ch.gain)`.
  - `chipGainCss(g)` → `linear-gradient(to top, rgba(138,160,255,.30) ${pct}%, rgba(255,255,255,.05) ${pct}%)` (prototype lines 1413–1415).
  - Drag constants: threshold 3px (line 1452), step 0.006 (line 1453), clamp [0, 1.2] (line 1453).
  - Local drag state arrays (`dragging`, `startY`, `startGain`, `moved`, `localGain`) synchronized to progression length via `$:` reactive block.

- Created `src/ui/HarmonyControls.svelte` — ports `.orbit-ctl#harmonyCtl` (prototype lines 447–453, CSS lines 316–325):
  - Shown only when `$sessionStore.view === 'harmony'` (Svelte `{#if}`).
  - `.seg2#chordModeSeg`: two buttons `◧ acorde` / `⋯ arpegio` with `data-mode` attributes and `data-tip` tooltips.
  - Active state driven by `$sessionStore.chordMode`. On click: `setChordMode('chord' | 'arp')`.
  - `position: absolute` inside `#stage` at `left: 16px; bottom: 46px` (prototype `.orbit-ctl` lines 316–319).

- Created `src/ui/RhythmControls.svelte` — ports `.orbit-ctl#orbitCtl` (prototype lines 426–443, CSS lines 316–325, JS lines 838–877):
  - Shown only when `$sessionStore.view === 'rhythm'` (Svelte `{#if}`).
  - Morph toggle: `▭ lineal` / `▭ radial` button. Toggles local `morphTarget: 0 | 1`, calls `setMorphTarget(morphTarget)` from `render/rhythm-scene.ts`. Moved from App.svelte.
  - Euclidean controls: sound select, k/n/r sliders with reactive readouts, named pattern hint (KNOWN_PATTERNS map from prototype lines 844–846), preview toggle button, `+ órbita`, `+ capa vacía`.
  - `euclidR` max dynamically clamped to `n-1` (prototype line 844). `euclidR` clamped reactively when `euclidN` decreases.
  - Preview toggle: `nowPlaying.source === 'preview'` → `hushAll()`; otherwise → `previewEuclid(sound, k, n, rot)`. Button label / style changes between `▶ oír` and `■ stop`.
  - All `data-tip` attributes from prototype lines 427–443 preserved.

- Created `src/ui/CodeDrawer.svelte` — ports `#codeTab` + `#codeDrawer` (prototype HTML lines 516–528, CSS lines 237–249):
  - Tab button `#codeTab.glass`: `position:fixed; bottom:14px; left:50%; transform:translateX(-50%)` (prototype CSS line 237). Label: `⌄ código strudel`.
  - Drawer `#codeDrawer.glass`: `position:fixed; left:12px; right:12px; bottom:0`. Slides up via `transform:translateY(105%)` → `translateY(0)` with `.4s cubic-bezier(.22,1,.36,1)` transition (prototype lines 240–242). `.open` class applied when open.
  - Textarea `#liveCode`: 120px height, IBM Plex Mono, placeholder `s("bd hh sd hh")`.
  - Close button `✕` (prototype line 521).
  - Action buttons: `▶ ejecutar (ahora)` → `runEditor(code)` (prototype line 525); `↻ encolar (próximo ciclo)` → `queueEditor(code)` (prototype line 527).
  - `currentEditorCode` and `open` are local state (NOT in sessionStore per OD-2 resolution).

- Updated `src/ui/Transport.svelte`: added `<slot />` inside `<footer>` to accept `<ProgressionChips>` via slot composition.
- Updated `src/app/App.svelte`:
  - Added imports for all four new components.
  - Added `<HarmonyControls />` and `<RhythmControls />` inside `<div id="stage">` (they are `position:absolute` overlays over the PIXI canvas).
  - Wrapped `<Transport>` to pass `<ProgressionChips />` via slot.
  - Added `<CodeDrawer />` after Transport (it is `position:fixed`, renders outside flex flow).
  - Did NOT remove temporary transport panel (deferred to step 04.5 per spec).
  - Did NOT touch any render scene files.

### Prototype parity

- `ProgressionChips.svelte` — chip drag logic: prototype lines 1441–1466 (pointerdown/pointermove/pointerup flow, threshold 3px line 1452, step 0.006 line 1453, clamp [0, 1.2] line 1453, tap → playChord lines 1461–1464); `chipGainCss`: prototype lines 1413–1415; empty state: prototype line 1430; tonal-function class: prototype line 1435 (`ch.info.func.cls`).
- `HarmonyControls.svelte` — HTML: prototype lines 447–453; CSS: prototype lines 316–325.
- `RhythmControls.svelte` — HTML: prototype lines 426–443; CSS: prototype lines 316–325; Euclid controls JS: prototype lines 838–877 (renderEuclidInfo lines 839–847, addEuclid.onclick lines 849–857, addLayerEmpty.onclick lines 858–861, euclidPreview.onclick toggle lines 863–876, known patterns map lines 844–846, euclidR.max = n-1 line 844).
- `CodeDrawer.svelte` — HTML: prototype lines 516–528; CSS: prototype lines 237–249; action handlers: prototype lines 524–527.

### Files touched

- `src/ui/ProgressionChips.svelte` — created
- `src/ui/HarmonyControls.svelte` — created
- `src/ui/RhythmControls.svelte` — created
- `src/ui/CodeDrawer.svelte` — created
- `src/ui/Transport.svelte` — added `<slot />` inside footer
- `src/app/App.svelte` — added component imports and usages; HarmonyControls + RhythmControls inside `#stage`; ProgressionChips via Transport slot; CodeDrawer after Transport
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-04-05** — `ProgressionChips.svelte` built; chip drag gain logic, tap playChord, `✕` remove, tonal-function classes all implemented per prototype parity. Live-system verification in step 04.6.
- **A-04-06** — `HarmonyControls.svelte` built; chord-mode toggle with active state from `$sessionStore.chordMode`, calls `setChordMode()`. Live-system verification in step 04.6.
- **A-04-07** — `RhythmControls.svelte` built; k/n/r sliders with reactive readouts, preview toggle, `+ órbita`, `+ capa vacía`. Live-system verification in step 04.6.
- **A-04-08** — Morph toggle moved from App.svelte temp panel to `RhythmControls.svelte`; calls `setMorphTarget()` which triggers the radial↔linear animation. Live-system verification in step 04.6.
- **A-04-09** — `CodeDrawer.svelte` built; slide-up animation `.4s cubic-bezier(.22,1,.36,1)`, execute/queue buttons, close button. Live-system verification in step 04.6.

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (ESLint clean; Prettier formatted both RhythmControls and CodeDrawer).
- `pnpm test` — 119 tests pass (5 files; no regressions).
- Visual check: `pnpm dev` — progression chips area visible in footer; harmony controls overlay visible in harmony view; rhythm controls overlay visible in rhythm view; code drawer tab button at bottom-center; drawer slides up on click; old temporary transport panel still visible (removed in step 04.5).

### Acceptance Coverage Table

| Acceptance ID | Behavior | Test type | Covered? |
|---|---|---|---|
| A-04-01 | Header brand + view-toggle + key-selector render; view-toggle switches PIXI scene | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-02 | Now-playing pill label and pulsing dot; resets on hush | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-03 | Engine buttons call transport actions and update nowPlaying | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-04 | BPM slider + tap-tempo (button + space-bar) | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-05 | Progression chips drag/tap/remove behavior | live-system | Partial — ProgressionChips.svelte built; live-system verification in step 04.6 |
| A-04-06 | Chord-mode toggle updates chordMode | live-system | Partial — HarmonyControls.svelte built; live-system verification in step 04.6 |
| A-04-07 | Euclidean controls (k/n/r readouts, preview, add-orbit, add-empty) | live-system | Partial — RhythmControls.svelte built; live-system verification in step 04.6 |
| A-04-08 | Morph toggle radial↔linear (A-03-06 preserved) | live-system | Partial — morph toggle moved to RhythmControls.svelte; live-system verification in step 04.6 |
| A-04-09 | Code drawer open/close + execute/queue | live-system | Partial — CodeDrawer.svelte built; live-system verification in step 04.6 |
| A-04-10 | HUD voice-leading after chord pick; legend visibility | live-system | Not yet (step 04.5) |
| A-04-11 | Tooltip on `[data-tip]` elements | live-system | Not yet (step 04.5) |
| A-04-12 | Layer overlay glass styling + solo/mute active colors | live-system | Not yet (step 04.5) |
| A-04-13 | All A-03 IDs covered | unit | Confirmed — 119 tests pass (no regressions) |
| A-04-14 | Gate commands exit 0 | unit + proxy:static-analysis | Partial — tsc 0 errors, lint 0 errors, 119 tests; build deferred to step 04.6 |

### Decisions made (if any)

- `ProgressionChips` is inserted into `Transport.svelte` via a Svelte `<slot>` (Transport accepts children). This keeps the prototype's `footer > .prog` DOM structure intact while enabling independent component files. No new decisions require Register entry — the slot pattern is a standard Svelte composition mechanism.
- `morphTarget` and `handleMorphToggle` remain in `App.svelte` (for the temp panel) AND in `RhythmControls.svelte` (the real implementation). Both coexist without conflict since they are separate local variables. App.svelte's `morphTarget` will be removed together with the temp panel in step 04.5.

### Proposed Decisions Register entries (if any)

None — no new architectural decisions introduced in this step.

### Blockers resolved during this step (if any)

- ESLint `@typescript-eslint/no-unused-vars` flagged `catch (_)` bindings in `ProgressionChips.svelte`. Fixed by using `catch { }` (optional catch binding, TypeScript 4.0+, supported in this project's TypeScript version).
- Prettier reformatted `placeholder='s("bd hh sd hh")'` into an invalid HTML attribute (`placeholder="s("bd hh sd hh")"`). Fixed by using the Svelte expression syntax: `placeholder={'s("bd hh sd hh")'}`.

### Environment state after this step

- `src/ui/ProgressionChips.svelte` — created.
- `src/ui/HarmonyControls.svelte` — created.
- `src/ui/RhythmControls.svelte` — created.
- `src/ui/CodeDrawer.svelte` — created.
- `src/ui/Transport.svelte` — `<slot />` added inside `<footer>`.
- `src/app/App.svelte` — 4 new component imports; HarmonyControls + RhythmControls inside `#stage`; ProgressionChips via Transport slot; CodeDrawer after Transport.
- 119 tests still passing.
- `tsc --noEmit` 0 errors; `pnpm lint` 0 errors.

### Next-step context (only if non-obvious)

Step 04.5 creates `Hud.svelte`, `Legend.svelte`, `Tooltip.svelte`; creates `src/state/hud.ts`; updates layer-control overlay styling in App.svelte; and removes the temporary transport panel (the `<div class="transport-panel">` block and all associated imports/functions in App.svelte). The `morphTarget` variable and `handleMorphToggle` function in App.svelte can be safely removed in step 04.5 since `RhythmControls.svelte` now owns those. The `setMorphTarget` import in App.svelte can also be removed once the temp panel is gone (the only remaining `setMorphTarget` caller will be `RhythmControls.svelte`).

### Planner Review

**Planner Review:** APPROVED on 2026-06-08. Iteration: 1 of 5.
**Reason:** All 8 standard checklist items and the prototype parity item pass. Commit scope is clean: 4 new Svelte components + Transport slot addition + App.svelte integration + handoff, all within step 04.4 spec scope; render scene files untouched; temporary transport panel correctly preserved per spec. Commit message format matches the required pattern. Acceptance Coverage Table covers all 14 A-04 IDs correctly: A-04-05 through A-04-09 Partial with live-system deferral to step 04.6, A-04-10 through A-04-12 Not Yet (step 04.5), A-04-01 through A-04-04 re-confirmed Partial from step 04.3, A-04-13 confirmed via 119 tests, A-04-14 Partial with build deferred to step 04.6. No live-system IDs claimed as covered. Register respected: no new deps, exact-version pinning intact. Reversibility intact: four new components are purely additive; temp panel coexists without conflict; 119 tests pass. Prototype parity: all four components carry explicit prototype line citations covering HTML, CSS, and JS logic ranges — verified against actual source code; drag constants (threshold 3px/step 0.006/clamp [0,1.2]) match spec and prototype exactly; KNOWN_PATTERNS map matches prototype lines 844–846; slide transition cubic-bezier and timing match prototype lines 240–242; CodeDrawer OD-2 (local state) correctly honored. AGPL-3.0 headers present on all four new files. Two minor toolchain issues (ESLint catch binding, Prettier placeholder quoting) were resolved inline and documented. The dual-`morphTarget` coexistence in App.svelte and RhythmControls.svelte is acknowledged, non-conflicting, and correctly scheduled for cleanup in step 04.5.
**Next action:** Dev proceeds to step 04.5

---

## Step 04.5 — Hud, Legend, Tooltip, LayerCtl styling; remove temp transport panel

**Date:** 2026-06-08
**Commit(s):** see below
**Iteration:** 1 of 1

### Completed

- Created `src/state/hud.ts` — `HudState` interface, `DEFAULT_HUD_STATE`, `hudStore` writable, `showHud(title, sub)` helper with 4 200 ms auto-hide timer. Replaces prototype DOM writes `hudTitle.textContent` / `hudSub.innerHTML` (lines 1380–1382). The `hint` field carries the default `#stageHint` text (prototype line 423).
- Updated `src/render/tonnetz-scene.ts` — added imports for `chordLabel` (from `core/theory/chords.ts`) and `showHud` (from `state/hud.ts`). Updated `pickChord()` to call `showHud(title, sub)` replacing the planned prototype DOM writes (lines 1366–1369). Voice-move detail string uses `<span class="mv">` HTML spans for accent-colored deltas (prototype line 117). First-pick shows chord name + roman/function; subsequent picks show transition `"${prev} → ${new}"` + voice moves + Σ.
- Created `src/ui/Hud.svelte` — ports `.hud#hud` (prototype HTML lines 409–412, CSS lines 111–117). Props: `title`, `sub`, `visible`. Uses `{@html sub}` for the voice-leading detail (to render `<span class="mv">`). `.show` class driven by `visible` prop. Scoped `.mv` style via `:global(.mv)`.
- Created `src/ui/Legend.svelte` — ports `.legend#legend` (prototype HTML lines 414–421, CSS lines 122–127). Reads `$sessionStore.view`; shown only in harmony view via Svelte `{#if}`. Four tonal-function color squares + separator + triangle glyph + PLR label. All colors via CSS custom properties (`var(--tonic)`, `--subdom`, `--dom`).
- Created `src/ui/Tooltip.svelte` — ports `#tip` global tooltip (prototype HTML line 576, CSS lines 339–344, JS lines 2128–2148). Single `<div id="tip">` at `position:fixed; z-index:60`. `mouseover`/`mouseout` listeners on `document` via `onMount`/`onDestroy`. `place(el)` positions above the element, clamped to viewport (prototype lines 2131–2138). `.show` class applied via `classList.add/remove` directly on the element (CSS transition 0.12s, prototype line 344).
- Updated `src/app/App.svelte`:
  - Added imports: `hudStore` from `state/hud.ts`; `Hud`, `Legend`, `Tooltip` from `src/ui/`.
  - Removed imports: `initAudio`, `playGroove`, `playProgression`, `playSession`, `hushAll`, `setBpm` from `session.ts` (no longer used by App.svelte directly — owned by Transport/RhythmControls); `setMorphTarget` from `rhythm-scene.ts`.
  - Removed variables: `morphTarget: 0|1`.
  - Removed functions: `handleBpmInput`, `handleMorphToggle`, `handleViewToggle`.
  - Removed the entire `<div class="transport-panel">` block and all its children.
  - Removed the `.transport-panel`, `.transport-label`, `.now-playing` style rules.
  - Added `<Hud>`, `<Legend>`, and `.hint` div inside `<div id="stage">`.
  - Added `<Tooltip />` after `<CodeDrawer />` (outside the flex flow, position:fixed).
  - Updated `.layer-ctl` CSS to match prototype `#layerCtl` glass styling (prototype CSS lines 328–337): `background: rgba(12,15,22,.92)`, `border: var(--stroke)`, `border-radius: 11px`, `backdrop-filter: blur(8px)`, `transform: translate(-50%,-140%)`.
  - Updated layer-ctl buttons to 26×26px, font 12px 700, `color: var(--muted)` base (prototype line 332–334).
  - Added `data-a="solo"`, `data-a="mute"`, `data-a="del"` attributes to layer-ctl buttons.
  - Added `.on` class binding to Solo/Mute buttons from `$sessionStore.rhythm.layers[hoveredLayerIndex]?.solo/muted` (prototype lines 335–336).
  - Solo `.on`: `background: var(--subdom); color: #0b0d12` (prototype line 335).
  - Mute `.on`: `background: var(--dom); color: #0b0d12` (prototype line 336).
  - Delete hover: `background: rgba(232,123,172,.4); border-color: var(--dom)` (prototype line 337).

### Prototype parity

- **HUD** — `showHud(title, sub)` matches prototype lines 1379–1385: same title/sub content format; 4 200 ms auto-hide; `.show` class applied/removed. Voice-leading detail format (`voces: +N  N  · Σ N semitono/s`) matches prototype lines 1366–1367. First-pick HUD shows `ch.label + roman/func.label` (prototype line 1369). `{@html sub}` used in Hud.svelte to render `<span class="mv">` accent spans (prototype CSS line 117).
- **Legend** — HTML structure: prototype lines 414–421. CSS: prototype lines 122–127. Shown/hidden by `view === 'harmony'` — prototype hides with `.legend.hide` class (line 125); port uses Svelte `{#if}`.
- **Tooltip** — JS: prototype lines 2128–2148 (IIFE with `mouseover`/`mouseout`, `closest('[data-tip]')`, `place()` viewport clamping, `.show` class, `relatedTarget` guard). CSS: prototype lines 339–344.
- **LayerCtl styling** — CSS: prototype lines 328–337 (`background: rgba(12,15,22,.92)`, `border:var(--stroke)`, `border-radius:11px`, `backdrop-filter:blur(8px)`, `transform:translate(-50%,-140%)`, button 26×26px, solo/mute `.on` tonal-function colors, del hover warm).
- **Stage hint** — prototype CSS lines 119–120 (`position:absolute; bottom:16px; left:16px; font-size:11.5px; color:var(--faint); font-family:'IBM Plex Mono'`). Text: prototype line 423.

### Files touched

- `src/state/hud.ts` — created
- `src/render/tonnetz-scene.ts` — added `showHud` import + `chordLabel` import; updated `pickChord` to call `showHud`
- `src/ui/Hud.svelte` — created
- `src/ui/Legend.svelte` — created
- `src/ui/Tooltip.svelte` — created
- `src/app/App.svelte` — temp transport panel removed; new component imports/usages; layer-ctl glass styling; `morphTarget`/`handleMorphToggle`/`handleViewToggle`/`handleBpmInput` removed
- `docs/orbifold-v1/handoffs/phase-04-handoff.md` — this entry

### Validation evidence (per Acceptance ID)

- **A-04-10** — `Hud.svelte` built; `showHud` called in `pickChord` with correct title/sub format (voice-leading Σ, accent spans). `Legend.svelte` shows in harmony view, hides in rhythm view via `{#if}`. Live-system verification in step 04.6.
- **A-04-11** — `Tooltip.svelte` built; `mouseover`/`mouseout` delegation on `document`, `closest('[data-tip]')`, viewport-clamped `place()`, `.show` class management. Live-system verification in step 04.6.
- **A-04-12** — Layer-ctl `.layer-ctl` CSS updated to prototype `#layerCtl` glass spec; solo/mute `.on` class bindings from store layer state; del hover style. Live-system verification in step 04.6.

### Routine validations

- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors (ESLint clean; Prettier ran on `tonnetz-scene.ts`, all other new files passed unchanged).
- `pnpm test` — 119 tests pass (5 files; no regressions).
- `pnpm build` — 0 errors (chunk-size warning for Strudel bundle is pre-existing, not introduced by this step).
- Visual check: `pnpm dev` — temporary transport panel is gone; HUD, Legend, stage hint, and layer-ctl overlays render inside `#stage`; Tooltip renders as `<div id="tip">` in the document; PIXI canvas and all prior UI components intact.

### Acceptance Coverage Table

| Acceptance ID | Behavior | Test type | Covered? |
|---|---|---|---|
| A-04-01 | Header brand + view-toggle + key-selector render; view-toggle switches PIXI scene | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-02 | Now-playing pill label and pulsing dot; resets on hush | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-03 | Engine buttons call transport actions and update nowPlaying | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-04 | BPM slider + tap-tempo (button + space-bar) | live-system | Partial — built in step 04.3; live-system verification in step 04.6 |
| A-04-05 | Progression chips drag/tap/remove behavior | live-system | Partial — ProgressionChips.svelte built (step 04.4); live-system verification in step 04.6 |
| A-04-06 | Chord-mode toggle updates chordMode | live-system | Partial — HarmonyControls.svelte built (step 04.4); live-system verification in step 04.6 |
| A-04-07 | Euclidean controls (k/n/r readouts, preview, add-orbit, add-empty) | live-system | Partial — RhythmControls.svelte built (step 04.4); live-system verification in step 04.6 |
| A-04-08 | Morph toggle radial↔linear (A-03-06 preserved) | live-system | Partial — RhythmControls.svelte built (step 04.4); live-system verification in step 04.6 |
| A-04-09 | Code drawer open/close + execute/queue | live-system | Partial — CodeDrawer.svelte built (step 04.4); live-system verification in step 04.6 |
| A-04-10 | HUD voice-leading after chord pick; legend visibility | live-system | Partial — Hud.svelte + Legend.svelte built; showHud wired in pickChord; live-system verification in step 04.6 |
| A-04-11 | Tooltip on `[data-tip]` elements | live-system | Partial — Tooltip.svelte built with prototype JS logic; live-system verification in step 04.6 |
| A-04-12 | Layer overlay glass styling + solo/mute active colors | live-system | Partial — layer-ctl CSS updated to prototype spec; .on bindings from store; live-system verification in step 04.6 |
| A-04-13 | All A-03 IDs covered | unit | Confirmed — 119 tests pass (no regressions) |
| A-04-14 | Gate commands exit 0 | unit + proxy:static-analysis | Confirmed — tsc 0 errors, lint 0 errors, 119 tests, build exit 0 |

### Decisions made (if any)

- `hudStore` placed in a dedicated `src/state/hud.ts` (not inlined into `session.ts`) per the ADR trigger in phase-04.md §ADR Triggers. Rationale: HUD state is ephemeral/presentational and should not be in scope for Phase 07 session persistence. This is documented in the file header.
- `Legend.svelte` uses Svelte `{#if}` to show/hide (rather than prototype's CSS `.legend.hide` class) — equivalent behavior, idiomatic Svelte pattern.
- `Tooltip.svelte` uses `mouseover`/`mouseout` (same as prototype) rather than `pointermove` — matches exact prototype event model (lines 2140–2146).

### Proposed Decisions Register entries (if any)

- "hudStore is ephemeral: not included in Phase 07 persistence scope" — low stakes; informational. The relevant note is already in `src/state/hud.ts` file header. Pilot may add to Register if desired.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `src/state/hud.ts` — created.
- `src/render/tonnetz-scene.ts` — `showHud` + `chordLabel` added; `pickChord` writes to `hudStore`.
- `src/ui/Hud.svelte` — created.
- `src/ui/Legend.svelte` — created.
- `src/ui/Tooltip.svelte` — created.
- `src/app/App.svelte` — temp transport panel removed; 3 new components integrated; layer-ctl glass styling applied; unused imports/vars/functions cleaned up.
- 119 tests still passing.
- `tsc --noEmit` 0 errors; `pnpm lint` 0 errors; `pnpm build` exit 0.

### Next-step context (only if non-obvious)

Step 04.6 is operability verification: run all gate commands and perform the 14-point prototype-parity smoke test. All UI components are now in place. Any defects found in smoke testing must be fixed and re-verified in step 04.6 before declaring phase complete.

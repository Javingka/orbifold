# Phase 05 Inventory — Composition (DAW Timeline)

**Created:** 2026-06-08
**Phase file:** `docs/orbifold-v1/phases/phase-05.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/app/app.css` | Global CSS tokens for all existing UI | Append composition CSS token set (lines 251–314 of prototype) |
| `src/state/session.ts` | Reactive session store, transport actions | Add 12 new composition action functions; add `'block'` to `NowPlaying.source` union |
| `src/state/composition.ts` | Does not exist | Create: module-level playhead timing state, `compPos()`, getters/setters, `PPB` constant |
| `src/ui/CompositionDrawer.svelte` | Does not exist | Create: composition tab + slide-up drawer (block library + timeline) |
| `src/app/App.svelte` | Root Svelte component | Add `import CompositionDrawer` and `<CompositionDrawer />` after `<CodeDrawer />` |

**Total files: 5.** Within the 15-file threshold; no scope-issue blocker needed.

---

## State shape audit

### `SessionState.composition: Composition` — confirmed present

`src/state/session.ts` line 139:
```ts
composition: Composition; // imported from core/composition/model.ts
```

`src/core/composition/model.ts` defines:
- `Block { id, name, type, code, bars }` — all fields used by Phase 05. No new fields expected.
- `Track { id, blocks: { blockId, bars }[] }` — all fields used by Phase 05. No new fields expected.
- `Composition { blocks: Block[]; tracks: Track[] }` — shape matches prototype lines 1931–1932.

### `Chord.cx/cy` — confirmed absent from composition fields

`Block.code` is a Strudel string (pure text). `Block` has no `cx`, `cy`, or any pixel-coordinate field. `Track` and `Composition` similarly contain no canvas-coordinate fields. The decision "`Chord.cx/cy` — render hints efímeros, no persistidos" is fully respected: Phase 05 composition state uses only musical identity (`rootPc`, `qual`, `gain`, `steps`) baked into `Block.code` via `rhythmToStrudel`/`melodyLine`/`buildSession` at save time. No pixel coordinates are ever stored.

### `DEFAULT_SESSION_STATE` — confirmed correct seed

`session.ts` lines 162–165:
```ts
composition: {
  blocks: [],
  tracks: [],
},
```
This matches the expected initial state. Phase 05 will not need to change the default.

---

## `NowPlaying.source` union — audit

`session.ts` lines 115–125 define the `NowPlaying.source` union:
```ts
source:
  | 'rhythm'
  | 'harmony'
  | 'session'
  | 'chord'
  | 'composition'
  | 'preview'
  | 'agent'
  | 'editor'
  | null;
```

**`'composition'` is already present.** A-05-08 / A-05-10 are covered.

**`'block'` is NOT present.** A-05-03 requires `setNowPlaying('Bloque · ' + block.name, 'block')` (prototype line 1961). Step 05.2 must add `'block'` to the union. This is a required code change — not optional.

---

## New session actions needed

All 12 actions must be added to `src/state/session.ts` in step 05.2. Prototype citations confirmed:

| Action | Prototype lines | Notes |
|---|---|---|
| `addBlock(type)` | 1939–1946 | Captures current engine code, increments `_blkSeq`, pushes `Block`. Calls `rhythmCode()`, `harmonyCode()`, or `sessionCode()` + `stripComments`. |
| `deleteBlock(blockId)` | 1963–1966 | Removes from `composition.blocks` and all track refs. |
| `renameBlock(blockId, name)` | 1960 (`.nm input` handler) | Updates `block.name` in store. |
| `playBlockById(blockId)` | 1961 | `runNow(block.code)`, sets nowPlaying `{ label: 'Bloque · ' + block.name, source: 'block' }`. |
| `addTrack()` | 2120 | Pushes `{ id: 't' + _trkSeq++, blocks: [] }`. |
| `removeTrack(trackIndex)` | 2000 | Splices track; if last, re-adds one empty track. |
| `addBlockToTrack(trackIndex, blockId)` | 2047 (selector `onchange`) | Pushes `{ blockId, bars: block.bars }` to specified track's `blocks`. |
| `removeBlockFromTrack(trackIndex, refIndex)` | 2015 | Removes block ref by index from track. |
| `setBlockBars(trackIndex, refIndex, bars)` | 2017–2018 | Clamp [1, 64], update `ref.bars`. |
| `reorderBlockInTrack(trackIndex, fromIndex, toIndex)` | 2036–2037 | Splice ref to new position. |
| `playComposition()` | 2093–2103 | `buildComposition(blocks, tracks)`, `runNow`, `setNowPlaying`, `setCompPlaying`. Handle resume-from-pause. |
| `pauseComposition()` | 2104–2110 | `compPos(bpm).pos → setCompPaused`, `hush()`, update `nowPlaying.label`. |
| `stopComposition()` | 2112–2115 | `hush()`, `setCompStopped()`, `setNowPlaying(null, null)`. |

**`buildComposition(blocks, tracks)` — confirmed no changes needed.** Already exported from `src/core/composition/model.ts` (lines 81–102) with the correct signature. Byte-for-byte port of prototype lines 2054–2065.

**`stripComments` — confirmed no changes needed.** Already exported from `src/core/composition/model.ts` (lines 47–53). Port of prototype lines 1936–1938.

### Module-level counter placement

The prototype uses module-level `blkSeq = 1` and `trkSeq = 1` (line 1933). These are NOT part of the `Composition` store shape (they are not on `Block` or `Track`; they only generate IDs at block/track creation time).

**Pilot has resolved this as OD-1:** option (a) — module-local ephemeral counters, NOT in sessionStore.

Implementation: `_blkSeq` and `_trkSeq` as module-level `let` variables in `session.ts`, initialized to 1. This matches the prototype exactly. IDs regenerate on page reload (same as prototype behavior — the prototype does not persist these counters either).

---

## New source files

### `src/state/composition.ts` — new

**Pilot has resolved this as OD-2:** option (a) — separate `src/state/composition.ts` module, consistent with `hud.ts` pattern. This state is NOT in the Svelte store — it is playhead timing state, ephemeral, not serialized.

Contents:
- AGPL-3.0 header.
- `compState: 'stopped' | 'playing' | 'paused'` — module-level.
- `compStart: number` — `performance.now()` timestamp at which playback started (or was offset for resume).
- `compPausedBars: number` — bar position at which pause was triggered.
- `compPos(bpm: number, totalBars: number): { tb: number; pos: number }` — playhead position computation.
- Exported getters/setters: `getCompState()`, `setCompPlaying(start: number)`, `setCompPaused(bars: number)`, `setCompStopped()`.
- `PPB: number` constant = 48 (pixels per bar), exported for `CompositionDrawer.svelte`.

**Playhead formula confirmed:**
```
barsElapsed = ((performance.now() - compStart) / 1000) * (bpm / 240)
pos = barsElapsed % totalBars
```
Prototype lines 2069–2072. Consistent with `setcps(bpm/240)` in CLAUDE.md: 1 Strudel cycle = 1 bar of 4/4 = bpm/240 cycles per second, so 1 second = bpm/240 bars elapsed.

When `compState === 'paused'`: `pos = compPausedBars % totalBars` (prototype line 2069).

**Note on signature difference from phase spec:** The phase spec's step 05.2 shows `compPos(bpm: number): { tb: number; pos: number }` with `tb` returned from the function. However, `totalBars` is a derived value from `blocks` and `tracks`, which live in the Svelte store — not in the `composition.ts` module. The function will need `totalBars` passed in by the caller (`CompositionDrawer.svelte` knows both). The step 05.2 spec will clarify the signature; this inventory notes the dependency.

### `src/ui/CompositionDrawer.svelte` — new (step 05.3)

Ports `#compTab` + `#compDrawer` from prototype lines 530–574 (HTML), 251–314 (CSS), 1927–2127 (JS).

Key components:
- Tab button: fixed position, `z-index:8`, opens drawer on click.
- Drawer: slide-up with `.open` class, `.comp-grid` two-column layout.
- Block library column: save buttons, `{#each $sessionStore.composition.blocks}` block list with contenteditable name, code preview, play/add/delete buttons.
- Timeline column: track heads (120 px) + scroll area, bar ruler, lanes with positioned blocks, resize grip, drag-to-reorder, `.tl-add` selector, `.tl-playhead`.
- Transport buttons: ▶/⏸/■/limpiar.
- `requestAnimationFrame` loop (playhead + auto-scroll + `.playing` highlight).

---

## CSS strategy

All composition CSS goes into `src/app/app.css` (appended after existing rules). No scoped styles in `CompositionDrawer.svelte` for layout tokens that belong in the global token set.

Prototype source ranges to port:
- Lines 251–257: `#compTab`, `#compDrawer`, `.open`.
- Lines 258–274: `.comp-grid`, `.comp-col`, `.save-row`, `.blk`, `.blk .tag`, `.arr-empty`.
- Lines 276–314: `.timeline`, `.tl-heads`, `.tl-head-ruler`, `.tl-head`, `.tl-scroll`, `.tl-inner`, `.tl-ruler`, `.tl-lane`, `.tl-block`, `.tl-add`, `.tl-playhead`, `.tl-empty`.

---

## Auto-scroll behavior

Prototype lines 2080–2081:
```js
const scroll = document.getElementById('tlScroll');
const x = pos * PPB;
if (x < scroll.scrollLeft + 30 || x > scroll.scrollLeft + scroll.clientWidth - 30)
  scroll.scrollLeft = Math.max(0, x - scroll.clientWidth * 0.3);
```

The playhead auto-scrolls when within 30 px of either edge of the visible scroll area. Uses `scrollLeft` directly on the scroll container element. In `CompositionDrawer.svelte`, the scroll container is bound via `bind:this={scrollEl}` and updated in the rAF loop.

---

## Existing behavior to preserve

- All A-04 acceptance IDs (full UI layer: Tonnetz, rhythm scene, transport, BPM, chips, code drawer, HUD, tooltip, legend) must continue to work after Phase 05 additions (A-05-12).
- `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥120 passing), `pnpm build` all exit 0.
- `requeueLive()` in `session.ts` does NOT handle `'composition'` or `'block'` source — the composition transport manages its own re-evaluation (prototype `refreshCompIfPlaying`). This is implemented via `playComposition()` re-calling `buildComposition + runNow` when state changes, analogous to prototype line 1979. No changes to `requeueLive()` needed.
- The `DEFAULT_SESSION_STATE` composition field (`blocks: [], tracks: []`) is preserved.

---

## New behavior to introduce

These map to Phase 05 Acceptance IDs:

1. (A-05-01) Composition tab opens/closes a slide-up drawer with animation identical to code drawer.
2. (A-05-02) Save buttons capture current groove/harmony/session as named `Block` objects in the library with correct type tags.
3. (A-05-03) Block ▶ button previews block code; nowPlaying pill shows block name with source `'block'`.
4. (A-05-04) Block name contenteditable rename updates the timeline reactively.
5. (A-05-05) `+ pista` adds new tracks; `↳ pista` / timeline selector places blocks on tracks as stacked horizontal lanes.
6. (A-05-06) Block width = bars × 48 px; resize grip snaps to whole bars; drag body reorders within track.
7. (A-05-07) Bar ruler shows bar numbers; timeline supports horizontal scroll.
8. (A-05-08) `▶ tocar` builds `stack(arrange([...]))` Strudel code, plays audio, sets `nowPlaying.source = 'composition'`.
9. (A-05-09) Playhead moves in real time; auto-scrolls timeline near scroll edge; active block gets `.playing` glow.
10. (A-05-10) `⏸ pausa` freezes playhead; `▶ tocar` resumes from paused bar; `■ stop` resets to bar 0.
11. (A-05-11) `limpiar todo` clears all tracks (one empty track remains); blocks stay in library.
12. (A-05-12) All A-04 behaviors intact.
13. (A-05-13) Gate commands exit 0.
14. (A-05-14) No `cx`/`cy` pixel coordinates in any `Block.code` string or `Composition` state.

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-05-01 | Composition tab opens/closes drawer with slide animation | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-02 | Save buttons capture current state as named blocks with correct type tag | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-03 | Block ▶ previews block code; nowPlaying source is `'block'` | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-04 | Contenteditable rename updates timeline reactively | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-05 | + pista adds tracks; blocks placed on tracks as stacked lanes | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-06 | Block width = bars × PPB; grip snaps; drag reorders | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-07 | Bar ruler shows numbers; timeline scrolls horizontally | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-08 | ▶ tocar builds correct Strudel code; plays audio; nowPlaying.source = 'composition' | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-09 | Playhead advances in real time; auto-scrolls; active block highlighted | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-10 | Pause freezes playhead; resume from paused bar; stop resets | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-11 | limpiar todo clears tracks (one empty track remains); library intact | live-system | (manual dev run) | 05.3 / 05.4 |
| A-05-12 | All A-04 behaviors intact | live-system | (manual dev run) | 05.4 |
| A-05-13 | tsc/lint/test/build all exit 0 | unit + proxy:static-analysis | `tests/` + tsc/lint | 05.2 / 05.4 |
| A-05-14 | No cx/cy in Block.code or Composition state | proxy:static-analysis | grep of Block type + model.ts | 05.2 |

**Note on test coverage:** All A-05 IDs use `live-system` or `proxy:static-analysis` validation (per phase file). No new Vitest unit tests are required by the phase, though step 05.2 mentions "if time permits" for `addBlock`, `deleteBlock`, `reorderBlockInTrack`. The minimum requirement is no regressions (≥120 tests passing).

---

## Tests to add or modify

- No existing tests to modify (all composition logic is new).
- Optional (time permitting, step 05.2): Vitest unit tests for `addBlock`, `deleteBlock`, `reorderBlockInTrack` in a new `tests/composition.test.ts` or appended to `tests/codegen.test.ts`. These would test the pure store-manipulation logic via `get(sessionStore)` after each call.
- Required: ≥120 tests pass throughout (existing suite must not regress).

---

## Open decisions surfaced

All open decisions for Phase 05 have been resolved by the Pilot before this inventory step:

- **OD-1 (`blkSeq`/`trkSeq` counters):** Resolved — option (a): module-local ephemeral counters in `session.ts`, NOT in sessionStore. IDs regenerate on page reload. Phase 07 persistence will not include counter state.
- **OD-2 (playhead timing state placement):** Resolved — option (a): separate `src/state/composition.ts` module, consistent with `hud.ts` pattern. Ephemeral, not serialized.

**None remaining — proceed to 05.2 after Pilot approval.**

---

## Source-of-truth check

Phase 05 consumes cross-source data in one direction: `session.ts` action functions read from `core/composition/model.ts` (`buildComposition`, `stripComments`) and from `core/codegen/strudel.ts` (`rhythmToStrudel`, `melodyLine`, `buildSession`).

- **Producer:** `src/core/composition/model.ts` — exports `buildComposition(blocks: Block[], tracks: Track[]): string` and `stripComments(code: string): string`. Shape confirmed at lines 47–102.
- **Producer:** `src/core/codegen/strudel.ts` — exports `rhythmToStrudel`, `melodyLine`, `buildSession`. Already imported in `session.ts` lines 37–40. Shape confirmed by Phase 02 and existing usage.
- **Consumer:** new `session.ts` action functions — `addBlock` will call `rhythmToStrudel(state.rhythm.layers)`, `melodyLine(...)`, and `stripComments(buildSession(...))`. The call signatures match existing exports exactly.
- **Shape alignment:** confirmed. No mismatch. `buildComposition` takes `(Block[], Track[])` which are available via `get(sessionStore).composition.blocks` and `get(sessionStore).composition.tracks`.

---

## New dependencies needed

None. Phase 05 uses only:
- `svelte/store` (`get`, `writable`) — already in `package.json`.
- `src/core/composition/model.ts` — already exists.
- `src/core/codegen/strudel.ts` — already imported in `session.ts`.
- `src/audio/strudel.ts` — already used via `getAudio()` lazy loader in `session.ts`.
- Browser APIs: `performance.now()`, `requestAnimationFrame` — no new packages.

---

## Environment, CI, build, or deployment changes needed

None. Phase 05 is pure TypeScript/Svelte additions to existing source. No new environment variables, no CI changes, no new build steps.

---

## Decisions Register check

**Active decision: "Exact dependency version pinning"** — Phase 05 adds no new dependencies, so this decision is trivially respected.

**Active decision: "`Chord.cx/cy` — render hints efímeros, no persistidos"** — explicitly confirmed in state shape audit above. Phase 05 composition blocks never include `cx`/`cy`. `Block.code` is a plain Strudel string with no pixel coordinates.

No vigent Register entries conflict with Phase 05 scope.

---

## Project-specific verification tables

**Contract Verification:** Not applicable — no backend.
**Flag-off request audit:** Not applicable — no feature flags in this phase.
**Fixtures from backend source:** Not applicable.

---

## Prototype parity reference

| Phase 05 artifact | Prototype source lines | Notes |
|---|---|---|
| Composition CSS | 251–314 | All CSS classes ported verbatim to `app.css` |
| `#compTab` + `#compDrawer` HTML structure | 530–574 | Ported to `CompositionDrawer.svelte` |
| `blocks`, `tracks`, `blkSeq`, `trkSeq`, `PPB` | 1931–1934 | Module-level state; counters → `session.ts`; PPB → `composition.ts` |
| `stripComments` | 1936–1938 | Already in `model.ts` |
| `addBlock` | 1939–1946 | `session.ts` new action |
| `tagOf`, `tagClsOf` | 1948–1949 | Local helpers in `CompositionDrawer.svelte` |
| `renderBlocks` (DOM imperative) | 1951–1970 | Replaced by Svelte `{#each}` reactive block |
| `contentBars`, `totalBars`, `gridBars` | 1972–1974 | Local helpers in `CompositionDrawer.svelte` |
| `refreshCompIfPlaying` | 1976–1981 | Equivalent: `playComposition()` re-evaluates if state is playing |
| `renderTimeline` (DOM imperative) | 1983–2052 | Replaced by Svelte reactive template |
| `buildComposition` | 2054–2065 | Already in `model.ts`, no changes |
| `compPos` | 2067–2072 | `composition.ts` new module |
| `compTickLoop` | 2073–2091 | `onMount` rAF loop in `CompositionDrawer.svelte` |
| `playComposition` | 2093–2103 | `session.ts` new action |
| `pauseComposition` | 2104–2110 | `session.ts` new action |
| `stopComposition` | 2112–2115 | `session.ts` new action |
| Event wiring | 2117–2127 | Svelte `on:click` handlers in `CompositionDrawer.svelte` |

---

## Risks specific to this phase

**rAF loop lifecycle:** The `requestAnimationFrame` loop in `CompositionDrawer.svelte` must be cancelled in `onDestroy` to avoid memory leaks. The prototype relies on the page reload to clean up; the Svelte component lifecycle must explicitly cancel via `cancelAnimationFrame(rafId)`.

**Drag/resize pointer capture:** The prototype uses `setPointerCapture`/`releasePointerCapture` with a `try/catch` for browsers that don't support it. The Svelte port must preserve the same guard.

**`addBlockToTrack` semantics discrepancy (noted for step 05.3):** The prototype's `↳ pista` button (line 1962) pushes a NEW track containing the block (`tracks.push({id, blocks:[{blockId, bars}]})`), NOT to the last existing track. The phase spec step 05.3 says "↳ pista → `addBlockToTrack(tracks.length - 1, b.id)` then re-render." This is inconsistent with the prototype. The timeline selector (`onchange` handler, line 2047) adds to an existing track. Step 05.3 will implement prototype-exact behavior: `↳ pista` = add new track with block; selector = add to existing track. If the Planner disagrees during review, this note provides the citation.

---

## Pilot review

The Pilot approves before step 05.2 begins. All open decisions (OD-1, OD-2) were pre-resolved before this inventory step.

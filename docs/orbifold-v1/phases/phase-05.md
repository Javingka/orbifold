# Phase 05 — Composition (DAW Timeline)

**Purpose:** Add the DAW-style composition drawer: a block library with save actions (groove/harmony/session), a multi-track timeline with bar-width blocks, drag-to-reorder, resize grip, horizontal scroll, a bar ruler, a moving playhead, and composition play/pause/stop transport wired to Strudel's `arrange()`/`stack()` codegen.
**Gate:** Phase 04 is complete and Pilot-approved (`tsc --noEmit` 0, `pnpm lint` 0, ≥120 tests pass, `pnpm build` 0; all 14 A-04 acceptance IDs covered by live-system evidence; the full Svelte UI layer is operational; `core/composition/model.ts` and `buildComposition` already exist).
**Expected phase result:** The developer can open the composition drawer, save the current groove/harmony/session as named blocks, arrange them on a multi-track timeline, press ▶ tocar, watch the playhead advance over the blocks in real time, hear the correct Strudel arrangement play, and press ⏸ / ■ stop; `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥120 passing), and `pnpm build` all exit 0.

---

## Step 05.1 — Inventory

PROMPT → Read `CLAUDE.md`, `~/.claude/skills/pilot-machine/references/methodology.md`, `~/.claude/skills/pilot-machine/references/dev-role.md`, `~/.claude/skills/pilot-machine/references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `ORBIFOLD_KICKOFF.md §4 (file tree), §5 (data model), §6 (guardrails)`. Then read `reference/orbifold.html` lines 251–314 (CSS: composition drawer, `.timeline`, `.tl-*`, `.blk`, `.tl-playhead`), lines 530–574 (HTML: `#compTab`, `#compDrawer`, block list, timeline structure, transport buttons), lines 1927–2127 (JS: `blocks`, `tracks`, `addBlock`, `renderBlocks`, `renderTimeline`, `buildComposition`, `compPos`, `compTickLoop`, `playComposition`, `pauseComposition`, `stopComposition`, `refreshCompIfPlaying`, event wiring). Read `src/state/session.ts` in full. Read `src/core/composition/model.ts` in full. List `src/ui/` directory. Read `src/app/App.svelte` (structure and imports only, first 80 lines). Produce `docs/orbifold-v1/inventories/phase-05-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after committing the inventory file.

The inventory must address:

**State shape audit.** Confirm that `SessionState.composition: Composition` (with `blocks: Block[]` and `tracks: Track[]`) is already typed in `session.ts` and `model.ts`. Identify all fields of `Block` and `Track` that will be mutated by Phase 05 (no new fields expected, but confirm). `Chord.cx/cy` MUST NOT appear in any composition field — confirm.

**New session actions needed.** Identify which `session.ts` exports Phase 05 requires that do not yet exist:
- `addBlock(type: 'groove'|'armonia'|'sesion'): void` — captures current engine state into `composition.blocks`, increments an internal counter. Confirm prototype line references (lines 1939–1946).
- `deleteBlock(blockId: string): void` — removes block from library and removes all track references.
- `renameBlock(blockId: string, name: string): void` — updates block name in store.
- `playBlock(blockId: string): Promise<void>` — preview a single block's code via `runNow`, sets `nowPlaying` to `'block'` source (prototype line 1961).
- `addTrack(): void` — pushes a new empty track.
- `removeTrack(trackIndex: number): void` — removes track by index; re-adds one empty track if that was the last.
- `addBlockToTrack(trackIndex: number, blockId: string): void` — pushes `{blockId, bars: block.bars}` to track.
- `removeBlockFromTrack(trackIndex: number, refIndex: number): void` — removes a block reference from a track.
- `setBlockBars(trackIndex: number, refIndex: number, bars: number): void` — updates bar count for a positioned block.
- `reorderBlockInTrack(trackIndex: number, fromIndex: number, toIndex: number): void` — splices the ref to a new position.
- `playComposition(): Promise<void>` — builds the Strudel composition string, calls `runNow`, sets `nowPlaying` to `'composition'`; stores `compStart` timestamp in module-level state.
- `pauseComposition(): void` — saves `compPausedBars`, calls `hush()`, sets nowPlaying label.
- `stopComposition(): void` — calls `hush()`, clears `nowPlaying`.
- `resumeFromPause(): void` — or folded into `playComposition` (re-uses pause position if state is paused).
- Confirm: `buildComposition(blocks, tracks)` is already exported from `core/composition/model.ts` and requires no changes.

**New source files.** Determine which new files Phase 05 creates:
- `src/ui/CompositionDrawer.svelte` — the slide-up drawer (ports `#compDrawer`). Two-column grid: block library (save + list) and timeline.
- `src/state/composition.ts` — module-level playhead timing state (`compStart`, `compPausedBars`, `compState: 'stopped'|'playing'|'paused'`), `compPos()`, `compCode()` (derived string from store). This state is NOT in the Svelte store — it is playhead timing state analogous to `hud.ts` (ephemeral, non-serialized). Flag as Register candidate.
- Whether `blockSeq` / `trackSeq` counters should live in the store (as part of `Composition`) or in `composition.ts`. The prototype uses module-level `blkSeq`/`trkSeq` (lines 1933). Flag as open decision if the choice has persistence implications.

**CSS strategy.** Confirm all required `.timeline`, `.tl-*`, `.blk`, `#compTab`, `#compDrawer` CSS is added to `src/app/app.css` (do NOT add scoped styles in the Svelte component for layout tokens that belong in the global token set). Prototype source: lines 251–314.

**Composition transport in `nowPlaying`.** The `NowPlaying.source` type already includes `'composition'` (session.ts line 121). Confirm `'block'` is also already covered or must be added.

**Playhead timing.** Document the `compPos()` formula: `barsElapsed = ((performance.now() - compStart) / 1000) * (bpm / 240)`. Bars-per-second = bpm/240 (because 1 Strudel cycle = 1 bar of 4/4 = 240 BPM units). The prototype uses this exact formula (lines 2069–2072). Confirm the formula against the `setcps(bpm/240)` invariant in CLAUDE.md.

**Auto-scroll.** The prototype auto-scrolls `#tlScroll` when the playhead position is within 30 px of the scroll edge (prototype line 2081). Document the behavior and whether it uses `scrollLeft` directly on the scroll container element.

**Register check.** Confirm no vigent decision is violated by Phase 05 scope. The `Chord.cx/cy` ephemeral decision explicitly targets Phase 05 — verify composition blocks never include `cx`/`cy`.

**Open decisions.** Surface any open decisions the Pilot must resolve before step 05.2:
- `blkSeq`/`trkSeq` counters: stored in Svelte store (persisted) or in `composition.ts` (ephemeral)? Affects Phase 07 session persistence (if counters are in the store, old IDs survive reload; if not, new IDs are generated on load). Flag this explicitly.
- `composition.ts` vs. inline in `session.ts`: should playhead timing state be a new module or inlined? Flag as Register candidate for the same reason as `hud.ts`.

Implementation requirements:
- Inventory file format follows `inventory-template.md` exactly.
- No source code written.

Validation:
- `docs/orbifold-v1/inventories/phase-05-inventory.md` exists and is committed.

Expected result:
- Inventory maps every component, every prototype source range, every session.ts action needed, every open decision — enabling Pilot to resolve open decisions before step 05.2.

CHECKPOINT → Commit message:
`docs(orbifold-v1): Phase 05 step 05.1 — inventory`

---

## Step 05.2 — Composition CSS tokens and `session.ts` composition actions

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `docs/orbifold-v1/inventories/phase-05-inventory.md`, `docs/orbifold-v1/handoffs/phase-05-handoff.md` (step 05.1 entry). Read `reference/orbifold.html` lines 251–314 (composition CSS). Read `src/app/app.css` to confirm the current global token set. Read `src/state/session.ts` in full. Read `src/core/composition/model.ts` in full.

Implementation requirements:

**`src/app/app.css` additions** (append after existing rules; do not modify existing rules):
- `#compTab` CSS (prototype lines 252–254): fixed bottom-right of `#codeTab`, accent border, uppercase label.
- `#compDrawer` CSS (prototype lines 255–257): `position:fixed; left:12px; right:12px; bottom:0; z-index:10; border-radius:18px 18px 0 0; transform:translateY(108%); transition:transform .4s cubic-bezier(.22,1,.36,1); padding:14px 16px 16px; max-height:74vh; overflow:auto`. `.open` state: `translateY(0)`.
- `.comp-grid`, `.comp-col`, `.comp-col h4`, `.comp-col .sub`, `.save-row` (prototype lines 258–261).
- `.blk`, `.blk .tag`, `.blk .tag.groove`, `.blk .tag.armonia`, `.blk .tag.sesion`, `.blk .nm`, `.blk .mini`, `.blk button` (prototype lines 262–273).
- `.arr-empty` (prototype line 274).
- `.timeline`, `.tl-heads`, `.tl-head-ruler`, `.tl-head`, `.tl-head .tname`, `.tl-head button` (prototype lines 277–285).
- `.tl-scroll`, `.tl-inner`, `.tl-ruler`, `.tl-ruler .bar-num`, `.tl-lane` (prototype lines 286–292).
- `.tl-block`, `.tl-block .bn`, `.tl-block .bb`, `.tl-block .bb input`, `.tl-block .bx`, `.tl-block .grip` (prototype lines 293–303).
- `.tl-block.groove`, `.tl-block.armonia`, `.tl-block.sesion`, `.tl-block.playing` (prototype lines 304–307).
- `.tl-add`, `.tl-add select`, `.tl-empty` (prototype lines 308–314).
- `.tl-playhead`, `.tl-playhead.on` (prototype lines 311–313).

**`src/state/composition.ts`** — new file:
- AGPL-3.0 header.
- Module-level timing state: `compState: 'stopped' | 'playing' | 'paused'`, `compStart: number` (performance.now timestamp), `compPausedBars: number`.
- `compPos(bpm: number): { tb: number; pos: number }` — computes playhead position using prototype formula (lines 2067–2072): `barsElapsed = ((performance.now() - compStart) / 1000) * (bpm / 240)`. Wraps `pos` modulo `totalBars`. When `compState === 'paused'` returns `compPausedBars` as `pos`.
- Exported getters/setters: `getCompState()`, `setCompPlaying(start: number)`, `setCompPaused(bars: number)`, `setCompStopped()`.
- `PPB: number` constant (pixels per bar = 48, prototype line 1934). Export this for `CompositionDrawer.svelte`.
- No Svelte store import (ephemeral, not serialized).

**`src/state/session.ts` additions:**
- `addBlock(type: 'groove' | 'armonia' | 'sesion'): void` — reads current rhythm/harmony/session code via `rhythmCode`/`harmonyCode`/`sessionCode`, strips comments via `stripComments` (from `core/composition/model.ts`), generates a default name (`'Groove N'`, `'Armonía N'`, `'Sesión N'`), pushes `Block` to `composition.blocks`. Uses a module-level `_blkSeq` counter (not in store). Cite prototype lines 1939–1946.
- `deleteBlock(blockId: string): void` — removes block from `composition.blocks`; removes all track refs with that `blockId`. Cite prototype lines 1963–1966.
- `renameBlock(blockId: string, name: string): void` — updates `.name` on the matching block. Cite prototype `.nm contenteditable` handler (line 1960).
- `playBlockById(blockId: string): Promise<void>` — previews block code via `runNow`, sets `nowPlaying` to `{ label: 'Bloque · ' + block.name, source: 'block' }`. Cite prototype line 1961.
- `addTrack(): void` — pushes `{ id: 't' + _trkSeq++, blocks: [] }`. Cite prototype line 2120.
- `removeTrack(trackIndex: number): void` — splices track; re-adds empty if last. Cite prototype lines 2000.
- `addBlockToTrack(trackIndex: number, blockId: string): void` — finds block, pushes `{blockId, bars: block.bars}`. Cite prototype lines 1962.
- `removeBlockFromTrack(trackIndex: number, refIndex: number): void`. Cite prototype lines 2015.
- `setBlockBars(trackIndex: number, refIndex: number, bars: number): void` — updates ref.bars clamped to [1, 64]. Cite prototype lines 2017.
- `reorderBlockInTrack(trackIndex: number, fromIndex: number, toIndex: number): void`. Cite prototype lines 2036–2037.
- `playComposition(): Promise<void>` — calls `buildComposition(blocks, tracks)`, calls `runNow`, sets `nowPlaying` to `{ label: 'Composición', source: 'composition' }`, calls `setCompPlaying(performance.now())` from `composition.ts`. Handles resume-from-pause: if `getCompState() === 'paused'`, adjusts `compStart` by subtracting `compPausedBars * (240000 / bpm)`. Cite prototype lines 2093–2103.
- `pauseComposition(): void` — reads `compPos(bpm).pos`, calls `setCompPaused(pos)`, calls `hush()`, updates `nowPlaying.label` to `'Composición · pausa'`. Cite prototype lines 2104–2110.
- `stopComposition(): void` — calls `hush()`, `setCompStopped()`, `setNowPlaying(null, null)`. Cite prototype lines 2112–2115.
- Add `'block'` to `NowPlaying['source']` union in `SessionState` if not present (check current session.ts).
- All new functions must have JSDoc citing prototype line ranges.

Prototype parity: all new `session.ts` functions must cite prototype line ranges in their JSDoc.

Do NOT write `CompositionDrawer.svelte` yet (that is step 05.3).
Do NOT touch any render scene files.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥120 tests pass (existing tests must not regress; new unit tests for `addBlock`, `deleteBlock`, `reorderBlockInTrack` if time permits — minimum: no regressions).
- Visual check: `pnpm dev` — app renders as before (no new visible UI yet; CSS additions are inert without the drawer HTML).

Expected result:
- `src/app/app.css` has all composition CSS tokens.
- `src/state/composition.ts` exports timing state helpers.
- `src/state/session.ts` exports all composition action functions.
- All gate commands pass.

CHECKPOINT → Commit message:
`feat(composition): Phase 05 step 05.2 — composition CSS tokens, timing state, and session.ts composition actions`

---

## Step 05.3 — `CompositionDrawer.svelte` (block library + timeline)

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `docs/orbifold-v1/inventories/phase-05-inventory.md`, `docs/orbifold-v1/handoffs/phase-05-handoff.md` (steps 05.1–05.2 entries). Read `reference/orbifold.html` lines 530–574 (HTML: composition drawer structure), lines 1927–2127 (JS: all composition logic). Read `src/state/session.ts` (composition action exports). Read `src/state/composition.ts`. Read `src/app/App.svelte`.

Implementation requirements:

**`src/ui/CompositionDrawer.svelte`** — ports `#compTab` + `#compDrawer` (prototype lines 530–574, CSS lines 251–314, JS lines 1927–2127):

Tab button `#compTab.glass`:
- `position:fixed; bottom:14px; left:calc(50% + 130px); transform:translateX(-50%); z-index:8` — offset to the right of the code drawer tab (prototype CSS line 252).
- Label: `🎚 composición`. Accent color and border per prototype CSS lines 252–254.
- On click: open drawer, call initial `renderTimeline` equivalent (reactive Svelte; no explicit render call needed).

Drawer `#compDrawer.glass`:
- Slides up with `.open` class (same mechanism as `CodeDrawer.svelte`).
- Two-column `.comp-grid` layout: column 1 (block library) + column 2 (timeline).

Block library column (`.comp-col`):
- "1 · guardar bloques" header.
- Save row: three `.tbtn` buttons — `💾 groove actual` → `addBlock('groove')`, `💾 armonía actual` → `addBlock('armonia')`, `💾 sesión actual` → `addBlock('sesion')`. Cite prototype lines 1939–1946.
- Block list: `{#each $sessionStore.composition.blocks as b}` — each block renders as `.blk`:
  - Tag span `.tag.{typeClass}` with label text (`ritmo`/`armonía`/`sesión`).
  - Name: `<span class="nm" contenteditable="true">` with `on:input` → `renameBlock(b.id, e.target.textContent)`. Cite prototype line 1960.
  - Mini code preview: `.mini` showing first 60 chars of `b.code` with newlines replaced by spaces.
  - Buttons: `▶` → `playBlockById(b.id)` (cite line 1961); `↳ pista` → `addBlockToTrack(tracks.length - 1, b.id)` then re-render (cite line 1962); `🗑` → `deleteBlock(b.id)` (cite lines 1963–1966).
- Empty state: `.arr-empty` text when no blocks.

Timeline column (`.comp-col`):
- Header with "2 · línea de tiempo" and hint text and `+ pista` → `addTrack()` button (cite line 2120).
- `.timeline#timeline` grid (two columns: 120 px heads + 1fr scroll).
- Track heads column `.tl-heads`:
  - `.tl-head-ruler` (20 px empty spacer for ruler alignment).
  - For each track: `.tl-head` with `pista N` label and `🗑` delete button → `removeTrack(i)` (cite line 2000).
- Scroll column `.tl-scroll → .tl-inner`:
  - CSS custom property `--ppb: 48px` set on `.tl-inner` via inline `style`.
  - `.tl-ruler` with bar number spans (1 through `gridBars()`) at `left: (s * PPB)px`.
  - For each track: `.tl-lane` containing positioned `.tl-block` elements:
    - Block: `position:absolute; left: (startBar * PPB)px; width: (ref.bars * PPB - 2)px`. Class `.tl-block.{typeClass}`.
    - `.bx ✕` — `removeBlockFromTrack(ti, refIndex)`. Cite line 2015.
    - `.bn` — block name.
    - `.bb` — bar count `<input type="number">` → `setBlockBars(ti, refIndex, value)`. `on:pointerdown` stops propagation. Cite lines 2017–2019.
    - `.grip` — resize handle: `pointerdown/pointermove/pointerup` with snap-to-bar: `ref.bars = clamp(1, 64, rb + round((clientX - rx) / PPB))`. On `pointerup` call `setBlockBars`. Cite prototype lines 2021–2024.
    - Body drag (reorder within track): `pointerdown/pointermove/pointerup` translates the element visually, on `pointerup` computes target index and calls `reorderBlockInTrack`. Cite prototype lines 2026–2038.
  - `.tl-add` drop-zone at `left: (trackContentBars * PPB + 4)px` — `<select>` listing all blocks; `on:change` → `addBlockToTrack(ti, selectedId)`. Falls back to "guarda bloques arriba" when no blocks. Cite prototype lines 2043–2047.
  - `.tl-playhead` — `position:absolute; top:0; bottom:0; width:2px`. Visible (`.on` class) and `left` driven reactively by the `rAF` playhead loop (see below).
- `compInfo` span — shows track/bar count or current playback position. Cite prototype line 2051 / 2085.

Transport buttons:
- `▶ tocar` → `playComposition()`; `⏸ pausa` → `pauseComposition()`; `■ stop` → `stopComposition()`; `limpiar todo` → clears via `sessionStore.update(...)`. Cite prototype lines 2117–2124.

Playhead `rAF` loop (`compTickLoop` equivalent):
- `onMount`: start `requestAnimationFrame` loop bound to a local `let rafId`.
- `onDestroy`: cancel loop.
- Each frame: if `open` and `getCompState() !== 'stopped'`, call `compPos(bpm)` from `composition.ts`, set reactive `playheadLeft` and `playheadOn` variables. Auto-scroll: if `playheadLeft < scrollEl.scrollLeft + 30` or `playheadLeft > scrollEl.scrollLeft + scrollEl.clientWidth - 30`, update `scrollEl.scrollLeft`. Highlight `.playing` class on the active block in each track (use reactive variables rather than direct DOM classList manipulation). Cite prototype lines 2073–2091.
- Loop terminates when drawer is closed (`open === false`).

Close button `✕` — closes drawer, cancels rAF. Cite prototype line 2126.

Helper functions (local to the component, not exported):
- `gridBars(): number` — `Math.max(totalBarsValue + 4, 16)`. Cite prototype line 1974.
- `tagClsOf(b: Block): string` — `'groove'|'armonia'|'sesion'`. Cite prototype line 1949.
- `tagOf(b: Block): string` — `'ritmo'|'armonía'|'sesión'`. Cite prototype line 1948.

Import all session actions from `session.ts`. Import `PPB`, `compPos`, `getCompState` from `composition.ts`.

**`src/app/App.svelte`** — add `import CompositionDrawer from '../ui/CompositionDrawer.svelte'` and `<CompositionDrawer />` after `<CodeDrawer />`.

Do NOT touch any render scene files.

Prototype parity notes in handoff: cite all prototype line ranges for block library, timeline rendering, playhead loop, drag/resize, and transport.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥120 tests pass.
- `pnpm dev` — `🎚 composición` tab appears at bottom-center-right; clicking opens the drawer; save buttons capture current state as blocks; blocks appear in the list with correct type tags; `↳ pista` button adds a block to the timeline; the timeline renders lanes with positioned blocks; resize grip changes block width; drag reorders blocks in the track; `▶ tocar` plays composition audio and now-playing pill shows "Composición"; playhead advances; `⏸` pauses; `■ stop` stops.

Expected result:
- `src/ui/CompositionDrawer.svelte` created and imported in `App.svelte`.
- All gate commands pass.

CHECKPOINT → Commit message:
`feat(composition): Phase 05 step 05.3 — CompositionDrawer (block library + timeline)`

---

## Step 05.4 — Operability verification

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `docs/orbifold-v1/handoffs/phase-05-handoff.md` (all prior step entries). Run all gate commands. Record exact output in the handoff. Then perform the composition smoke test below.

Implementation requirements:
- Run all gate commands and record exact output.
- Execute the 10-point composition smoke test in `pnpm dev`:
  1. `🎚 composición` tab is visible at bottom-center-right of the screen; it has accent color and an accent border matching the prototype.
  2. Clicking the tab opens the drawer (slides up from bottom); clicking `✕` closes it.
  3. With a groove loaded (add at least one Euclidean orbit in rhythm view), click `💾 groove actual` → a "Groove 1" block appears in the library with a `ritmo` tag.
  4. With two chords picked in the Tonnetz, click `💾 armonía actual` → "Armonía 2" block appears with `armonía` tag.
  5. Click `▶` on a block → audio plays and now-playing pill shows the block name.
  6. Click `↳ pista` on two different blocks → both appear as lane blocks in the timeline on separate tracks (one per click adds to last track; confirm by adding a new track first via `+ pista` then adding to that track).
  7. Drag the right grip of a block → block width changes to reflect new bar count; the `input[type=number]` readout updates.
  8. Click `▶ tocar` → composition audio plays; now-playing pill shows "Composición"; playhead advances over the lanes; active block is highlighted with the `.playing` glow.
  9. Playhead auto-scrolls the timeline when it reaches the right edge.
  10. `⏸ pausa` stops audio and freezes playhead; `▶ tocar` resumes from the paused bar; `■ stop` resets playhead to zero and clears the now-playing pill.
- Confirm A-04-13 equivalent: all prior UI behaviors (Tonnetz, transport, BPM, chips, code drawer, HUD, tooltip) are still fully operational after the composition drawer is added.
- Any defect found must be fixed and re-verified in this step.

Validation:
- All 10 smoke-test items pass.
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥120 tests pass.
- `pnpm build` — 0 errors.

Expected result:
- Handoff records gate command output and smoke-test pass/fail for all 10 items.
- All gate commands exit 0.

CHECKPOINT → Commit message:
`feat(composition): Phase 05 step 05.4 — operability verification and phase-05 completion handoff`

---

## Phase Acceptance

- **A-05-01** — The composition tab (`🎚 composición`) opens the drawer; the drawer slides up and down with the same animation as the code drawer.
  - Validation method: `live-system`
- **A-05-02** — The user can save the current groove as a "Groove N" block, the current harmony as an "Armonía N" block, and the current session as a "Sesión N" block; saved blocks appear in the library with the correct type tag (ritmo / armonía / sesión) and a code preview.
  - Validation method: `live-system`
- **A-05-03** — The user can preview a saved block by clicking `▶`; the now-playing pill shows the block name and source is `'block'`.
  - Validation method: `live-system`
- **A-05-04** — The user can rename a block in place (contenteditable span); the timeline updates the block name reactively.
  - Validation method: `live-system`
- **A-05-05** — The user can add new tracks (`+ pista`) and place blocks from the library onto any track; multiple tracks are shown as stacked horizontal lanes.
  - Validation method: `live-system`
- **A-05-06** — Block width represents bars (48 px per bar per `PPB` constant); resizing the grip snaps to whole bars and updates the bar count input; dragging the block body reorders it within the track.
  - Validation method: `live-system`
- **A-05-07** — The bar ruler shows bar numbers at correct positions; the timeline supports horizontal scroll for compositions longer than the visible area.
  - Validation method: `live-system`
- **A-05-08** — `▶ tocar` generates the correct Strudel `stack(arrange([...]), …)` code (verified via code drawer showing the composition string), plays audio, and sets `nowPlaying.source` to `'composition'`.
  - Validation method: `live-system`
- **A-05-09** — The playhead moves in real time as the composition plays; it auto-scrolls the timeline when near the scroll edge; the active block is highlighted with the `.playing` glow.
  - Validation method: `live-system`
- **A-05-10** — `⏸ pausa` stops audio and freezes the playhead at the current bar; `▶ tocar` resumes from the paused bar; `■ stop` resets to bar 0 and clears `nowPlaying`.
  - Validation method: `live-system`
- **A-05-11** — `limpiar todo` clears all tracks (one empty track remains); blocks remain in the library.
  - Validation method: `live-system`
- **A-05-12** — All A-04 acceptance IDs remain covered after the composition drawer is added.
  - Validation method: `live-system`
- **A-05-13** — Gate commands: `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥120 passing), `pnpm build` all exit 0.
  - Validation method: `unit` (test count) + `proxy:static-analysis` (tsc/lint/build output)
- **A-05-14** — `Chord.cx/cy` fields do not appear in any `Block` code string or `Composition` serialized state (the composition uses only musical identity — rootPc, qual, gain, steps — not pixel coordinates).
  - Validation method: `proxy:static-analysis` (grep of generated Block.code values for `cx`/`cy` keys; also confirmed by `model.ts` type definition)

## Partial coverage from prior phase

No prior partials to address. Phase 04 coverage summary showed all 14 A-04 IDs as `covered`. No Phase 04 "partial" or "not covered" entries remain open.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Composition timing state placement** — Trigger: step 05.2, when creating `src/state/composition.ts` (or inlining into `session.ts`). If a dedicated module is created, records the pattern (one timing module per ephemeral concern, consistent with `hud.ts`) and its exclusion from Phase 07 persistence scope.
- **`blkSeq`/`trkSeq` counters: store vs. module-level** — Trigger: step 05.2 inventory resolution. Records whether block/track ID counters are included in the Svelte store (persisted in Phase 07) or kept as ephemeral module-level counters (IDs regenerate on load). Affects Phase 07 session persistence design.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-05-handoff.md`. See `handoff-template.md`.

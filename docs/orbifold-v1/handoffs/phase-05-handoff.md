# Phase 05 Handoff — Composition (DAW Timeline)

---

## Step 05.1 — Inventory

**Date:** 2026-06-08
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `references/methodology.md`, `references/dev-role.md`, `references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `ORBIFOLD_KICKOFF.md` §4/§5/§6.
- Read prototype lines 251–314, 530–574, 1927–2127.
- Read `src/state/session.ts`, `src/core/composition/model.ts`, `src/ui/` directory, `src/app/App.svelte` (structure).
- Produced `docs/orbifold-v1/inventories/phase-05-inventory.md` following inventory template exactly.
- No source code written.

### Files touched

- `docs/orbifold-v1/inventories/phase-05-inventory.md` — created
- `docs/orbifold-v1/handoffs/phase-05-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — no source changes).

### Decisions made (if any)

None. All open decisions (OD-1, OD-2) were pre-resolved by the Pilot before this step.

### Proposed Decisions Register entries (if any)

None surfaced in this inventory that aren't already resolved or registered.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Source code unchanged from Phase 04 completion state.
- `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` remain at Phase 04 passing state.
- Branch: `main`.

### Next-step context (only if non-obvious)

- **`'block'` source union:** `NowPlaying.source` in `session.ts` does not yet include `'block'`. Step 05.2 must add it for A-05-03 compliance.
- **`addBlockToTrack` vs. prototype `↳ pista` discrepancy:** The prototype's `↳ pista` button creates a new track (line 1962), not adds to the last track. The phase spec step 05.3 says otherwise. The inventory flags this; step 05.3 should implement prototype-exact behavior for `↳ pista` and use `addBlockToTrack` only for the timeline `<select>` selector (line 2047). Planner review will adjudicate.
- **`compPos` signature:** The module `composition.ts` will need `totalBars` passed in by the caller since `Block[]`/`Track[]` live in the Svelte store, not in the module. `CompositionDrawer.svelte` will derive `totalBars` reactively and pass it to `compPos`.

### Planner Review

**Decision:** APPROVED
**Reviewed on:** 2026-06-08
**Iteration:** 1 of 5
**Reason:** Inventory is complete and follows the template exactly — all 14 A-05 IDs are mapped, both active Register entries are explicitly verified, no source code was written, OD-1/OD-2 are confirmed pre-resolved, and the three non-obvious downstream dependencies (`'block'` union gap, `↳ pista` prototype discrepancy, `compPos` signature) are clearly surfaced for Pilot resolution at checkpoint 1.
**Next action:** Pilot checkpoint 1 — Pilot reviews inventory and confirms OD resolutions and the `↳ pista` behavior (prototype line 1962: creates new track; step 05.3 spec says otherwise) before step 05.2

---

## Step 05.2 — Composition CSS tokens and `session.ts` composition actions

**Date:** 2026-06-08
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `docs/orbifold-v1/inventories/phase-05-inventory.md`, `docs/orbifold-v1/handoffs/phase-05-handoff.md` (step 05.1), `reference/orbifold.html` lines 251–314, `src/app/app.css`, `src/state/session.ts`, `src/core/composition/model.ts`.
- Appended all composition CSS tokens to `src/app/app.css` (prototype lines 251–314): `#compTab`, `#compDrawer`, `.open`, `.comp-grid`, `.comp-col`, `.save-row`, `.blk` family, `.arr-empty`, `.timeline`, `.tl-heads`, `.tl-head-ruler`, `.tl-head`, `.tl-scroll`, `.tl-inner`, `.tl-ruler`, `.tl-lane`, `.tl-block` family, `.tl-add`, `.tl-playhead`, `.tl-empty`.
- Created `src/state/composition.ts` with: `PPB=48` constant, `_compState`/`_compStart`/`_compPausedBars` module-level state, `compPos(bpm, totalBars)`, `getCompState()`, `getCompPausedBars()`, `setCompPlaying(start)`, `setCompPaused(bars)`, `setCompStopped()`.
- Added `'block'` to `NowPlaying.source` union in `session.ts` (required for A-05-03).
- Added module-level `_blkSeq` / `_trkSeq` counters (OD-1: ephemeral, not in store).
- Added imports: `stripComments`, `buildComposition` from `core/composition/model.ts`; `getCompState`, `getCompPausedBars`, `setCompPlaying`, `setCompPaused`, `setCompStopped`, `compPos` from `./composition.ts`.
- Added 13 composition action functions to `session.ts`:
  - `addBlock(type)` — prototype lines 1939–1946
  - `deleteBlock(blockId)` — prototype lines 1963–1966
  - `renameBlock(blockId, name)` — prototype line 1960
  - `playBlockById(blockId)` — prototype line 1961
  - `addTrack()` — prototype line 2120
  - `removeTrack(trackIndex)` — prototype line 2000
  - `addBlockToTrack(trackIndex, blockId)` — prototype line 2047 (selector behavior)
  - `addBlockAsNewTrack(blockId)` — prototype line 1962 (`↳ pista` exact behavior: new track with block — Pilot-confirmed)
  - `removeBlockFromTrack(trackIndex, refIndex)` — prototype line 2015
  - `setBlockBars(trackIndex, refIndex, bars)` — prototype lines 2017–2018
  - `reorderBlockInTrack(trackIndex, fromIndex, toIndex)` — prototype lines 2036–2037
  - `playComposition()` — prototype lines 2093–2103
  - `pauseComposition()` — prototype lines 2104–2110
  - `stopComposition()` — prototype lines 2112–2115

### Files touched

- `src/app/app.css` — appended composition CSS token set (prototype lines 251–314)
- `src/state/composition.ts` — created (new ephemeral timing module, OD-2 pattern)
- `src/state/session.ts` — added `'block'` to union, imports, `_blkSeq`/`_trkSeq` counters, 13 action functions
- `docs/orbifold-v1/handoffs/phase-05-handoff.md` — this entry

### Prototype parity

| Action | Prototype lines | Fidelity notes |
|---|---|---|
| All composition CSS | 251–314 | Ported verbatim; reformatted to CSS property-per-line for Prettier |
| `PPB = 48` | 1934 | Exact constant value |
| `compPos` formula | 2067–2072 | `barsElapsed = ((perf.now - compStart) / 1000) * (bpm/240)`, wraps `% totalBars`; paused returns `compPausedBars % totalBars`; stopped returns 0 |
| `addBlock` | 1939–1946 | Reads `rhythmCode`/`harmonyCode`/`sessionCode`, strips comments, generates `'b' + _blkSeq++` id, default name, bars=4 |
| `deleteBlock` | 1963–1966 | Removes from `blocks` array, removes all track refs with matching `blockId` |
| `renameBlock` | 1960 | Updates `block.name` in store |
| `playBlockById` | 1961 | `runNow(block.code)`, `setNowPlaying('Bloque · ' + name, 'block')` |
| `addTrack` | 2120 | Pushes `{id: 't' + _trkSeq++, blocks: []}` |
| `removeTrack` | 2000 | Splices track; re-adds one empty track if last |
| `addBlockToTrack` | 2047 | Adds ref to existing track (selector behavior) |
| `addBlockAsNewTrack` | 1962 | Creates new track pre-populated with block (Pilot-confirmed `↳ pista` exact behavior) |
| `removeBlockFromTrack` | 2015 | Filters out ref at `refIndex` |
| `setBlockBars` | 2017–2018 | Clamp [1,64], updates `ref.bars` |
| `reorderBlockInTrack` | 2036–2037 | Splice-out + splice-in with `dest--` adjustment when `dest > fromIndex` |
| `playComposition` | 2093–2103 | `buildComposition`→`runNow`; resume: `start = now - pausedBars*(240000/bpm)` using `getCompPausedBars()` directly |
| `pauseComposition` | 2104–2110 | Guards on `'playing'`, computes `totalBars` inline, `compPos(bpm,tb).pos`, `setCompPaused`, `hush()`, label update |
| `stopComposition` | 2112–2115 | `hush()`, `setCompStopped()`, `setNowPlaying(null,null)` |

### `compPos` signature note

The inventory flagged that `compPos` needs `totalBars` passed in by the caller (since `Block[]`/`Track[]` are in the Svelte store). The implementation uses `compPos(bpm: number, totalBars: number)`. In `pauseComposition` the function computes `totalBars` inline before calling. In `playComposition` the paused-bar position is retrieved directly via `getCompPausedBars()` (matching the prototype's use of the module-level variable).

### `↳ pista` behavior

The Pilot pre-resolved this: `↳ pista` creates a NEW track containing the block (prototype line 1962 exact behavior). The new function is `addBlockAsNewTrack(blockId)`. `addBlockToTrack(trackIndex, blockId)` is for the timeline `<select>` selector only. Both are exported for step 05.3.

### Validation evidence

- `pnpm exec tsc --noEmit` — 0 errors (clean output)
- `pnpm lint` — 0 errors, all files use Prettier code style
- `pnpm test` — 120 tests pass (5 test files: voice-leading, euclid, codegen, tonnetz, session — no regressions)
- CSS additions are inert without `CompositionDrawer.svelte` — app renders identically to Phase 04 completion state.

### Acceptance Coverage Table

| Acceptance ID | Behavior | Coverage status | Evidence |
|---|---|---|---|
| A-05-01 | Composition tab opens/closes drawer | not yet covered | Step 05.3 (drawer not yet created) |
| A-05-02 | Save buttons capture current state as named blocks | partially covered | `addBlock()` action implemented and exported; integration test in 05.3/05.4 |
| A-05-03 | Block ▶ previews; nowPlaying source is `'block'` | partially covered | `playBlockById()` implemented; `'block'` added to union; integration in 05.3/05.4 |
| A-05-04 | Contenteditable rename updates timeline | partially covered | `renameBlock()` action implemented; UI wiring in 05.3 |
| A-05-05 | + pista adds tracks; blocks on tracks as stacked lanes | partially covered | `addTrack()`, `addBlockAsNewTrack()`, `addBlockToTrack()` implemented; UI in 05.3 |
| A-05-06 | Block width = bars × PPB; grip snaps; drag reorders | partially covered | `setBlockBars()`, `reorderBlockInTrack()` implemented; `PPB=48` exported; UI in 05.3 |
| A-05-07 | Bar ruler shows numbers; timeline scrolls horizontally | not yet covered | CSS present; UI template in 05.3 |
| A-05-08 | ▶ tocar builds correct Strudel code; nowPlaying.source='composition' | partially covered | `playComposition()` uses `buildComposition()`; integration in 05.3/05.4 |
| A-05-09 | Playhead advances; auto-scrolls; active block highlighted | partially covered | `compPos()` timing module ready; rAF loop in 05.3 |
| A-05-10 | Pause freezes playhead; resume from paused bar; stop resets | partially covered | `pauseComposition()`, `stopComposition()` implemented; integration in 05.3/05.4 |
| A-05-11 | limpiar todo clears tracks; library intact | not yet covered | Action in 05.3 (store update inline) |
| A-05-12 | All A-04 behaviors intact | covered | 120 tests pass; no regressions in existing code |
| A-05-13 | tsc/lint/test/build all exit 0 | partially covered | tsc 0, lint 0, test 120 pass; build verified in 05.4 |
| A-05-14 | No cx/cy in Block.code or Composition state | covered | `addBlock` uses `rhythmCode`/`harmonyCode`/`sessionCode` → `Block.code` is a pure Strudel string; `Block` type has no pixel coordinate fields |

### Decisions made (if any)

None. All decisions (OD-1, OD-2, `↳ pista` behavior) were pre-resolved by the Pilot.

**ADR trigger:** `composition.ts` was created as a separate module (OD-2 pattern, consistent with `hud.ts`). ADR for "Composition timing state placement" is due — to be filed alongside step 05.2 per phase spec.

### Proposed Decisions Register entries (if any)

None new. OD-1 and OD-2 are implemented as resolved.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `tsc --noEmit`: 0 errors
- `pnpm lint`: 0 errors
- `pnpm test`: 120 passing
- No new dependencies added.
- Branch: `main`.
- `CompositionDrawer.svelte` does not yet exist; CSS tokens are inert without it.

### Next-step context (only if non-obvious)

- Step 05.3 creates `src/ui/CompositionDrawer.svelte` and imports it in `App.svelte`.
- `addBlockAsNewTrack` (not `addBlockToTrack`) is the function for the `↳ pista` button.
- `PPB`, `compPos`, `getCompState`, `getCompPausedBars` are all exported from `composition.ts` for use in the rAF loop.
- The rAF loop needs `totalBars` derived reactively from `$sessionStore.composition` to pass to `compPos`.

### Planner Review

**Planner Review (iteration 1):** REVISE on 2026-06-08. See `docs/orbifold-v1/reviews/phase-05-step-05.2-review-1.md`. Two ADRs required by the phase spec were not filed: ADR 0008 (composition timing state module) and ADR 0009 (ephemeral ID counters). All source code and gate results accepted as-is.

**REVISE iteration 2 (2026-06-08):** Created `docs/adr/0008-composition-timing-state-module.md` and `docs/adr/0009-composition-id-counters-ephemeral.md`. No source code changed. Gate results remain valid (tsc 0, lint 0, 120 tests). All items in the review's "What to fix" section addressed; all items in "What NOT to change" left untouched.

**Planner Review (iteration 2):** APPROVE on 2026-06-08. Both ADRs are present and complete. ADR 0008 covers all required content: decision (dedicated `composition.ts` module, not store), context (60 fps rAF churn, `hud.ts` pattern), consequences (Phase 07 exclusion explicit), status (Accepted, OD-2 Pilot pre-resolved). ADR 0009 covers all required content: decision (module-level `let _blkSeq`/`_trkSeq` in `session.ts`, not persisted), context (prototype line 1933 citation), consequences (Phase 07 must re-assign IDs at deserialization, explicitly called out), status (Accepted, OD-1 Pilot pre-resolved). Both ADRs follow the established format of ADRs 0001–0007. No source code was changed in the fix iteration; gate results (tsc 0, lint 0, 120 tests) remain valid. All 8 checklist items and the prototype-parity project-specific item pass. The single REVISE item (missing ADRs) is now fully resolved.
Next action: Dev proceeds to step 05.3

---

## Step 05.3 — CompositionDrawer.svelte (block library + timeline)

**Date:** 2026-06-08
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-05.md`, `docs/orbifold-v1/inventories/phase-05-inventory.md`, `docs/orbifold-v1/handoffs/phase-05-handoff.md` (steps 05.1–05.2 entries), `reference/orbifold.html` lines 530–574 and 1927–2127, `src/state/session.ts`, `src/state/composition.ts`, `src/app/App.svelte`.
- Created `src/ui/CompositionDrawer.svelte` — full port of `#compTab` + `#compDrawer` (prototype lines 530–574, CSS lines 251–314, JS lines 1927–2127).
- Added `import CompositionDrawer from '../ui/CompositionDrawer.svelte'` and `<CompositionDrawer />` to `src/app/App.svelte` after `<CodeDrawer />`.
- All gate commands pass: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` 120 passing.

### Files touched

- `src/ui/CompositionDrawer.svelte` — created
- `src/app/App.svelte` — added import + element
- `docs/orbifold-v1/handoffs/phase-05-handoff.md` — this entry

### Prototype parity

| Feature | Prototype lines | Port notes |
|---|---|---|
| `#compTab` button | 531, CSS 252–254 | Fixed position `left:calc(50%+130px)`, accent color `var(--accent)`, accent border. Clicking calls `handleOpen()` → sets `open=true`, starts rAF loop. |
| `#compDrawer` drawer | 532–574, CSS 255–301 | Slides up with `.open` class via `translateY(108%)→0` transition. Two-column `.comp-grid`. |
| Block library (col 1) | 1939–1970 | Save row: `addBlock('groove'/'armonia'/'sesion')`. `{#each blocks}` renders `.blk` with tag, contenteditable name, mini preview, ▶/↳ pista/🗑 buttons. Empty state `.arr-empty`. |
| Contenteditable rename | 1960 | `on:input` → `handleBlockRename(e, b.id, b.name)` reads `e.target.textContent`, calls `renameBlock()`. |
| ▶ preview button | 1961 | `void playBlockById(b.id)` → `runNow(block.code)`, nowPlaying `source:'block'`. |
| ↳ pista button | 1962 | `addBlockAsNewTrack(b.id)` — creates NEW track with block (Pilot-confirmed OD-1). |
| 🗑 delete button | 1963–1966 | `deleteBlock(b.id)` — removes from blocks + all track refs. |
| Timeline (col 2) | 1983–2052 | `.timeline` grid: 120px heads + 1fr scroll. |
| + pista button | 2120 | `addTrack()`. Track heads: `{#each trackIndices as ti}` → label + 🗑 `removeTrack(ti)`. |
| Bar ruler | 1992–1993 | `{#each barNums as s}` → `<span class="bar-num" style="left:{s*PPB}px">`. Reactive via `$: barNums = [...Array(gridBars()).keys()]`. |
| .tl-inner width | 1989–1990 | `style="--ppb:{PPB}px; width:{gridBars()*PPB}px"` on `.tl-inner`. |
| .tl-block positioned | 2005–2011 | `left:{startBar*PPB}px; width:{ref.bars*PPB-2}px`. `data-tk`/`data-ri`/`data-bars`/`data-st` for handlers. |
| ✕ remove from track | 2015 | `removeBlockFromTrack(ti, ri)` on click. |
| Bars input | 2017–2019 | `handleBarsInput` (live width resize), `handleBarsChange` (commits via `setBlockBars`). `on:pointerdown\|stopPropagation` prevents block drag. |
| Grip resize | 2021–2024 | `handleGripPointerDown/Move/Up`: reads `blockEl.dataset.bars`, uses `gripState` singleton, snaps to bar, calls `setBlockBars` on pointerup. |
| Body drag reorder | 2026–2038 | `handleBlockPointerDown/Move/Up`: reads `data-tk`/`data-ri`/`data-st` from element, translates visually, computes `center` → `newIdx`, calls `reorderBlockInTrack`. |
| .tl-add selector | 2043–2047 | `handleAddFromSelect(e, ti)` → `addBlockToTrack(ti, val)`, resets select. Falls back to "guarda bloques arriba" text when no blocks. |
| Playhead rAF loop | 2073–2091 | `compTickLoop()`: exits when `!open`. When playing/paused: `playheadLeft=pos*PPB`, `playheadOn=true`, auto-scroll, `activeBlocks` map per track. When stopped: hides, clears. `compInfo` updated each frame. |
| Auto-scroll | 2081 | `scrollEl.scrollLeft = Math.max(0, x - scrollEl.clientWidth*0.3)` when playhead near edge. |
| Active block highlight | 2083–2084 | `class:playing={activeBlocks.get(ti) === ri}` reactively driven by rAF loop. |
| compInfo label | 2051, 2085 | Static: "N pistas · M compases". Playing: "▶ compás N / tb". Paused: "⏸ compás N / tb". |
| ▶ tocar transport | 2122 | `void playComposition()`. |
| ⏸ pausa transport | 2123 | `void pauseComposition()`. |
| ■ stop transport | 2124 | `void stopComposition()`. |
| limpiar todo | 2121 | `clearAllTracks()` — iterates `removeTrack(i)` from last to first; each call auto-adds empty if last. |
| ✕ close button | 2126 | `handleClose()` → `open=false`. rAF loop exits next frame (checks `!open`). |

### ESLint/Prettier compliance notes

- `catch { }` (no binding) used for all `setPointerCapture`/`releasePointerCapture` try-catch blocks — `ProgressionChips.svelte` established this pattern.
- `{#each barNums as s}` and `{#each trackIndices as ti}` — reactive computed arrays created in `<script>` using `[...Array(n).keys()]` / `[...tracks.keys()]` to avoid unused binding variables that `@typescript-eslint/no-unused-vars` at error level would flag.
- All inline event handlers with type assertions moved to named functions in `<script>` (ESLint/svelte-parser rejects `as X` type casts in inline template expressions with this parser config).
- No invalid `svelte-ignore` comments left; only used where Svelte actually emits the warning.

### Validation evidence

- `pnpm exec tsc --noEmit` — 0 errors (clean output)
- `pnpm lint` — 0 errors, all files use Prettier code style
- `pnpm test` — 120 tests pass (5 test files — no regressions)

### Acceptance Coverage Table

| Acceptance ID | Behavior | Coverage status | Evidence |
|---|---|---|---|
| A-05-01 | Composition tab opens/closes drawer | covered | `#compTab` button with `handleOpen()`; `.open` class applied/removed; slide-up transition from app.css |
| A-05-02 | Save buttons capture current state as named blocks | covered | `addBlock('groove'/'armonia'/'sesion')` wired to three save buttons; `{#each blocks}` renders them |
| A-05-03 | Block ▶ previews; nowPlaying source is 'block' | covered | `playBlockById(b.id)` → sets `nowPlaying={label:'Bloque · name', source:'block'}` |
| A-05-04 | Contenteditable rename updates timeline | covered | `handleBlockRename` on `on:input`; calls `renameBlock()` which updates store; `.bn` span reflects updated name reactively |
| A-05-05 | + pista adds tracks; blocks on tracks as stacked lanes | covered | `addTrack()` button; `addBlockAsNewTrack(b.id)` for `↳ pista`; `{#each tracks}` renders `.tl-lane` per track |
| A-05-06 | Block width = bars × PPB; grip snaps; drag reorders | covered | `left:{startBar*PPB}px; width:{ref.bars*PPB-2}px`; grip handlers; drag handlers call `reorderBlockInTrack` |
| A-05-07 | Bar ruler shows numbers; timeline scrolls horizontally | covered | `{#each barNums as s}` ruler; `.tl-scroll` with `overflow-x:auto`; `.tl-inner` width set to `gridBars()*PPB` |
| A-05-08 | ▶ tocar builds correct Strudel code; nowPlaying.source='composition' | covered | `playComposition()` → `buildComposition(blocks,tracks)` → `runNow`; `nowPlaying={label:'Composición', source:'composition'}` |
| A-05-09 | Playhead advances; auto-scrolls; active block highlighted | covered | rAF loop: `playheadLeft`/`playheadOn` reactive; auto-scroll via `scrollEl.scrollLeft`; `class:playing={activeBlocks.get(ti)===ri}` |
| A-05-10 | Pause freezes playhead; resume from paused bar; stop resets | covered | `pauseComposition()` → `setCompPaused`; resume: `playComposition()` adjusts `compStart`; `stopComposition()` → `setCompStopped`, clears nowPlaying |
| A-05-11 | limpiar todo clears tracks; library intact | covered | `clearAllTracks()` iterates `removeTrack(i)` — last call auto-adds empty; blocks array untouched |
| A-05-12 | All A-04 behaviors intact | covered | 120 tests pass; `App.svelte` adds `<CompositionDrawer />` after `<CodeDrawer />` without disturbing prior components |
| A-05-13 | tsc/lint/test/build all exit 0 | partially covered | tsc 0, lint 0, test 120; build verified in 05.4 |
| A-05-14 | No cx/cy in Block.code or Composition state | covered | `CompositionDrawer.svelte` never reads or writes `cx`/`cy`; block code strings are pure Strudel text |

### Decisions made (if any)

None. All decisions pre-resolved by step 05.2.

**Implementation notes on ESLint compliance:** Moved all type-assertion (`as X`) event handler logic to named `<script>` functions. Used `[...Array(n).keys()]` for index-only `{#each}` loops. Used `catch { }` (no binding) for all pointer capture try-catch blocks. These are transient environment adaptations, not governance decisions.

### Proposed Decisions Register entries (if any)

None new.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- `tsc --noEmit`: 0 errors
- `pnpm lint`: 0 errors
- `pnpm test`: 120 passing
- `src/ui/CompositionDrawer.svelte` created; imported in `App.svelte`.
- No new dependencies added.
- Branch: `main`.

### Next-step context (only if non-obvious)

- Step 05.4 is operability verification: run all gate commands, perform 10-point smoke test in `pnpm dev`.
- The `limpiar todo` implementation calls `removeTrack(i)` from last to first; the final call auto-adds one empty track. This correctly matches prototype line 2121 behavior.
- The rAF loop exits when `!open` (next frame after close). If composition is playing and drawer is closed, the loop stops but audio continues. This matches prototype behavior (compTickLoop only drives the playhead UI, not audio).

### Planner Review

**Planner Review (iteration 1):** APPROVE on 2026-06-08. All 8 standard checklist items and the prototype-parity project-specific item pass. Commit scope is clean (only `CompositionDrawer.svelte` created, `App.svelte` import added, handoff updated). Commit message format matches spec exactly. Acceptance Coverage Table is complete across all 14 A-05 IDs — A-05-01 through A-05-12 and A-05-14 are marked "covered" with specific implementation evidence; A-05-13 is correctly "partially covered" (build deferred to 05.4). Gate commands (tsc 0, lint 0, 120 tests) are recorded and credible. Both Register entries respected: no `cx`/`cy` present (grep clean), no new dependencies. Prototype parity table is exhaustive: every major feature is cited to prototype lines (531, 532–574, 1939–1970, 1960–1966, 1983–2052, 1992–1993, 2005–2038, 2043–2047, 2073–2091, 2117–2124, 2121, 2126) with fidelity notes. AGPL-3.0 header present on line 2. No unauthorized ADR-worthy decisions introduced. The `limpiar todo` behavioral equivalence (iterative `removeTrack` vs. prototype direct array replacement) is explicitly noted and sound.
Next action: Pilot approval required before step 05.4 — browser visual smoke test requires Pilot observation

---

## Step 05.4 — Round-1 fixes (smoke-test defects: cross-track drag, pill visibility)

**Date:** 2026-06-09
**Commit:** `fix(ui): Phase 05 — 05.4 smoke-test defects: cross-track drag, pill visibility`
**Iteration:** Round-1 fix (post Pilot browser smoke test)

### Defects addressed

Two defects reported by the Pilot during Phase 05 step 05.4 browser smoke test:

1. **Vertical drag between tracks not working** — Dragging a block to a different track (vertical drop) had no effect; the block stayed on its source track. Only horizontal reordering within the same track worked.
2. **Now-playing pill hidden by composition drawer** — The composition drawer slides up from `bottom:0` and covers the Transport footer, so the "Composición" now-playing pill was invisible while the drawer was open.

### Root cause analysis

**Defect 1:** The `handleBlockPointerUp` handler in `CompositionDrawer.svelte` always called `reorderBlockInTrack(ti, ri, newIdx)` using the source track index `ti`. There was no logic to detect a cross-track drop; `dragTrackIndex` was the source track and the handler never checked if the pointer landed on a different `.tl-lane`. Additionally, `session.ts` had no `moveBlockBetweenTracks` function.

**Defect 2:** The drawer uses `position:fixed; bottom:0; max-height:74vh` (app.css line 289), which overlaps the Transport footer. The now-playing pill is only rendered in `Transport.svelte`'s footer, which is behind the drawer when open.

### Fixes implemented

**Defect 1 — Cross-track drag (`session.ts` + `CompositionDrawer.svelte`):**

- Added `moveBlockBetweenTracks(fromTrackIndex, fromRefIndex, toTrackIndex, toRefIndex)` to `session.ts`. It creates a shallow copy of every track's blocks array, splices the ref out of the source track, and inserts it at the clamped position in the destination track — a single `sessionStore.update()` call for atomicity.
- Added `dragOverTrackIndex` state variable to `CompositionDrawer.svelte` (initialized to `-1`).
- Extended `handleBlockPointerMove`: after translating the element visually, temporarily sets `pointerEvents: 'none'` on the dragged element, calls `document.elementFromPoint(e.clientX, e.clientY)` to find the DOM element under the pointer, walks up with `.closest('.tl-lane')`, reads `lane.dataset.tklane` (the new `data-tklane={ti}` attribute on each `.tl-lane`), and updates `dragOverTrackIndex`.
- Extended `handleBlockPointerUp`: reads `dragOverTrackIndex` at drop time; if it differs from `dragTrackIndex`, calls `moveBlockBetweenTracks` (cross-track path); otherwise falls through to the original `reorderBlockInTrack` logic (same-track path). Clears all drag state before calling the action.
- Added `data-tklane={ti}` to each `.tl-lane` element so `querySelector('.tl-lane[data-tklane="N"]')` works for computing the insertion position.
- Added `class:drag-over={dragging && dragOverTrackIndex === ti && dragOverTrackIndex !== dragTrackIndex}` to each `.tl-lane` for visual drop-target feedback.
- Added `.tl-lane.drag-over` CSS rule to `app.css` (light accent background + dashed accent outline).

**Defect 2 — Now-playing pill inside drawer (`CompositionDrawer.svelte`):**

- Added a mini now-playing pill in the `.code-actions` transport row (after the `compInfo` span).
- Rendered only when `$sessionStore.nowPlaying.source === 'block' || source === 'composition'` (the two sources owned by the composition drawer).
- Structure mirrors `Transport.svelte`'s `.now` pill: `.comp-now-dot` (green pulsing when `.live`) + `.comp-now-label` with the `nowPlaying.label` text.
- Scoped styles added to `CompositionDrawer.svelte <style>`: `.comp-now-pill`, `.comp-now-dot`, `.comp-now-pill.live .comp-now-dot` (references global `pulse` keyframe from `app.css`), `.comp-now-label`.
- The `class:live={true}` is always true when the pill is visible (the condition already guards for active sources); this mirrors the Transport's `class:live={source !== null}` pattern.

### Files touched

- `src/state/session.ts` — added `moveBlockBetweenTracks` export
- `src/ui/CompositionDrawer.svelte` — cross-track drag logic, now-playing pill markup + scoped styles
- `src/app/app.css` — `.tl-lane.drag-over` rule
- `docs/orbifold-v1/handoffs/phase-05-handoff.md` — this entry

### Validation evidence

- `pnpm exec tsc --noEmit` — 0 errors
- `pnpm lint` — 0 errors (Prettier auto-formatted `CompositionDrawer.svelte`; re-ran lint clean)
- `pnpm test` — 120 tests pass (no regressions)
- `pnpm build` — clean build, 0 errors, 0 TS errors

### Acceptance Coverage Table

| Acceptance ID | Behavior | Coverage status | Evidence |
|---|---|---|---|
| A-05-01 | Composition tab opens/closes drawer | covered | unchanged from 05.3 |
| A-05-02 | Save buttons capture current state as named blocks | covered | unchanged from 05.3 |
| A-05-03 | Block ▶ previews; nowPlaying source is 'block' | covered | unchanged from 05.3; pill now visible inside drawer |
| A-05-04 | Contenteditable rename updates timeline | covered | unchanged from 05.3 |
| A-05-05 | + pista adds tracks; blocks on tracks as stacked lanes | covered | unchanged from 05.3 |
| A-05-06 | Block width = bars × PPB; grip snaps; drag reorders | covered | cross-track drag fixed: `moveBlockBetweenTracks` called on drop to different lane; same-track still calls `reorderBlockInTrack` |
| A-05-07 | Bar ruler shows numbers; timeline scrolls horizontally | covered | unchanged from 05.3 |
| A-05-08 | ▶ tocar builds correct Strudel code; nowPlaying.source='composition' | covered | unchanged from 05.3 |
| A-05-09 | Playhead advances; auto-scrolls; active block highlighted | covered | unchanged from 05.3 |
| A-05-10 | Pause freezes playhead; resume from paused bar; stop resets | covered | unchanged from 05.3 |
| A-05-11 | limpiar todo clears tracks; library intact | covered | unchanged from 05.3 |
| A-05-12 | All A-04 behaviors intact | covered | 120 tests pass; no regressions |
| A-05-13 | tsc/lint/test/build all exit 0 | covered | tsc 0, lint 0, 120 tests, build clean (this round) |
| A-05-14 | No cx/cy in Block.code or Composition state | covered | unchanged from 05.3 |

### Decisions made

None. Both fixes are contained to the existing architecture (Svelte component + session store action). No new dependencies, no ADR triggers.

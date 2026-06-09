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

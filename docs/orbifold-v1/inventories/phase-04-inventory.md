# Phase 04 Inventory — Svelte UI Layer

**Created:** 2026-06-08
**Phase file:** `docs/orbifold-v1/phases/phase-04.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/app/App.svelte` | Root layout — PIXI mount + temporary transport panel | Remove temp transport panel, `.transport-panel` style block, `handleBpmInput`, `handleMorphToggle`, `handleViewToggle`, `morphTarget` var; update `.layer-ctl` glass styling; import new UI components; add `hudStore` subscription |
| `src/app/app.css` | Does not yet exist | Create with `:root` custom properties, body gradient, grain overlay, `.glass`, base resets, `#app` layout, font `@import`, segment classes, `@keyframes`, media query |
| `src/main.ts` | Bootstrap: mounts App.svelte | Add `import './app/app.css'` |
| `src/state/session.ts` | SessionState store + transport actions | Add seven new action functions: `setChordMode`, `setHarmonyKey`, `addEuclidLayer`, `addEmptyLayer`, `previewEuclid`, `runEditor`, `queueEditor`, `clearProgression`; also `clearChordAt` helper |
| `src/state/hud.ts` | Does not yet exist | Create `hudStore` writable with `{ title, sub, hint, visible }` shape |
| `src/render/tonnetz-scene.ts` | Harmony view PIXI scene | Add `hudStore` write in `pickChord` to replace planned prototype DOM writes (lines 1367–1376) |
| `src/ui/Header.svelte` | Does not yet exist | Brand + view-toggle + key-selector |
| `src/ui/Transport.svelte` | Does not yet exist | Now-playing pill + engine buttons + silence + BPM slider + tap-tempo |
| `src/ui/ProgressionChips.svelte` | Does not yet exist | Chip list with drag-volume + remove + tap-preview |
| `src/ui/HarmonyControls.svelte` | Does not yet exist | Chord-mode segmented control overlay (harmony view) |
| `src/ui/RhythmControls.svelte` | Does not yet exist | Morph toggle + Euclidean orbit controls overlay (rhythm view) |
| `src/ui/CodeDrawer.svelte` | Does not yet exist | Slide-up Strudel code drawer |
| `src/ui/Hud.svelte` | Does not yet exist | Voice-leading HUD (top-left of stage) |
| `src/ui/Legend.svelte` | Does not yet exist | Tonal-function color legend (top-right of stage, harmony view only) |
| `src/ui/Tooltip.svelte` | Does not yet exist | Global `[data-tip]` tooltip |

**Total: 15 files.** Within the 15-file budget per template guidance.

---

## Existing behavior to preserve

- All A-03 acceptance IDs: Tonnetz interaction, P·L·R highlights, voice-leading visualization, rhythm orbits (radial and linear), morph animation, hover layer controls (S/M/Del), resize rebuild. Reference: `tests/` (119 tests passing) and `docs/orbifold-v1/handoffs/phase-03-handoff.md` coverage table.
- `sessionStore` shape and all existing exports from `src/state/session.ts` (no renames, no removal of existing actions: `playGroove`, `playProgression`, `playSession`, `hushAll`, `setBpm`, `requeueLive`, `playChord`, `setNowPlaying`, `initAudio`).
- Lazy audio loading pattern (dynamic `import('../audio/strudel.js')`) — no new eager imports of `@strudel/web`.
- PIXI scenes remain untouched by UI changes (ADR 0004: `App.svelte` is the coordinator; scene modules do not import Svelte store directly except the narrow write-path exception in `rhythm-scene.ts`).
- `src/core/**` has zero DOM/PIXI/Svelte imports.
- AGPL-3.0 header on every new source file.

---

## New behavior to introduce

These map to Phase 04 Acceptance IDs:

1. Header renders brand glyph + "Orbifold" + "geometría sonora"; view-toggle switches PIXI scene. (A-04-01)
2. Now-playing pill displays correct label with pulsing dot when audio is playing; resets on hush. (A-04-02)
3. Engine buttons (`▶ Ritmo`, `▶ Armonía`, `▶ Sesión`, `■ silencio`) invoke `session.ts` transport actions. (A-04-03)
4. BPM slider updates readout and audible tempo; tap-tempo (button + space-bar) computes BPM from inter-tap intervals. (A-04-04)
5. Progression chips: appear per chord in `sessionStore.harmony.progression`; drag adjusts `gain`; tap plays preview; `✕` removes. (A-04-05)
6. Chord-mode control (`◧ acorde` / `⋯ arpegio`) toggles `sessionStore.chordMode`. (A-04-06)
7. Euclidean orbit controls: k/n/r sliders with readouts; `▶ oír` preview toggle; `+ órbita`; `+ capa vacía`. (A-04-07)
8. Morph toggle (`▭ lineal` / `▭ radial`) triggers radial↔linear animation. (A-04-08)
9. Code drawer opens/closes with slide-up animation; execute and queue buttons work; textarea editable. (A-04-09)
10. HUD shows chord name and voice-leading summary after chord pick; legend in harmony, hidden in rhythm. (A-04-10)
11. Tooltip appears near cursor on hover of `[data-tip]` elements. (A-04-11)
12. Layer-control overlay (S/M/Del) has glass styling; solo/mute active states use tonal-function colors. (A-04-12)
13. All A-03 IDs remain covered after UI layer is added. (A-04-13)
14. Gate commands pass clean. (A-04-14)

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-04-01 | Header brand + view-toggle + key-selector render; view-toggle switches PIXI scene | live-system | manual smoke in step 04.6 | 04.3 |
| A-04-02 | Now-playing pill label and pulsing dot; resets on hush | live-system | manual smoke in step 04.6 | 04.3 |
| A-04-03 | Engine buttons call transport actions and update nowPlaying | live-system | manual smoke in step 04.6 | 04.3 |
| A-04-04 | BPM slider + tap-tempo (button + space-bar) | live-system | manual smoke in step 04.6 | 04.3 |
| A-04-05 | Progression chips drag/tap/remove behavior | live-system | manual smoke in step 04.6 | 04.4 |
| A-04-06 | Chord-mode toggle updates chordMode | live-system | manual smoke in step 04.6 | 04.4 |
| A-04-07 | Euclidean controls (k/n/r readouts, preview, add-orbit, add-empty) | live-system | manual smoke in step 04.6 | 04.4 |
| A-04-08 | Morph toggle radial↔linear (A-03-06 preserved) | live-system | manual smoke in step 04.6 | 04.4 |
| A-04-09 | Code drawer open/close + execute/queue | live-system | manual smoke in step 04.6 | 04.4 |
| A-04-10 | HUD voice-leading after chord pick; legend visibility | live-system | manual smoke in step 04.6 | 04.5 |
| A-04-11 | Tooltip on `[data-tip]` elements | live-system | manual smoke in step 04.6 | 04.5 |
| A-04-12 | Layer overlay glass styling + solo/mute active colors | live-system | manual smoke in step 04.6 | 04.5 |
| A-04-13 | All A-03 IDs covered after UI layer added | unit (prior tests must not regress) | `pnpm test` — all 119 | 04.6 |
| A-04-14 | Gate commands: tsc + lint + test (≥119) + build exit 0 | unit + proxy:static-analysis | `pnpm test`, `pnpm build`, `tsc --noEmit`, `pnpm lint` | 04.6 |

---

## Component map

### `src/ui/Header.svelte` (step 04.3)

**Prototype source:** Lines 358–395 (HTML), lines 68–98 (CSS).

| Field | Details |
|---|---|
| DOM IDs / classes | `header.glass`, `.brand`, `.glyph`, `h1`, `.tag`, `.seg#viewSeg`, `button[data-view]`, `.field`, `#melRoot`, `#melMode`, `#melOctave`, `.sp` |
| Props needed | None (reads store directly) |
| Events emitted | None |
| Store fields read | `$sessionStore.view`, `$sessionStore.harmony.root`, `$sessionStore.harmony.mode`, `$sessionStore.harmony.octave` |
| Store fields written | `sessionStore.update(s => ({ ...s, view }))` on view-toggle click; `setHarmonyKey(root, mode, octave)` on key-selector change |
| Pure presentational? | No — needs store access for view and key state |
| Notes | The mic button (`#micBtn`) is **deferred** to a later phase — not in Phase 04 scope. The `keyBox` span (line 394) is also deferred. |

### `src/ui/Transport.svelte` (step 04.3)

**Prototype source:** Lines 484–513 (HTML), lines 180–223 (CSS), lines 644–692 (BPM + tap-tempo JS).

| Field | Details |
|---|---|
| DOM IDs / classes | `footer.glass`, `.now#nowPlaying`, `.dot`, `.nlbl`, `.nval`, `.engines`, `.ebtn.rhythm#rhythmPlay`, `.ebtn.harmony#progPlay`, `.play-session#sessionPlay`, `.tbtn.warm#hushBtn`, `.tempo`, `input#cps`, `.bpm#bpmReadout`, `.unit`, `.taptempo#tapBtn` |
| Props needed | None |
| Events emitted | None |
| Store fields read | `$sessionStore.nowPlaying`, `$sessionStore.bpm` |
| Store fields written | Via `playGroove()`, `playProgression()`, `playSession()`, `hushAll()`, `setBpm()` — all from session.ts |
| Pure presentational? | No — needs store access; also manages local `tapTimes[]` array |
| Local state | `tapTimes: number[]` (transient tap-tempo state; not in store) |
| Notes | Progression chips (`#progChips` area) are NOT here — they go in `ProgressionChips.svelte`. The `.prog` flex wrapper is still part of the footer layout but the chips themselves are in a separate component. BPM conversion: `cps * 240 = bpm` (prototype lines 644–645). Tap-tempo algorithm: lines 671–691 (threshold 2 s, keep last 6, flash 90 ms). Space-bar tap: prototype lines 687–691. |

### `src/ui/ProgressionChips.svelte` (step 04.4)

**Prototype source:** Lines 505–508 (HTML), lines 224–234 (CSS), lines 1413–1468 (JS: `renderProgChips`, `chipGainCss`, drag logic).

| Field | Details |
|---|---|
| DOM IDs / classes | `.prog`, `.lbl`, `#progChips`, `.prog-chip`, `.prog-chip.tonic/.subdom/.dom`, `.rm`, `.prog-empty` |
| Props needed | None |
| Events emitted | None |
| Store fields read | `$sessionStore.harmony.progression`, `$sessionStore.harmony.root`, `$sessionStore.harmony.mode`, `$sessionStore.nowPlaying` |
| Store fields written | Via `clearChordAt(i)` (new helper, wraps `sessionStore.update`), `requeueLive()`, `playChord(...)` |
| Pure presentational? | No — needs store access and drag pointer capture |
| Local state | `dragging`, `startY`, `startGain`, `moved` per chip (managed inline via event handlers, prototype lines 1442–1466) |
| Chip tonal-function class | Derived via `diatonicLookup(root, mode)` from `core/theory/scales.ts`. Key: `${ch.rootPc}:${ch.qual}`. Falls back to no class if not diatonic. Prototype: `ch.info.func.cls` (line 1435). |
| `chipGainCss(g)` | `linear-gradient(to top, rgba(138,160,255,.30) ${pct}%, rgba(255,255,255,.05) ${pct}%)` — prototype lines 1413–1415. |
| Drag constants | Threshold 3 px (`Math.abs(dy) > 3`), gain step 0.006 per px, clamp [0, 1.2] — prototype lines 1451–1453. |
| Tap action | `playChord(ch.rootPc, ch.qual, ch.gain)` — prototype line 1462–1464. |

### `src/ui/HarmonyControls.svelte` (step 04.4)

**Prototype source:** Lines 447–453 (HTML), lines 316–325 (CSS `.orbit-ctl`).

| Field | Details |
|---|---|
| DOM IDs / classes | `.orbit-ctl.glass#harmonyCtl`, `.seg2#chordModeSeg`, `button[data-mode="chord"]`, `button[data-mode="arp"]` |
| Props needed | None |
| Events emitted | None |
| Store fields read | `$sessionStore.view`, `$sessionStore.chordMode` |
| Store fields written | `setChordMode('chord' | 'arp')` on click |
| Pure presentational? | No |
| Visibility | `{#if $sessionStore.view === 'harmony'}` (mirrors prototype `.orbit-ctl.show` CSS) |
| Position | `position: absolute; left: 16px; bottom: 46px` inside `#stage` — prototype `.orbit-ctl` lines 316–319 |

### `src/ui/RhythmControls.svelte` (step 04.4)

**Prototype source:** Lines 426–443 (HTML), lines 316–325 (CSS), lines 838–877 (JS: `renderEuclidInfo`, `addEuclid.onclick`, `addLayerEmpty.onclick`, `euclidPreview.onclick`).

| Field | Details |
|---|---|
| DOM IDs / classes | `.orbit-ctl.glass#orbitCtl`, `#layoutToggle.mk`, `#euclidSound`, `#euclidK`, `#euclidN`, `#euclidR`, `#euclidKVal`, `#euclidNVal`, `#euclidRVal`, `#euclidInfo`, `#euclidPreview.mk`, `#addEuclid.mk`, `#addLayerEmpty.mk` |
| Props needed | None |
| Events emitted | None |
| Store fields read | `$sessionStore.view`, `$sessionStore.nowPlaying` (for preview toggle state) |
| Store fields written | `setMorphTarget(...)` (imported from `render/rhythm-scene.ts`), `addEuclidLayer(...)`, `addEmptyLayer(...)`, `previewEuclid(...)` / `hushAll()` for toggle |
| Pure presentational? | No |
| Local state | `euclidSound`, `euclidK`, `euclidN`, `euclidR` (all transient, NOT in store); `morphTarget: 0 | 1` (moved from App.svelte) |
| Visibility | `{#if $sessionStore.view === 'rhythm'}` |
| Named patterns map | `{'3,8': 'tresillo', '5,8': 'cinquillo', '2,5': '2:5', '4,9': 'aksak', '7,16': 'brasileño', '5,12': 'venda', '7,12': 'west african', '5,16': 'bossa'}` — prototype lines 844–846 |
| `euclidR` max | Dynamically clamped to `n - 1` — prototype line 844 |
| `data-tip` attributes | All retained from prototype lines 427–443 |

### `src/ui/CodeDrawer.svelte` (step 04.4)

**Prototype source:** Lines 515–528 (HTML), lines 237–249 (CSS), lines 863–876 (euclidPreview writes `#liveCode`), resolved by OD-2 before this step.

| Field | Details |
|---|---|
| DOM IDs / classes | `#codeTab.glass`, `#codeDrawer.glass`, `.code-head`, `b`, `.c-close`, `#liveCode`, `.code-actions`, `#runEditor`, `#updateEditor` |
| Props needed | None |
| Events emitted | None |
| Store fields read | None (per OD-2 decision: local state only) |
| Store fields written | `runEditor(code)`, `queueEditor(code)` — from session.ts |
| Pure presentational? | Mostly yes — but calls session.ts transport actions |
| Local state | `open: boolean` (drawer open/closed); `currentEditorCode: string` (textarea content) — NOT in sessionStore per OD-2 resolution |
| Open/close animation | `transform: translateY(105%)` → `translateY(0)`, transition `.4s cubic-bezier(.22,1,.36,1)` — prototype lines 240–242 |
| Tab position | `position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%)` — prototype lines 237–239 |

### `src/ui/Hud.svelte` (step 04.5)

**Prototype source:** Lines 409–411 (HTML), lines 111–117 (CSS).

| Field | Details |
|---|---|
| DOM IDs / classes | `.hud.glass#hud`, `.vl-title#hudTitle`, `.vl-sub#hudSub`, `.mv` spans |
| Props needed | `title: string`, `sub: string`, `visible: boolean` |
| Events emitted | None |
| Store fields read | Reads `$hudStore` via App.svelte (which passes props) |
| Pure presentational? | Yes — receives all state as props from App.svelte |
| Position | `position: absolute; top: 16px; left: 16px` inside `#stage` — prototype lines 112–113 |
| Show transition | Opacity 0 → 1, `translateY(-4px)` → `none`, `.3s` — prototype lines 113–114 |

**HUD data path:** `tonnetz-scene.ts` `pickChord()` (lines ~483–521) writes `_lastVL` and chord info to `hudStore` (new store in `src/state/hud.ts`); `App.svelte` subscribes to `$hudStore` and passes `title`, `sub`, `visible` as props to `<Hud>`.

### `src/ui/Legend.svelte` (step 04.5)

**Prototype source:** Lines 414–421 (HTML), lines 122–127 (CSS).

| Field | Details |
|---|---|
| DOM IDs / classes | `.legend.glass#legend`, `.legend span`, `.legend i` |
| Props needed | None |
| Events emitted | None |
| Store fields read | `$sessionStore.view` |
| Pure presentational? | Mostly — `{#if $sessionStore.view === 'harmony'}` gating |
| Position | `position: absolute; top: 16px; right: 16px` inside `#stage` — prototype lines 122–124 |
| Content | Static four-item legend: tónica / subdom. / dominante / separator / ▲ mayor · ▼ menor / P·L·R vecinos |

### `src/ui/Tooltip.svelte` (step 04.5)

**Prototype source:** Lines 576 (HTML: `<div id="tip">`), lines 339–344 (CSS), lines 2128–2148 (JS: tooltip wiring via `mouseover`/`mouseout` on `document`).

| Field | Details |
|---|---|
| DOM IDs / classes | `#tip` (fixed, z-index 60) |
| Props needed | None |
| Events emitted | None |
| Store fields read | None |
| Pure presentational? | Yes (self-contained with `document` event listeners wired in `onMount`) |
| Algorithm | `mouseover`: find `e.target.closest('[data-tip]')`; if found and ≠ current, set text, add `.show`, call `place(el)`. `mouseout`: find element; if not contains `relatedTarget`, remove `.show`. `place(el)`: center above el, clamp to viewport edges, drop below if top < 8 — prototype lines 2131–2138. |

---

## App.svelte changes

Lines to remove in step 04.5 (after components are ready in steps 04.2–04.4):

| Element | Current location | Replacement |
|---|---|---|
| `<div class="transport-panel">…</div>` (lines 354–396 of App.svelte) | App.svelte template | Replaced by `<Header>`, `<Transport>`, `<ProgressionChips>`, `<HarmonyControls>`, `<RhythmControls>`, `<CodeDrawer>`, `<Hud>`, `<Legend>`, `<Tooltip>` |
| `.transport-panel`, `.transport-label`, `.now-playing` style rules (lines 455–476) | App.svelte `<style>` | Deleted; all transport CSS moves to component `<style>` blocks or `app.css` |
| `handleBpmInput()` function (lines 256–260) | App.svelte `<script>` | Moved to `Transport.svelte` (tap-tempo and BPM are local to that component) |
| `handleMorphToggle()` function (lines 305–309) | App.svelte `<script>` | Moved to `RhythmControls.svelte` |
| `handleViewToggle()` function (lines 311–318) | App.svelte `<script>` | Moved to `Header.svelte` |
| `morphTarget` variable (line 93) | App.svelte `<script>` | Moved to `RhythmControls.svelte` |
| Import of `playGroove`, `playProgression`, `playSession`, `hushAll`, `setBpm` from session.ts | App.svelte imports (lines 10–16) | Removed from App.svelte; each is imported in the relevant component |

Lines to retain in App.svelte:
- `sessionStore`, `initAudio`, `requeueLive` imports (still used for store subscription and PIXI wiring)
- All PIXI scene imports and logic
- `hoveredLayerIndex`, `overlayX`, `overlayY`, `scheduleHideOverlay`, `cancelHideOverlay` state + overlay DOM block
- `handleLayerSolo`, `handleLayerMute`, `handleLayerDelete` functions
- `buildRhythmScene` rebuild call in solo/mute/delete handlers
- Canvas pointer routing, resize wiring, `onMount`/`onDestroy` lifecycle

**`#stage` becomes a proper flex-column layout:** After Phase 04, `#stage` is no longer `position: fixed`; App.svelte becomes the `#app` flex column container (header / stage / footer) matching the prototype's `#app` layout (prototype line 66: `height:100vh; display:flex; flex-direction:column`).

**New Svelte structure after step 04.5:**
```
App.svelte
  <Header>         ← top of flex column
  <div id="stage"> ← flex: 1; contains PIXI canvas + overlays
    PIXI canvas (bound via stageEl)
    layer-ctl overlay (DOM, kept in App.svelte)
    <Hud>
    <Legend>
    <div class="hint">  ← stageHint (driven by hudStore.hint)
    <HarmonyControls>
    <RhythmControls>
    <Tooltip>
  </div>
  <Transport>      ← bottom of flex column, contains ProgressionChips
  <CodeDrawer>     ← fixed/slide overlay
```

---

## Layer-overlay refactor

**Decision:** Keep the `{#if hoveredLayerIndex >= 0}` DOM overlay in `App.svelte` for Phase 04. Moving it to `LayerCtl.svelte` is possible but would require prop-drilling `hoveredLayerIndex`, `overlayX`, `overlayY`, and the three handler functions — adding complexity for minimal benefit at this stage.

**Rationale:** The overlay is tightly coupled to the PIXI canvas geometry (position computed from `getLayerLabelPos()`, debounce timers). Keeping it in App.svelte preserves the existing OD-1 resolution pattern and avoids new prop-drilling interfaces. Phase 04 updates its CSS to match the prototype glass look (step 04.5); if a future phase (e.g., Phase 06 agent panel) needs it refactored, that is the right moment.

**Proposed Decisions Register entry candidate:** "Layer-control DOM overlay stays in App.svelte until an explicit refactor phase" — surfaced in step 04.1 for Pilot awareness; not a blocking decision for implementation.

---

## State additions for new UI

### `sessionStore` fields — confirmation

| Field | Status | Notes |
|---|---|---|
| `harmony.root`, `harmony.mode`, `harmony.octave` | Already in `HarmonyState` (`session.ts` lines 84–88) | Writable via new `setHarmonyKey()` action |
| `chordMode` | Already in `SessionState` (`session.ts` line 129) | Writable via new `setChordMode()` action |
| `nowPlaying` | Already exists | Read by Transport and RhythmControls; written by transport actions |
| `bpm` | Already exists | Read by Transport; written by `setBpm()` |

### Transient UI state (NOT in store)

| State | Component | Rationale |
|---|---|---|
| Euclidean k/n/r/sound values | `RhythmControls.svelte` local vars | Transient config; only committed to store on `addEuclidLayer()` |
| Tap-tempo `tapTimes[]` array | `Transport.svelte` local var | Transient accumulator; only the computed BPM goes to store |
| Code-drawer open/closed | `CodeDrawer.svelte` local `open: boolean` | Per OD-2 resolution: local state |
| `currentEditorCode` | `CodeDrawer.svelte` local `string` | Per OD-2 resolution: local state, not persisted |
| `morphTarget` | `RhythmControls.svelte` local `0 | 1` | Moved from App.svelte; drives `setMorphTarget()` call |

### New `hudStore` (separate file)

`src/state/hud.ts` will export a `writable<HudState>` where:
```ts
interface HudState {
  title: string;    // chord name, e.g. "C maj → A min"
  sub: string;      // voice-leading summary HTML with <span class="mv"> accents
  hint: string;     // stage hint text (replaces prototype #stageHint.textContent)
  visible: boolean; // drives .hud.show CSS class
}
```
`tonnetz-scene.ts` `pickChord()` writes to `hudStore` (replacing prototype `hudTitle.textContent` / `hudSub.textContent` DOM mutations at lines 1367–1376). `App.svelte` subscribes and passes props to `<Hud>`.

**ADR trigger:** `hudStore` placement (separate file vs. inline in session.ts) — per phase-04.md ADR Triggers, this decision must be documented in `docs/adr/` when step 04.5 is executed.

---

## `session.ts` additions needed

| Function | Status | Implementation notes |
|---|---|---|
| `playChord(rootPc, qual, gain)` | Already exported (step 03.4) | No change needed |
| `setChordMode(mode)` | Not yet | `sessionStore.update(s => ({ ...s, chordMode: mode }))` + `requeueLive()`. Prototype: implicit in `pickChord`/`melodyLine` |
| `setHarmonyKey(root, mode, octave)` | Not yet | Update `harmony.{root,mode,octave}`, call `requeueLive()`. Prototype: `melRoot`/`melMode`/`melOctave` change handlers |
| `addEuclidLayer(sound, k, n, rot)` | Not yet | `bjorklund(k,n)` → `rotate(...,rot)` → map to 16-step array (prototype lines 849–857); push to `rhythm.layers`. Imports `bjorklund`, `rotate`, `RSTEPS` from `core/rhythm/euclid.ts` |
| `addEmptyLayer(sound)` | Not yet | Push `{ sound, steps: new Array(16).fill(0) }` (prototype line 858–861) |
| `previewEuclid(sound, k, n, rot)` | Not yet | Toggle: if `nowPlaying.source === 'preview'`, call `hushAll()`; else run `s("${sound}").euclidRot(${k},${n},${rot})` via `audio.runNow()`, set `nowPlaying` to `{ label: "Vista previa · E(${k},${n})", source: 'preview' }`. Prototype lines 862–876. |
| `runEditor(code)` | Not yet | `audio.runNow(code)`, set `nowPlaying` to `{ label: 'Editor', source: 'editor' }`. Prototype lines 524–526 (button handlers) |
| `queueEditor(code)` | Not yet | `audio.queueForNextCycle(code)`. Prototype line 527 (`#updateEditor` click) |
| `clearProgression()` | Not yet | `sessionStore.update(s => ({ ...s, harmony: { ...s.harmony, progression: [] } }))`, call `requeueLive()`. Prototype line 1506 |
| `clearChordAt(index)` | Not yet | Remove chord at index from `harmony.progression`, call `requeueLive()`. Prototype: `melState.progression.splice(i,1)` in chip `.rm` click handler (line 1440) |

---

## CSS strategy

`src/app/app.css` does not yet exist. It must be created in step 04.2 and imported in `src/main.ts` (before the App import, so tokens cascade into all components).

The following tokens from the prototype `<style>` block (lines 26–352) will go into `app.css`:

- `:root` custom properties (lines 26–38): `--bg`, `--bg2`, `--panel`, `--panel-2`, `--stroke`, `--stroke-2`, `--text`, `--muted`, `--faint`, `--tonic`, `--subdom`, `--dom`, `--accent`, `--glass-blur`
- `*` box-sizing reset (line 39)
- `html,body` height (line 40)
- `body` gradient background (lines 41–49), `overflow:hidden`, font stack
- `body::after` grain overlay (lines 52–55)
- `.glass` utility class (lines 56–62)
- `button` base (line 63)
- `input,select,textarea` font (line 64)
- `#app` flex column layout (line 66)
- `.seg`, `.seg2` segment control classes (lines 80–85)
- `.field`, `.field select`, `.keypill` (lines 87–95) — used by Header
- Font `@import` (line 24) — Google Fonts URL (see Open Decisions below)
- `@keyframes pulse` and `@keyframes dot` (lines 102, 165)
- `@media (max-width: 760px)` (lines 346–351)

Component-specific CSS (header, footer/transport, chips, orbits, code-drawer, HUD, legend, tooltip, layerCtl) is defined in the `<style>` block of each Svelte component — matching the scoped style pattern already established in `App.svelte`.

**Status flag:** The app.css tokens are NOT yet present in the project. Step 04.2 must create this file. Until then, the body background and fonts differ from the prototype.

---

## Open decisions surfaced

**Resolution required before step 04.2:**

1. **Font loading strategy** — The prototype imports Fraunces / Albert Sans / IBM Plex Mono via `@import url('https://fonts.googleapis.com/css2?...')` (line 24). Three options:
   - **(a) Keep the Google Fonts `@import`** in `app.css` — simplest; requires internet access at runtime; no new package.
   - **(b) Self-host via `fontsource` npm packages** — offline-capable; adds 3 packages (`@fontsource/fraunces`, `@fontsource/albert-sans`, `@fontsource/ibm-plex-mono`); requires Pilot `pnpm add` approval per CLAUDE.md.
   - **(c) System fallbacks only** — no layout fidelity; prototype aesthetic would be lost.
   - **Recommendation: (a).** The app is primarily a live instrument (not a PWA/offline tool), Google Fonts CDN is standard web practice, and it avoids a new dependency decision. Defers self-hosting to a future phase if offline capability becomes a requirement.

2. **Code-drawer `currentCode` field** — **RESOLVED** by Pilot before this step (OD-2): option (a) — local state in `CodeDrawer.svelte`. No `sessionStore` field. Confirmed in implementation plan above.

---

## Source-of-truth check

This phase consumes data from `sessionStore` (produced by `src/state/session.ts`) and from `src/render/tonnetz-scene.ts` (for `_lastVL` HUD data). Alignment check:

| Consumer | Producer | Shape alignment |
|---|---|---|
| `Transport.svelte` reads `$sessionStore.nowPlaying` | `setNowPlaying()` in `session.ts` (type `NowPlaying`) | Aligned — `{ label: string | null, source: ... | null }` |
| `ProgressionChips.svelte` reads `$sessionStore.harmony.progression` | `sessionStore.update()` in `tonnetz-scene.ts` `pickChord()` | Aligned — `Chord[]` with `{ rootPc, qual, gain, cx?, cy? }` |
| `Hud.svelte` reads `$hudStore` (new) | `tonnetz-scene.ts` `pickChord()` writes `_lastVL` | Shape TBD in step 04.5; `_lastVL` is `VoiceLeadingResult | null` (exported from `tonnetz-scene.ts` line 79). `hudStore` shape defined in this inventory above. |
| `RhythmControls.svelte` calls `addEuclidLayer()` | `session.ts` → `rhythm.layers` (`RhythmLayer[]`) | `addEuclidLayer` pushes `{ sound, steps: number[], euclid: string }` — must match `RhythmLayer` type from `core/rhythm/layers.ts` |
| `Header.svelte` calls `setHarmonyKey()` | `session.ts` updates `harmony.{root,mode,octave}` | Aligned — same fields as `HarmonyState` interface |

**RhythmLayer shape check:** `src/core/rhythm/layers.ts` must export the `euclid` field as optional string or structured type. Confirm at step 04.2 read.

---

## New dependencies needed

- **Font option (a): None** — Google Fonts `@import` is a CSS-only reference, no npm package.
- **Font option (b): Three new packages** — `@fontsource/fraunces`, `@fontsource/albert-sans`, `@fontsource/ibm-plex-mono`. These require Pilot `pnpm add` approval. NOT proceeding without Pilot choice.

If Pilot chooses option (a), **no new npm dependencies** are needed for this phase.

---

## Environment, CI, build, or deployment changes needed

None. Phase 04 is pure Svelte UI in the existing Vite build. No new env vars, CI changes, or build configuration changes required.

---

## Decisions Register check

| Register entry | Applicability |
|---|---|
| Exact dependency version pinning | Applies if font option (b) is chosen — new packages must use exact versions. |
| `Chord.cx / Chord.cy` — render hints, not persisted | `ProgressionChips.svelte` reads `harmony.progression` — chips display label only; `cx`/`cy` are ignored by the UI (no chip serialization). Consistent with decision. |

---

## Project-specific verification tables

**Contract Verification:** Not applicable — no backend.
**Flag-off request audit:** Not applicable — no behavioral flags introduced in Phase 04.
**Fixtures from backend source:** Not applicable.

---

## Risks specific to this phase

**App.svelte layout refactor:** The current `#stage` is `position: fixed; width: 100%; height: 100%` (a full-screen backdrop). Phase 04 changes it to `flex: 1` within a flex-column `#app`. This is a layout-mode change that could affect PIXI canvas sizing if `initStage` relies on the fixed-position geometry. Mitigation: `initStage` uses `resizeTo: stageEl`; as long as `stageEl` fills its flex slot, PIXI will size correctly. Verify in step 04.3 `pnpm dev` smoke test that the canvas still covers the stage area correctly.

**`tonnetz-scene.ts` write to `hudStore`:** Adding a store write inside `tonnetz-scene.ts` is a narrow exception to the ADR 0004 rule that "scene modules do not import sessionStore directly." `hudStore` is a separate store (not `sessionStore`), which keeps the separation clean. However, this architectural decision must be documented in an ADR at step 04.5 per the ADR Triggers section.

---

## Pilot review

The Pilot must resolve the **font loading strategy** (Open Decision 1 above) before step 04.2 begins. Open Decision 2 (code-drawer currentCode) is already resolved.

After Pilot resolves the font question, implementation may proceed from step 04.2.

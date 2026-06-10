<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — root Svelte component.
  Phase 03 step 03.5: rhythm scene, radial↔linear morph, hover controls, full store wiring.
  Phase 04 step 04.3: Header and Transport components added; #stage layout changed to flex:1.
  Phase 04 step 04.4: ProgressionChips, HarmonyControls, RhythmControls, CodeDrawer added.
  Phase 04 step 04.5: Hud, Legend, Tooltip added; layer-ctl glass styling; temp transport removed.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionStore, requeueLive, applyLoadedSession } from '../state/session.js';
  import { decodeSession } from '../lib/persistence.js';
  import { hudStore } from '../state/hud.js';
  import Header from '../ui/Header.svelte';
  import Transport from '../ui/Transport.svelte';
  import ProgressionChips from '../ui/ProgressionChips.svelte';
  import HarmonyControls from '../ui/HarmonyControls.svelte';
  import RhythmControls from '../ui/RhythmControls.svelte';
  import CodeDrawer from '../ui/CodeDrawer.svelte';
  import CompositionDrawer from '../ui/CompositionDrawer.svelte';
  import AgentPanel from '../ui/AgentPanel.svelte';
  import PersistencePanel from '../ui/PersistencePanel.svelte';
  import Hud from '../ui/Hud.svelte';
  import Legend from '../ui/Legend.svelte';
  import Tooltip from '../ui/Tooltip.svelte';
  import { get } from 'svelte/store';
  import { initStage, onResize, setView } from '../render/stage.js';
  import {
    buildTonnetz,
    updateTonnetzDynamic,
    onStagePointerDown as tonnetzPointerDown,
    registerTicker,
  } from '../render/tonnetz-scene.js';
  import {
    buildRhythmScene,
    updateRhythmDynamic,
    onStagePointerDown as rhythmPointerDown,
    onStageContextMenu,
    onStagePointerMove,
    getHoveredLayerIndex,
    getLayerLabelPos,
  } from '../render/rhythm-scene.js';

  // ── State ─────────────────────────────────────────────────────────────────
  let stageEl: HTMLDivElement;

  // Store-subscription unsubscribe handle (cleaned up in onDestroy).
  let unsubStore: (() => void) | null = null;

  // DOM overlay state (OD-1 resolution: DOM overlay for layer controls).
  let hoveredLayerIndex = -1;
  let overlayX = 0;
  let overlayY = 0;

  // Round-2 fix (Defect C): debounce overlay hide so the cursor has 400 ms to
  // travel from the orbit ring to the overlay before it disappears.
  // Prototype: scheduleHideLayerCtl / 260 ms delay (line 1341).
  let hideOverlayTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleHideOverlay(): void {
    if (hideOverlayTimer !== null) clearTimeout(hideOverlayTimer);
    hideOverlayTimer = setTimeout(() => {
      hoveredLayerIndex = -1;
      hideOverlayTimer = null;
    }, 400);
  }

  function cancelHideOverlay(): void {
    if (hideOverlayTimer !== null) {
      clearTimeout(hideOverlayTimer);
      hideOverlayTimer = null;
    }
  }

  // Defect 4 fix: position overlay at the layer's label anchor (canvas geometry),
  // not at the pointer position. The position is recomputed only when hoveredLayerIndex
  // changes (Svelte $: reactive statement), so the overlay is stationary while hovered.
  // getLayerLabelPos returns PIXI logical-pixel coords; with autoDensity:true these
  // are identical to CSS pixels, so we just add the canvas bounding rect offset.
  $: {
    if (hoveredLayerIndex >= 0) {
      const labelPos = getLayerLabelPos(hoveredLayerIndex);
      if (labelPos !== null) {
        // Get canvas element rect for viewport-space conversion.
        const canvasEl = document.querySelector('#stage canvas') as HTMLCanvasElement | null;
        const canvasRect = canvasEl !== null ? canvasEl.getBoundingClientRect() : null;
        if (canvasRect !== null) {
          // labelPos.x/y are in PIXI logical (CSS-equivalent) pixels.
          // autoDensity:true ensures PIXI logical px === CSS px, so no scale needed.
          // The canvas rect offset converts from canvas-local to viewport coords.
          overlayX = canvasRect.left + labelPos.x + 12;
          overlayY = canvasRect.top + labelPos.y - 16;
        }
      }
    }
  }

  // Track previous layer count to detect when to do a full rebuild vs dynamic update.
  let prevLayerCount = 0;

  // Round-2 fix (Defect A): track previous harmony key/mode to detect when
  // buildTonnetz must be re-called (geometry and node colors depend on root+mode).
  let prevHarmonyRoot = -1;
  let prevHarmonyMode = '';

  onMount(async () => {
    // Phase 04: start with empty session (no default rhythm seed).
    // Prototype melState.progression:[] (line 717), rhythmLayers:[] (line 815).
    const initState = get(sessionStore);
    prevLayerCount = initState.rhythm.layers.length;
    // Round-2 fix (Defect A): capture initial harmony key/mode for change detection.
    prevHarmonyRoot = initState.harmony.root;
    prevHarmonyMode = initState.harmony.mode;

    // OD-3 resolution: PIXI targets div#stage full-screen wrapper.
    // initStage appends app.view inside stageEl and registers resize handler.
    const app = await initStage(stageEl);
    if (app === null) {
      // ADR 0006: WebGL unavailable — fallback message shown inside stageEl by initStage.
      return;
    }

    // Round-3 fix (Defect A): PIXI's ResizePlugin schedules its first resize
    // asynchronously (next animation frame) when resizeTo is provided. Calling
    // buildTonnetz/buildRhythmScene immediately after initStage returns means
    // app.screen.width/height may still be 0 (or the initial canvas placeholder
    // size), producing zero-sized geometry that makes hit-tests and the playhead
    // invisible. Waiting one rAF ensures PIXI has completed its first resize
    // before we query app.screen dimensions.
    await new Promise<void>((r) => requestAnimationFrame(() => r()));

    // ── Initial scene build ────────────────────────────────────────────────
    // Build Tonnetz static geometry after PIXI's first resize completes.
    // Prototype: buildTonnetz() called at lines 928–929 from initPixi().
    buildTonnetz(get(sessionStore));
    buildRhythmScene(get(sessionStore));

    // Wire the resize callback: rebuild both scenes when the window is resized.
    // Prototype lines 935–943: resize calls buildTonnetz() and buildRhythmScene().
    onResize(() => {
      buildTonnetz(get(sessionStore));
      buildRhythmScene(get(sessionStore));
      // After rebuild, restore dynamic overlays.
      updateTonnetzDynamic(get(sessionStore));
    });

    // ── Step 03.4: register ticker ─────────────────────────────────────────
    // Prototype: app.ticker.add(tick) at line 931.
    registerTicker(app);

    // ── Step 03.4: initial dynamic state after build ───────────────────────
    updateTonnetzDynamic(get(sessionStore));

    // ── Step 03.4: store subscription for reactive updates ─────────────────
    // Subscribe to sessionStore: drive dynamic scene updates when state changes.
    // Prototype: reactive updates are triggered by DOM mutations / direct calls
    // in the prototype; the port uses Svelte store subscription.
    // Per ADR 0004: App.svelte is the coordinator; scene modules do NOT import
    // sessionStore directly (except for the narrow write-path exception in
    // rhythm-scene.ts for step toggles, per spec authorization).
    unsubStore = sessionStore.subscribe((state) => {
      // Round-2 fix (Defect A): rebuild Tonnetz geometry when root or mode changes
      // because node circle colors (scale membership) and triangle fill colors
      // (tonal function) depend on the current key. Without a rebuild the grid
      // retains the old key's colors.
      // Prototype: buildTonnetz() uses harmony.root + harmony.mode to determine
      //   which nodes are in-scale and which triangles have tonal-function fill
      //   (lines 993–1023).
      const rootChanged = state.harmony.root !== prevHarmonyRoot;
      const modeChanged = state.harmony.mode !== prevHarmonyMode;
      if (rootChanged || modeChanged) {
        buildTonnetz(state);
        prevHarmonyRoot = state.harmony.root;
        prevHarmonyMode = state.harmony.mode;
        // updateTonnetzDynamic is called immediately below — no need to duplicate.
      }

      // Update P·L·R highlights and suggestion triangles when harmony changes.
      updateTonnetzDynamic(state);
      // Update layer visibility when view changes.
      setView(state.view);

      // Rhythm dynamic updates
      const layerCount = state.rhythm.layers.length;
      if (layerCount !== prevLayerCount) {
        // Layer count changed: full geometry rebuild
        buildRhythmScene(state);
        prevLayerCount = layerCount;
      } else {
        // Only label/mute state changed: dynamic update
        updateRhythmDynamic(state);
      }
    });

    // ── Canvas pointer routing ─────────────────────────────────────────────
    // Prototype: app.view.addEventListener('pointerdown', onStagePointer) at line 2157.
    const canvas = app.view as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const state = get(sessionStore);
      if (state.view === 'harmony') {
        tonnetzPointerDown(e);
      } else if (state.view === 'rhythm') {
        rhythmPointerDown(e);
      }
    });

    // Right-click: mute toggle (rhythm view only).
    // Prototype: app.view.addEventListener('contextmenu', onStageContext) at line 2158.
    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      const state = get(sessionStore);
      if (state.view === 'rhythm') {
        onStageContextMenu(e as PointerEvent);
      }
    });

    // Pointer move: hover layer detection for DOM overlay (rhythm view only).
    // Prototype: app.view.addEventListener('pointermove', onStageHover) at line 2159.
    canvas.addEventListener('pointermove', (e: PointerEvent) => {
      const state = get(sessionStore);
      if (state.view === 'rhythm') {
        onStagePointerMove(e, state);
        // Update hovered layer index; overlay position is computed reactively in
        // the $: block above keyed on hoveredLayerIndex (Defect 4 fix).
        const idx = getHoveredLayerIndex();
        if (idx >= 0) {
          // A layer is hovered: cancel any pending hide and show overlay.
          cancelHideOverlay();
          hoveredLayerIndex = idx;
        } else if (hoveredLayerIndex >= 0) {
          // No layer under cursor, but overlay was showing: start debounce timer.
          // Round-2 fix (Defect C): 400 ms grace period to let cursor reach overlay.
          scheduleHideOverlay();
        }
      } else {
        hoveredLayerIndex = -1;
      }
    });

    // Hide overlay when pointer leaves the canvas entirely (debounced).
    // Round-2 fix (Defect C): use scheduleHideOverlay so that if the overlay
    // itself is near the canvas edge the cursor can still reach it in time.
    canvas.addEventListener('pointerleave', () => {
      scheduleHideOverlay();
    });

    // ── Step 07.3: URL session restore ────────────────────────────────────
    // If the URL contains #session=<encoded>, restore the session from the hash.
    // Silently ignores stale or malformed hashes (decodeSession returns null).
    // Hash is cleared from the address bar after a successful load so subsequent
    // reloads don't re-apply the same session.
    const HASH_PREFIX = '#session=';
    const hash = window.location.hash;
    if (hash.startsWith(HASH_PREFIX)) {
      const encoded = hash.slice(HASH_PREFIX.length);
      const saved = decodeSession(encoded);
      if (saved !== null) {
        applyLoadedSession(saved);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  onDestroy(() => {
    if (unsubStore !== null) {
      unsubStore();
      unsubStore = null;
    }
  });

  // ── Layer overlay button handlers ────────────────────────────────────────
  // OD-1 resolution: DOM overlay with solo/mute/delete buttons.
  // Prototype: wireLayerCtl() lines 1343–1350.

  function handleLayerSolo() {
    const li = hoveredLayerIndex;
    sessionStore.update((state) => {
      const layers = state.rhythm.layers.map((layer, idx) => {
        if (idx !== li) return layer;
        return { ...layer, solo: layer.solo !== true };
      });
      return { ...state, rhythm: { ...state.rhythm, layers } };
    });
    buildRhythmScene(get(sessionStore));
    requeueLive();
  }

  function handleLayerMute() {
    const li = hoveredLayerIndex;
    sessionStore.update((state) => {
      const layers = state.rhythm.layers.map((layer, idx) => {
        if (idx !== li) return layer;
        return { ...layer, muted: layer.muted !== true };
      });
      return { ...state, rhythm: { ...state.rhythm, layers } };
    });
    buildRhythmScene(get(sessionStore));
    requeueLive();
  }

  function handleLayerDelete() {
    const li = hoveredLayerIndex;
    hoveredLayerIndex = -1;
    sessionStore.update((state) => {
      const layers = state.rhythm.layers.filter((_, idx) => idx !== li);
      return { ...state, rhythm: { ...state.rhythm, layers } };
    });
    buildRhythmScene(get(sessionStore));
    requeueLive();
  }
</script>

<!--
  Phase 04 step 04.3: Header component at top of flex-column layout.
  Replaces the inline prototype <header class="glass"> (lines 358–395).
-->
<Header />

<!--
  OD-3 resolution: div#stage is the PIXI mount target.
  Phase 04 step 04.3: changed from position:fixed full-screen to flex:1 within #app.
  Phase 04 step 04.4: HarmonyControls and RhythmControls overlays placed inside #stage.
  Phase 04 step 04.5: Hud, Legend, Tooltip overlays added inside #stage.
  PIXI's resizeTo tracks this div. The <canvas> is appended inside by initStage.
-->
<div id="stage" bind:this={stageEl}>
  <!--
    Harmony view overlay: chord-mode segmented control.
    Shown only when $sessionStore.view === 'harmony' (prototype #harmonyCtl).
    position:absolute inside #stage (prototype .orbit-ctl lines 316–319).
  -->
  <HarmonyControls />

  <!--
    Rhythm view overlay: morph toggle + euclidean controls.
    Shown only when $sessionStore.view === 'rhythm' (prototype #orbitCtl).
    position:absolute inside #stage (prototype .orbit-ctl lines 316–319).
  -->
  <RhythmControls />

  <!--
    Voice-leading HUD: top-left of #stage, shown after each chord pick.
    Prototype: .hud#hud (lines 409–412, CSS lines 111–117).
    Props driven by $hudStore (written by tonnetz-scene.ts pickChord).
  -->
  <Hud title={$hudStore.title} sub={$hudStore.sub} visible={$hudStore.visible} />

  <!--
    Tonal-function color legend: top-right of #stage, harmony view only.
    Prototype: .legend#legend (lines 414–421, CSS lines 122–127).
    Internally reads $sessionStore.view to show/hide itself.
  -->
  <Legend />

  <!--
    Stage hint: bottom-left of #stage, static instructional text.
    Prototype: .hint#stageHint (line 423, CSS lines 119–120).
  -->
  <div class="hint">{$hudStore.hint}</div>
</div>

<!--
  DOM overlay for layer controls (OD-1 resolution).
  Shown when hoveredLayerIndex >= 0 (a rhythm layer is near the pointer).
  Positioned near the pointer via overlayX / overlayY.
  Prototype: div#layerCtl (lines 328–337, CSS lines 328–337).
  Phase 04 step 04.5: updated to match prototype #layerCtl glass styling.
-->
{#if hoveredLayerIndex >= 0}
  <div
    class="layer-ctl"
    style="left: {overlayX}px; top: {overlayY}px;"
    on:pointerenter={cancelHideOverlay}
    on:pointerleave={() => {
      // Cursor left the overlay; hide immediately.
      hoveredLayerIndex = -1;
    }}
    role="toolbar"
    aria-label="Layer controls"
  >
    <!--
      Solo button: active state when layer.solo === true.
      Prototype: button[data-a="solo"].on { background:var(--subdom); color:#0b0d12 } (line 335).
    -->
    <button
      class:on={$sessionStore.rhythm.layers[hoveredLayerIndex]?.solo === true}
      data-a="solo"
      title="sonar sola (solo)"
      on:click={handleLayerSolo}>S</button
    >
    <!--
      Mute button: active state when layer.muted === true.
      Prototype: button[data-a="mute"].on { background:var(--dom); color:#0b0d12 } (line 336).
    -->
    <button
      class:on={$sessionStore.rhythm.layers[hoveredLayerIndex]?.muted === true}
      data-a="mute"
      title="silenciar (mute)"
      on:click={handleLayerMute}>M</button
    >
    <!--
      Delete button: prototype line 337 hover → rgba(232,123,172,.4).
    -->
    <button data-a="del" title="eliminar órbita" on:click={handleLayerDelete}>🗑</button>
  </div>
{/if}

<!--
  Phase 04 step 04.3: Transport component at bottom of flex-column layout.
  Replaces the prototype <footer class="glass"> (lines 484–513).
  Includes now-playing pill, engine buttons, BPM slider, and tap-tempo.
  Phase 04 step 04.4: ProgressionChips inserted via slot (prototype .prog lines 505–508).
-->
<Transport>
  <ProgressionChips />
</Transport>

<!--
  Code drawer: fixed position, slides up from bottom on toggle.
  Prototype #codeTab + #codeDrawer (lines 516–528, CSS lines 237–249).
  position:fixed so it renders outside the flex column layout.
-->
<CodeDrawer />

<!--
  Composition drawer: fixed position, slides up from bottom on toggle.
  Prototype #compTab + #compDrawer (lines 530–574, CSS lines 251–314, JS lines 1927–2127).
  position:fixed so it renders outside the flex column layout.
  Tab positioned to the right of the code drawer tab (left: calc(50% + 130px)).
-->
<CompositionDrawer />

<!--
  Agent panel: tab + slide-in aside, fixed position relative to viewport.
  Prototype #agentTab + #agent (HTML lines 456–481, CSS lines 130–177).
  Phase 06 step 06.4.
-->
<AgentPanel />

<!--
  Persistence panel: floating button + slide-in panel for save/load/share.
  Phase 07 step 07.4.
-->
<PersistencePanel />

<!--
  Global tooltip: tracks [data-tip] elements across the whole document.
  Prototype: <div id="tip"></div> (line 576) + tooltip JS (lines 2128–2148).
  position:fixed z-index:60 — renders above all other elements.
-->
<Tooltip />

<style>
  /*
   * div#stage: PIXI canvas container.
   * Phase 04 step 04.3: changed from position:fixed full-screen to flex:1 within
   * #app flex column, with margin and border-radius matching prototype line 106.
   * Prototype: #stage { position:relative; flex:1; margin:10px 12px; border-radius:22px; overflow:hidden; }
   * OD-3 resolution: PIXI's resizeTo tracks this div.
   */
  #stage {
    position: relative;
    flex: 1;
    margin: 10px 12px;
    border-radius: 22px;
    overflow: hidden;
    min-height: 0; /* prevent flex child overflow */
  }

  /*
   * Stage hint: bottom-left of #stage, static instructional text.
   * Prototype CSS lines 119–120: position:absolute, pointer-events:none.
   */
  .hint {
    position: absolute;
    bottom: 16px;
    left: 16px;
    font-size: 11.5px;
    color: var(--faint);
    font-family: 'IBM Plex Mono', monospace;
    max-width: 50%;
    pointer-events: none;
    z-index: 2;
  }

  /*
   * Layer-control overlay glass styling.
   * Phase 04 step 04.5: updated to match prototype #layerCtl (CSS lines 328–337).
   * position: fixed — tracks viewport coords (overlayX/overlayY).
   * transform: translate(-50%,-140%) matches prototype line 328 (centers above label).
   */
  .layer-ctl {
    position: fixed;
    z-index: 7;
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 11px;
    background: rgba(12, 15, 22, 0.92);
    border: 1px solid var(--stroke);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    transform: translate(-50%, -140%);
    pointer-events: all;
  }

  /*
   * Layer-control buttons base style.
   * Prototype: #layerCtl button (CSS lines 332–334).
   * width:26px; height:26px; border-radius:7px; font-size:12px; font-weight:700.
   */
  .layer-ctl button {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.05);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .layer-ctl button:hover {
    color: var(--text);
  }

  /*
   * Solo active state: subdom background.
   * Prototype line 335: #layerCtl button[data-a="solo"].on { color:#0b0d12; background:var(--subdom) }
   */
  .layer-ctl button[data-a='solo'].on {
    color: #0b0d12;
    background: var(--subdom);
    border-color: var(--subdom);
  }

  /*
   * Mute active state: dom background.
   * Prototype line 336: #layerCtl button[data-a="mute"].on { color:#0b0d12; background:var(--dom) }
   */
  .layer-ctl button[data-a='mute'].on {
    color: #0b0d12;
    background: var(--dom);
    border-color: var(--dom);
  }

  /*
   * Delete button hover: pink/warm background.
   * Prototype line 337: #layerCtl button[data-a="del"]:hover { background:rgba(232,123,172,.4) }
   */
  .layer-ctl button[data-a='del']:hover {
    color: #fff;
    background: rgba(232, 123, 172, 0.4);
    border-color: var(--dom);
  }
</style>

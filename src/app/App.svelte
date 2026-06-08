<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — root Svelte component.
  Phase 03 step 03.5: rhythm scene, radial↔linear morph, hover controls, full store wiring.
  Phase 04 step 04.3: Header and Transport components added; #stage layout changed to flex:1.
  Phase 04 step 04.4: ProgressionChips, HarmonyControls, RhythmControls, CodeDrawer added.
  Phase 04 step 04.5 will remove the temporary transport panel.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    sessionStore,
    initAudio,
    playGroove,
    playProgression,
    playSession,
    hushAll,
    setBpm,
    requeueLive,
  } from '../state/session.js';
  import Header from '../ui/Header.svelte';
  import Transport from '../ui/Transport.svelte';
  import ProgressionChips from '../ui/ProgressionChips.svelte';
  import HarmonyControls from '../ui/HarmonyControls.svelte';
  import RhythmControls from '../ui/RhythmControls.svelte';
  import CodeDrawer from '../ui/CodeDrawer.svelte';
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
    setMorphTarget,
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

  // Current morph target for the button toggle.
  let morphTarget: 0 | 1 = 0;

  // Track previous layer count to detect when to do a full rebuild vs dynamic update.
  let prevLayerCount = 0;

  // ── TEMPORARY TRANSPORT UI (Phase 02 only) ──────────────────────────────
  // These buttons are minimal wires for step 02.4 and step 02.5 smoke-testing.
  // Phase 04 will replace this entire block with the full Svelte UI.

  // Seed the store with audible defaults on first load.
  // DEFAULT_SESSION_STATE has empty layers and progression (spec §02.2).
  // We seed here rather than mutating the constant to keep the type clean.
  onMount(async () => {
    // Phase 04: start with empty session (no default rhythm seed).
    // Prototype melState.progression:[] (line 717), rhythmLayers:[] (line 815).
    // The temporary 4-on-the-floor BD seed used in Phase 02/03 smoke tests is
    // removed here per Phase 04 spec (step 04.2). Users add layers via RhythmControls.
    prevLayerCount = get(sessionStore).rhythm.layers.length;

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

      // Update BPM label if BPM changed: trigger rebuild
      // (buildRhythmScene recreates the BPM label with current state.bpm)
      // This is handled above via updateRhythmDynamic which updates label state;
      // the BPM label text is set once during buildRhythmScene and would need
      // a rebuild to change. For now we rebuild on any state change that would
      // affect the label (a future optimization can detect BPM change specifically).
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
  });

  // ── Cleanup ────────────────────────────────────────────────────────────────
  onDestroy(() => {
    if (unsubStore !== null) {
      unsubStore();
      unsubStore = null;
    }
  });

  function handleBpmInput(event: Event) {
    const target = event.target as HTMLInputElement;
    setBpm(Number(target.value));
    // Rebuild rhythm scene to update the BPM label
    buildRhythmScene(get(sessionStore));
  }

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

  // ── Morph toggle ─────────────────────────────────────────────────────────
  // A-03-06: temporary button to trigger radial↔linear morph.
  function handleMorphToggle() {
    morphTarget = morphTarget === 0 ? 1 : 0;
    setMorphTarget(morphTarget);
  }

  // ── Temporary view switch helper ─────────────────────────────────────────
  // Allows toggling between harmony and rhythm view for testing A-03-05.
  function handleViewToggle() {
    sessionStore.update((s) => ({
      ...s,
      view: s.view === 'harmony' ? 'rhythm' : 'harmony',
    }));
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
  Phase 04 step 04.4: HarmonyControls and RhythmControls overlays placed inside #stage
    (position:absolute; prototype .orbit-ctl CSS lines 316–319).
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
</div>

<!--
  DOM overlay for layer controls (OD-1 resolution).
  Shown when hoveredLayerIndex >= 0 (a rhythm layer is near the pointer).
  Positioned near the pointer via overlayX / overlayY.
  Prototype: div#layerCtl (lines 1325–1334 DOM overlay approach).
  Phase 04 will absorb this into the full Svelte UI.
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
    <button on:click={handleLayerSolo}>Solo</button>
    <button on:click={handleLayerMute}>Mute</button>
    <button on:click={handleLayerDelete}>Del</button>
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

<!-- TEMPORARY TRANSPORT PANEL — Phase 02 only; replaced in Phase 04.5 -->
<div class="transport-panel">
  <p class="transport-label">Orbifold — transport (Phase 02 temp UI)</p>

  <!-- User-gesture guard: must be clicked first to init AudioContext -->
  <button on:click={() => void initAudio()}>Init audio</button>

  <!-- Play buttons -->
  <button on:click={() => void playGroove()}>▶ Groove</button>
  <button on:click={() => void playProgression()}>▶ Progresión</button>
  <button on:click={() => void playSession()}>▶ Sesión</button>
  <button on:click={() => void hushAll()}>■ Silencio</button>

  <!-- BPM control: range 40–280, step 1, default 120 -->
  <label>
    BPM:
    <input
      type="number"
      min="40"
      max="280"
      step="1"
      value={$sessionStore.bpm}
      on:input={handleBpmInput}
    />
  </label>

  <!-- View toggle: harmony ↔ rhythm (temporary, for A-03-05 verification) -->
  <button on:click={handleViewToggle}>
    Vista: {$sessionStore.view === 'harmony' ? 'Harmony → Rhythm' : 'Rhythm → Harmony'}
  </button>

  <!-- Morph toggle: radial ↔ linear (A-03-06) -->
  {#if $sessionStore.view === 'rhythm'}
    <button on:click={handleMorphToggle}>
      Morph: {morphTarget === 0 ? 'Radial → Linear' : 'Linear → Radial'}
    </button>
  {/if}

  <!-- Now-playing label (reactive — shows what is currently audible) -->
  <p class="now-playing">
    Ahora: {$sessionStore.nowPlaying.label ?? 'silencio'}
  </p>
</div>

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
   * DOM overlay for layer controls (OD-1 resolution).
   * position: fixed so it tracks pointer coordinates in viewport space.
   * z-index: 2 — above stage (0) and transport panel (1).
   * Prototype: div#layerCtl uses position:absolute within div#stage.
   * Port uses fixed positioning with pointer clientX/clientY for simplicity.
   */
  .layer-ctl {
    position: fixed;
    z-index: 2;
    background: rgba(11, 13, 18, 0.9);
    border: 1px solid #39404f;
    border-radius: 6px;
    padding: 4px 8px;
    display: flex;
    gap: 6px;
    align-items: center;
    pointer-events: all;
  }

  .layer-ctl button {
    background: #232734;
    border: 1px solid #39404f;
    color: #cfd6e6;
    font-family: system-ui, sans-serif;
    font-size: 0.75rem;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
  }

  .layer-ctl button:hover {
    background: #39404f;
  }

  /*
   * Transport panel floats above the PIXI canvas.
   * position: relative with z-index: 1 renders it on top of #stage (z-index: 0).
   * Phase 04 will replace this layout entirely.
   */
  .transport-panel {
    position: relative;
    z-index: 1;
    font-family: system-ui, sans-serif;
    padding: 1rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .transport-label {
    width: 100%;
    margin: 0;
    font-size: 0.75rem;
    color: #888;
  }
  .now-playing {
    width: 100%;
    margin: 0;
    font-size: 0.875rem;
  }
</style>

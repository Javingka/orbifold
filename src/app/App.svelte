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
  import type { Sound } from '../core/rhythm/layers.js';
  import { hudStore } from '../state/hud.js';
  import Header from '../ui/Header.svelte';
  import Transport from '../ui/Transport.svelte';
  import ProgressionStrip from '../ui/ProgressionStrip.svelte';
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
  // Phase 11 step 11.4: i18n store for Wave A string extraction.
  import { t } from '../i18n/index.js';
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
  import {
    initPentagrama,
    destroyPentagrama,
    setPentagramaVisible,
  } from '../render/pentagrama-scene.js';

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
      showSoundPicker = -1; // Phase 09 step 09.3: close picker when overlay hides
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

  // Phase 10 redesign (step 10.11): the Canvas 2D pentagrama-scene redraws on
  // every rAF frame, so no progression-tracking variables are needed here.
  // prevProgressionLength / prevOctave / prevTotalBars / prevChordMode /
  // prevProgressionKey removed (were used for buildHarmonyStaffScene rebuild
  // detection, which is now retired per ADR 0015 D1).

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

    // Phase 10 redesign (step 10.11, ADR 0015 D7): initialise the Canvas 2D
    // Pentagrama layer after PIXI's stage is ready. The canvas is appended to
    // stageEl with display:none; pointer-events:none until setPentagramaVisible
    // is called by the store subscription below.
    initPentagrama(stageEl);

    // Wire the resize callback: rebuild both scenes when the window is resized.
    // Prototype lines 935–943: resize calls buildTonnetz() and buildRhythmScene().
    // Phase 10 redesign: harmony-staff-scene rebuild removed; Canvas 2D layer uses
    // ResizeObserver internally (no explicit rebuild call needed).
    onResize(() => {
      buildTonnetz(get(sessionStore));
      buildRhythmScene(get(sessionStore));
      // After rebuild, restore dynamic overlays.
      updateTonnetzDynamic(get(sessionStore));
    });

    // ── Step 03.4: register ticker ─────────────────────────────────────────
    // Prototype: app.ticker.add(tick) at line 931.
    registerTicker(app);
    // Phase 10 redesign (step 10.11): tickHarmonyStaff removed (PIXI staff
    // scene retired per ADR 0015 D1). The Canvas 2D rAF loop in pentagrama-scene.ts
    // is browser-native and does not require PIXI ticker registration.

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

      // Phase 10 redesign (step 10.11, ADR 0015 D7): show/hide the Canvas 2D
      // Pentagrama layer based on current view + subview. The Canvas 2D rAF loop
      // redraws every frame — no rebuild dispatch needed here.
      setPentagramaVisible(state.view === 'harmony' && state.harmony.subview === 'staff');
    });

    // ── Canvas pointer routing ─────────────────────────────────────────────
    // Prototype: app.view.addEventListener('pointerdown', onStagePointer) at line 2157.
    const canvas = app.view as HTMLCanvasElement;

    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const state = get(sessionStore);
      if (state.view === 'harmony') {
        // Phase 10 redesign (step 10.11): staff sub-view pointer events are handled
        // directly by the Canvas 2D element (pentagrama-scene.ts D6 wiring).
        // When subview === 'staff' the Canvas 2D canvas (z-index:1) sits above the
        // PIXI canvas and receives events directly; no routing needed here.
        if (state.harmony.subview === 'tonnetz') {
          // Tonnetz sub-view: route to Tonnetz chord picker.
          tonnetzPointerDown(e);
        }
      } else if (state.view === 'rhythm') {
        rhythmPointerDown(e);
      } else {
        // 'composition', 'code', 'session': PIXI canvas is hidden for these views
        // (stage.ts setView hides both layers); no pointer routing needed.
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

    // Pointer move: rhythm hover layer detection.
    // Prototype: app.view.addEventListener('pointermove', onStageHover) at line 2159.
    // Phase 10 redesign (step 10.11): staff pointermove removed from PIXI canvas routing.
    // The Canvas 2D element (pentagrama-scene.ts) handles its own pointermove directly.
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
    // Phase 10 redesign (step 10.11, ADR 0015 D7): destroy Canvas 2D layer on
    // component teardown — cancels rAF, disconnects ResizeObserver, removes canvas.
    destroyPentagrama();
  });

  // ── Sound picker state (Phase 09 step 09.3) ──────────────────────────────
  // -1 = picker closed; >= 0 = picker open for that layer index.
  let showSoundPicker = -1;

  // Fix 1: bind ref to .layer-ctl so toggleSoundPicker can read its bounding rect.
  let layerCtlEl: HTMLDivElement | null = null;
  // true = dropdown opens downward (overlay is in upper half of viewport).
  let pickerDropsDown = false;

  // Grouped sound palette — mirrors SK_SOUNDS expansion in step 09.1.
  // Abstract palette names only (ADR 0025 D1, AG-D1 seam invariant).
  const SOUNDS_GROUPED = [
    {
      label: 'Drum kit',
      sounds: ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'] as Sound[],
    },
    {
      label: 'Percussion',
      sounds: ['conga', 'cajon', 'wood', 'shaker', 'cb', 'perc', 'hand'] as Sound[],
    },
  ] as const;

  function toggleSoundPicker(layerIdx: number): void {
    const layer = $sessionStore.rhythm.layers[layerIdx];
    if (!layer || (layer.locked && $sessionStore.autopilot.enabled)) return; // only block when autopilot is running
    if (showSoundPicker === layerIdx) {
      showSoundPicker = -1;
      return;
    }
    // Fix 1: determine open direction from the actual element bounding rect, not
    // from overlayY. The overlay is already translated -140% upward by CSS, so an
    // orbit near the TOP produces a small overlayY (< innerHeight/2) while the
    // rendered overlay is already near the top of the viewport. Reading the actual
    // rect gives us the true rendered position of the overlay.
    if (layerCtlEl !== null) {
      const rect = layerCtlEl.getBoundingClientRect();
      pickerDropsDown = rect.top < window.innerHeight / 2;
    }
    showSoundPicker = layerIdx;
  }

  function handleChangeLayerSound(layerIdx: number, newSound: Sound): void {
    sessionStore.update((s) => {
      const newLayers = [...s.rhythm.layers];
      newLayers[layerIdx] = { ...newLayers[layerIdx], sound: newSound };
      return { ...s, rhythm: { ...s.rhythm, layers: newLayers } };
    });
    showSoundPicker = -1;
    requeueLive();
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
</script>

<!--
  Phase 09 step 09.3: close sound picker on outside click.
  The PIXI canvas captures pointer events, so we use a window-level click handler
  rather than a document-level handler, to catch clicks outside the overlay.
-->
<svelte:window
  on:click={() => {
    showSoundPicker = -1;
  }}
/>

<!--
  Phase 04 step 04.3: Header component at top of flex-column layout.
  Replaces the inline prototype <header class="glass"> (lines 358–395).
  Phase 09 step 09.4: Header now shows 4-tab primary nav (ADR 0013 D1).
-->
<Header />

<!--
  OD-3 resolution: div#stage is the PIXI mount target.
  Phase 04 step 04.3: changed from position:fixed full-screen to flex:1 within #app.
  Phase 04 step 04.4: HarmonyControls and RhythmControls overlays placed inside #stage.
  Phase 04 step 04.5: Hud, Legend, Tooltip overlays added inside #stage.
  Phase 09 step 09.4: Composición and Código Strudel primary views are mounted inside
    #stage via {#if} gates (ADR 0013 D2 Option D1). The PIXI <canvas> stays in the DOM
    for all views; stage.ts hides both PIXI layers for 'composition' and 'code' views.
    The stage uses display:flex; flex-direction:column so the elevated views fill it.
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
    Phase 09 step 09.5: RhythmControls is now an empty shell (ADR 0013 D3).
    All rhythm controls moved to Header.svelte. Component retained here to
    avoid breaking the import; it renders nothing.
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
    Stage hint: bottom-left of #stage, view-and-subview-gated instructional text.
    Prototype: .hint#stageHint (line 423, CSS lines 119–120).
    Phase 09 step 09.4 (ADR 0013 D5): extended to cover all four primary views:
      - harmony + tonnetz → Tonnetz instruction (from hudStore.hint)
      - harmony + staff   → Pentagrama instruction
      - rhythm            → Rhythm instruction (new branch, A-09-11)
      - composition / code → no canvas hint (built-in labels in their components)
  -->
  {#if $sessionStore.view === 'harmony'}
    {#if $sessionStore.harmony.subview === 'tonnetz'}
      <div class="hint">{$hudStore.hint ? $t($hudStore.hint) : ''}</div>
    {:else}
      <div class="hint">
        {$t('app.hint.staff')}
      </div>
    {/if}
  {:else if $sessionStore.view === 'rhythm'}
    <div class="hint">
      {$t('app.hint.rhythm')}
    </div>
  {/if}

  <!--
    Composición primary view (ADR 0013 D2 Option D1).
    Mounted when view === 'composition'; unmounted on view change.
    CompositionDrawer fills #stage via flex:1 + height:100% CSS.
    rAF loop restarts cleanly on each mount (open=true in onMount).
  -->
  {#if $sessionStore.view === 'composition'}
    <CompositionDrawer />
  {/if}

  <!--
    Código Strudel primary view (ADR 0013 D2 Option D1).
    Mounted when view === 'code'; unmounted on view change.
    CodeDrawer fills #stage via flex:1 + height:100% CSS.
  -->
  {#if $sessionStore.view === 'code'}
    <CodeDrawer />
  {/if}
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
    bind:this={layerCtlEl}
    style="left: {overlayX}px; top: {overlayY}px;"
    on:pointerenter={cancelHideOverlay}
    on:pointerleave={() => {
      // Fix 3: use the same debounced timer as the canvas pointerleave so the
      // cursor has 400 ms to travel to the dropdown before it disappears.
      // (Previously this hid immediately, causing flicker when crossing the gap.)
      scheduleHideOverlay();
    }}
    role="toolbar"
    aria-label={$t('app.layerCtl.ariaLabel')}
  >
    <!--
      Phase 09 step 09.3: Sound switcher button (leftmost in overlay).
      Shows the current sound name for the hovered layer.
      Locked layers: button is dimmed and inert (no picker opens).
      Free layers: click opens a grouped dropdown to switch the sound.
    -->
    {#if showSoundPicker === hoveredLayerIndex}
      <div
        class="sound-picker-dropdown"
        class:dropup={pickerDropsDown}
        on:click|stopPropagation={() => {
          /* prevent svelte:window close */
        }}
        on:keydown|stopPropagation={() => {
          /* prevent svelte:window close */
        }}
        role="menu"
        aria-label="Choose sound"
        tabindex="-1"
      >
        {#each SOUNDS_GROUPED as group}
          <div class="sound-group-label">{group.label}</div>
          {#each group.sounds as s}
            <button
              class="sound-option"
              class:active={s === $sessionStore.rhythm.layers[hoveredLayerIndex]?.sound}
              aria-pressed={s === $sessionStore.rhythm.layers[hoveredLayerIndex]?.sound}
              on:click|stopPropagation={() => handleChangeLayerSound(hoveredLayerIndex, s)}
              >{s}</button
            >
          {/each}
        {/each}
      </div>
    {/if}
    <button
      class="sound-btn"
      title={$sessionStore.rhythm.layers[hoveredLayerIndex]?.locked &&
      $sessionStore.autopilot.enabled
        ? 'Sound locked (recipe — autopilot active)'
        : 'Change sound: ' + ($sessionStore.rhythm.layers[hoveredLayerIndex]?.sound ?? '?')}
      style={$sessionStore.rhythm.layers[hoveredLayerIndex]?.locked &&
      $sessionStore.autopilot.enabled
        ? 'opacity:0.5;cursor:default'
        : ''}
      on:click|stopPropagation={() => toggleSoundPicker(hoveredLayerIndex)}
      >{$sessionStore.rhythm.layers[hoveredLayerIndex]?.sound ?? '?'}</button
    >

    <!--
      Solo button: active state when layer.solo === true.
      Prototype: button[data-a="solo"].on { background:var(--subdom); color:#0b0d12 } (line 335).
    -->
    <button
      class:on={$sessionStore.rhythm.layers[hoveredLayerIndex]?.solo === true}
      data-a="solo"
      title={$t('app.layerCtl.soloTitle')}
      on:click={handleLayerSolo}>{$t('app.layerCtl.soloKey')}</button
    >
    <!--
      Mute button: active state when layer.muted === true.
      Prototype: button[data-a="mute"].on { background:var(--dom); color:#0b0d12 } (line 336).
    -->
    <button
      class:on={$sessionStore.rhythm.layers[hoveredLayerIndex]?.muted === true}
      data-a="mute"
      title={$t('app.layerCtl.muteTitle')}
      on:click={handleLayerMute}>{$t('app.layerCtl.muteKey')}</button
    >
    <!--
      Delete button: prototype line 337 hover → rgba(232,123,172,.4).
    -->
    <button data-a="del" title={$t('app.layerCtl.deleteTitle')} on:click={handleLayerDelete}
      >🗑</button
    >
  </div>
{/if}

<!--
  Phase 03 step 03.4: ProgressionStrip relocated to its own full-width row above
  the Transport footer. This clears the #sessionsBtn fixed button (position:fixed;
  bottom:24px; right:14px) which previously overlapped the strip's rightmost content
  when the strip was inside the Transport footer.
  The strip is no longer passed via the Transport <slot>; Transport renders with an
  empty slot (the <slot /> line in Transport.svelte renders nothing).
-->
<div class="progression-row">
  <ProgressionStrip />
</div>

<!--
  Phase 04 step 04.3: Transport component at bottom of flex-column layout.
  Replaces the prototype <footer class="glass"> (lines 484–513).
  Includes now-playing pill, engine buttons, BPM slider, and tap-tempo.
  Phase 04 step 04.4: ProgressionChips inserted via slot (prototype .prog lines 505–508).
  Phase 01 step 01.3: ProgressionStrip was mounted here via slot; moved to
    .progression-row above in Phase 03 step 03.4. Transport slot now renders nothing.
-->
<Transport />

<!--
  Phase 09 step 09.4: CodeDrawer and CompositionDrawer moved inside #stage above
  (gated by {#if} blocks). Removed from outside the flex column layout — they are
  no longer position:fixed overlays; they now fill the stage as primary views.
  ADR 0013 D2 Option D1.
-->

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
   * Phase 03 step 03.4: ProgressionStrip own-row above Transport footer.
   * Full-width flex row; padding matches Transport footer left/right margin (12px).
   * box-sizing: border-box ensures padding does not add to the 100% width.
   * align-items: stretch lets ProgressionStrip fill the row height.
   * The strip is no longer inside the footer's flex-wrap row, so it no longer
   * risks being occluded by the #sessionsBtn fixed button.
   */
  .progression-row {
    display: flex;
    align-items: stretch;
    padding: 0 12px 4px;
    box-sizing: border-box;
    width: 100%;
  }

  /*
   * div#stage: PIXI canvas container + primary view host.
   * Phase 04 step 04.3: changed from position:fixed full-screen to flex:1 within
   * #app flex column, with margin and border-radius matching prototype line 106.
   * Phase 09 step 09.4: #stage layout unchanged (position:relative, no flex-direction).
   * The PIXI <canvas> fills #stage via PIXI's resizeTo mechanism.
   * The primary-view components (CompositionDrawer, CodeDrawer) use
   * position:absolute; inset:0 in their own CSS to cover the canvas area
   * (see their respective component <style> blocks).
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

  /*
   * Phase 09 step 09.3: Sound switcher button + dropdown.
   * The sound-btn is the leftmost button in the overlay (before Solo).
   * Shows the current layer's abstract sound name.
   * Locked layers: opacity 0.5, cursor default (set via inline style).
   */
  .sound-btn {
    min-width: 36px;
    width: auto;
    padding: 0 5px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 0;
  }

  /*
   * Sound picker dropdown: a glass panel that floats above (or below) the overlay.
   * Fix 1: max-height + overflow-y so it never clips even if position is slightly off.
   * Fix 2: grid layout (2 columns) for uniform badge appearance.
   * Fix 3: bottom: calc(100% + 0px) — no gap between overlay and dropdown so the
   *   cursor does not fall through. The ::before pseudo-element extends 6px outward
   *   to catch the cursor even if there is sub-pixel rounding.
   *
   * Note: .layer-ctl has transform: translate(-50%, -140%), so position:absolute
   * children are relative to the overlay's own size. The dropdown uses position:absolute
   * relative to .layer-ctl.
   */
  .sound-picker-dropdown {
    position: absolute;
    bottom: calc(100% + 0px);
    left: 0;
    background: #1a1c23;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    padding: 8px;
    z-index: 200;
    min-width: 180px;
    display: grid;
    grid-template-columns: repeat(2, minmax(78px, 1fr));
    gap: 3px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    max-height: min(260px, 45vh);
    overflow-y: auto;
  }

  /* Fix 3: transparent extension below the dropdown covers any sub-pixel gap. */
  .sound-picker-dropdown::before {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 0;
    right: 0;
    height: 6px;
  }

  /*
   * Fix 1: corrected flip class.
   * pickerDropsDown === true means the overlay is in the upper viewport half,
   * so the dropdown opens downward (top: calc(100% + 0px)).
   */
  .sound-picker-dropdown.dropup {
    bottom: auto;
    top: calc(100% + 0px);
  }

  /* Fix 3: when opening downward the extension must be above the dropdown. */
  .sound-picker-dropdown.dropup::before {
    bottom: auto;
    top: -6px;
    height: 6px;
  }

  /*
   * Fix 2: group label spans both grid columns.
   */
  .sound-group-label {
    grid-column: 1 / -1;
    font-size: 9px;
    color: rgba(255, 255, 255, 0.35);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 4px 4px 2px;
    user-select: none;
  }

  /*
   * Fix 2: uniform badge cell — each sound option is the same size regardless
   * of label length. Two columns mean 16 sounds fit in ~8 rows (~120–140px).
   */
  .sound-option {
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 5px;
    color: rgba(255, 255, 255, 0.8);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 6px;
    cursor: pointer;
    transition:
      background 0.12s,
      border-color 0.12s;
    white-space: nowrap;
  }

  .sound-option:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }

  .sound-option.active {
    background: rgba(138, 160, 255, 0.18);
    border-color: rgba(138, 160, 255, 0.4);
    color: #8aa0ff;
  }
</style>

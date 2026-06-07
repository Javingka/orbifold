<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — root Svelte component.
  Phase 03 step 03.4: Tonnetz interactivity, P·L·R highlights, voice-leading animation.
  Phase 04 will replace the temporary transport buttons below with the full UI.
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
  } from '../state/session.js';
  import { get } from 'svelte/store';
  import { initStage, onResize, setView } from '../render/stage.js';
  import {
    buildTonnetz,
    buildRhythmScene,
    updateTonnetzDynamic,
    onStagePointerDown,
    registerTicker,
  } from '../render/tonnetz-scene.js';

  // ── State ─────────────────────────────────────────────────────────────────
  let stageEl: HTMLDivElement;

  // Store-subscription unsubscribe handle (cleaned up in onDestroy).
  let unsubStore: (() => void) | null = null;

  // ── TEMPORARY TRANSPORT UI (Phase 02 only) ──────────────────────────────
  // These buttons are minimal wires for step 02.4 and step 02.5 smoke-testing.
  // Phase 04 will replace this entire block with the full Svelte UI.

  // Seed the store with audible defaults on first load.
  // DEFAULT_SESSION_STATE has empty layers and progression (spec §02.2).
  // We seed here rather than mutating the constant to keep the type clean.
  onMount(async () => {
    sessionStore.update((s) => ({
      ...s,
      // Minimal default rhythm: 4-on-the-floor BD (prototype pattern used in
      // smoke tests). Steps array: 16-step, hits on 0/4/8/12.
      rhythm: {
        layers: [
          {
            sound: 'bd',
            steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
          },
        ],
      },
      // Minimal default harmony: C major one-chord progression.
      // rootPc=0 (C), qual='maj', gain=0.6 (prototype default lines 758–763).
      harmony: {
        ...s.harmony,
        progression: [{ rootPc: 0, qual: 'maj' as const, gain: 0.6 }],
      },
    }));

    // OD-3 resolution: PIXI targets div#stage full-screen wrapper.
    // initStage appends app.view inside stageEl and registers resize handler.
    const app = await initStage(stageEl);
    if (app === null) {
      // ADR 0006: WebGL unavailable — fallback message shown inside stageEl by initStage.
      return;
    }

    // ── Initial scene build ────────────────────────────────────────────────
    // Build Tonnetz static geometry immediately after stage init.
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
    // Call updateTonnetzDynamic once to establish _lastPick / NR / suggestions
    // from the seeded progression (C major chord).
    updateTonnetzDynamic(get(sessionStore));

    // ── Step 03.4: store subscription for reactive updates ─────────────────
    // Subscribe to sessionStore: drive dynamic scene updates when state changes.
    // Prototype: reactive updates are triggered by DOM mutations / direct calls
    // in the prototype; the port uses Svelte store subscription.
    // Per ADR 0004: App.svelte is the coordinator; scene modules do NOT import
    // sessionStore directly.
    unsubStore = sessionStore.subscribe((state) => {
      // Update P·L·R highlights and suggestion triangles when harmony changes.
      updateTonnetzDynamic(state);
      // Update layer visibility when view changes.
      setView(state.view);
    });

    // ── Step 03.4: canvas pointerdown → chord pick ─────────────────────────
    // Prototype: app.view.addEventListener('pointerdown', onStagePointer) at line 2157.
    // Port: event wired here from App.svelte so scene modules stay DOM-free
    // (the scene module receives the PointerEvent, not the canvas directly).
    const canvas = app.view as HTMLCanvasElement;
    canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      const state = get(sessionStore);
      if (state.view === 'harmony') {
        onStagePointerDown(e);
      }
      // Rhythm view pointer handling deferred to step 03.5.
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
  }
</script>

<!--
  OD-3 resolution: div#stage is the full-screen PIXI mount target.
  PIXI's resizeTo tracks this div. z-index: 0 keeps it behind the transport panel.
  The <canvas id="pixi-canvas"> stub from Phase 02 is replaced by this div;
  PIXI appends its own canvas element inside it via initStage.
-->
<div id="stage" bind:this={stageEl}></div>

<!-- TEMPORARY TRANSPORT PANEL — Phase 02 only; replaced in Phase 04 -->
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

  <!-- Now-playing label (reactive — shows what is currently audible) -->
  <p class="now-playing">
    Ahora: {$sessionStore.nowPlaying.label ?? 'silencio'}
  </p>
</div>

<style>
  /*
   * div#stage: full-screen PIXI canvas container.
   * position: fixed so it covers the entire viewport regardless of body scroll.
   * z-index: 0 — sits behind the transport panel overlay.
   * OD-3 resolution: matches prototype div#stage geometry (line 906 resizeTo target).
   */
  #stage {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    overflow: hidden;
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

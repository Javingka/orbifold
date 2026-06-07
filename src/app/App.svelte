<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — root Svelte component.
  Phase 03 step 03.2: PIXI stage initialized; blank canvas visible.
  Phase 04 will replace the temporary transport buttons below with the full UI.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    sessionStore,
    initAudio,
    playGroove,
    playProgression,
    playSession,
    hushAll,
    setBpm,
  } from '../state/session.js';
  import { initStage } from '../render/stage.js';

  // ── State ─────────────────────────────────────────────────────────────────
  let stageEl: HTMLDivElement;

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

    // Step 03.3 will call buildTonnetz(get(sessionStore)) here.
    // Step 03.4 will call registerTicker(app) here.
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

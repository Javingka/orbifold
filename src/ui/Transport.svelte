<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — Transport component.

  Ports prototype <footer class="glass"> (lines 484–513 HTML; CSS lines 180–222).
  BPM slider + readout (lines 499–503).
  Tap-tempo logic (lines 671–691).

  Store reads:
    $sessionStore.nowPlaying   — now-playing pill label + source
    $sessionStore.bpm          — BPM value for slider readout

  Store writes (via session.ts actions):
    playGroove()       — ▶ Ritmo button
    playProgression()  — ▶ Armonía button
    playSession()      — ▶ Sesión button
    hushAll()          — ■ silencio button
    setBpm(bpm)        — BPM slider + tap-tempo

  No direct audio import — all audio via session.ts lazy pattern.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    sessionStore,
    playGroove,
    playProgression,
    playSession,
    hushAll,
    setBpm,
  } from '../state/session.js';
  import LatencyCalibration from './LatencyCalibration.svelte';

  // ── BPM conversion helpers ─────────────────────────────────────────────────
  // Prototype: cpsToBpm (line 644), bpmToCps (line 645).
  function cpsToBpm(c: number): number {
    return Math.round(c * 240);
  }
  function bpmToCps(b: number): number {
    return b / 240;
  }

  // CPS slider value (derived from store BPM; updated reactively).
  // We keep a local cpsValue string to drive the range input without a
  // feedback loop (bind:value + on:input would create one).
  let cpsValue: string = String(bpmToCps($sessionStore.bpm));

  // Keep slider in sync when BPM changes via tap-tempo or external updates.
  $: cpsValue = String(bpmToCps($sessionStore.bpm));

  // ── BPM slider handler ─────────────────────────────────────────────────────
  // Prototype: cps input event (line 669): setBpm(cpsToBpm(+e.target.value), { fromSlider:true })
  function handleCpsInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    setBpm(cpsToBpm(parseFloat(target.value)));
  }

  // ── Tap-tempo logic ────────────────────────────────────────────────────────
  // Prototype: tapTimes[], registerTap() (lines 672–691).
  // Local state: not in sessionStore (transient accumulator).
  let tapTimes: number[] = [];
  let tapFlash = false;

  function registerTap(): void {
    const now = performance.now();
    // Reset if gap > 2 s. Prototype line 676.
    if (tapTimes.length > 0 && now - tapTimes[tapTimes.length - 1] > 2000) {
      tapTimes = [];
    }
    tapTimes.push(now);
    // Keep last 6. Prototype line 678.
    if (tapTimes.length > 6) tapTimes.shift();
    // Flash the button. Prototype line 679.
    tapFlash = true;
    setTimeout(() => {
      tapFlash = false;
    }, 90);
    // Compute BPM if ≥ 2 taps. Prototype lines 680–684.
    if (tapTimes.length >= 2) {
      let sum = 0;
      for (let i = 1; i < tapTimes.length; i++) {
        sum += tapTimes[i] - tapTimes[i - 1];
      }
      const avg = sum / (tapTimes.length - 1);
      setBpm(Math.round(60000 / avg));
    }
  }

  // ── Space-bar tap ─────────────────────────────────────────────────────────
  // Prototype: keydown listener (lines 687–691).
  // Guard: skip if focus is on INPUT, TEXTAREA, or SELECT.
  function handleKeydown(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      const active = document.activeElement;
      if (active !== null && /INPUT|TEXTAREA|SELECT/.test(active.tagName)) return;
      event.preventDefault();
      registerTap();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<!--
  Prototype: <footer class="glass"> (line 485).
  CSS: footer { display:flex; align-items:center; gap:16px; padding:11px 18px;
       margin:0 12px 10px; border-radius:18px; flex-wrap:wrap; } (lines 181–182).
-->
<footer class="glass">
  <!--
    Now-playing pill. Prototype: .now#nowPlaying (lines 486–489).
    .live class when source !== null (pulsing dot, green).
    Prototype CSS lines 206–211.
  -->
  <div class="now" id="nowPlaying" class:live={$sessionStore.nowPlaying.source !== null}>
    <span class="dot"></span>
    <div>
      <div class="nlbl">sonando</div>
      <div class="nval" id="nowLabel">
        {$sessionStore.nowPlaying.label ?? 'silencio'}
      </div>
    </div>
  </div>

  <!-- Engine label. Prototype: .eng-lbl "tocar" (line 491). -->
  <span class="eng-lbl">tocar</span>

  <!--
    Engine buttons group. Prototype: .engines (lines 492–496).
    ▶ Ritmo, ▶ Armonía, ▶ Sesión.
    CSS: .engines, .ebtn, .play-session (lines 192–205, 183–190).
  -->
  <div class="engines">
    <button
      class="ebtn rhythm"
      id="rhythmPlay"
      title="Suena SOLO el groove (motor rítmico)"
      on:click={() => void playGroove()}
    >
      ▶ Ritmo
    </button>
    <button
      class="ebtn harmony"
      id="progPlay"
      title="Suena SOLO la progresión de acordes (motor armónico)"
      on:click={() => void playProgression()}
    >
      ▶ Armonía
    </button>
    <button
      class="play-session"
      id="sessionPlay"
      title="Combina ritmo + armonía en un solo stack() y los toca juntos"
      on:click={() => void playSession()}
    >
      ▶ Sesión <span class="mini">ritmo + armonía</span>
    </button>
  </div>

  <!--
    Silence button. Prototype: .tbtn.warm#hushBtn (line 497).
    CSS: .tbtn.warm { color:var(--dom); border-color:rgba(232,123,172,.4); } (line 215).
  -->
  <button class="tbtn warm" id="hushBtn" on:click={() => void hushAll()}> ■ silencio </button>

  <!--
    BPM slider + readout + tap-tempo.
    Prototype: .tempo div (lines 499–503).
    range input: min 0.166 max 1.166 step 0.001 (cps units).
    bpmReadout: shows integer BPM (cps * 240).
    CSS: .tempo, .bpm, .unit, .taptempo (lines 216–222).
  -->
  <div class="tempo">
    <input
      type="range"
      id="cps"
      min="0.166"
      max="1.166"
      step="0.001"
      value={cpsValue}
      on:input={handleCpsInput}
    />
    <span class="bpm" id="bpmReadout">{$sessionStore.bpm}</span>
    <span class="unit">BPM</span>
    <button
      class="taptempo"
      id="tapBtn"
      class:flash={tapFlash}
      on:click={registerTap}
      title="Pulsar al ritmo para ajustar el tempo"
    >
      TAP
    </button>
  </div>

  <!-- Latency calibration nudge widget (step 04.3). Visible after first play. -->
  <LatencyCalibration />

  <!--
    Progression chips slot (step 04.4): ProgressionChips/ProgressionStrip was
    inserted here via Svelte <slot> until Phase 03 step 03.4, when the strip was
    relocated to its own .progression-row above the Transport footer in App.svelte.
    The <slot /> is intentionally removed; no component passes content here.
  -->
</footer>

<style>
  /*
   * Footer layout. Prototype lines 181–182.
   * .glass applied via global app.css utility class.
   */
  footer {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 11px 18px;
    margin: 0 12px 10px;
    border-radius: 18px;
    flex-wrap: wrap;
  }

  /* Session play button. Prototype lines 183–190. */
  .play-session {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 10px 20px;
    border-radius: 14px;
    font-size: 13px;
    font-weight: 700;
    color: #0b0c10;
    background: linear-gradient(135deg, #aab8ff, #8aa0ff 55%, #c89bf5);
    box-shadow:
      0 6px 22px rgba(138, 160, 255, 0.35),
      inset 0 1px 0 rgba(255, 255, 255, 0.4);
  }

  .play-session:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }

  .play-session:active {
    transform: translateY(0);
  }

  .play-session .mini {
    font-size: 9.5px;
    font-weight: 600;
    opacity: 0.7;
    letter-spacing: 0.02em;
  }

  /* Engine button group. Prototype lines 192–203. */
  .engines {
    display: flex;
    align-items: stretch;
    gap: 7px;
    padding: 5px;
    border-radius: 16px;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--stroke);
  }

  .ebtn {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid transparent;
    background: rgba(255, 255, 255, 0.04);
    transition: 0.15s;
  }

  .ebtn:hover {
    transform: translateY(-1px);
    color: var(--text);
  }

  .ebtn.rhythm {
    color: var(--accent);
    border-color: rgba(138, 160, 255, 0.32);
  }

  .ebtn.rhythm:hover {
    background: rgba(138, 160, 255, 0.12);
  }

  .ebtn.harmony {
    color: var(--tonic);
    border-color: rgba(243, 177, 90, 0.32);
  }

  .ebtn.harmony:hover {
    background: rgba(243, 177, 90, 0.12);
  }

  /* Engine label. Prototype lines 202–204. */
  .eng-lbl {
    font-size: 9px;
    color: var(--faint);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    align-self: center;
    padding: 0 2px 0 4px;
  }

  /* Now-playing pill. Prototype lines 206–211. */
  .now {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 13px;
    border-radius: 13px;
    background: rgba(0, 0, 0, 0.32);
    border: 1px solid var(--stroke);
    min-width: 118px;
  }

  .now .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--faint);
    flex: 0 0 auto;
  }

  .now.live .dot {
    background: #5bd6a0;
    box-shadow: 0 0 10px rgba(91, 214, 160, 0.8);
    animation: pulse 1.2s infinite;
  }

  .now .nlbl {
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .now .nval {
    font-size: 12px;
    font-weight: 700;
    color: var(--text);
  }

  /* Silence / generic transport button. Prototype lines 212–215. */
  .tbtn {
    padding: 9px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(0, 0, 0, 0.28);
  }

  .tbtn:hover {
    color: var(--text);
    border-color: var(--stroke-2);
  }

  .tbtn.warm {
    color: var(--dom);
    border-color: rgba(232, 123, 172, 0.4);
  }

  /* BPM tempo section. Prototype lines 216–219. */
  .tempo {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .tempo .bpm {
    font-family: 'Fraunces', serif;
    font-size: 22px;
    min-width: 46px;
    text-align: center;
  }

  .tempo .unit {
    font-size: 9px;
    color: var(--faint);
    letter-spacing: 0.12em;
  }

  .tempo input[type='range'] {
    width: 130px;
    accent-color: var(--accent);
  }

  /* Tap-tempo button. Prototype lines 220–222. */
  .taptempo {
    padding: 8px 13px;
    border-radius: 11px;
    font-size: 11px;
    font-weight: 700;
    border: 1px solid var(--stroke);
    background: rgba(0, 0, 0, 0.28);
    color: var(--muted);
  }

  .taptempo.flash {
    background: rgba(138, 160, 255, 0.3);
    color: var(--text);
    border-color: var(--accent);
  }
</style>

<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — RhythmControls component.

  Ports prototype .orbit-ctl#orbitCtl (HTML lines 426–443, CSS lines 316–325,
  JS lines 838–877).

  Shown only when $sessionStore.view === 'rhythm'.

  Controls:
  - Layout morph toggle: ▭ lineal / ▭ radial (moved here from App.svelte).
    On click: toggles morphTarget (0|1) and calls setMorphTarget() from rhythm-scene.ts.
  - Euclidean controls:
    - Sound select: bd/sd/hh/oh/cp/rim/lt/mt/ht (prototype lines 430–434).
    - k/n/r range inputs with live readouts (prototype lines 436–439).
    - Named pattern hint (prototype lines 844–846).
    - ▶ oír preview toggle (prototype lines 863–876):
        if nowPlaying.source === 'preview' → hushAll(); else → previewEuclid(...).
    - + órbita: addEuclidLayer(sound, k, n, rot) (prototype lines 849–857).
    - + capa vacía: addEmptyLayer(sound) (prototype lines 858–861).

  Phase 06 step 06.4: added 📨 base context capture button.
    Imports agentCtx; sets includeRhythm:true when clicked.
    Active state when $agentCtx.includeRhythm is true.
    Prototype: button#rhythmToCtx in footer (line 511); moved to toolbar per inventory.

  All slider readouts update reactively via Svelte reactive declarations.
  euclidR max is clamped to n-1 (prototype line 844).

  Transient local state (NOT in sessionStore):
    euclidSound, euclidK, euclidN, euclidR, morphTarget.

  data-tip attributes on controls: ported from prototype lines 427–443.

  Store reads:
    $sessionStore.view          — visibility gate
    $sessionStore.nowPlaying    — for preview toggle button state
    $agentCtx.includeRhythm     — context button active state

  Store writes (via session.ts actions):
    addEuclidLayer(sound, k, n, rot)
    addEmptyLayer(sound)
    previewEuclid(sound, k, n, rot)  — or hushAll() to stop
  Store writes (via agentCtx):
    agentCtx.update (includeRhythm: true)
-->
<script lang="ts">
  import {
    sessionStore,
    addEuclidLayer,
    addEmptyLayer,
    previewEuclid,
    hushAll,
  } from '../state/session.js';
  import { setMorphTarget } from '../render/rhythm-scene.js';
  import { agentCtx } from '../state/agentCtx.js';

  // ── Transient local state ─────────────────────────────────────────────────
  // Not in sessionStore — these are ephemeral configuration values.
  // Prototype: no corresponding global; values are read from DOM inputs directly.

  let euclidSound: string = 'hh';
  let euclidK: number = 3;
  let euclidN: number = 8;
  let euclidR: number = 0;

  /** Morph target: 0 = radial (default), 1 = linear. Moved from App.svelte. */
  let morphTarget: 0 | 1 = 0;

  // ── Named-pattern lookup ─────────────────────────────────────────────────
  // Prototype lines 844–846.
  const KNOWN_PATTERNS: Record<string, string> = {
    '3,8': 'tresillo',
    '5,8': 'cinquillo',
    '2,5': '2:5',
    '4,9': 'aksak',
    '7,16': 'brasileño',
    '5,12': 'venda',
    '7,12': 'west african',
    '5,16': 'bossa',
  };

  // ── Reactive readouts ─────────────────────────────────────────────────────
  // euclidR max clamped to n-1 (prototype line 844).
  $: euclidRMax = Math.max(0, euclidN - 1);
  // Clamp euclidR if euclidN is reduced below current euclidR.
  $: if (euclidR > euclidRMax) euclidR = euclidRMax;

  // Named-pattern info text (prototype line 846).
  $: euclidInfo = KNOWN_PATTERNS[`${euclidK},${euclidN}`]
    ? '· ' + KNOWN_PATTERNS[`${euclidK},${euclidN}`]
    : '';

  // Preview button is active when nowPlaying.source === 'preview'.
  $: isPreviewing = $sessionStore.nowPlaying.source === 'preview';

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handleMorphToggle(): void {
    morphTarget = morphTarget === 0 ? 1 : 0;
    setMorphTarget(morphTarget);
  }

  function handlePreviewToggle(): void {
    if (isPreviewing) {
      void hushAll();
    } else {
      void previewEuclid(euclidSound, euclidK, euclidN, euclidR);
    }
  }

  function handleAddEuclid(): void {
    addEuclidLayer(euclidSound, euclidK, euclidN, euclidR);
  }

  function handleAddEmpty(): void {
    addEmptyLayer(euclidSound);
  }
</script>

{#if $sessionStore.view === 'rhythm'}
  <!--
    Prototype: <div class="orbit-ctl glass" id="orbitCtl"> (line 426).
    Overlay inside #stage at bottom-left.
  -->
  <div class="orbit-ctl glass" id="orbitCtl">
    <!--
      Morph toggle. Prototype: button#layoutToggle.mk (line 427).
      Accent styled (background, border, color matching prototype line 427).
    -->
    <button
      class="mk"
      id="layoutToggle"
      data-tip="Alterna entre el reloj radial y una pista lineal, con transición animada."
      style="background:rgba(138,160,255,.14);border-color:rgba(138,160,255,.4);color:var(--accent)"
      on:click={handleMorphToggle}
    >
      {morphTarget === 0 ? '▭ lineal' : '▭ radial'}
    </button>

    <span style="opacity:.4">│</span>

    <!--
      Euclidean section header. Prototype line 429.
    -->
    <span
      data-tip="Ritmo euclidiano: reparte k golpes lo más uniformemente posible entre n pasos. Base de muchos patrones del mundo."
    >
      órbita euclidiana
    </span>

    <!--
      Sound select. Prototype lines 430–434.
    -->
    <select
      id="euclidSound"
      bind:value={euclidSound}
      data-tip="Sonido/muestra de esta órbita (bombo bd, caja sd, hi-hats hh/oh, palmas cp, toms lt/mt/ht…)."
    >
      <option value="bd">bd</option>
      <option value="sd">sd</option>
      <option value="hh" selected>hh</option>
      <option value="oh">oh</option>
      <option value="cp">cp</option>
      <option value="rim">rim</option>
      <option value="lt">lt</option>
      <option value="mt">mt</option>
      <option value="ht">ht</option>
    </select>

    <!--
      E(k,n) readout. Prototype line 435.
    -->
    <span
      data-tip="E(k,n): k golpes distribuidos en n pasos. Ej: E(3,8) = tresillo; E(5,8) = cinquillo."
      >E(<b id="euclidKVal">{euclidK}</b>,<b id="euclidNVal">{euclidN}</b>)</span
    >

    <!--
      k slider. Prototype line 436.
    -->
    <input
      type="range"
      id="euclidK"
      min="1"
      max="16"
      bind:value={euclidK}
      data-tip="k = número de golpes (onsets) a repartir."
    />

    <!--
      n slider. Prototype line 437.
    -->
    <input
      type="range"
      id="euclidN"
      min="2"
      max="16"
      bind:value={euclidN}
      data-tip="n = número de pasos (subdivisiones) del ciclo."
    />

    <!--
      rot readout + slider. Prototype lines 438–439.
    -->
    <span data-tip="rot = rotación: desplaza el patrón r pasos, cambiando en qué pulso empieza."
      >rot <b id="euclidRVal">{euclidR}</b></span
    >
    <input
      type="range"
      id="euclidR"
      min="0"
      max={euclidRMax}
      bind:value={euclidR}
      data-tip="rot = rotación: desplaza el patrón r pasos."
    />

    <!--
      Named pattern info. Prototype line 440.
    -->
    <span id="euclidInfo" style="font-size:10px;color:var(--faint)">{euclidInfo}</span>

    <!--
      Preview toggle button. Prototype line 441 / lines 863–876.
      Button text and style change when previewing.
    -->
    <button
      class="mk"
      id="euclidPreview"
      data-tip="Oír solo esta órbita euclidiana antes de añadirla."
      style={isPreviewing
        ? 'background:rgba(232,123,172,.16);border-color:rgba(232,123,172,.4);color:var(--dom)'
        : 'background:rgba(86,207,196,.16);border-color:rgba(86,207,196,.4);color:var(--subdom)'}
      on:click={handlePreviewToggle}
    >
      {isPreviewing ? '■ stop' : '▶ oír'}
    </button>

    <!--
      Add euclid orbit. Prototype line 442.
    -->
    <button
      class="mk"
      id="addEuclid"
      data-tip="Añadir esta órbita euclidiana como una nueva capa."
      on:click={handleAddEuclid}
    >
      + órbita
    </button>

    <!--
      Add empty layer. Prototype line 443.
    -->
    <button
      class="mk"
      id="addLayerEmpty"
      data-tip="Añadir una capa vacía de 16 pasos para dibujarla a mano."
      style="background:rgba(255,255,255,.05);border-color:var(--stroke);color:var(--muted)"
      on:click={handleAddEmpty}
    >
      + capa vacía
    </button>

    <!--
      Context capture button: send current groove to the agent as rhythmic base.
      Prototype: button#rhythmToCtx in footer (line 511); moved here per inventory.
      Active state when $agentCtx.includeRhythm is true.
    -->
    <button
      class="mk ctx-btn"
      class:active={$agentCtx.includeRhythm}
      title="Enviar el groove al agente como base rítmica"
      on:click={() => agentCtx.update((c) => ({ ...c, includeRhythm: true }))}>📨 base</button
    >
  </div>
{/if}

<style>
  /*
   * Orbit control overlay: absolute-positioned inside #stage.
   * Prototype lines 316–319.
   */
  .orbit-ctl {
    position: absolute;
    left: 16px;
    bottom: 46px;
    display: flex;
    gap: 9px;
    align-items: center;
    padding: 9px 13px;
    border-radius: 13px;
    font-size: 11px;
    color: var(--muted);
    flex-wrap: wrap;
    max-width: 62%;
    z-index: 3;
  }

  /* Select inside overlay. Prototype lines 320–321. */
  .orbit-ctl select {
    background: rgba(0, 0, 0, 0.34);
    border: 1px solid var(--stroke);
    color: var(--text);
    border-radius: 8px;
    padding: 5px 7px;
    font-size: 11px;
  }

  /* Range inputs. Prototype line 322. */
  .orbit-ctl input[type='range'] {
    width: 78px;
    accent-color: var(--accent);
  }

  /* Bold monospace readouts. Prototype line 323. */
  .orbit-ctl b {
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
  }

  /*
   * Overlay action buttons (.mk). Prototype lines 324–325.
   * Individual style overrides are passed via inline style attribute.
   */
  .orbit-ctl .mk {
    padding: 6px 12px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 11px;
    background: rgba(138, 160, 255, 0.15);
    border: 1px solid rgba(138, 160, 255, 0.35);
    color: var(--accent);
  }

  /*
   * Context capture button active state (phase 06 step 06.4).
   * When $agentCtx.includeRhythm is true, button is highlighted.
   */
  .orbit-ctl .ctx-btn.active {
    background: rgba(86, 207, 196, 0.2);
    border-color: rgba(86, 207, 196, 0.5);
    color: var(--subdom);
  }
</style>

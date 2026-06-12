<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — Header component.

  Ports prototype <header class="glass"> (lines 358–395 HTML; CSS lines 68–98).
  Brand glyph + title + tag, view-toggle segmented control, and key selector.

  Phase 09 step 09.4: 4-tab primary nav (Armonía · Ritmo · Composición · Código Strudel).
  The two-button segmented control is replaced by a four-button segment.
  handleViewChange updated to accept all four primary view-type strings and delegates
  to the setView store action (added in step 09.3) which also calls stage.setView.

  Phase 09 step 09.5: Rhythm controls moved inline from RhythmControls.svelte.
  All rhythm-specific controls (morph toggle, euclidean controls, preview, + órbita,
  + capa vacía, 📨 base) are now inside {#if $sessionStore.view === 'rhythm'} in this
  component. ADR 0013 D3: local state inline; zero naming collisions with existing locals.
  RhythmControls.svelte is now an empty shell with a relocation comment.

  Store reads:
    $sessionStore.view        — active view for segmented control
    $sessionStore.harmony.root / .mode / .octave — key-selector values
    $sessionStore.nowPlaying  — preview button active state
    $agentCtx.includeRhythm   — base context button active state

  Store writes (via session.ts actions):
    setView(view)               on view-toggle click (replaces inline sessionStore.update)
    setHarmonyKey(root, mode, octave)  on key-selector change
    addEuclidLayer / addEmptyLayer / previewEuclid / hushAll — rhythm actions
  Store writes (via rhythm-scene.ts):
    setMorphTarget              on morph toggle click
  Store writes (via agentCtx):
    agentCtx.update (includeRhythm: true) on base context button click
-->
<script lang="ts">
  import {
    sessionStore,
    setView,
    setHarmonyKey,
    setHarmonySubview,
    setRegisterMode,
    setChordMode,
    addEuclidLayer,
    addEmptyLayer,
    previewEuclid,
    hushAll,
  } from '../state/session.js';
  import { setMorphTarget } from '../render/rhythm-scene.js';
  import { agentCtx } from '../state/agentCtx.js';

  // Note names for the root pitch-class select.
  // Prototype: NOTE_NAMES (line 592): ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ── View toggle ────────────────────────────────────────────────────────────
  // Phase 09 step 09.4: widened from 'harmony'|'rhythm' to all four primary view strings.
  // Delegates to setView() store action (session.ts step 09.3) which updates the store
  // and calls stage.setView via lazy import (avoids PIXI pollution in Node/Vitest).
  function handleViewChange(view: 'harmony' | 'rhythm' | 'composition' | 'code'): void {
    setView(view);
  }

  // ── Rhythm controls — transient local state ────────────────────────────────
  // Phase 09 step 09.5: moved inline from RhythmControls.svelte (ADR 0013 D3).
  // All five variables are ephemeral (NOT in sessionStore). They persist across
  // view switches because Header.svelte is mounted for the entire app lifetime.
  // Zero naming collisions with existing Header.svelte locals (confirmed in inventory).
  //
  // Prototype: values read from DOM inputs directly in the prototype JS.
  // Port: local Svelte reactive declarations here.

  let euclidSound: string = 'hh';
  let euclidK: number = 3;
  let euclidN: number = 8;
  let euclidR: number = 0;

  /** Morph target: 0 = radial (default), 1 = linear. */
  let morphTarget: 0 | 1 = 0;

  // ── Named-pattern lookup ───────────────────────────────────────────────────
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

  // ── Rhythm reactive readouts ───────────────────────────────────────────────
  // euclidR max clamped to n-1 (prototype line 844).
  $: euclidRMax = Math.max(0, euclidN - 1);
  // Clamp euclidR if euclidN is reduced below current euclidR.
  $: if (euclidR > euclidRMax) euclidR = euclidRMax;

  // Named-pattern info text (prototype line 846).
  $: euclidInfo = KNOWN_PATTERNS[`${euclidK},${euclidN}`]
    ? '· ' + KNOWN_PATTERNS[`${euclidK},${euclidN}`]
    : '';

  // Preview button active state.
  $: isPreviewing = $sessionStore.nowPlaying.source === 'preview';

  // ── Rhythm handlers ────────────────────────────────────────────────────────

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

  // ── Key selector ───────────────────────────────────────────────────────────
  // Prototype: #melRoot / #melMode / #melOctave selects with onchange handler
  // that calls requeueLive() (lines 369–395).
  // Port: calls setHarmonyKey(root, mode, octave) from session.ts (step 04.2).
  //
  // Fix (Defect 2, 04.6 smoke-test): removed the $: reactive shadow variables
  // (rootValue / modeValue / octaveValue) that were written by both bind:value
  // and the $: reactive declaration. The two-way binding combined with the $:
  // reactive re-assignment created a Svelte race: the $: block ran from the
  // previous store value and overwrote the user's selection, causing it to revert.
  // Solution: one-way value= driven by the store; each select reads its new value
  // from event.currentTarget and the other two from the current store snapshot.
  function handleRootChange(e: Event): void {
    const root = Number((e.currentTarget as HTMLSelectElement).value);
    setHarmonyKey(root, $sessionStore.harmony.mode, $sessionStore.harmony.octave);
  }

  function handleModeChange(e: Event): void {
    const mode = (e.currentTarget as HTMLSelectElement).value;
    setHarmonyKey($sessionStore.harmony.root, mode, $sessionStore.harmony.octave);
  }

  function handleOctaveChange(e: Event): void {
    const octave = Number((e.currentTarget as HTMLSelectElement).value);
    setHarmonyKey($sessionStore.harmony.root, $sessionStore.harmony.mode, octave);
  }
</script>

<!--
  Prototype: <header class="glass"> (line 358).
  CSS: header { display:flex; align-items:center; gap:18px; padding:11px 20px;
       margin:10px 12px 0; border-radius:18px; flex-wrap:wrap; } (lines 69–72).
-->
<header class="glass">
  <!-- Brand: glyph + title + tag. Prototype lines 359–363. -->
  <div class="brand">
    <span class="glyph">꩜</span>
    <h1>Orbifold</h1>
    <span class="tag">geometría sonora</span>
  </div>

  <!--
    4-tab primary navigation segmented control.
    Phase 09 step 09.4: expanded from 2 buttons (Armonía · Ritmo) to 4 equal-weight
    buttons (Armonía · Ritmo · Composición · Código Strudel). ADR 0013 D1.
    All four buttons use the same CSS class (.seg button) and equal padding — no
    tab can dominate via font size or padding differences.
    Active class applied to the currently-selected view.
  -->
  <div class="seg" id="viewSeg">
    <button
      data-view="harmony"
      class={$sessionStore.view === 'harmony' ? 'active' : ''}
      on:click={() => handleViewChange('harmony')}
    >
      Armonía
    </button>
    <button
      data-view="rhythm"
      class={$sessionStore.view === 'rhythm' ? 'active' : ''}
      on:click={() => handleViewChange('rhythm')}
    >
      Ritmo
    </button>
    <button
      data-view="composition"
      class={$sessionStore.view === 'composition' ? 'active' : ''}
      on:click={() => handleViewChange('composition')}
    >
      Composición
    </button>
    <button
      data-view="code"
      class={$sessionStore.view === 'code' ? 'active' : ''}
      on:click={() => handleViewChange('code')}
    >
      Código Strudel
    </button>
  </div>

  <!--
    Rhythm controls (Phase 09 step 09.5).
    Moved from RhythmControls.svelte overlay (ADR 0013 D3).
    All rhythm-specific controls inline here, gated by view === 'rhythm'.
    Layout: compact inline-flex matching the header gap:18px row.
    Sliders are width:78px (matching prototype); the rhythm block uses flex-wrap
    so that it wraps gracefully on narrow viewports without overflowing the header.
    The inner .rhythm-ctl div acts as the flex-wrap container.
  -->
  {#if $sessionStore.view === 'rhythm'}
    <div class="rhythm-ctl">
      <!--
        Morph toggle. Prototype: button#layoutToggle.mk (line 427).
        Toggles morphTarget (0|1) and calls setMorphTarget() from rhythm-scene.ts.
      -->
      <button
        class="rk"
        id="layoutToggle"
        data-tip="Alterna entre el reloj radial y una pista lineal, con transición animada."
        style="background:rgba(138,160,255,.14);border-color:rgba(138,160,255,.4);color:var(--accent)"
        on:click={handleMorphToggle}
      >
        {morphTarget === 0 ? '▭ lineal' : '▭ radial'}
      </button>

      <span class="r-sep">│</span>

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
        >E(<b>{euclidK}</b>,<b>{euclidN}</b>)</span
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
        >rot <b>{euclidR}</b></span
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
      <span class="euclid-info">{euclidInfo}</span>

      <!--
        Preview toggle button. Prototype line 441 / lines 863–876.
      -->
      <button
        class="rk"
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
        class="rk"
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
        class="rk"
        id="addLayerEmpty"
        data-tip="Añadir una capa vacía de 16 pasos para dibujarla a mano."
        style="background:rgba(255,255,255,.05);border-color:var(--stroke);color:var(--muted)"
        on:click={handleAddEmpty}
      >
        + capa vacía
      </button>

      <!--
        Context capture button: send current groove to the agent as rhythmic base.
        Prototype: button#rhythmToCtx in footer (line 511).
        Active state when $agentCtx.includeRhythm is true.
      -->
      <button
        class="rk r-ctx-btn"
        class:active={$agentCtx.includeRhythm}
        title="Enviar el groove al agente como base rítmica"
        on:click={() => agentCtx.update((c) => ({ ...c, includeRhythm: true }))}>📨 base</button
      >
    </div>
  {/if}

  <!--
    Key selector: root pitch-class, mode, octave.
    Prototype: .field with #melRoot / #melMode / #melOctave selects (lines 370–386).
    On change calls setHarmonyKey(root, mode, octave) (session.ts step 04.2).
    Step 01.2: hidden in all non-harmony views (Rhythm / Composition / Session).
    The view-toggle (#viewSeg) above must never be hidden.
  -->
  {#if $sessionStore.view === 'harmony'}
    <!--
      Phase 08 (step 08.5): Tonnetz ⇄ Pentagrama sub-toggle.
      Toggles harmony.subview between 'tonnetz' and 'staff'.
      Calls setHarmonySubview() from session.ts which updates the store and
      calls setHarmonySubview() from stage.ts (via lazy import).
      ADR 0011 Amendment §D5.
    -->
    <div class="seg" id="subviewSeg">
      <button
        class={$sessionStore.harmony.subview === 'tonnetz' ? 'active' : ''}
        on:click={() => setHarmonySubview('tonnetz')}
      >
        Tonnetz
      </button>
      <button
        class={$sessionStore.harmony.subview === 'staff' ? 'active' : ''}
        on:click={() => setHarmonySubview('staff')}
      >
        Pentagrama
      </button>
    </div>

    <!--
      Phase 08 (step 08.5): Voice register mode toggle.
      Toggles harmony.registerMode between 'suavizado' and 'estricto'.
      Calls setRegisterMode() from session.ts which updates the store only
      (visual-only: audio is byte-identical; no requeueLive).
      ADR 0011 Amendment §D6.
    -->
    <div class="seg" id="registerModeSeg">
      <button
        class={$sessionStore.harmony.registerMode === 'suavizado' ? 'active' : ''}
        on:click={() => setRegisterMode('suavizado')}
      >
        suavizado
      </button>
      <button
        class={$sessionStore.harmony.registerMode === 'estricto' ? 'active' : ''}
        on:click={() => setRegisterMode('estricto')}
      >
        estricto
      </button>
    </div>

    <!--
      Phase 08 (step 08.6): Chord-mode segmented control relocated from HarmonyControls.svelte.
      Prototype: .seg2#chordModeSeg (HTML lines 449–452); moved here per ADR 0011 Amendment §D6.
      Two buttons: ◧ acorde (block) / ⋯ arpegio (arpeggio).
      Active state driven by $sessionStore.chordMode.
      On click: calls setChordMode() from session.ts which also calls requeueLive().
    -->
    <div class="seg" id="chordModeSeg">
      <button
        class={$sessionStore.chordMode === 'chord' ? 'active' : ''}
        data-mode="chord"
        data-tip="Toca el acorde como bloque (todas las notas a la vez)."
        on:click={() => setChordMode('chord')}
      >
        ◧ acorde
      </button>
      <button
        class={$sessionStore.chordMode === 'arp' ? 'active' : ''}
        data-mode="arp"
        data-tip="Arpegia el acorde (notas en sucesión, duración por subdivisión)."
        on:click={() => setChordMode('arp')}
      >
        ⋯ arpegio
      </button>
    </div>

    <!--
      Phase 08 (step 08.6): Marco context button relocated from HarmonyControls.svelte.
      Prototype: button#harmonyToCtx in footer (line 510); moved to top bar per ADR 0011 Amendment §D6.
      Active state when $agentCtx.includeHarmony is true.
      On click: sets agentCtx.includeHarmony = true so the next agent send includes the harmony context.
    -->
    <button
      class="marco-btn"
      class:active={$agentCtx.includeHarmony}
      title="Enviar la clave + progresión al agente como marco armónico"
      on:click={() => agentCtx.update((c) => ({ ...c, includeHarmony: true }))}
    >
      📨 marco
    </button>

    <div class="field">
      <span>clave</span>

      <!-- Root pitch-class select: C, C#, …, B (0–11). Prototype: #melRoot (line 372). -->
      <!-- value= is one-way from store; on:change reads event.currentTarget.value (Defect 2 fix). -->
      <select id="melRoot" value={String($sessionStore.harmony.root)} on:change={handleRootChange}>
        {#each NOTE_NAMES as name, i}
          <option value={String(i)}>{name}</option>
        {/each}
      </select>

      <!-- Mode select. Prototype: #melMode (lines 373–382). -->
      <select id="melMode" value={$sessionStore.harmony.mode} on:change={handleModeChange}>
        <option value="major">mayor</option>
        <option value="minor">menor</option>
        <option value="dorian">dórico</option>
        <option value="phrygian">frigio</option>
        <option value="lydian">lidio</option>
        <option value="mixolydian">mixolidio</option>
        <option value="locrian">locrio</option>
        <option value="harmonic:minor">menor armónica</option>
      </select>

      <!-- Octave select: 2 / 3 (default) / 4. Prototype: #melOctave (lines 383–385). -->
      <select
        id="melOctave"
        value={String($sessionStore.harmony.octave)}
        on:change={handleOctaveChange}
      >
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
      </select>
    </div>
  {/if}

  <!-- Spacer: pushes right-side controls to the right. Prototype: .sp (line 388). -->
  <div class="sp"></div>

  <a href="./tutorial.html" class="tutorial-link" target="_blank" rel="noopener" title="Guía de uso"
    >Tutorial</a
  >

  <!--
    Right side: mic button deferred to a later phase (not in Phase 04 scope).
    Prototype: #micBtn (lines 390–393) — deferred.
    keyBox span (line 394) — deferred.
  -->
</header>

<style>
  /*
   * Header layout. Prototype lines 69–72.
   * .glass applied via global app.css utility class.
   */
  header {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 11px 20px;
    margin: 10px 12px 0;
    border-radius: 18px;
    flex-wrap: wrap;
  }

  /* Brand group: glyph + h1 + tag. Prototype lines 73–76. */
  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }

  .brand .glyph {
    font-size: 22px;
    color: var(--accent);
    line-height: 1;
  }

  .brand h1 {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: 19px;
    letter-spacing: 0.01em;
  }

  .brand .tag {
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  /* Spacer: pushes right side. Prototype line 77. */
  .sp {
    flex: 1;
  }

  /*
   * Marco context button — sits in the top bar alongside the seg controls.
   * Phase 08 (step 08.6): relocated from HarmonyControls.svelte .tbtn.
   * Matches the existing .tbtn style from Transport.svelte for visual consistency.
   */
  .marco-btn {
    font-size: 11px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 10px;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.04);
    cursor: pointer;
    white-space: nowrap;
  }

  .marco-btn:hover {
    color: var(--text);
    border-color: var(--stroke-2);
  }

  /* Active state: accent color when context flag is set. */
  .marco-btn.active {
    color: var(--accent);
    border-color: rgba(138, 160, 255, 0.4);
    background: rgba(138, 160, 255, 0.12);
  }

  .tutorial-link {
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--faint);
    text-decoration: none;
    padding: 6px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .tutorial-link:hover {
    color: var(--text);
    border-color: var(--stroke);
  }

  /*
   * Rhythm controls container (Phase 09 step 09.5).
   * Moved from RhythmControls.svelte .orbit-ctl overlay (ADR 0013 D3).
   * Inline-flex row matching the header gap:18px layout; flex-wrap allows
   * the controls to wrap on narrow viewports rather than overflow the header.
   * font-size and color match the overlay's values (11px, var(--muted)).
   */
  .rhythm-ctl {
    display: flex;
    gap: 9px;
    align-items: center;
    flex-wrap: wrap;
    font-size: 11px;
    color: var(--muted);
  }

  /* Separator glyph between morph toggle and euclidean section. */
  .r-sep {
    opacity: 0.4;
  }

  /* Select inside rhythm controls. Matches overlay .orbit-ctl select rules. */
  .rhythm-ctl select {
    background: rgba(0, 0, 0, 0.34);
    border: 1px solid var(--stroke);
    color: var(--text);
    border-radius: 8px;
    padding: 5px 7px;
    font-size: 11px;
  }

  /* Range inputs — keep at 78px matching the original overlay. */
  .rhythm-ctl input[type='range'] {
    width: 78px;
    accent-color: var(--accent);
  }

  /* Bold monospace readouts. Matches .orbit-ctl b. */
  .rhythm-ctl b {
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
  }

  /* Named-pattern info text. */
  .euclid-info {
    font-size: 10px;
    color: var(--faint);
  }

  /*
   * Rhythm action buttons (.rk).
   * Matches .orbit-ctl .mk from RhythmControls.svelte.
   * Individual style overrides are passed via inline style attribute
   * on specific buttons (morph toggle, preview, add empty).
   */
  .rk {
    padding: 6px 12px;
    border-radius: 9px;
    font-weight: 600;
    font-size: 11px;
    background: rgba(138, 160, 255, 0.15);
    border: 1px solid rgba(138, 160, 255, 0.35);
    color: var(--accent);
    cursor: pointer;
    white-space: nowrap;
  }

  /* Context capture button active state. Matches .orbit-ctl .ctx-btn.active. */
  .r-ctx-btn.active {
    background: rgba(86, 207, 196, 0.2);
    border-color: rgba(86, 207, 196, 0.5);
    color: var(--subdom);
  }
</style>

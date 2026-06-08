<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — Header component.

  Ports prototype <header class="glass"> (lines 358–395 HTML; CSS lines 68–98).
  Brand glyph + title + tag, view-toggle segmented control, and key selector.

  Store reads:
    $sessionStore.view        — active view for segmented control
    $sessionStore.harmony.root / .mode / .octave — key-selector values

  Store writes (via session.ts actions):
    sessionStore.update(s => ({ ...s, view }))  on view-toggle click
    setHarmonyKey(root, mode, octave)            on key-selector change
-->
<script lang="ts">
  import { sessionStore, setHarmonyKey } from '../state/session.js';

  // Note names for the root pitch-class select.
  // Prototype: NOTE_NAMES (line 592): ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  // ── View toggle ────────────────────────────────────────────────────────────
  // Prototype: #viewSeg buttons data-view="harmony"|"rhythm" (lines 365–368).
  function handleViewChange(view: 'harmony' | 'rhythm'): void {
    sessionStore.update((s) => ({ ...s, view }));
  }

  // ── Key selector ───────────────────────────────────────────────────────────
  // Prototype: #melRoot / #melMode / #melOctave selects with onchange handler
  // that calls requeueLive() (lines 369–395).
  // Port: calls setHarmonyKey(root, mode, octave) from session.ts (step 04.2).
  function handleKeyChange(): void {
    setHarmonyKey(Number(rootValue), modeValue, Number(octaveValue));
  }

  // Local shadow values for the select bindings (initialized from store).
  // Reactive: if the store is updated externally, the selects stay in sync.
  $: rootValue = String($sessionStore.harmony.root);
  $: modeValue = $sessionStore.harmony.mode;
  $: octaveValue = String($sessionStore.harmony.octave);
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
    View-toggle segmented control.
    Prototype: .seg#viewSeg with data-view buttons (lines 365–368).
    Active class on the currently-selected view.
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
  </div>

  <!--
    Key selector: root pitch-class, mode, octave.
    Prototype: .field with #melRoot / #melMode / #melOctave selects (lines 370–386).
    On change calls setHarmonyKey(root, mode, octave) (session.ts step 04.2).
  -->
  <div class="field">
    <span>clave</span>

    <!-- Root pitch-class select: C, C#, …, B (0–11). Prototype: #melRoot (line 372). -->
    <select id="melRoot" bind:value={rootValue} on:change={handleKeyChange}>
      {#each NOTE_NAMES as name, i}
        <option value={String(i)}>{name}</option>
      {/each}
    </select>

    <!-- Mode select. Prototype: #melMode (lines 373–382). -->
    <select id="melMode" bind:value={modeValue} on:change={handleKeyChange}>
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
    <select id="melOctave" bind:value={octaveValue} on:change={handleKeyChange}>
      <option value="2">2</option>
      <option value="3">3</option>
      <option value="4">4</option>
    </select>
  </div>

  <!-- Spacer: pushes right-side controls to the right. Prototype: .sp (line 388). -->
  <div class="sp"></div>

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
</style>

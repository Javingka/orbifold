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
  import {
    sessionStore,
    setHarmonyKey,
    setHarmonySubview,
    setRegisterMode,
  } from '../state/session.js';

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
</style>

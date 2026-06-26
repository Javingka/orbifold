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
    setChordMode,
    setNoteMode,
    setChordOscillator,
    setChordPreset,
    addEuclidLayer,
    addEmptyLayer,
    previewEuclid,
    hushAll,
    isNoteSlot,
  } from '../state/session.js';
  import StepEditor from './StepEditor.svelte';
  import { bjorklund, rotate } from '../core/rhythm/euclid.js';
  import type { RhythmLayer } from '../core/rhythm/layers.js';
  import { selectedSlotIdxStore, soundIntentStore } from '../state/selectedSlot.js';

  // Phase 11 step 11.3: i18n store + language selector (ADR 0017 D1, D3, OQ-5).
  // Phase 11 step 11.4: `t` store imported for Wave A string extraction.
  import { lang, LANGS, t } from '../i18n/index.js';
  import type { LangCode } from '../i18n/index.js';
  // setRegisterMode removed in Phase 10 redesign step 10.11 (ADR 0015 D2).
  // The estricto/suavizado register toggle (#registerModeSeg) is removed from
  // the UI. The Canvas 2D Pentagrama layer uses raw chordVoicing() pitches
  // directly — no octave-continuity algorithm (no register mode needed).
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

  // ── Euclid preview state ──────────────────────────────────────────────────
  // The StepEditor in the header is a PRE-ADD preview, not a mirror of existing
  // layers. It appears when the user changes any euclid control, shows the pattern
  // that would be added, and disappears (with a fly animation) when "+" is pressed.
  let showPreview = false;
  let isFlying = false;
  let isDismissing = false;

  function dismissPreview(): void {
    isDismissing = true;
    setTimeout(() => {
      showPreview = false;
      isDismissing = false;
    }, 200);
  }
  let previewLayer: RhythmLayer = {
    sound: 'hh' as RhythmLayer['sound'],
    steps: rotate(bjorklund(3, 8), 0),
    locked: false,
  };

  function onConfigChange(): void {
    previewLayer = {
      sound: euclidSound as RhythmLayer['sound'],
      steps: rotate(bjorklund(euclidK, euclidN), euclidR),
      euclid: euclidR ? `${euclidK},${euclidN},${euclidR}` : `${euclidK},${euclidN}`,
      locked: false,
    };
    showPreview = true;
    isFlying = false;
  }

  function handlePreviewStepToggle(_li: number, si: number): void {
    const newSteps = [...previewLayer.steps];
    newSteps[si] = newSteps[si] === 1 ? 0 : 1;
    previewLayer = { ...previewLayer, steps: newSteps, euclid: undefined };
  }

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
    const doAdd = () => {
      addEuclidLayer(euclidSound, euclidK, euclidN, euclidR);
      showPreview = false;
      isFlying = false;
    };
    if (showPreview) {
      isFlying = true;
      setTimeout(doAdd, 280);
    } else {
      doAdd();
    }
  }

  function handleAddEmpty(): void {
    const doAdd = () => {
      addEmptyLayer(euclidSound, euclidN);
      showPreview = false;
      isFlying = false;
    };
    if (showPreview) {
      isFlying = true;
      setTimeout(doAdd, 280);
    } else {
      doAdd();
    }
  }

  // ── Language selector (Phase 11 step 11.3, ADR 0017 OQ-5) ────────────────
  // The 文A button opens an inline dropdown listing the four native labels.
  // Clicking a language writes to the `lang` store (which triggers write-back
  // to localStorage['orbifold.lang'] per D3) and closes the dropdown.
  //
  // Checkpoint #5 bug-fix (round 2): the dropdown is position:absolute anchored
  // to .lang-sel (position:relative). The whole header is given its own raised
  // stacking context (position:relative; z-index) above #stage, so the menu
  // renders over the PIXI canvas and the Legend bar without needing JS coords.
  // (The previous position:fixed approach failed because .glass sets
  // backdrop-filter, which traps fixed descendants inside the header's own
  // stacking context — see app.css .glass.)

  let langMenuOpen = false;

  function handleLangSelect(code: LangCode): void {
    lang.set(code);
    langMenuOpen = false;
  }

  function handleLangToggle(): void {
    langMenuOpen = !langMenuOpen;
  }

  // Close the dropdown if the user clicks outside it.
  function handleLangBlur(e: FocusEvent): void {
    // relatedTarget is null when focus leaves the browser; close the menu.
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
      langMenuOpen = false;
    }
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

  // ── Sound attribute controls (Phase 03 step 03.5 — ADR 0019) ─────────────
  // Two selectors: Oscillator (waveform + noise) and Presets (named bundles).
  // Replace the Phase 02 flat block (instrument select + room/decay sliders).
  //
  // Design (Pilot-decided):
  // - Always visible (do NOT hide when no slot is selected).
  // - When a slot IS selected: controls show and write that slot's attrs.
  //   The block gains a persistent accent border (.sound-ctl--active) and
  //   a brief CSS pulse on the first frame of selection change.
  // - When no slot is selected: controls show the "intent" defaults that
  //   new chords inherit (apply-to-new behavior).
  // Technical tokens (sine/triangle/square/sawtooth/pink; piano/guitar/synth-bass)
  // are [VERBATIM] in value attributes (OQ-6/ADR 0017); labels come from i18n.

  // Valid oscillator token type (ADR 0019 D1: 'pink' added to instrument field).
  type OscillatorToken = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'pink';

  // Derive selected slot (reactive). Rest slots have no sound attrs.
  $: selSlot =
    $selectedSlotIdxStore !== null
      ? $sessionStore.harmony.progression[$selectedSlotIdxStore]
      : undefined;
  // NoteSlot does not support chord sound controls in Phase 01 — treat as not-a-chord.
  $: selIsChord = selSlot !== undefined && !('isRest' in selSlot) && !isNoteSlot(selSlot);

  // Display values: prefer selected slot's attrs, then intent store.
  $: displayInstrument = (
    selIsChord &&
    selSlot !== undefined &&
    !('isRest' in selSlot) &&
    !isNoteSlot(selSlot) &&
    selSlot.instrument !== undefined
      ? selSlot.instrument
      : $soundIntentStore.instrument
  ) as OscillatorToken;

  $: displayPreset = (
    selIsChord &&
    selSlot !== undefined &&
    !('isRest' in selSlot) &&
    !isNoteSlot(selSlot) &&
    selSlot.preset !== undefined
      ? selSlot.preset
      : ($soundIntentStore.preset ?? '')
  ) as string;

  // ── Edit-mode highlight + pulse ───────────────────────────────────────────
  // When $selectedSlotIdxStore changes to a non-null index, add a transient
  // pulse class for ~300ms then drop it (keeps the persistent --active class).
  let _prevSlotIdx: number | null = null;
  let soundCtlPulsing = false;

  $: {
    const idx = $selectedSlotIdxStore;
    if (idx !== null && idx !== _prevSlotIdx) {
      // Selection changed to a new non-null slot → trigger pulse
      soundCtlPulsing = false;
      // Use a microtask tick to allow Svelte to flush the class removal first,
      // then re-add it so the animation restarts.
      void Promise.resolve().then(() => {
        soundCtlPulsing = true;
        setTimeout(() => {
          soundCtlPulsing = false;
        }, 320);
      });
    }
    _prevSlotIdx = idx;
  }

  function handleOscillatorChange(e: Event): void {
    const val = (e.currentTarget as HTMLSelectElement).value as OscillatorToken;
    soundIntentStore.update((s) => ({ ...s, instrument: val }));
    if ($selectedSlotIdxStore !== null && selIsChord) {
      setChordOscillator($selectedSlotIdxStore, val);
    }
  }

  function handlePresetChange(e: Event): void {
    const raw = (e.currentTarget as HTMLSelectElement).value;
    const val = raw === '' ? undefined : (raw as 'piano' | 'guitar' | 'synth-bass');
    soundIntentStore.update((s) => ({ ...s, preset: val }));
    if ($selectedSlotIdxStore !== null && selIsChord) {
      setChordPreset($selectedSlotIdxStore, val);
    }
  }
</script>

<!--
  Prototype: <header class="glass"> (line 358).
  CSS: header { display:flex; align-items:center; gap:18px; padding:11px 20px;
       margin:10px 12px 0; border-radius:18px; flex-wrap:wrap; } (lines 69–72).
-->
<header class="glass">
  <!--
    Top row: primary navigation + language + tutorial (Phase 11 Checkpoint #5
    redesign). Always-present global controls live here; section-specific
    controls move to the bottom row so the Tutorial/language never wrap.
  -->
  <div class="hdr-row hdr-top">
    <!--
      Brand: glyph + title + tag. Prototype lines 359–363.
      Phase 11 Checkpoint #5: the brand is now a link to the landing page.
      "Orbifold" stays a [VERBATIM] token (OQ-6); only the title attr translates.
    -->
    <a class="brand" href="./landing.html" title={$t('header.brandTitle')}>
      <span class="glyph">꩜</span>
      <h1>Orbifold</h1>
      <span class="tag">{$t('header.tagline')}</span>
    </a>

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
        {$t('header.nav.harmony')}
      </button>
      <button
        data-view="rhythm"
        class={$sessionStore.view === 'rhythm' ? 'active' : ''}
        on:click={() => handleViewChange('rhythm')}
      >
        {$t('header.nav.rhythm')}
      </button>
      <button
        data-view="composition"
        class={$sessionStore.view === 'composition' ? 'active' : ''}
        on:click={() => handleViewChange('composition')}
      >
        {$t('header.nav.composition')}
      </button>
      <button
        data-view="code"
        class={$sessionStore.view === 'code' ? 'active' : ''}
        on:click={() => handleViewChange('code')}
      >
        {$t('header.nav.code')}
      </button>
    </div>

    <!-- Spacer: pushes right-side controls to the right. Prototype: .sp (line 388). -->
    <div class="sp"></div>

    <!--
      Language selector (Phase 11 step 11.3 — ADR 0017 OQ-5).
      The 文A button (CJK + Latin glyph, Wikipedia/Google-style language globe idiom)
      opens a dropdown listing the four native language labels. Always visible.
      Clicking a language writes to the `lang` store → triggers localStorage write-back
      to 'orbifold.lang' (D3 contract). The dropdown closes on selection or focus-out.
    -->
    <div class="lang-sel" role="group" aria-label="Language selector" on:focusout={handleLangBlur}>
      <button
        class="lang-btn"
        title="Language / Idioma / Língua / 语言"
        aria-haspopup="listbox"
        aria-expanded={langMenuOpen}
        on:click={handleLangToggle}>文A</button
      >
      {#if langMenuOpen}
        <!-- position:absolute anchored to .lang-sel; the header's raised stacking
             context (header { position:relative; z-index } below) lifts it above
             the PIXI canvas and the Legend bar. -->
        <ul
          class="lang-menu"
          role="listbox"
          aria-label="Select language"
          on:pointerdown|stopPropagation
          on:mousedown|stopPropagation
        >
          {#each LANGS as { code, label }}
            <li role="option" aria-selected={$lang === code}>
              <button
                class="lang-option"
                class:active={$lang === code}
                on:click|stopPropagation={() => handleLangSelect(code)}>{label}</button
              >
            </li>
          {/each}
        </ul>
      {/if}
    </div>

    <a
      href="./tutorial.html"
      class="tutorial-link"
      target="_blank"
      rel="noopener"
      title={$t('header.tutorialTitle')}>{$t('header.tutorialLabel')}</a
    >
  </div>

  <!--
    Bottom row: section-specific controls (Phase 11 Checkpoint #5 redesign).
    Always present so the template stays a balanced tree; collapsed via
    .hidden for views without inline controls (composition / code).
  -->
  <div
    class="hdr-row hdr-bottom"
    class:hidden={!($sessionStore.view === 'rhythm' || $sessionStore.view === 'harmony')}
  >
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
          data-tip={$t('header.rhythm.morphTip')}
          style="background:rgba(138,160,255,.14);border-color:rgba(138,160,255,.4);color:var(--accent)"
          on:click={handleMorphToggle}
        >
          {morphTarget === 0 ? $t('header.rhythm.morphLinear') : $t('header.rhythm.morphRadial')}
        </button>

        <span class="r-sep">│</span>

        <!--
        Euclidean section header. Prototype line 429.
      -->
        <span data-tip={$t('header.rhythm.euclidSectionTip')}>
          {$t('header.rhythm.euclidLabel')}
        </span>

        <!--
        Sound select. Prototype lines 430–434.
      -->
        <select
          id="euclidSound"
          bind:value={euclidSound}
          data-tip={$t('header.rhythm.soundTip')}
          on:change={onConfigChange}
        >
          <optgroup label="Drum kit">
            <option value="bd">bd</option>
            <option value="sd">sd</option>
            <option value="hh" selected>hh</option>
            <option value="oh">oh</option>
            <option value="cp">cp</option>
            <option value="rim">rim</option>
            <option value="lt">lt</option>
            <option value="mt">mt</option>
            <option value="ht">ht</option>
          </optgroup>
          <optgroup label="Percussion">
            <option value="conga">conga</option>
            <option value="cajon">cajon</option>
            <option value="wood">wood</option>
            <option value="shaker">shaker</option>
            <option value="cb">cb</option>
            <option value="perc">perc</option>
            <option value="hand">hand</option>
          </optgroup>
        </select>

        <!--
        E(k,n) readout. Prototype line 435.
      -->
        <span data-tip={$t('header.rhythm.euclidInfoTip')}
          >E(<b>{euclidK}</b>,<b>{euclidN}</b>)</span
        >

        <!--
        k slider. Prototype line 436.
      -->
        <span data-tip={$t('header.rhythm.kTip')} title="k — golpes (hits)">k <b>{euclidK}</b></span
        >
        <input
          type="range"
          id="euclidK"
          min="1"
          max="16"
          bind:value={euclidK}
          aria-label="k — número de golpes"
          title="k — número de golpes (hits)"
          data-tip={$t('header.rhythm.kTip')}
          on:input={onConfigChange}
        />

        <!--
        n slider. Prototype line 437.
      -->
        <span data-tip={$t('header.rhythm.nTip')} title="n — pasos (steps)">n <b>{euclidN}</b></span
        >
        <input
          type="range"
          id="euclidN"
          min="2"
          max="16"
          bind:value={euclidN}
          aria-label="n — número de pasos"
          title="n — número de pasos (steps)"
          data-tip={$t('header.rhythm.nTip')}
          on:input={onConfigChange}
        />

        <!--
        rot readout + slider. Prototype lines 438–439.
      -->
        <span data-tip={$t('header.rhythm.rotTip')} title="rot — rotación (offset)"
          >rot <b>{euclidR}</b></span
        >
        <input
          type="range"
          id="euclidR"
          min="0"
          max={euclidRMax}
          bind:value={euclidR}
          aria-label="rot — rotación del patrón"
          title="rot — rotación del patrón (offset)"
          data-tip={$t('header.rhythm.rotSliderTip')}
          on:input={onConfigChange}
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
          data-tip={$t('header.rhythm.previewTip')}
          style={isPreviewing
            ? 'background:rgba(232,123,172,.16);border-color:rgba(232,123,172,.4);color:var(--dom)'
            : 'background:rgba(86,207,196,.16);border-color:rgba(86,207,196,.4);color:var(--subdom)'}
          on:click={handlePreviewToggle}
        >
          {isPreviewing ? $t('header.rhythm.stopLabel') : $t('header.rhythm.listenLabel')}
        </button>

        <!--
        Add euclid orbit. Prototype line 442.
      -->
        <button
          class="rk"
          id="addEuclid"
          data-tip={$t('header.rhythm.addOrbitTip')}
          on:click={handleAddEuclid}
        >
          {$t('header.rhythm.addOrbit')}
        </button>

        <!--
        Add empty layer. Prototype line 443.
      -->
        <button
          class="rk"
          id="addLayerEmpty"
          data-tip={$t('header.rhythm.addEmptyTip')}
          style="background:rgba(255,255,255,.05);border-color:var(--stroke);color:var(--muted)"
          on:click={handleAddEmpty}
        >
          {$t('header.rhythm.addEmpty')}
        </button>

        <!--
        Context capture button: send current groove to the agent as rhythmic base.
        Prototype: button#rhythmToCtx in footer (line 511).
        Active state when $agentCtx.includeRhythm is true.
      -->
        <button
          class="rk r-ctx-btn"
          class:active={$agentCtx.includeRhythm}
          title={$t('header.rhythm.sendBaseTitle')}
          on:click={() => agentCtx.update((c) => ({ ...c, includeRhythm: true }))}
          >{$t('header.rhythm.sendBaseLabel')}</button
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
          {$t('header.harmony.subviewTonnetz')}
        </button>
        <button
          class={$sessionStore.harmony.subview === 'staff' ? 'active' : ''}
          on:click={() => setHarmonySubview('staff')}
        >
          {$t('header.harmony.subviewStaff')}
        </button>
      </div>

      <!--
      Phase 10 redesign (step 10.11, ADR 0015 D2): #registerModeSeg removed.
      The estricto/suavizado toggle was a Phase 08 addition. The Canvas 2D
      Pentagrama layer uses raw chordVoicing() pitches directly — no register
      mode needed. The HarmonyState.registerMode field remains in the store
      type (inert, not rendered); voice-tracks.ts is left inert (not deleted).
    -->

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
          data-tip={$t('header.harmony.chordTip')}
          on:click={() => setChordMode('chord')}
        >
          {$t('header.harmony.chordLabel')}
        </button>
        <button
          class={$sessionStore.chordMode === 'arp' ? 'active' : ''}
          data-mode="arp"
          data-tip={$t('header.harmony.arpTip')}
          on:click={() => setChordMode('arp')}
        >
          {$t('header.harmony.arpLabel')}
        </button>
      </div>

      <!--
      note-placement Phase 01 step 01.4: Note-mode toggle.
      Only shown when the Tonnetz sub-view is active (note-mode applies to vertex clicks).
      Clicking toggles HarmonyState.noteMode via setNoteMode().
      Active state uses class:active which is already defined in existing CSS.
      EPHEMERAL: noteMode is not persisted; resets to false on session load.
    -->
      {#if $sessionStore.harmony.subview === 'tonnetz'}
        <button
          id="noteModeToggle"
          class:active={$sessionStore.harmony.noteMode}
          data-tip={$t('header.harmony.noteModeTip')}
          on:click={() => setNoteMode(!$sessionStore.harmony.noteMode)}
        >
          {$sessionStore.harmony.noteMode
            ? $t('header.harmony.noteModeNoteLabel')
            : $t('header.harmony.noteModeChordLabel')}
        </button>
      {/if}

      <!--
      Phase 08 (step 08.6): Marco context button relocated from HarmonyControls.svelte.
      Prototype: button#harmonyToCtx in footer (line 510); moved to top bar per ADR 0011 Amendment §D6.
      Active state when $agentCtx.includeHarmony is true.
      On click: sets agentCtx.includeHarmony = true so the next agent send includes the harmony context.
    -->
      <button
        class="marco-btn"
        class:active={$agentCtx.includeHarmony}
        title={$t('header.harmony.sendMarcoTitle')}
        on:click={() => agentCtx.update((c) => ({ ...c, includeHarmony: true }))}
      >
        {$t('header.harmony.sendMarcoLabel')}
      </button>

      <div class="field">
        <span>{$t('header.harmony.keyLabel')}</span>

        <!-- Root pitch-class select: C, C#, …, B (0–11). Prototype: #melRoot (line 372). -->
        <!-- value= is one-way from store; on:change reads event.currentTarget.value (Defect 2 fix). -->
        <select
          id="melRoot"
          value={String($sessionStore.harmony.root)}
          on:change={handleRootChange}
        >
          {#each NOTE_NAMES as name, i}
            <option value={String(i)}>{name}</option>
          {/each}
        </select>

        <!-- Mode select. Prototype: #melMode (lines 373–382). -->
        <select id="melMode" value={$sessionStore.harmony.mode} on:change={handleModeChange}>
          <option value="major">{$t('header.harmony.modeMajor')}</option>
          <option value="minor">{$t('header.harmony.modeMinor')}</option>
          <option value="dorian">{$t('header.harmony.modeDorian')}</option>
          <option value="phrygian">{$t('header.harmony.modePhrygian')}</option>
          <option value="lydian">{$t('header.harmony.modeLydian')}</option>
          <option value="mixolydian">{$t('header.harmony.modeMixolydian')}</option>
          <option value="locrian">{$t('header.harmony.modeLocrian')}</option>
          <option value="harmonic:minor">{$t('header.harmony.modeHarmonicMinor')}</option>
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

      <!--
        Sound attribute controls (Phase 03 step 03.5 — ADR 0019).
        Redesigned: two <select> menus (Oscillator + Presets) replace the Phase 02
        instrument select + room/decay sliders. Room/decay are now preset-internal.
        Placement: AFTER clave/escala/octava (position 5, end of row). ADR 0019 D1–D3.

        Edit-mode feedback (A-02-08 resolution → A-03-07/A-03-08):
        - .sound-ctl--active: persistent accent border when a slot is selected.
        - .sound-ctl--pulse: transient 300ms flash when the selection CHANGES to
          a new non-null index (class is toggled by the reactive block above).
        - Tooltip describes edit vs. intent mode.

        Waveform/noise option values and preset option values are [VERBATIM] technical
        tokens (OQ-6/ADR 0017); display labels come from the i18n dictionary.
      -->
      <div
        class="sound-ctl"
        class:sound-ctl--active={$selectedSlotIdxStore !== null}
        class:sound-ctl--pulse={soundCtlPulsing}
        title={$selectedSlotIdxStore !== null
          ? $t('header.harmony.soundEditTip')
          : $t('header.harmony.soundIntentTip')}
      >
        <span class="sound-lbl">{$t('header.harmony.soundLabel')}</span>

        <!-- Oscillator select (ADR 0019 D1: instrument field, UI label "Oscillator") -->
        <label class="sound-field" title={$t('header.harmony.oscillatorLabel')}>
          <span>{$t('header.harmony.oscillatorLabel')}</span>
          <select id="instrSelect" value={displayInstrument} on:change={handleOscillatorChange}>
            <option value="sine">{$t('header.harmony.instrSine')}</option>
            <option value="triangle">{$t('header.harmony.instrTriangle')}</option>
            <option value="square">{$t('header.harmony.instrSquare')}</option>
            <option value="sawtooth">{$t('header.harmony.instrSawtooth')}</option>
            <option value="pink">{$t('header.harmony.instrNoise')}</option>
          </select>
        </label>

        <!-- Presets select (ADR 0019 D2: name-only; '' = no preset) -->
        <label class="sound-field" title={$t('header.harmony.presetLabel')}>
          <span>{$t('header.harmony.presetLabel')}</span>
          <select id="presetSelect" value={displayPreset} on:change={handlePresetChange}>
            <option value="">{$t('header.harmony.presetNone')}</option>
            <option value="piano">{$t('header.harmony.presetPiano')}</option>
            <option value="guitar">{$t('header.harmony.presetGuitar')}</option>
            <option value="synth-bass">{$t('header.harmony.presetSynthBass')}</option>
          </select>
        </label>
      </div>
    {/if}
  </div>

  <!--
    Right side: mic button deferred to a later phase (not in Phase 04 scope).
    Prototype: #micBtn (lines 390–393) — deferred.
    keyBox span (line 394) — deferred.
  -->
</header>

<!--
  Euclid preview bar — sits immediately below the header in normal document flow.
  Appears when the user moves any euclid control; disappears when "+" is pressed
  (fly-down animation) or when "×" is clicked (fade-up dismiss).
  Being in normal flow means it never shifts the header controls.
-->
{#if showPreview}
  <div class="preview-bar" class:preview-flying={isFlying} class:preview-dismissing={isDismissing}>
    <span class="preview-label">preview</span>
    <StepEditor layers={[previewLayer]} onToggle={handlePreviewStepToggle} />
    <button class="preview-close" title="Descartar preview" on:click={dismissPreview}>×</button>
  </div>
{/if}

<style>
  /*
   * Header layout. Prototype lines 69–72.
   * .glass applied via global app.css utility class.
   */
  /*
   * Phase 11 Checkpoint #5 redesign: the header is now a two-row column.
   * Top row = global nav + language + tutorial; bottom row = section controls.
   * position:relative + z-index:6 raises the header's stacking context above
   * the Legend bar (z-index:3) and the PIXI canvas (both painted in #app's
   * context), so the absolutely-positioned language menu renders over them.
   * It stays below the agent panel (#agent z-index:7) so opening the agent
   * still overlays the header as before. (.glass sets backdrop-filter, which
   * forms a stacking context; without an explicit positive z-index it landed
   * below the Legend's z-index:3 — that trapped the old position:fixed menu.)
   */
  header {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 11px 20px;
    margin: 10px 12px 0;
    border-radius: 18px;
    position: relative;
    z-index: 6;
  }

  /* A single horizontal control row inside the header. */
  .hdr-row {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
  }

  /* Bottom row of section-specific controls; tighter gap, smaller text. */
  .hdr-bottom {
    gap: 14px;
  }

  /* Collapse the bottom row entirely when the active view has no controls. */
  .hdr-bottom.hidden {
    display: none;
  }

  /* Brand group: glyph + h1 + tag. Prototype lines 73–76.
     Now an <a> to the landing page — strip link styling, keep the layout. */
  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
    text-decoration: none;
    color: inherit;
    cursor: pointer;
    border-radius: 8px;
    padding: 2px 4px;
    margin: -2px -4px;
    transition: background 0.15s;
  }

  .brand:hover {
    background: rgba(255, 255, 255, 0.05);
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

  /*
   * Language selector (Phase 11 step 11.3 — ADR 0017 OQ-5).
   * Checkpoint #5 bug-fix: .lang-sel uses flex-shrink:0 + white-space:nowrap
   * so the button never wraps in the crowded Rhythm view header.
   * .lang-menu is position:fixed so it escapes the header stacking context
   * and renders above the PIXI canvas at z-index:9000.
   */
  .lang-sel {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    position: relative;
  }

  /* 文A toggle button — matches .tutorial-link visual weight. */
  .lang-btn {
    font-size: 13px;
    font-weight: 600;
    padding: 5px 9px;
    border-radius: 8px;
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.04);
    color: var(--faint);
    cursor: pointer;
    white-space: nowrap;
    min-width: 2.4em;
    transition:
      color 0.15s,
      border-color 0.15s;
    line-height: 1.2;
  }

  .lang-btn:hover {
    color: var(--text);
    border-color: var(--stroke-2);
  }

  /* Dropdown list — position:absolute anchored to .lang-sel, right-aligned under
   * the 文A button. The header's raised stacking context (header z-index:50)
   * lifts the whole menu above the PIXI canvas and the Legend bar; the high
   * local z-index keeps it above sibling header controls. */
  .lang-menu {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    list-style: none;
    margin: 0;
    padding: 4px 0;
    background: var(--bg, #0f1117);
    border: 1px solid var(--stroke);
    border-radius: 10px;
    min-width: 110px;
    z-index: 9000;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  }

  .lang-menu li {
    margin: 0;
    padding: 0;
  }

  /* Individual language option button */
  .lang-option {
    display: block;
    width: 100%;
    text-align: left;
    padding: 7px 14px;
    font-size: 12px;
    font-weight: 500;
    color: var(--muted);
    background: none;
    border: none;
    cursor: pointer;
    transition:
      background 0.1s,
      color 0.1s;
    white-space: nowrap;
  }

  .lang-option:hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text);
  }

  /* Active (currently selected) language */
  .lang-option.active {
    color: var(--accent);
  }

  /*
   * Sound attribute controls (Phase 03 step 03.5 — ADR 0019 redesign).
   * Inline-flex row matching header bottom-row aesthetic; font + spacing
   * mirrors the existing .field and .rhythm-ctl patterns.
   * Replaces the Phase 02 flat block (instrument select + room/decay sliders).
   */
  .sound-ctl {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 11px;
    color: var(--muted);
    flex-wrap: wrap;
    border-radius: 10px;
    padding: 4px 8px;
    border: 1px solid transparent;
    transition:
      border-color 0.2s,
      background 0.2s;
  }

  /*
   * Edit-mode persistent accent border (A-03-07).
   * Shown when $selectedSlotIdxStore !== null (a Pentagrama slot is selected).
   * --accent (#8aa0ff) per CLAUDE.md tonal-function color spec.
   */
  .sound-ctl--active {
    border-color: rgba(138, 160, 255, 0.55);
    background: rgba(138, 160, 255, 0.07);
  }

  /*
   * Transient color pulse (A-03-08).
   * Plays a brief ~300ms flash on accent color when the selection changes to
   * a new non-null slot index. Added and removed by the Svelte reactive block.
   */
  @keyframes soundCtlPulse {
    0% {
      border-color: rgba(138, 160, 255, 0.9);
      background: rgba(138, 160, 255, 0.22);
      box-shadow: 0 0 8px rgba(138, 160, 255, 0.4);
    }
    100% {
      border-color: rgba(138, 160, 255, 0.55);
      background: rgba(138, 160, 255, 0.07);
      box-shadow: none;
    }
  }

  .sound-ctl--pulse {
    animation: soundCtlPulse 320ms ease-out forwards;
  }

  .sound-lbl {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--faint);
    white-space: nowrap;
  }

  .sound-field {
    display: flex;
    align-items: center;
    gap: 5px;
    white-space: nowrap;
  }

  .sound-field span {
    color: var(--muted);
    font-size: 11px;
  }

  .sound-field select {
    background: rgba(0, 0, 0, 0.34);
    border: 1px solid var(--stroke);
    color: var(--text);
    border-radius: 8px;
    padding: 4px 6px;
    font-size: 11px;
  }

  /* Euclid preview bar — flows below the header, never inside it */
  .preview-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 5px 16px 6px;
    background: rgba(10, 13, 25, 0.72);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    box-sizing: border-box;
    transition:
      opacity 0.28s ease-in,
      transform 0.28s ease-in;
    opacity: 1;
    transform: translateY(0);
  }
  /* "+" pressed — fly toward canvas */
  .preview-bar.preview-flying {
    opacity: 0;
    transform: translateY(36px) scale(0.94);
    pointer-events: none;
  }
  /* "×" pressed — slide up and fade */
  .preview-bar.preview-dismissing {
    opacity: 0;
    transform: translateY(-8px);
    pointer-events: none;
  }
  .preview-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(255, 255, 255, 0.3);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .preview-close {
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.35);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition:
      color 0.15s,
      background 0.15s;
  }
  .preview-close:hover {
    color: rgba(255, 255, 255, 0.8);
    background: rgba(255, 255, 255, 0.08);
  }
</style>

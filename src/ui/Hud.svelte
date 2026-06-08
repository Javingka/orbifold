<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — voice-leading HUD overlay.
  Phase 04 step 04.5: ports .hud#hud (prototype HTML lines 409–412, CSS lines 111–117).

  Receives props from App.svelte which reads $hudStore.
  Uses {@html sub} for voice-leading detail with accent-colored <span class="mv"> elements.
  Prototype showHud() sets .show class (line 1382); here the show class is driven by the
  `visible` prop (Svelte class directive).
-->
<script lang="ts">
  /**
   * Chord transition label, e.g. "Cmaj → Amin" or first-pick name.
   * Prototype: `hudTitle.textContent` (line 1380).
   */
  export let title: string = '—';

  /**
   * Voice-leading detail string (may contain HTML spans with class "mv").
   * Prototype: `hudSub.innerHTML` (line 1381).
   */
  export let sub: string = '';

  /**
   * Whether the HUD is visible (opacity: 1, translateY: 0).
   * Driven by `hudStore.visible`, auto-cleared after 4 200 ms by hud.ts.
   * Prototype: `.hud.show` class (line 114).
   */
  export let visible: boolean = false;
</script>

<!--
  .hud.glass: position:absolute top-left of #stage (prototype CSS lines 111–117).
  .show class: opacity + translateY transition (prototype lines 113–114).
-->
<div class="hud glass" class:show={visible} id="hud" aria-live="polite">
  <div class="vl-title" id="hudTitle">{title}</div>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  <div class="vl-sub" id="hudSub">{@html sub}</div>
</div>

<style>
  /*
   * Prototype CSS lines 111–117.
   * position:absolute top-left of #stage (the parent is position:relative #stage).
   * Opacity + translateY transition driven by .show class.
   */
  .hud {
    position: absolute;
    top: 16px;
    left: 16px;
    max-width: 340px;
    padding: 11px 14px;
    border-radius: 14px;
    pointer-events: none;
    opacity: 0;
    transform: translateY(-4px);
    transition: all 0.3s;
    z-index: 3;
  }

  .hud.show {
    opacity: 1;
    transform: none;
  }

  .hud :global(.vl-title) {
    font-family: 'Fraunces', serif;
    font-size: 16px;
    margin-bottom: 3px;
  }

  .hud :global(.vl-sub) {
    font-size: 11px;
    color: var(--muted);
    font-family: 'IBM Plex Mono', monospace;
  }

  /* Accent color for voice-move spans injected via {@html sub}. */
  /* Prototype: .hud .vl-sub .mv { color: var(--accent); } (line 117). */
  .hud :global(.mv) {
    color: var(--accent);
  }
</style>

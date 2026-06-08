<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — tonal-function color legend overlay.
  Phase 04 step 04.5: ports .legend#legend (prototype HTML lines 414–421, CSS lines 122–127).

  Shown only when view === 'harmony' (prototype hides with .legend.hide in rhythm view).
  Static content: four colored squares with labels, a separator, and triangle/PLR gloss.
  Colors use CSS custom properties from app.css (var(--tonic), --subdom, --dom, --accent).
  position: absolute top-right of #stage (parent is position:relative #stage).
-->
<script lang="ts">
  import { sessionStore } from '../state/session.js';

  /** Derived from store: only show in harmony view. */
  $: visible = $sessionStore.view === 'harmony';
</script>

{#if visible}
  <!--
    .legend.glass: position:absolute top-right of #stage.
    Prototype HTML lines 414–421, CSS lines 122–127.
  -->
  <div class="legend glass" id="legend">
    <span><i style="background:var(--tonic)"></i>tónica</span>
    <span><i style="background:var(--subdom)"></i>subdom.</span>
    <span><i style="background:var(--dom)"></i>dominante</span>
    <span style="opacity:.4">│</span>
    <span style="color:var(--faint)">▲ mayor · ▼ menor</span>
    <span style="color:#b9c6ff">P·L·R vecinos</span>
  </div>
{/if}

<style>
  /*
   * Prototype CSS lines 122–127.
   * position:absolute top-right of #stage (parent position:relative).
   * pointer-events:none — does not intercept Tonnetz interactions.
   */
  .legend {
    position: absolute;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 12px;
    padding: 8px 12px;
    border-radius: 12px;
    font-size: 10px;
    color: var(--muted);
    pointer-events: none;
    z-index: 3;
  }

  .legend span {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  /* Colored square: 9×9 px with 3 px border-radius (prototype line 127). */
  .legend :global(i) {
    width: 9px;
    height: 9px;
    border-radius: 3px;
    display: inline-block;
    font-style: normal;
  }
</style>

<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — global [data-tip] tooltip.
  Phase 04 step 04.5: ports #tip and tooltip JS (prototype HTML line 576, CSS lines 339–344,
  JS lines 2128–2148).

  A single fixed <div id="tip"> tracks [data-tip] elements via mouseover/mouseout on document.
  Shows/hides via .show class (opacity + translateY transition, prototype lines 343–344).
  Position: above the hovered element, clamped to viewport edges (prototype place() lines 2131–2138).
  Uses mouseover/mouseout (not pointermove) to match the prototype's event delegation approach.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let tipEl: HTMLDivElement;
  let cur: Element | null = null;

  /**
   * Position the tooltip above the target element, clamped to viewport.
   * Prototype: place(el) function, lines 2131–2138.
   */
  function place(el: Element): void {
    const r = el.getBoundingClientRect();
    const tr = tipEl.getBoundingClientRect();
    let left = r.left + r.width / 2 - tr.width / 2;
    left = Math.max(8, Math.min(window.innerWidth - tr.width - 8, left));
    let top = r.top - tr.height - 8;
    if (top < 8) top = r.bottom + 8;
    tipEl.style.left = `${left}px`;
    tipEl.style.top = `${top}px`;
  }

  /**
   * mouseover handler: show tooltip if target has [data-tip].
   * Prototype lines 2140–2143.
   */
  function onOver(e: MouseEvent): void {
    const el = (e.target as Element).closest('[data-tip]');
    if (el && el !== cur) {
      cur = el;
      tipEl.textContent = el.getAttribute('data-tip') ?? '';
      tipEl.classList.add('show');
      place(el);
    }
  }

  /**
   * mouseout handler: hide tooltip when leaving a [data-tip] element.
   * Prototype lines 2144–2146.
   */
  function onOut(e: MouseEvent): void {
    const el = (e.target as Element).closest('[data-tip]');
    if (el && !el.contains(e.relatedTarget as Node | null)) {
      cur = null;
      tipEl.classList.remove('show');
    }
  }

  onMount(() => {
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);
  });

  onDestroy(() => {
    document.removeEventListener('mouseover', onOver);
    document.removeEventListener('mouseout', onOut);
  });
</script>

<!--
  Single fixed tooltip div. Rendered once; visibility is toggled via .show class.
  Prototype HTML: <div id="tip"></div> at line 576, outside #app.
  CSS: prototype lines 339–344.
-->
<div id="tip" bind:this={tipEl}></div>

<style>
  /*
   * Prototype CSS lines 339–344.
   * position:fixed z-index:60; hidden by default (opacity:0, translateY(4px)).
   * .show: opacity:1 + translateY(0), transition .12s (prototype line 344).
   */
  #tip {
    position: fixed;
    z-index: 60;
    max-width: 260px;
    padding: 8px 11px;
    border-radius: 10px;
    pointer-events: none;
    background: rgba(12, 15, 22, 0.96);
    border: 1px solid var(--stroke);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.55);
    font-size: 11.5px;
    line-height: 1.45;
    color: var(--text);
    opacity: 0;
    transform: translateY(4px);
    transition:
      opacity 0.12s,
      transform 0.12s;
  }

  #tip :global(.show) {
    opacity: 1;
    transform: translateY(0);
  }

  /* The .show class is added/removed directly on the element via classList,
     so we need a non-scoped selector. Using :global wrapper here: */
  :global(#tip.show) {
    opacity: 1;
    transform: translateY(0);
  }
</style>

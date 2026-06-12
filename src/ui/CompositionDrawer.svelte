<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — CompositionDrawer component.

  Ports prototype #compTab + #compDrawer (HTML lines 530–574, CSS lines 251–314,
  JS lines 1927–2127).

  Phase 09 step 09.4: Elevated to a primary view (ADR 0013 D2 Option D1).
  The #compTab button is removed — navigation is now handled by the 4-tab seg
  control in Header.svelte. The component is mounted/unmounted by App.svelte via a
  {#if $sessionStore.view === 'composition'} gate. When mounted, it fills #stage
  via flex:1 layout (replacing position:fixed + translateY slide mechanism).

  The `open` boolean is set to true on onMount and the rAF loop runs for the entire
  component lifetime (the {#if} gate replaces the slide open/close mechanic). Per
  ADR 0013 D2: "After D2 the `open` variable in CompositionDrawer is always true
  while mounted... so compTickLoop runs continuously while the Composición view is
  active and stops on unmount."

  Drawer #compDrawer.glass:
    Fills #stage via flex:1 (no slide). Two-column .comp-grid inside.
    Prototype: `#compDrawer` (HTML lines 532–574).

  Block library column (.comp-col):
    Header "1 · guardar bloques" + sub description.
    Save row: three .tbtn buttons to add a groove/harmony/session block.
    Block list: {#each} loop rendering .blk items.
    Empty state: .arr-empty.
    Prototype: `renderBlocks()` (lines 1951–1970).

  Timeline column (.comp-col):
    Header "2 · línea de tiempo" + hint + "+ pista" button.
    .timeline grid (120 px heads + 1fr scroll).
    Track heads (.tl-heads): .tl-head-ruler spacer + one .tl-head per track.
    Scroll area (.tl-scroll → .tl-inner):
      CSS custom property --ppb: 48px.
      Bar ruler (.tl-ruler) with bar-num spans.
      Per-track .tl-lane with positioned .tl-block elements.
      .tl-add drop-zone with <select>.
      .tl-playhead (shown when playing/paused; driven by rAF loop).
    Prototype: `renderTimeline()` (lines 1983–2052).

  Transport row: ▶ tocar / ⏸ pausa / ■ stop / limpiar todo + compInfo span.
    Prototype: lines 2117–2124.

  Playhead rAF loop (`compTickLoop` equivalent):
    Started in onMount, cancelled in onDestroy.
    Each frame: if open and state !== 'stopped', call compPos(bpm, totalBars),
    update playheadLeft/playheadOn reactively. Auto-scroll logic.
    Highlight active block per track using reactive activeBlock map.
    Prototype: `compTickLoop()` (lines 2073–2091).

  Close button ✕: closes drawer.
    Prototype: `compClose.onclick` (line 2126).

  Helper functions (component-local, not exported):
    gridBars(): Math.max(totalBars + 4, 16). Prototype line 1974.
    tagClsOf(b): 'groove'|'armonia'|'sesion'. Prototype line 1949.
    tagOf(b): 'ritmo'|'armonía'|'sesión'. Prototype line 1948.
    startBarOf(track, refIndex): bar offset of a block ref within its track.
    trackContentBars(track): sum of ref.bars for that track.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { sessionStore } from '../state/session.js';
  import {
    addBlock,
    deleteBlock,
    renameBlock,
    playBlockById,
    addTrack,
    removeTrack,
    addBlockToTrack,
    addBlockAsNewTrack,
    removeBlockFromTrack,
    setBlockBars,
    reorderBlockInTrack,
    moveBlockBetweenTracks,
    playComposition,
    pauseComposition,
    stopComposition,
  } from '../state/session.js';
  import { PPB, compPos, getCompState } from '../state/composition.js';
  import type { Block } from '../core/composition/model.js';

  // ── Local state ────────────────────────────────────────────────────────────

  /** Whether the composition drawer is open. Transient — NOT in sessionStore. */
  let open = false;

  /** Reactive playhead horizontal position in pixels. */
  let playheadLeft = 0;

  /** Whether the playhead is visible (playing or paused). */
  let playheadOn = false;

  /**
   * Reactive compInfo label shown below the transport buttons.
   * Prototype line 2051 (static): pistas + compases count.
   * Prototype line 2085 (playing): ▶ compás N / tb.
   */
  let compInfo = '';

  /**
   * Map of (trackIndex → refIndex) for the currently active (playing) block
   * in each track. Updated each rAF frame. Used to add .playing class reactively.
   * Prototype: `tracks.forEach(...el.classList.add('playing'))` (lines 2083–2084).
   */
  let activeBlocks: Map<number, number> = new Map();

  /** rAF loop handle for the playhead animation. */
  let rafId: number | null = null;

  /** Reference to the .tl-scroll element for auto-scroll. */
  let scrollEl: HTMLElement | null = null;

  // ── Reactive helpers ───────────────────────────────────────────────────────

  /**
   * Compute total bars (longest track sum) from the store.
   * Prototype: `totalBars()` (line 1973).
   */
  function totalBarsValue(): number {
    const s = $sessionStore;
    const { blocks, tracks } = s.composition;
    let max = 1;
    tracks.forEach((t) => {
      let sum = 0;
      t.blocks.forEach((ref) => {
        const b = blocks.find((x) => x.id === ref.blockId);
        if (b) sum += ref.bars;
      });
      if (sum > max) max = sum;
    });
    return max;
  }

  /**
   * Grid bar count = totalBars + 4, minimum 16.
   * Prototype: `gridBars()` (line 1974).
   */
  function gridBars(): number {
    return Math.max(totalBarsValue() + 4, 16);
  }

  /**
   * CSS type class for a block.
   * Prototype: `tagClsOf(b)` (line 1949).
   */
  function tagClsOf(b: Block): string {
    return b.type === 'groove' ? 'groove' : b.type === 'armonia' ? 'armonia' : 'sesion';
  }

  /**
   * Human-readable type label for a block.
   * Prototype: `tagOf(b)` (line 1948).
   */
  function tagOf(b: Block): string {
    return b.type === 'groove' ? 'ritmo' : b.type === 'armonia' ? 'armonía' : 'sesión';
  }

  /**
   * Compute the start bar (pixel offset anchor) of a block ref within its track.
   * Iterates refs[0..refIndex-1] summing bars.
   */
  function startBarOf(trackBlocks: { blockId: string; bars: number }[], refIndex: number): number {
    let acc = 0;
    for (let i = 0; i < refIndex; i++) {
      acc += trackBlocks[i].bars;
    }
    return acc;
  }

  /**
   * Sum of bars for all refs in a track.
   * Prototype: `contentBars(t)` (line 1972).
   */
  function trackContentBars(trackBlocks: { blockId: string; bars: number }[]): number {
    return trackBlocks.reduce((a, r) => a + r.bars, 0);
  }

  // ── Drawer open/close ──────────────────────────────────────────────────────
  // Phase 09 step 09.4: The {#if} gate in App.svelte controls mounting/unmounting.
  // handleOpen / handleClose are removed — the close button and tab button are gone.
  // open is always true while mounted (set in onMount) so compTickLoop runs for the
  // full component lifetime. Navigating away via Header.svelte unmounts the component.

  // ── Playhead rAF loop (`compTickLoop` equivalent) ──────────────────────────

  /**
   * Start the rAF loop if not already running.
   * Prototype: `ensureCompLoop()` (line 2092).
   */
  function ensureLoop(): void {
    if (rafId === null) {
      rafId = requestAnimationFrame(compTickLoop);
    }
  }

  /**
   * rAF callback — drives playhead position and active-block highlights.
   * Prototype: `compTickLoop()` (lines 2073–2091).
   *
   * - Exits (stops loop) when the drawer is closed.
   * - When playing or paused: updates playheadLeft, playheadOn, activeBlocks, compInfo.
   * - Auto-scrolls the timeline scroll container when playhead near edges.
   * - When stopped: hides playhead and clears highlights.
   */
  function compTickLoop(): void {
    if (!open) {
      rafId = null;
      return;
    }

    const state = $sessionStore;
    const compState = getCompState();
    const { blocks, tracks } = state.composition;
    const bpm = state.bpm;
    const tb = totalBarsValue();

    if (compState === 'playing' || compState === 'paused') {
      const { pos } = compPos(bpm, tb);
      playheadLeft = pos * PPB;
      playheadOn = true;

      // Auto-scroll: keep playhead in view (30px margin).
      // Prototype line 2081: `if (x < scroll.scrollLeft+30 || x > scroll.scrollLeft+scroll.clientWidth-30) scroll.scrollLeft=...`
      if (compState === 'playing' && scrollEl !== null) {
        const x = playheadLeft;
        if (x < scrollEl.scrollLeft + 30 || x > scrollEl.scrollLeft + scrollEl.clientWidth - 30) {
          scrollEl.scrollLeft = Math.max(0, x - scrollEl.clientWidth * 0.3);
        }
      }

      // Determine active block per track.
      // Prototype lines 2083–2084: find the block ref that contains `pos`.
      const newActive = new Map<number, number>();
      tracks.forEach((t, ti) => {
        let acc = 0;
        for (let ri = 0; ri < t.blocks.length; ri++) {
          const ref = t.blocks[ri];
          const b = blocks.find((x) => x.id === ref.blockId);
          if (!b) {
            acc += ref.bars;
            continue;
          }
          if (pos >= acc && pos < acc + ref.bars) {
            newActive.set(ti, ri);
            break;
          }
          acc += ref.bars;
        }
      });
      activeBlocks = newActive;

      // compInfo: "▶ compás N / tb" or "⏸ compás N / tb".
      // Prototype line 2085.
      const icon = compState === 'playing' ? '▶' : '⏸';
      compInfo = `${icon} compás ${Math.floor(pos) + 1} / ${tb}`;
    } else {
      // stopped
      playheadOn = false;
      activeBlocks = new Map();
      // compInfo: static track/bar count.
      // Prototype line 2051.
      const tl = tracks.length;
      const tb2 = totalBarsValue();
      compInfo = `${tl} pista${tl === 1 ? '' : 's'} · ${tb2} compás${tb2 === 1 ? '' : 'es'}`;
    }

    rafId = requestAnimationFrame(compTickLoop);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // Phase 09 step 09.4: Set open=true on mount so compTickLoop runs for the full
  // component lifetime. The {#if} gate in App.svelte (view === 'composition')
  // replaces the slide open/close mechanic. Per ADR 0013 D2: "compTickLoop runs
  // continuously while the Composición view is active and stops on unmount."

  onMount(() => {
    open = true;
    ensureLoop();
  });

  onDestroy(() => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  });

  // ── Block name rename handler ─────────────────────────────────────────────

  /**
   * Handle contenteditable input on a block name span.
   * Prototype line 1960: `.nm contenteditable` input handler.
   */
  function handleBlockRename(e: Event, blockId: string, fallback: string): void {
    const el = e.target as HTMLElement;
    renameBlock(blockId, el.textContent ?? fallback);
  }

  // ── Drag-to-reorder state ─────────────────────────────────────────────────
  // Per-block drag state. We store drag context in module-level variables (one
  // active drag at a time). This mirrors the prototype's closure vars (line 2026).

  let dragTrackIndex = -1;
  let dragRefIndex = -1;
  let dragMx = 0;
  let dragEl: HTMLElement | null = null;
  let dragging = false;

  /**
   * The track index the pointer is currently hovering over during a drag.
   * -1 when not dragging or pointer is not over any lane.
   * Drives the `.drag-over` CSS class on `.tl-lane` elements.
   */
  let dragOverTrackIndex = -1;

  /**
   * Initiate drag on a block body.
   * Prototype lines 2027–2030.
   */
  function handleBlockPointerDown(e: PointerEvent): void {
    const target = e.target as HTMLElement;
    // Skip if clicking grip, bx, or input (they have their own handlers).
    if (
      target.classList.contains('grip') ||
      target.classList.contains('bx') ||
      target.tagName === 'INPUT'
    ) {
      return;
    }
    const el = e.currentTarget as HTMLElement;
    const ti = Number(el.dataset.tk);
    const ri = Number(el.dataset.ri);
    e.stopPropagation();
    dragging = true;
    dragTrackIndex = ti;
    dragRefIndex = ri;
    dragMx = e.clientX;
    dragEl = el;
    el.style.zIndex = '20';
    el.style.cursor = 'grabbing';
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  /**
   * Translate dragged block visually and detect cross-track hover.
   * Prototype line 2031 (horizontal translate).
   * Extended: detect which .tl-lane the pointer is over for vertical drop.
   */
  function handleBlockPointerMove(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    if (!dragging || dragEl !== el) return;
    el.style.transform = `translateX(${e.clientX - dragMx}px)`;

    // Detect which .tl-lane the pointer is hovering over.
    // Temporarily hide the dragged element so elementFromPoint can see the lane beneath.
    el.style.pointerEvents = 'none';
    const under = document.elementFromPoint(e.clientX, e.clientY);
    el.style.pointerEvents = '';
    const lane = under !== null ? (under.closest('.tl-lane') as HTMLElement | null) : null;
    if (lane !== null && lane.dataset.tklane !== undefined) {
      dragOverTrackIndex = Number(lane.dataset.tklane);
    } else {
      dragOverTrackIndex = -1;
    }
  }

  /**
   * Commit drag: compute target track and index, call reorderBlockInTrack or
   * moveBlockBetweenTracks depending on whether the drop is within the same
   * track or across tracks.
   * Prototype lines 2032–2039 (within-track reorder; cross-track is extended behavior).
   */
  function handleBlockPointerUp(e: PointerEvent): void {
    const el = e.currentTarget as HTMLElement;
    if (!dragging || dragEl !== el) return;
    dragging = false;
    el.style.zIndex = '';
    el.style.cursor = 'grab';
    el.style.transform = '';
    try {
      el.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const srcTi = dragTrackIndex;
    const srcRi = dragRefIndex;
    const dstTi = dragOverTrackIndex >= 0 ? dragOverTrackIndex : srcTi;

    // Clear drag-over highlight.
    dragOverTrackIndex = -1;
    dragTrackIndex = -1;
    dragRefIndex = -1;
    dragEl = null;

    const state = $sessionStore;
    const srcRefs = state.composition.tracks[srcTi]?.blocks ?? [];
    const ref = srcRefs[srcRi];
    if (!ref) return;

    if (dstTi !== srcTi) {
      // Cross-track drop: determine insertion position in the destination track.
      // Use the horizontal pointer position relative to the scroll container to
      // find the bar position, then map to a ref index in the destination track.
      const dstRefs = state.composition.tracks[dstTi]?.blocks ?? [];
      // Find lane element for dst track to compute scroll offset.
      const laneEl =
        scrollEl !== null
          ? (scrollEl.querySelector(`.tl-lane[data-tklane="${dstTi}"]`) as HTMLElement | null)
          : null;
      const laneRect = laneEl !== null ? laneEl.getBoundingClientRect() : null;
      const scrollLeft = scrollEl !== null ? scrollEl.scrollLeft : 0;
      // pointerX relative to the inner scroll content (accounts for scrolling).
      const pointerBarPos = laneRect !== null ? (e.clientX - laneRect.left + scrollLeft) / PPB : 0;
      let acc3 = 0;
      let newIdx = dstRefs.length;
      for (let i = 0; i < dstRefs.length; i++) {
        if (pointerBarPos < acc3 + dstRefs[i].bars / 2) {
          newIdx = i;
          break;
        }
        acc3 += dstRefs[i].bars;
      }
      moveBlockBetweenTracks(srcTi, srcRi, dstTi, newIdx);
    } else {
      // Same-track reorder: original prototype logic.
      // Prototype lines 2034–2037:
      //   center = startBar*PPB + (e.clientX-mx) + (ref.bars*PPB)/2
      const startBar = Number(el.dataset.st);
      const center = startBar * PPB + (e.clientX - dragMx) + (ref.bars * PPB) / 2;
      let acc2 = 0;
      let newIdx = srcRefs.length;
      for (let i = 0; i < srcRefs.length; i++) {
        const w = srcRefs[i].bars * PPB;
        if (center < acc2 + w / 2) {
          newIdx = i;
          break;
        }
        acc2 += w;
      }
      reorderBlockInTrack(srcTi, srcRi, newIdx);
    }
  }

  // ── Grip resize state ─────────────────────────────────────────────────────
  // Per-block grip state; stored outside template to avoid closure GC issues.

  interface GripState {
    active: boolean;
    rx: number;
    rb: number;
    currentBars: number;
    ti: number;
    ri: number;
  }

  let gripState: GripState = { active: false, rx: 0, rb: 0, currentBars: 0, ti: -1, ri: -1 };

  /**
   * Initiate grip resize. Prototype lines 2021–2022.
   */
  function handleGripPointerDown(e: PointerEvent): void {
    e.stopPropagation();
    const grip = e.currentTarget as HTMLElement;
    const blockEl = grip.closest('.tl-block') as HTMLElement | null;
    if (!blockEl) return;
    const ti = Number(blockEl.dataset.tk);
    const ri = Number(blockEl.dataset.ri);
    const bars = Number(blockEl.dataset.bars);
    gripState = { active: true, rx: e.clientX, rb: bars, currentBars: bars, ti, ri };
    try {
      grip.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  /**
   * Update grip resize: resize the block element visually. Prototype line 2023.
   */
  function handleGripPointerMove(e: PointerEvent): void {
    if (!gripState.active) return;
    const grip = e.currentTarget as HTMLElement;
    const blockEl = grip.closest('.tl-block') as HTMLElement | null;
    if (!blockEl) return;
    const db = Math.round((e.clientX - gripState.rx) / PPB);
    const newBars = Math.max(1, Math.min(64, gripState.rb + db));
    gripState.currentBars = newBars;
    blockEl.style.width = `${newBars * PPB - 2}px`;
    const inputEl = blockEl.querySelector('input') as HTMLInputElement | null;
    if (inputEl) inputEl.value = String(newBars);
  }

  /**
   * Commit grip resize: call setBlockBars. Prototype line 2024.
   */
  function handleGripPointerUp(e: PointerEvent): void {
    if (!gripState.active) return;
    const grip = e.currentTarget as HTMLElement;
    gripState.active = false;
    try {
      grip.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setBlockBars(gripState.ti, gripState.ri, gripState.currentBars);
  }

  // ── Bar count input handlers ───────────────────────────────────────────────

  /**
   * Live-update block width as the user types in the bars input.
   * Prototype line 2017: `ref.bars = ...; el.style.width = ...`
   */
  function handleBarsInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    const blockEl = input.closest('.tl-block') as HTMLElement | null;
    if (!blockEl) return;
    const v = Math.max(1, Math.min(64, Number(input.value) || 1));
    blockEl.style.width = `${v * PPB - 2}px`;
  }

  /**
   * Commit bars input change to the store. Prototype line 2018.
   */
  function handleBarsChange(e: Event, ti: number, ri: number): void {
    const input = e.target as HTMLInputElement;
    const v = Math.max(1, Math.min(64, Number(input.value) || 1));
    setBlockBars(ti, ri, v);
  }

  // ── Add block from track selector ─────────────────────────────────────────

  /**
   * Add the selected block to the track and reset the select.
   * Prototype line 2047: selector onchange.
   */
  function handleAddFromSelect(e: Event, ti: number): void {
    const sel = e.target as HTMLSelectElement;
    if (sel.value) {
      addBlockToTrack(ti, sel.value);
      sel.value = '';
    }
  }

  // ── limpiar todo ──────────────────────────────────────────────────────────
  // Clears all tracks (replaces with one empty track); blocks remain in library.
  // Prototype line 2121: `tracks=[{id:'t'+(trkSeq++),blocks:[]}]; renderTimeline();`
  // Session.ts does not expose a clearTracks action; we call removeTrack iteratively.

  function clearAllTracks(): void {
    const count = $sessionStore.composition.tracks.length;
    for (let i = count - 1; i >= 0; i--) {
      removeTrack(i);
    }
  }

  // ── Derived arrays for template loops ────────────────────────────────────
  // These avoid unused destructured binding variables in {#each} loops,
  // which @typescript-eslint/no-unused-vars flags even with the _ prefix.

  /** Array of bar indices [0, 1, ..., gridBars()-1] for the ruler. */
  $: barNums = [...Array(gridBars()).keys()];

  /** Array of track indices [0, 1, ..., n-1] for the track heads column. */
  $: trackIndices = [...$sessionStore.composition.tracks.keys()];

  // ── compInfo static label ─────────────────────────────────────────────────
  // Updated each rAF frame for playing/paused; also updated reactively when stopped.

  $: {
    const tl = $sessionStore.composition.tracks.length;
    const tb = totalBarsValue();
    if (getCompState() === 'stopped') {
      compInfo = `${tl} pista${tl === 1 ? '' : 's'} · ${tb} compás${tb === 1 ? '' : 'es'}`;
    }
  }
</script>

<!--
  Primary-view content: fills #stage when App.svelte mounts this component via
  {#if $sessionStore.view === 'composition'}. The #compTab button is removed (Phase 09
  step 09.4 — navigation handled by 4-tab Header.svelte control; ADR 0013 D2).
  #compDrawer uses flex:1 + height:100% to fill the parent #stage container.
-->
<div id="compDrawer" class="glass">
  <!-- Header row: title + hint. Close button removed (navigate via Header.svelte). -->
  <!-- Prototype lines 533–537. -->
  <div class="code-head">
    <b>composición — arregla ritmos y armonías ya montados</b>
    <span style="font-size:10.5px;color:var(--faint)"
      >guarda bloques y ordénalos en el tiempo (cada uno dura N compases)</span
    >
  </div>

  <!-- Two-column grid: block library + timeline. Prototype line 538. -->
  <div class="comp-grid">
    <!-- ── Column 1: block library ─────────────────────────────────────── -->
    <!-- Prototype lines 539–548. -->
    <div class="comp-col">
      <h4>1 · guardar bloques</h4>
      <div class="sub">captura lo que tienes montado ahora mismo como un bloque reutilizable.</div>

      <!--
        Save row: three buttons to capture current state as a named block.
        Prototype lines 542–545, JS lines 1939–1946.
      -->
      <div class="save-row">
        <button class="tbtn" on:click={() => addBlock('groove')}>💾 groove actual</button>
        <button class="tbtn" on:click={() => addBlock('armonia')}>💾 armonía actual</button>
        <button class="tbtn" on:click={() => addBlock('sesion')}>💾 sesión actual</button>
      </div>

      <!--
        Block list: renders each saved block as a .blk item.
        Prototype: `renderBlocks()` (lines 1951–1970).
        Each block has: type tag, contenteditable name, mini code preview,
        ▶ play, ↳ pista (addBlockAsNewTrack — Pilot-confirmed OD-1), 🗑 delete.
      -->
      {#if $sessionStore.composition.blocks.length === 0}
        <!-- Empty state. Prototype line 1953. -->
        <div class="arr-empty">aún no hay bloques — guarda uno arriba.</div>
      {:else}
        {#each $sessionStore.composition.blocks as b (b.id)}
          <div class="blk">
            <!-- Type tag. Prototype line 1956: `<span class="tag ${tagClsOf(b)}">${tagOf(b)}</span>` -->
            <span class="tag {tagClsOf(b)}">{tagOf(b)}</span>

            <!--
              Contenteditable name span.
              Prototype line 1957–1960: `.nm contenteditable` + input handler.
              handleBlockRename reads e.target.textContent, calls renameBlock.
            -->
            <span
              class="nm"
              contenteditable="true"
              role="textbox"
              tabindex="0"
              on:input={(e) => handleBlockRename(e, b.id, b.name)}>{b.name}</span
            >

            <!-- Mini code preview. Prototype line 1958: `.mini` showing first 60 chars. -->
            <span class="mini">{b.code.replace(/\n/g, ' ').slice(0, 60)}</span>

            <!--
              ▶ preview button. Prototype line 1961.
              Calls playBlockById(b.id) → runs block code, sets nowPlaying 'block'.
            -->
            <button on:click={() => void playBlockById(b.id)}>▶</button>

            <!--
              ↳ pista button. Prototype line 1962.
              Creates NEW track pre-populated with this block (Pilot-confirmed OD-1).
              Function: addBlockAsNewTrack (session.ts).
            -->
            <button on:click={() => addBlockAsNewTrack(b.id)}>↳ pista</button>

            <!--
              🗑 delete button. Prototype lines 1963–1966.
              Removes block from library AND all track references.
            -->
            <button on:click={() => deleteBlock(b.id)}>🗑</button>
          </div>
        {/each}
      {/if}
    </div>

    <!-- ── Column 2: timeline ──────────────────────────────────────────── -->
    <!-- Prototype lines 549–572. -->
    <div class="comp-col">
      <!-- Timeline header: title, hint, + pista button. Prototype lines 550–553. -->
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <h4 style="margin:0">2 · línea de tiempo</h4>
        <span style="font-size:10.5px;color:var(--faint)"
          >pistas apiladas = suenan a la vez · bloques en fila = en secuencia · arrastra el borde
          derecho para los compases</span
        >
        <!--
          + pista button. Prototype line 2120: pushes empty track.
          Function: addTrack().
        -->
        <button class="tbtn" style="margin-left:auto" on:click={addTrack}>+ pista</button>
      </div>

      <!--
        .timeline grid: 120 px heads + 1fr scroll.
        Prototype lines 555–563.
      -->
      <div class="timeline">
        <!-- Track heads column. Prototype line 556 #tlHeads. -->
        <div class="tl-heads">
          <!-- 20 px spacer for ruler alignment. Prototype line 1995. -->
          <div class="tl-head-ruler"></div>

          <!--
            Per-track head: "pista N" label + 🗑 delete.
            Prototype lines 1997–2001.
          -->
          {#each trackIndices as ti (ti)}
            <div class="tl-head">
              <span class="tname">pista {ti + 1}</span>
              <!--
                Delete track button. Prototype line 2000:
                `tracks.splice(ti,1); if(!tracks.length) tracks.push(...);`
                Function: removeTrack(ti) — auto-re-adds empty if last.
              -->
              <button title="eliminar pista" on:click={() => removeTrack(ti)}>🗑</button>
            </div>
          {/each}
        </div>

        <!--
          Scroll area: holds ruler, lanes, and playhead.
          Prototype line 557 #tlScroll.
          bind:this captures the element for auto-scroll in the rAF loop.
        -->
        <div class="tl-scroll" bind:this={scrollEl}>
          <!--
            Inner container: CSS --ppb variable, explicit width for horizontal scroll.
            Prototype line 1988–1990: `inner.style.setProperty('--ppb', PPB+'px'); inner.style.width=(gb*PPB)+'px'`
          -->
          <div class="tl-inner" style="--ppb:{PPB}px; width:{gridBars() * PPB}px">
            <!--
              Bar ruler. Prototype lines 1992–1993.
              One span per bar, positioned at (s * PPB)px.
            -->
            <div class="tl-ruler">
              {#each barNums as s (s)}
                <span class="bar-num" style="left:{s * PPB}px">{s + 1}</span>
              {/each}
            </div>

            <!--
              Per-track lane + blocks.
              Prototype lines 1997–2050.
            -->
            {#each $sessionStore.composition.tracks as track, ti}
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="tl-lane"
                class:drag-over={dragging &&
                  dragOverTrackIndex === ti &&
                  dragOverTrackIndex !== dragTrackIndex}
                data-tklane={ti}
              >
                <!--
                  Per-block positioned element.
                  Prototype lines 2005–2041.
                  data-tk and data-ri store indices for drag/grip handlers.
                  data-bars stores bar count for grip handler.
                  data-st stores start bar for pointerup drop calculation.
                -->
                {#each track.blocks as ref, ri}
                  {@const b = $sessionStore.composition.blocks.find((x) => x.id === ref.blockId)}
                  {@const startBar = startBarOf(track.blocks, ri)}
                  {@const isActive = activeBlocks.get(ti) === ri}
                  {#if b}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                      class="tl-block {tagClsOf(b)}"
                      class:playing={isActive}
                      data-tk={ti}
                      data-ri={ri}
                      data-bars={ref.bars}
                      data-st={startBar}
                      style="left:{startBar * PPB}px; width:{ref.bars * PPB - 2}px"
                      on:pointerdown={handleBlockPointerDown}
                      on:pointermove={handleBlockPointerMove}
                      on:pointerup={handleBlockPointerUp}
                    >
                      <!--
                        ✕ remove button. Prototype line 2015:
                        `t.blocks = t.blocks.filter(r => r !== ref);`
                        Function: removeBlockFromTrack(ti, ri).
                      -->
                      <!-- svelte-ignore a11y-click-events-have-key-events -->
                      <!-- svelte-ignore a11y-no-static-element-interactions -->
                      <span class="bx" on:click|stopPropagation={() => removeBlockFromTrack(ti, ri)}
                        >✕</span
                      >

                      <!-- Block name. Prototype line 2012. -->
                      <span class="bn">{b.name}</span>

                      <!--
                        Bar count input. Prototype lines 2013, 2017–2019.
                        handleBarsInput: live resize preview.
                        handleBarsChange: commits via setBlockBars.
                        on:pointerdown: stops propagation so block drag doesn't activate.
                      -->
                      <div class="bb">
                        <input
                          type="number"
                          min="1"
                          max="64"
                          value={ref.bars}
                          on:input={handleBarsInput}
                          on:change={(e) => handleBarsChange(e, ti, ri)}
                          on:pointerdown|stopPropagation={() => {}}
                        />
                        comp.
                      </div>

                      <!--
                        Grip: drag right edge to resize (snap to bar).
                        Prototype lines 2021–2024.
                        Handlers use e.currentTarget.closest('.tl-block') for DOM traversal.
                      -->
                      <div
                        class="grip"
                        on:pointerdown={handleGripPointerDown}
                        on:pointermove={handleGripPointerMove}
                        on:pointerup={handleGripPointerUp}
                      ></div>
                    </div>
                  {/if}
                {/each}

                <!--
                  .tl-add drop-zone with block selector.
                  Prototype lines 2042–2048.
                  Position: at (trackContentBars * PPB + 4)px.
                -->
                <div class="tl-add" style="left:{trackContentBars(track.blocks) * PPB + 4}px">
                  {#if $sessionStore.composition.blocks.length > 0}
                    <!--
                      Select lists all blocks.
                      handleAddFromSelect: calls addBlockToTrack(ti, val) + resets select.
                      Prototype line 2047.
                    -->
                    <select on:change={(e) => handleAddFromSelect(e, ti)}>
                      <option value="">＋ bloque…</option>
                      {#each $sessionStore.composition.blocks as bl}
                        <option value={bl.id}>+ {tagOf(bl)}: {bl.name}</option>
                      {/each}
                    </select>
                  {:else}
                    <!-- No blocks saved yet. Prototype line 2045. -->
                    <span style="font-size:10px;color:var(--faint)">guarda bloques arriba</span>
                  {/if}
                </div>
              </div>
            {/each}

            <!--
              Playhead: absolute element, driven by rAF loop.
              Prototype lines 2075–2088: `ph.classList.add('on'); ph.style.left=...`
              .on class makes it visible; left drives horizontal position.
            -->
            <div class="tl-playhead" class:on={playheadOn} style="left:{playheadLeft}px"></div>
          </div>
        </div>
      </div>

      <!--
        Transport row: play / pause / stop / clear + compInfo label.
        Prototype lines 565–571, JS lines 2117–2124.
      -->
      <div class="code-actions" style="margin-top:11px">
        <!--
          ▶ tocar: calls playComposition(). Prototype line 2122.
          Uses .play-session class for accent styling (green-ish play button).
        -->
        <button
          class="play-session"
          style="padding:9px 16px"
          on:click={() => void playComposition()}>▶ tocar</button
        >

        <!--
          ⏸ pausa: calls pauseComposition(). Prototype line 2123.
        -->
        <button class="tbtn" on:click={() => void pauseComposition()}>⏸ pausa</button>

        <!--
          ■ stop: calls stopComposition(). Prototype line 2124.
        -->
        <button class="tbtn warm" on:click={() => void stopComposition()}>■ stop</button>

        <!--
          limpiar todo: clears all tracks (one empty track remains).
          Prototype line 2121: `tracks=[{id:'t'+(trkSeq++),blocks:[]}];`
        -->
        <button class="tbtn" on:click={clearAllTracks}>limpiar todo</button>

        <!--
          compInfo span: shows track/bar count or playback position.
          Prototype line 2051 / 2085. Updated reactively by rAF loop.
        -->
        <span style="font-size:10.5px;color:var(--faint);align-self:center">{compInfo}</span>

        <!--
          Mini now-playing pill — shown inside the drawer so the user can see
          what is playing even when the drawer covers the Transport footer.
          Displayed when source is 'block' or 'composition' (drawer-owned sources).
          Mirrors the Transport.svelte .now pill structure and .live dot animation.
        -->
        {#if $sessionStore.nowPlaying.source === 'block' || $sessionStore.nowPlaying.source === 'composition'}
          <div class="comp-now-pill" class:live={true}>
            <span class="comp-now-dot"></span>
            <span class="comp-now-label">{$sessionStore.nowPlaying.label ?? ''}</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /*
   * Primary-view layout (Phase 09 step 09.4, ADR 0013 D2).
   * Replaces position:fixed + translateY(108%) slide mechanism and #compTab button.
   * The component is mounted inside #stage (via {#if} gate in App.svelte) and covers
   * the full stage area using position:absolute; inset:0. The PIXI canvas sits below
   * (rendered transparent — both layers hidden by stage.ts setView for 'composition').
   * z-index:1 ensures the drawer is above the PIXI canvas (z-index:0 by default).
   * overflow:auto allows content to scroll if viewport is short.
   */
  #compDrawer {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: 18px;
    overflow: auto;
    padding: 14px 16px 16px;
  }

  /*
   * Drawer header: title + hint. Close button removed in primary-view mode.
   * Scoped style matching the previous .code-head pattern.
   */
  .code-head {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 9px;
  }

  .code-head b {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: 14px;
  }

  /*
   * Two-column grid. Override single-column default from app.css at wider viewport.
   * Prototype: .comp-grid has two columns for library + timeline.
   */
  @media (min-width: 640px) {
    .comp-grid {
      grid-template-columns: 300px 1fr;
    }
  }

  /*
   * .tbtn — transport button style. Matches Transport.svelte and CodeDrawer.svelte.
   */
  .tbtn {
    padding: 9px 14px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(0, 0, 0, 0.28);
    cursor: pointer;
  }

  .tbtn:hover {
    color: var(--text);
    border-color: var(--stroke-2);
  }

  /*
   * .tbtn.warm — stop/silence accent. Prototype CSS line 215 (Transport.svelte).
   */
  .tbtn.warm {
    color: var(--dom);
    border-color: rgba(232, 123, 172, 0.4);
  }

  .tbtn.warm:hover {
    background: rgba(232, 123, 172, 0.12);
  }

  /*
   * .play-session — primary play button. Prototype CSS lines 225–248 (Transport.svelte).
   * Subdom (teal) background for the main action.
   */
  .play-session {
    border-radius: 14px;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    color: #0b0d12;
    background: var(--subdom);
    border: none;
    cursor: pointer;
    transition: filter 0.15s;
  }

  .play-session:hover {
    filter: brightness(1.12);
  }

  .play-session:active {
    filter: brightness(0.9);
  }

  /*
   * .code-actions — transport row flex container.
   */
  .code-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
  }

  /*
   * Mini now-playing pill inside the drawer transport row.
   * Mirrors Transport.svelte .now/.dot styling so the user can see what is
   * playing even when the drawer covers the footer.
   */
  .comp-now-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border-radius: 11px;
    background: rgba(0, 0, 0, 0.32);
    border: 1px solid var(--stroke);
    margin-left: auto;
  }

  .comp-now-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--faint);
    flex: 0 0 auto;
  }

  .comp-now-pill.live .comp-now-dot {
    background: #5bd6a0;
    box-shadow: 0 0 8px rgba(91, 214, 160, 0.8);
    animation: pulse 1.2s infinite;
  }

  .comp-now-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
  }
</style>

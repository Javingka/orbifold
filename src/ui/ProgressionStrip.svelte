<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — ProgressionStrip component.

  Replaces ProgressionChips in App.svelte (Phase 01 step 01.3).
  Phase 01: equal-width segments (flex: 1), rendered inside Transport footer slot.
  Phase 02: variable-width segments proportional to ch.bars ?? 1, plus a
            horizontal drag-to-resize handle on each segment's right edge.
  Phase 03 step 03.4: absolute pixel-width model (PX_PER_CYCLE = 48 px/cycle),
            numbered bar ruler, hierarchical gridlines, own-row layout (strip
            relocated to .progression-row in App.svelte above Transport footer).
  Phase 06 step 06.5: rest-slot rendering. Each slot in progression is now
            ProgressionSlot = Chord | RestSlot. Rest slots render as grey segments
            (no tonal-function border, no gain fill, no gain drag). Resize handle
            and ✕ remove button remain functional for rest slots. A "+ rest" button
            is added outside .strip-scroll to append a RestSlot via appendRest().

  All interactions ported 1:1 from ProgressionChips.svelte (which itself ports
  prototype #progChips area — HTML lines 505–508, CSS lines 224–234, JS lines 1413–1468):

    Gain drag:  pointerdown captures pointer (ProgressionChips.svelte lines 83–97,
                  prototype lines 1441–1450);
                pointermove: dy = startY - e.clientY, threshold 3px, step 0.006, clamp [0,1.2]
                  (ProgressionChips.svelte lines 99–109, prototype lines 1451–1456);
                pointerup: if moved → commit to store + requeueLive()
                           if tap  → playChord()
                  (ProgressionChips.svelte lines 111–141, prototype lines 1457–1466).

    Tap-to-preview: pointer moved ≤ 3px → playChord(rootPc, qual, gain)
                  (ProgressionChips.svelte handlePointerUp else branch, line 133).
                  No-op for rest slots (no chord to preview).

    Keyboard:   Enter/Space → playChord (accessibility; ProgressionChips.svelte line 177).
                No-op for rest slots.

    Remove:     ✕ button → clearChordAt(index)
                  (ProgressionChips.svelte handleRemove lines 143–146, prototype line 1440).

    Gain fill:  chipGainCss(g) — bottom-to-top gradient proportional to gain 0–1.2
                  (ProgressionChips.svelte lines 38–41, prototype lines 1413–1415).
                  Rest slots: flat grey background, no fill.

    Tonal-function border class: diatonicLookup → entry.func.cls
                  (ProgressionChips.svelte tonalClass lines 47–55,
                   prototype ch.info.func.cls line 1435).
                  Rest slots: no tonal-function class, flat grey border.

  Phase 02 additions (no prototype equivalent — new feature per ADR 0010):
    Proportional widths:  flex: 0 0 {pct}% where pct = (bars/totalBars)*100.
    Resize handle:        .resize-handle at right edge of each .seg; pointerdown
                          starts horizontal resize, pointermove updates resizeBars
                          live, pointerup commits via setChordBars(i, newBars).
    Bar count label:      barsLabel(bars) shown only when bars !== 1 (and defined).

  Phase 03 changes (ADR 0010 amendment — 0.25-beat granularity):
    barsLabel:            extended to ¼×, ¾× labels for quarter fractions.
    handleResizePointerMove: rounding 0.5→0.25, lower clamp 0.5→0.25.
    Absolute grid:        PX_PER_CYCLE = 48 px per cycle (matches composition
                          timeline --ppb:48px); segment widths are fixed px, not
                          proportional %. The strip scrolls horizontally.
    Numbered ruler:       <div class="ruler"> with <span class="bar-num"> at each
                          cycle boundary, 1-indexed to match DAW convention.
    Hierarchical lines:   Beat (0.25-cycle = 12px) and half-bar (0.5-cycle = 24px)
                          gridlines via stacked CSS repeating-linear-gradient on
                          each .seg background (gain fill topmost layer).
    Scroll sync:          Ruler and segments share a .strip-scroll wrapper so they
                          scroll in sync.

  Phase 06 changes (ADR 0012 D5 — rest rendering):
    Rest segment style:   .rest-seg class — flat grey background (#3a3a3a), no gradient,
                          no tonal-function border. Label shows '–' + barsLabel.
                          No gain fill, no gain drag (handlePointerDown guards early exit).
    Add Rest button:      Outside .strip-scroll; calls appendRest(); visible only
                          when progression.length < 16.

  Visual differences from chips:
    - Phase 01: flex:1 (equal width) instead of flex:0 0 auto (auto-shrink chips).
    - Phase 02: flex: 0 0 {pct}% (proportional to ch.bars).
    - Phase 03: fixed pixel width per cycle; strip scrolls horizontally when wide.

  Store reads (same as ProgressionChips — no new reads):
    $sessionStore.harmony.progression  — array of ProgressionSlot (Chord | RestSlot)
    $sessionStore.harmony.root         — for tonal-function class derivation
    $sessionStore.harmony.mode         — for tonal-function class derivation

  Store writes via session.ts actions (Phase 01 unchanged + Phase 02 addition + Phase 06):
    clearChordAt(index)    — ✕ remove button
    requeueLive()          — drag-release volume update (called inside setChordBars too)
    playChord(...)         — tap on chord segment
    setChordBars(i, bars)  — commit resized bars (Phase 02; works for RestSlot too)
    appendRest()           — "+ rest" button (Phase 06 ADR 0012 D5)

  No changes to src/core/codegen/strudel.ts. Strudel output changes only when
  ch.bars !== 1 for any chord (dual-mode: arrange() path). See ADR 0010.
  Rest slots force arrange() path per ADR 0012 D2.
-->
<script lang="ts">
  import {
    sessionStore,
    clearChordAt,
    requeueLive,
    playChord,
    setChordBars,
    barsLabel,
    appendRest,
  } from '../state/session.js';
  import { chordLabel } from '../core/theory/chords.js';
  import { diatonicLookup } from '../core/theory/scales.js';
  import type { Mode } from '../core/theory/scales.js';

  /**
   * Pixels per Strudel cycle in the absolute-grid model (Phase 03 step 03.4).
   * Matches the composition timeline --ppb:48px value in app.css (lines 476–482),
   * making the two timelines visually consistent.
   * Pilot-confirmed value: OD-03-01 (PX_PER_CYCLE = 48).
   */
  const PX_PER_CYCLE = 48;

  /**
   * Returns the CSS background gradient for a segment based on its gain.
   * Ported from ProgressionChips.svelte lines 38–41 (prototype lines 1413–1415).
   * @param g - Gain value 0–1.2
   */
  function chipGainCss(g: number): string {
    const pct = Math.round(Math.min(1, g / 1.2) * 100);
    return `linear-gradient(to top, rgba(138,160,255,.30) ${pct}%, rgba(255,255,255,.05) ${pct}%)`;
  }

  /**
   * Derive the tonal-function CSS class for a segment.
   * Ported from ProgressionChips.svelte lines 47–55 (prototype ch.info.func.cls line 1435).
   */
  function tonalClass(rootPc: number, qual: string, keyRoot: number, keyMode: string): string {
    try {
      const lookup = diatonicLookup(keyRoot, keyMode as Mode);
      const entry = lookup[`${rootPc}:${qual}`];
      return entry ? entry.func.cls : '';
    } catch {
      return '';
    }
  }

  // ── Per-segment drag state ────────────────────────────────────────────────
  // Parallel arrays indexed by segment position (same index as progression array).
  // These are transient UI state — NOT in sessionStore.
  // Ported from ProgressionChips.svelte module-level arrays (lines 63–81).
  // Prototype: let dragging=false, startY=0, startGain=0, moved=false (lines 1442–1443).

  /** Pointer-capture dragging active flag per segment. */
  let dragging: boolean[] = [];
  /** Pointer clientY at drag start per segment. */
  let startY: number[] = [];
  /** Gain value at drag start per segment. */
  let startGain: number[] = [];
  /** Whether the pointer moved > 3px (distinguishes drag from tap) per segment. */
  let moved: boolean[] = [];
  /** Local gain override while dragging (written without going through store). */
  let localGain: (number | null)[] = [];

  // ── Phase 02: resize gesture state ────────────────────────────────────────
  // Separate from gain-drag state. Indexed by segment position.
  // No prototype equivalent — new feature (Phase 02 ADR 0010).

  /** Whether a horizontal resize drag is in progress per segment. */
  let resizeActive: boolean[] = [];
  /** Pointer clientX at resize start per segment. */
  let resizeStartX: number[] = [];
  /** Bars value at resize start per segment. */
  let resizeStartBars: number[] = [];
  /**
   * Live bars override while resize-dragging (live reflow without store write).
   * null = use store value. Written during resize, committed on pointerup.
   */
  let resizeBars: (number | null)[] = [];

  // ── Reference to .segments container (for width measurement) ─────────────
  let segmentsEl: HTMLElement | null = null;

  // Synchronise drag-state arrays whenever progression length changes.
  // Ported from ProgressionChips.svelte reactive block (lines 74–81).
  $: {
    const len = $sessionStore.harmony.progression.length;
    dragging = new Array(len).fill(false);
    startY = new Array(len).fill(0);
    startGain = new Array(len).fill(0);
    moved = new Array(len).fill(false);
    localGain = new Array(len).fill(null);
    // Phase 02 resize state arrays
    resizeActive = new Array(len).fill(false);
    resizeStartX = new Array(len).fill(0);
    resizeStartBars = new Array(len).fill(1);
    resizeBars = new Array(len).fill(null);
  }

  // ── Total bars computation (Phase 02; kept for ruler in Phase 03) ────────────
  // totalBars = sum of all ch.bars (using live resizeBars override when dragging).
  // Used by the ruler to determine how many bar markers to render.

  $: totalBars = $sessionStore.harmony.progression.reduce(
    (s, c, i) => s + (resizeBars[i] ?? c.bars ?? 1),
    0
  );

  /**
   * Pointer down on .seg body: capture pointer, record startY and startGain.
   * Ported from ProgressionChips.svelte handlePointerDown (lines 83–97).
   * Prototype lines 1441–1450.
   */
  function handlePointerDown(e: PointerEvent, i: number): void {
    // Phase 06: rest slots have no gain to drag — no-op entirely.
    const slot = $sessionStore.harmony.progression[i];
    if (slot && 'isRest' in slot) return;
    const target = e.target as HTMLElement;
    if (target.classList.contains('rm')) return;
    // Do not start gain drag if clicking on the resize handle — that gesture
    // is handled by handleResizePointerDown. stopPropagation() on the handle
    // prevents this function from being called at all, but guard here too.
    if (target.classList.contains('resize-handle')) return;
    dragging[i] = true;
    moved[i] = false;
    startY[i] = e.clientY;
    startGain[i] = $sessionStore.harmony.progression[i]?.gain ?? 0.6;
    localGain[i] = startGain[i];
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore — pointer capture not supported in all environments
    }
    e.preventDefault();
  }

  /**
   * Pointer move on .seg body: compute dy, update localGain with 3px threshold and 0.006 step.
   * Ported from ProgressionChips.svelte handlePointerMove (lines 99–109).
   * Prototype lines 1451–1456: threshold 3px, gain step 0.006/px, clamp [0, 1.2].
   */
  function handlePointerMove(e: PointerEvent, i: number): void {
    if (!dragging[i]) return;
    const dy = startY[i] - e.clientY;
    // Prototype line 1452: threshold 3px to distinguish drag from tap.
    if (Math.abs(dy) > 3) moved[i] = true;
    // Prototype line 1453: gain step 0.006 per px, clamp [0, 1.2].
    const newGain = Math.max(0, Math.min(1.2, startGain[i] + dy * 0.006));
    localGain[i] = newGain;
    // Trigger reactivity — force Svelte to re-render segment background.
    localGain = [...localGain];
  }

  /**
   * Pointer up on .seg body: commit gain (if moved) or play chord (if tap).
   * Ported from ProgressionChips.svelte handlePointerUp (lines 111–141).
   * Prototype lines 1457–1466.
   */
  function handlePointerUp(e: PointerEvent, i: number): void {
    if (!dragging[i]) return;
    dragging[i] = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore — pointer capture release not supported in all environments
    }
    if (moved[i]) {
      // Commit the dragged gain to the store and requeue.
      const newGain = localGain[i];
      if (newGain !== null) {
        sessionStore.update((s) => {
          const progression = s.harmony.progression.map((ch, idx) =>
            idx === i ? { ...ch, gain: newGain } : ch
          );
          return { ...s, harmony: { ...s.harmony, progression } };
        });
      }
      requeueLive();
    } else {
      // Tap: play chord preview. Prototype lines 1461–1464.
      // Phase 06: guard against rest slots — no chord to preview.
      const ch = $sessionStore.harmony.progression[i];
      if (ch && !('isRest' in ch)) {
        playChord(ch.rootPc, ch.qual, ch.gain);
      }
    }
    // Reset local gain (segment will now use store value).
    localGain[i] = null;
    localGain = [...localGain];
  }

  /**
   * Remove chord at index.
   * Ported from ProgressionChips.svelte handleRemove (lines 143–146). Prototype line 1440.
   */
  function handleRemove(e: Event, i: number): void {
    e.stopPropagation();
    clearChordAt(i);
  }

  // ── Phase 02: horizontal resize gesture ───────────────────────────────────
  // Completely separate from the vertical gain-drag gesture above.
  // Starts on .resize-handle pointerdown (not on .seg body).
  // No prototype equivalent — new feature (Phase 02 ADR 0010).

  /**
   * Pointer down on .resize-handle: start horizontal resize drag.
   *
   * Captures the pointer on the handle element, records startX and the current
   * bars value. stopPropagation() ensures this does NOT trigger handlePointerDown
   * on the parent .seg (the two gestures are fully independent).
   *
   * Phase 02, no prototype equivalent (ADR 0010).
   */
  function handleResizePointerDown(e: PointerEvent, i: number): void {
    e.stopPropagation();
    e.preventDefault();
    resizeActive[i] = true;
    resizeStartX[i] = e.clientX;
    resizeStartBars[i] = $sessionStore.harmony.progression[i]?.bars ?? 1;
    resizeBars[i] = resizeStartBars[i];
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }

  /**
   * Pointer move on .resize-handle: update resizeBars[i] live.
   *
   * Phase 03 step 03.4: pixelsPerBar is now the constant PX_PER_CYCLE (48), replacing
   * the previous dynamic segWidth / totalBars computation. In the absolute-grid model
   * every pixel-to-bar mapping is fixed, so the drag delta is simply dx / PX_PER_CYCLE.
   * newBars = nearest 0.25, clamped [0.25, 8].
   * Updates resizeBars[] reactively so the segment reflows while dragging.
   *
   * Phase 02, no prototype equivalent (ADR 0010).
   * Phase 03: rounding changed from 0.5 to 0.25; lower clamp changed from 0.5 to 0.25;
   *           pixelsPerBar changed from dynamic (segWidth / totalBars) to PX_PER_CYCLE.
   */
  function handleResizePointerMove(e: PointerEvent, i: number): void {
    if (!resizeActive[i]) return;
    const dx = e.clientX - resizeStartX[i];
    // Absolute-grid model: 1 cycle = PX_PER_CYCLE pixels (constant).
    const pixelsPerBar = PX_PER_CYCLE;
    const deltaBars = dx / pixelsPerBar;
    const rawBars = resizeStartBars[i] + deltaBars;
    // Round to nearest 0.25, clamp [0.25, 8].
    const newBars = Math.max(0.25, Math.min(8, Math.round(rawBars * 4) / 4));
    resizeBars[i] = newBars;
    // Trigger reactivity so totalBars recomputes.
    resizeBars = [...resizeBars];
  }

  /**
   * Pointer up on .resize-handle: commit bars via setChordBars (which calls requeueLive).
   *
   * Phase 02, no prototype equivalent (ADR 0010).
   */
  function handleResizePointerUp(e: PointerEvent, i: number): void {
    if (!resizeActive[i]) return;
    resizeActive[i] = false;
    const newBars = resizeBars[i];
    // Reset live override before committing so totalBars uses store value after commit.
    resizeBars[i] = null;
    resizeBars = [...resizeBars];
    if (newBars !== null) {
      setChordBars(i, newBars);
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }
</script>

<!--
  Strip container.
  Phase 03 step 03.4 layout:
    .strip: outer flex row — .lbl label (flush left, outside scroll) + .strip-scroll (scrollable).
    .strip-scroll: shared scroll wrapper for ruler + segments; overflow-x:auto.
      .ruler: numbered bar marker row (position:relative, height:14px).
      .segments: absolute-width segment row; scrolls with ruler inside .strip-scroll.
  Prototype: .prog wrapper (lines 505–508), .prog-empty (line 234).
-->
<div class="strip">
  <span class="lbl">progresión</span>
  {#if $sessionStore.harmony.progression.length === 0}
    <span class="strip-empty">toca acordes en el Tonnetz…</span>
  {:else}
    <!--
      Phase 03 step 03.4: shared scroll wrapper ensures ruler and segments
      scroll in sync (OD-03-02, A-03-10). overflow-x:auto on the wrapper only;
      ruler and segments are not independently scrollable.
    -->
    <div class="strip-scroll">
      <!--
        Numbered bar ruler: bar markers at each cycle boundary, 1-indexed.
        position:relative allows absolute-positioned .bar-num spans.
        Marker at cycleIndex * PX_PER_CYCLE aligns with segment left edges.
        Markers range from cycle 1 to Math.ceil(totalBars)+1 (end boundary).
      -->
      <div class="ruler">
        {#each Array.from({ length: Math.ceil(totalBars) + 1 }, (_, k) => k) as cycleIndex}
          <span class="bar-num" style="left: {cycleIndex * PX_PER_CYCLE}px">{cycleIndex + 1}</span>
        {/each}
      </div>
      <!--
        Segments row: absolute pixel widths per cycle (PX_PER_CYCLE = 48).
        A 2-cycle chord = 96px; a 0.25-cycle chord = 12px.
        Gridlines are rendered via stacked CSS repeating-linear-gradient on each
        .seg: beat lines every 12px (PX_PER_CYCLE/4), half-bar lines every 24px
        (PX_PER_CYCLE/2). Gain fill is the topmost background layer.
        Bar boundaries = the 3px gap between segments + the ruler tick.
      -->
      <div class="segments" bind:this={segmentsEl}>
        {#each $sessionStore.harmony.progression as ch, i (i)}
          {@const segBars = resizeBars[i] ?? ch.bars ?? 1}
          {@const segPx = segBars * PX_PER_CYCLE}
          {@const durLabel = barsLabel(resizeBars[i] ?? ch.bars)}
          {#if 'isRest' in ch}
            <!--
              Phase 06 step 06.5: rest slot rendering (ADR 0012 D5).
              Grey flat segment — no tonal-function border, no gain fill, no gain drag.
              Gridlines still shown for temporal alignment. Resize handle + ✕ button present.
            -->
            <div
              class="seg rest-seg"
              style="
                width: {segPx}px;
                flex: 0 0 {segPx}px;
              "
              title="silencio · ✕ para quitar"
              role="presentation"
              tabindex="-1"
            >
              <span class="seg-content">
                <span class="seg-label rest-label">–</span>
                {#if durLabel}
                  <span class="seg-dur">{durLabel}</span>
                {/if}
              </span>
              <button class="rm" on:click={(e) => handleRemove(e, i)} tabindex="-1">✕</button>
              <!-- Resize handle: functional for rest slots (setChordBars spreads bars onto RestSlot). -->
              <div
                class="resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionar duración del silencio"
                on:pointerdown={(e) => handleResizePointerDown(e, i)}
                on:pointermove={(e) => handleResizePointerMove(e, i)}
                on:pointerup={(e) => handleResizePointerUp(e, i)}
              ></div>
            </div>
          {:else}
            <!--
              Chord slot rendering (unchanged from Phase 03).
              Phase 03: width and flex-basis are fixed pixel values (absolute grid).
              Background: gain fill (topmost) over half-bar gridlines over beat gridlines.
              Beat lines at 12px intervals (rgba(255,255,255,0.07));
              Half-bar lines at 24px intervals (rgba(255,255,255,0.13)) — MANDATORY (OD-03-02).
              The gain gradient is the topmost layer; gridlines show through underneath.
            -->
            {@const label = chordLabel(ch.rootPc, ch.qual)}
            {@const tcls = tonalClass(
              ch.rootPc,
              ch.qual,
              $sessionStore.harmony.root,
              $sessionStore.harmony.mode
            )}
            {@const displayGain = localGain[i] ?? ch.gain}
            <div
              class="seg {tcls}"
              style="
                width: {segPx}px;
                flex: 0 0 {segPx}px;
                background:
                  {chipGainCss(displayGain)},
                  repeating-linear-gradient(
                    to right,
                    transparent 0,
                    transparent calc({PX_PER_CYCLE / 2}px - 1px),
                    rgba(255,255,255,0.13) calc({PX_PER_CYCLE / 2}px - 1px),
                    rgba(255,255,255,0.13) {PX_PER_CYCLE / 2}px
                  ),
                  repeating-linear-gradient(
                    to right,
                    transparent 0,
                    transparent calc({PX_PER_CYCLE / 4}px - 1px),
                    rgba(255,255,255,0.07) calc({PX_PER_CYCLE / 4}px - 1px),
                    rgba(255,255,255,0.07) {PX_PER_CYCLE / 4}px
                  )
              "
              title="mantener y arrastrar ↑↓ para el volumen · clic para previsualizar · ✕ para quitar"
              role="button"
              tabindex="0"
              on:pointerdown={(e) => handlePointerDown(e, i)}
              on:pointermove={(e) => handlePointerMove(e, i)}
              on:pointerup={(e) => handlePointerUp(e, i)}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') playChord(ch.rootPc, ch.qual, ch.gain);
              }}
            >
              <span class="seg-content">
                <span class="seg-label">{label}</span>
                {#if durLabel}
                  <span class="seg-dur">{durLabel}</span>
                {/if}
              </span>
              <button class="rm" on:click={(e) => handleRemove(e, i)} tabindex="-1">✕</button>
              <!-- Phase 02: horizontal resize handle on right edge. -->
              <!-- stopPropagation on pointerdown prevents gain-drag from starting. -->
              <div
                class="resize-handle"
                role="separator"
                aria-orientation="vertical"
                aria-label="Redimensionar duración"
                on:pointerdown={(e) => handleResizePointerDown(e, i)}
                on:pointermove={(e) => handleResizePointerMove(e, i)}
                on:pointerup={(e) => handleResizePointerUp(e, i)}
              ></div>
            </div>
          {/if}
        {/each}
        <!--
          Phase 06 step 06.5: "+ silencio" button (ADR 0012 D5).
          Inside .segments so it scrolls with the progression and is always reachable.
          Visible only when progression.length < 16 (SavedHarmonySchema max).
          Calls appendRest() which appends { isRest: true, bars: 1 } and requeueLive().
        -->
        {#if $sessionStore.harmony.progression.length < 16}
          <button class="add-rest-btn" on:click={appendRest}>+ silencio</button>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  /*
   * Strip outer container.
   * Phase 03 step 03.4: flex row with .lbl (flush left, outside scroll) + .strip-scroll.
   * flex:1 and min-width:0 let the strip fill the full .progression-row width.
   * align-items:center vertically centers the label with the scroll area.
   */
  .strip {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }

  .strip .lbl {
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    flex: 0 0 auto;
    align-self: center;
  }

  /*
   * Phase 03 step 03.4: shared scroll wrapper for ruler + segments.
   * overflow-x:auto enables horizontal scrolling when the total loop is wider
   * than the viewport. overflow-y:hidden suppresses vertical overflow.
   * flex:1 and min-width:0 let it fill the remaining strip width after the label.
   * Ruler and segments are stacked as a flex column inside; they scroll in sync
   * because they share this single scrolling container (A-03-10).
   */
  .strip-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  /*
   * Phase 03 step 03.4: numbered bar ruler above the segments.
   * position:relative allows absolute-positioned .bar-num spans.
   * height:14px keeps the ruler compact while providing enough room for the
   * 8.5px numbers (matching .tl-ruler .bar-num font-size in app.css line 488).
   */
  .ruler {
    position: relative;
    height: 14px;
    flex: 0 0 auto;
  }

  /*
   * Phase 03 step 03.4: bar number markers.
   * position:absolute at left: cycleIndex * PX_PER_CYCLE.
   * translateX(2px) gives a 2px inset so the number doesn't sit exactly on the
   * left edge of the cycle boundary (matches .tl-ruler .bar-num translateX(3px)
   * convention in app.css line 490).
   */
  .bar-num {
    position: absolute;
    top: 1px;
    font-size: 8.5px;
    color: var(--faint);
    transform: translateX(2px);
    line-height: 1;
    white-space: nowrap;
    pointer-events: none;
  }

  /*
   * Segments row: absolute pixel widths per cycle (Phase 03 step 03.4).
   * Each .seg has width and flex-basis set via inline style to segBars * PX_PER_CYCLE.
   * The row does NOT scroll independently — scrolling is handled by .strip-scroll.
   * overflow:visible allows the ruler and segments to jointly overflow; the parent
   * .strip-scroll clips and scrolls.
   * Phase 02: segments used flex: 0 0 {pct}% (proportional, fills container).
   * Phase 03: segments use fixed px width; strip scrolls when wide.
   */
  .segments {
    display: flex;
    flex: 0 0 auto;
    gap: 3px;
    overflow: visible;
  }

  /*
   * Individual segment. Ported from .prog-chip (ProgressionChips.svelte lines 214–228).
   * Phase 01: flex:1 (equal width). Phase 02: flex: 0 0 {pct}% (proportional).
   * Phase 03: width and flex-basis set via inline style (segBars * PX_PER_CYCLE px).
   * background is set via inline style (gain fill + gridlines stacked layers).
   * position: relative — required for .resize-handle absolute positioning.
   * touch-action:none and user-select:none required for pointer capture to work correctly
   * on touch devices (ProgressionChips.svelte lines 226–227, prototype CSS lines 226–228).
   */
  .seg {
    position: relative;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 5px 14px 5px 6px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--stroke);
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
    min-width: 0;
    overflow: hidden;
  }

  /* Tonal-function border colors. Ported from ProgressionChips.svelte lines 231–241. */
  .seg.tonic {
    border-color: rgba(243, 177, 90, 0.4);
  }

  .seg.subdom {
    border-color: rgba(86, 207, 196, 0.4);
  }

  .seg.dom {
    border-color: rgba(232, 123, 172, 0.4);
  }

  /*
   * Segment content wrapper: label + optional duration indicator.
   * flex column layout so label and dur stack vertically.
   */
  .seg-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 0;
    overflow: hidden;
  }

  .seg-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.1;
  }

  /*
   * Duration label — shown only when bars !== 1 and not undefined.
   * Small, muted, below the chord name.
   * Phase 02, no prototype equivalent.
   */
  .seg-dur {
    font-size: 9px;
    font-weight: 400;
    color: var(--faint);
    line-height: 1;
    margin-top: 1px;
    white-space: nowrap;
  }

  /* Remove button. Ported from .prog-chip .rm (ProgressionChips.svelte lines 244–256). */
  .seg .rm {
    color: var(--faint);
    font-size: 11px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    line-height: 1;
    flex: 0 0 auto;
  }

  .seg:hover .rm {
    color: var(--dom);
  }

  /*
   * Horizontal resize handle — right edge of each segment.
   * Phase 02, no prototype equivalent (ADR 0010).
   *
   * Positioned absolutely at the right edge; 8px wide, full height.
   * cursor: ew-resize distinguishes from the parent's ns-resize (gain drag).
   * touch-action: none required for pointer capture on touch devices.
   * Subtle visual affordance: slightly brighter on hover.
   */
  .resize-handle {
    position: absolute;
    right: 0;
    top: 0;
    width: 8px;
    height: 100%;
    cursor: ew-resize;
    touch-action: none;
    border-radius: 0 8px 8px 0;
    background: transparent;
    transition: background 0.15s;
  }

  .resize-handle:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  /* Empty state hint. Ported from .prog-empty (ProgressionChips.svelte lines 259–263). */
  .strip-empty {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }

  /*
   * Phase 06 step 06.5: rest slot segment styling (ADR 0012 D5).
   * Flat grey background — no gain fill, no tonal-function border color.
   * cursor:default (no gain drag affordance). Gridlines are absent (plain bg).
   * Inherits .seg layout (position:relative, flex, padding, border-radius, overflow).
   */
  .seg.rest-seg {
    background: #3a3a3a;
    border-color: rgba(255, 255, 255, 0.12);
    cursor: default;
  }

  /*
   * Rest slot label: '–' character, muted, slightly smaller than chord labels.
   */
  .rest-label {
    color: var(--faint);
    font-weight: 400;
    font-size: 14px;
    letter-spacing: 0.05em;
  }

  /*
   * Phase 06 step 06.5: "Add Rest" button (ADR 0012 D5).
   * Positioned outside .strip-scroll — does not participate in horizontal scroll.
   * Small, low-contrast, consistent with the strip aesthetic.
   * flex:0 0 auto keeps it from growing.
   */
  .add-rest-btn {
    flex: 0 0 auto;
    align-self: center;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.05em;
    color: var(--faint);
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    padding: 3px 7px;
    cursor: pointer;
    white-space: nowrap;
    transition:
      color 0.15s,
      border-color 0.15s;
  }

  .add-rest-btn:hover {
    color: rgba(255, 255, 255, 0.7);
    border-color: rgba(255, 255, 255, 0.3);
  }
</style>

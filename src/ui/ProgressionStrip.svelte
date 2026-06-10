<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — ProgressionStrip component.

  Replaces ProgressionChips in App.svelte (Phase 01 step 01.3).
  Renders the chord progression as equal-width segments in the Transport footer slot.
  Each segment = one chord = one cycle. Variable-width segments are Phase 02.

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

    Keyboard:   Enter/Space → playChord (accessibility; ProgressionChips.svelte line 177).

    Remove:     ✕ button → clearChordAt(index)
                  (ProgressionChips.svelte handleRemove lines 143–146, prototype line 1440).

    Gain fill:  chipGainCss(g) — bottom-to-top gradient proportional to gain 0–1.2
                  (ProgressionChips.svelte lines 38–41, prototype lines 1413–1415).

    Tonal-function border class: diatonicLookup → entry.func.cls
                  (ProgressionChips.svelte tonalClass lines 47–55,
                   prototype ch.info.func.cls line 1435).

  Visual differences from chips:
    - Segments use flex:1 (equal width) instead of flex:0 0 auto (auto-shrink chips).
    - No horizontal overflow/scroll — segments fill available footer width equally.

  Store reads (same as ProgressionChips — no new reads):
    $sessionStore.harmony.progression  — array of Chord
    $sessionStore.harmony.root         — for tonal-function class derivation
    $sessionStore.harmony.mode         — for tonal-function class derivation

  Store writes via session.ts actions (same as ProgressionChips — no new writes):
    clearChordAt(index)  — ✕ remove button
    requeueLive()        — drag-release volume update
    playChord(...)       — tap on segment

  No changes to src/core/codegen/strudel.ts or the Chord interface. Strudel output is
  byte-identical to pre-phase main for any given SessionState.
-->
<script lang="ts">
  import { sessionStore, clearChordAt, requeueLive, playChord } from '../state/session.js';
  import { chordLabel } from '../core/theory/chords.js';
  import { diatonicLookup } from '../core/theory/scales.js';
  import type { Mode } from '../core/theory/scales.js';

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

  // Synchronise drag-state arrays whenever progression length changes.
  // Ported from ProgressionChips.svelte reactive block (lines 74–81).
  $: {
    const len = $sessionStore.harmony.progression.length;
    dragging = new Array(len).fill(false);
    startY = new Array(len).fill(0);
    startGain = new Array(len).fill(0);
    moved = new Array(len).fill(false);
    localGain = new Array(len).fill(null);
  }

  /**
   * Pointer down: capture pointer, record startY and startGain.
   * Ported from ProgressionChips.svelte handlePointerDown (lines 83–97).
   * Prototype lines 1441–1450.
   */
  function handlePointerDown(e: PointerEvent, i: number): void {
    const target = e.target as HTMLElement;
    if (target.classList.contains('rm')) return;
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
   * Pointer move: compute dy, update localGain with 3px threshold and 0.006 step.
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
   * Pointer up: commit gain (if moved) or play chord (if tap).
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
      const ch = $sessionStore.harmony.progression[i];
      if (ch) {
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
</script>

<!--
  Strip container. Replaces the .prog scrollable flex row from ProgressionChips.
  Segments use flex:1 so they share available width equally.
  Prototype: .prog wrapper (lines 505–508), .prog-empty (line 234).
-->
<div class="strip">
  <span class="lbl">progresión</span>
  {#if $sessionStore.harmony.progression.length === 0}
    <span class="strip-empty">toca acordes en el Tonnetz…</span>
  {:else}
    <div class="segments">
      {#each $sessionStore.harmony.progression as ch, i (i)}
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
          style="background: {chipGainCss(displayGain)}"
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
          {label}
          <button class="rm" on:click={(e) => handleRemove(e, i)} tabindex="-1">✕</button>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /*
   * Strip outer container.
   * Replaces .prog from ProgressionChips. Flex row; lbl + segments side by side.
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
  }

  /*
   * Segments row: fills available width; each segment shares it equally.
   * flex:1 ensures equal widths (Phase 01 invariant — all chords occupy 1 cycle).
   * Variable-width segments (Phase 02) will replace flex:1 with computed widths.
   */
  .segments {
    display: flex;
    flex: 1;
    min-width: 0;
    gap: 3px;
    overflow: hidden;
  }

  /*
   * Individual segment. Ported from .prog-chip (ProgressionChips.svelte lines 214–228).
   * Key difference: flex:1 (equal width) instead of flex:0 0 auto (auto-shrink chip).
   * touch-action:none and user-select:none required for pointer capture to work correctly
   * on touch devices (ProgressionChips.svelte lines 226–227, prototype CSS lines 226–228).
   */
  .seg {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 5px 6px;
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
    text-overflow: ellipsis;
    white-space: nowrap;
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

  /* Empty state hint. Ported from .prog-empty (ProgressionChips.svelte lines 259–263). */
  .strip-empty {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }
</style>

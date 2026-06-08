<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — ProgressionChips component.

  Ports prototype #progChips area (HTML lines 505–508, CSS lines 224–234, JS lines 1413–1468).
  Renders the chord progression as draggable chips in the footer.

  Chip drag: pointerdown captures pointer, pointermove computes dy = startY - e.clientY,
    ch.gain = clamp(startGain + dy * 0.006, 0, 1.2) with 3px moved threshold.
    On pointerup if moved → requeueLive(); if not moved (tap) → playChord().
  Prototype parity: threshold 3px (line 1452), gain step 0.006 (line 1453),
    clamp [0, 1.2] (line 1453), chipGainCss (lines 1413–1415), drag logic (lines 1441–1466).

  Tonal-function class: derived from diatonicLookup(root, mode) keyed by rootPc:qual.
  Prototype: ch.info.func.cls (line 1435); port uses computeDiatonic/diatonicLookup from scales.ts.

  Store reads:
    $sessionStore.harmony.progression  — array of Chord
    $sessionStore.harmony.root         — for tonal-function class derivation
    $sessionStore.harmony.mode         — for tonal-function class derivation

  Store writes (via session.ts actions):
    clearChordAt(index)  — ✕ remove button
    requeueLive()        — drag-release volume update
    playChord(...)       — tap on chip
-->
<script lang="ts">
  import { sessionStore, clearChordAt, requeueLive, playChord } from '../state/session.js';
  import { chordLabel } from '../core/theory/chords.js';
  import { diatonicLookup } from '../core/theory/scales.js';
  import type { Mode } from '../core/theory/scales.js';

  /**
   * Returns the CSS background gradient for a chip based on its gain.
   * Prototype lines 1413–1415.
   * @param g - Gain value 0–1.2
   */
  function chipGainCss(g: number): string {
    const pct = Math.round(Math.min(1, g / 1.2) * 100);
    return `linear-gradient(to top, rgba(138,160,255,.30) ${pct}%, rgba(255,255,255,.05) ${pct}%)`;
  }

  /**
   * Derive the tonal-function CSS class for a chip.
   * Prototype: ch.info.func.cls (line 1435). Port uses diatonicLookup from scales.ts.
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

  // ── Per-chip drag state ───────────────────────────────────────────────────
  // Parallel arrays indexed by chip position (same index as progression array).
  // These are transient UI state — NOT in sessionStore.
  // Prototype: let dragging=false, startY=0, startGain=0, moved=false (lines 1442–1443).

  /** Pointer-capture dragging active flag per chip. */
  let dragging: boolean[] = [];
  /** Pointer clientY at drag start per chip. */
  let startY: number[] = [];
  /** Gain value at drag start per chip. */
  let startGain: number[] = [];
  /** Whether the pointer moved > 3px (distinguishes drag from tap) per chip. */
  let moved: boolean[] = [];
  /** Local gain override while dragging (written without going through store). */
  let localGain: (number | null)[] = [];

  // Synchronise drag-state arrays whenever progression length changes.
  $: {
    const len = $sessionStore.harmony.progression.length;
    dragging = new Array(len).fill(false);
    startY = new Array(len).fill(0);
    startGain = new Array(len).fill(0);
    moved = new Array(len).fill(false);
    localGain = new Array(len).fill(null);
  }

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

  function handlePointerMove(e: PointerEvent, i: number): void {
    if (!dragging[i]) return;
    const dy = startY[i] - e.clientY;
    // Prototype line 1452: threshold 3px to distinguish drag from tap.
    if (Math.abs(dy) > 3) moved[i] = true;
    // Prototype line 1453: gain step 0.006 per px, clamp [0, 1.2].
    const newGain = Math.max(0, Math.min(1.2, startGain[i] + dy * 0.006));
    localGain[i] = newGain;
    // Trigger reactivity — force Svelte to re-render chip background.
    localGain = [...localGain];
  }

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
    // Reset local gain (chip will now use store value).
    localGain[i] = null;
    localGain = [...localGain];
  }

  function handleRemove(e: Event, i: number): void {
    e.stopPropagation();
    clearChordAt(i);
  }
</script>

<!--
  Prototype: .prog wrapper (lines 505–508), .prog-empty (line 234).
  .lbl label and #progChips flex container.
-->
<div class="prog">
  <span class="lbl">progresión</span>
  {#if $sessionStore.harmony.progression.length === 0}
    <span class="prog-empty">toca acordes en el Tonnetz…</span>
  {:else}
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
        class="prog-chip {tcls}"
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
  {/if}
</div>

<style>
  /*
   * Progression chip container. Prototype lines 224–225.
   * Scrollable horizontally; chips are flex-shrink:0.
   */
  .prog {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 120px;
    overflow-x: auto;
    padding: 2px;
  }

  .prog .lbl {
    font-size: 10px;
    color: var(--faint);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    flex: 0 0 auto;
  }

  /*
   * Individual chip. Prototype lines 226–228.
   * cursor: ns-resize communicates vertical drag gesture.
   */
  .prog-chip {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--stroke);
    cursor: ns-resize;
    touch-action: none;
    user-select: none;
  }

  /* Tonal-function border colors. Prototype lines 231–233. */
  .prog-chip.tonic {
    border-color: rgba(243, 177, 90, 0.4);
  }

  .prog-chip.subdom {
    border-color: rgba(86, 207, 196, 0.4);
  }

  .prog-chip.dom {
    border-color: rgba(232, 123, 172, 0.4);
  }

  /* Remove button. Prototype lines 229–230. */
  .prog-chip .rm {
    color: var(--faint);
    font-size: 11px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    line-height: 1;
  }

  .prog-chip:hover .rm {
    color: var(--dom);
  }

  /* Empty state hint. Prototype line 234. */
  .prog-empty {
    font-size: 11px;
    color: var(--faint);
    font-style: italic;
  }
</style>

<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — StepEditor component.

  A traditional step-sequencer grid showing one row per rhythm layer.
  Each row has a sound-name label on the left and N toggle buttons (where N
  = layer.steps.length — adapts to 7/12/16-step recipes automatically).

  Phase 09 step 09.2 — authentic-groove initiative.

  Props:
    layers   — RhythmLayer[] — the session layers to display
    onToggle — (layerIdx, stepIdx) => void — callback to toggle a step

  Locked layers (layer.locked === true) render with disabled buttons and
  reduced opacity. Free layers are fully interactive.

  Tonal-accent color for active steps: #8aa0ff (CLAUDE.md accent).
-->
<script lang="ts">
  import type { RhythmLayer } from '../core/rhythm/layers.js';

  export let layers: RhythmLayer[] = [];
  export let onToggle: (layerIdx: number, stepIdx: number) => void = () => {};
</script>

<div class="step-editor">
  {#each layers as layer, li}
    <div class="step-row" style="grid-template-columns: auto repeat({layer.steps.length}, 1fr)">
      <span
        class="step-sound-label"
        title={layer.strudelSample && layer.strudelSample !== layer.sound
          ? `${layer.sound} → ${layer.strudelSample}${layer.locked ? ' (locked)' : ''}`
          : layer.locked
            ? `${layer.sound} (locked — cultural signature)`
            : layer.sound}
      >
        {layer.sound}{#if layer.locked}<span class="lock-icon" aria-label="locked">⚿</span>{/if}
      </span>
      <div class="step-grid" style="grid-template-columns: repeat({layer.steps.length}, 1fr)">
        {#each layer.steps as step, si}
          <button
            class="step-btn"
            class:active={step === 1}
            class:locked={layer.locked}
            disabled={layer.locked === true}
            aria-disabled={layer.locked === true}
            aria-label="Step {si + 1} of {layer.steps.length} — {step ? 'on' : 'off'}"
            on:click={() => !layer.locked && onToggle(li, si)}
          ></button>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .step-editor {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 0 4px;
    background: rgba(255, 255, 255, 0.04);
    border-radius: 8px;
    padding: 6px 8px;
  }

  .step-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .step-sound-label {
    font-size: 10px;
    font-family: 'IBM Plex Mono', 'SF Mono', monospace;
    color: rgba(255, 255, 255, 0.55);
    min-width: 44px;
    text-align: right;
    user-select: none;
    flex-shrink: 0;
  }

  .lock-icon {
    font-size: 9px;
    margin-left: 2px;
    opacity: 0.6;
  }

  .step-grid {
    display: grid;
    gap: 2px;
    flex: 1;
  }

  .step-btn {
    width: 100%;
    min-width: 14px;
    height: 20px;
    border-radius: 3px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: transparent;
    cursor: pointer;
    transition:
      background 0.1s,
      border-color 0.1s;
    padding: 0;
  }

  .step-btn.active {
    background: rgba(138, 160, 255, 0.35);
    border-color: #8aa0ff;
  }

  .step-btn.locked {
    cursor: default;
    opacity: 0.45;
    pointer-events: none;
  }

  .step-btn.active.locked {
    background: rgba(138, 160, 255, 0.18);
    border-color: rgba(138, 160, 255, 0.3);
  }

  .step-btn:not(.locked):hover {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .step-btn:not(.locked):hover.active {
    background: rgba(138, 160, 255, 0.5);
  }
</style>

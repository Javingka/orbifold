<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — Latency calibration nudge widget (step 04.3).

  Shows a compact ±10 ms nudge control and current calibration readout.
  Visible only when `$sessionStore.nowPlaying.source !== null` (audio playing)
  OR when audio has been initialized at least once (`audioInitialized` flag).

  Writes to `setCalibrationOffsetMs` in phase-anchor.ts; the new value is
  summed into the total offset on the next `syncVisualPhaseAfterRunNow` call.

  CSS variables used: --text, --muted, --faint, --stroke, --accent (all from app.css).
-->
<script lang="ts">
  import { sessionStore } from '../state/session.js';
  import { getCalibrationOffsetMs, setCalibrationOffsetMs } from '../state/phase-anchor.js';

  // ── Visibility flag ───────────────────────────────────────────────────────
  // Becomes true on first play; stays true for the session so the control
  // is accessible for fine-tuning even after hush.
  let audioInitialized = false;

  // Watch nowPlaying — set audioInitialized once a source appears.
  $: if ($sessionStore.nowPlaying.source !== null) {
    audioInitialized = true;
  }

  // ── Calibration state ─────────────────────────────────────────────────────
  // Read initial value from phase-anchor module (already loaded from localStorage).
  let calibMs: number = getCalibrationOffsetMs();

  // ── Handlers ──────────────────────────────────────────────────────────────
  function decrement(): void {
    calibMs = calibMs - 10;
    setCalibrationOffsetMs(calibMs);
    // Sync from the clamped value written to the module.
    calibMs = getCalibrationOffsetMs();
  }

  function increment(): void {
    calibMs = calibMs + 10;
    setCalibrationOffsetMs(calibMs);
    calibMs = getCalibrationOffsetMs();
  }

  function reset(): void {
    setCalibrationOffsetMs(0);
    calibMs = 0;
  }

  // ── Readout formatting ────────────────────────────────────────────────────
  function fmtMs(ms: number): string {
    if (ms === 0) return '0 ms';
    return (ms > 0 ? '+' : '') + String(ms) + ' ms';
  }
</script>

{#if audioInitialized || $sessionStore.nowPlaying.source !== null}
  <!--
    Compact nudge widget. Positioned as a flex item inside the Transport footer.
    Label "sync" + tooltip explaining purpose.
  -->
  <div class="latency-calib" title="Ajusta si los círculos se adelantan o retrasan al sonido">
    <span class="lc-label">sync</span>
    <div class="lc-controls">
      <button class="lc-btn" on:click={decrement} aria-label="Reducir calibración 10 ms">−</button>
      <span class="lc-readout">{fmtMs(calibMs)}</span>
      <button class="lc-btn" on:click={increment} aria-label="Aumentar calibración 10 ms">+</button>
      <button
        class="lc-btn lc-reset"
        on:click={reset}
        aria-label="Restablecer calibración a 0"
        title="Restablecer a 0 ms">↺</button
      >
    </div>
  </div>
{/if}

<style>
  /* Compact nudge widget — flex row inside the Transport footer. */
  .latency-calib {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border-radius: 12px;
    background: rgba(0, 0, 0, 0.28);
    border: 1px solid var(--stroke);
  }

  /* "sync" label */
  .lc-label {
    font-size: 9px;
    color: var(--faint);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    flex: 0 0 auto;
  }

  /* Inner row: − | readout | + | ↺ */
  .lc-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* ±/↺ buttons */
  .lc-btn {
    padding: 4px 7px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.04);
    line-height: 1;
  }

  .lc-btn:hover {
    color: var(--text);
    border-color: rgba(138, 160, 255, 0.4);
    background: rgba(138, 160, 255, 0.1);
  }

  /* Reset button — slightly smaller */
  .lc-reset {
    font-size: 11px;
    padding: 4px 6px;
  }

  /* ms readout */
  .lc-readout {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: var(--accent);
    min-width: 48px;
    text-align: center;
    letter-spacing: 0.04em;
  }
</style>

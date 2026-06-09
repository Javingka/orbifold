<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — HarmonyControls component.

  Ports prototype .orbit-ctl#harmonyCtl (HTML lines 447–453, CSS lines 316–325).
  Shown only when $sessionStore.view === 'harmony'.

  Chord-mode segmented control: .seg2#chordModeSeg with two buttons:
    ◧ acorde (mode 'chord') / ⋯ arpegio (mode 'arp').
  Active state driven by $sessionStore.chordMode.
  On click: setChordMode(mode).

  Phase 06 step 06.4: added 📨 marco context capture button.
    Imports agentCtx; sets includeHarmony:true when clicked.
    Active state when $agentCtx.includeHarmony is true.
    Prototype: button#harmonyToCtx in footer (line 510); moved to toolbar per inventory.

  Position: position:absolute left:16px bottom:46px inside #stage.
  Prototype .orbit-ctl CSS lines 316–319.

  Store reads:
    $sessionStore.view       — visibility gate
    $sessionStore.chordMode  — active mode button
    $agentCtx.includeHarmony — context button active state

  Store writes (via session.ts):
    setChordMode('chord' | 'arp')
  Store writes (via agentCtx):
    agentCtx.update (includeHarmony: true)
-->
<script lang="ts">
  import { sessionStore, setChordMode } from '../state/session.js';
  import { agentCtx } from '../state/agentCtx.js';
</script>

{#if $sessionStore.view === 'harmony'}
  <!--
    Prototype: <div class="orbit-ctl glass" id="harmonyCtl"> (line 447).
    Overlay inside #stage at bottom-left. .orbit-ctl.show shown via Svelte {#if}.
  -->
  <div class="orbit-ctl glass" id="harmonyCtl">
    <span>al tocar un acorde, sonar como:</span>
    <!--
      Prototype: .seg2#chordModeSeg (lines 449–452).
      Two buttons: ◧ acorde / ⋯ arpegio with data-mode attribute.
      Active class driven by $sessionStore.chordMode.
    -->
    <div class="seg2" id="chordModeSeg">
      <button
        class:active={$sessionStore.chordMode === 'chord'}
        data-mode="chord"
        data-tip="Toca el acorde como bloque (todas las notas a la vez)."
        on:click={() => setChordMode('chord')}
      >
        ◧ acorde
      </button>
      <button
        class:active={$sessionStore.chordMode === 'arp'}
        data-mode="arp"
        data-tip="Arpegia el acorde (notas en sucesión, duración por subdivisión)."
        on:click={() => setChordMode('arp')}
      >
        ⋯ arpegio
      </button>
    </div>
    <!--
      Context capture button: send current harmony (key + progression) to the agent.
      Prototype: button#harmonyToCtx in footer (line 510); moved here per inventory.
      Active state when $agentCtx.includeHarmony is true.
    -->
    <button
      class="tbtn"
      class:active={$agentCtx.includeHarmony}
      title="Enviar la clave + progresión al agente como marco armónico"
      on:click={() => agentCtx.update((c) => ({ ...c, includeHarmony: true }))}>📨 marco</button
    >
  </div>
{/if}

<style>
  /*
   * Orbit control overlay: absolute-positioned inside #stage.
   * Prototype lines 316–319.
   */
  .orbit-ctl {
    position: absolute;
    left: 16px;
    bottom: 46px;
    display: flex;
    gap: 9px;
    align-items: center;
    padding: 9px 13px;
    border-radius: 13px;
    font-size: 11px;
    color: var(--muted);
    flex-wrap: wrap;
    max-width: 62%;
    z-index: 3;
  }

  /* Range inputs inside orbit-ctl. Prototype line 322. */
  .orbit-ctl :global(input[type='range']) {
    width: 78px;
    accent-color: var(--accent);
  }

  /* Bold monospace readouts. Prototype line 323. */
  .orbit-ctl :global(b) {
    color: var(--text);
    font-family: 'IBM Plex Mono', monospace;
  }

  /*
   * Context capture button (.tbtn) — matches Transport.svelte .tbtn.
   * Phase 06 step 06.4: added for 📨 marco button.
   */
  .tbtn {
    font-size: 11px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 10px;
    color: var(--muted);
    border: 1px solid var(--stroke);
    background: rgba(255, 255, 255, 0.04);
  }

  .tbtn:hover {
    color: var(--text);
    border-color: var(--stroke-2);
  }

  /* Active state: accent color when context flag is set. */
  .tbtn.active {
    color: var(--accent);
    border-color: rgba(138, 160, 255, 0.4);
    background: rgba(138, 160, 255, 0.12);
  }
</style>

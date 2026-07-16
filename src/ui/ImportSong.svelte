<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — ImportSong component.
  song-import Phase 03 step 03.3.

  Standalone panel for importing a song by name via LLM chart generation.
  Wire-up: sendImport(query) → importSession(result.input) → applyImportSession(saved).

  Decisions applied:
    OD-4 (Option A — LLM-native): fires sendImport, which calls the user's provider.
    OD-5 (Option A — name-only): the field accepts a plain song name; URL handling deferred.
    OD-6 (Option A — replace): applyImportSession fully replaces the current session;
          the "Esta acción reemplazará tu sesión actual." warning is always visible when
          the field is non-empty.
    UI placement: dedicated standalone component mounted in App.svelte alongside
          <AgentPanel /> and <PersistencePanel /> (decisions.md "Ubicación de la UI de import").

  Provider/model/key state pattern: reads agentProvider, loadApiKey, PROVIDERS from
  the same modules AgentPanel uses — no new HTTP client, no new localStorage keys.

  A-03-20: does NOT import from chatHistory.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { agentProvider } from '../agent/agent.js';
  import { loadApiKey } from '../agent/providers.js';
  import { sendImport } from '../agent/import-agent.js';
  import { importSession } from '../agent/import-session.js';
  import { applyImportSession } from '../agent/apply.js';

  // ── Panel open/close state ────────────────────────────────────────────────
  let open = false;

  // ── Field / async state ───────────────────────────────────────────────────
  let importQuery = '';
  let loading = false;
  let error: string | null = null;
  let successMsg = '';
  let successTimer: ReturnType<typeof setTimeout> | null = null;

  // ── Key presence check ────────────────────────────────────────────────────
  // Re-evaluated reactively via $: so it reflects the current provider at render time.
  // Reads from localStorage (same pattern as AgentPanel onMount → loadApiKey).
  let hasKey = false;

  onMount(() => {
    hasKey = !!loadApiKey(agentProvider);
  });

  // Refresh key check whenever the panel opens (provider may have been configured
  // in AgentPanel while ImportSong was closed).
  function handleOpen(): void {
    hasKey = !!loadApiKey(agentProvider);
    open = true;
  }

  function handleClose(): void {
    open = false;
  }

  // ── handleImport ──────────────────────────────────────────────────────────
  /**
   * Main import flow:
   *   1. sendImport(query)        — one-shot LLM call → ImportSessionInput
   *   2. importSession(input)     — pure translator → SavedSession
   *   3. applyImportSession(saved) — store update (OD-6: replaces current session)
   *
   * Pseudocode per phase-03.md step 03.3 spec.
   */
  async function handleImport(): Promise<void> {
    const query = importQuery.trim();
    if (!query || loading) return;

    loading = true;
    error = null;

    // Clear any previous success timer.
    if (successTimer !== null) {
      clearTimeout(successTimer);
      successTimer = null;
      successMsg = '';
    }

    const result = await sendImport(query);

    if (result.type === 'error') {
      error = result.message;
      loading = false;
      return;
    }

    const saved = importSession(result.input);
    applyImportSession(saved);

    successMsg = '✓ Sesión importada: ' + result.input.songTitle;
    importQuery = '';
    loading = false;

    // Auto-clear success message after 3 seconds.
    successTimer = setTimeout(() => {
      successMsg = '';
      successTimer = null;
    }, 3000);
  }

  /** Handle Enter key in the import input. */
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !loading) {
      void handleImport();
    }
  }

  // Computed: button is disabled while loading or when query is empty.
  $: importDisabled = loading || !importQuery.trim() || !hasKey;
</script>

<!--
  Trigger tab button — fixed left edge of the app, vertically positioned below
  the agent tab (which occupies the right edge). The import tab sits on the left.
-->
<div
  id="importTab"
  class="glass"
  role="button"
  tabindex="0"
  on:click={handleOpen}
  on:keydown={(e) => e.key === 'Enter' && handleOpen()}
>
  Importar
</div>

<!--
  Slide-in import panel — off-screen left by default, slides in on `open`.
-->
<aside id="importPanel" class="glass" class:open>
  <!-- Panel header -->
  <div class="import-head">
    <span class="import-glyph">♪</span>
    <b>Importar canción</b>
    <button class="import-close" title="Cerrar panel de importar" on:click={handleClose}>✕</button>
  </div>

  <!-- Content -->
  <div class="import-body">
    {#if !hasKey}
      <!-- No API key configured: show placeholder, disable field -->
      <p class="import-no-key">Configura tu proveedor de IA primero (panel de agente).</p>
    {:else}
      <!-- Song name field -->
      <div class="import-field-row">
        <label class="import-label" for="importQueryInput">Nombre o link</label>
        <input
          id="importQueryInput"
          type="text"
          class="import-input"
          bind:value={importQuery}
          placeholder="p. ej. ONE de Metallica"
          disabled={loading}
          on:keydown={handleKeyDown}
        />
      </div>

      <!-- Replace warning: persistent when field is non-empty -->
      {#if importQuery.trim()}
        <p class="import-warning">Esta acción reemplazará tu sesión actual.</p>
      {/if}

      <!-- Submit button -->
      <button class="import-btn" disabled={importDisabled} on:click={() => void handleImport()}>
        {loading ? 'Importando…' : 'Importar'}
      </button>

      <!-- Success message (auto-clears after 3s) -->
      {#if successMsg}
        <p class="import-success">{successMsg}</p>
      {/if}

      <!-- Error message (persistent until next attempt) -->
      {#if error}
        <p class="import-error">{error}</p>
      {/if}
    {/if}
  </div>
</aside>

<style>
  /* ── Tab trigger button ─────────────────────────────────────────────────── */
  #importTab {
    position: fixed;
    top: 50%;
    left: 0;
    transform: translateY(-50%) translateY(40px); /* offset below center to avoid overlap */
    writing-mode: vertical-rl;
    rotate: 180deg; /* text reads bottom-to-top on the left edge */
    padding: 16px 9px;
    border-radius: 0 14px 14px 0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--text);
    z-index: 6;
    cursor: pointer;
  }

  /* ── Slide-in panel ─────────────────────────────────────────────────────── */
  #importPanel {
    position: fixed;
    top: 14px;
    left: 14px;
    bottom: 14px;
    width: 320px;
    max-width: calc(100% - 28px);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    z-index: 7;
    transform: translateX(calc(-100% - 20px));
    transition: transform 0.42s cubic-bezier(0.22, 1, 0.36, 1);
    overflow: hidden;
  }

  #importPanel.open {
    transform: none;
  }

  /* ── Panel header ───────────────────────────────────────────────────────── */
  .import-head {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 13px 15px 10px;
    border-bottom: 1px solid var(--stroke);
    flex-shrink: 0;
  }

  .import-glyph {
    color: var(--accent);
    font-size: 16px;
  }

  .import-head b {
    flex: 1;
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: 15px;
  }

  .import-close {
    width: 26px;
    height: 26px;
    border-radius: 7px;
    border: 1px solid var(--stroke);
    background: transparent;
    color: var(--muted);
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
  }

  .import-close:hover {
    color: var(--text);
  }

  /* ── Panel body ─────────────────────────────────────────────────────────── */
  .import-body {
    padding: 14px 15px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── No-key placeholder ─────────────────────────────────────────────────── */
  .import-no-key {
    font-size: 12px;
    color: var(--muted);
    line-height: 1.5;
  }

  /* ── Field label + input ─────────────────────────────────────────────────── */
  .import-field-row {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .import-label {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.04em;
  }

  .import-input {
    background: rgba(0, 0, 0, 0.34);
    border: 1px solid var(--stroke);
    border-radius: 9px;
    padding: 7px 10px;
    font-size: 12.5px;
    outline: none;
    color: var(--text);
    font-family: inherit;
    width: 100%;
  }

  .import-input:focus {
    border-color: var(--stroke-2);
  }

  .import-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ── Replace warning ─────────────────────────────────────────────────────── */
  .import-warning {
    font-size: 11.5px;
    color: var(--tonic);
    line-height: 1.4;
  }

  /* ── Submit button ───────────────────────────────────────────────────────── */
  .import-btn {
    border-radius: 9px;
    padding: 8px 14px;
    background: rgba(138, 160, 255, 0.15);
    border: 1px solid rgba(138, 160, 255, 0.35);
    color: var(--accent);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    align-self: flex-start;
    transition: background 0.18s ease;
  }

  .import-btn:hover:not(:disabled) {
    background: rgba(138, 160, 255, 0.25);
  }

  .import-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* ── Success message ─────────────────────────────────────────────────────── */
  .import-success {
    font-size: 12px;
    color: var(--subdom);
    line-height: 1.4;
  }

  /* ── Error message ───────────────────────────────────────────────────────── */
  .import-error {
    font-size: 12px;
    color: var(--dom);
    line-height: 1.4;
  }
</style>

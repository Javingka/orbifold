<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — PersistencePanel component.
  Phase 07 step 07.4.
  Save, load, and share sessions via localStorage and URL hash encoding.
-->
<script lang="ts">
  import { get } from 'svelte/store';
  import { sessionStore, applyLoadedSession } from '../state/session.js';
  import {
    saveSession,
    loadSavedSession,
    listSavedSessions,
    deleteSession,
    encodeSession,
    decodeSession,
  } from '../lib/persistence.js';
  import { t } from '../i18n/index.js';

  let open = false;
  let sessions: string[] = [];
  let saveName = '';
  let shareFeedback = '';
  let shareTimer: ReturnType<typeof setTimeout> | null = null;

  function openPanel(): void {
    sessions = listSavedSessions();
    open = true;
  }

  function closePanel(): void {
    open = false;
  }

  function refreshList(): void {
    sessions = listSavedSessions();
  }

  function handleSave(): void {
    const name = saveName.trim();
    if (!name) return;
    saveSession(name, get(sessionStore));
    saveName = '';
    refreshList();
  }

  function handleLoad(name: string): void {
    const saved = loadSavedSession(name);
    if (saved !== null) {
      applyLoadedSession(saved);
    }
    closePanel();
  }

  function handleDelete(name: string): void {
    deleteSession(name);
    refreshList();
  }

  function handleShare(): void {
    const encoded = encodeSession(get(sessionStore));
    const url = `${window.location.origin}${window.location.pathname}#session=${encoded}`;
    void navigator.clipboard.writeText(url).then(() => {
      // Use $t to resolve the translated feedback text at call time.
      shareFeedback = $t('persistence.shareFeedback');
      if (shareTimer !== null) clearTimeout(shareTimer);
      shareTimer = setTimeout(() => {
        shareFeedback = '';
        shareTimer = null;
      }, 2000);
    });
  }

  function handleDownload(): void {
    const encoded = encodeSession(get(sessionStore));
    const blob = new Blob([encoded], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orbifold-session.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  let uploadFeedback = '';
  let uploadTimer: ReturnType<typeof setTimeout> | null = null;

  function handleUpload(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const saved = decodeSession(text);
      if (saved !== null) {
        applyLoadedSession(saved);
        uploadFeedback = 'Sesión cargada ✓';
        closePanel();
      } else {
        uploadFeedback = 'Archivo inválido';
      }
      if (uploadTimer !== null) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => {
        uploadFeedback = '';
        uploadTimer = null;
      }, 2500);
    };
    reader.readAsText(file);
    input.value = '';
  }
</script>

<!--
  Floating trigger button — position:fixed bottom-right of viewport.
-->
<button id="sessionsBtn" title={$t('persistence.btnTitle')} on:click={openPanel}>💾</button>

<!--
  Slide-in sessions panel.
  class:open drives the CSS translateX transition (app.css #sessionsPanel.open).
-->
<div id="sessionsPanel" class:open>
  <div class="sess-head">
    <span>💾</span>
    <b>{$t('persistence.panelTitle')}</b>
    <button class="sess-close" title={$t('persistence.closeTitle')} on:click={closePanel}>✕</button>
  </div>

  <div class="sess-input-row">
    <input
      type="text"
      bind:value={saveName}
      placeholder={$t('persistence.saveNamePlaceholder')}
      on:keydown={(e) => e.key === 'Enter' && handleSave()}
    />
    <button on:click={handleSave}>{$t('persistence.saveBtn')}</button>
  </div>

  <div class="sess-list">
    {#if sessions.length === 0}
      <div class="sess-list-empty">{$t('persistence.emptyState')}</div>
    {:else}
      {#each sessions as name (name)}
        <div class="sess-item">
          <span class="sess-name" title={name}>{name}</span>
          <div class="sess-actions">
            <button title={$t('persistence.loadTitle')} on:click={() => handleLoad(name)}>▶</button
            >
            <button
              class="del"
              title={$t('persistence.deleteTitle')}
              on:click={() => handleDelete(name)}>🗑</button
            >
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="share-url-row">
    <button on:click={handleShare}>{$t('persistence.shareBtn')}</button>
    <div class="share-feedback">{shareFeedback}</div>
  </div>

  <div class="file-row">
    <button class="file-btn" title="Descargar sesión completa como JSON" on:click={handleDownload}
      >⬇ Descargar</button
    >
    <label class="file-btn" title="Importar sesión desde archivo JSON">
      ⬆ Importar
      <input type="file" accept=".json,application/json" on:change={handleUpload} />
    </label>
    {#if uploadFeedback}
      <span class="upload-feedback">{uploadFeedback}</span>
    {/if}
  </div>
</div>

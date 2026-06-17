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
</div>

<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — CodeDrawer component.

  Ports prototype #codeTab + #codeDrawer (HTML lines 516–528, CSS lines 237–249).

  Phase 09 step 09.4: Elevated to a primary view (ADR 0013 D2 Option D1).
  The #codeTab button is removed — navigation is now handled by the 4-tab seg
  control in Header.svelte. The component is mounted/unmounted by App.svelte via a
  {#if $sessionStore.view === 'code'} gate. When mounted, it fills #stage via
  flex:1 layout (replacing the position:fixed + translateY slide mechanism).

  Step 09.4 REVISE: The ✕ close button (#codeClose) and handleClose() function
  were removed (ADR 0013 §D2). In the primary-view lifecycle there is no close
  action — navigation is handled by the 4-tab Header.svelte control. The button
  was a misleading affordance that only reset userEdited=false with no visible effect.

  Textarea #liveCode: 120px height, IBM Plex Mono, placeholder 's("bd hh sd hh")'.

  Action buttons:
    ▶ ejecutar (ahora) → runEditor(code) [prototype line 525]
    ↻ encolar (próximo ciclo) → queueEditor(code) [prototype line 526]

  Local state:
    currentEditorCode: string — auto-populated from session store when userEdited is false
    userEdited: boolean — true once the user types; false after execute/queue

  Round-2 fix (Defect C — OD-2 update):
    Subscribe to sessionStore; derive current generated code from session state
    (rhythmCode / harmonyCode / sessionCode based on nowPlaying.source).
    Auto-populate textarea only when userEdited === false.

  Store reads:
    sessionStore — for deriving live Strudel code (nowPlaying.source, rhythm, harmony, chordMode)
  Store writes:
    runEditor(code)   — prototype #runEditor.onclick (lines 524–526)
    queueEditor(code) — prototype #updateEditor.onclick (line 527)
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import {
    sessionStore,
    runEditor,
    queueEditor,
    rhythmCode,
    harmonyCode,
    sessionCode,
  } from '../state/session.js';
  import { t } from '../i18n/index.js';

  // open: vestigial (Phase 09 step 09.4). The {#if} gate in App.svelte controls
  // mounting/unmounting. Removed to avoid lint no-unused-vars error.

  /**
   * Current text in the editor textarea. Auto-populated from the session store
   * when userEdited is false; left alone when the user has manually edited it.
   * Round-2 fix (Defect C): derived from session state, not a static local var.
   * Prototype: #liveCode.value is updated by every transport play handler
   *   (lines 1490, 1496, 1503: `document.getElementById('liveCode').value = code`).
   */
  let currentEditorCode = '';

  /**
   * Whether the user has manually edited the textarea.
   * Reset to false when the drawer closes or when execute/queue is pressed.
   * While true: auto-population from the store is suppressed.
   * Prototype: prototype keeps no such flag — the HTML element's value was
   *   always overwritten by transport actions. The port uses this flag to
   *   avoid overwriting mid-edit user content.
   */
  let userEdited = false;

  /**
   * Derive the "current code" string from session state.
   * Follows prototype order: rhythm / harmony / session / fallback to longest.
   * Prototype: transport handlers (lines 1490, 1496, 1503) each wrote the code
   *   they were about to play into #liveCode.value.
   */
  function deriveCurrentCode(state: Parameters<typeof rhythmCode>[0]): string {
    const src = state.nowPlaying.source;
    if (src === 'rhythm') {
      return rhythmCode(state);
    }
    if (src === 'harmony' || src === 'chord') {
      return harmonyCode(state).trim();
    }
    if (src === 'session') {
      return sessionCode(state);
    }
    // Fallback: show whichever produces the longest non-empty string.
    const rc = rhythmCode(state);
    const hc = harmonyCode(state).trim();
    const sc = sessionCode(state);
    // Prefer the combined session code when both rhythm and harmony are present.
    if (sc) return sc;
    if (rc.length >= hc.length) return rc;
    return hc;
  }

  // Subscribe to sessionStore: auto-populate textarea with generated Strudel code
  // whenever the session changes and the user has not manually edited the textarea.
  // Round-2 fix (Defect C): replaces the static local-var approach from step 04.4.
  const unsubStore = sessionStore.subscribe((state) => {
    if (!userEdited) {
      const derived = deriveCurrentCode(state);
      if (derived !== currentEditorCode) {
        currentEditorCode = derived;
      }
    }
  });

  onDestroy(() => {
    unsubStore();
  });

  // toggleDrawer is vestigial — the primary-view {#if} gate in App.svelte controls
  // mounting/unmounting. Removed to avoid lint errors (@typescript-eslint/no-unused-vars).

  // handleClose() removed in Phase 09 step 09.4 REVISE (ADR 0013 §D2): the close
  // button was a misleading affordance with no effect under the {#if} lifecycle.
  // Clicking it only reset userEdited=false; the view did not close. Button removed.

  function handleRun(): void {
    void runEditor(currentEditorCode);
    // Reset userEdited: the executed code is now the "current code" for this drawer.
    userEdited = false;
  }

  function handleQueue(): void {
    void queueEditor(currentEditorCode);
    // Reset userEdited: queued code is committed; allow auto-population to resume.
    userEdited = false;
  }

  function handleInput(): void {
    // User has started editing the textarea manually.
    userEdited = true;
  }
</script>

<!--
  Primary-view content: fills #stage when App.svelte mounts this component via
  {#if $sessionStore.view === 'code'}. The #codeTab button is removed (Phase 09
  step 09.4 — navigation handled by 4-tab Header.svelte control; ADR 0013 D2).
  #codeDrawer uses flex:1 + height:100% to fill the parent #stage container.
-->
<div id="codeDrawer" class="glass">
  <div class="code-head">
    <b>{$t('code.heading')}</b>
    <span style="font-size:10.5px;color:var(--faint)">{$t('code.headingHint')}</span>
  </div>

  <!--
    Textarea. Prototype lines 246–248.
    IBM Plex Mono, 120px height, placeholder for hint.
    The placeholder s("bd hh sd hh") is [VERBATIM] Strudel code — not translated.
    on:input sets userEdited=true so auto-population is suppressed while editing.
  -->
  <textarea
    id="liveCode"
    spellcheck="false"
    placeholder={'s("bd hh sd hh")'}
    bind:value={currentEditorCode}
    on:input={handleInput}
  ></textarea>

  <!--
    Action buttons. Prototype lines 524–527.
  -->
  <div class="code-actions">
    <button class="tbtn" id="runEditor" on:click={handleRun}>{$t('code.runNow')}</button>
    <button class="tbtn" id="updateEditor" on:click={handleQueue}>{$t('code.queue')}</button>
  </div>
</div>

<style>
  /*
   * Primary-view layout (Phase 09 step 09.4, ADR 0013 D2).
   * Replaces position:fixed + translateY(105%) slide mechanism.
   * The component is mounted inside #stage (via {#if} gate in App.svelte) and covers
   * the full stage area using position:absolute; inset:0. The PIXI canvas sits below
   * (rendered transparent — both layers hidden by stage.ts setView for 'code' view).
   * z-index:1 ensures the drawer is above the PIXI canvas (z-index:0 by default).
   * overflow:auto allows content to scroll if viewport is short.
   */
  #codeDrawer {
    position: absolute;
    inset: 0;
    z-index: 1;
    border-radius: 18px;
    overflow: auto;
    padding: 14px 16px 16px;
  }

  /* Drawer header row. Prototype lines 243–245. */
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

  /* .c-close removed in Phase 09 step 09.4 REVISE (ADR 0013 §D2):
     the close button was a misleading affordance — navigation is handled
     by the 4-tab Header.svelte control; there is no close action in the
     primary-view lifecycle. */

  /*
   * Textarea. Prototype lines 246–248.
   * IBM Plex Mono, 120px height, dark background.
   */
  #liveCode {
    width: 100%;
    height: 120px;
    background: rgba(0, 0, 0, 0.42);
    border: 1px solid var(--stroke);
    border-radius: 11px;
    padding: 11px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: #bcd;
    resize: vertical;
    outline: none;
    line-height: 1.5;
    box-sizing: border-box;
  }

  /* Action buttons row. Prototype line 249. */
  .code-actions {
    display: flex;
    gap: 8px;
    margin-top: 9px;
  }

  /* Generic transport button. Matches Transport.svelte .tbtn. */
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
</style>

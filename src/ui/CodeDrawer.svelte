<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — CodeDrawer component.

  Ports prototype #codeTab + #codeDrawer (HTML lines 516–528, CSS lines 237–249).

  Tab button: fixed at bottom-center (prototype CSS line 237).
    Label: ⌄ código strudel
    On click: toggles open state.

  Drawer: slides up from bottom on open, back down on close.
    transform: translateY(105%) → translateY(0) with cubic-bezier transition
    (prototype CSS lines 240–242: transition .4s cubic-bezier(.22,1,.36,1)).

  Textarea #liveCode: 120px height, IBM Plex Mono, placeholder 's("bd hh sd hh")'.

  Action buttons:
    ▶ ejecutar (ahora) → runEditor(code) [prototype line 525]
    ↻ encolar (próximo ciclo) → queueEditor(code) [prototype line 526]

  Close button ✕: closes drawer.

  Local state:
    open: boolean
    currentEditorCode: string — auto-populated from session store when userEdited is false
    userEdited: boolean — true once the user types; false after close or execute/queue

  Round-2 fix (Defect C — OD-2 update):
    Subscribe to sessionStore; derive current generated code from session state
    (rhythmCode / harmonyCode / sessionCode based on nowPlaying.source).
    Auto-populate textarea only when userEdited === false.
    Prototype: prototype lines 1490, 1496, 1503 all wrote to #liveCode.value after
    each play action, keeping the drawer in sync with what was sent to the engine.
    The port replicates this by deriving the code from the same source each frame.

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

  /** Whether the code drawer is open. Transient — NOT in sessionStore. */
  let open = false;

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

  function toggleDrawer(): void {
    open = !open;
    if (!open) {
      // Drawer closed: reset userEdited so next open shows fresh derived code.
      userEdited = false;
    }
  }

  function handleClose(): void {
    open = false;
    // Reset userEdited: next time drawer opens it will show the derived code.
    userEdited = false;
  }

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
  Tab button: fixed bottom-center. Prototype CSS line 237.
  #codeTab.glass with uppercase micro-text.
-->
<button id="codeTab" class="glass" on:click={toggleDrawer}> ⌄ código strudel </button>

<!--
  Drawer: fixed, slides up from bottom. Prototype lines 240–242.
  .open class applies translateY(0).
-->
<div id="codeDrawer" class="glass" class:open>
  <div class="code-head">
    <b>código Strudel</b>
    <span style="font-size:10.5px;color:var(--faint)">lo que suena ahora — edítalo y ejecútalo</span
    >
    <button class="c-close" id="codeClose" on:click={handleClose}>✕</button>
  </div>

  <!--
    Textarea. Prototype lines 246–248.
    IBM Plex Mono, 120px height, placeholder for hint.
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
    <button class="tbtn" id="runEditor" on:click={handleRun}>▶ ejecutar (ahora)</button>
    <button class="tbtn" id="updateEditor" on:click={handleQueue}>↻ encolar (próximo ciclo)</button>
  </div>
</div>

<style>
  /*
   * Tab button: fixed at bottom-center. Prototype CSS line 237.
   * Position: fixed; centered via left:50% + translateX(-50%).
   * bottom: 90px — clears the Transport footer (approx. 68–80 px at 1440 wide,
   * up to ~104 px with progression strip on narrow viewports; 90 px is a safe
   * clearance for the common single-row footer case). OD-01 resolution: option 1.
   */
  #codeTab {
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 8;
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    padding: 6px 16px;
    border-radius: 11px;
    cursor: pointer;
    /* Reset button defaults */
    border: 1px solid var(--stroke);
    background: var(--panel);
  }

  #codeTab:hover {
    color: var(--text);
  }

  /*
   * Drawer: fixed, slides up. Prototype CSS lines 240–242.
   * translateY(105%) = hidden below viewport.
   * .open → translateY(0) = fully visible.
   */
  #codeDrawer {
    position: fixed;
    left: 12px;
    right: 12px;
    bottom: 0;
    z-index: 9;
    border-radius: 18px 18px 0 0;
    transform: translateY(105%);
    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    padding: 14px 16px 16px;
  }

  #codeDrawer.open {
    transform: translateY(0);
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

  .code-head .c-close {
    margin-left: auto;
    color: var(--muted);
    font-size: 18px;
    padding: 0 6px;
    background: none;
    border: none;
    cursor: pointer;
    line-height: 1;
  }

  .code-head .c-close:hover {
    color: var(--text);
  }

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

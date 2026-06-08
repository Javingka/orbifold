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

  Local state (NOT in sessionStore — per OD-2 resolution):
    open: boolean
    currentEditorCode: string

  OD-2 decision: currentCode is local state in CodeDrawer.svelte, not in sessionStore.
  Prototype's currentCode global (line 583) was a monolith side-effect; the port
  keeps it as presentational state local to the drawer.

  Store reads: none (all local)
  Store writes:
    runEditor(code)   — prototype #runEditor.onclick (lines 524–526)
    queueEditor(code) — prototype #updateEditor.onclick (line 527)
-->
<script lang="ts">
  import { runEditor, queueEditor } from '../state/session.js';

  /** Whether the code drawer is open. Transient — NOT in sessionStore. */
  let open = false;

  /**
   * Current text in the editor textarea. Transient — NOT in sessionStore.
   * OD-2 resolution: local state only; not persisted.
   * Prototype: currentCode global (line 583).
   */
  let currentEditorCode = '';

  function toggleDrawer(): void {
    open = !open;
  }

  function handleClose(): void {
    open = false;
  }

  function handleRun(): void {
    void runEditor(currentEditorCode);
  }

  function handleQueue(): void {
    void queueEditor(currentEditorCode);
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
  -->
  <textarea
    id="liveCode"
    spellcheck="false"
    placeholder={'s("bd hh sd hh")'}
    bind:value={currentEditorCode}
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
   * Position: fixed; bottom 14px; centered via left:50% + translateX(-50%).
   */
  #codeTab {
    position: fixed;
    bottom: 14px;
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

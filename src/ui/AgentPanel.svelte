<!--
  SPDX-License-Identifier: AGPL-3.0-only
  Orbifold — AgentPanel component.

  Phase 06 step 06.4.

  Prototype parity:
    Tab:            reference/orbifold.html line 456       (#agentTab)
    Panel HTML:     reference/orbifold.html lines 457–481  (#agent)
    Quick prompts:  reference/orbifold.html lines 1789–1797 (QUICK array + render)
    Send handler:   reference/orbifold.html lines 1780–1788 (sendBtn.onclick, keydown)
    appendMsg:      reference/orbifold.html lines 1615–1634 (inline code block render)
    playWithAutofix: reference/orbifold.html lines 1637–1647
    Panel toggle:   reference/orbifold.html lines 1799–1801

  Known deviations from prototype:
    - agentCtx store replaces prototype globals melodyContext/rhythmContext (lines 1510, 1534).
    - Chat messages held in local Svelte reactive array (mirrors chatHistory in agent.ts).
    - Code blocks rendered via Svelte {#each} (not innerHTML/DOM manipulation).
    - nowPlaying.source read from $sessionStore (not prototype global currentCode / setNowPlaying).
    - Provider select shows only 'Anthropic' and 'OpenRouter' (no OpenAI — Pilot decision).
    - autofix retry indicator uses Svelte reactive variable, not prototype DOM load element.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import {
    sessionStore,
    setNowPlaying,
    setAutopilot,
    setLastRecipeApplied,
  } from '../state/session.js';
  import { startAutopilot, stopAutopilot } from '../agent/autopilot.js';
  import { agentCtx } from '../state/agentCtx.js';
  import {
    send,
    requestAutofix,
    setProvider,
    setModel,
    agentProvider,
    agentModel,
  } from '../agent/agent.js';
  import { loadApiKey, saveApiKey, PROVIDERS } from '../agent/providers.js';
  import { runNow, queueForNextCycle } from '../audio/strudel.js';
  import type { ProviderKey } from '../agent/providers.js';
  import { t } from '../i18n/index.js';

  // ── Panel open/close state ────────────────────────────────────────────────
  let open = false;

  // ── Provider / model / key state ─────────────────────────────────────────
  // Prototype: providerSel, modelInput, keyInput (lines 1596–1606).

  let providerValue: ProviderKey = agentProvider;
  let modelValue: string = agentModel;
  let keyValue: string = '';
  let keyPlaceholder: string = PROVIDERS[agentProvider].keyHint;

  onMount(() => {
    // Load persisted API key for the current provider.
    // Prototype: keyInput.value = localStorage.getItem(...) (inlined in prototype's init).
    keyValue = loadApiKey(providerValue);
  });

  /** Handle provider change: update model default, key hint, persist current key. */
  function handleProviderChange(val: string): void {
    const p = val as ProviderKey;
    providerValue = p;
    setProvider(p);
    modelValue = PROVIDERS[p].defaultModel;
    setModel(modelValue);
    keyPlaceholder = PROVIDERS[p].keyHint;
    keyValue = loadApiKey(p);
    // Prototype: syncProviderUI() line 1605.
  }

  function handleModelBlur(): void {
    setModel(modelValue);
  }

  function handleKeyBlur(): void {
    if (keyValue.trim()) {
      saveApiKey(providerValue, keyValue.trim());
    }
  }

  // ── Quick prompts ──────────────────────────────────────────────────────────
  // Prototype: QUICK array lines 1789–1795 + render loop lines 1796–1797.
  // Step 11.5: made reactive so labels/prompts switch with the active language.

  $: QUICK = [
    [$t('agent.quick.grooveLabel'), $t('agent.quick.groovePrompt')],
    [$t('agent.quick.progressionLabel'), $t('agent.quick.progressionPrompt')],
    [$t('agent.quick.bothLabel'), $t('agent.quick.bothPrompt')],
    [$t('agent.quick.euclidLabel'), $t('agent.quick.euclidPrompt')],
    [$t('agent.quick.variationLabel'), $t('agent.quick.variationPrompt')],
  ] as [string, string][];

  // ── Toggles ───────────────────────────────────────────────────────────────
  let autoplay = true;
  let autofixEnabled = true;

  // ── Autopilot ─────────────────────────────────────────────────────────────
  // Reactive binding to autopilot state in sessionStore.
  // ADR 0022 D1: AutopilotState lives in SessionState for Svelte reactivity.
  $: autopilot = $sessionStore.autopilot;

  /**
   * Toggle autopilot on or off.
   * setAutopilot must be called BEFORE startAutopilot so the timer reads
   * the latest intervalCycles (ADR 0022 D2).
   */
  function toggleAutopilot(): void {
    if (autopilot.enabled) {
      stopAutopilot();
      setAutopilot({ enabled: false });
    } else {
      setAutopilot({ enabled: true });
      startAutopilot();
    }
  }

  // ── Chat state ────────────────────────────────────────────────────────────
  // Local Svelte reactive array mirrors agent.ts chatHistory.
  // Each message: { role, content, codeBlocks }
  // codeBlocks: code strings extracted from ```strudel/js/javascript blocks.

  type ChatMsg = {
    role: 'user' | 'assistant';
    content: string;
    codeBlocks: string[];
    isLoading?: boolean;
    avatar: string;
  };

  let chatMessages: ChatMsg[] = [];

  /** Extract code blocks from content string (prototype line 1620–1628 appendMsg logic). */
  function extractCodeBlocks(content: string): string[] {
    const re = /```(?:strudel|js|javascript)?\n([\s\S]*?)```/g;
    const blocks: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      blocks.push(m[1].trim());
    }
    return blocks;
  }

  /** Strip code fences from content for display as plain text between blocks. */
  function contentParts(
    content: string
  ): Array<{ type: 'text'; text: string } | { type: 'code'; code: string }> {
    const re = /```(?:strudel|js|javascript)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text'; text: string } | { type: 'code'; code: string }> = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      if (m.index > last) {
        parts.push({ type: 'text', text: content.slice(last, m.index) });
      }
      parts.push({ type: 'code', code: m[1].trim() });
      last = m.index + m[0].length;
    }
    if (last < content.length) {
      parts.push({ type: 'text', text: content.slice(last) });
    }
    return parts;
  }

  // ── Input state ───────────────────────────────────────────────────────────
  let inputText = '';
  let sending = false;

  // ── autofix state ─────────────────────────────────────────────────────────
  // Prototype: autofixInFlight (line 1636), autofixAttempts (line 1636), AUTOFIX_MAX=2.
  let autofixInFlight = false;
  let autofixAttempts = 0;
  const AUTOFIX_MAX = 2;

  // ── Chat scroll container ref ─────────────────────────────────────────────
  let chatEl: HTMLDivElement;

  function scrollChat(): void {
    if (chatEl) {
      // Defer to allow DOM to update first.
      requestAnimationFrame(() => {
        chatEl.scrollTop = chatEl.scrollHeight;
      });
    }
  }

  // ── playWithAutofix ───────────────────────────────────────────────────────
  /**
   * Play a Strudel code string, with up to AUTOFIX_MAX retry attempts via requestAutofix.
   *
   * Prototype parity: reference/orbifold.html lines 1637–1647.
   *
   * wasPlaying logic: if nowPlaying.source is non-null, queue for next cycle;
   * otherwise run immediately (prototype: `!!currentCode`).
   */
  async function playWithAutofix(code: string, opts: { isRetry?: boolean } = {}): Promise<void> {
    if (!opts.isRetry) autofixAttempts = 0;
    const wasPlaying = $sessionStore.nowPlaying.source !== null;
    const result = wasPlaying
      ? await queueForNextCycle(code, { silent: true })
      : await runNow(code, { silent: true });

    if (result && result.ok === false && result.error) {
      // Prototype lines 1641–1645: autofix branch.
      if (autofixEnabled && !autofixInFlight && autofixAttempts < AUTOFIX_MAX) {
        autofixAttempts++;
        autofixInFlight = true;

        // Show "🔧 corrigiendo…" loading indicator (prototype line 1656).
        const loadMsg: ChatMsg = {
          role: 'assistant',
          content: $t('agent.autofixLoading'),
          codeBlocks: [],
          isLoading: true,
          avatar: '🔧',
        };
        chatMessages = [...chatMessages, loadMsg];
        scrollChat();

        const fixed = await requestAutofix(code, result.error);
        autofixInFlight = false;

        // Remove the loading indicator.
        chatMessages = chatMessages.filter((m) => m !== loadMsg);

        if (fixed) {
          const fixedBlocks = extractCodeBlocks(fixed);
          chatMessages = [
            ...chatMessages,
            {
              role: 'assistant',
              content: '🔧 ' + fixed,
              codeBlocks: fixedBlocks,
              avatar: '🔧',
            },
          ];
          scrollChat();
          await playWithAutofix(fixed, { isRetry: true });
        } else {
          chatMessages = [
            ...chatMessages,
            {
              role: 'assistant',
              content: $t('agent.autofixFailed'),
              codeBlocks: [],
              avatar: '꩜',
            },
          ];
          scrollChat();
        }
      } else {
        // Give up (prototype lines 1644–1645).
        const giveUp = autofixAttempts >= AUTOFIX_MAX;
        const errMsg =
          $t('agent.execError', { error: result.error }) +
          (giveUp
            ? $t('agent.execErrorGiveUp')
            : autofixEnabled
              ? ''
              : $t('agent.execErrorEnableAutofix'));
        chatMessages = [
          ...chatMessages,
          {
            role: 'assistant',
            content: errMsg,
            codeBlocks: [],
            avatar: '꩜',
          },
        ];
        scrollChat();
      }
    } else if (result && result.ok) {
      // Prototype line 1646: success. D8: store key, Transport resolves via $t.
      autofixAttempts = 0;
      setNowPlaying('session.playing.agent', 'agent');
    }
  }

  // ── handleSend ────────────────────────────────────────────────────────────
  /**
   * Send user input to the agent, display response, optionally autoplay.
   *
   * Prototype parity: reference/orbifold.html lines 1780–1788 (sendBtn.onclick)
   * and lines 1741–1779 (send function flow in agent.ts, consumed here in the UI).
   */
  async function handleSend(text: string): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    sending = true;
    inputText = '';

    // Push user message (prototype: appendMsg 'user').
    chatMessages = [
      ...chatMessages,
      {
        role: 'user',
        content: trimmed,
        codeBlocks: [],
        avatar: '🎸',
      },
    ];
    scrollChat();

    // Build ctx from agentCtx store flags.
    const ctx = {
      includeRhythmCtx: $agentCtx.includeRhythm,
      includeHarmonyCtx: $agentCtx.includeHarmony,
    };

    // Reset context flags immediately after capturing (prototype: clears on send).
    agentCtx.set({ includeRhythm: false, includeHarmony: false });

    // Show loading indicator (prototype: loading dots).
    const loadMsg: ChatMsg = {
      role: 'assistant',
      content: '',
      codeBlocks: [],
      isLoading: true,
      avatar: '꩜',
    };
    chatMessages = [...chatMessages, loadMsg];
    scrollChat();

    // Call agent send().
    const result = await send(trimmed, ctx);

    // Remove loading indicator.
    chatMessages = chatMessages.filter((m) => m !== loadMsg);
    sending = false;

    if (result.type === 'error') {
      chatMessages = [
        ...chatMessages,
        {
          role: 'assistant',
          content: result.message,
          codeBlocks: [],
          avatar: '꩜',
        },
      ];
      scrollChat();
      return;
    }

    if (result.type === 'skill') {
      // Prototype lines 1771–1773: summary text + code block in chat.
      const codeBlocks = [result.code];
      chatMessages = [
        ...chatMessages,
        {
          role: 'assistant',
          content: result.summary + '\n\n```strudel\n' + result.code + '\n```',
          codeBlocks,
          avatar: '꩜',
        },
      ];
      scrollChat();

      // Autoplay if enabled (prototype line 1633).
      if (autoplay) {
        await playWithAutofix(result.code);
      }
      return;
    }

    if (result.type === 'code') {
      const codeBlocks = [result.code];
      chatMessages = [
        ...chatMessages,
        {
          role: 'assistant',
          content: '```strudel\n' + result.code + '\n```',
          codeBlocks,
          avatar: '꩜',
        },
      ];
      scrollChat();

      if (autoplay) {
        await playWithAutofix(result.code);
      }
      return;
    }

    // type === 'text': plain text response.
    chatMessages = [
      ...chatMessages,
      {
        role: 'assistant',
        content: result.text,
        codeBlocks: extractCodeBlocks(result.text),
        avatar: '꩜',
      },
    ];
    scrollChat();
  }

  /** Handle Enter key in textarea (prototype: keydown listener lines 1781). */
  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend(inputText);
    }
  }

  /** Send a quick prompt (prototype: QUICK.forEach line 1797). */
  function handleQuick(prompt: string): void {
    inputText = prompt;
    void handleSend(prompt);
  }
</script>

<!--
  Agent tab button — fixed right edge of the app, prototype line 456.
  Uses position:fixed because #app is flex-column; the panel needs to be
  positioned relative to the viewport, not #stage.
-->
<div
  id="agentTab"
  class="glass"
  role="button"
  tabindex="0"
  on:click={() => (open = true)}
  on:keydown={(e) => e.key === 'Enter' && (open = true)}
>
  {$t('agent.tabLabel')}
</div>

<!--
  Slide-in agent panel, prototype lines 457–481.
  class:open drives the CSS translateX transition (app.css #agent.open).
-->
<aside id="agent" class="glass" class:open>
  <!--
    Panel header: glyph + title + close button.
    Prototype lines 458–461.
  -->
  <div class="agent-head">
    <span class="a-glyph">꩜</span>
    <b>{$t('agent.panelTitle')}</b>
    <button class="a-close" title={$t('agent.closeTitle')} on:click={() => (open = false)}>✕</button
    >
  </div>

  <!--
    Provider / model / API key row.
    Prototype lines 462–470.
    Deviations: no OpenAI option; IDs renamed to avoid conflicts with prototype globals.
  -->
  <div class="prov-row">
    <select
      value={providerValue}
      title={$t('agent.providerTitle')}
      on:change={(e) => handleProviderChange(/** @type {HTMLSelectElement} */ (e.target).value)}
    >
      <option value="anthropic">Anthropic</option>
      <option value="openrouter">OpenRouter</option>
    </select>
    <input
      id="agentModel"
      bind:value={modelValue}
      placeholder={$t('agent.modelPlaceholder')}
      title={$t('agent.modelTitle')}
      on:blur={handleModelBlur}
    />
    <input
      id="agentKey"
      type="password"
      bind:value={keyValue}
      placeholder={keyPlaceholder}
      title={$t('agent.keyTitle')}
      on:blur={handleKeyBlur}
    />
  </div>

  <!--
    Chat area — scrollable flex column.
    Prototype: <div id="chat"> (line 471).
  -->
  <div id="chat" bind:this={chatEl}>
    {#each chatMessages as msg (msg)}
      <div class="msg {msg.role}">
        <div class="avatar">{msg.avatar}</div>
        <div class="bubble">
          {#if msg.isLoading}
            <!--
              Loading dots (prototype line 656 `.dots` HTML pattern).
            -->
            <span class="dots"><span></span><span></span><span></span></span>
            {#if msg.content}
              <span style="font-size:11px;color:var(--muted)">{msg.content}</span>
            {/if}
          {:else}
            <!--
              Render content: split into text/code parts inline.
              Prototype: appendMsg innerHTML construction with <pre> + <button class="runbtn"> (lines 1625–1631).
            -->
            {#each contentParts(msg.content) as part}
              {#if part.type === 'text'}
                <span style="white-space:pre-wrap">{part.text}</span>
              {:else}
                <pre>{part.code}</pre>
                <button
                  class="runbtn"
                  on:click={() => {
                    void playWithAutofix(part.code);
                  }}>{$t('agent.runCodeLabel')}</button
                >
              {/if}
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!--
    Quick prompts row.
    Prototype lines 1789–1797 (QUICK array + forEach render).
  -->
  <div class="quick">
    {#each QUICK as [label, prompt]}
      <button on:click={() => handleQuick(prompt)}>{label}</button>
    {/each}
  </div>

  <!--
    Autoplay / autofix toggles.
    Prototype lines 473–476 (autoplay / autofix checkboxes).
  -->
  <div class="toggles">
    <label class:on={autoplay}>
      <input type="checkbox" bind:checked={autoplay} />
      {$t('agent.autoplay')}
    </label>
    <label class:on={autofixEnabled}>
      <input type="checkbox" bind:checked={autofixEnabled} />
      {$t('agent.autofix')}
    </label>
  </div>

  <!--
    Autopilot controls: toggle button + interval selector.
    ai-jam Phase 01 step 01.4 (ADR 0022 D1/D2).
    Button label changes when enabled; intervalCycles input disabled while running.
  -->
  <div class="toggles autopilot-row">
    <button
      class="autopilot-btn"
      class:active={autopilot.enabled}
      on:click={toggleAutopilot}
      title={autopilot.enabled ? $t('agent.autopilot.titleOn') : $t('agent.autopilot.titleOff')}
    >
      {autopilot.enabled ? $t('agent.autopilot.btnOn') : $t('agent.autopilot.btnOff')}
    </button>
    <label class="interval-label">
      {$t('agent.autopilot.cyclesLabel')}:
      <input
        type="number"
        class="interval-input"
        min="2"
        max="32"
        step="2"
        value={autopilot.intervalCycles}
        disabled={autopilot.enabled}
        on:change={(e) =>
          setAutopilot({ intervalCycles: +(/** @type {HTMLInputElement} */ (e.target).value) })}
      />
    </label>
    <span
      class="autopilot-info"
      data-tip={$t('agent.autopilot.infoTooltip')}
      aria-label={$t('agent.autopilot.infoTooltip')}>ⓘ</span
    >
  </div>

  <!--
    Recipe card: last autopilot recipe applied.
    ai-jam Phase 04 step 04.4 (OD-1 Option A: $sessionStore.lastRecipeApplied).
    Only shown when autopilot fires a musicalIntent.recipeId response.
    Dismiss button calls setLastRecipeApplied(null) to clear the field.
  -->
  {#if $sessionStore.lastRecipeApplied}
    <div class="recipe-card">
      <div class="recipe-card-header">
        <span class="recipe-card-title">{$t('agent.recipeCard.title')}</span>
        <button
          class="recipe-card-clear"
          title={$t('agent.recipeCard.clearTitle')}
          on:click={() => setLastRecipeApplied(null)}>×</button
        >
      </div>
      <div class="recipe-card-body">
        <div class="recipe-card-name">{$sessionStore.lastRecipeApplied.recipeName}</div>
        <div class="recipe-card-row">
          <span class="recipe-card-label">{$t('agent.recipeCard.rhythmLabel')}:</span>
          <span>{$sessionStore.lastRecipeApplied.rhythmIds.join(', ')}</span>
        </div>
        <div class="recipe-card-row">
          <span class="recipe-card-label">{$t('agent.recipeCard.harmonyLabel')}:</span>
          <span>{$sessionStore.lastRecipeApplied.harmonyId}</span>
        </div>
        <div class="recipe-card-row">
          <span class="recipe-card-label">{$t('agent.recipeCard.densityLabel')}:</span>
          <span>{$sessionStore.lastRecipeApplied.density}</span>
        </div>
        {#if $sessionStore.lastRecipeApplied.explanation}
          <div class="recipe-card-row recipe-card-explanation">
            <span class="recipe-card-label">{$t('agent.recipeCard.explanationLabel')}:</span>
            <span>{$sessionStore.lastRecipeApplied.explanation}</span>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!--
    Input row: textarea + send button.
    Prototype lines 477–480.
  -->
  <div class="agent-input">
    <textarea
      bind:value={inputText}
      placeholder={$t('agent.inputPlaceholder')}
      on:keydown={handleKeyDown}
    ></textarea>
    <button
      class="sendbtn"
      title={$t('agent.sendTitle')}
      disabled={sending}
      on:click={() => void handleSend(inputText)}
    >
      ↑
    </button>
  </div>
</aside>

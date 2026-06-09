# Phase 06 — Agent with Skills

**Purpose:** Implement the AI agent (Zod schema, provider adapters, send/apply/auto-corrector) and its panel UI so a natural-language request updates rhythm and harmony in the session state.
**Gate:** Phase 05 complete and Pilot-approved (all 14 A-05 IDs covered, tsc/lint/test/build all exit 0, 120 tests passing, main branch clean).
**Expected phase result:** A user can open the agent panel, paste an API key, type "un groove de hip-hop y una progresión menor", and have rhythm + harmony updated in the UI and ready to play.

---

## Step 06.1 — Inventory

PROMPT → Read CLAUDE.md, decisions.md, ORBIFOLD_KICKOFF.md §7, phase-05-handoff.md (completion section), the four stub files in src/agent/ (schema.ts, providers.ts, agent.ts, apply.ts), the prototype agent code (reference/orbifold.html lines 130–177, 456–511, 1509–1815), and the existing src/ui/ components. Produce docs/orbifold-v1/inventories/phase-06-inventory.md. Do not write source code.

Implementation requirements:
- Map each prototype agent feature (SYSTEM_PROMPT, PROVIDERS config, tryApplySkill, send, autofix, quick prompts, context-capture buttons, panel HTML/CSS) to the Svelte target file and step.
- Identify the gap between the pre-resolved decision (Anthropic + OpenRouter only; no OpenAI) and the prototype (3 providers). Note in the known-deviations column.
- Check whether `nowPlaying.source` union in src/state/session.ts already includes `'agent'` (per ORBIFOLD_KICKOFF.md §5). Flag as OD if absent.
- Confirm that `applyRhythmSpec` and `applyHarmonySpec` can call `bjorklund`/`rotate` (src/core/rhythm/euclid.ts), `noteToPc` (src/core/theory/pitch.ts), and `QUAL_INTERVALS` (src/core/theory/chords.ts) — all ported in Phase 01.
- Note that the SYSTEM_PROMPT's tempo line must reference `setcps` (not `setcpm`) per ADR 0005.
- List all open decisions for Pilot review at checkpoint 1.

Validation:
- No source code written.

Expected result:
- docs/orbifold-v1/inventories/phase-06-inventory.md present and complete.

CHECKPOINT → Commit message:
`docs(agent): Phase 06 step 06.1 — phase-06 inventory`

---

## Step 06.2 — Zod schema, apply functions, and unit tests

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-06-inventory.md, ORBIFOLD_KICKOFF.md §7, prototype lines 1669–1730 (SK_* constants, applyRhythmSpec, applyHarmonySpec, clampi), src/core/rhythm/euclid.ts, src/core/theory/pitch.ts, src/core/theory/chords.ts, and src/state/session.ts. Implement src/agent/schema.ts and src/agent/apply.ts. Add tests/schema.test.ts. Prototype parity required: cite source lines and assert behavioral equivalence.

Implementation requirements:
- src/agent/schema.ts:
  - Export `SCHEMA_VERSION = 1` constant.
  - `RhythmLayerSchema`: `sound` ∈ {bd,sd,hh,oh,cp,rim,lt,mt,ht}; each layer has either `steps` (z.array of 0|1, length exactly 16) OR `euclid` ({k: 1..16, n: 2..16, rot: 0..15}) — use z.union with two distinct object shapes (steps-variant vs. euclid-variant). A layer with both or neither must fail validation.
  - `RhythmSpecSchema`: `layers` = z.array(RhythmLayerSchema).min(1).max(6).
  - `HarmonyChordSchema`: `root` string, `quality` ∈ {maj,min,dim,aug}; `gain` optional number 0..1.2.
  - `HarmonySpecSchema`: `root?` string, `mode?` ∈ {major,minor,dorian,phrygian,lydian,mixolydian,locrian,harmonic:minor}, `octave?` integer 2..5, `progression?` z.array(HarmonyChordSchema).min(1).max(8).
  - `AgentOutputSchema`: `rhythm?` RhythmSpecSchema, `harmony?` HarmonySpecSchema, `note?` z.string().max(300); at least one of rhythm or harmony must be present (use .superRefine).
  - Export inferred TypeScript types: `RhythmLayer`, `RhythmSpec`, `HarmonySpec`, `AgentOutput`.
- src/agent/apply.ts:
  - `applyRhythmSpec(spec: RhythmSpec): void` — calls sessionStore.update. For each layer: `sound` validated against SK_SOUNDS (default 'bd'); if euclid variant, call `bjorklund(k,n)` → `rotate(pat, rot)` → map to 16-step grid (prototype lines 1682–1694 exact logic); if steps variant, take first 16 entries and clamp to 0/1 (prototype lines 1695–1700). No DOM/PIXI/Svelte imports — only core engine imports and sessionStore.
  - `applyHarmonySpec(spec: HarmonySpec): void` — calls sessionStore.update. Update `s.harmony.root` via `noteToPc` if provided; `s.harmony.mode` if valid (else unchanged); `s.harmony.octave` clamped 2..5; `s.harmony.progression` rebuilt from spec.progression (prototype lines 1701–1730). Do NOT write `cx`/`cy` to any chord (Register: render hints ephemeral). `gain` defaults to 0.6 if absent.
  - If spec.rhythm === undefined, applyRhythmSpec is not called. Same for harmony. Both functions are pure session updates.
- tests/schema.test.ts (≥12 test cases):
  - AgentOutputSchema.parse: valid rhythm-only, harmony-only, rhythm+harmony+note payloads succeed.
  - AgentOutputSchema.parse: invalid sound name, steps array length ≠ 16, k out of range (0, 17), n out of range (1, 17), rot > n-1, invalid mode string, invalid quality string, empty layers array, neither rhythm nor harmony present — all fail.
  - applyRhythmSpec (steps variant): updates sessionStore.rhythm.layers with correct step pattern (verify via get(sessionStore)).
  - applyRhythmSpec (euclid variant): E(3,8,0) produces the correct 16-step pattern via bjorklund/rotate (compare against tests/euclid.test.ts known values).
  - applyHarmonySpec: root 'C', mode 'minor', progression [{root:'C',quality:'min'},{root:'Ab',quality:'maj'}] updates sessionStore.harmony correctly; no cx/cy fields on any chord.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass, total ≥ 132 (120 prior + ≥12 new).

Expected result:
- src/agent/schema.ts fully implemented with all schemas and types exported.
- src/agent/apply.ts fully implemented with applyRhythmSpec and applyHarmonySpec.
- tests/schema.test.ts with ≥12 cases, all green.

CHECKPOINT → Commit message:
`feat(agent): Phase 06 step 06.2 — Zod schema, apply functions, and unit tests`

---

## Step 06.3 — providers.ts and agent.ts (network layer)

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-06-inventory.md, prototype lines 1582–1815 (SYSTEM_PROMPT, PROVIDERS, send, tryApplySkill, autofix, quick prompt context), src/agent/schema.ts and src/agent/apply.ts (just implemented), src/audio/strudel.ts (runNow, queueForNextCycle exports), src/state/session.ts (sessionStore, getters), and src/core/codegen/strudel.ts (buildSession, rhythmToStrudel, melodyLine). Implement src/agent/providers.ts and src/agent/agent.ts. No DOM imports in either file.

Implementation requirements:
- src/agent/providers.ts:
  - Export `PROVIDERS` config object with exactly two entries: `'anthropic'` and `'openrouter'` (no openai — Pilot decision, prototype deviation).
  - Each entry: `label: string`, `url: string`, `defaultModel: string`, `keyHint: string`, `headers(key: string): Record<string,string>`, `body(model: string, system: string, msgs: ChatMessage[]): unknown`, `parse(data: unknown): string`.
  - Anthropic entry: model `'claude-sonnet-4-6'`, url `https://api.anthropic.com/v1/messages`, headers include `anthropic-dangerous-direct-browser-access: 'true'` and `anthropic-version: '2023-06-01'` (required for browser-direct calls), body uses top-level `system:` + `messages:` format, parse reads `data.content[].text`.
  - OpenRouter entry: model `'openrouter/auto'`, url `https://openrouter.ai/api/v1/chat/completions`, headers include `HTTP-Referer` and `X-Title: 'Orbifold'`, OpenAI-compatible body (`messages:[{role:'system',content:system},…msgs]`), parse reads `data.choices[0].message.content`.
  - Export `ProviderKey = 'anthropic' | 'openrouter'` type and `ChatMessage = {role: 'user'|'assistant'; content: string}` type.
  - Export `loadApiKey(provider: ProviderKey): string` and `saveApiKey(provider: ProviderKey, key: string): void` — use localStorage keys `orbifold.apiKey.anthropic` and `orbifold.apiKey.openrouter`.
- src/agent/agent.ts:
  - Export module-level mutable state (ephemeral; not persisted — ADR 0009 pattern): `chatHistory: ChatMessage[]`, `agentProvider: ProviderKey` (default `'anthropic'`), `agentModel: string` (default from PROVIDERS.anthropic.defaultModel).
  - Export `setProvider(p: ProviderKey): void` and `setModel(m: string): void` (update module-level vars).
  - `SYSTEM_PROMPT` constant (port verbatim from prototype lines 1509–1585): skills JSON mode description + code mode fallback + Strudel knowledge. Update the tempo constraint line to: "NO uses setcps/setcpm/.fast/.slow para el tempo: la app fija el tempo vía setcps según el BPM. 1 ciclo = 1 compás 4/4." (per ADR 0005 — `setcpm` does not exist in the pinned version).
  - Export `tryParseSkill(txt: string): AgentOutput | null` — extracts JSON from a ` ```json … ``` ` fence or from the outermost `{…}` span (prototype tryApplySkill logic); uses `AgentOutputSchema.safeParse()`; returns the valid parsed object or null.
  - Export `extractLastStrudelCode(txt: string): string | null` — finds the last ` ```strudel/js/javascript … ``` ` block (prototype extractLastCode logic).
  - Export `AgentSendContext = { includeRhythmCtx: boolean; includeHarmonyCtx: boolean }`.
  - Export `AgentSendResult` union: `{ type: 'skill'; code: string; summary: string; note?: string } | { type: 'code'; code: string } | { type: 'text'; text: string } | { type: 'error'; message: string }`.
  - Export `send(text: string, ctx: AgentSendContext): Promise<AgentSendResult>`:
    - Reads current session state from sessionStore to build context addendum (bpm, current code if playing, rhythm description if ctx.includeRhythmCtx, harmony description if ctx.includeHarmonyCtx — derive descriptions from session state, not cached snapshots).
    - Appends user message + context to chatHistory, calls provider fetch.
    - Tries `tryParseSkill` on response. If skill: calls `applyRhythmSpec`/`applyHarmonySpec` (via apply.ts), builds result code from updated session state (buildSession if both, rhythmToStrudel if rhythm-only, melodyLine if harmony-only). Returns `{ type: 'skill', code, summary, note }`.
    - If no skill: tries `extractLastStrudelCode`. If found: returns `{ type: 'code', code }`. Else: returns `{ type: 'text', text }`.
    - On fetch/parse error: returns `{ type: 'error', message }`.
    - Missing API key → returns `{ type: 'error', message: 'API key ausente' }` (no alert/DOM).
  - Export `requestAutofix(badCode: string, errorMsg: string): Promise<string | null>` — sends fix prompt (prototype requestAutofix logic), returns corrected code or null. Uses same chatHistory.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count unchanged from step 06.2).

Expected result:
- src/agent/providers.ts with two providers and localStorage key helpers.
- src/agent/agent.ts with send, autofix, tryParseSkill, module state; no DOM imports.

CHECKPOINT → Commit message:
`feat(agent): Phase 06 step 06.3 — providers and agent send/apply/autofix`

---

## Step 06.4 — AgentPanel.svelte, CSS tokens, and context capture

PROMPT → Read CLAUDE.md, decisions.md, prototype lines 130–177 (agent CSS), 456–511 (agent HTML), 1799–1825 (quick prompts, panel toggle, context button handlers), src/agent/agent.ts, src/agent/providers.ts, src/audio/strudel.ts (runNow, queueForNextCycle), src/state/session.ts (sessionStore), src/app/App.svelte, src/app/app.css, src/ui/HarmonyControls.svelte, src/ui/RhythmControls.svelte, and the existing Svelte component conventions. Create src/ui/AgentPanel.svelte, create src/state/agentCtx.ts, append agent CSS to app.css, add context buttons to HarmonyControls and RhythmControls, and wire AgentPanel into App.svelte.

Implementation requirements:
- src/state/agentCtx.ts — export a Svelte `writable<{ includeRhythm: boolean; includeHarmony: boolean }>` store (initial `{false, false}`). Ephemeral (not in sessionStore, not persisted — ADR 0008/0009 pattern). AGPL-3.0 header.
- src/app/app.css — append agent CSS ported from prototype lines 130–177: `#agentTab`, `#agent`, `#agent.open` (slide-in from right, translate from right edge), `.agent-head`, `.a-glyph`, `.a-close`, `.prov-row`, `#apiKey` / `#model` focus styles, `.chat`, `.msg`, `.msg.user`, `.msg.assistant`, `.avatar`, `.bubble`, `pre` in bubble, `.runbtn`, `.dots` (animated), `.agent-input`, `.agent-input textarea`, `.quick`, `.quick button`, plus the responsive override (prototype line 347: `#agent{ width:calc(100% - 24px) }` at ≤600px).
- src/ui/AgentPanel.svelte — AGPL-3.0 header on first comment line:
  - `<div id="agentTab" class="glass">꩜ AGENTE IA</div>` triggers `open = true`.
  - `<aside id="agent" class:open>`: agent-head (꩜ glyph + "Agente" label + ✕ close button), provider row (select[anthropic/openrouter] + model input + password apiKey input), quick prompts row (5 buttons: prototype QUICK array), chat area (`#chat`), input row (textarea + enviar button + autoplay checkbox + autofix checkbox labels).
  - On provider change: call `setProvider(val)`, update `modelValue` to `PROVIDERS[val].defaultModel`, update `keyPlaceholder` to `PROVIDERS[val].keyHint`, call `saveApiKey` if current key non-empty.
  - API key: load on mount via `loadApiKey(agentProvider)`. Save on blur via `saveApiKey`.
  - Chat state: `chatMessages: {role, content}[]` as local Svelte reactive array (mirrors chatHistory). On send: push user message locally, show `.dots` loading bubble, await `send(text, ctx)`, remove loader, push assistant response. On error: push warning.
  - `ctx` derives from `$agentCtx`: `{ includeRhythmCtx: $agentCtx.includeRhythm, includeHarmonyCtx: $agentCtx.includeHarmony }`. After sending, reset both flags to false.
  - Render assistant messages: parse for ` ```strudel/js/javascript ``` ` blocks inline (same as prototype appendMsg). Render `<pre>` + `<button class="runbtn">▶ tocar esto</button>` for each code block.
  - `playWithAutofix(code: string)`: calls `runNow` or `queueForNextCycle` based on `$sessionStore.nowPlaying.source !== null`. On error + autofix enabled + retries < 2: call `requestAutofix`. On success: call `sessionStore.update(s => ({...s, nowPlaying:{label:'Código del agente',source:'agent'}}))`.
  - If `send()` returns `{ type: 'skill' }`: show summary text + strudel code block in chat; if autoplay enabled, call `playWithAutofix(code)`. Also reset `agentCtx` both flags.
- src/ui/HarmonyControls.svelte — import `agentCtx` from `src/state/agentCtx.ts`; add `<button class="tbtn" title="Enviar la clave + progresión al agente como marco armónico" on:click={() => agentCtx.update(c => ({...c, includeHarmony: true}))}>📨 marco</button>`. Show active style when `$agentCtx.includeHarmony` is true (e.g., `class:active={$agentCtx.includeHarmony}`).
- src/ui/RhythmControls.svelte — same pattern: `📨 base` button sets `agentCtx.update(c => ({...c, includeRhythm: true}))`.
- src/app/App.svelte — add `import AgentPanel from '../ui/AgentPanel.svelte'` and `<AgentPanel />` after `<CompositionDrawer />`.
- Confirm `nowPlaying.source` union in session.ts includes `'agent'` (add it if the inventory step 06.1 found it absent).

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count unchanged from step 06.2).

Expected result:
- Agent panel tab visible on right edge; slide-in panel with full UI.
- Context capture buttons in harmony and rhythm toolbars.
- App.svelte mounts AgentPanel after CompositionDrawer.

CHECKPOINT → Commit message:
`feat(ui): Phase 06 step 06.4 — AgentPanel.svelte and context capture buttons`

---

## Step 06.5 — Operability verification

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/phases/phase-06.md (all acceptance IDs A-06-01 through A-06-12), and docs/orbifold-v1/handoffs/phase-06-handoff.md (steps 06.1–06.4 entries). Run all gate commands and record exact output. Execute the Pilot 10-point smoke test in `pnpm dev`. Append this step's entry and the Phase 06 Completion section to docs/orbifold-v1/handoffs/phase-06-handoff.md. Do not write source code.

Implementation requirements:
- Run and record exact output: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Execute the following 10-point smoke test in `pnpm dev` (the Pilot performs this with a real API key):
  1. Agent tab `꩜ AGENTE IA` visible at right edge; click opens panel with slide-in animation; ✕ closes it.
  2. Provider selector shows "Anthropic" and "OpenRouter"; switching updates model and key-hint placeholder.
  3. Paste Anthropic API key; reload page; verify key is pre-filled from localStorage.
  4. Send "un groove de hip-hop y una progresión menor" with Anthropic provider; response updates rhythm layers AND harmony progression in the UI.
  5. After step 4: rhythm view shows updated groove (at least bd/hh/sd layers visible); harmony Tonnetz shows the new progression.
  6. The Transport shows `nowPlaying.source = 'agent'` label after the agent-generated code plays.
  7. Click 🥁 Groove quick prompt; it pre-fills and sends; a valid response is received.
  8. Click `📨 base` (rhythm context) and `📨 marco` (harmony context); button shows active state; send a new message; inspect that the message includes the rhythm/harmony context block.
  9. Force a Strudel syntax error (paste broken code in code drawer and run; the auto-corrector fires from a ▶ tocar esto button on an intentionally bad code block); verify "🔧 corrigiendo…" message and retry attempt.
  10. Open composition drawer; verify existing blocks and tracks from Phase 05 are intact; all A-05 transport buttons work.
- Record each item as CONFIRMED or FAILED with a note.

Validation:
- All 4 gate commands exit 0.
- All 10 smoke-test items CONFIRMED.
- Test count ≥ 132.

Expected result:
- All 12 A-06 acceptance IDs covered in the Acceptance Coverage Table.
- Phase 06 Completion section appended to handoff.

CHECKPOINT → Commit message:
`feat(agent): Phase 06 step 06.5 — operability verification and phase-06 completion handoff`

---

## Phase Acceptance

- **A-06-01** — The `꩜ AGENTE IA` tab is visible on the right edge; clicking opens the panel with slide-in animation; ✕ closes it.
  - Validation method: `live-system`
- **A-06-02** — Provider selector shows Anthropic and OpenRouter; switching updates model default and key hint; API key persists per provider in localStorage across page reloads.
  - Validation method: `live-system`
- **A-06-03** — Sending "un groove de hip-hop y una progresión menor" produces a response that updates rhythm layers and harmony progression in the session state and is immediately playable.
  - Validation method: `live-system`
- **A-06-04** — `AgentOutputSchema` accepts valid rhythm-only, harmony-only, and combined payloads; rejects invalid sound names, wrong steps length, k/n out of range, invalid mode, and invalid quality.
  - Validation method: `unit`
- **A-06-05** — `applyRhythmSpec` with a steps-variant layer updates sessionStore.rhythm.layers with the correct 16-step pattern; with a Euclidean layer it calls bjorklund/rotate and produces the expected steps.
  - Validation method: `unit`
- **A-06-06** — `applyHarmonySpec` updates sessionStore.harmony root, mode, octave, and progression correctly; no cx/cy fields are written to any chord.
  - Validation method: `unit`
- **A-06-07** — Agent-generated code plays via runNow; `nowPlaying.source` is set to `'agent'`; Transport label reflects this.
  - Validation method: `live-system`
- **A-06-08** — Auto-corrector: on Strudel execution error with autofix enabled, the agent retries up to 2 times; "🔧 corrigiendo…" feedback appears during each retry.
  - Validation method: `live-system`
- **A-06-09** — Quick prompts (🥁 Groove, 🎹 Progresión, 🎶 Ritmo + armonía, 🌀 Euclidiano, 🔁 Variación) pre-fill and send the preset message.
  - Validation method: `live-system`
- **A-06-10** — `📨 base` and `📨 marco` context capture buttons are visible in rhythm and harmony toolbars respectively; when activated, the next agent message includes the current rhythm/harmony description as context.
  - Validation method: `live-system`
- **A-06-11** — All A-05 behaviors intact (composition drawer, Tonnetz, transport, rhythm/harmony controls).
  - Validation method: `unit` + `live-system`
- **A-06-12** — `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥132 tests), and `pnpm build` all exit 0.
  - Validation method: `proxy:static-analysis` + `unit`

## Partial coverage from prior phase

No prior partials to address. All 14 A-05 IDs were fully covered at Phase 05 completion.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Agent API key localStorage naming** — Trigger: step 06.3. Keys `orbifold.apiKey.anthropic` / `orbifold.apiKey.openrouter` must not collide with Phase 07 session storage keys. If the Dev proposes a different namespace or a single-key approach, surface for ADR before committing.
- **Browser-direct AI provider calls security posture** — Trigger: step 06.3. Anthropic requires `anthropic-dangerous-direct-browser-access: true`; OpenRouter is CORS-permissive. This is consistent with ORBIFOLD_KICKOFF.md §9 (no proxy in this phase). File an ADR only if the Pilot decides to change the approach (e.g., adding a serverless proxy) before step 06.3 is approved.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-06-handoff.md`. See `handoff-template.md`.

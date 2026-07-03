<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 — Song-Import: Import UI + `applyImportSession` + LLM Chart Sourcing

**Purpose:** Make song-import user-facing and merge-worthy. Phase 01 built the data-model vocabulary (`pow`, `Block.label`, schema v7) and Phase 02 built the pure translator (`importSession`). Phase 03 wires them into the running app: `applyImportSession` loads the translator's output into the live store, and an import UI accepts a song name (or YouTube link) and calls the user's configured LLM provider to produce the structured `ImportSessionInput`, which then flows through `importSession` → `applyImportSession`. After this phase the full Pipeline B journey — name/link → LLM chart → Orbifold session — is demonstrable in the browser, making Phases 01–03 ready to merge to `main`.

**Gate:** `song-import` Phase 02 complete (branch `song-import/phase-01` carrying Phase 01 and Phase 02 commits; 2129 tests; `pnpm test`, `tsc --noEmit`, `pnpm lint`, `pnpm build` all pass clean). Open decisions OD-4 (chart-sourcing mechanism) and OD-5 (YouTube link handling) must be resolved by the Pilot before step 03.2 begins.

**Expected phase result:** (1) `applyImportSession(saved: SavedSession): void` in `src/agent/apply.ts` — a store-coupled wrapper that loads the `importSession` output into the live store, fixing the `label` carry-through gap in `applyLoadedSession`. (2) A new `ImportPanel.svelte` component (or equivalent small surface in `AgentPanel.svelte`) exposing a "name or link" input field, a submit button, and status feedback; on submit it calls the user's configured LLM via the existing `providers.ts`/`agent.ts` pattern to produce a structured `ImportSessionInput`, runs `importSession`, and calls `applyImportSession`. (3) A documented `IMPORT_SYSTEM_PROMPT` (the prompt that instructs the LLM to return a structured chart JSON). (4) Manual parity verification: importing "ONE" (Metallica) produces labelled composition blocks and playable power-chord harmony matching the Phase 02 golden fixture. (5) All quality gates pass; total test count increases; Phases 01–03 are declared merge-worthy to `main`.

> **Merge note:** Phase 03 is the point at which song-import becomes user-facing. Phase Acceptance for this phase covers the entire song-import initiative (Phases 01–03). On Pilot approval, the `song-import/phase-01` branch (carrying Phases 01–03) is ready to merge to `main`. The Pilot decides the exact merge timing.

---

## Architecture constraints for every step

**`applyImportSession` follows the `apply*` pattern:** The function lives in `src/agent/apply.ts` (a new export at the bottom of the file). It accepts a `SavedSession` (the output of `importSession`) and calls `applyLoadedSession` from `src/state/session.ts` to load it into the store. It must also fix the `Block.label` carry-through gap in `applyLoadedSession` (see step 03.1 inventory — this is the only existing-file modification needed in `apply.ts`'s collaborator). `applyImportSession` must NOT be a pure function — it is explicitly store-coupled (that is its purpose). It must NOT re-implement session loading logic; it delegates to `applyLoadedSession`.

**`Block.label` carry-through fix is required:** `applyLoadedSession` in `src/state/session.ts` (line 2005–2011) currently drops `b.label` when building `newBlocks`. This means importing a session with labels (as all `importSession` outputs have) will silently lose the section markers. This must be fixed as part of step 03.2 so imported blocks display their labels in the Composition timeline. The fix is additive and non-breaking (pre-Phase-01 saved sessions have no `label` field — the fix is `...(b.label !== undefined ? { label: b.label } : {})`).

**LLM call reuses `providers.ts`/`agent.ts` pattern:** The import UI sends a one-shot fetch to `PROVIDERS[agentProvider].url` with `PROVIDERS[agentProvider].headers(key)` and `PROVIDERS[agentProvider].body(model, IMPORT_SYSTEM_PROMPT, [{ role: 'user', content: songQuery }], maxTokens)`. It reads the current provider/model/key from the same module-level state (`agentProvider`, `agentModel`, `loadApiKey`) used by `send()` and `sendEvolution()`. It must NOT invent a new HTTP client or a new key-storage pattern. No new `localStorage` keys. No backend. The key lives in the user's localStorage under the existing `orbifold.apiKey.<provider>` namespace.

**`IMPORT_SYSTEM_PROMPT` is a constant in a new file `src/agent/import-prompt.ts`:** It contains the structured chart format instruction, the `ImportSessionInputSchema` shape (as JSON comment in the prompt), and a note that the model must return a single ```json block. It does NOT share file with `SYSTEM_PROMPT` or `SYSTEM_PROMPT_EVOLUTION` (those are in `agent.ts` — the import prompt is a separate concern). The function that fires the LLM call lives in `src/agent/import-agent.ts` or inline in the panel component — the Dev decides based on the inventory, but it must have no side effects beyond returning a result type (matching the `AgentSendResult` style).

**Validation + retry on invalid JSON:** After receiving the LLM response, the import flow must parse the JSON from the text (using the same fence → brace fallback logic as `tryParseSkill`) and validate it with `ImportSessionInputSchema.safeParse`. If the parse fails, the UI shows a human-readable error: "El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción." No automatic retry (the user retries manually).

**Handling a song the model does not know:** If the LLM returns `success: false` from `ImportSessionInputSchema.safeParse` (e.g., it describes an unknown song, returns narrative text, or hallucinates a malformed schema), the UI surfaces the error message and does NOT call `importSession`. The error is always shown in the import panel, never silently swallowed.

**OD-4 governs chart sourcing:** Resolved by the Pilot before step 03.2. Recommendation is Option A (LLM-native — see Open Decisions below). If Option A is confirmed, the import UI fires a single `fetch` to the user's provider with `IMPORT_SYSTEM_PROMPT` + the song query.

**OD-5 governs YouTube link handling:** Resolved by the Pilot before step 03.2. Recommendation is name-only for Phase 03 (see Open Decisions below). If the Pilot chooses YouTube oEmbed, the inventory must document the fetch (`youtube.com/oembed?url=...&format=json`, no API key) and the error path (private/unavailable video).

**Import REPLACES the current session (OD-6 resolution required):** The import flow calls `applyImportSession`, which calls `applyLoadedSession`, which fully replaces the current session state (harmony, rhythm, composition). This is the same behavior as loading a saved session from the Persistence Panel. The UI must clearly warn the user: "Esta acción reemplazará tu sesión actual." The Pilot must confirm this is the desired behavior (not a merge/append). This is OD-6 (raised below).

**Import UI placement:** The import field lives in `AgentPanel.svelte` as a new collapsible subsection ("Importar canción"), OR in a new small `ImportPanel.svelte` mounted alongside the existing panels. The inventory step determines the best placement based on reading the existing panels. In either case: it is only visible when the agent provider is configured (key present), or it shows a "configura tu proveedor de IA primero" placeholder. The Dev determines placement in the inventory; the Pilot confirms at the inventory checkpoint.

**AGPL-3.0 header:** Every new file must open with `// SPDX-License-Identifier: AGPL-3.0-only`.

**Guardrails:**
- Audio only after a user gesture — `applyImportSession` loads the session but does NOT auto-play. The user presses Play.
- Tempo via `setcps` (never `.fast`/`.slow`) — `importSession` already sets `bpm` correctly; the store's `setBpm` function is not called by `applyImportSession` (BPM flows through `applyLoadedSession` → `sessionStore.update`).
- The agent may only generate what the UI supports — the `IMPORT_SYSTEM_PROMPT` must restrict quality values to `{maj, min, dim, aug, pow}` and mode values to the 8 SK_MODES.
- Live changes re-queue to the next cycle — no behavior change here; `applyImportSession` does not touch the audio engine.
- No keys/API in the repo; per-user token in localStorage only.
- Pinned deps — no new dependencies. `zod` is already present.

**Parity note:** This phase is net-new UI + agent glue (no prototype port). The parity criterion is: the imported Session round-trips correctly through the existing persistence/build/play paths and the composition timeline displays labeled blocks matching the Phase 02 golden fixture. Manual verification with the running app satisfies this criterion.

**Decisions Register (`docs/song-import/decisions.md`):** Required reading every invocation. Only the Pilot writes.

---

## Open Decisions (Pilot resolves before step 03.2)

### OD-4 — Chart-sourcing mechanism for the MVP

**Option A — LLM-native (recommended):** The import field triggers a one-shot call to the user's configured agent provider (reusing `providers.ts`/`agent.ts` module-level state) with `IMPORT_SYSTEM_PROMPT` + the song query as the user message. The model returns a ```json block containing the `ImportSessionInput` JSON. The client parses it with `ImportSessionInputSchema.safeParse`. If invalid, the UI shows a human-readable error and stops. No retry loop.

What Option A entails concretely: (1) A new `IMPORT_SYSTEM_PROMPT` constant (in `src/agent/import-prompt.ts`) instructing the model to return a structured chart with `songTitle`, `artist`, `bpm`, `key`, `mode`, and `sections[]` in the exact schema shape. (2) A `sendImport(query: string): Promise<ImportSendResult>` function (in `src/agent/import-agent.ts` or inline in the panel) that calls the provider, extracts JSON from the response (fence → brace fallback), and validates with `ImportSessionInputSchema.safeParse`. (3) The panel receives an `ImportSendResult` (similar to `AgentSendResult`) and either calls `importSession` + `applyImportSession` on success, or shows the error string on failure. (4) The prompt must handle the "song the model doesn't know" case: the model should say so in plain text rather than hallucinate a chart, and the safeParse failure will surface it.

**Option B — Scraping (not recommended for MVP):** Fetch a human tab from Ultimate Guitar or Chordify, parse the chord chart into a structured object, and pass it to `importSession`. This would require: (a) a CORS proxy or a server-side function (the app is static — a browser fetch to `ultimateguitar.com` will be CORS-blocked); (b) tab-text parsing logic (brittle, format-dependent); (c) legal/ToS considerations. Option B defers the hard problem (CORS, scraping ToS) and was explicitly framed as a "later phase" concern in the Pipeline B decision. It is not viable without a backend.

**Recommendation: Option A.** It leverages the exact Option-A contract already built in Phase 02 (`ImportSessionInputSchema`), requires no new deps, no backend, and no CORS workaround. The model's musical knowledge is sufficient for well-known songs. For obscure songs the error path is clear. Scraping stays a later phase (Phase 04 or a separate initiative).

### OD-5 — YouTube link handling in Phase 03

**Option A — Name-only for Phase 03 (recommended):** The import field accepts only a song name + optional artist (e.g., "ONE by Metallica") as a free-text query. YouTube link recognition is deferred to Phase 04. The UX is simple: one text field, one button. Error path: if the input looks like a URL the UI suggests "Introduce el nombre de la canción, no un link."

**Option B — YouTube oEmbed in Phase 03:** The field accepts a name OR a YouTube link. If the input matches `youtube.com/watch?v=` or `youtu.be/`, the app sends a server-side-free fetch to `https://www.youtube.com/oembed?url=<encoded>&format=json` (no API key, returns `{ title, author_name, ... }`) to resolve the video title and channel name. The resolved title/artist is then used as the LLM query. Error paths: network failure, private video (404), non-YouTube URL. This adds a second async step (oEmbed fetch before the LLM call), a URL detector regex, and at least 3 new error states.

**Recommendation: Option A (name-only).** The oEmbed step is a 5-line fetch but adds 3 new error paths and test surface. The import UI is already complex enough for a first ship (LLM call + safeParse + apply + replace-session warning). YouTube link resolution is a clean Phase 04 add-on with no architecture consequences (the field contract is just a string — a future phase can detect URLs before calling the LLM). Shipping name-only first also lets the Pilot validate the LLM-native path before adding the oEmbed layer.

### OD-6 — Import replaces vs merges the current session

**The question:** When `applyImportSession` is called, should it (A) fully replace the current session (blocks, tracks, harmony, rhythm, BPM) — the same as loading a saved session — or (B) merge the imported blocks into the existing composition (append-only, preserving existing tracks)?

**Implication of Option A (replace):** Simple implementation — just calls `applyLoadedSession`. The user's current session is gone. The UI must warn: "Esta acción reemplazará tu sesión actual." UX precedent: the Persistence Panel's "cargar" button does the same.

**Implication of Option B (merge):** The imported section-blocks are appended to the existing composition as new blocks + a new track. The user's existing groove/harmony is unchanged; only the composition timeline grows. More useful for jamming (import a song's chord structure, keep your groove). But more complex: `applyImportSession` can no longer just delegate to `applyLoadedSession` — it must call `addBlock`/`addBlockAsNewTrack` in a loop (or a new `mergeBlocks` action). The rhythm and BPM from the imported session would be applied (overwriting the current groove), which partially defeats the "keep your groove" idea, OR they would be ignored (then the function is not really loading the session).

**Recommendation: Surface to Pilot. No default recommendation.** Both options are defensible. Option A is faster to ship and has a clear UX precedent. Option B is more musically useful for the "import and jam" workflow but requires a new action in `session.ts` and a clearer spec about what "merge" means for rhythm/BPM. The Pilot must decide. If Option B is chosen, step 03.2 needs an explicit `mergeImportedSession` action in `session.ts` in scope.

---

## Step 03.1 — Inventory

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-03.md` (this file) before doing anything else. Then perform a read-only inventory of the files listed below. Produce `docs/song-import/inventories/phase-03-inventory.md` containing sections (a) through (f) as specified. STOP for Pilot review — OD-4, OD-5, and OD-6 must be resolved before step 03.2 begins.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-03.md` (this file)
5. `src/agent/apply.ts` (full — the `applyLoadedSession`-delegation pattern; all existing `apply*` exports)
6. `src/state/session.ts` lines 1995–2115 (the `applyLoadedSession` function — confirm the `label` carry-through gap at lines 2005–2011)
7. `src/agent/import-session.ts` (full — the `importSession` function and its `SavedSession` output contract)
8. `src/agent/agent.ts` lines 310–525 (the `sendEvolution` function — the fetch pattern to reuse; and `tryParseSkill` lines 574–602 — the JSON extraction logic to reuse in the import call)
9. `src/agent/providers.ts` (full — `PROVIDERS`, `loadApiKey`, `agentProvider`, `agentModel`)
10. `src/ui/AgentPanel.svelte` lines 1–100 (panel structure, provider/model/key state, open/close mechanism — to determine where the import field fits)
11. `src/ui/PersistencePanel.svelte` lines 1–110 (the existing session-load pattern — precedent for replace-on-load UX)
12. `src/ui/CompositionDrawer.svelte` lines 1–80 (to understand the composition view — where imported blocks appear)

**What to produce:**

`docs/song-import/inventories/phase-03-inventory.md` containing:

- **(a) `applyLoadedSession` gap audit** — Reproduce lines 2005–2011 of `src/state/session.ts` verbatim. Confirm that `b.label` is not carried through. State the exact one-line fix (`...(b.label !== undefined ? { label: b.label } : {})`). Confirm no other fields are missing (compare `SavedBlock` fields in `SavedBlockSchema` vs what `applyLoadedSession` copies). Confirm the fix is non-breaking for pre-Phase-01 sessions (which have no `label` field — the conditional spread handles this).

- **(b) `applyImportSession` design** — State the exact function signature and body (pseudocode, not real code). Confirm it delegates entirely to `applyLoadedSession`. Confirm it lives in `src/agent/apply.ts`. List any type imports it needs (e.g., `SavedSession` from `persistence.ts`). Confirm it does NOT call `setBpm`, `setHarmonyKey`, or any other store action — `applyLoadedSession` handles all store updates atomically.

- **(c) LLM call pattern audit** — Trace how `sendEvolution` in `agent.ts` calls the provider (lines 426–442): `fetch(provider.url, { method: 'POST', headers: provider.headers(key), body: JSON.stringify(provider.body(model, SYSTEM_PROMPT_EVOLUTION, [...], 2000)) })`. Confirm that the import call can follow exactly this pattern with `IMPORT_SYSTEM_PROMPT` as the system prompt and the song query as a single user message (no chatHistory involvement — one-shot call, same as `sendEvolution`). Document the `max_tokens` recommendation for the import call (the response is a single JSON chart — 300–500 tokens should suffice; recommend 600 as a safe ceiling with headroom). Confirm `loadApiKey(agentProvider)` and `PROVIDERS[agentProvider]` are the correct reads.

- **(d) JSON extraction and validation path** — Confirm that `tryParseSkill`'s fence → brace extraction logic (lines 576–587 of `agent.ts`) can be copied as-is (or extracted to a shared helper) for use in the import call. Document the two-step path: (1) extract JSON string from response text; (2) `ImportSessionInputSchema.safeParse(JSON.parse(jsonStr))`. Confirm `ImportSessionInputSchema` is exported from `src/agent/import-session.ts`. State the error surfacing plan: if either step fails, return `{ type: 'error', message: '...' }` (no auto-retry).

- **(e) UI placement decision** — Read `AgentPanel.svelte` lines 1–100. Determine whether the import field should live: (i) as a new collapsible sub-section at the top of `AgentPanel.svelte` (before the chat log), or (ii) in a new standalone `src/ui/ImportPanel.svelte` component mounted in `src/app/App.svelte`. Document the tradeoffs. State a recommendation with a one-sentence rationale. Note that the field needs access to `agentProvider`, `agentModel`, `loadApiKey` — these are already available in `AgentPanel.svelte`'s script block, making (i) attractive for minimal new wiring.

- **(f) Exhaustiveness / dependency audit** — List every file to CREATE and every file to MODIFY in steps 03.2 and 03.3. Confirm that no new npm dependencies are needed. Confirm `zod` is already in `package.json` (already used by `import-session.ts`). List any new `src/agent/` files needed (e.g., `import-prompt.ts`, `import-agent.ts`). Confirm `tests/song-import/` already exists (created in Phase 02 step 02.2). Document any ADR triggers that step 03.2 should fire.

**Acceptance criteria:**

- A-03-01: `docs/song-import/inventories/phase-03-inventory.md` exists with all six sections (a–f).
- A-03-02: Section (a) reproduces the `applyLoadedSession` gap verbatim and states the fix.
- A-03-03: Section (c) confirms the fetch pattern and `max_tokens` recommendation for the import call.
- A-03-04: Section (e) states a UI placement recommendation with one-sentence rationale.
- A-03-05: The inventory was produced by reading only — no source files were modified.

CHECKPOINT → Commit message:
`docs(inventory): Phase 03 step 03.1 — read-only inventory, OD-4/OD-5/OD-6 open`

---

## Step 03.2 — `applyImportSession` + `label` fix + `sendImport` + `IMPORT_SYSTEM_PROMPT`

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-03.md`, and `docs/song-import/inventories/phase-03-inventory.md` before editing. The Pilot has resolved OD-4, OD-5, and OD-6. Apply the resolutions exactly. Implement the store-coupling half (`applyImportSession` in `apply.ts`, `Block.label` fix in `session.ts`) and the agent-call half (`IMPORT_SYSTEM_PROMPT` + `sendImport`). Write unit tests for `applyImportSession`'s composition of `importSession` + store load. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-03.md` (this file)
5. `docs/song-import/inventories/phase-03-inventory.md` (full — especially sections a, b, c, d, f)
6. `src/agent/apply.ts` (full — to add `applyImportSession` at the bottom)
7. `src/state/session.ts` lines 1995–2115 (to apply the `label` carry-through fix)
8. `src/agent/import-session.ts` (full — the `importSession` function and `SavedSession` contract)
9. `src/agent/agent.ts` lines 310–525 (fetch pattern + JSON extraction for `sendImport`)
10. `src/agent/providers.ts` (full)
11. Every file listed in inventory section (f)

**What to produce:**

**Fix to `src/state/session.ts`** — In `applyLoadedSession` (lines 2005–2011), add `Block.label` carry-through:

```typescript
const newBlocks = saved.composition.blocks.map((b) => ({
  id: 'b' + _blkSeq++,
  name: b.name,
  type: b.type,
  code: b.code,
  bars: b.bars,
  ...(b.label !== undefined ? { label: b.label } : {}),
}));
```

This is the only change to `src/state/session.ts`. It is additive and non-breaking.

**`applyImportSession` in `src/agent/apply.ts`** — New export at the bottom of the file:

```typescript
// ── applyImportSession ─────────────────────────────────────────────────────

/**
 * Load an importSession output into the live session store.
 *
 * Accepts the SavedSession produced by importSession() and delegates to
 * applyLoadedSession() from src/state/session.ts, which atomically replaces
 * the current session (harmony, rhythm, BPM, composition blocks + tracks).
 *
 * This is the store-coupled half of the importSession pipeline. The pure
 * translation half (chart → SavedSession) lives in import-session.ts.
 *
 * Call sequence (song-import Phase 03):
 *   importSession(input)       → SavedSession (pure, no store)
 *   applyImportSession(saved)  → void (store update, no audio)
 *
 * Audio is NOT started — the user presses Play after import. Per guardrails:
 * audio starts only after a user gesture.
 *
 * @param saved - The SavedSession produced by importSession().
 */
export function applyImportSession(saved: SavedSession): void {
  applyLoadedSession(saved);
}
```

Note: `applyLoadedSession` is already imported in the `apply.ts` scope? Check the inventory — if `applyLoadedSession` is not already imported from `session.ts`, add the import. `SavedSession` is imported from `persistence.ts`.

**`src/agent/import-prompt.ts`** — New file:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — IMPORT_SYSTEM_PROMPT: system prompt for one-shot LLM chart generation.
// song-import Phase 03. No DOM / Svelte / store imports — pure constant.
```

Contains `export const IMPORT_SYSTEM_PROMPT: string` — a Spanish-language prompt instructing the model to:

1. Return ONLY a single ```json block (no narrative text before or after).
2. Match the exact `ImportSessionInputSchema` shape:
   ```
   {
     "songTitle": "<string>",
     "artist": "<string>",
     "bpm": <integer 40–280>,
     "key": "<note name: C, C#, D, D#, E, F, F#, G, G#, A, A#, B>",
     "mode": "<one of: major, minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic:minor>",
     "sections": [
       {
         "label": "<section name: Intro, Verso, Estribillo, etc.>",
         "chords": [
           { "root": "<note name>", "quality": "<maj|min|dim|aug|pow>", "bars": <1–8> }
         ]
       }
     ]
   }
   ```
3. Use `quality: "pow"` for power chords (root + fifth, no third — common in rock/metal).
4. Include 2–8 sections; 1–8 chords per section; bars defaults to 1 if absent.
5. If the model does not know the song, respond with `{ "error": "Canción desconocida" }` (NOT a hallucinated chart). The import flow detects this via `safeParse` failure.
6. BPM must be the actual song tempo (integer). Key must be the actual key signature.

**`src/agent/import-agent.ts`** — New file:

```typescript
// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — sendImport: one-shot LLM call for structured chart generation.
// song-import Phase 03. Reuses providers.ts/agent.ts pattern.
```

Exports:

1. **`ImportSendResult`** — discriminated union:
   ```typescript
   type ImportSendResult =
     | { type: 'ok'; input: ImportSessionInput }
     | { type: 'error'; message: string };
   ```

2. **`sendImport(query: string): Promise<ImportSendResult>`** — the one-shot fetch:
   - Reads `agentProvider`, `agentModel`, `loadApiKey` from `providers.ts` and `agent.ts`.
   - Returns `{ type: 'error', message: 'API key ausente' }` if no key.
   - Calls `fetch(provider.url, { method: 'POST', headers: provider.headers(key), body: JSON.stringify(provider.body(model, IMPORT_SYSTEM_PROMPT, [{ role: 'user', content: query }], 600)) })`.
   - Handles HTTP errors (status non-2xx) and provider-level `data.error` responses.
   - Extracts the JSON string from the response text using the fence → brace fallback (copy the logic from `tryParseSkill` in `agent.ts` lines 576–587).
   - Calls `ImportSessionInputSchema.safeParse(JSON.parse(jsonStr))`.
   - Returns `{ type: 'ok', input: result.data }` on success.
   - Returns `{ type: 'error', message: '...' }` on any failure (network, JSON parse, safeParse).
   - Does NOT push to `chatHistory`. Does NOT call `applyImportSession`. Does NOT touch the store. Pure async function that returns a result.

**Unit tests in `tests/song-import/import-agent.test.ts`** — Tests for the pure logic only (not the fetch itself):

- Test `ImportSendResult` type shape (no runtime assertion — type-level only via `satisfies`).
- Test the JSON extraction helper (if extracted to a shared function): fence extraction and brace-fallback extraction.
- Test `ImportSessionInputSchema.safeParse` on a valid ImportSessionInput (baseline — proves the schema imported in import-agent.ts is the same as in import-session.ts).
- Test that a malformed JSON string produces `type: 'error'` in the returned result (mock the fetch response or test the extraction/parse step in isolation).
- The actual `fetch` is NOT unit-tested (it is DOM/network — out of scope for Vitest pure-engine tests). The panel's manual parity note covers the end-to-end path.

Note: If the Dev judges that the JSON extraction logic is too entangled with `fetch` to test in isolation without significant mocking, skip the extraction test and cover it via a proxy:static-analysis note (read the implementation, confirm the fence → brace fallback is present, no test). State the gap explicitly in the handoff's Acceptance Coverage Table.

**Acceptance criteria:**

- A-03-06: `src/state/session.ts` — `applyLoadedSession` carries `b.label` through to `newBlocks`. Verified by `proxy:static-analysis` (read the lines; confirmed by the regression test A-03-11).
- A-03-07: `applyImportSession` is exported from `src/agent/apply.ts`; it accepts `SavedSession` and calls `applyLoadedSession`. AGPL-3.0 header on new file portions. Verified by `proxy:static-analysis`.
- A-03-08: `src/agent/import-prompt.ts` exists; `IMPORT_SYSTEM_PROMPT` is exported; it includes the `ImportSessionInputSchema` shape, all quality values including `'pow'`, all 8 mode values, and the "si no conoces la canción, devuelve `{ error: ... }`" instruction. Verified by `proxy:static-analysis`.
- A-03-09: `src/agent/import-agent.ts` exists; `sendImport` and `ImportSendResult` are exported; AGPL-3.0 header present. Verified by `proxy:static-analysis`.
- A-03-10: `sendImport` uses `agentProvider`, `loadApiKey`, `PROVIDERS`, `IMPORT_SYSTEM_PROMPT`, and `ImportSessionInputSchema.safeParse` — no new HTTP client, no new key-storage pattern. Verified by `proxy:static-analysis` (read imports).
- A-03-11: Regression test — `applyLoadedSession` called with a `SavedSession` that has blocks with `label` fields (use the Phase 02 golden fixture output from `importSession(fixture)`) produces a session state where the blocks carry the same labels. Verified by `unit` (Vitest, pure-engine, read the store after the call — note: `applyLoadedSession` is store-coupled; the test must use `get(sessionStore)` in Vitest, which is valid as `sessionStore` is a Svelte writable that works in Node/Vitest without DOM).
- A-03-12: `ImportSessionInputSchema.safeParse` call in `import-agent.ts` validates correctly against a fixture object. `unit` or `proxy:static-analysis`.
- A-03-13: All pre-existing 2129 tests continue to pass (`pnpm test` total count ≥ 2129). `operability`.
- A-03-14: `pnpm exec tsc --noEmit` passes clean after step 03.2. `operability`.

CHECKPOINT → Commit message:
`feat(agent): Phase 03 step 03.2 — applyImportSession, label fix, IMPORT_SYSTEM_PROMPT, sendImport`

---

## Step 03.3 — Import UI + manual parity verification

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, `docs/song-import/phases/phase-03.md`, and `docs/song-import/inventories/phase-03-inventory.md` before editing. The Pilot has confirmed the UI placement from step 03.1 (inventory section e). Build the import UI (per the Pilot-resolved OD-5 and OD-6 decisions): a "name or link" input field, submit button, loading state, and success/error feedback. Wire it to `sendImport` → `importSession` → `applyImportSession`. Include the "Esta acción reemplazará tu sesión actual" replacement warning. Run the app, import "ONE" by Metallica, and record a manual parity note. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-03.md` (this file)
5. `docs/song-import/inventories/phase-03-inventory.md` (full — especially section e for placement)
6. `src/ui/AgentPanel.svelte` (full — the panel to extend, or the companion for a new component)
7. `src/app/App.svelte` (if a new component is mounted here)
8. `src/agent/import-agent.ts` (full — the `sendImport` function just built)
9. `src/agent/import-session.ts` (full — the `importSession` function)
10. `src/agent/apply.ts` (full — the `applyImportSession` function just built)

**What to produce:**

**Import UI** — per inventory section (e) recommendation (confirmed by Pilot):

If placed in `AgentPanel.svelte` (Option i): a new collapsible subsection "Importar canción" added at the top of the panel, above the chat log. Contains:
- A `<label>` "Nombre o link" + `<input type="text">` (placeholder: "p. ej. ONE de Metallica").
- A `<button>` "Importar" (disabled while loading or if the field is empty).
- A loading spinner or "Importando…" text during the async call.
- A `<p class="import-warning">` "Esta acción reemplazará tu sesión actual." shown whenever the field is non-empty (persistent reminder, not a modal).
- On success: a brief success message "✓ Sesión importada: <songTitle>" that auto-clears after 3 seconds.
- On error: a persistent error message in a `.import-error` span, cleared on next attempt.
- If no API key is configured for the current provider: show a placeholder "Configura tu proveedor de IA primero (panel de agente)" and disable the field.

If placed in a new `src/ui/ImportPanel.svelte` (Option ii): same UI elements in a standalone component, mounted in `App.svelte` alongside the existing panels.

**Wire-up logic in the component:**

```
async function handleImport() {
  const query = importQuery.trim();
  if (!query) return;
  loading = true; error = null;
  const result = await sendImport(query);
  if (result.type === 'error') { error = result.message; loading = false; return; }
  const saved = importSession(result.input);
  applyImportSession(saved);
  successMsg = '✓ Sesión importada: ' + result.input.songTitle;
  setTimeout(() => successMsg = '', 3000);
  importQuery = '';
  loading = false;
}
```

The component imports `sendImport` from `../agent/import-agent.js`, `importSession` from `../agent/import-session.js`, and `applyImportSession` from `../agent/apply.js`.

**Manual parity note** — After running `pnpm dev`, the Dev must:

1. Configure the Anthropic (or another available) provider in the Agent Panel with a valid API key.
2. Type "ONE de Metallica" (or "ONE by Metallica") in the import field and click Importar.
3. Observe: (a) loading state appears; (b) on success, the Composition timeline shows 3 labelled blocks ("Intro", "Verse", "Chorus" or equivalent section labels); (c) the harmony progression panel shows the first section's chords; (d) the BPM is set to approximately 85 (the golden fixture BPM); (e) playing a composition block produces audible power-chord sound matching the `note("B2,F#3")` pattern.

The Dev records in the handoff:
- Whether the LLM returned a valid chart on the first attempt.
- Which provider was used and which model.
- The exact section labels returned (must be non-empty, section-only strings like "Intro").
- Whether blocks appeared in the Composition timeline with the correct labels visible.
- Whether the `note("B2,F#3")` or equivalent power-chord pattern was audible when playing a block.
- Any discrepancies vs the Phase 02 golden fixture.

If the LLM returns a structurally different chart (different sections, different BPM) on first attempt, this is acceptable — the parity note records what happened. The acceptance criterion is that the pipeline completed without error (chart produced, session loaded, blocks visible, audio playable), not that the model returns byte-identical output to the golden fixture.

**CSS:** Add minimal styles to the import subsection / panel (following the existing `.glass`, `.tbtn`, input, and error/feedback color conventions in the app). No new CSS framework or utility classes.

**No new unit tests for the Svelte component itself** (Svelte component unit tests require JSDOM, which is not in the test suite). The wire-up logic is covered by the manual parity note and the A-03-11 regression test from step 03.2.

**Acceptance criteria:**

- A-03-15: The import field is visible in the running app (`pnpm dev`) when the Agent Panel is open and a provider key is configured. `manual`
- A-03-16: Submitting "ONE de Metallica" (or equivalent) produces at least 2 labelled composition blocks in the Composition timeline within 30 seconds. `manual`
- A-03-17: The "Esta acción reemplazará tu sesión actual" warning is visible in the import UI when the field is non-empty. `manual`
- A-03-18: On a `sendImport` parse failure (e.g., disconnect from network, or test with an intentionally malformed prompt), the error message is shown in the panel without crashing. `manual`
- A-03-19: Playing a block produced by import generates audible Strudel audio (power-chord or triadic, depending on the song). `manual`
- A-03-20: The import component does NOT import from `chatHistory` (the agent's conversation history is a separate concern). `proxy:static-analysis`
- A-03-21: AGPL-3.0 header present on any new `.svelte` or `.ts` file. `proxy:static-analysis`
- A-03-22: All pre-existing 2129 tests continue to pass (`pnpm test` total count ≥ 2129). `operability`
- A-03-23: `pnpm exec tsc --noEmit` passes clean. `operability`

CHECKPOINT → Commit message:
`feat(ui): Phase 03 step 03.3 — import panel, sendImport wiring, manual parity note`

---

## Step 03.4 — Quality gate + merge-readiness declaration

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-03.md` before doing anything else. Run the full quality gate in order: `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build`. Report exact output for each command. Confirm total test count is above 2129 (the Phase 02 baseline). State the Phases 01–03 merge-readiness verdict. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-03.md` (this file)

**What to produce:**

Run each command and capture output:

1. `pnpm test` — report test count (must be > 2129).
2. `pnpm exec tsc --noEmit` — must exit 0 with no errors.
3. `pnpm lint` — must exit 0 with no errors or warnings.
4. `pnpm build` — must exit 0.

If any command fails: diagnose the root cause, apply a targeted fix (do NOT refactor unrelated code), re-run the failing command, and report both the original failure and the fix.

In the handoff entry, include:

- The exact final output of each command.
- The total test count from `pnpm test` output.
- Confirmation that test count is strictly greater than 2129.
- The merge-readiness statement: "Phases 01–03 of the `song-import` initiative are complete. Branch `song-import/phase-01` is ready to merge to `main` pending Pilot approval."
- If fixes were needed: the file(s) changed and the nature of the fix (one sentence each).

**Acceptance criteria:**

- A-03-24: `pnpm test` all tests pass (count strictly greater than 2129). `operability`
- A-03-25: `pnpm exec tsc --noEmit` exits 0. `operability`
- A-03-26: `pnpm lint` exits 0. `operability`
- A-03-27: `pnpm build` exits 0. `operability`
- A-03-28: Handoff includes exact test count and confirmation it exceeds the 2129 baseline. `manual`
- A-03-29: Handoff includes the merge-readiness statement for Phases 01–03. `manual`

CHECKPOINT → Commit message:
`chore(quality): Phase 03 step 03.4 — quality gate: all checks pass`

---

## Phase Acceptance

This phase's acceptance covers the entire song-import initiative (Phases 01–03). All criteria below must pass before the branch is merge-worthy to `main`.

### Phase 03 step-level criteria

- **A-03-01** — Phase 03 inventory exists with all six sections (a–f).
  - Validation method: `manual`
- **A-03-02** — Inventory section (a) reproduces `applyLoadedSession` gap and states exact fix.
  - Validation method: `manual`
- **A-03-03** — Inventory section (c) confirms fetch pattern and `max_tokens` recommendation.
  - Validation method: `manual`
- **A-03-04** — Inventory section (e) states UI placement recommendation with rationale.
  - Validation method: `manual`
- **A-03-05** — Inventory produced by reading only; no source files modified.
  - Validation method: `manual`
- **A-03-06** — `applyLoadedSession` carries `b.label` through to `newBlocks`.
  - Validation method: `proxy:static-analysis`
- **A-03-07** — `applyImportSession` exported from `apply.ts`; delegates to `applyLoadedSession`; accepts `SavedSession`.
  - Validation method: `proxy:static-analysis`
- **A-03-08** — `IMPORT_SYSTEM_PROMPT` exported from `import-prompt.ts`; includes schema shape, `pow`, 8 modes, unknown-song instruction.
  - Validation method: `proxy:static-analysis`
- **A-03-09** — `sendImport` and `ImportSendResult` exported from `import-agent.ts`; AGPL-3.0 header present.
  - Validation method: `proxy:static-analysis`
- **A-03-10** — `sendImport` reuses `agentProvider`, `loadApiKey`, `PROVIDERS`, `IMPORT_SYSTEM_PROMPT`, `ImportSessionInputSchema.safeParse` — no new HTTP client.
  - Validation method: `proxy:static-analysis` (read imports in `import-agent.ts`)
- **A-03-11** — `applyLoadedSession` with a labelled `SavedSession` (Phase 02 golden fixture) produces store blocks carrying the same labels.
  - Validation method: `unit`
- **A-03-12** — `ImportSessionInputSchema.safeParse` validates a valid fixture inside `import-agent.test.ts`.
  - Validation method: `unit` or `proxy:static-analysis`
- **A-03-13** — All 2129 pre-existing tests pass after step 03.2.
  - Validation method: `operability`
- **A-03-14** — `pnpm exec tsc --noEmit` passes clean after step 03.2.
  - Validation method: `operability`
- **A-03-15** — Import field visible in running app with provider key configured.
  - Validation method: `manual`
- **A-03-16** — Importing "ONE de Metallica" produces ≥ 2 labelled blocks in the Composition timeline.
  - Validation method: `manual`
- **A-03-17** — "Esta acción reemplazará tu sesión actual" warning visible in import UI.
  - Validation method: `manual`
- **A-03-18** — Parse failure shows error message in panel without crash.
  - Validation method: `manual`
- **A-03-19** — Playing an imported block generates audible Strudel audio.
  - Validation method: `manual`
- **A-03-20** — Import component does not import from `chatHistory`.
  - Validation method: `proxy:static-analysis`
- **A-03-21** — AGPL-3.0 header on all new `.svelte` and `.ts` files.
  - Validation method: `proxy:static-analysis`
- **A-03-22** — All 2129 pre-existing tests pass after step 03.3.
  - Validation method: `operability`
- **A-03-23** — `pnpm exec tsc --noEmit` passes clean after step 03.3.
  - Validation method: `operability`
- **A-03-24** — `pnpm test` all pass; count strictly greater than 2129 (final gate).
  - Validation method: `operability`
- **A-03-25** — `pnpm exec tsc --noEmit` exits 0 (final gate).
  - Validation method: `operability`
- **A-03-26** — `pnpm lint` exits 0 (final gate).
  - Validation method: `operability`
- **A-03-27** — `pnpm build` exits 0.
  - Validation method: `operability`
- **A-03-28** — Handoff includes exact test count and confirmation it exceeds 2129.
  - Validation method: `manual`
- **A-03-29** — Handoff includes merge-readiness statement for Phases 01–03.
  - Validation method: `manual`

### Cross-initiative merge criteria (Phases 01–03 together)

These criteria are satisfied by prior phases but must remain unbroken at Phase 03 completion:

- **X-01** — `Quality` type includes `'pow'`; `QUAL_INTERVALS['pow'] = [0, 7]`; `chordToStrudel` with `qual='pow'` produces `note("E2,B2")` for E at octave 2.
  - Validation method: `operability` (existing tests from Phase 01 pass in step 03.4's `pnpm test`)
- **X-02** — `Block.label?: string` is accepted by `SavedBlockSchema` and round-trips through `serializeSession`/`deserializeSession`.
  - Validation method: `operability` (existing tests from Phase 01 pass)
- **X-03** — `importSession(fixture)` deep-equals the Phase 02 hardcoded golden `SavedSession`.
  - Validation method: `operability` (existing test from Phase 02 passes)
- **X-04** — `SESSION_SCHEMA_VERSION === 7` and `SCHEMA_VERSION === 7`.
  - Validation method: `operability` (existing tests pass)
- **X-05** — `applyLoadedSession` with a Phase-01-era saved session (no `label` field) does NOT crash and does NOT produce `label` fields in the loaded blocks.
  - Validation method: `unit` (new test in step 03.2 or the existing Phase 01 tests cover this via the conditional spread)

## Partial coverage from prior phases

- Phase 01 A-01-08 (power-chord Strudel codegen), A-01-18/A-01-19 (block-label round-trip) provide prior coverage for X-01 and X-02 above.
- Phase 02 A-02-07 (golden fixture deep-equal), A-02-08 (safeParse success) provide prior coverage for X-03.
- Phase 02 A-02-14/A-02-16 (test count baselines) are superseded by A-03-24 (Phase 03 final gate).

## ADR Triggers

- **ADR 0027 — `applyImportSession` and session-replace behavior (OD-6):** Trigger: step 03.2 resolution of OD-6. If the Pilot confirms replace-on-import (Option A), an ADR documenting the replace-not-merge decision and its UX rationale should be written. If Option B (merge) is chosen, the ADR documents the merge semantics and the constraints on what "merge" means for BPM/harmony. Open at or before step 03.3.
- **ADR 0028 — `IMPORT_SYSTEM_PROMPT` and chart-sourcing contract (OD-4):** Trigger: step 03.2. If OD-4 is resolved as Option A (LLM-native), an ADR documenting the prompt design, the `ImportSessionInputSchema`-as-output-contract, and the "unknown song → `{ error: ... }` response" convention should be written alongside `import-prompt.ts`. This is the input-side complement to ADR 0026 (which documents the schema shape from the translator's perspective).

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/song-import/handoffs/phase-03-handoff.md`. See the pattern established in `docs/song-import/handoffs/phase-02-handoff.md`. The phase-completion entry must include:

- A summary of all deliverables (files created/modified).
- The final test count progression table (Phase 01: 2104, Phase 02: 2129, Phase 03: ≥ 2129 + new tests).
- The merge-readiness statement: "Phases 01–03 of the `song-import` initiative are complete. Branch `song-import/phase-01` is ready to merge to `main` pending Pilot approval."
- Any pending Register proposals (for the Pilot to resolve at phase approval).

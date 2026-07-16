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

### OD-7 — Rhythmic signature of the imported song (RESOLVED)

**Context:** Step 03.3 manual parity verification revealed that the imported composition plays harmony only — no drums. `importSession` sets a minimal `bd` groove in `SavedSession.rhythm` (standalone rhythm engine) but `composition.blocks` contains only harmony blocks in a single track. Playing the composition therefore plays only harmony.

Step 03.4 fixes this by adding per-section groove blocks + a rhythm track to the composition. The question was where the groove pattern comes from.

**Option A — Fixed default backbeat (REJECTED by Pilot):** A deterministic generic rock/pop pattern (bd+sd+hh) embedded in `importSession`. Simple, no schema change, fully deterministic. Rejected because it ignores what makes each song's rhythm distinctive — the "signatura rítmica" — and produces the same beat for Metallica as for a bossa nova.

**Option B — LLM returns a per-section drum pattern (RESOLVED — Pilot decision):** The LLM returns a drum pattern for each section alongside the chord chart. The Pilot's rationale: "el ritmo identifica una canción tanto o más que la armonía; no podemos dar soluciones genéricas; tenemos que encontrar la 'signatura rítmica' de las canciones, con la misma estrategia que hacemos con armonía." Rhythm is now first-class — parallel to harmony, not an afterthought. Each section has both a `chords[]` array (harmony) and a `groove` object (rhythm), and `importSession` produces one `armonia` block + one `groove` block per section, arranged in two parallel composition tracks.

**Option C — Tempo/genre heuristic:** Not recommended; also ruled out by the same reasoning as Option A.

**Resolution: Option B — per-section song-specific rhythmic signature, first-class parity with harmony.** The generic backbeat (Option A) is explicitly not acceptable. The Pilot must resolve OD-7 before step 03.4 begins; this section records the resolution.

**Schema change required:** `SectionSpecSchema` gains a `groove` field (required); `IMPORT_SCHEMA_VERSION` bumps from 1 to 2. These changes are implemented in step 03.4. `IMPORT_SYSTEM_PROMPT` (created in step 03.2) must be extended in step 03.4 to instruct the LLM to return drum patterns.

**ADR implication:** `IMPORT_SCHEMA_VERSION` bump to 2 requires an ADR (amendment to ADR 0026, or a new ADR). The Pilot writes it. The input-side prompt extension also requires an ADR 0028 amendment. Both are flagged in the ADR Triggers section below.

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

> **Note on `IMPORT_SYSTEM_PROMPT` scope:** Step 03.2 creates `src/agent/import-prompt.ts` with an `IMPORT_SYSTEM_PROMPT` covering harmony only (chords, sections, BPM, key, mode). Step 03.4 will extend this prompt to include per-section rhythm (OD-7 resolution). The harmony-only prompt created here is a valid intermediate artifact; do NOT attempt to include drum patterns in it — that is step 03.4's responsibility after OD-7 is resolved. The `max_tokens` set in step 03.2 (`600`) will also be revised upward in step 03.4 to accommodate the larger response with groove layers.

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
- A-03-08: `src/agent/import-prompt.ts` exists; `IMPORT_SYSTEM_PROMPT` is exported; it includes the `ImportSessionInputSchema` shape (harmony fields only at this step), all quality values including `'pow'`, all 8 mode values, and the "si no conoces la canción, devuelve `{ error: ... }`" instruction. Verified by `proxy:static-analysis`.
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

## Step 03.4 — `importSession` enrichment: per-section rhythmic signatures + editable snapshots

> **Acceptance-ID numbering note:** This step introduces IDs A-03-24 through A-03-37. The quality-gate step (step 03.5) uses IDs A-03-38 through A-03-43.

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/song-import/decisions.md`, and `docs/song-import/phases/phase-03.md` (this file) in full before editing. The Pilot has resolved OD-7: per-section song-specific rhythmic signatures, first-class parity with harmony (Option B — generic backbeat rejected). Implement three targeted changes: (1) extend `SectionSpecSchema` with a required `groove` field and bump `IMPORT_SCHEMA_VERSION` to 2; (2) attach an `ArmoniaSnapshot` to each harmony block and a `GrooveSnapshot` to each groove block so all imported blocks are editable via `openBlock`; (3) add per-section groove blocks + a parallel rhythm track to the composition. Extend `IMPORT_SYSTEM_PROMPT` in `import-prompt.ts` and raise `max_tokens` in `sendImport` in `import-agent.ts`. Update the golden-fixture test in `tests/song-import/import-session.test.ts` to expect the new output shape. STOP for Planner review.

**Context (what step 03.3 manual parity revealed):**

Two product gaps were found when importing "ONE de Metallica" live:

- **Finding 1 — silent composition:** The composition plays only harmony. The standalone rhythm engine groove and the composition are separate; the composition has no rhythm track.
- **Finding 3 — blocks not editable:** Clicking a block in the Composition timeline is a no-op. `openBlock` in `session.ts` (line 2230) returns immediately when `block.snapshot === undefined`. Imported blocks have no `snapshot` field and are therefore permanently read-only.

(Finding 2 — a separate, non-import-specific issue with `applyLoadedSession` — is out of scope for this step.)

The Pilot resolved OD-7 as: rhythm is first-class, parallel to harmony — each section must carry its own rhythmic signature returned by the LLM.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/orbifold-v1/decisions.md`
3. `docs/song-import/decisions.md`
4. `docs/song-import/phases/phase-03.md` (this file)
5. `src/agent/import-session.ts` (full — the function being modified)
6. `src/core/composition/snapshot.ts` (full — `ArmoniaSnapshot`, `GrooveSnapshot`; `restoreArmoniaSnapshot`/`restoreGrooveSnapshot` to verify what fields are needed for a successful restore via `openBlock`)
7. `src/state/session.ts` lines 2224–2265 (the `openBlock` function — confirm the `block.snapshot === undefined` guard and both restore dispatch paths: `restoreArmoniaSnapshot` for `armonia`, `restoreGrooveSnapshot` for `groove`)
8. `src/lib/persistence.ts` (`SavedBlockSchema`, `SavedArmoniaSnapshotSchema`, `SavedGrooveSnapshotSchema`, `SavedGrooveLayerSchema` — confirm the `sound` enum and step constraints; confirm `snapshot?` is already accepted and round-trips)
9. `src/core/codegen/strudel.ts` — confirm `rhythmToStrudel(layers: RhythmLayer[]): string` is exported and pure (no store imports); this is the function `importSession` must use to emit groove block code
10. `src/core/rhythm/layers.ts` — confirm the `Sound` type enum (the supported sound names that `ImportGrooveLayerSchema` must restrict to)
11. `src/agent/import-prompt.ts` (full — the file created in step 03.2, to be extended)
12. `src/agent/import-agent.ts` (full — the file created in step 03.2; `max_tokens` must be raised)
13. `tests/song-import/import-session.test.ts` (full — the golden-fixture test that must be updated)

**What to produce:**

### 1. Schema extension: `groove` per section + `IMPORT_SCHEMA_VERSION` bump

In `src/agent/import-session.ts`, extend the input schema to include a required `groove` field on each section.

**New `ImportGrooveLayerSchema`:**

```typescript
// Sound values mirror the Sound type from src/core/rhythm/layers.ts.
// Restricted to the same set as SK_SOUNDS in persistence.ts so that
// importSession's GrooveSnapshot layers pass SavedGrooveSnapshotSchema validation.
const IMPORT_SK_SOUNDS = [
  'bd','sd','hh','oh','cp','rim','lt','mt','ht',
  'conga','cajon','wood','shaker','cb','perc','hand',
] as const;

export const ImportGrooveLayerSchema = z.object({
  sound: z.enum(IMPORT_SK_SOUNDS),
  /** Exactly 16 steps, each 0 or 1. Guardrail: 1 cycle = 4/4 = 16 steps. */
  steps: z.array(z.number().int().min(0).max(1)).length(16),
});
```

Note: `steps` is `.length(16)` — exactly 16, not `.min(1).max(16)`. The 4/4 guardrail (1 cycle = 16 steps) is a hard invariant at the import boundary. Compound/irregular time signatures remain deferred (noted in CLAUDE.md).

**New `ImportGrooveSchema`:**

```typescript
export const ImportGrooveSchema = z.object({
  layers: z.array(ImportGrooveLayerSchema).min(1).max(8),
});
```

**Updated `SectionSpecSchema`:**

```typescript
export const SectionSpecSchema = z.object({
  label: z.string().min(1).max(100),
  chords: z.array(ChordSpecSchema).min(1).max(16),
  groove: ImportGrooveSchema,  // required — OD-7 resolution: rhythm is first-class
});
```

`groove` is **required** (not optional). Rationale: if the LLM omits it, `ImportSessionInputSchema.safeParse` fails and the user retries — which is the correct behavior. A section without a rhythmic signature is an incomplete chart. An optional `groove` with a silent fallback would silently produce no drums, which is worse than an informative parse error.

**`IMPORT_SCHEMA_VERSION` bump:**

```typescript
// v2 — song-import Phase 03 step 03.4. Per-section `groove` added to SectionSpecSchema.
//       Rhythm is now first-class (OD-7 Option B resolution).
export const IMPORT_SCHEMA_VERSION = 2;
```

**Export the new types:**

```typescript
export type ImportGrooveLayer = z.infer<typeof ImportGrooveLayerSchema>;
export type ImportGroove = z.infer<typeof ImportGrooveSchema>;
```

`ImportSessionInput` (inferred from `ImportSessionInputSchema`) automatically gains `sections[].groove` — no separate type change needed.

### 2. `IMPORT_SYSTEM_PROMPT` extension (modifying `src/agent/import-prompt.ts`)

The prompt created in step 03.2 covers harmony only. Extend it to include per-section rhythm. The updated prompt must:

1. Add a `groove` field to the per-section JSON shape, immediately after `chords`:
   ```
   "groove": {
     "layers": [
       { "sound": "<drum sound>", "steps": [<16 integers, each 0 or 1>] }
     ]
   }
   ```
2. List the supported drum sounds: `bd` (kick), `sd` (snare), `hh` (closed hi-hat), `oh` (open hi-hat), `cp` (clap), `rim` (rimshot), `lt`/`mt`/`ht` (low/mid/high tom), `conga`, `cajon`, `wood`, `shaker`, `cb` (cowbell), `perc`, `hand`.
3. Explain that `steps` is always exactly 16 integers (0 = silent, 1 = hit), representing a 4/4 bar at 1/16-note resolution (16 subdivisions).
4. Emphasize capturing the song's **characteristic rhythmic signature** ("signatura rítmica") — what makes this specific song rhythmically recognizable — not a generic pattern. For example: the galloping double-bass of a metal section, the snare-on-2-and-4 of a pop verse, the syncopated clave of a salsa. The LLM must apply musical knowledge of the song to choose appropriate patterns per section.
5. Recommend 1–4 layers per section (covering the most characteristic elements; not all sounds need to be present for every section — a sparse pattern can be more idiomatic than a dense one).
6. The unknown-song fallback (`{ "error": "Canción desconocida" }`) is unchanged.

**`max_tokens` update in `src/agent/import-agent.ts`:** With per-section grooves (up to 8 sections × 4 layers × 16 steps each = 512 integers, plus the chord chart), the response is substantially larger. Raise `max_tokens` from `600` to `1600` in the `sendImport` fetch call. This is the only change to `import-agent.ts`.

### 3. Editable snapshots on harmony blocks (finding 3)

In `importSession`, each harmony block gains an `ArmoniaSnapshot` field (`type: 'armonia'`). The snapshot is constructed inline from the data already available in the mapping function — `importSession` is store-free, so it must NOT call `captureArmoniaSnapshot(state)` (which requires a live `SessionState`). Instead, build the plain object directly:

```typescript
// Inside sections.map():
const armoniaSnapshot: ArmoniaSnapshot = {
  type: 'armonia',
  root: harmonyRoot,          // already computed above: noteToPc(input.key)
  mode: input.mode,
  octave,                     // 2 — the constant already used for codegen
  chordMode: 'chord',         // importSession always emits chord (block) mode
  progression: slots.map((chord) => ({
    rootPc: chord.rootPc,
    qual: chord.qual,
    gain: chord.gain,
    ...(chord.bars !== undefined ? { bars: chord.bars } : {}),
  })),
};
```

Where `slots` is the chord array already built earlier in the same `sections.map` callback. The harmony block returned from `sections.map` gains the `snapshot` field:

```typescript
const armoniaBlock = {
  name: `${input.songTitle} — ${section.label}`,
  type: 'armonia' as const,
  code,
  bars,
  label: section.label,
  snapshot: armoniaSnapshot,
};
```

**Why this makes `openBlock` work:** `openBlock` dispatches on `snapshot.type === 'armonia'` → `restoreArmoniaSnapshot(snapshot)` → `Partial<SessionState>` with harmony restored. The user opens the Armonía editor and sees the section's specific chords. Each block carries its own section's progression — not the globally shared live state.

**Import path required:** `import type { ArmoniaSnapshot, GrooveSnapshot } from '../core/composition/snapshot.js';` — type-only import; snapshot.ts has no DOM/PIXI/Svelte imports, safe in a pure context.

### 4. Per-section groove blocks + rhythm track (finding 1)

For each section, build a groove block alongside the harmony block. The groove block's pattern comes from `section.groove.layers` (the LLM-returned rhythmic signature for that section). The groove block code is produced by calling `rhythmToStrudel(layers)` — a pure function exported from `src/core/codegen/strudel.ts` that `import-session.ts` can import directly alongside the already-imported `melodyLine`.

**Import path required:** extend the existing import from `'../core/codegen/strudel.js'` to also import `rhythmToStrudel`. Confirm this import already exists (it imports `melodyLine`) — add `rhythmToStrudel` to the same import statement.

**Also import `RhythmLayer` type** for the layer mapping: `import type { RhythmLayer } from '../core/rhythm/layers.js';` — type-only import; layers.ts has no DOM/PIXI/Svelte imports.

**Per-section groove block construction (inside `sections.map`):**

```typescript
// Map ImportGrooveLayer → RhythmLayer (structural match, no cast needed).
const grooveLayers: RhythmLayer[] = section.groove.layers.map((l) => ({
  sound: l.sound,
  steps: [...l.steps],
}));

// Emit the Strudel rhythm string using the pure codegen function.
// rhythmToStrudel takes RhythmLayer[] and returns stack(...) or ''.
const grooveCode = rhythmToStrudel(grooveLayers);

const grooveSnapshot: GrooveSnapshot = {
  type: 'groove',
  layers: grooveLayers,
};

const grooveBlock = {
  name: `${input.songTitle} — ${section.label} (ritmo)`,
  type: 'groove' as const,
  code: grooveCode,
  bars,                    // same bars as the harmony block for this section
  label: section.label,    // same section label — timeline shows paired blocks
  snapshot: grooveSnapshot,
};
```

**Note on `bars` for groove blocks:** Each groove block has `bars` equal to the corresponding harmony block's `bars` (i.e., `sum of chord bars for this section`). This ensures the harmony and rhythm tracks are bar-for-bar aligned with no need for `silence` padding.

**Note on empty `grooveCode`:** `rhythmToStrudel` returns `''` when all layers are muted (which cannot happen here since imported layers have no `muted` field) or when the layers array is empty (prevented by `ImportGrooveSchema.layers.min(1)`). In practice `grooveCode` is always non-empty; the Dev should assert this is non-empty (or throw) if it ever returns empty, since an empty groove block code is invalid.

**Assembled `sections.map` return:**

Each iteration of `sections.map` now returns a pair `{ armoniaBlock, grooveBlock }`. Separate the harmony blocks and groove blocks after the map:

```typescript
const sectionPairs = input.sections.map((section) => {
  // ... build armoniaBlock and grooveBlock as above ...
  return { armoniaBlock, grooveBlock };
});

const armoniaBlocks = sectionPairs.map((p) => p.armoniaBlock);
const grooveBlocks  = sectionPairs.map((p) => p.grooveBlock);
const allBlocks = [...armoniaBlocks, ...grooveBlocks];
// allBlocks: [intro-harm, verse-harm, chorus-harm, intro-groove, verse-groove, chorus-groove]
// indices:   [0,           1,          2,            3,            4,            5           ]
```

**Harmony track:** References the harmony blocks in order (indices 0…N-1 where N = number of sections):

```typescript
const harmonyTrackRefs = armoniaBlocks.map((block, idx) => ({
  blockIndex: idx,
  bars: block.bars,
}));
```

**Rhythm track:** References the groove blocks in order (indices N…2N-1):

```typescript
const rhythmTrackRefs = grooveBlocks.map((block, idx) => ({
  blockIndex: armoniaBlocks.length + idx,
  bars: block.bars,
}));
```

**Assembled `composition` object:**

```typescript
composition: {
  blocks: allBlocks,
  tracks: [
    { blockRefs: harmonyTrackRefs },  // harmony track
    { blockRefs: rhythmTrackRefs },   // rhythm track (parallel, same total bars)
  ],
}
```

**Guardrail compliance:** Harmony track total bars = rhythm track total bars (each section's groove block has the same `bars` as its harmony block). No `silence` padding needed.

**Standalone `rhythm` state:** Update `rhythm.layers` to use the FIRST section's groove layers (mirroring the pattern already used for `harmony.progression` = first section's chords):

```typescript
rhythm: {
  layers: sectionPairs[0]!.grooveBlock.snapshot.layers,
},
```

This keeps the standalone rhythm engine consistent with the first section's groove block. When the user opens the Rhythm view after import, they see the Intro's rhythmic signature.

### 5. Golden-fixture test update (`tests/song-import/import-session.test.ts`)

The fixture input must be updated to include `groove` per section. The `expectedSession` must be updated to reflect the new output shape. The `IMPORT_SCHEMA_VERSION` assertion must be updated to `2`.

**Fixture groove patterns for "ONE" (Metallica) — three sections:**

The Dev invents musically plausible patterns for the fixture (these are hardcoded deterministic data, not LLM output). Suggested patterns that capture the song's character:

- **Intro (sparse, building tension):**
  - `bd`: `[1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0]` (quarter-note kicks on 1 and 3)
  - `hh`: `[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]` (eighth-note hi-hat)

- **Verse (driving metal, galloping feel):**
  - `bd`: `[1,0,1,0, 0,0,1,0, 1,0,1,0, 0,0,1,0]` (galloping double-bass pattern)
  - `sd`: `[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]` (snare on 2 and 4)
  - `hh`: `[1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1]` (16th-note hi-hat)

- **Chorus (full power, prominent kick + snare):**
  - `bd`: `[1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0]` (quarter-note kick every beat)
  - `sd`: `[0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0]` (snare on 2 and 4)
  - `hh`: `[1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0]` (eighth-note hi-hat)

The Dev must verify these patterns produce valid Strudel code via `rhythmToStrudel` and that they satisfy `ImportGrooveLayerSchema` (sound in enum, steps length 16, values 0/1).

**Required changes to the test file:**

- Add `groove` to each section in the `fixture` object.
- Update `expectedSession`:
  - `rhythm.layers` = first section's groove layers (Intro: bd + hh, 2 layers).
  - `composition.blocks` = 6 entries: 3 harmony + 3 groove (indices 0–2 = harmony, indices 3–5 = groove), each with `snapshot`.
  - `composition.tracks` = 2 entries: harmony track (refs 0,1,2) + rhythm track (refs 3,4,5).
- Update `IMPORT_SCHEMA_VERSION` assertion: expect `2`, not `1`.
- Update the "exactly one track" test to "exactly two tracks".
- Update the "groove default" describe block: now asserts first-section groove layers (not a single `bd`).
- Add new describe blocks for snapshot assertions, per-section groove blocks, and `openBlock` restoration (see acceptance criteria below).
- All other existing tests (pow quality, block labels, block names, section count, version fields, `safeParse` success, regression guard) must continue to pass without modification — the `composition.blocks.length` assertion changes from 3 to 6 (the Dev must update that one assertion).

**Note on `SavedSessionSchema.safeParse` round-trip:** The groove blocks now have `snapshot: { type: 'groove', layers: [...] }`. Confirm `SavedGrooveSnapshotSchema` and `SavedGrooveLayerSchema` in `persistence.ts` accept this shape — they do (sound is `z.enum(SK_SOUNDS)`, steps is `z.array(...).min(1).max(16)`, and the fixture's exactly-16-step arrays satisfy both constraints). The round-trip test already in the file will verify this automatically.

**Note on `IMPORT_SCHEMA_VERSION`:** After this step `IMPORT_SCHEMA_VERSION === 2`. The test asserting `IMPORT_SCHEMA_VERSION === 1` must be updated to `=== 2`. The fixture golden output does NOT include `IMPORT_SCHEMA_VERSION` as a field (it is a module constant, not part of `SavedSession`) — the test asserts it separately.

**Acceptance criteria:**

- A-03-24: `IMPORT_SCHEMA_VERSION === 2` after this step. `unit` (update the existing IMPORT_SCHEMA_VERSION test to assert 2).
- A-03-25: `ImportSessionInputSchema.safeParse` rejects a section with `sound: 'kazoo'` (unsupported drum sound) with a Zod error. `unit` (new negative test in the schema-validation describe block).
- A-03-26: `ImportSessionInputSchema.safeParse` rejects a section with `steps` of length 15 (not 16). `unit` (new negative test — the `.length(16)` guardrail).
- A-03-27: `ImportSessionInputSchema.safeParse` rejects a section with no `groove` field (groove is required). `unit` (new negative test — remove `groove` from one section, expect failure).
- A-03-28: Each harmony block in `importSession` output has `snapshot.type === 'armonia'`. `unit` (assert on blocks at indices 0, 1, 2).
- A-03-29: The `ArmoniaSnapshot` on the Intro harmony block has `root === 11`, `mode === 'minor'`, `octave === 2`, `chordMode === 'chord'`, `progression.length === 2`. `unit`.
- A-03-30: `openBlock` on an imported harmony block (loaded into the store via `applyImportSession`) restores the section's chords into the Armonía editor. `unit` (after `applyImportSession(importSession(fixture))`, call `openBlock` on the block with the Intro's ID and assert `get(sessionStore).harmony.progression` contains two `pow` entries matching B and G).
- A-03-31: Each groove block in `importSession` output has `snapshot.type === 'groove'`. `unit` (assert on blocks at indices 3, 4, 5).
- A-03-32: `openBlock` on an imported groove block restores the section's rhythm into the Ritmo editor. `unit` (after `applyImportSession(importSession(fixture))`, call `openBlock` on the Intro groove block's ID and assert `get(sessionStore).rhythm.layers` matches the Intro section's groove layers).
- A-03-33: `importSession` output has exactly 2 tracks; first track = N harmony blockRefs; second track = N groove blockRefs (N = sections count). `unit` (assert `tracks.length === 2`; assert `tracks[0].blockRefs.length === 3`; assert `tracks[1].blockRefs.length === 3`).
- A-03-34: Rhythm track `blockRefs` reference the groove blocks by correct indices (N, N+1, … for N sections). `unit` (assert `tracks[1].blockRefs[0].blockIndex === 3`).
- A-03-35: `rhythm.layers` in the output matches the first section's groove layers. `unit` (assert `result.rhythm.layers` deep-equals the Intro section's groove layers from the fixture).
- A-03-36: `SavedSessionSchema.safeParse(importSession(fixture))` succeeds (round-trip with new output shape — 6 blocks, 2 tracks, groove snapshots). `unit`.
- A-03-37: `import-session.ts` does NOT import from `src/state/session.ts` or any Svelte store module (A-02-13 purity constraint preserved). `proxy:static-analysis` (read imports; only `snapshot.ts`, `strudel.ts`, `layers.ts` added — all pure-engine files with no DOM/PIXI/Svelte imports).

CHECKPOINT → Commit message:
`feat(agent): Phase 03 step 03.4 — importSession: per-section rhythmic signatures, editable snapshots`

---

## Step 03.5 — Quality gate + merge-readiness declaration

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

- A-03-38: `pnpm test` all tests pass (count strictly greater than 2129). `operability`
- A-03-39: `pnpm exec tsc --noEmit` exits 0. `operability`
- A-03-40: `pnpm lint` exits 0. `operability`
- A-03-41: `pnpm build` exits 0. `operability`
- A-03-42: Handoff includes exact test count and confirmation it exceeds the 2129 baseline. `manual`
- A-03-43: Handoff includes the merge-readiness statement for Phases 01–03. `manual`

CHECKPOINT → Commit message:
`chore(quality): Phase 03 step 03.5 — quality gate: all checks pass`

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
- **A-03-08** — `IMPORT_SYSTEM_PROMPT` exported from `import-prompt.ts`; includes harmony schema shape, `pow`, 8 modes, unknown-song instruction (harmony-only at step 03.2; extended with groove at step 03.4).
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
- **A-03-24** — `IMPORT_SCHEMA_VERSION === 2` after step 03.4.
  - Validation method: `unit`
- **A-03-25** — `ImportSessionInputSchema.safeParse` rejects unsupported drum sound (`'kazoo'`).
  - Validation method: `unit`
- **A-03-26** — `ImportSessionInputSchema.safeParse` rejects groove steps of length ≠ 16.
  - Validation method: `unit`
- **A-03-27** — `ImportSessionInputSchema.safeParse` rejects section without `groove` field.
  - Validation method: `unit`
- **A-03-28** — Each harmony block has `snapshot.type === 'armonia'`.
  - Validation method: `unit`
- **A-03-29** — `ArmoniaSnapshot` on Intro block: `root === 11`, `mode === 'minor'`, `octave === 2`, `chordMode === 'chord'`, `progression.length === 2`.
  - Validation method: `unit`
- **A-03-30** — `openBlock` on imported harmony block restores section chords into harmony editor.
  - Validation method: `unit`
- **A-03-31** — Each groove block has `snapshot.type === 'groove'`.
  - Validation method: `unit`
- **A-03-32** — `openBlock` on imported groove block restores section rhythm into rhythm editor.
  - Validation method: `unit`
- **A-03-33** — `importSession` output has exactly 2 tracks; each has N blockRefs (N = sections).
  - Validation method: `unit`
- **A-03-34** — Rhythm track `blockRefs[0].blockIndex === N` (first groove block after N harmony blocks).
  - Validation method: `unit`
- **A-03-35** — `rhythm.layers` matches first section's groove layers.
  - Validation method: `unit`
- **A-03-36** — `SavedSessionSchema.safeParse(importSession(fixture))` succeeds with new output shape.
  - Validation method: `unit`
- **A-03-37** — `import-session.ts` does not import from `session.ts` or any Svelte store module.
  - Validation method: `proxy:static-analysis`
- **A-03-38** — `pnpm test` all pass; count strictly greater than 2129 (final gate).
  - Validation method: `operability`
- **A-03-39** — `pnpm exec tsc --noEmit` exits 0 (final gate).
  - Validation method: `operability`
- **A-03-40** — `pnpm lint` exits 0 (final gate).
  - Validation method: `operability`
- **A-03-41** — `pnpm build` exits 0.
  - Validation method: `operability`
- **A-03-42** — Handoff includes exact test count and confirmation it exceeds 2129.
  - Validation method: `manual`
- **A-03-43** — Handoff includes merge-readiness statement for Phases 01–03.
  - Validation method: `manual`

### Cross-initiative merge criteria (Phases 01–03 together)

These criteria are satisfied by prior phases but must remain unbroken at Phase 03 completion:

- **X-01** — `Quality` type includes `'pow'`; `QUAL_INTERVALS['pow'] = [0, 7]`; `chordToStrudel` with `qual='pow'` produces `note("E2,B2")` for E at octave 2.
  - Validation method: `operability` (existing tests from Phase 01 pass in step 03.5's `pnpm test`)
- **X-02** — `Block.label?: string` is accepted by `SavedBlockSchema` and round-trips through `serializeSession`/`deserializeSession`.
  - Validation method: `operability` (existing tests from Phase 01 pass)
- **X-03** — `importSession(fixture)` deep-equals the updated golden `SavedSession` including per-section groove blocks, two tracks, and snapshots on all blocks.
  - Validation method: `operability` (updated golden test from step 03.4 passes in step 03.5)
- **X-04** — `SESSION_SCHEMA_VERSION === 7` and `SCHEMA_VERSION === 7`.
  - Validation method: `operability` (existing tests pass)
- **X-05** — `applyLoadedSession` with a Phase-01-era saved session (no `label` field) does NOT crash and does NOT produce `label` fields in the loaded blocks.
  - Validation method: `unit` (new test in step 03.2 or the existing Phase 01 tests cover this via the conditional spread)

## Partial coverage from prior phases

- Phase 01 A-01-08 (power-chord Strudel codegen), A-01-18/A-01-19 (block-label round-trip) provide prior coverage for X-01 and X-02 above.
- Phase 02 A-02-07 (golden fixture deep-equal), A-02-08 (safeParse success) provide prior coverage for X-03 (golden test updated in step 03.4).
- Phase 02 A-02-14/A-02-16 (test count baselines) are superseded by A-03-38 (Phase 03 final gate).

## ADR Triggers

- **ADR 0027 — `applyImportSession` and session-replace behavior (OD-6):** Trigger: step 03.2 resolution of OD-6. If the Pilot confirms replace-on-import (Option A), an ADR documenting the replace-not-merge decision and its UX rationale should be written. If Option B (merge) is chosen, the ADR documents the merge semantics and the constraints on what "merge" means for BPM/harmony. Open at or before step 03.3.
- **ADR 0028 — `IMPORT_SYSTEM_PROMPT` and chart-sourcing contract (OD-4 + OD-7):** Trigger: steps 03.2 and 03.4. An ADR documenting the prompt design — the `ImportSessionInputSchema`-as-output-contract for harmony (step 03.2) and rhythm (step 03.4 extension), the per-section `groove` structure, and the "unknown song → `{ error: ... }` response" convention — should be written. This is the input-side complement to ADR 0026. **The OD-7 rhythm extension must be explicitly recorded in this ADR** since it changes the prompt contract, the schema, and `IMPORT_SCHEMA_VERSION`.
- **ADR 0026 amendment — `importSession` input and output contract changes (step 03.4):** `IMPORT_SCHEMA_VERSION` bumps from 1 to 2 (new `groove` field on each section). `importSession` output contract expands: 2N blocks (N harmony + N groove) + 2 tracks, both block types carry editable snapshots. This is a breaking change to the golden-fixture shape and to the input schema. ADR 0026 must be amended (or a new ADR must be written) to record: (1) the per-section `groove` input field shape and enum constraints; (2) the IMPORT_SCHEMA_VERSION → 2 rationale; (3) the parity-with-harmony design principle (OD-7 resolution). The Pilot writes this.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/song-import/handoffs/phase-03-handoff.md`. See the pattern established in `docs/song-import/handoffs/phase-02-handoff.md`. The phase-completion entry must include:

- A summary of all deliverables (files created/modified).
- The final test count progression table (Phase 01: 2104, Phase 02: 2129, Phase 03: ≥ 2129 + new tests).
- The merge-readiness statement: "Phases 01–03 of the `song-import` initiative are complete. Branch `song-import/phase-01` is ready to merge to `main` pending Pilot approval."
- Any pending Register proposals (for the Pilot to resolve at phase approval).
- Confirmation that OD-7 is recorded in the Register (the Pilot writes the Register entry; the Dev confirms it is there before declaring the phase complete).

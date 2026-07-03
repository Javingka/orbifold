<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0028 — `IMPORT_SYSTEM_PROMPT`: LLM-native chart-sourcing contract

- **Status:** Accepted — ratified by Pilot 2026-07-03
- **Date:** 2026-07-03
- **Initiative / Phase:** song-import / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 03 of the `song-import` initiative introduces `sendImport`, the one-shot
LLM call that sources a structured song chart from the user's configured AI
provider. The chart is validated against `ImportSessionInputSchema` (ADR 0026)
and fed to `importSession()` (Phase 02), which produces the `SavedSession` that
`applyImportSession()` (ADR 0027) loads into the live store.

Before implementation, the chart-sourcing mechanism had to be decided (Open
Decision OD-4 raised in the Phase 03 phase file). Two options were evaluated:

**Option A — LLM-native:** The import UI fires a one-shot call to the user's
configured AI provider (reusing `providers.ts`/`agent.ts` module-level state)
with a documented `IMPORT_SYSTEM_PROMPT` + the song name as the user message.
The model returns a structured JSON chart matching `ImportSessionInputSchema`.

**Option B — Scraping:** Fetch a human chord chart from Ultimate Guitar,
Chordify, or similar. Requires a CORS proxy or backend (the app is static),
tab-text parsing logic (format-brittle), and raises ToS concerns. Not viable
without a backend for the MVP.

---

## Decision (OD-4 = Option A)

**Chart sourcing is LLM-native: a single one-shot `fetch` to the user's
configured AI provider using `IMPORT_SYSTEM_PROMPT` + the song query string.**

---

## Decisions

### D1 — `IMPORT_SYSTEM_PROMPT` is a separate constant in `src/agent/import-prompt.ts`

**Decision:** The system prompt for import lives in a dedicated module
(`src/agent/import-prompt.ts`), separate from `SYSTEM_PROMPT` and
`SYSTEM_PROMPT_EVOLUTION` (which live in `src/agent/agent.ts`).

**Rationale:** The import prompt serves a completely different task (one-shot
chart generation, not agent co-composition or autopilot evolution). Keeping it
in the same file as the other system prompts would make the file harder to read
and the prompts harder to evolve independently.

### D2 — `IMPORT_SYSTEM_PROMPT` specifies `ImportSessionInputSchema` as the output contract

**Decision:** The prompt documents the exact JSON shape the model must return,
mirroring `ImportSessionInputSchema`:

```
{
  "songTitle": "<string>",
  "artist": "<string>",
  "bpm": <int 40–280>,
  "key": "<C|C#|D|D#|E|F|F#|G|G#|A|A#|B>",
  "mode": "<major|minor|dorian|phrygian|lydian|mixolydian|locrian|harmonic:minor>",
  "sections": [
    {
      "label": "<Intro|Verso|Estribillo|etc.>",
      "chords": [
        { "root": "<note>", "quality": "<maj|min|dim|aug|pow>", "bars": <1–8> }
      ]
    }
  ]
}
```

All 5 quality values (including `pow` for power chords — common in rock/metal)
and all 8 mode values are listed explicitly.

**Rationale:** The model must produce output that passes `ImportSessionInputSchema.safeParse`
without any pre-processing transformation. Embedding the exact schema shape in
the prompt is the most reliable way to achieve this — the model has the contract
inline and does not need to infer it from its training data.

### D3 — Unknown-song response convention: `{ "error": "..." }`

**Decision:** The prompt instructs the model: if it does not know the song or
has insufficient information to generate a precise chart, it must respond with
`{ "error": "Canción desconocida" }` rather than hallucinating a chart.

**Detection:** `ImportSessionInputSchema.safeParse({ "error": "..." })` returns
`success: false` because `"error"` is not a valid `ImportSessionInput` field.
The `sendImport` function returns `{ type: 'error', message: '...' }` on
`safeParse` failure, and the UI surfaces the error without calling `importSession`.

**Rationale:** Hallucinated charts (wrong BPM, invented chords) are worse than
no chart. A clear "I don't know this song" response lets the user rephrase the
query or try a different model. The safeParse failure path handles this
gracefully with no special-case code.

### D4 — `max_tokens = 600` for the import call

**Decision:** The import call uses `max_tokens = 600`.

**Rationale (from inventory section c):** A typical `ImportSessionInput` (6–8
sections × 6–8 chords) is ≈ 350–480 tokens of JSON. 600 provides headroom for
larger songs (8 sections × 8 chords ≈ 580 tokens) and any model preamble/fence
without risking truncation. `sendEvolution` uses 2000 tokens because it requests
a multi-step plan; the import chart is a single compact JSON object with no
reasoning trace needed.

### D5 — `sendImport` reuses `providers.ts`/`agent.ts` module-level state

**Decision:** `sendImport` reads `agentProvider`, `agentModel`, and
`PROVIDERS[agentProvider]` from `agent.ts`/`providers.ts`. It calls
`loadApiKey(agentProvider)` for the API key. No new localStorage keys,
no new HTTP client, no new authentication pattern.

**Rationale:** The existing provider adapter pattern already supports all four
providers (Anthropic, OpenRouter, Gemini, OpenAI) with their correct headers,
body formats, and response parsers. Reusing it is the zero-cost path and ensures
import works with any provider the user has configured.

### D6 — JSON fence → brace extraction copied from `tryParseSkill`

**Decision:** `sendImport` uses the same two-step extraction logic as
`tryParseSkill` in `agent.ts` (lines 576–587): (1) try a ` ```json ` fence;
(2) fall back to the outermost `{ … }` span. The `normalizeEuclidStrings` step
is NOT applied (the import schema has no euclid sub-objects).

The extraction logic is exported as `extractJsonFromText(txt: string): string | null`
for testability in isolation. This makes the logic unit-testable without mocking
`fetch`.

**Rationale:** Copying a ~10-line extraction block is simpler than adding a new
export to `agent.ts` and creating a shared dependency between the agent module
and the import module. The two extraction contexts are independent.

### D7 — OD-5: name-only query for Phase 03; YouTube oEmbed deferred

**Decision:** The `query` parameter to `sendImport` is a plain string (e.g.,
`"ONE by Metallica"`). The function does not detect URLs or call any oEmbed
endpoint. URL detection and YouTube oEmbed resolution are deferred to Phase 04
as a self-contained add-on.

**Rationale:** URL resolution adds 3 error paths (network failure, private
video, non-YouTube URL) and a second async step for marginal MVP gain. The
name-only path validates the LLM-native chart-sourcing end-to-end without added
complexity. The `query` parameter is typed as `string`, so Phase 04 can add
URL detection before calling `sendImport` without changing `sendImport`'s
signature.

---

## Consequences

### Files created in Phase 03 step 03.2

| File | Nature |
|---|---|
| `docs/adr/0028-import-system-prompt-chart-sourcing.md` | This ADR |
| `src/agent/import-prompt.ts` | New file: `IMPORT_SYSTEM_PROMPT` constant (Spanish, includes full schema shape, all 5 qualities, all 8 modes, unknown-song `{ "error": ... }` convention) |
| `src/agent/import-agent.ts` | New file: `ImportSendResult` discriminated union, `extractJsonFromText` helper, `sendImport` function |
| `tests/song-import/import-agent.test.ts` | New file: unit tests for `extractJsonFromText`, `ImportSessionInputSchema.safeParse`, type-level `ImportSendResult` checks |

### Invariants preserved

- **No new npm dependencies:** `fetch` is native; `zod` is already pinned
  at `3.23.8` in `package.json`.
- **No keys/API in the repo:** `sendImport` reads the key from `localStorage`
  via `loadApiKey(agentProvider)`. The key is never logged or exposed.
- **AGPL-3.0 header:** Present in both new files.
- **`src/core/**` purity:** `import-agent.ts` lives in `src/agent/` and
  imports from `providers.ts`, `agent.ts`, `import-prompt.ts`, and
  `import-session.ts` — not from `src/core/**`. `src/core/**` is not modified.

### Future compatibility

- **If the prompt needs tuning:** Edit `IMPORT_SYSTEM_PROMPT` in
  `import-prompt.ts`. No schema changes required unless the JSON shape changes.
- **If the input schema changes:** Bump `IMPORT_SCHEMA_VERSION` in
  `import-session.ts` and update the schema shape documented in
  `IMPORT_SYSTEM_PROMPT`. Both files have separate versioning.
- **If YouTube/oEmbed is added (Phase 04):** Add URL detection before calling
  `sendImport` in the UI component. `sendImport` itself does not change.
- **If scraping is added (future initiative):** It populates an
  `ImportSessionInput` object and calls `importSession()` directly — bypassing
  `sendImport` entirely. The two sourcing paths converge at the
  `importSession()` boundary (ADR 0026 D3).

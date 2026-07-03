<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Inventory — Song-Import: Import UI + `applyImportSession` + LLM Chart Sourcing

**Step:** 03.1 — Read-only inventory  
**Date:** 2026-07-03  
**Branch:** `song-import/phase-02`  
**Status:** STOP — awaiting Pilot resolution of OD-4, OD-5, OD-6 before step 03.2 can begin.

> Note: OD-4, OD-5, and OD-6 are already resolved in `docs/song-import/decisions.md` (recorded by the Pilot on 2026-07-03 during Phase 03 scoping). This inventory records the findings to support implementation in step 03.2 and confirms no contradictions with those decisions.

---

## (a) `applyLoadedSession` gap audit

### Actual location

The phase file estimated the gap at lines 2005–2011. The **actual lines** in `src/state/session.ts` are **2005–2011** — the estimate is correct.

### Verbatim reproduction (lines 2005–2011)

```typescript
  const newBlocks = saved.composition.blocks.map((b) => ({
    id: 'b' + _blkSeq++,
    name: b.name,
    type: b.type,
    code: b.code,
    bars: b.bars,
  }));
```

### Gap confirmation

`b.label` is **not carried through**. The spread builds an object with only `id`, `name`, `type`, `code`, and `bars`. The optional `label` field introduced in Phase 01 (`SavedBlockSchema` line 289: `label: z.string().optional()`) is silently dropped. All blocks produced by `importSession` carry `label` — so without this fix every import will produce composition timeline blocks with no section marker.

### Exact fix

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

### Completeness check — `SavedBlockSchema` fields vs what `applyLoadedSession` copies

`SavedBlockSchema` (lines 281–290 of `src/lib/persistence.ts`) has:

| Field | `SavedBlockSchema` | Copied by `applyLoadedSession`? | Notes |
|---|---|---|---|
| `name` | `z.string().max(100)` | Yes | line 2007 |
| `type` | `z.enum([...])` | Yes | line 2008 |
| `code` | `z.string()` | Yes | line 2009 |
| `bars` | `z.number().int().min(1).max(64)` | Yes | line 2010 |
| `snapshot` | `SavedBlockSnapshotSchema.optional()` | **No** — intentionally omitted | `snapshot` is a captured-at-save-time blob used by the editable-composition feature. It is ephemeral/optional and the runtime `Block` type does not carry `snapshot`. This is by design (ADR 0020 D5: snapshot is read only when _opening_ a block from the timeline). No gap here. |
| `label` | `z.string().optional()` | **No** — the gap | Introduced Phase 01; the runtime `Block` type carries `label?: string`. This is the fix target. |

No other fields are missing. `snapshot` is correctly omitted (it is not part of the runtime `Block` type). Only `label` is a genuine gap.

### Non-breaking confirmation

Pre-Phase-01 saved sessions have no `label` field on their blocks — `b.label` will be `undefined` for those objects. The conditional spread `...(b.label !== undefined ? { label: b.label } : {})` produces an empty spread for `undefined`, so the object is identical to the pre-fix output. The fix is non-breaking.

---

## (b) `applyImportSession` design

### Function signature

```typescript
export function applyImportSession(saved: SavedSession): void
```

### Body (pseudocode)

```typescript
export function applyImportSession(saved: SavedSession): void {
  applyLoadedSession(saved);
}
```

That is the complete body. It is a one-line delegation with no additional logic.

### Location

`src/agent/apply.ts` — added as a new export at the bottom of the file, after the existing `getSessionState` export (line 378 in the current file). The existing file already imports from `'svelte/store'` and from `'../state/session.js'`, but **`applyLoadedSession` is NOT currently imported** in `apply.ts`. The file currently imports `sessionStore`, `clampBars`, `addBlock`, `renameBlock`, `addBlockAsNewTrack`, and `setLastRecipeApplied` from `'../state/session.js'`. Step 03.2 must add `applyLoadedSession` to that import set.

### Type imports needed

- `SavedSession` — imported from `'../lib/persistence.js'`. This type is NOT currently imported in `apply.ts`. Step 03.2 must add: `import type { SavedSession } from '../lib/persistence.js';`
- `applyLoadedSession` — imported from `'../state/session.js'`. Must be added to the existing named-import line.

### Store action audit

`applyImportSession` must NOT call `setBpm`, `setHarmonyKey`, or any other store action directly. `applyLoadedSession` handles all store updates atomically in a single `sessionStore.update(...)` call (line 2024 of `session.ts`), setting `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, `composition`, `nowPlaying`, and `lastRecipeApplied` in one write. `applyImportSession` delegates entirely — zero additional store writes.

### Audio safety

`applyImportSession` does not touch the audio engine. The session is loaded but not played. The user presses Play (per OD-6 + guardrails: audio starts only after a user gesture).

---

## (c) LLM call pattern audit

### `sendEvolution` fetch trace (lines 426–441 of `src/agent/agent.ts`)

```typescript
const res = await fetch(provider.url, {
  method: 'POST',
  headers: provider.headers(key),
  body: JSON.stringify(
    provider.body(
      model,
      SYSTEM_PROMPT_EVOLUTION,
      [{ role: 'user', content: userMessage }],
      2000
    )
  ),
});
const data: unknown = await res.json();
```

Key observations:
1. `provider = PROVIDERS[agentProvider]` — reads the current provider from the module-level `agentProvider` variable.
2. `key = loadApiKey(agentProvider)` — reads from localStorage.
3. `model = agentModel || provider.defaultModel` — reads the module-level `agentModel`, falling back to the provider default.
4. The call is **one-shot** — a single user message, no `chatHistory` involved.
5. `maxTokens` is passed as the 4th arg to `provider.body(...)`.

### Import call conformity

The import call follows exactly this pattern, substituting:
- `SYSTEM_PROMPT_EVOLUTION` → `IMPORT_SYSTEM_PROMPT`
- `userMessage` (complex JSON) → `query` (the song name string, e.g. `"ONE by Metallica"`)
- `2000` → `600` (see `max_tokens` recommendation below)

The import call is cleaner than `sendEvolution` because it has no state snapshot to build and no `chatHistory` — just a single user string.

### `max_tokens` recommendation

`600`. Rationale:
- A fully-fleshed `ImportSessionInput` for a song with 6–8 sections and 6–8 chords per section is approximately 350–480 tokens of JSON.
- The phase file's estimate of 300–500 tokens for the chart JSON is confirmed by the golden fixture (Metallica "ONE", 3 sections, 14 chords total ≈ 280 tokens).
- 600 provides headroom for a larger song (up to ~8 sections × 8 chords) and a potential fence/preamble from the model without risking truncation.
- For reference, `sendEvolution` uses 2000 because it requests a multi-step plan; the import chart is a single compact JSON object with no reasoning trace needed.

### Provider state reads

- `agentProvider` — module-level variable in `agent.ts`, exported via `setProvider`/`agentProvider`. `AgentPanel.svelte` imports it directly (line 43: `agentProvider`).
- `loadApiKey(agentProvider)` — `loadApiKey` is in `providers.ts` (exported, line 220). The correct call is `loadApiKey(agentProvider)`.
- `PROVIDERS[agentProvider]` — the correct adapter read. Returns the provider config with `.url`, `.headers(key)`, `.body(model, system, msgs, maxTokens)`, and `.parse(data)`.

### Provider-level error handling pattern (from `sendEvolution` lines 444–476)

1. Check `!res.ok` → return an error result.
2. Check `data.error` → return an error result.
3. Check `!txt` (empty response) → return an error result.
4. Catch network/JSON-parse exception.

The import call adopts all four paths, returning `{ type: 'error', message: string }` for each failure mode.

---

## (d) JSON extraction and validation path

### `tryParseSkill` fence → brace logic (lines 574–602 of `src/agent/agent.ts`)

```typescript
// Step 1: try ```json fence (prototype line 1727)
let jsonStr: string | null = null;
const fence = /```json\s*([\s\S]*?)```/i.exec(txt);
if (fence) {
  jsonStr = fence[1];
} else {
  // Step 2: outermost { … } span (prototype lines 1729)
  const a = txt.indexOf('{');
  const b = txt.lastIndexOf('}');
  if (a >= 0 && b > a) jsonStr = txt.slice(a, b + 1);
}

if (!jsonStr) return null;
```

Then `JSON.parse(jsonStr)`, followed by `normalizeEuclidStrings(raw)` (import-specific: skip `normalizeEuclidStrings` — that is only needed for rhythm specs that contain euclid string shortcuts), then `AgentOutputSchema.safeParse(raw)`.

### Reuse strategy for the import call

The fence → brace extraction block (lines 576–586) can be **copied verbatim** into `sendImport`. It has no coupling to `AgentOutput` — it operates purely on a raw string. The `normalizeEuclidStrings` call is NOT needed for import (the chart JSON has no euclid sub-objects).

Alternatively, the extraction block could be extracted to a shared helper in `agent.ts` (e.g., `extractJsonFromText(txt: string): string | null`) and imported by both `agent.ts`/`sendImport`. However, since `sendImport` lives in a separate file (`import-agent.ts`) and the extraction is only ~10 lines, copying it is simpler and avoids adding an export to `agent.ts`. The Dev should copy it for Phase 03.

### Two-step validation path

```
1. Extract JSON string: fence → brace fallback (copy from tryParseSkill lines 576–586)
2. JSON.parse(jsonStr)  — throws on syntax error
3. ImportSessionInputSchema.safeParse(JSON.parse(jsonStr))
   → success: { type: 'ok', input: result.data }
   → failure: { type: 'error', message: 'El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción.' }
```

### `ImportSessionInputSchema` export confirmation

`ImportSessionInputSchema` is exported from `src/agent/import-session.ts` (line 84: `export const ImportSessionInputSchema = z.object({ ... })`). It is also re-exported alongside `ImportSessionInput` (type, line 95). The import in `import-agent.ts` is:

```typescript
import { ImportSessionInputSchema } from './import-session.js';
import type { ImportSessionInput } from './import-session.js';
```

### Error surfacing plan

Any failure at any step (no JSON found, `JSON.parse` throws, `safeParse` returns `success: false`) returns:
```typescript
{ type: 'error', message: 'El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción.' }
```

No automatic retry. The user retries manually by clicking the button again.

---

## (e) UI placement decision

### Panel structure reading (`AgentPanel.svelte` lines 1–100)

`AgentPanel.svelte` is a large, self-contained component (~100+ lines of script, significant HTML). It manages:
- Its own `open`/`close` state (local `let open = false`, line 52).
- A provider/model/key configuration section (lines 61–95).
- A chat log (messages array, `{#each}` loop in HTML).
- Quick prompts, autofix, and autopilot subsections.
- It imports `agentProvider`, `agentModel`, `setProvider`, `setModel` from `agent.js` directly (lines 39–45), and `loadApiKey`, `saveApiKey`, `PROVIDERS` from `providers.js` (line 46).

`PersistencePanel.svelte` (lines 1–110) is a standalone component with its own `open`/`close` state (line 20), mounted unconditionally in `App.svelte` (line 651: `<PersistencePanel />`). It imports `applyLoadedSession` directly from `session.js` (line 9). UX precedent: `handleLoad` (line 47) calls `applyLoadedSession(saved)` with no modal, no warning — just silent replace.

`App.svelte` mounts panel-type components outside `#stage` (lines 645, 651):
```
<AgentPanel />
<PersistencePanel />
```

### Option analysis

**Option (i) — Subsection inside `AgentPanel.svelte`:**
- Pros: zero new file; `agentProvider`, `agentModel`, `loadApiKey`, `PROVIDERS` are already in scope.
- Cons: `AgentPanel.svelte` is already large; import UI is conceptually a distinct user journey from the agent chat flow; mixing them reduces discoverability.

**Option (ii) — New `src/ui/ImportSong.svelte` (or `ImportPanel.svelte`) mounted in `App.svelte`:**
- Pros: feature-of-first-class (Pilot decision in `decisions.md`: "El campo de import vive en un componente nuevo dedicado... Feature de primera clase con foco propio."); clean separation from the agent chat; mounted alongside `<AgentPanel />` and `<PersistencePanel />`; will require importing `agentProvider`, `loadApiKey`, `PROVIDERS` from their source files — a small but non-zero wiring cost.
- Cons: one additional file; needs to read `agentProvider`/`agentModel` from `agent.ts` (same import as `AgentPanel` uses — no new pattern).

### Recommendation

**Option (ii) — New standalone `src/ui/ImportSong.svelte` component, mounted in `App.svelte`.**

Rationale: The Pilot has already recorded this decision in `docs/song-import/decisions.md` ("Ubicación de la UI de import: componente `ImportSong` dedicado" — "Feature de primera clase con foco propio"). This inventory confirms Option (ii) is architecturally straightforward: the new component imports `agentProvider`, `agentModel` from `agent.ts` and `loadApiKey`, `PROVIDERS` from `providers.ts` — the same pattern already used by `AgentPanel.svelte`. It is mounted alongside `<AgentPanel />` in `App.svelte`.

---

## (f) Exhaustiveness / dependency audit

### Files to CREATE in steps 03.2 and 03.3

| File | Step | Purpose |
|---|---|---|
| `src/agent/import-prompt.ts` | 03.2 | `IMPORT_SYSTEM_PROMPT` constant — the system prompt for the one-shot LLM chart call |
| `src/agent/import-agent.ts` | 03.2 | `sendImport(query: string): Promise<ImportSendResult>` — the LLM call + fence→brace + safeParse |
| `src/ui/ImportSong.svelte` | 03.3 | Import UI component — song name field, submit button, status/error feedback |
| `tests/song-import/import-agent.test.ts` | 03.2 | Unit tests for JSON extraction logic and `ImportSessionInputSchema.safeParse` in isolation |

### Files to MODIFY in steps 03.2 and 03.3

| File | Step | Change |
|---|---|---|
| `src/agent/apply.ts` | 03.2 | Add `import type { SavedSession }` from persistence, add `applyLoadedSession` to session import, add `applyImportSession` export at bottom |
| `src/state/session.ts` | 03.2 | Add `b.label` carry-through in `applyLoadedSession` (lines 2005–2011) — one-line conditional spread |
| `src/app/App.svelte` | 03.3 | Mount `<ImportSong />` alongside `<AgentPanel />` and `<PersistencePanel />` |
| `docs/song-import/handoffs/phase-03-handoff.md` | 03.2, 03.3, 03.4 | Append step handoff entries per template |

### New npm dependencies

None. All capabilities needed are already present:
- `zod` — already in `package.json` (version `3.23.8`, pinned, no caret).
- `fetch` — native browser API, already used in `agent.ts`.
- `svelte/store` — already imported in `apply.ts`.
- `ImportSessionInputSchema` — already exported from `import-session.ts`.

### `zod` confirmation

`package.json` dependency: `"zod": "3.23.8"` — confirmed present, pinned exact version, no `^` or `~`.

### `tests/song-import/` confirmation

Directory exists. Current contents:
- `tests/song-import/block-label.test.ts` (Phase 01)
- `tests/song-import/pow-quality.test.ts` (Phase 01)
- `tests/song-import/import-session.test.ts` (Phase 02 — golden fixture, 25 tests)

Step 03.2 adds `tests/song-import/import-agent.test.ts`.

### ADR triggers for step 03.2

Per phase file §ADR Triggers:
- **ADR 0027** — `applyImportSession` and session-replace behavior (OD-6). OD-6 is resolved as Option A (replace, per `decisions.md`). An ADR documenting the replace-not-merge decision and the "Esta acción reemplazará tu sesión actual" UX pattern should be written at or before step 03.3.
- **ADR 0028** — `IMPORT_SYSTEM_PROMPT` and chart-sourcing contract (OD-4). OD-4 is resolved as Option A (LLM-native, per `decisions.md`). An ADR documenting the prompt design, the `ImportSessionInputSchema`-as-output-contract, and the "unknown song → `{ error: ... }` response" convention should be written alongside `import-prompt.ts` in step 03.2.

Both ADRs should be written in step 03.2 (when `import-prompt.ts` and `applyImportSession` are created).

---

## Open Decision Status

| Decision | Status | Resolution |
|---|---|---|
| OD-4 — Chart-sourcing mechanism | **Resolved** in `decisions.md` | Option A (LLM-native). Implementation proceeds in step 03.2. |
| OD-5 — YouTube link handling | **Resolved** in `decisions.md` | Option A (name-only for Phase 03). URLs deferred to Phase 04. |
| OD-6 — Import replaces vs merges | **Resolved** in `decisions.md` | Option A (replace — delegates to `applyLoadedSession`). UI warning required. |
| UI placement | **Resolved** in `decisions.md` | New standalone `ImportSong` component (not a subsection of `AgentPanel`). |

All four decisions are resolved. Step 03.2 may begin after Pilot confirms this inventory at the checkpoint.

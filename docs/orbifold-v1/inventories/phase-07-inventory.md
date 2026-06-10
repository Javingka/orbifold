# Phase 07 Inventory — Persistence and Sharing

**Created:** 2026-06-09
**Phase file:** `docs/orbifold-v1/phases/phase-07.md`

---

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/lib/persistence.ts` | Empty stub (AGPL header + `export {}`) | Full implementation: Zod schema, serialize/deserialize, encode/decode, localStorage helpers |
| `src/state/session.ts` | Session store + transport actions | Add `applyLoadedSession(saved: SavedSession): void` export; uses internal `_blkSeq`/`_trkSeq` |
| `tests/persistence.test.ts` | Does not exist | New file — ≥12 unit tests for schema, serialize, deserialize, roundtrip, localStorage, encode/decode, applyLoadedSession |
| `src/app/App.svelte` | Root Svelte component (init, layout, onMount) | Step 07.3: add URL hash restore (`#session=<encoded>`) in `onMount` |
| `src/ui/PersistencePanel.svelte` | Does not exist | Step 07.4: save/load/share panel UI |
| `src/app/app.css` | Global CSS token sheet | Step 07.4: append persistence CSS (`#sessionsBtn`, `#sessionsPanel`, `.sess-*`, `.share-url-row`) |
| `docs/orbifold-v1/handoffs/phase-07-handoff.md` | Does not exist before this step | Created in step 07.1; appended by each subsequent step |

**Total files: 7.** Within the 15-file limit.

---

## Existing behavior to preserve

- All 153 existing tests pass without change (`tests/euclid.test.ts`, `voice-leading.test.ts`, `codegen.test.ts`, `tonnetz.test.ts`, `session.test.ts`, `schema.test.ts`).
- All A-01 through A-06 behaviors intact: Tonnetz, rhythm, session transport, composition drawer, agent panel, all transport sources.
- `Chord.cx`/`Chord.cy` remain optional fields on the runtime `Chord` type (they are NOT removed from the type) — they are simply not serialized. `findRenderTriForChord` fallback (established Phase 03) handles loaded sessions that lack these fields.
- Block and track IDs continue to be assigned by `_blkSeq`/`_trkSeq` on page load — ADR 0009 invariant unchanged.
- Composition timing state (`_compState`, `_compStart`, `_compPausedBars`) in `src/state/composition.ts` is never touched — ADR 0008 invariant unchanged.
- `pnpm build` continues to exit 0 (pre-existing chunk size and dynamic-import warnings are non-blocking).

---

## New behavior to introduce

- User can save the current session with a name to `localStorage`.
- User can list, load, and delete named saved sessions from a panel.
- User can generate a shareable URL (`#session=<base64-encoded JSON>`) and copy it to the clipboard.
- Opening a URL with `#session=<encoded>` reconstructs bpm, harmony, rhythm, and composition from the hash; the hash is cleared from the address bar after load.
- Reconstructed sessions receive fresh block/track IDs (ADR 0009: not read from saved JSON).
- `nowPlaying` is reset to `{ label: null, source: null }` on any session load.

---

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-07-01 | `SavedSessionSchema` validates well-formed payloads; rejects wrong version and out-of-range bpm; strips cx/cy silently | unit | `tests/persistence.test.ts` | 07.2 |
| A-07-02 | `serializeSession` excludes nowPlaying, cx/cy, Block.id, Track.id; uses blockIndex for track refs | unit | `tests/persistence.test.ts` | 07.2 |
| A-07-03 | Serialize → deserialize → applyLoadedSession roundtrip restores all musical fields with fresh IDs | unit | `tests/persistence.test.ts` | 07.2 |
| A-07-04 | `saveSession` / `listSavedSessions` / `loadSavedSession` / `deleteSession` localStorage roundtrip | unit | `tests/persistence.test.ts` | 07.2 |
| A-07-05 | `encodeSession` → `decodeSession` roundtrip equals input | unit | `tests/persistence.test.ts` | 07.2 |
| A-07-06 | Opening URL with `#session=<encoded>` reconstructs session; hash cleared from address bar | live-system | smoke test 07.5 | 07.3 / confirmed 07.5 |
| A-07-07 | Sesiones panel: save, list, load, delete | live-system | smoke test 07.5 | 07.4 / confirmed 07.5 |
| A-07-08 | "📤 Compartir URL" copies URL with encoded state; shows "✓ Copiado" feedback | live-system | smoke test 07.5 | 07.4 / confirmed 07.5 |
| A-07-09 | All A-06 behaviors intact after persistence layer added | unit + live-system | existing tests + smoke 07.5 | 07.4 / confirmed 07.5 |
| A-07-10 | tsc/lint/test (≥165)/build all exit 0 | proxy:static-analysis + unit | gate commands | 07.5 |

---

## Tests to add or modify

- `tests/persistence.test.ts` — new file, ≥12 test cases covering:
  - `SavedSessionSchema.parse` with valid full payload → succeeds
  - `SavedSessionSchema.parse` with wrong version (2) → fails
  - `SavedSessionSchema.parse` with out-of-range bpm → fails
  - `SavedSessionSchema.parse` with cx/cy on chord → succeeds; parsed chord has no cx/cy property (Zod strips unknown fields)
  - `serializeSession`: nowPlaying excluded; chords have no cx/cy; block IDs excluded; track refs use blockIndex
  - `serializeSession` + `deserializeSession` roundtrip for bpm/harmony/rhythm/composition
  - `encodeSession` + `decodeSession` roundtrip equals input SavedSession
  - `applyLoadedSession`: blocks get fresh IDs (`b1`, `b2`…), tracks get fresh IDs (`t1`…), track blockId refs match new block IDs
  - `saveSession` + `listSavedSessions` + `loadSavedSession` roundtrip (mock localStorage)
  - `deleteSession` removes entry from list

No existing test files are modified.

---

## Open decisions surfaced

No blocking decisions — proceed to step 07.2 after Pilot checkpoint 1 approval.

Two ADR triggers from phase-07.md were evaluated during inventory:

- **URL encoding format** (ADR trigger at step 07.2): The proposed `btoa(encodeURIComponent(JSON.stringify(...)))` approach requires no new dependency. `btoa`/`atob` are available as Node.js globals (Node 22.12.0 in use; both available since Node 16). No compression library is needed for MVP. If URL length becomes a practical problem during step 07.2 (compositions with many large blocks exceeding ~8 KB encoded), the Dev must surface an ADR before committing. This is not a blocking pre-decision.

- **Session list storage key schema** (ADR trigger at step 07.2): Proposed keys are `orbifold.session.<name>` and `orbifold.sessionList`. Phase 06 agent keys are `orbifold.apiKey.anthropic` / `orbifold.apiKey.openrouter`. Sub-namespaces `session` / `sessionList` vs `apiKey` are distinct — no collision found. Proceed without ADR.

---

## Source-of-truth check

`src/lib/persistence.ts` consumes `SessionState`, `Chord`, `HarmonyState`, `RhythmState`, `Block`, `Track`, `Composition` — all produced by `src/state/session.ts` and `src/core/{rhythm,composition}/`. This is an intra-app relationship (no external backend).

**Shape alignment verified:**

| Consumer (persistence.ts planned schema) | Producer (session.ts / model.ts) | Aligned? |
|---|---|---|
| `SavedChordSchema`: `rootPc`, `qual`, `gain` | `Chord`: `rootPc: number`, `qual: Quality`, `gain: number`, `cx?: number`, `cy?: number` | Yes — cx/cy excluded per Decisions Register |
| `SavedHarmonySchema`: `root`, `mode` (enum 8 modes), `octave`, `progression[]` | `HarmonyState`: `root: number`, `mode: string`, `octave: number`, `progression: Chord[]` | Yes — mode enum covers all 8 values from ORBIFOLD_KICKOFF.md §5 |
| `SavedRhythmLayerSchema`: `sound`, `steps[16]`, `euclid?`, `muted?`, `solo?` | `RhythmLayer`: `sound: Sound`, `steps: number[]`, `euclid?: string`, `muted?: boolean`, `solo?: boolean` | Yes |
| `SavedBlockSchema`: `name`, `type`, `code`, `bars` (no `id`) | `Block`: `id: string`, `name: string`, `type`, `code: string`, `bars: number` | Yes — `id` excluded per ADR 0009 |
| `SavedBlockRefSchema`: `blockIndex: number`, `bars: number` | `Track.blocks[k]`: `{ blockId: string; bars: number }` | Aligned by design — serializer converts blockId→blockIndex; applyLoadedSession reverses |
| `SavedTrackSchema`: `{ blockRefs[] }` (no `id`) | `Track`: `id: string`, `blocks: { blockId, bars }[]` | Yes — `id` excluded per ADR 0009 |
| `SavedSessionSchema`: `version`, `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, `composition` | `SessionState` (all fields above + `nowPlaying`) | Yes — `nowPlaying` excluded (ephemeral) |

**Critical serialization contract** (Dev must implement exactly):
- `serializeSession`: for each `Track.blocks[k]`, look up the block's index in `state.composition.blocks` array. Store as `blockIndex`, not `blockId`.
- `applyLoadedSession`: for each `SavedTrack.blockRefs[k]`, resolve `blockRefs[k].blockIndex → newBlocks[blockIndex].id` using the newly assigned IDs from `_blkSeq`/`_trkSeq`. If `blockIndex` is out of range (corrupt data), the block ref must be skipped gracefully.

**`_blkSeq` / `_trkSeq` location confirmed:** `src/state/session.ts` lines 714–715 — module-level `let` variables, not exported, not in `SessionState`. The proposed `applyLoadedSession` function must live in `session.ts` (same module) to access them directly.

---

## New dependencies needed

None. `zod` is already installed (`3.23.8`, exact pin, per Decisions Register). `btoa`/`atob` are Node.js globals in Node 16+. No compression library needed for MVP.

---

## Environment, CI, build, or deployment changes needed

None.

---

## Decisions Register check

| Entry | Relevance to Phase 07 |
|---|---|
| **Exact dependency version pinning** | No new dependencies in Phase 07. Any hypothetical future addition must use exact versions. |
| **`Chord.cx / Chord.cy` — render hints ephemeral** | Directly applies: `SavedChordSchema` does not include `cx`/`cy`; `serializeSession` omits them; Zod strips any stray fields on load. |

ADR 0009 (ephemeral ID counters) and ADR 0008 (composition timing state module) are the architectural constraints shaping the persistence design — both respected as described above.

---

## Project-specific verification tables

- **Prototype parity:** Not applicable to Phase 07. Per phase-07.md: "the prototype has no save/load or URL sharing feature — this phase is new functionality, not a port." The prototype-parity checklist item does not apply.
- **Contract Verification / Fixtures from backend:** Not applicable (no backend — static app).
- **Flag-off reversibility:** Not applicable (no feature flag in this phase).

---

## Risks specific to this phase

- **URL length:** Base64-encoded JSON with many composition blocks could produce URLs > 8 KB. Modern browsers support URLs up to ~2 MB, but some URL-shortening services and email clients have lower limits. This risk is conditional and low for MVP (the acceptance test uses one composition). If triggered during step 07.2 implementation, the Dev surfaces an ADR (LZ-string compression alternative).
- **`applyLoadedSession` out-of-range blockIndex:** If a saved track contains a `blockIndex` referencing a position that doesn't exist in the saved blocks array (corrupt or truncated JSON), the load must not throw. The Zod schema's `blockIndex: z.number().int().min(0)` validates the value is non-negative, but does not bound it to the blocks array length. The Dev must add a guard in `applyLoadedSession` to skip refs where `blockIndex >= newBlocks.length`.

---

## Pilot review

The Pilot approves before step 07.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization.

# Phase 07 Handoff — Persistence and Sharing

---

## Step 07.1 — Inventory

**Date:** 2026-06-09
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Read all required files: `CLAUDE.md`, `references/dev-role.md`, `references/inventory-template.md`, `references/handoff-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-07.md`, `docs/orbifold-v1/handoffs/phase-06-handoff.md` (completion section).
- Read `ORBIFOLD_KICKOFF.md §5–§10`.
- Read all 9 ADRs in `docs/adr/` — focused on ADR 0008 (composition timing state excluded from persistence) and ADR 0009 (ID counters ephemeral; IDs re-assigned at load time).
- Read `src/lib/persistence.ts` stub — empty stub with AGPL header and `export {}`.
- Read `src/state/session.ts` — confirmed `_blkSeq` and `_trkSeq` are module-level `let` variables (lines 714–715), not exported, not in `SessionState`. Confirmed `SessionState`, `Chord`, `HarmonyState`, `RhythmState` types.
- Read `src/core/rhythm/layers.ts` — confirmed `RhythmLayer` type, `Sound` type (9 values).
- Read `src/core/composition/model.ts` — confirmed `Block`, `Track`, `Composition` types; `Track.blocks` uses `blockId: string` refs at runtime.
- Confirmed `btoa`/`atob` available as globals in Node 22.12.0 (Node 16+ feature) — no compression dependency needed for MVP.
- Verified localStorage key namespace: `orbifold.session.*` / `orbifold.sessionList` do not collide with Phase 06's `orbifold.apiKey.*` keys.
- Mapped every `SessionState` field to persist / exclude / derive-on-load (see inventory).
- Confirmed `applyLoadedSession(saved: SavedSession): void` export design: must live in `session.ts` to access internal `_blkSeq`/`_trkSeq` directly; takes `SavedSession`, assigns new IDs, rebuilds track blockId refs, calls `sessionStore.update`.
- Flagged out-of-range blockIndex risk and proposed guard in `applyLoadedSession`.
- Produced `docs/orbifold-v1/inventories/phase-07-inventory.md` following inventory template.
- No source code written.

### Files touched

- `docs/orbifold-v1/inventories/phase-07-inventory.md` — created
- `docs/orbifold-v1/handoffs/phase-07-handoff.md` — created (this file)

### Validation evidence (per Acceptance ID)

No Acceptance IDs are touched by this step (inventory step only).

### Routine validations (one-liner each, no transcripts)

No source code written; no build/test/lint runs required for this step.

### Acceptance Coverage Table

No Acceptance IDs touched by this step (inventory step — no source changes).

### Decisions made (if any)

- `applyLoadedSession` must live in `src/state/session.ts` (same module as `_blkSeq`/`_trkSeq`) — the only way to assign fresh IDs without exporting the counters or breaking ADR 0009.
- No compression library needed: `btoa`/`atob` are Node 22 globals; MVP URL length is acceptable.
- No localStorage namespace ADR needed: `orbifold.session.*` and `orbifold.sessionList` prefixes are distinct from `orbifold.apiKey.*`.

### Proposed Decisions Register entries (if any)

None.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- Source code unchanged from Phase 06 completion state.
- All 153 Phase 06 tests still pass.

### Next-step context (only if non-obvious)

- `Track.blocks[k].blockId` in the runtime type maps to `SavedBlockRef.blockIndex` in the saved schema — the serializer must resolve `blockId → index` by looking up the block's position in `state.composition.blocks`. The deserializer rebuilds in the reverse direction inside `applyLoadedSession`.
- `applyLoadedSession` must guard against out-of-range `blockIndex` values (corrupt JSON) to avoid `newBlocks[blockIndex]` being undefined. Skip the ref rather than throw.
- `HarmonyState.mode` is typed as `string` in session.ts; the Zod schema must enumerate all 8 valid modes from ORBIFOLD_KICKOFF.md §5 and reject unknown strings. This means loading a session with a custom mode string will fail validation and return null — intentional, not a bug.
- The `SavedSessionSchema` uses `version: z.literal(1)` — if a future schema version is introduced, a migration path must be designed. Not a Phase 07 concern.

### Planner Review

**Planner Review:** APPROVED on 2026-06-09. Iteration: 1 of 5.
**Next action:** Pilot approval required before step 07.2, reason: inventory step — mandatory Pilot checkpoint before implementation begins.

---

**Terminal commit:** `docs(persistence): Phase 07 step 07.1 — phase-07 inventory`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

---

## Step 07.2 — Session schema, serialize/deserialize, localStorage helpers, and unit tests

**Date:** 2026-06-09
**Commit(s):** (see terminal commit below)
**Iteration:** 1 of 5

### Completed

- Implemented `src/lib/persistence.ts` in full:
  - `SESSION_SCHEMA_VERSION = 1` constant.
  - `SavedSessionSchema` (Zod) and `SavedSession` TypeScript type exported.
  - Sub-schemas: `SavedChordSchema` (rootPc/qual/gain only — cx/cy excluded), `SavedHarmonySchema` (mode enum 8 values), `SavedRhythmLayerSchema` (steps length(16), euclid/muted/solo optional), `SavedRhythmSchema`, `SavedBlockSchema` (no id), `SavedBlockRefSchema` (blockIndex integer), `SavedTrackSchema`, `SavedCompositionSchema`.
  - `serializeSession(state)`: strips nowPlaying, cx/cy from chords, Block.id/Track.id; converts Track.blocks[].blockId → blockIndex by array lookup. Refs with blockId not found in blocks array are silently dropped.
  - `deserializeSession(saved)`: pure function returning `Omit<SessionState, 'nowPlaying'>` with placeholder IDs (`id: ''`) for use in roundtrip tests.
  - `PERSISTENCE_KEY_PREFIX = 'orbifold.session.'`; `SESSION_LIST_KEY = 'orbifold.sessionList'`.
  - `saveSession`, `loadSavedSession`, `listSavedSessions`, `deleteSession` — localStorage helpers with `safeParse` validation on load.
  - `encodeSession`: `btoa(encodeURIComponent(JSON.stringify(...)))`.
  - `decodeSession`: reverse; returns null on any error (parse or schema failure).
- Added `applyLoadedSession(saved: SavedSession): void` to `src/state/session.ts`:
  - Uses module-private `_blkSeq`/`_trkSeq` (ADR 0009) to assign fresh block and track IDs.
  - Guards against out-of-range `blockIndex`: `if (!block) return null`.
  - Rebuilds `Track.blocks[].blockId` from `SavedBlockRef.blockIndex → newBlocks[blockIndex].id`.
  - Calls `sessionStore.update(...)` with fully reconstructed state; `nowPlaying` reset to `{ label: null, source: null }`.
  - Added `import type { SavedSession }` at top of session.ts (type-only import — no circular runtime dep).
- Added `tests/persistence.test.ts`: 27 test cases covering all spec-required scenarios.
- Ran `pnpm exec prettier --write` on both new files to satisfy Prettier formatting.

### Files touched

- `src/lib/persistence.ts` — full implementation (replaces stub)
- `src/state/session.ts` — added `import type { SavedSession }` and `applyLoadedSession` export
- `tests/persistence.test.ts` — new file, 27 test cases
- `docs/orbifold-v1/handoffs/phase-07-handoff.md` — this entry

### Prototype parity citations

Not applicable. Phase 07 is new functionality — the prototype has no save/load or URL sharing feature. Prototype-parity checklist item does not apply (documented in phase-07.md and inventory).

### Validation evidence (per Acceptance ID)

- A-07-01: `tests/persistence.test.ts` `SavedSessionSchema` block — 6 tests: accepts minimal, accepts full, rejects version 2, rejects bpm 39, rejects bpm 281, strips cx/cy from chords. All pass.
- A-07-02: `tests/persistence.test.ts` `serializeSession` block — 5 tests: nowPlaying excluded, cx/cy excluded from chords, block IDs excluded, track refs use blockIndex integers, version = SESSION_SCHEMA_VERSION. All pass.
- A-07-03: `tests/persistence.test.ts` `serialize → deserialize roundtrip` (4 tests) + `applyLoadedSession` (5 tests): roundtrip preserves all musical fields; `applyLoadedSession` assigns fresh IDs and rebuilds blockId refs. All pass.
- A-07-04: `tests/persistence.test.ts` `saveSession / listSavedSessions / loadSavedSession / deleteSession` block — 4 tests: full roundtrip, null for unknown, deleteSession removes, PERSISTENCE_KEY_PREFIX used. All pass.
- A-07-05: `tests/persistence.test.ts` `encodeSession / decodeSession` block — 3 tests: roundtrip equals, null for corrupt, null for invalid schema. All pass.

### Routine validations

- `pnpm exec tsc --noEmit` → 0 errors (no output)
- `pnpm lint` → 0 errors, all files Prettier-clean
- `pnpm test` → 180 passed (153 prior + 27 new ≥ 165 required)

### Acceptance Coverage Table

| Acceptance ID | Required behavior | Test file | Test type | Gap status |
|---|---|---|---|---|
| A-07-01 | `SavedSessionSchema` validates well-formed payload; rejects wrong version, out-of-range bpm; strips cx/cy | `tests/persistence.test.ts` | unit | covered |
| A-07-02 | `serializeSession` excludes nowPlaying, cx/cy, Block.id/Track.id; track refs use blockIndex | `tests/persistence.test.ts` | unit | covered |
| A-07-03 | Serialize → deserialize → applyLoadedSession roundtrip; fresh IDs; blockId refs rebuilt | `tests/persistence.test.ts` | unit | covered |
| A-07-04 | `saveSession`/`listSavedSessions`/`loadSavedSession`/`deleteSession` localStorage roundtrip | `tests/persistence.test.ts` | unit | covered |
| A-07-05 | `encodeSession` → `decodeSession` roundtrip equals input | `tests/persistence.test.ts` | unit | covered |
| A-07-06 | URL `#session=<encoded>` reconstructs session on load; hash cleared | (smoke test 07.5) | live-system | not covered — deferred to 07.3/07.5 |
| A-07-07 | Sesiones panel: save, list, load, delete | (smoke test 07.5) | live-system | not covered — deferred to 07.4/07.5 |
| A-07-08 | "📤 Compartir URL" copies URL; shows "✓ Copiado" feedback | (smoke test 07.5) | live-system | not covered — deferred to 07.4/07.5 |
| A-07-09 | All A-06 behaviors intact | existing tests + smoke 07.5 | unit + live-system | partial — 180 unit tests pass unchanged; live-system confirmed 07.5 |
| A-07-10 | tsc/lint/test(≥165)/build all exit 0 | (gate commands) | proxy:static-analysis + unit | partial — tsc/lint/test confirmed (180 ≥ 165); build confirmed 07.5 |

**Notes on partial coverage:**
- A-07-09: all 153 prior unit tests unchanged (regression-free); live-system portion deferred to 07.5.
- A-07-10: tsc/lint/test confirmed; `pnpm build` deferred to 07.5.

**Proxy disclosures:** A-07-10 uses `proxy:static-analysis` for tsc and lint — direct command invocations whose zero-error exit codes are the evidence.

### Decisions made (if any)

- `import type { SavedSession }` used in session.ts — type-only import erased at runtime, no circular runtime dependency between session.ts and persistence.ts.
- `deserializeSession` returns `Omit<SessionState, 'nowPlaying'>` with placeholder `id: ''` for blocks/tracks; `applyLoadedSession` builds from `SavedSession` directly (not via `deserializeSession`) so IDs are assigned cleanly.
- `HarmonyState.mode` cast as `SavedSession['harmony']['mode']` in `serializeSession` — `mode` is typed as `string` in the runtime store; the cast is intentional and documented. Schema validation at load time ensures only valid mode values survive deserialization.

### Proposed Decisions Register entries (if any)

None. Both ADR triggers evaluated during inventory were resolved without needing new ADRs.

### Blockers resolved during this step (if any)

None.

### Environment state after this step

- 180 tests passing (153 prior + 27 new).
- `src/lib/persistence.ts` fully implemented.
- `src/state/session.ts` gains `applyLoadedSession` export.
- `tests/persistence.test.ts` created with 27 test cases, all green.

### Next-step context (only if non-obvious)

- Step 07.3 reads `decodeSession` and `applyLoadedSession` from their respective modules. Both are exported and ready.
- The URL hash format is `#session=<encoded>` where `encoded = encodeSession(state)`. App.svelte reads `window.location.hash`, strips the `#session=` prefix, and passes the remainder to `decodeSession`.
- After successful load, call `window.history.replaceState(null, '', window.location.pathname)` to strip the hash — this avoids stale session re-load on subsequent refreshes.

### Planner Review

(To be filled by Planner in review mode)

---

**Terminal commit:** `feat(persistence): Phase 07 step 07.2 — session schema, serialize/deserialize, and localStorage helpers`
  - Hash: self-referential — not recorded
  - Note: This is the handoff-update commit. Its hash is not in this list because the list is in the commit itself.

# ADR 0009 — Block/track ID counters: ephemeral module-level variables

- **Status:** Accepted
- **Date:** 2026-06-08
- **Initiative / Phase:** orbifold-v1 / Phase 05 (step 05.2)
- **Deciders:** Pilot (Javier), pre-resolved as OD-1 before step 05.2

## Context

Blocks and tracks in the composition timeline each require a unique string ID. The prototype
uses two module-level counters at line 1933:

```js
let blkSeq = 1, trkSeq = 1;
```

IDs are generated as `'b' + blkSeq++` and `'t' + trkSeq++`. They reset to 1 on every page
reload because the prototype has no session persistence.

Two options were considered for the ported implementation:

- **Option A: Store fields** — add `_blkSeq` / `_trkSeq` as fields inside `SessionState`
  (and thus inside `sessionStore`). Phase 07 would persist these counters to the session JSON.
  On reload, IDs would continue from the saved counter value, guaranteeing globally unique IDs
  across sessions.
- **Option B: Module-level variables** — keep `_blkSeq` / `_trkSeq` as module-level variables
  in `src/state/session.ts`, matching the prototype exactly. Counters are never persisted.
  On page reload they reset to 1. Blocks loaded from a saved session (Phase 07) receive new IDs
  starting from 1, not the original IDs from the saved JSON.

## Decision

`_blkSeq` and `_trkSeq` are **module-level `let` variables** in `src/state/session.ts`,
matching the prototype (line 1933). They are **not** fields in `SessionState` and **not**
persisted in Phase 07 session files.

```ts
let _blkSeq = 1;
let _trkSeq = 1;
```

Block IDs: `'b' + _blkSeq++`. Track IDs: `'t' + _trkSeq++`.

## Consequences

**Positive**
- Exact prototype parity: same counter placement and ID generation scheme.
- No store churn on block/track creation (counter updates are not reactive).
- Phase 07 session files are smaller and simpler — no counter fields to validate or migrate.

**Negative / risk**
- IDs are not stable across reloads. A block with ID `'b3'` in one session and `'b3'` in
  another are unrelated — there is no global uniqueness guarantee.
- **Phase 07 design impact:** When `session.ts` deserializes a saved composition (Phase 07),
  it MUST assign new IDs to the deserialized blocks and tracks using the counter (not read
  IDs from the saved JSON). The saved JSON does not need to store `blockId` values as stable
  references — Phase 07 must use indices or name-based matching for cross-session reference,
  or simply re-generate IDs at load time and rewrite any intra-composition references
  (track `blockId` refs) to match the newly assigned block IDs.
  This constraint must be addressed explicitly in the Phase 07 session persistence design.
- If future work requires stable block IDs across sessions (e.g., for undo history or
  collaboration), this decision must be revisited and IDs migrated to UUIDs or persisted counters.

## Reversibility

Reversible: replacing module-level counters with store fields requires adding `_blkSeq` and
`_trkSeq` to `SessionState`, updating `addBlock` and `addTrack` to read/write via
`sessionStore.update(...)`, and updating Phase 07 schema to include these fields. Block and
track ID strings would remain compatible (`'b<n>'` / `'t<n>'`) — only the persistence
scope changes.

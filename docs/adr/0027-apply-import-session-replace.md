<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0027 — `applyImportSession`: import replaces the current session

- **Status:** Accepted — ratified by Pilot 2026-07-03
- **Date:** 2026-07-03
- **Initiative / Phase:** song-import / Phase 03 (step 03.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 03 of the `song-import` initiative introduces `applyImportSession`, the
store-coupled wrapper that takes the `SavedSession` produced by `importSession()`
and loads it into the live Orbifold session store.

Before implementation, the session-replacement behavior of `applyImportSession`
had to be decided (Open Decision OD-6 raised in the Phase 03 phase file). Two
options were evaluated:

**Option A — Replace:** `applyImportSession` calls `applyLoadedSession`, which
atomically replaces the entire current session (harmony, rhythm, BPM, composition
blocks + tracks). The imported song IS the new session. The UI must warn the user
before calling this function.

**Option B — Merge/Append:** `applyImportSession` appends the imported blocks to
the existing composition (new blocks + new track) while preserving the user's
current groove, harmony, and BPM. Musically useful for a "jam" workflow but
requires new store actions and ambiguous semantics for rhythm/BPM conflict
resolution.

---

## Decision (OD-6 = Option A)

**`applyImportSession` replaces the current session by delegating to
`applyLoadedSession`.**

The function body is a one-line delegation:

```typescript
export function applyImportSession(saved: SavedSession): void {
  applyLoadedSession(saved);
}
```

No additional store actions are called. BPM, harmony, rhythm, and composition
are all replaced atomically by `applyLoadedSession`'s single `sessionStore.update()`
call.

---

## Decisions

### D1 — Delegation to `applyLoadedSession`

**Decision:** `applyImportSession` is a thin wrapper that delegates entirely to
`applyLoadedSession` from `src/state/session.ts`. It does not call `setBpm`,
`setHarmonyKey`, `addBlock`, or any other individual store action.

**Rationale:** `applyLoadedSession` already implements the atomically-correct
session replace: it rebuilds blocks/tracks with fresh IDs, restores harmony
(including the NoteSlot/RestSlot/Chord union), resets ephemeral fields
(`nowPlaying`, `lastRecipeApplied`), and preserves ephemeral render state
(`subview`, `registerMode`) in a single `sessionStore.update()`. Reimplementing
this logic in `applyImportSession` would be duplication with a risk of divergence.

### D2 — UX replacement warning

**Decision:** The import UI must display a persistent warning to the user before
calling `applyImportSession`: "Esta acción reemplazará tu sesión actual." This
warning is visible whenever the import query field is non-empty. The session is
replaced only when the user explicitly submits the form.

**Rationale:** UX precedent — the Persistence Panel's "cargar" button has the
same behavior (calls `applyLoadedSession` directly, replacing the session). The
replacement warning follows the same UX pattern, making the behavior predictable.
No modal is required; a persistent inline warning is sufficient.

### D3 — Audio not started by `applyImportSession`

**Decision:** `applyImportSession` does not touch the audio engine. The session
is loaded into the store but not played. The user presses Play after import.

**Rationale:** Per the project guardrails: "Audio starts only after a user
gesture." `applyLoadedSession` already resets `nowPlaying` to `{ label: null,
source: null }`, which does not trigger Strudel playback. No special handling
is needed.

### D4 — `Block.label` carry-through fix (prerequisite)

**Decision:** Before `applyImportSession` is useful, `applyLoadedSession` in
`src/state/session.ts` must be fixed to carry `b.label` through to `newBlocks`.
This fix is additive and non-breaking: pre-Phase-01 sessions (no `label` field)
produce `b.label === undefined`, and the conditional spread `...(b.label !== undefined
? { label: b.label } : {})` produces an empty spread for those sessions.

**Rationale:** All `importSession()` outputs carry `label` on every block (the
bare section label for the composition timeline display, introduced in Phase 01).
Without the fix, `applyLoadedSession` would silently drop the labels, making the
imported blocks appear in the timeline without section markers — defeating the
purpose of `Block.label`.

### D5 — Merge deferred

**Decision:** The "merge/append" behavior (Option B) is deferred to a future
initiative ("import and jam" workflow). It requires: (a) a new `mergeImportedSession`
store action, (b) a clear specification of BPM/harmony conflict resolution, and
(c) explicit Pilot approval.

**Rationale:** Merge semantics are ambiguous (if the imported session's BPM
differs from the current session's BPM, which wins?). The "import and jam"
use case — import a song's chord structure over the current groove — is a
power-user workflow that expands scope beyond the Phase 03 MVP. Option A ships
the complete Pipeline B journey (name → LLM chart → Orbifold session) and is
directly analogous to the existing "load session" UX.

---

## Consequences

### Files created / modified in Phase 03 step 03.2

| File | Nature |
|---|---|
| `docs/adr/0027-apply-import-session-replace.md` | This ADR |
| `src/agent/apply.ts` | Added `applyImportSession` export at the bottom; added `applyLoadedSession` to named imports from `session.ts`; added `import type { SavedSession }` from `persistence.ts` |
| `src/state/session.ts` | Added `b.label` conditional spread in `applyLoadedSession` (lines 2005–2011) |

### Invariants preserved

- **Session schema unchanged:** `applyLoadedSession` is already tested against
  `SESSION_SCHEMA_VERSION = 7`. No schema bump needed.
- **No audio side-effects:** the replacement is store-only; no Strudel code is
  evaluated until the user explicitly presses Play.
- **Backward compatibility:** pre-Phase-01 sessions (no `label` field) load
  without error and without spurious `label` properties on the runtime blocks
  (conditional spread is non-breaking — X-05 regression test confirms this).

### Future compatibility

- **If merge/append is requested:** Add `mergeImportedSession` to `session.ts`
  with explicit BPM-conflict semantics (proposed: imported BPM wins); create a
  new entry point in `apply.ts`; write a new ADR. Do NOT repurpose
  `applyImportSession`.
- **If `Block.label` schema changes:** Revisit the carry-through logic in
  `applyLoadedSession`; bump `SESSION_SCHEMA_VERSION` if the field becomes
  required.

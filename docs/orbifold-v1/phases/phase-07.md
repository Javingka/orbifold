# Phase 07 — Persistence and Sharing

**Purpose:** Implement `lib/persistence.ts` — versioned session schema, localStorage save/load, URL encoding/decoding — and a UI panel so users can save, restore, and share sessions via a link.
**Gate:** Phase 06 complete and Pilot-approved (all 12 A-06 IDs covered, 153 tests passing, tsc/lint/build all exit 0, main branch clean).
**Expected phase result:** A user can save the current session, reload it from localStorage, generate a shareable URL, and opening that URL in a new tab fully reconstructs the session (bpm, harmony, rhythm, composition).

---

## Step 07.1 — Inventory

PROMPT → Read CLAUDE.md, decisions.md, ORBIFOLD_KICKOFF.md §7–§10, all active ADRs (docs/adr/), the phase-06-handoff.md completion section, the stub at src/lib/persistence.ts, and the runtime types in src/state/session.ts (SessionState, Chord, HarmonyState, RhythmState), src/core/rhythm/layers.ts (RhythmLayer), and src/core/composition/model.ts (Block, Track, Composition). Produce docs/orbifold-v1/inventories/phase-07-inventory.md. Do not write source code.

Implementation requirements:
- Map every field in SessionState to one of: persist, exclude (ephemeral), or derive-on-load.
  - persist: bpm, view, chordMode, harmony.{root,mode,octave,progression[{rootPc,qual,gain}]}, rhythm.layers[{sound,steps,euclid?,muted?,solo?}], composition.{blocks[{name,type,code,bars}], tracks[blockRef-as-index]}.
  - exclude: nowPlaying (ephemeral transport state), Chord.cx / Chord.cy (Register: render hints ephemeral), Block.id / Track.id (ADR 0009: re-assigned at load time, not read from JSON), composition timing state (ADR 0008: _compState, _compStart, _compPausedBars in composition.ts — explicitly excluded from Phase 07).
  - derive-on-load: Block.id and Track.id via _blkSeq/_trkSeq counters in session.ts; track blockId refs rebuilt from saved blockIndex.
- Confirm that _blkSeq and _trkSeq live in src/state/session.ts (module-level, not exported). Identify what export from session.ts the Dev must add so persistence.ts can trigger ID re-assignment without accessing internal counters directly. Proposed: `applyLoadedSession(saved: SavedSession): void` exported from session.ts — it uses _blkSeq/_trkSeq internally and calls sessionStore.update.
- Identify whether btoa/atob are available in both browser (for the app) and Node (for Vitest tests). Confirm no compression library is needed for MVP.
- List any open decisions for Pilot review at checkpoint 1.
- Note: the prototype (reference/orbifold.html) has no save/load or URL sharing feature — this phase is new functionality, not a port. The prototype-parity checklist item does not apply to this phase.

Validation:
- No source code written.

Expected result:
- docs/orbifold-v1/inventories/phase-07-inventory.md present and complete.

CHECKPOINT → Commit message:
`docs(persistence): Phase 07 step 07.1 — phase-07 inventory`

---

## Step 07.2 — Session schema, serialize/deserialize, localStorage helpers, and unit tests

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-07-inventory.md, all ADRs (especially ADR 0009 for the ID re-assignment constraint), src/lib/persistence.ts (stub), src/state/session.ts, src/core/rhythm/layers.ts, src/core/composition/model.ts, and src/agent/schema.ts (for schema conventions already established in this codebase). Implement src/lib/persistence.ts (schema, serialize, deserialize, localStorage helpers) and add applyLoadedSession to src/state/session.ts. Add tests/persistence.test.ts. No DOM imports in persistence.ts or the new session.ts export.

Implementation requirements:
- src/lib/persistence.ts:
  - Export `SESSION_SCHEMA_VERSION = 1` constant.
  - `SavedChordSchema`: `{ rootPc: z.number().int().min(0).max(11), qual: z.enum(['maj','min','dim','aug']), gain: z.number().min(0).max(1.2) }`. No cx/cy — Zod strips unknown fields by default, so extra fields in loaded JSON are silently dropped.
  - `SavedHarmonySchema`: `{ root: z.number().int().min(0).max(11), mode: z.enum([…8 modes…]), octave: z.number().int().min(2).max(5), progression: z.array(SavedChordSchema).max(16) }`.
  - `SavedRhythmLayerSchema`: `{ sound: z.enum([…9 sounds…]), steps: z.array(z.number().int().min(0).max(1)).length(16), euclid: z.string().optional(), muted: z.boolean().optional(), solo: z.boolean().optional() }`.
  - `SavedRhythmSchema`: `{ layers: z.array(SavedRhythmLayerSchema).max(8) }`.
  - `SavedBlockSchema`: `{ name: z.string().max(100), type: z.enum(['groove','armonia','sesion']), code: z.string(), bars: z.number().int().min(1).max(64) }`. No id field.
  - `SavedBlockRefSchema`: `{ blockIndex: z.number().int().min(0), bars: z.number().int().min(1).max(64) }`.
  - `SavedTrackSchema`: `{ blockRefs: z.array(SavedBlockRefSchema) }`. No id field.
  - `SavedCompositionSchema`: `{ blocks: z.array(SavedBlockSchema).max(64), tracks: z.array(SavedTrackSchema).max(16) }`.
  - `SavedSessionSchema`: `{ version: z.literal(1), bpm: z.number().int().min(40).max(280), view: z.enum(['rhythm','harmony','composition','session']), chordMode: z.enum(['chord','arp']), harmony: SavedHarmonySchema, rhythm: SavedRhythmSchema, composition: SavedCompositionSchema }`.
  - Export inferred TypeScript type: `SavedSession`.
  - `serializeSession(state: SessionState): SavedSession` — pure function. Strips nowPlaying, strips cx/cy from chords (only picks rootPc/qual/gain), strips Block.id and Track.id, converts Track.blocks[].blockId refs to SavedBlockRef.blockIndex by looking up the block's index in state.composition.blocks.
  - `deserializeSession(saved: SavedSession): Omit<SessionState, 'nowPlaying'>` — pure function. Reconstructs harmony/rhythm/composition structure without IDs (IDs are assigned by applyLoadedSession). Sets nowPlaying to `{ label: null, source: null }`.
  - `PERSISTENCE_KEY_PREFIX = 'orbifold.session.'` constant.
  - `saveSession(name: string, state: SessionState): void` — serializes and stores `JSON.stringify(serialized)` to localStorage key `orbifold.session.<name>`. Also updates the session name list at `orbifold.sessionList`.
  - `loadSavedSession(name: string): SavedSession | null` — reads from localStorage, parses JSON, validates with `SavedSessionSchema.safeParse()`. Returns parsed value or null.
  - `listSavedSessions(): string[]` — reads `orbifold.sessionList` from localStorage; returns array of names.
  - `deleteSession(name: string): void` — removes the localStorage key and updates the name list.
  - `encodeSession(state: SessionState): string` — `btoa(encodeURIComponent(JSON.stringify(serializeSession(state))))`.
  - `decodeSession(encoded: string): SavedSession | null` — `JSON.parse(decodeURIComponent(atob(encoded)))`, validates with `SavedSessionSchema.safeParse()`. Returns null on any error.
- src/state/session.ts — add export:
  - `applyLoadedSession(saved: SavedSession): void` — uses _blkSeq/_trkSeq internally. Assigns new IDs: `blocks[i].id = 'b' + _blkSeq++`, `tracks[j].id = 't' + _trkSeq++`. Rebuilds track blockId refs: `track.blockRefs[k].blockIndex → blocks[blockRefs[k].blockIndex].id`. Calls sessionStore.update with the reconstructed SessionState (nowPlaying reset to null).
- tests/persistence.test.ts (≥12 test cases):
  - `SavedSessionSchema.parse` with valid full payload → succeeds.
  - `SavedSessionSchema.parse` with wrong version (2) → fails.
  - `SavedSessionSchema.parse` with bpm out of range → fails.
  - `SavedSessionSchema.parse` with cx/cy fields on chord → succeeds (stripped by Zod — verify the parsed chord has no cx/cy property).
  - `serializeSession`: nowPlaying is excluded; chords have no cx/cy; block IDs are excluded; track refs use blockIndex not blockId.
  - `serializeSession` + `deserializeSession` roundtrip for bpm/harmony/rhythm/composition fields (no IDs in intermediate).
  - `encodeSession` + `decodeSession` roundtrip: decodes to equal SavedSession.
  - `applyLoadedSession`: blocks get fresh IDs (b1, b2…), tracks get fresh IDs (t1…), track blockId refs match new block IDs (not saved blockIndex numbers).
  - `saveSession` + `listSavedSessions` + `loadSavedSession` roundtrip (mock localStorage via `vi.stubGlobal('localStorage', ...)` or the test environment's localStorage).
  - `deleteSession` removes from list.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass, total ≥ 165 (153 prior + ≥12 new).

Expected result:
- src/lib/persistence.ts fully implemented (schema, serialize, deserialize, encode, decode, localStorage helpers).
- src/state/session.ts gains `applyLoadedSession` export.
- tests/persistence.test.ts with ≥12 cases, all green.

CHECKPOINT → Commit message:
`feat(persistence): Phase 07 step 07.2 — session schema, serialize/deserialize, and localStorage helpers`

---

## Step 07.3 — URL encoding init on app mount

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-07-inventory.md, src/lib/persistence.ts (just implemented), src/state/session.ts (applyLoadedSession just added), and src/app/App.svelte. Wire the URL-based session restore into App.svelte's onMount. No new files; no new dependencies.

Implementation requirements:
- src/app/App.svelte — in `onMount`, after the existing initialization block, add URL session restore:
  - Check `window.location.hash` for the prefix `#session=`.
  - If present, extract the encoded string and call `decodeSession(encoded)`.
  - If decode succeeds (non-null), call `applyLoadedSession(saved)`.
  - If decode fails, silently ignore (do not throw or alert — URL may be stale or corrupted).
  - After applying: call `window.history.replaceState(null, '', window.location.pathname)` to clear the hash from the address bar (the session is now loaded; the hash is no longer needed and avoids confusion on subsequent reloads).
- The share URL format is `<origin><pathname>#session=<encoded>`. This is generated by PersistencePanel.svelte in step 07.4 — App.svelte only reads it here.
- No new CSS in this step.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count unchanged from step 07.2).

Expected result:
- App.svelte reads `#session=<encoded>` on mount and calls `applyLoadedSession` if valid.
- Hash is cleared from address bar after successful load.

CHECKPOINT → Commit message:
`feat(persistence): Phase 07 step 07.3 — URL session restore on app mount`

---

## Step 07.4 — PersistencePanel.svelte (save/load/share UI)

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/inventories/phase-07-inventory.md, src/lib/persistence.ts, src/state/session.ts, src/app/App.svelte, src/app/app.css, and existing Svelte component conventions (src/ui/AgentPanel.svelte, src/ui/CompositionDrawer.svelte). Create src/ui/PersistencePanel.svelte, append persistence CSS tokens to app.css, and add a trigger button to App.svelte. No new npm dependencies. AGPL-3.0 header on all new files.

Implementation requirements:
- src/app/app.css — append persistence CSS: `#sessionsBtn` (a small floating button, position:fixed, near transport or top-right), `#sessionsPanel` (fixed overlay panel, glass effect, slide-in from the left or right — consistent with app aesthetic), `.sess-list`, `.sess-item`, `.sess-name`, `.sess-actions`, `.sess-input-row`, `.share-url-row`. Follow existing token conventions (var(--glass), var(--stroke), var(--accent), var(--muted)).
- src/ui/PersistencePanel.svelte — AGPL-3.0 header:
  - A `<button id="sessionsBtn" class="glass">💾</button>` triggers `open = true` (this button is rendered in App.svelte, wired via a store or prop — see App.svelte note below).
  - `<div id="sessionsPanel" class:open>`: panel header (title "Sesiones" + ✕ close), save row (text input for session name + "💾 Guardar" button), session list (`{#each sessions}` → `.sess-item` with name, "▶ Cargar" button, "🗑" delete button), share row ("📤 Compartir URL" button + optional URL preview or "copiado" feedback).
  - On open: call `listSavedSessions()` to populate the list reactively.
  - "💾 Guardar" handler: calls `saveSession(name, get(sessionStore))`; refreshes list; clears name input.
  - "▶ Cargar" handler: calls `loadSavedSession(name)` → if non-null calls `applyLoadedSession(saved)`; closes panel.
  - "🗑" handler: calls `deleteSession(name)`; refreshes list.
  - "📤 Compartir URL" handler: calls `encodeSession(get(sessionStore))`, constructs `${window.location.origin}${window.location.pathname}#session=${encoded}`, copies to clipboard via `navigator.clipboard.writeText(url)`, shows "✓ Copiado" feedback for 2 seconds.
  - Panel state (open/closed): local `let open = false`. Or a small writable store `persistCtx` if cross-component needed — prefer local if App.svelte wires the trigger button via a simple boolean prop.
- src/app/App.svelte — add `import PersistencePanel from '../ui/PersistencePanel.svelte'` and mount `<PersistencePanel />` after `<AgentPanel />`. The `💾` trigger button can be rendered inside PersistencePanel (it is position:fixed) so App.svelte only mounts the component; no extra elements needed in App.svelte.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — all tests pass (count unchanged from step 07.2).
- `pnpm build` — exit 0.

Expected result:
- `💾` button visible in the app; clicking opens the Sesiones panel.
- Save, load, delete, and share URL controls present and wired.

CHECKPOINT → Commit message:
`feat(ui): Phase 07 step 07.4 — PersistencePanel.svelte (save/load/share UI)`

---

## Step 07.5 — Operability verification

PROMPT → Read CLAUDE.md, decisions.md, docs/orbifold-v1/phases/phase-07.md (all acceptance IDs A-07-01 through A-07-10), and docs/orbifold-v1/handoffs/phase-07-handoff.md (steps 07.1–07.4 entries). Run all gate commands and record exact output. Execute the Pilot 10-point smoke test in `pnpm dev`. Append this step's entry and the Phase 07 Completion section to docs/orbifold-v1/handoffs/phase-07-handoff.md. Do not write source code.

Implementation requirements:
- Run and record exact output: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Execute the following 10-point smoke test in `pnpm dev` (the Pilot performs this):
  1. `💾` button visible in the app; click opens the Sesiones panel with slide-in; ✕ closes it.
  2. Type a name ("Mi sesión 1") in the save input and click "💾 Guardar" — session appears in the list.
  3. Change something in the app (e.g. switch view to rhythm, modify BPM), then click "▶ Cargar" for the saved session — bpm and view are restored.
  4. Click "🗑" to delete the session — it disappears from the list.
  5. Reload the page — saved sessions persist in localStorage (confirmed via DevTools > Application > localStorage or by verifying the list is non-empty after reload).
  6. Click "📤 Compartir URL" — clipboard receives a URL with `#session=` in the hash; the app shows "✓ Copiado" feedback.
  7. Paste that URL in the address bar and navigate — session (bpm, harmony, rhythm, composition) is reconstructed; hash is cleared from the address bar after load.
  8. Verify that after loading from URL the nowPlaying state is reset (Transport shows nothing playing).
  9. Save a session that includes composition blocks and tracks; share URL; load from URL — composition blocks and tracks are restored correctly with fresh IDs (verify in the composition drawer).
  10. All A-06 behaviors intact (agent panel, Tonnetz, rhythm, transport, composition drawer).
- Record each item as CONFIRMED or FAILED with a note.

Validation:
- All 4 gate commands exit 0.
- All 10 smoke-test items CONFIRMED.
- Test count ≥ 165.

Expected result:
- All 10 A-07 acceptance IDs covered in the Acceptance Coverage Table.
- Phase 07 Completion section appended to handoff.

CHECKPOINT → Commit message:
`feat(persistence): Phase 07 step 07.5 — operability verification and phase-07 completion handoff`

---

## Phase Acceptance

- **A-07-01** — `SavedSessionSchema` validates a well-formed saved session (version 1, bpm, harmony, rhythm, composition); rejects wrong version, out-of-range bpm, and silently strips cx/cy from chord fields.
  - Validation method: `unit`
- **A-07-02** — `serializeSession` produces a SavedSession that excludes nowPlaying, excludes cx/cy from chords, excludes Block.id/Track.id, and represents track block refs as blockIndex integers.
  - Validation method: `unit`
- **A-07-03** — `serializeSession` → `deserializeSession` → `applyLoadedSession` roundtrip: bpm, harmony, rhythm, and composition are restored; blocks receive fresh IDs from the counter; track blockId refs are rebuilt to match the new IDs.
  - Validation method: `unit`
- **A-07-04** — `saveSession(name)` persists to localStorage; `listSavedSessions()` returns the name; `loadSavedSession(name)` returns the parsed SavedSession; `deleteSession(name)` removes it from the list.
  - Validation method: `unit`
- **A-07-05** — `encodeSession` → `decodeSession` roundtrip: decoded value equals the input SavedSession.
  - Validation method: `unit`
- **A-07-06** — Opening a URL with `#session=<encoded>` reconstructs the session (bpm, harmony, rhythm, composition) on page load and clears the hash from the address bar.
  - Validation method: `live-system`
- **A-07-07** — The Sesiones panel: user can save the current session with a name, see the list of saved sessions, load a session (store updates), and delete a session.
  - Validation method: `live-system`
- **A-07-08** — "📤 Compartir URL" generates a URL with the encoded state, copies it to the clipboard, and shows "✓ Copiado" feedback.
  - Validation method: `live-system`
- **A-07-09** — All A-06 behaviors intact after persistence layer and UI added.
  - Validation method: `unit` + `live-system`
- **A-07-10** — `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥165 tests), and `pnpm build` all exit 0.
  - Validation method: `proxy:static-analysis` + `unit`

## Partial coverage from prior phase

No prior partials to address. All 12 A-06 IDs were fully covered at Phase 06 completion.

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Session URL encoding format** — Trigger: step 07.2. The chosen format (`btoa(encodeURIComponent(JSON.stringify(...)))`) avoids new dependencies. If the Dev finds that URL length causes issues in practice (e.g. compositions with many large blocks exceed ~8 KB encoded), surface for ADR before committing — the alternative is adding an LZ-string compression dependency with an exact pin per the Decisions Register.
- **Session list storage key schema** — Trigger: step 07.2. `orbifold.sessionList` and `orbifold.session.<name>` are the proposed localStorage key names. If the Dev finds a collision with the agent key namespace (`orbifold.apiKey.*` from Phase 06), surface for ADR.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-07-handoff.md`. See `handoff-template.md`.

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0021 — Agent Schema v5 and `applyBlockSave` insertion

- **Status:** Accepted (Pilot approved at Checkpoint #2, 2026-06-18)
- **Date:** 2026-06-18
- **Initiative / Phase:** ai-composition-authoring / Phase 01 (step 01.2)
- **Deciders:** Pilot (Javier)

## Context

The `editable-composition` Phase 01 established `Block.snapshot` as the editable source of
truth: `addBlock` captures a `BlockSnapshot` (groove / armonia / sesion) at creation time, and
`openBlock` restores it into the live editors. That work closed with 682 tests,
`SESSION_SCHEMA_VERSION = 5`, and `SCHEMA_VERSION = 4` (no agent-schema change in that phase,
per ADR 0020 D7).

The next step is to let the AI agent trigger a block save: an agent response may now include a
`saveAsBlock` field that names a block, declares its type, and optionally places it on a new
composition track. The Phase 01 discovery inventory (`docs/ai-composition-authoring/inventories/phase-01-inventory.md`)
surfaced four open questions; the Pilot resolved all four at Checkpoint #1 (2026-06-18). This
ADR records the six governing decisions derived from those resolutions.

### Pilot OQ resolutions at Checkpoint #1

- **OQ-1 → A (trust as declared):** `saveAsBlock.type` is accepted as the agent's
  declaration. `addBlock`'s existing early-return on empty code (`session.ts` line 1256,
  `if (!code) return;`) is the sufficient guard against meaningless blocks. No live-state
  validation added in `applyBlockSave`.
- **OQ-2 → B (truncate):** Zod schema has **no** `.max(100)` on `name`. `applyBlockSave`
  silently truncates via `.trim().slice(0, 100)`. A long name does not cause `safeParse`
  to reject the entire agent output (which would also silently drop valid rhythm/harmony
  specs bundled in the same response).
- **OQ-3 → relax guard:** `superRefine` is updated to require at least one of `rhythm`,
  `harmony`, or `saveAsBlock`. The agent may send a save-only response with no musical
  changes.
- **OQ-4 → sessionCode + named summary:** When `did` is empty (only `saveAsBlock` fired):
  `code = sessionCode(updatedState)`; `summary = "✓ Guardé el [type] actual como bloque
  «name»"` (locale-appropriate phrasing). Returns `{ type: 'skill', code, summary }` —
  not `type: 'text'`.

Six decisions govern the implementation in steps 01.3–01.4.

---

## Decisions

### D1 — `saveAsBlock` field shape, type validation, and name constraints

**Decision:** The `AgentOutputSchema` gains one new optional top-level field: `saveAsBlock`,
typed as `SaveAsBlockSpec`. The exact TypeScript interface and Zod schema:

```typescript
// ── TypeScript interface (to be pasted into src/agent/schema.ts) ────────────

/**
 * Spec for the agent to save the current live state as a named, editable
 * composition Block. When present, applyBlockSave is called AFTER
 * applyRhythmSpec and applyHarmonySpec, so the snapshot reflects the
 * fully-applied agent state.
 *
 * Per ADR 0021 D1.
 */
export interface SaveAsBlockSpec {
  /**
   * User-visible name for the new block.
   * The agent may supply any non-empty string; applyBlockSave truncates to
   * 100 characters via .trim().slice(0, 100) (OQ-2 → Option B).
   * No .max(100) constraint in Zod — a too-long name does NOT invalidate the
   * entire agent output (which would also drop valid rhythm/harmony specs).
   */
  name: string;
  /**
   * Which live state to capture:
   * - 'groove'  → captures rhythm layers (GrooveSnapshot)
   * - 'armonia' → captures harmony progression (ArmoniaSnapshot)
   * - 'sesion'  → captures both rhythm + harmony (SesionSnapshot)
   *
   * Accepted as the agent's declaration (OQ-1 → Option A). If the declared
   * type results in empty code (e.g., 'armonia' with no progression),
   * addBlock's existing early-return guard handles the no-op gracefully.
   *
   * Must match Block.type literals (src/core/composition/model.ts line 24).
   */
  type: 'groove' | 'armonia' | 'sesion';
  /**
   * When true, also creates a new composition track referencing the new block.
   * Absent = false (block is saved to the library only).
   */
  addToTrack?: boolean;
}
```

```typescript
// ── Zod schema (to be pasted into src/agent/schema.ts) ───────────────────

export const SaveAsBlockSpecSchema = z.object({
  /**
   * min(1) prevents empty-string names. No .max(100) — applyBlockSave truncates.
   * (OQ-2 → Option B: truncation rather than whole-skill rejection)
   */
  name: z.string().min(1),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  addToTrack: z.boolean().optional(),
});

export type SaveAsBlockSpec = z.infer<typeof SaveAsBlockSpecSchema>;
```

**Updated `AgentOutputSchema` with relaxed guard (OQ-3):**

```typescript
export const AgentOutputSchema = z
  .object({
    rhythm: RhythmSpecSchema.optional(),
    harmony: HarmonySpecSchema.optional(),
    note: z.string().max(300).optional(),
    saveAsBlock: SaveAsBlockSpecSchema.optional(), // NEW in schema v5 (ADR 0021 D1)
  })
  .superRefine((val, ctx) => {
    // Relaxed guard per OQ-3: at least one of rhythm, harmony, or saveAsBlock required.
    // Previously: rhythm || harmony only.
    if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock',
      });
    }
  });
```

**Name truncation behavior (OQ-2 → B):** `applyBlockSave` applies
`.trim().slice(0, 100)` to the agent-supplied `name` before calling `renameBlock`. This
is silent (no warning in the UI, no log). The resulting name is visible in the
composition library immediately. Truncation is consistent with how defensive UI text
fields handle overflow.

**Type validation behavior (OQ-1 → A):** `saveAsBlock.type` is trusted as declared. No
additional live-state pre-check is performed. The three type literals (`'groove'`,
`'armonia'`, `'sesion'`) match `Block.type` in `src/core/composition/model.ts` line 24
exactly — Zod's `z.enum` enforces the allowable set; unknown types cause `safeParse` to
return `success: false`.

---

### D2 — Schema version bump: `SCHEMA_VERSION` 4 → 5

**Decision:** `SCHEMA_VERSION` in `src/agent/schema.ts` bumps from `4` to `5`.

```typescript
// src/agent/schema.ts — change at line 22
export const SCHEMA_VERSION = 5;
```

**Lossy-drop precedent and wire-protocol note:**

The agent schema version is a documentation aid, not a wire protocol version. Agent
responses parsed with a stale schema are schema-agnostic — the model does not embed a
`SCHEMA_VERSION` field in its JSON output. The version appears only in the codebase to
track which capabilities the schema describes. No runtime behavior changes for existing
agent integrations.

Lossy-drop precedent established by:
- `SCHEMA_VERSION` 1 → 2: Phase 06 / ADR 0012 (rest union)
- `SCHEMA_VERSION` 2 → 3: harmonic-rhythm-improvements Phase 02 / ADR 0018 D4
  (`instrument`/`room`/`decay`)
- `SCHEMA_VERSION` 3 → 4: harmonic-rhythm-improvements Phase 03 / ADR 0019 D6
  (`preset`/`lpf`/envelope fields)

**`SESSION_SCHEMA_VERSION` is unchanged.** `SESSION_SCHEMA_VERSION` in
`src/lib/persistence.ts` remains at `5` (set by editable-composition Phase 01). Agent-created
blocks are structurally identical to user-created blocks at the persistence layer — the
`SavedBlockSchema` `snapshot?` field added in that phase already accommodates all three
discriminant types (`groove`, `armonia`, `sesion`). No new Zod fields are needed in
`persistence.ts`.

---

### D3 — `applyBlockSave` placement and implementation

**Decision:** `applyBlockSave` is implemented **within `src/agent/apply.ts`** (not a new
peer file). It is exported alongside `applyRhythmSpec` and `applyHarmonySpec`.

**Rationale for co-location:**
`applyBlockSave` is semantically equivalent to the existing apply-functions: it accepts a
validated agent spec and mutates `sessionStore`. A separate `applyBlock.ts` file would add
an import in `agent.ts` without a commensurate increase in modularity. The function body
is short; `apply.ts`'s single responsibility (apply agent specs to the session store) is
not diluted.

**Exact function signature:**

```typescript
/**
 * Apply a saveAsBlock spec: capture current live state as a named block,
 * optionally add it to a new composition track.
 *
 * Must be called AFTER applyRhythmSpec and applyHarmonySpec so the snapshot
 * reflects the fully-applied agent state. Per ADR 0021 D3–D4.
 *
 * @param spec - The validated SaveAsBlockSpec from AgentOutputSchema.
 */
export function applyBlockSave(spec: SaveAsBlockSpec): void
```

**Internal call sequence (binding — see also D4):**

1. `addBlock(spec.type)` — creates the block, captures the snapshot via
   `captureGrooveSnapshot` / `captureArmoniaSnapshot` / `captureSesionSnapshot`, and
   pushes it to `sessionStore.composition.blocks`. Returns `void`.
2. `const state = get(sessionStore)` — reads the store immediately after `addBlock`.
3. `const newBlock = state.composition.blocks[state.composition.blocks.length - 1]` —
   reads the just-created block. Safe because `addBlock` is synchronous (Svelte writable
   `update` is synchronous) and no interleaving is possible.
4. If `state.composition.blocks.length === 0` at step 3 (i.e., `addBlock` early-returned
   on empty code) → return immediately; no rename, no track.
5. `const finalName = spec.name.trim().slice(0, 100)` — apply OQ-2 truncation.
6. `renameBlock(newBlock.id, finalName)` — renames the block in the store.
7. If `spec.addToTrack === true`: `addBlockAsNewTrack(newBlock.id)`.

**`addBlock` is the single snapshot-capture path.** `applyBlockSave` does NOT call
`captureGrooveSnapshot`, `captureArmoniaSnapshot`, or `captureSesionSnapshot` directly.
This preserves the invariant from step 01.3 spec line 109: the existing snapshot-capture
logic in `addBlock` is the canonical path for all block creation, whether user-initiated
or agent-initiated.

**`addBlock` return type:** Confirmed `void` by the discovery inventory (§(d)) reading
`src/state/session.ts` line 1241. The read-back pattern is required because no block ID
or object is returned.

**Required new imports in `apply.ts`:**

```typescript
import { addBlock, renameBlock, addBlockAsNewTrack } from '../state/session.js';
import type { SaveAsBlockSpec } from './schema.js';
```

---

### D4 — Call ordering in `send()`, guard relaxation (OQ-3), and save-only result type (OQ-4)

**Decision:** In `src/agent/agent.ts` `send()`, the dispatch order is:

```
applyRhythmSpec  →  applyHarmonySpec  →  applyBlockSave
```

All three are within the same parsed-response handler (after `tryParseSkill` returns a
non-null `AgentOutput`).

**Insertion point:**

```typescript
// Current agent.ts lines 357–366 (simplified):
if (skill.rhythm) {
  applyRhythmSpec(skill.rhythm);
  did.push('ritmo');
}
if (skill.harmony) {
  applyHarmonySpec(skill.harmony);
  did.push('armonía');
}
// NEW after line 366 (ADR 0021 D4):
if (skill.saveAsBlock) {
  applyBlockSave(skill.saveAsBlock);
  // Note: 'saveAsBlock' is intentionally NOT added to the `did` array.
  // `did` drives the summary text; the block-save summary is handled
  // separately per OQ-4 below.
}
```

**State timing:** If the agent response contains both `rhythm`/`harmony` specs AND
`saveAsBlock`, the captured snapshot reflects the post-apply state (the fully-applied
agent state), because `applyRhythmSpec` and `applyHarmonySpec` write to `sessionStore`
synchronously before `applyBlockSave` calls `addBlock` (which reads `get(sessionStore)`).

If the agent response contains only `saveAsBlock` (no `rhythm`, no `harmony`), `did` is
empty after the `if (skill.rhythm)` / `if (skill.harmony)` blocks. `applyBlockSave` still
runs and captures whatever the current live state holds.

**Guard relaxation (OQ-3 binding):** The `superRefine` on `AgentOutputSchema` (D1 above)
already relaxes the guard — `safeParse` now accepts `saveAsBlock`-only responses. The
existing defensive guard in `send()` lines 367–370 (return `{ type: 'text', text: txt }`
if `did.length === 0`) must be updated to NOT fire when `skill.saveAsBlock` is present.
The correct guard becomes:

```typescript
if (did.length === 0 && !skill.saveAsBlock) {
  return { type: 'text', text: txt };
}
```

**Save-only result type (OQ-4 binding):** When `did` is empty AND `skill.saveAsBlock`
was applied:

- `code` is derived from `sessionCode(updatedState)` — the full current session code
  (rhythm + harmony combined), so the live code drawer shows what is playing.
- `summary` is a locale-appropriate string acknowledging the block save, e.g.:
  - ES: `"✓ Guardé el ${type} actual como bloque «${name}»"`
  - EN: `"✓ Saved the current ${type} as block «${name}»"`
  - PT: `"✓ Salvei o ${type} atual como bloco «${name}»"`
  - ZH: `"✓ 已将当前 ${type} 保存为「${name}」块"`
  (exact strings are i18n keys; the t() call in `agent.ts` handles locale.)
- Returns `{ type: 'skill', code, summary }` — not `{ type: 'text' }`.

When `did` is non-empty AND `skill.saveAsBlock` was also applied, the existing summary
building logic (lines 384–388) applies; the block save is appended or noted as an
additional action in the summary (exact phrasing is an implementation detail for step
01.3, not binding at ADR level).

---

### D5 — Agent system prompt update

**Decision:** The Spanish `SYSTEM_PROMPT` string in `src/agent/agent.ts` (lines 87–131)
gains a third capability block describing `saveAsBlock`. The prompt remains Spanish-only
(per ADR 0017 D7: the prompt is always Spanish; the per-request `buildContextAddendum`
appends the language directive so the agent replies in the user's language).

**No i18n of the prompt itself.** The `SYSTEM_PROMPT` is a static string; i18n applies
only to UI strings (button labels, toast messages, summary text). The `saveAsBlock`
capability description belongs in the Spanish "SKILLS" section.

**Required content for the capability description (binding for step 01.3):**

The added text must cover:
1. The `saveAsBlock` optional field and when to use it (user says "guarda esto como
   bloque", "save the current groove", "crea un bloque con esta armonía", etc.).
2. The three sub-fields:
   - `name` (string, required, descriptive label for the block).
   - `type` (required; exactly `"groove"`, `"armonia"`, or `"sesion"`; definitions of each).
   - `addToTrack` (boolean, optional; default false; set to true when the user explicitly
     asks to add the block to the composition timeline).
3. Example JSON snippet showing a minimal and a full `saveAsBlock` invocation.
4. That `saveAsBlock` may appear alone (no `rhythm` / `harmony`) or alongside them.

**Language of the capability description:** Spanish. The ADR does not prescribe the exact
phrasing; the Dev has latitude in step 01.3, subject to covering all four points above.

---

### D6 — Byte-identical-at-default guarantee

**Decision:** An agent response without `saveAsBlock` (the default — `saveAsBlock` is
absent from the parsed output) must leave `state.composition.blocks` and
`state.composition.tracks` byte-identical to their pre-call state. No block is added, no
track is added.

**How this is enforced:**

1. `applyBlockSave` is called only when `skill.saveAsBlock` is truthy (the guard in
   `send()`: `if (skill.saveAsBlock) { applyBlockSave(skill.saveAsBlock); }`).
2. When `skill.saveAsBlock` is `undefined` (i.e., the field is absent from the parsed
   output), the guard is false and `applyBlockSave` is never called.
3. `applyRhythmSpec` and `applyHarmonySpec` do not touch `state.composition` — they write
   only to `state.rhythm.layers` and `state.harmony.*` respectively (confirmed by
   `apply.ts` lines 59–97 and 120–193 — no composition imports).

**Consequence:** The Acceptance ID A-01-04 ("an agent response WITHOUT `saveAsBlock`
leaves `state.composition.blocks` byte-identical to its pre-call state") is enforced by
structure, not by a runtime assertion. The unit test for A-01-04 in `tests/apply-block.test.ts`
confirms this by calling `applyRhythmSpec` + `applyHarmonySpec` without `applyBlockSave`
and asserting `state.composition.blocks` is reference-unchanged.

---

## Consequences

### Files modified in steps 01.3–01.4

| File | Nature of change | Step |
|---|---|---|
| `src/agent/schema.ts` | Add `SaveAsBlockSpecSchema`, `SaveAsBlockSpec`; add `saveAsBlock?` to `AgentOutputSchema`; relax `superRefine` guard (OQ-3); bump `SCHEMA_VERSION` 4→5 | 01.3 |
| `src/agent/apply.ts` | Add `applyBlockSave(spec: SaveAsBlockSpec): void`; add imports for `addBlock`, `renameBlock`, `addBlockAsNewTrack`, `SaveAsBlockSpec` | 01.3 |
| `src/agent/agent.ts` | Insert `if (skill.saveAsBlock) { applyBlockSave(skill.saveAsBlock); }` after `applyHarmonySpec`; update `did.length === 0` guard (OQ-3); add OQ-4 save-only code/summary path; update `SYSTEM_PROMPT` with `saveAsBlock` capability description (D5) | 01.3 |
| `tests/agent-schema.test.ts` | New tests for schema v5: all three `type` values, `addToTrack`, absent `saveAsBlock`, `SCHEMA_VERSION === 5`, type-literal alignment guard (A-01-06) | 01.3 |
| `tests/apply-block.test.ts` | New file: unit tests for `applyBlockSave` — groove/armonia block creation, `addToTrack`, byte-identical-at-default, `openBlock` round-trip (A-01-01, A-01-02, A-01-03, A-01-04, A-01-05) | 01.3 |
| `tests/agent-block-persistence.test.ts` | New file (or added to existing `tests/persistence.test.ts`): agent-created block persistence round-trip; track reference survival; regression guard (A-01-07, A-01-08) | 01.4 |

### `SESSION_SCHEMA_VERSION` is unchanged

`SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts` remains at `5`. Agent-created blocks
are structurally identical to user-created blocks: they are stored using the same
`SavedBlockSchema` (with `snapshot?`) already defined in editable-composition Phase 01
step 01.4. No new Zod fields and no version bump are required.

### Invariants preserved

- **`buildComposition` is unchanged.** Playback and composition export are byte-identical
  to pre-phase behavior for all existing blocks. The `saveAsBlock` path does not touch
  `buildComposition` or `Block.code` generation.
- **`core/**` purity.** `applyBlockSave` lives in `src/agent/apply.ts`, not in `core/**`.
  It imports from `src/state/session.ts` (permitted for agent-layer modules). No new
  DOM/PIXI/Svelte imports are introduced.
- **No new runtime dependencies.** All new behavior uses existing TypeScript, Svelte store
  primitives, and Zod.
- **AGPL-3.0 header** on all new files.
- **`addBlock` is the single snapshot-capture path.** `applyBlockSave` does not call
  capture functions directly; it delegates entirely to `addBlock`.

### Deferred

- **i18n in the agent system prompt** — not required; prompt stays Spanish-only per ADR
  0017 D7.
- **Live-state validation of `saveAsBlock.type`** — OQ-1 deferred to a later phase if
  needed. Current behavior: trust as declared; `addBlock` guards against empty-code no-ops.
- **Richer agent summary when both rhythm/harmony AND saveAsBlock fire** — exact phrasing
  is an implementation detail for step 01.3 (not binding at ADR level).

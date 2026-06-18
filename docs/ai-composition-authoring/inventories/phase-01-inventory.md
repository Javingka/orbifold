<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 Inventory — Agent Block Authoring
## Discovery inventory for step 01.1 (Checkpoint #1)

**Initiative:** ai-composition-authoring
**Date:** 2026-06-18
**Gate satisfied:** editable-composition Phase 01 complete and merged to `main`; `Block.snapshot` is live; `addBlock` captures snapshots; `openBlock` is exported; 682 tests pass.

---

## §(a) Agent schema current shape

**File:** `src/agent/schema.ts` (full — lines 1–224)

### `SCHEMA_VERSION`

```typescript
// src/agent/schema.ts line 22
export const SCHEMA_VERSION = 4;
```

History comment (lines 11–21): v1→v2 (Phase 06, rest union ADR 0012); v2→v3 (harmonic-rhythm-improvements Phase 02, ADR 0018 D4, `instrument`/`room`/`decay`); v3→v4 (harmonic-rhythm-improvements Phase 03, ADR 0019 D6, `preset`/`lpf`/envelope fields).

### `AgentOutputSchema` verbatim TypeScript shape

```typescript
// src/agent/schema.ts lines 203–216
export const AgentOutputSchema = z
  .object({
    rhythm: RhythmSpecSchema.optional(),
    harmony: HarmonySpecSchema.optional(),
    note: z.string().max(300).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.rhythm === undefined && val.harmony === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AgentOutput must have at least one of: rhythm, harmony',
      });
    }
  });
```

The inferred `AgentOutput` type (line 224):
```typescript
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
```

**Confirmation: no block/composition fields.** `AgentOutputSchema` has exactly three optional fields: `rhythm`, `harmony`, `note`. There is no `saveAsBlock`, `block`, `composition`, or `snapshot` field. The ADR 0020 D7 JSDoc guard (lines 122–128 on `HarmonyChordCoreSchema`) explicitly forbids adding block snapshot fields here.

`SCHEMA_VERSION` is `4`. `SESSION_SCHEMA_VERSION` (`src/lib/persistence.ts` line 19) is `5` (set by editable-composition Phase 01 step 01.4).

---

## §(b) `apply.ts` dispatch sequence

**File:** `src/agent/apply.ts` (full — lines 1–201)

### Exported functions

| Function | Lines | What it does |
|---|---|---|
| `applyRhythmSpec(spec: RhythmSpec): void` | 59–97 | Replaces all `sessionStore.rhythm.layers`; calls `sessionStore.update(...)` |
| `applyHarmonySpec(spec: HarmonySpec): void` | 120–193 | Updates `sessionStore.harmony.{root,mode,octave,progression}`; calls `sessionStore.update(...)` |
| `getSessionState()` | 198–200 | Convenience re-export of `get(sessionStore)` |

### Dispatch sequence and absent-spec behavior

`apply.ts` exports only two apply-functions; the call ordering is governed by `agent.ts` `send()` (see §(c)). Within `apply.ts` itself, no ordering dependency exists — each function is self-contained.

**When one spec is absent:**

- `applyRhythmSpec` — is never called if `skill.rhythm` is `undefined` (guard in `agent.ts` lines 358–361). If called with an empty layers result (all layers produce zero), it performs an early return (`if (layers.length === 0) return;` — line 91), leaving the store unchanged.
- `applyHarmonySpec` — is never called if `skill.harmony` is `undefined` (guard in `agent.ts` lines 362–365). If called, it only updates the fields present in `spec`; absent-spec fields (`root`, `mode`, `octave`, `progression`) leave the store's current values intact (each field guarded by `if (spec.X != null)` — lines 125–143).

**Does `addBlock` appear anywhere in `apply.ts`?** No. There is no import or call to `addBlock`, `addBlockAsNewTrack`, `renameBlock`, or any composition-library function anywhere in `apply.ts` (lines 1–201). The composition library is entirely outside `apply.ts`'s scope.

---

## §(c) `agent.ts` send/receive flow

**File:** `src/agent/agent.ts` lines 302–399 (the `send()` function)

### Where `safeParse` runs

`tryParseSkill` (lines 151–178 of `agent.ts`) calls `AgentOutputSchema.safeParse(raw)` at line 175. It is called from `send()` at line 354:

```typescript
// agent.ts line 354
const skill = tryParseSkill(txt);
```

`tryParseSkill` returns `AgentOutput | null`. `safeParse` is invoked once per response; if it returns `success: false`, the function returns `null`.

### Parse failure path

If `tryParseSkill` returns `null` (parse failure, invalid JSON, or schema validation failure):
1. `send()` tries `extractLastStrudelCode(txt)` (line 393).
2. If a strudel/js code block is found → returns `{ type: 'code', code: codeBlock }`.
3. Otherwise → returns `{ type: 'text', text: txt }`.

No error is surfaced to the user for a parse failure alone; the text is returned as-is.

### On parse success

If `tryParseSkill` returns a valid `AgentOutput`:
1. `skill.rhythm` is present → `applyRhythmSpec(skill.rhythm)` called; `did` array gets `'ritmo'` (lines 358–361).
2. `skill.harmony` is present → `applyHarmonySpec(skill.harmony)` called; `did` array gets `'armonía'` (lines 362–365).
3. (Defensive guard: if `did.length === 0` → returns `{ type: 'text', text: txt }` — lines 367–370.)
4. Derives `code` from the now-updated `sessionStore` via `get(sessionStore)` (lines 373–381).
5. Builds a `summary` string (lines 384–388).
6. Returns `{ type: 'skill', code, summary, note: skill.note }` (line 389).

### Block side-effects today

None. Lines 302–399 contain no import or call to `addBlock`, `addBlockAsNewTrack`, or any composition-library function. The summary text at line 387 mentions "guardarla como bloque" as user guidance, but this is only a string in the UI message — it does not trigger any block-save logic.

---

## §(d) `addBlock` internals

**File:** `src/state/session.ts` lines 1229–1283

### Function signature

```typescript
// session.ts line 1241
export function addBlock(type: 'groove' | 'armonia' | 'sesion'): void
```

### Exact return type

**`void`.** The function signature declares `void` and the implementation ends with `sessionStore.update(...)` (lines 1276–1282) — no return value is produced. There is no `return block`, `return block.id`, or any value-returning statement.

### Internal behavior (lines 1241–1283)

1. `const state = get(sessionStore)` — reads the current store snapshot.
2. Derives `code` via `rhythmCode(state)` / `harmonyCode(state)` / `sessionCode(state)` depending on `type`.
3. Derives `defName` (`'Groove N'` / `'Armonía N'` / `'Sesión N'`).
4. Early-returns if `code` is empty (line 1256).
5. Captures `snapshot` via `captureGrooveSnapshot` / `captureArmoniaSnapshot` / `captureSesionSnapshot` (lines 1262–1267) — these take the full `SessionState`, not a sub-state.
6. Constructs `block` (id `'b' + _blkSeq++`, name `defName`, type, code, bars `4`, snapshot).
7. Calls `sessionStore.update(...)` to push `block` to `composition.blocks` (lines 1276–1282).

### Implication for `applyBlockSave`

Because `addBlock` returns `void` and mutates the store directly, `applyBlockSave` cannot chain on a returned block ID. To rename the block after creation, `applyBlockSave` must either:

- **Option A:** Read back from the store immediately after `addBlock` (read the last element of `composition.blocks` or find the highest `_blkSeq`-derived ID) and then call `renameBlock(id, spec.name)`. This is safe because `addBlock` is synchronous and mutates the store synchronously via Svelte `writable.update`.
- **Option B:** Introduce a name parameter into `addBlock` itself — but this would require modifying `addBlock`'s signature, which is a broader change touching the existing UI call sites (`CompositionDrawer.svelte`). This would require a Pilot decision.
- **Option C:** Inline the block construction in `applyBlockSave` without calling `addBlock`, directly calling the capture functions and writing to the store. ADR 0021 will govern this (Step 01.3 spec line 109 explicitly forbids Option C: "do NOT call captureGrooveSnapshot … directly in applyBlockSave; let addBlock's existing snapshot-capture logic handle it").

The phase spec (step 01.3, line 109) requires Option A: call `addBlock`, then read back from the store and rename. This is the binding constraint.

---

## §(e) `addBlockAsNewTrack` signature

**File:** `src/state/session.ts` lines 1429–1445

### Signature

```typescript
// session.ts line 1429
export function addBlockAsNewTrack(blockId: string): void
```

### Parameters and return type

- `blockId: string` — the `id` of the block to place on a new track (e.g. `'b3'`).
- Returns `void`.

### Where it lives

`src/state/session.ts` — it is a **store action**, not a pure function. It calls `sessionStore.update(...)` internally (line 1430), mutating the store. It is NOT in `model.ts` — `model.ts` has `buildComposition` which is a pure function over `blocks` and `tracks`, but no mutation actions.

### Behavior (lines 1429–1445)

1. Reads `s.composition.blocks.find(b => b.id === blockId)`.
2. If no block found → returns the store unchanged (no-op, no error).
3. Constructs a new track `{ id: 't' + _trkSeq++, blocks: [{ blockId, bars: block.bars }] }`.
4. Pushes it to `s.composition.tracks`.

**Confirmed: store action.** `addBlockAsNewTrack` writes to `sessionStore`. It is imported by `CompositionDrawer.svelte` (via `'../state/session.js'`) for the UI "↳ pista" button. It is also the function `applyBlockSave` will call when `spec.addToTrack === true`, reading the block's ID from the store after `addBlock` has run.

---

## §(f) Proposed new schema shape

### Context: `saveAsBlock` field

The `AgentOutputSchema` gains one new optional top-level field: `saveAsBlock`. When present, `applyBlockSave` is called after `applyRhythmSpec` and `applyHarmonySpec`. When absent (the default), no block is created — the composition library is byte-identical to its pre-call state.

### TypeScript shape

```typescript
/** Proposed addition to src/agent/schema.ts */

export interface SaveAsBlockSpec {
  /** User-visible name for the new block. Max 100 characters (matches SavedBlockSchema.name constraint). */
  name: string;
  /**
   * Which live state to capture:
   * - 'groove'  → captures rhythm layers (GrooveSnapshot)
   * - 'armonia' → captures harmony progression (ArmoniaSnapshot)
   * - 'sesion'  → captures both rhythm + harmony (SesionSnapshot)
   * Must match the literals of Block.type (src/core/composition/model.ts line 24).
   */
  type: 'groove' | 'armonia' | 'sesion';
  /**
   * When true, also creates a new composition track referencing the new block.
   * Default when absent: false (block is saved to the library only).
   */
  addToTrack?: boolean;
}
```

### Zod schema shape (congruent with TypeScript above)

```typescript
/** Proposed Zod schema for src/agent/schema.ts */

export const SaveAsBlockSpecSchema = z.object({
  /** Max 100 chars — mirrors SavedBlockSchema z.string().max(100) in persistence.ts */
  name: z.string().min(1).max(100),
  type: z.enum(['groove', 'armonia', 'sesion'] as const),
  addToTrack: z.boolean().optional(),
});

export type SaveAsBlockSpec = z.infer<typeof SaveAsBlockSpecSchema>;
```

### Updated `AgentOutputSchema` (addition only)

```typescript
export const AgentOutputSchema = z
  .object({
    rhythm: RhythmSpecSchema.optional(),
    harmony: HarmonySpecSchema.optional(),
    note: z.string().max(300).optional(),
    saveAsBlock: SaveAsBlockSpecSchema.optional(), // NEW in schema v5
  })
  .superRefine((val, ctx) => {
    // The existing guard: at least one of rhythm or harmony must be present.
    // OPEN QUESTION (OQ-3): should saveAsBlock alone (without rhythm/harmony) be
    // permitted? See §(i) OQ-3 below.
    if (val.rhythm === undefined && val.harmony === undefined && val.saveAsBlock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AgentOutput must have at least one of: rhythm, harmony, saveAsBlock',
      });
    }
  });
```

### Field justification

| Field | Required? | Rationale |
|---|---|---|
| `name` | **Required** | The block must appear with a meaningful label in the library; a blank name is user-hostile. `min(1)` prevents empty strings. `max(100)` matches the existing `SavedBlockSchema` persistence constraint (see §(i) OQ-2 for resolution options). |
| `type` | **Required** | Determines which snapshot is captured. The agent must declare intent explicitly — the system cannot infer whether the user wants to save groove, harmony, or both. The three literals match `Block.type` in `model.ts` line 24. |
| `addToTrack` | **Optional** | Most saves go to the library only; adding a track is an explicit extra action. Absent = `false`. |

---

## §(g) Insertion point in `apply.ts`

### Call ordering constraint

`applyBlockSave` must run **after** `applyRhythmSpec` and `applyHarmonySpec` have written their changes to `sessionStore`. This is because `addBlock` (called inside `applyBlockSave`) reads the current store state at call time — `const state = get(sessionStore)` at `session.ts` line 1242. If `applyBlockSave` ran before the apply functions, the captured snapshot would reflect the pre-apply state, not the agent's intended state.

The insertion point in `agent.ts` `send()` is:

```typescript
// Current (agent.ts lines 357–366):
if (skill.rhythm) {
  applyRhythmSpec(skill.rhythm);
  did.push('ritmo');
}
if (skill.harmony) {
  applyHarmonySpec(skill.harmony);
  did.push('armonía');
}
// PROPOSED insertion after line 366:
if (skill.saveAsBlock) {
  applyBlockSave(skill.saveAsBlock);  // captures live state AFTER apply*Spec
}
```

If `skill` contains only `saveAsBlock` (no `rhythm`, no `harmony`), `applyBlockSave` still runs and captures the current live state. This is governed by ADR 0021 D4 (to be written in step 01.2).

### Placement: `apply.ts` vs new `applyBlock.ts`

**Recommendation: keep within `apply.ts`.**

Rationale:
- `applyBlockSave` is semantically equivalent to `applyRhythmSpec` and `applyHarmonySpec` — it is an apply-function that reads `saveAsBlock` spec and mutates the store. Placing it in the same file maintains the module's single coherent responsibility (apply validated agent specs to the session store).
- A new `applyBlock.ts` file would require adding an import in `agent.ts`, and the function body is short (call `addBlock`, read back from store, call `renameBlock`, optionally call `addBlockAsNewTrack`) — not enough complexity to justify a separate file.
- Prior art: `applyRhythmSpec` and `applyHarmonySpec` coexist in `apply.ts` with no modularity pressure.

**Proposed function signature:**

```typescript
// src/agent/apply.ts — proposed addition
import { addBlock, renameBlock, addBlockAsNewTrack } from '../state/session.js';
import type { SaveAsBlockSpec } from './schema.js';

/**
 * Apply a saveAsBlock spec to the session: capture current live state as a named block,
 * optionally add it to a new track.
 *
 * Must be called AFTER applyRhythmSpec and applyHarmonySpec (so snapshot reflects
 * the fully-applied state). Per ADR 0021 D3.
 *
 * @param spec - The validated SaveAsBlockSpec from AgentOutputSchema.
 */
export function applyBlockSave(spec: SaveAsBlockSpec): void {
  // 1. Create the block with auto-generated name (captures live state via addBlock)
  addBlock(spec.type);

  // 2. Read back the newly created block (last element of composition.blocks)
  const state = get(sessionStore);
  const blocks = state.composition.blocks;
  if (blocks.length === 0) return;  // addBlock early-returned (empty code)
  const newBlock = blocks[blocks.length - 1];

  // 3. Rename to the agent-supplied name (OQ-2 resolution applied here)
  const finalName = spec.name.trim().slice(0, 100);  // truncation per OQ-2 → Option A
  if (finalName !== newBlock.name) {
    renameBlock(newBlock.id, finalName);
  }

  // 4. Optionally add a new track referencing this block
  if (spec.addToTrack === true) {
    addBlockAsNewTrack(newBlock.id);
  }
}
```

**Note on the "read-back" pattern:** Reading `blocks[blocks.length - 1]` is safe because `addBlock` is synchronous (`sessionStore.update` is synchronous in Svelte writable stores), and no other call can interleave between `addBlock(...)` and the subsequent `get(sessionStore)`. The block ID at that position is the one just created.

---

## §(h) Agent system-prompt scope

### Location

`SYSTEM_PROMPT` is defined as a module-level `const` string in `src/agent/agent.ts` lines 87–131. It is inline in the file — there is no separate prompt file, no external template, no i18n file for the prompt.

### Language

The `SYSTEM_PROMPT` is written **entirely in Spanish** (lines 87–131). The header comment at lines 82–86 confirms prototype parity (reference `orbifold.html` lines 1541–1585) and that it stays Spanish regardless of the UI language.

### Language-directive mechanism (ADR 0017 D7)

The system prompt stays Spanish. Per-request, the `buildContextAddendum` function (lines 233–278) appends a language directive keyed to the current `lang` store value. This directive instructs the agent to reply in the user's language (ES/EN/PT/ZH) without changing the prompt itself. The mechanism:

```typescript
// agent.ts lines 272–276
const currentLang = get(lang);
const languageName = LANGUAGE_NAMES[currentLang] ?? 'español';
addendum += '\n\n' + t_raw('agent.languageDirective', { languageName });
```

The `t_raw` call pulls a localized string (per-language text like "Please respond in English") from the i18n locales, ensuring the directive itself is in the correct language.

### i18n scope for the `saveAsBlock` capability

**The prompt itself does NOT need i18n.** The prompt is always Spanish. The capability description for `saveAsBlock` must be added to the Spanish `SYSTEM_PROMPT` string in `agent.ts`. The UI strings (button labels, tooltips, toast messages) that arise from the agent response are in i18n, but the prompt text is not.

**The capability description** must cover:
- The new `saveAsBlock` optional field and its three sub-fields.
- Which `type` values are valid.
- When the agent should use it (e.g., when the user says "guarda esto como bloque", "save the current groove", etc.).
- That `addToTrack: true` optionally places the block on a timeline track.

This description belongs in the "SKILLS" section of `SYSTEM_PROMPT` (lines 88–131), as a third skill or an extension of the existing two skills.

---

## §(i) Open questions for Pilot

### OQ-1 — Type validation: agent-declared vs. live-state-validated

**Question:** Should `saveAsBlock.type` be accepted as the agent's declaration (trusted), or should the system validate it against the actual live state before capturing?

**Context:** `addBlock` in `session.ts` accepts `'groove' | 'armonia' | 'sesion'` and dispatches to the corresponding capture function. If the agent declares `type: 'armonia'` but the live `sessionStore.harmony.progression` is empty (no chords), `addBlock` will still succeed — `harmonyCode(state)` may return an empty string, which causes `addBlock` to early-return (`if (!code) return;` — line 1256). So the type declaration can silently result in a no-op without validation.

**Recommendation — Option A (accept as declared, document the no-op):** Trust the agent's declared type. The existing `addBlock` early-return already guards against meaningless blocks (empty code). Adding live-state validation in `applyBlockSave` would require reading the store before calling `addBlock` and checking non-empty conditions for each type (e.g., `progression.length > 0` for armonia) — this creates a duplicate of logic already in `addBlock`. The simpler design trusts the agent and relies on the existing guard.

If the agent declares the wrong type (e.g., `'armonia'` when only rhythm is set), the result is either a no-op (empty code) or a block that captures whatever is in the store — both are acceptable outcomes for a v1 implementation. A richer validation pass can be added in a later phase if needed.

**Impact on ADR 0021:** D1 should record whether type is trusted or validated; recommend "trusted as declared."

---

### OQ-2 — Name truncation vs. no-op on names > 100 characters

**Question:** If the agent supplies a `name` with more than 100 characters, should `applyBlockSave` (a) silently truncate to 100 characters, or (b) treat the whole `saveAsBlock` as a no-op?

**Context:** `SavedBlockSchema` in `persistence.ts` uses `z.string().max(100)` for `name`. The proposed `SaveAsBlockSpecSchema` also uses `z.string().min(1).max(100)`. If the Zod schema enforces the max-100 constraint, a name > 100 chars causes `AgentOutputSchema.safeParse` to return `success: false` — the entire skill response is rejected (no rhythm, harmony, or block changes applied). This is potentially surprising: a valid rhythm spec in the same response would be silently dropped.

**Two concrete resolution options:**

- **Option A (Zod enforces max-100, whole skill rejected):** The Zod schema has `.max(100)` and a too-long name causes `safeParse` to fail for the whole output. Simple, consistent with Zod-first design, but potentially lossy for rhythm/harmony specs bundled with the oversized name.
- **Option B (Zod drops max constraint; `applyBlockSave` truncates):** The Zod schema for `name` uses `z.string().min(1)` only (no max). `applyBlockSave` truncates to 100 chars before calling `renameBlock`. The rhythm/harmony specs in the same response are applied normally. Truncation is silent (no user warning).
- **Option C (Zod drops max constraint; `applyBlockSave` is a no-op on > 100):** Same as B but instead of truncating, the `saveAsBlock` is silently skipped. The block is never created.

**Recommendation — Option B (truncation):** A too-long name is a minor violation, not a semantic error. Silently truncating is better than rejecting the entire skill response (which would cause the rhythm/harmony apply-functions to be skipped despite being valid). The truncated name is visible in the UI immediately, so the agent or user can correct it. This is also consistent with how defensive UI text fields handle overflow.

**Impact on ADR 0021:** D1 must record OQ-2 resolution and the exact truncation behavior (`.trim().slice(0, 100)`).

---

### OQ-3 — Should `saveAsBlock` alone (no `rhythm`, no `harmony`) be a valid response?

**Question:** The current `AgentOutputSchema.superRefine` guard requires at least one of `rhythm` or `harmony`. If the agent responds with only `saveAsBlock` (no rhythm, no harmony changes), the guard would fail `safeParse`, preventing the block save.

**Context:** The phase spec (step 01.3 lines 86, line 109) says `applyBlockSave` captures "whatever the current live state holds" — implying the agent could request a block save without changing rhythm/harmony. But under the current guard, this would be schema-invalid.

**Recommendation:** Relax the `superRefine` guard to: at least one of `rhythm`, `harmony`, or `saveAsBlock` must be present. The agent summary string in `send()` would also need to handle the case where `did` is empty but `saveAsBlock` was applied. This is a small logic change in `agent.ts` lines 367–370 and lines 374–389 (the `code` derivation and `summary` building paths that currently assume at least one of `'ritmo'`/`'armonía'` in `did`).

**Impact on ADR 0021:** D1 or D4 must record this guard relaxation.

---

### OQ-4 — Summary string and result type when only `saveAsBlock` fires

**Question:** The `send()` function returns `{ type: 'skill', code, summary }`. If only `saveAsBlock` is applied (no rhythm or harmony changes), `did` is empty, `code` derivation (lines 374–381) defaults to `harmonyCode(updatedState)` — this is the wrong code if no harmony was changed. What should `code` be, and what should `summary` say?

**Recommendation:** If `did` is empty but `saveAsBlock` succeeded:
- `code` can be the current session code (what is playing right now), so the UI can show it in the live drawer without a blank code pane.
- `summary` should mention the block name and type that was saved (e.g., "✓ Guardé el groove actual como bloque "X".").

This is a UX detail the Pilot should confirm before step 01.3 implements the `send()` patch.

---

## Pilot resolution — Checkpoint #1

_(To be filled by the Pilot before step 01.2 proceeds)_

- **OQ-1 →** …
- **OQ-2 →** …
- **OQ-3 →** …
- **OQ-4 →** …

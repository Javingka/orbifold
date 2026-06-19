# Decisions Register — AI Composition Authoring

This file lists vigent rules for this initiative. Planner and Dev read this
at every invocation. **The Pilot is the only writer.**

See `references/decisions-register-convention.md` for entry format.

## Carried-forward rules (in force project-wide)

From `docs/editable-composition/decisions.md`:
- **`Block.code` is the canonical playback source; `Block.snapshot` is the editable source** (ADR 0020 D2/D3): any code that creates a block must populate both; `buildComposition` reads only `code`; `bpm` excluded from all snapshots.
- **`openBlock` is restore-only and never touches the transport** (ADR 0020 D6): restore-only, no auto-play, no bpm change, silent no-op on snapshot-less blocks.

From `docs/harmonic-rhythm-improvements/decisions.md` (still in force):
- **Staff vertical coordinate is diatonic, not chromatic** (ADR 0011 D3).
- **`PX_PER_CYCLE = 48` is a cross-module coordination point** (`time-map.ts` ⇄ `ProgressionStrip.svelte`).
- **`orbifold.lang` is the cross-surface language contract** (ADR 0017).

## Active decisions

### `applyBlockSave` is the agent-layer block-save path; `addBlock` is the single snapshot-capture path

**Decision:** `applyBlockSave` (in `src/agent/apply.ts`) is the only agent-layer function that creates composition Blocks. It must delegate entirely to `addBlock` for snapshot capture — it must NOT call `captureGrooveSnapshot`, `captureArmoniaSnapshot`, or `captureSesionSnapshot` directly. Any future agent capability that creates blocks must follow this pattern: call `addBlock(type)`, read back from the store (because `addBlock` returns `void`), rename if needed, and optionally call `addBlockAsNewTrack`.
**Decided:** Phase 01 (ai-composition-authoring), 2026-06-18.
**Why:** `addBlock` is the established canonical path for block creation in the rest of the app (user-initiated). Keeping it as the single snapshot-capture path ensures agent-created blocks are structurally identical to user-created blocks, pass the same persistence round-trip, and are `openBlock`-able — without duplicating capture logic.
**Source:** `docs/adr/0021-agent-block-authoring.md` D3.
**Applies to:** `src/agent/apply.ts` and any future agent skill that creates or mutates composition blocks.

---

### Agent boolean capability fields require explicit trigger phrases in `SYSTEM_PROMPT`

**Decision:** Whenever a new optional boolean field is added to `AgentOutputSchema` (e.g., `addToTrack?: boolean`), the `SYSTEM_PROMPT` in `src/agent/agent.ts` must include: (1) an explicit list of concrete user trigger phrases in Spanish that should activate the field; (2) at least two JSON examples — one without the field and one with it set to `true`, labeled by scenario. A vague description like "ponlo en true cuando el usuario lo pida explícitamente" is insufficient — the LLM will silently omit the field.
**Decided:** Phase 01 (ai-composition-authoring), 2026-06-18. Lesson from Checkpoint #5 bug-fix #1.
**Why:** During Checkpoint #5, `addToTrack: true` was never emitted by the agent despite the user explicitly asking for it, because the `SYSTEM_PROMPT` had no concrete trigger phrases. Adding a list of recognized phrases ("pista", "timeline", "añade a una pista", etc.) fixed the issue. Without concrete examples, LLMs pattern-match on intent but omit optional boolean fields they have not seen in exemplars.
**Source:** `docs/adr/0021-agent-block-authoring.md` D5; Checkpoint #5 bug-fix #1 in `docs/ai-composition-authoring/handoffs/phase-01-handoff.md`.
**Applies to:** `src/agent/agent.ts` `SYSTEM_PROMPT` — any current or future boolean capability field in `AgentOutputSchema`.

## Superseded decisions

_(none)_

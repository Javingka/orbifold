<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0026 — `importSession` input contract: LLM-native structured chart

- **Status:** Accepted — ratified by Pilot 2026-07-02
- **Date:** 2026-07-02
- **Initiative / Phase:** song-import / Phase 02 (step 02.2)
- **Deciders:** Pilot (Javier)

## Context

Phase 02 of the `song-import` initiative delivers the `importSession` pure-translator skill.
The skill converts a song description into an Orbifold `SavedSession` (composition blocks,
harmony progression, minimal groove) reusing the Phase 01 vocabulary (`pow` quality,
`Block.label`, `SESSION_SCHEMA_VERSION = 7`).

Before implementation could begin, the input boundary of `importSession` had to be decided
(Open Decision OD-3 raised in step 02.1). Two options were evaluated:

**Option A — LLM-native structured chart:**
The function's input is a fully-typed structured object:
```typescript
{
  songTitle: string;
  artist?: string;
  bpm: number;       // int, [40, 280]
  key: string;       // note name: "E", "A", "C#", etc.
  mode: string;      // one of the 8 SK_MODES values
  sections: Array<{
    label: string;
    chords: Array<{
      root: string;   // note name
      quality: Quality;
      bars?: number;
    }>;
  }>;
}
```
The caller (an LLM from its own knowledge, a future scraper/UI, or a test fixture)
is responsible for producing this object. `importSession` validates, maps, and assembles
the `SavedSession`. This is the pattern the Pilot identified as the MVP instinct.

**Option B — Raw tab text:**
The function's input includes a `rawChart: string` field (free-text chord chart as scraped
from Ultimate Guitar, Chordify, etc.). The function must first parse the raw text into
sections/chords (tab-parsing logic), then assemble the session. This bundles parsing and
translation into one function.

---

## Decision (OD-3 = Option A)

**`importSession` receives a structured `ImportSessionInput` object — NOT raw tab text.**

The `ImportSessionInputSchema` (Zod) enforces the shape at the boundary. The skill is a
pure validator+translator: it validates the structured input, maps each chord to pitch-class
representation via `noteToPc`, calls `melodyLine` directly from `src/core/codegen/strudel.ts`
(the pure-engine path, no Svelte store), and assembles a `SavedSession` conforming to
`SavedSessionSchema` (version 7).

`IMPORT_SCHEMA_VERSION = 1` versions the input contract independently of `SCHEMA_VERSION`
(agent output schema) and `SESSION_SCHEMA_VERSION` (persistence schema). Bump it when the
structured input contract changes.

The concern of "who produces the structured input" — an LLM prompted with the song name, a
scraper from Ultimate Guitar, a future UI form — is **upstream of `importSession`** and is
explicitly out of scope for Phase 02. Option A does not close that concern; a scraper could
equally populate the same structured object. The boundary is clean: whatever the source,
`importSession` receives typed, validated data.

---

## Decisions

### D1 — Input schema shape (`ImportSessionInputSchema`)

**Decision:** The canonical `ImportSessionInputSchema` (Zod) shape is:

```typescript
z.object({
  songTitle: z.string().min(1).max(200),
  artist: z.string().optional(),
  bpm: z.number().int().min(40).max(280),
  key: z.string().refine(v => noteToPc(v) !== null, { message: 'key: invalid note name' }),
  mode: z.enum(['major','minor','dorian','phrygian','lydian','mixolydian','locrian','harmonic:minor']),
  sections: z.array(SectionSpecSchema).min(1).max(16),
})
```

Where `SectionSpecSchema.chords[*].root` carries the same `.refine()` guard as `key`.
This ensures invalid note names (e.g. `"H"`) are rejected at `safeParse` time with a
clear error message, not deep in the mapping logic.

**Rationale:** Validating at the schema boundary is the Zod idiomatic pattern. It keeps
`importSession()` free of defensive null-checks on `noteToPc()` results, since the schema
guarantees all root/key strings are parseable before the function body runs.

---

### D2 — Pure-engine codegen path (no Svelte store coupling)

**Decision:** `importSession` calls `melodyLine` directly from
`src/core/codegen/strudel.ts`. It does NOT import `harmonyCode` or `sessionCode` from
`src/state/session.ts`.

**Rationale (from inventory section b):** `session.ts` imports `svelte/store` at module
load time. Importing it in a Node/Vitest context drags in the entire Svelte store graph,
violating the `src/core/**` purity requirement and making the skill untestable without a
browser-like environment. `melodyLine` in `src/core/codegen/strudel.ts` has no
DOM/PIXI/Svelte imports — it accepts all arguments explicitly and is already exercised
by 2104 passing tests in the pure Vitest/Node environment.

A comment in `src/agent/import-session.ts` documents this decision so future developers
do not inadvertently switch to the store-coupled path.

---

### D3 — No tab parsing in `importSession`

**Decision:** `importSession` contains zero tab-parsing logic. It does not accept
`rawChart: string`. All parsing/interpretation (from song name, audio, tabs, or any
other source) is upstream and out of scope for this skill.

**Rationale:** Mixing parsing + translation in one function creates brittleness against
tab-format variations and makes unit testing harder (the golden fixture would have to be
a free-text string instead of a typed object). The structured boundary makes the function
trivially testable and its contract clear.

---

### D4 — Octave default

**Decision:** `importSession` uses octave 2 as the default for all keys. This is
documented in a comment in `import-session.ts`. A future phase may add per-key
heuristics or expose octave as an explicit field in `ImportSessionInputSchema`.

**Rationale:** The primary use case for `importSession` in this initiative is rock/metal
charts where guitar parts live in the low register (octave 2 places the root of an E
chord at E2 — standard guitar low E). A constant is easy to replace when the heuristic
is specified.

---

### D5 — Groove default (SUPERSEDED by Amendment §A1 below)

**Decision (Phase 02):** `importSession` set rhythm to a minimal default: a single `bd` layer
with steps `[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]` (kick on beats 1 and 3 of a 16-step
pattern). The skill did not attempt to infer or generate groove.

**Rationale (Phase 02):** Groove generation was a separate concern handled by the existing
autopilot/recipe system. The default satisfied `SavedRhythmSchema` constraints while leaving
groove customisation to the user.

**Superseded:** See Amendment §A1 (Phase 03 step 03.4). Groove is now first-class and
per-section, returned by the LLM alongside the chord chart (OD-7 Option B resolution).
The generic default is replaced by LLM-sourced per-section rhythmic signatures.

---

## Consequences

### Files created in Phase 02 step 02.2

| File | Nature |
|---|---|
| `docs/adr/0026-import-session-input-contract.md` | This ADR |
| `src/agent/import-session.ts` | New file: `IMPORT_SCHEMA_VERSION`, schemas, `importSession` function |
| `tests/song-import/import-session.test.ts` | New file: golden-fixture test, schema validation, regression guard |

### Files NOT modified

All existing files remain unchanged. The skill is purely additive.

### Invariants preserved

- **`SCHEMA_VERSION` stays 7:** `AgentOutputSchema` is not extended.
- **`SESSION_SCHEMA_VERSION` stays 7:** `SavedSessionSchema` is not modified.
- **`src/core/**` purity:** `import-session.ts` is in `src/agent/` (not `src/core/`),
  and calls only pure-engine functions from `src/core/`.
- **No Svelte store imports in `import-session.ts`:** Verified by static analysis
  (A-02-13).
- **AGPL-3.0 header:** Present in all new files.

### Future compatibility

- If the input contract grows (new fields, changed types): bump `IMPORT_SCHEMA_VERSION`.
- If `importSession` needs store wiring (apply to live session): add `applyImportSession`
  in `apply.ts` — do NOT add store imports to `import-session.ts`.
- If octave heuristics are needed: add `octave?: number` to `ImportSessionInputSchema`
  and pass it through, or implement a key→octave lookup. Either change triggers a
  `IMPORT_SCHEMA_VERSION` bump.
- If the parsing/interpretation source is decided (LLM prompt, scraper, UI form):
  that concern lives upstream and does not change `importSession`'s contract.

---

## Amendment A1 — Phase 03 step 03.4: per-section groove + `IMPORT_SCHEMA_VERSION` → 2

- **Date:** 2026-07-03
- **Initiative / Phase:** song-import / Phase 03 (step 03.4)
- **Trigger:** OD-7 resolution (per-section song-specific rhythmic signatures, first-class
  parity with harmony — Option B chosen, generic backbeat Option A rejected by Pilot).

### Changes to the input contract (`IMPORT_SCHEMA_VERSION` 1 → 2)

D1 (`ImportSessionInputSchema`) is amended: `SectionSpecSchema` gains a **required** `groove`
field (`ImportGrooveSchema`). This is a breaking change to the v1 input contract —
fixtures and LLM prompts must include `groove` on every section.

**New `ImportGrooveLayerSchema`:**
```typescript
z.object({
  sound: z.enum(IMPORT_SK_SOUNDS),   // mirrors SK_SOUNDS / Sound type
  steps: z.array(z.number().int().min(0).max(1)).length(16),  // exactly 16 — 1 cycle = 4/4
})
```

**New `ImportGrooveSchema`:**
```typescript
z.object({
  layers: z.array(ImportGrooveLayerSchema).min(1).max(8),
})
```

**Updated `SectionSpecSchema`:**
```typescript
z.object({
  label: z.string().min(1).max(100),
  chords: z.array(ChordSpecSchema).min(1).max(16),
  groove: ImportGrooveSchema,   // REQUIRED — OD-7: rhythm first-class
})
```

`groove` is **required** (not optional). If the LLM omits it, `safeParse` fails and the
user retries. A silent fallback to no drums would be worse than an informative error.

**`IMPORT_SCHEMA_VERSION` bump rationale:**
- v1 → v2 because `SectionSpecSchema` gains a required field, breaking existing v1 fixtures.
- Independent of `SCHEMA_VERSION` (agent schema) and `SESSION_SCHEMA_VERSION` (persistence).

### Changes to the output contract

D5 (groove default) is superseded. `importSession` now:

1. **Builds one harmony block + one groove block per section** (2N blocks total for N sections).
   - Harmony blocks (type `'armonia'`, indices 0…N-1): unchanged from Phase 02 except each
     now carries an inline `ArmoniaSnapshot` (makes `openBlock` work).
   - Groove blocks (type `'groove'`, indices N…2N-1): code generated via
     `rhythmToStrudel(section.groove.layers)` (pure, no store); carry a `GrooveSnapshot`.
   - Both block types carry `label = section.label` for timeline display.

2. **Assembles two parallel composition tracks** (harmony track + rhythm track), bar-for-bar
   aligned. No `silence` padding needed because each groove block has the same `bars` value as
   its corresponding harmony block.

3. **Sets `rhythm.layers`** to the first section's groove layers (mirrors
   `harmony.progression = first section's chords` — the "live" standalone rhythm engine state).

4. **Editable snapshots on all blocks**: both `ArmoniaSnapshot` and `GrooveSnapshot` are built
   inline (store-free — the `capture*` functions from `snapshot.ts` are NOT called, as they
   require a live `SessionState`). This fixes the "blocks not editable" gap found in step 03.3.

5. **`applyLoadedSession` snapshot carry-through** (fix in `src/state/session.ts`): the
   `applyLoadedSession` function now carries the optional `snapshot` field through to the
   runtime `Block` object. Without this, any saved session with block snapshots (including
   all `importSession` output after this amendment) would lose its snapshot on load, making
   blocks permanently read-only. This fix is additive and non-breaking for pre-snapshot
   sessions (conditional spread produces `{}` for `undefined`).

### OD-7 design principle

**Rhythm is first-class — parity with harmony.** The LLM returns a drum pattern per section
alongside the chord chart. Each section has both a `chords[]` array (harmony) and a `groove`
object (rhythm). `importSession` produces one `armonia` block + one `groove` block per section,
arranged in two parallel composition tracks.

> "El ritmo identifica una canción tanto o más que la armonía; no podemos dar soluciones
> genéricas; tenemos que encontrar la 'signatura rítmica' de las canciones, con la misma
> estrategia que hacemos con armonía." — Pilot rationale, 2026-07-03.

### Files modified in Phase 03 step 03.4

| File | Nature |
|---|---|
| `src/agent/import-session.ts` | Extended: `IMPORT_SCHEMA_VERSION` → 2, `ImportGrooveLayerSchema`, `ImportGrooveSchema`, `groove` on `SectionSpecSchema`; 2N blocks + 2 tracks + snapshots |
| `src/state/session.ts` | Extended: `applyLoadedSession` now carries `snapshot` field through to runtime Block |
| `tests/song-import/import-session.test.ts` | Updated: fixture gains `groove` per section; 26 new / updated tests (A-03-24…A-03-37) |
| `tests/song-import/import-agent.test.ts` | Updated: fixtures and inline inputs gain `groove` field; label carry-through assertions updated for 6-block output |
| `src/agent/import-prompt.ts` | Extended: per-section `groove` in `IMPORT_SYSTEM_PROMPT` (see ADR 0028 §D8) |
| `src/agent/import-agent.ts` | Updated: `max_tokens` 600 → 1600 (see ADR 0028 §D8) |

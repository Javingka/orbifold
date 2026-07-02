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

### D5 — Groove default

**Decision:** `importSession` sets rhythm to a minimal default: a single `bd` layer
with steps `[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]` (kick on beats 1 and 3 of a 16-step
pattern). The skill does not attempt to infer or generate groove.

**Rationale:** Groove generation is a separate concern handled by the existing
autopilot/recipe system. Attempting to infer groove from chord charts is out of scope
for Phase 02 and would bloat `importSession` beyond its "pure translator" mandate.
The default satisfies `SavedRhythmSchema` constraints while leaving groove customisation
to the user.

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

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 02 — Music Knowledge Catalog

**Purpose:** Create a curated, pure-data music-knowledge layer (rhythm catalog, harmony catalog, intent→recipe mappings, and query functions) so later phases can make the agent's rhythm/harmony proposals musically assertive.
**Gate:** ai-jam Phase 01 merged to `main` (autopilot core, ADR 0022); no open ai-jam blockers.
**Expected phase result:** `src/core/music-knowledge/` exists with typed catalogs (≥30 rhythms, ≥8 harmonies, ≥8 recipes) and a query module, fully unit-tested. Nothing is wired into the agent, schema, prompt, codegen, or UI — so the byte-identical guarantee holds trivially: no existing module imports the new code, and `main`'s runtime behavior is unchanged. This is the foundation of a multi-phase arc (later phases — not scoped here — will add a `musicalIntent` schema field, a recipe→state engine, prompt examples, and UI surfacing); this phase delivers only the knowledge layer.

---

## Step 02.1 — Inventory

PROMPT → Read the source-of-truth (`src/agent/schema.ts`, `src/core/rhythm/euclid.ts`, `src/core/codegen/strudel.ts`, `src/core/theory/pitch.ts` + `chords.ts`, `src/core/composition/snapshot.ts`) and produce `docs/ai-jam/inventories/phase-02-inventory.md`, then STOP for Pilot review. Do NOT write any catalog or query code in this step.

Implementation requirements:
- Document the **representation constraints the agent schema imposes today**: rhythm `steps` is exactly 16; euclid is `{k∈[1,16], n∈[2,16], rot∈[0,n-1]}`; harmony `quality ∈ {maj,min,dim,aug}` only; `root` is a note name (see `NOTE_NAMES`); `bars` multiples of 0.25.
- Document the **euclid engine signature** in `src/core/rhythm/euclid.ts` (the canonical generator the catalog's congruence tests must call, so catalog data is verified against real engine output — not a re-implementation).
- Propose the catalog's own type model: `RhythmEntry`, `HarmonyEntry`, `MusicalRecipe` (field-by-field), independent of `AgentOutputSchema`.
- Record the two model-fidelity decisions **already resolved by the Pilot** (below) and confirm their feasibility against the schema/codegen; the inventory documents them as resolved, it does not re-open them:
  - **OD-1 Chord vocabulary breadth — RESOLVED: richer closed enum.** The harmony catalog uses a curated, closed quality enum richer than the agent schema's `maj/min/dim/aug`. Fixed vocabulary (17): `maj, min, dim, aug, maj7, m7, 7, m7b5, dim7, 6, m6, sus2, sus4, 9, maj9, m9, add9`. It is a TypeScript union/const — not free strings. Reconciliation to the agent schema (extend schema+theory+codegen, OR downsample each extension to its triad — `m7→min`, `maj7→maj`, `7→maj`, `dim7→dim`, etc.) is deferred to the future recipe→state phase under its own ADR. The inventory must confirm the downsample fallback is total (every enum member reduces to a valid schema triad).
  - **OD-2 Rhythm step-resolution — RESOLVED: native grids.** Each pattern is stored in its native step count (8/12/16/odd). Every entry carries a `strudelStrategy: 'euclid' | 'struct'` marker recording its intended future emission channel: traditional timelines that are Euclidean use `euclid {k,n,rot}` (covers E(3,8), E(7,12), etc.); non-Euclidean 16-step patterns (e.g. son clave) target schema `steps[16]`; everything else targets arbitrary-length `struct(mini)` (Strudel-native). Reconciliation of non-16 / non-euclid grids to the agent schema is deferred to the future recipe→state phase under its own ADR. The inventory must confirm `core/rhythm/euclid.ts` is the engine used to validate every `euclid`-strategy entry.
- Confirm placement: `src/core/music-knowledge/` (pure engine, no DOM/PIXI/Svelte imports — consistent with the `core/**` invariant) and tests under `tests/music-knowledge/`.

Validation:
- The inventory file exists and lists the schema constraints, the euclid signature, the proposed type model, and OD-1/OD-2 with options.

Expected result:
- A reviewable inventory; no source files created. Pilot review is mandatory before 02.2.

CHECKPOINT → Commit message:
`docs(ai-jam): Phase 02 step 02.1 — music-knowledge inventory`

---

## Step 02.2 — Rhythm catalog + congruence tests

PROMPT → Create `src/core/music-knowledge/rhythm-catalog.ts` exporting `RhythmEntry` and `RHYTHM_CATALOG`, plus `tests/music-knowledge/rhythm-catalog.test.ts`. Implements OD-2 as the Pilot resolved it.

Implementation requirements:
- At least 30 entries, each with: stable `id` (kebab/snake, unique), `name`, `family`, `traditions[]`, `meter`, `steps` (native count — 8/12/16/odd, per OD-2), `roles[]`, a `strudelStrategy: 'euclid' | 'struct'` marker (OD-2 emission channel), and a complete representation — both a `binary` string and an `onsets[]` array, plus `mini` mini-notation; entries with `strudelStrategy: 'euclid'` additionally carry `euclid: {k,n,rot}`.
- Cover a culturally broad set (claves, tresillo/cinquillo, West-African bell/12-8 timelines, aksak/odd meters, straight/backbeat pop cells) — no audio files, no fetches, no external runtime imports.
- Each entry's `traditions`/`name` for "inspired-by" cells must not over-claim a specific closed cultural label when the pattern is only generic (this convention is enforced in the prompt phase later, but the catalog must not seed false specificity).
- The test verifies, for every entry: `binary` length == `steps`; `onsets` are exactly the indices of `1`s in `binary`; `mini` token count == `steps` with onset tokens aligned to `onsets`; `strudelStrategy === 'euclid'` iff an `euclid` field is present; and where `euclid` is present, calling the real `src/core/rhythm/euclid.ts` generator with `{k,n,rot}` reproduces `binary` exactly.

Validation:
- `pnpm exec vitest run music-knowledge/rhythm-catalog`
- `pnpm exec tsc --noEmit`

Expected result:
- ≥30 congruent rhythm entries; congruence and euclid-engine agreement proven by tests.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 02 step 02.2 — rhythm catalog + congruence tests`

---

## Step 02.3 — Harmony catalog + tests

PROMPT → Create `src/core/music-knowledge/harmony-catalog.ts` exporting `HarmonyEntry` and `HARMONY_CATALOG`, plus `tests/music-knowledge/harmony-catalog.test.ts`. Implements OD-1 as the Pilot resolved it.

Implementation requirements:
- At least 8 entries, each with: stable unique `id`, `name`, `tags[]`, `modeCenter`, `chordMode` (`chord` | `arp`), optional `suggestedPreset` (must be one of the schema presets `piano | guitar | synth-bass` if present), and an ordered `progression[]` of `{ root, quality, bars }`.
- `quality` is drawn from the OD-1 closed enum (exported as a TS union/const): `maj, min, dim, aug, maj7, m7, 7, m7b5, dim7, 6, m6, sus2, sus4, 9, maj9, m9, add9`. `root` must be a valid `NOTE_NAMES` entry; `bars` a multiple of 0.25.
- The catalog is reference data only — do NOT add a downsample-to-triad map here (that belongs to the future recipe→state phase per OD-1). But the test must prove the fallback is total: a static table mapping every enum member to a schema triad (`maj/min/dim/aug`) exists in the test (not in source) and covers all 17.
- The test verifies referential validity of every chord: `root ∈ NOTE_NAMES`, `bars` is a 0.25 multiple, `quality` is in the OD-1 enum, `suggestedPreset` (when present) is a valid schema preset; and that all `id`s are unique.

Validation:
- `pnpm exec vitest run music-knowledge/harmony-catalog`
- `pnpm exec tsc --noEmit`

Expected result:
- ≥8 valid harmony entries; field-validity and id-uniqueness proven by tests.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 02 step 02.3 — harmony catalog + tests`

---

## Step 02.4 — Recipes (intent → rhythm + harmony) + referential-integrity tests

PROMPT → Create `src/core/music-knowledge/rhythm-harmony-recipes.ts` exporting `MusicalRecipe` and `RHYTHM_HARMONY_RECIPES`, plus `tests/music-knowledge/recipes.test.ts`.

Implementation requirements:
- At least 8 recipes, each with: stable unique `id`, `name`, `userIntents[]` (non-empty natural-language trigger phrases), `rhythmIds[]` (≥1), exactly one `harmonyId`, `bpmRange: [min,max]`, `meter`, `density`, and an `agentInstruction` string.
- Recipe `meter` must equal the meter of every rhythm it references (no cross-meter recipes) — this guards the geometry/timing invariant downstream.
- The test verifies **referential integrity**: every `rhythmIds` entry resolves to an existing `RHYTHM_CATALOG.id`, every `harmonyId` resolves to an existing `HARMONY_CATALOG.id`, all recipe `id`s are unique, every `userIntents` array is non-empty, and `bpmRange` is `40 ≤ min ≤ max ≤ 240`, and recipe/rhythm meters agree.

Validation:
- `pnpm exec vitest run music-knowledge/recipes`
- `pnpm exec tsc --noEmit`

Expected result:
- ≥8 recipes wiring rhythm+harmony with proven referential integrity.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 02 step 02.4 — rhythm-harmony recipes + integrity tests`

---

## Step 02.5 — Query module + tests

PROMPT → Create `src/core/music-knowledge/query.ts` exporting `findRecipesForPrompt`, `getRhythmById`, `getHarmonyById` (and `getRecipeById`), plus `tests/music-knowledge/query.test.ts`. Pure functions only — no I/O, no LLM call.

Implementation requirements:
- `getRhythmById` / `getHarmonyById` / `getRecipeById` return the entry or `undefined`.
- `findRecipesForPrompt(prompt: string): MusicalRecipe[]` matches the prompt against recipe `userIntents` (and may use `tags`/`traditions`) using a deterministic, case/diacritic-insensitive token-overlap scoring; returns matches best-first; returns `[]` on no match. The algorithm must be documented in a comment and must NOT call any network or model.
- The test verifies: representative prompts map to the expected recipe(s) (e.g., an afro-latin/clave-minor phrase → the afro-latin recipe; an african-ritual/polyrhythm phrase → the west-african recipe); a nonsense prompt returns `[]`; id getters return entry-or-undefined; matching is deterministic (same input → same order) and diacritic-insensitive ("afro latino" ⇔ "afro latíno").

Validation:
- `pnpm exec vitest run music-knowledge/query`
- `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build`

Expected result:
- Deterministic retrieval over the catalogs; full suite + build green; nothing outside `src/core/music-knowledge/` and `tests/music-knowledge/` changed.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 02 step 02.5 — query module + tests`

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-02-01** — The rhythm catalog contains ≥30 symbolic patterns, each with a stable unique id, meter, roles, and a complete representation (binary + onsets + mini; euclid params where applicable).
  - Validation method: `unit`
- **A-02-02** — For every rhythm entry the representations are mutually congruent (binary ⇔ onsets ⇔ mini agree) and any `euclid` params reproduce the stated `binary` via the real `core/rhythm/euclid.ts` engine.
  - Validation method: `unit`
- **A-02-03** — The harmony catalog contains ≥8 entries, each with a stable unique id, mode center, chord mode, and an ordered progression whose every chord has a valid `root` (∈ NOTE_NAMES), `bars` (0.25 multiple), and a `quality` in the Pilot-fixed vocabulary.
  - Validation method: `unit`
- **A-02-04** — The recipe catalog contains ≥8 recipes; each references ≥1 existing rhythm id and exactly one existing harmony id (referential integrity holds), with non-empty userIntents, a valid bpmRange (40–240), and a meter matching its rhythms.
  - Validation method: `unit`
- **A-02-05** — `findRecipesForPrompt` returns the expected recipe(s) for representative intent phrases and `[]` for non-matches (deterministic, diacritic-insensitive); `getRhythmById`/`getHarmonyById`/`getRecipeById` return the entry or `undefined`.
  - Validation method: `unit`
- **A-02-06** — The music-knowledge module introduces no new runtime dependency, no audio files, and no DOM/PIXI/Svelte import (pure, lives in `src/core/**`).
  - Validation method: `unit` (import-graph / static assertion) + `proxy:static-analysis`
- **A-02-07** — Byte-identical guarantee: no pre-existing module imports `music-knowledge`, and `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all pass clean.
  - Validation method: `live-system` (operability — actual command output in handoff)

## Partial coverage from prior phase

No prior partials to address. Phase 01's PARTIAL entries (A-01-03, A-01-06, A-01-07) were closed within Phase 01 step 01.5 (handoff phase-01, final review).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Chord-vocabulary reconciliation (OD-1)** — RESOLVED for the catalog (richer closed enum). The ADR fires in the **future recipe→state phase**, not here: it will decide extend-schema-and-codegen vs downsample-to-triad when emitting catalog harmony as `AgentOutput`. No ADR in Phase 02 (no schema/codegen change).
- **Rhythm step-resolution reconciliation (OD-2)** — RESOLVED for the catalog (native grids + `strudelStrategy`). The ADR fires in the **future recipe→state phase**: it will decide how non-16 / `struct` patterns are emitted (extend agent schema to variable-length `struct(mini)` vs constrain recipes to schema-expressible patterns). No ADR in Phase 02.
- **`src/core/music-knowledge/` module boundary** — Trigger: step 02.1, only if placement/exports diverge from the proposed pure-core layout.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-02-handoff.md`. See `handoff-template.md`.

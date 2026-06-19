<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 — Catalog Expansion, 16-Step Constraint, and Informed Improvisation Prompt

**Purpose:** Expand the rhythm catalog from 31 to ≥45 entries (including cueca chilena and other culturally significant patterns), tighten the 16-step constraint in both system prompts with an explicit 3/4-meter example, and add an informed-improvisation fallback section so the LLM reasons about cultural context before generating patterns when no recipe matches.
**Gate:** ai-jam Phase 04 merged to `main` (recipe intent card in AgentPanel, `LastRecipeDisplay`, i18n keys; 1387/1387 tests passing); no open ai-jam blockers.
**Expected phase result:** `RHYTHM_CATALOG` has ≥45 entries (all congruence-tested automatically), `RHYTHM_HARMONY_RECIPES` has ≥13 entries (all referential-integrity-tested automatically), `SYSTEM_PROMPT` and `SYSTEM_PROMPT_EVOLUTION` both explicitly prohibit non-16 `steps[]` arrays with a concrete 3/4 example using `euclid`, and both prompts include an informed-improvisation fallback section instructing the LLM to reason about cultural context first and include `musicalIntent.explanation`; all quality gates pass clean.

---

## Step 05.1 — Inventory

PROMPT → Read the source-of-truth files listed below and produce `docs/ai-jam/inventories/phase-05-inventory.md`, then STOP for Pilot review. Do NOT write any source file in this step.

Source-of-truth files to read (all of them, fully):
- `src/agent/agent.ts` — `SYSTEM_PROMPT` (full text) and `SYSTEM_PROMPT_EVOLUTION` (full text): identify every place the 16-step constraint is mentioned or not mentioned; identify where an improvisation fallback section would be inserted
- `src/agent/schema.ts` — `RhythmLayerStepsSchema` and `RhythmLayerEuclidSchema`: confirm the exact Zod constraint on `steps.length` and the euclid parameter bounds; confirm that `n` goes up to 16 (euclid can cover non-16-step patterns via `n < 16`)
- `src/core/music-knowledge/rhythm-catalog.ts` — all 31 existing entries: enumerate their families, meters, and `strudelStrategy`; identify structural gaps (missing traditions, meter families, under-covered regions)
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — all 10 existing recipes: enumerate which catalog entries are referenced, which meters are covered, and where new recipes can be added
- `src/i18n/types.ts` and `src/i18n/locales/es.ts` — confirm no new UI labels are required by this phase (catalog and prompt changes are not user-facing strings; any new recipe card data is free-text from the LLM)

Implementation requirements:
- Document the **two open decisions (OD-1 and OD-2)** that must be resolved before implementation:
  - **OD-1 — Which new rhythm entries to add:** The Pilot has named cueca chilena (3/4) and a more faithful bossa nova pattern as priorities. The inventory must enumerate the full candidate list: identify at least 14 candidate entries spanning Latin, African, global, and European traditions, organized by family/meter. For each candidate, note its `meter`, proposed `strudelStrategy` (`euclid` or `struct`), approximate step count, and the tradition it represents. The Pilot resolves which subset to implement. Include: cueca chilena 3/4, candombe-inspired (2/4 or 6/8), samba esquema de surdo (2/4), funk/clave-inspired 16-step (struct), cumbia bass pattern, Gnawa guembri (12/8 or 8-step), bossa nova repique-inspired (more faithful), Afrobeat hi-hat dense 16, Flamenco bulería (12/8), Soca/Calypso (4/4 struct), and at least four additional candidates the Dev identifies from musical reference.
  - **OD-2 — Prompt structure for improvisation fallback:** Two options:
    - **Option A — Consolidated trailing section:** Add a new `══════════ IMPROVISACIÓN INFORMADA (cuando no hay receta disponible) ══════════` section at the end of both prompts (after existing sections, before or after RESTRICCIONES ABSOLUTAS). Advantages: clean separation; easy for the LLM to locate; does not disrupt existing skill sections. Disadvantage: slightly further from the skills preamble.
    - **Option B — Inline in restrictions block:** Expand the RESTRICCIONES block to include improvisation guidance directly after the 16-step constraint. Advantages: co-located with the constraint it relates to. Disadvantage: makes the restrictions block longer and mixes two concerns.
    - The inventory must document both options and their tradeoffs. OD-2 must be resolved by Pilot before step 05.3.
- Document the **16-step constraint gap analysis:** Quote the exact lines in both prompts where the constraint is stated today; identify what is missing (no explicit example of what to do for 3/4 or 12/8; no explicit prohibition of `steps[12]`); propose the exact new text to add (one or two sentences + a concrete JSON example using `euclid` for a 3/4 pattern such as E(3,4) for quarter-note feel or E(6,12) for compound 3/4).
- Document the **improvisation fallback content requirements:** List the three mandatory sub-instructions (A: reason about cultural/musical characteristics first; B: generate using valid schema formats; C: include `musicalIntent.explanation` describing the reasoning) and one guard instruction (D: use "inspirado en" not "es" for cultural accuracy). Note that `musicalIntent` already exists in the schema (ADR 0023 D1); no schema changes are needed.
- Confirm **no new Zod schema changes** are needed (the `euclid` variant already supports `n` up to 16, covering all non-16-step patterns; `steps` is already constrained to exactly 16; the existing `MusicalIntentSchema.explanation` field carries the fallback reasoning).
- Confirm **no new i18n keys** are needed (catalog entries and prompt text are not user-visible strings; the `musicalIntent.explanation` content is LLM-generated free text displayed via the existing recipe card from Phase 04).
- Confirm **no new Zod schema changes** (A-05-06 is purely a quality gate, not a schema bump).
- Identify **which test files cover new entries automatically:** the congruence test (`tests/music-knowledge/rhythm-catalog.test.ts` or equivalent) iterates all entries in `RHYTHM_CATALOG` — new entries are covered without manual test additions; the referential integrity test (`tests/music-knowledge/recipes.test.ts`) iterates all recipes — new recipes are covered automatically.

Validation:
- The inventory file exists and covers all five sections above (OD-1 candidate list, OD-2 options, 16-step gap analysis, improvisation content requirements, test coverage confirmation).
- No source files modified.

Expected result:
- A reviewable inventory; OD-1 (which rhythms to add) and OD-2 (prompt structure) surfaced for Pilot resolution before steps 05.2–05.4 begin.

CHECKPOINT → Commit message:
`docs(ai-jam): Phase 05 step 05.1 — catalog-expansion inventory`

---

## Step 05.2 — Catalog expansion: ≥14 new RhythmEntry items

PROMPT → Read `src/core/music-knowledge/rhythm-catalog.ts` (full), `src/core/rhythm/euclid.ts` (full — needed to verify binary pre-computations), `docs/ai-jam/decisions.md`, `docs/ai-jam/inventories/phase-05-inventory.md` (OD-1 resolution section), and the congruence test file. Then add the Pilot-approved new rhythm entries.

Implementation requirements:
- Add the entries the Pilot approved in OD-1 resolution. The minimum is 14 new entries (to reach ≥45 total). Use the `euclidEntry` or `structEntry` helpers already defined in the file — do not add new helpers.
- Each new `euclid`-strategy entry must have its `binary` pre-computed from the real Bjorklund engine (`rotate(bjorklund(k, n), rot).join('')`). Do NOT guess binary strings — verify against the euclid engine or cite the engine output method used. The congruence test (invariant 5) will catch incorrect binary strings, so the test suite is the authoritative check.
- Each new `struct`-strategy entry must have its `binary` and derived `onsets`/`mini` fields filled in correctly. The `structEntry` helper computes `onsets` and `mini` from `binary` — ensure `binary` is a correct binary string for the intended pattern (count onset characters to verify onset count, inspect onset positions for musical correctness).
- Cultural accuracy: `traditions` arrays must use descriptive labels. For patterns that are common across multiple traditions or are approximations, use inclusive labels (e.g., `'bossa nova inspired'`, `'cumbia groove'`, `'Chilean folk-inspired'`) rather than asserting closed ownership. For patterns with direct Euclidean or structural provenance (e.g., Gnawa guembri pattern sourced from Toussaint), cite the source tradition.
- Meter coverage: include at least one entry in 3/4 meter with a 12-step or 3-step representation (not 16-step), demonstrating the `euclid` variant for non-4/4 patterns.
- Update the catalog header comment to reflect the new total (≥45 entries) and any new family/meter coverage lines.
- Do NOT modify any existing entries. Do NOT rename or remove any entry (referential integrity — existing recipe IDs reference them).

Validation:
- `pnpm exec vitest run rhythm-catalog` — all congruence tests pass for new and existing entries
- `pnpm exec tsc --noEmit` — clean
- `pnpm test` — all tests pass (baseline: ≥1387)

Expected result:
- `RHYTHM_CATALOG` has ≥45 entries; all pass the binary/onsets/mini/euclid congruence invariants; no existing entries modified.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 05 step 05.2 — rhythm catalog expanded to ≥45 entries`

---

## Step 05.3 — Prompt update: 16-step constraint + improvisation fallback

PROMPT → Read `src/agent/agent.ts` (full — both `SYSTEM_PROMPT` and `SYSTEM_PROMPT_EVOLUTION`), `src/agent/schema.ts` (the `RhythmLayerStepsSchema` and `RhythmLayerEuclidSchema` sections), `docs/ai-jam/decisions.md`, `docs/ai-jam/inventories/phase-05-inventory.md` (OD-2 resolution + 16-step gap analysis + improvisation content requirements sections). Then update both prompts.

Implementation requirements:
- **16-step constraint strengthening** — in both `SYSTEM_PROMPT` and `SYSTEM_PROMPT_EVOLUTION`:
  - The existing constraint line `Cada capa usa "steps" (EXACTAMENTE 16 enteros 0/1) Ó "euclid" {k:1..16, n:2..16, rot:0..n-1}. No ambos.` already exists; augment it with an explicit prohibition and example:
    - Add (in Spanish, per ADR 0017 D7): a one-sentence prohibition stating that for 3/4, 6/8, or 12/8 meter patterns, `steps[]` is NEVER used with 12, 6, or 3 elements — `euclid` is always required; a concrete JSON example of a 3/4 quarter-note pattern using `"euclid": {"k": 3, "n": 4, "rot": 0}` (E(3,4) — three quarter notes in 3/4) as the correct approach.
    - The example must be a valid complete layer object showing both the prohibition context and the correct euclid usage.
  - Placement: immediately after or replacing the existing constraint bullet, keeping the surrounding structure intact.
- **Improvisation fallback section** — add to both `SYSTEM_PROMPT` and `SYSTEM_PROMPT_EVOLUTION` per the OD-2 Pilot resolution (Option A or Option B):
  - Sub-instruction A: when no known recipe matches the user's request, first reason internally about the cultural and musical characteristics of the requested style (e.g., characteristic rhythmic cells, typical meter, instrumentation, energy level) using your own knowledge.
  - Sub-instruction B: then generate a musically informed rhythm and/or harmony using only valid schema formats (`steps[16]` or `euclid`).
  - Sub-instruction C: include `musicalIntent.explanation` (≤300 characters) describing what characteristics you referenced and why the generated pattern fits.
  - Sub-instruction D (cultural accuracy guard): describe patterns as "inspirado en [estilo]" or "con características de [tradición]" — never assert that a generated pattern definitively "es" a specific cultural tradition's pattern.
  - In `SYSTEM_PROMPT_EVOLUTION`: the fallback applies when the current session state does not obviously match any `availableRecipes` entry; the LLM may still generate a small coherent evolution using the fallback approach rather than defaulting to a generic minor change.
  - All new prompt text must be in Spanish (ADR 0017 D7).
  - JSON examples in the new sections must follow ADR 0021 D5 (concrete JSON examples for any new capability section).
- **No schema changes** — `musicalIntent.explanation` already exists in `MusicalIntentSchema`; `SCHEMA_VERSION` stays 6.
- **No i18n changes** — prompt text is not a user-facing string; `musicalIntent.explanation` content is LLM-generated free text.
- **No new test code** — the prompts are string constants; the existing schema tests cover `musicalIntent.explanation` parsing.
- After editing, verify both prompt strings remain valid TypeScript template literals (no unclosed backticks, no unescaped interpolation markers).

Validation:
- `pnpm exec tsc --noEmit` — clean (template literal integrity confirmed by compiler)
- `pnpm lint` — clean
- `pnpm test` — all tests pass (≥1387)

Expected result:
- Both prompts contain the strengthened 16-step constraint with a 3/4 euclid example; both prompts contain the improvisation fallback section per OD-2 resolution; no schema version bump; no regressions.

CHECKPOINT → Commit message:
`feat(agent): Phase 05 step 05.3 — 16-step constraint + improvisation fallback in prompts`

---

## Step 05.4 — Recipe expansion: ≥3 new recipes + full quality gate

PROMPT → Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full), `src/core/music-knowledge/rhythm-catalog.ts` (the new entries from step 05.2), `src/core/music-knowledge/harmony-catalog.ts` (full — identify harmony entries that pair well with new rhythms), `docs/ai-jam/decisions.md`, and `docs/ai-jam/inventories/phase-05-inventory.md`. Then add ≥3 new recipes and run the full quality gate.

Implementation requirements:
- Add at least 3 new `MusicalRecipe` entries to `RHYTHM_HARMONY_RECIPES`. Requirements per recipe:
  - `id`: stable kebab-case, unique within the catalog.
  - `rhythmIds`: must reference existing `RHYTHM_CATALOG` ids (new or prior entries); all referenced entries must have the same `meter` as the recipe's `meter` field.
  - `harmonyId`: must reference an existing `HARMONY_CATALOG` id. If no suitable harmony entry exists for the new recipe's character, document this in the handoff as a gap (do NOT invent a harmony id — referential integrity tests will fail). Either use an existing harmony entry that is a reasonable approximation, or surface the gap in the handoff for the Pilot to decide whether a new harmony entry is warranted.
  - `userIntents`: at least 3 natural-language phrases a user might say to request this recipe.
  - `bpmRange`: valid `[min, max]` with `40 ≤ min ≤ max ≤ 240`.
  - `meter`: must equal the meter of all referenced rhythm entries.
  - `density`: one of `'sparse' | 'medium' | 'dense'`.
  - `agentInstruction`: a clear, concrete instruction the agent can use when applying the recipe (describe the pattern, its character, and a suggested tempo).
- One recipe should use the new 3/4-meter rhythm entry added in step 05.2 (cueca chilena or equivalent Pilot-approved 3/4 entry), demonstrating that the recipe engine handles non-4/4 meters.
- Do NOT modify any existing recipe entry. Do NOT remove any recipe (existing recipe IDs may be referenced by LLM responses in saved sessions).
- Update the recipe file header comment to reflect the new total (≥13 entries).
- **Full quality gate:**
  - `pnpm exec tsc --noEmit`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

Validation:
- `pnpm exec vitest run recipes` — referential integrity tests pass for all new recipes (rhythm ids resolve, harmony ids resolve, meters match, bpmRange valid, userIntents non-empty)
- `pnpm exec tsc --noEmit && pnpm lint && pnpm test && pnpm build` — all pass clean
- Test count ≥1387 (no regressions)

Expected result:
- `RHYTHM_HARMONY_RECIPES` has ≥13 entries; all referential integrity invariants pass; the new cueca-style (or equivalent 3/4) recipe validates that the recipe engine handles 3/4 meter; full quality gate is clean.

CHECKPOINT → Commit message:
`feat(music-knowledge): Phase 05 step 05.4 — recipe catalog expanded to ≥13 entries + quality gate`

---

## Phase Acceptance

Each criterion has a unique ID (used in handoff Acceptance Coverage Tables):

- **A-05-01** — `RHYTHM_CATALOG` contains ≥45 entries; congruence invariants pass for all entries (binary length = steps, onsets derived correctly, mini derived correctly, euclid engine agreement for euclid-strategy entries).
  - Validation method: `unit` (congruence test iterates all entries automatically)
- **A-05-02** — `SYSTEM_PROMPT` explicitly states that `steps[]` must be exactly 16 elements OR use `euclid`; includes a concrete JSON example showing the correct `euclid` form for a 3/4-meter quarter-note pattern (e.g., `{"k": 3, "n": 4, "rot": 0}`); explicitly prohibits `steps[12]` or other non-16 arrays.
  - Validation method: `proxy:static-analysis` (read the prompt string in the committed file; confirm the example and prohibition are present)
- **A-05-03** — `SYSTEM_PROMPT_EVOLUTION` contains the same 16-step constraint strengthening and the improvisation fallback section.
  - Validation method: `proxy:static-analysis`
- **A-05-04** — The improvisation fallback section in both prompts includes: (a) instruction to reason about cultural/musical characteristics first; (b) instruction to generate using valid schema formats only; (c) instruction to include `musicalIntent.explanation` with the reasoning; (d) cultural accuracy guard using "inspirado en" framing.
  - Validation method: `proxy:static-analysis` (read both prompt strings; confirm all four sub-instructions present)
- **A-05-05** — `RHYTHM_HARMONY_RECIPES` contains ≥13 entries; referential integrity tests pass for all (rhythm ids resolve, harmony ids resolve, meters match, bpmRange valid, userIntents non-empty); at least one new recipe references a 3/4-meter rhythm entry.
  - Validation method: `unit` (referential integrity test iterates all recipes automatically)
- **A-05-06** — `tsc --noEmit`, `pnpm lint`, `pnpm test`, and `pnpm build` all pass clean; test count ≥1387 (no regressions from Phase 04 baseline).
  - Validation method: `unit` (full quality gate output in handoff)

## Partial coverage from prior phase

No prior partials to address. All Phase 04 acceptance criteria were either COVERED (A-04-04, A-04-06 by `proxy:static-analysis`; A-04-08 by `tool-output`) or PILOT-VERIFY (A-04-01, A-04-02, A-04-03, A-04-05, A-04-07 — live-system checks the Pilot performs in the browser; these are not Dev-side partial coverage, they are the Pilot's live verification items).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **Improvisation fallback prompt location (OD-2)** — Trigger: step 05.1 inventory. If the Pilot's OD-2 resolution requires a structural change to the prompt that meaningfully departs from the current section organization, open an ADR before step 05.3. If the change is purely additive (a new section appended, no existing text removed), no ADR is required — document the choice in the handoff. The inventory step must flag whether an ADR is needed; the Pilot resolves at Checkpoint #1.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/ai-jam/handoffs/phase-05-handoff.md`. See `handoff-template.md`.

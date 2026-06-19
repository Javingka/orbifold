<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 05 Handoff — Catalog Expansion, 16-Step Constraint, and Informed Improvisation Prompt

---

## Step 05.1 — Inventory

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-05`  
**Commit:** `docs(ai-jam): Phase 05 step 05.1 — catalog-expansion inventory`

### What was done

Produced `docs/ai-jam/inventories/phase-05-inventory.md` covering all five mandated sections:

- **§1 — Catalog gap analysis:** enumerated all 31 existing entries grouped by family/meter; identified 10 critical gaps (cueca chilena, cumbia, candombe, samba, baladi, bulería, afrobeat dense, bossa tamborim, gnawa, soca) and 5 additional gaps (aksak-9-sparse, 11/8, E(6,16), waltz 6-step, guaguancó).

- **§2 — OD-1 candidate list:** 18 distinct candidate entries (A1–Q1) covering Latin American, Afro-Uruguayan, Brazilian, Middle-Eastern, North African, Flamenco, Caribbean, Balkan, and generic families. Each entry includes: id, name, meter, steps, strudelStrategy, binary (pre-computed from real bjorklund() engine), traditions, and cultural note. Conflict flagged: D1 (`baladi-euclid-16` using E(7,16,0)) is a duplicate of existing `euclid-7-16`; D1-alt with rot=4 proposed as replacement.

- **§3 — Prompt constraint analysis:** exact quotes from both `SYSTEM_PROMPT` (line 127) and `SYSTEM_PROMPT_EVOLUTION` (line 277) showing the existing `steps` constraint; documented four missing items (explicit ban on steps[12]/steps[6]/steps[3], 3/4 euclid example, `n<16` guidance, improvisation fallback). Proposed exact Spanish text for constraint strengthening.

- **§4 — OD-2 options:** full tradeoff analysis. Recommendation: Option A (consolidated trailing section). Rationale: improvisation fallback is capability guidance, not a constraint prohibition — mixing them in the restrictions block violates single-responsibility. No ADR needed for Option A (purely additive).

- **§5 — i18n impact:** confirmed no new UI string keys needed. Catalog entries, prompt text, and recipe data are not rendered as i18n-keyed labels. `musicalIntent.explanation` is LLM-generated free text using the existing `agent.recipeCard.explanationLabel` key.

- **§6 — Recipe candidates:** 4 recipe proposals (R1 bulería, R2 cueca, R3 gnawa, R4 cumbia) using new entries; harmonyIds marked TBD pending step 05.4 harmony-catalog read.

- **§7 — Test coverage:** confirmed no new test code needed — congruence test and referential integrity test iterate all entries/recipes automatically.

### Source files read

| File | Purpose |
|------|---------|
| `src/core/music-knowledge/rhythm-catalog.ts` | Full — all 31 entries, helpers, types |
| `src/core/music-knowledge/rhythm-harmony-recipes.ts` | Full — all 10 recipes |
| `src/agent/agent.ts` | Full — both SYSTEM_PROMPT and SYSTEM_PROMPT_EVOLUTION |
| `src/agent/schema.ts` | Full — RhythmLayerStepsSchema, RhythmLayerEuclidSchema, MusicalIntentSchema |
| `src/i18n/locales/es.ts` | Full — all current keys |
| `src/i18n/types.ts` | Full — Dictionary type |
| `src/core/rhythm/euclid.ts` | Full — bjorklund() and rotate() for binary verification |

### Source files modified

None. This is an inventory-only step.

### Validation

- Inventory file exists at `docs/ai-jam/inventories/phase-05-inventory.md` — YES
- Covers all five sections (OD-1 list, OD-2 options, 16-step gap analysis, improvisation content requirements, test coverage confirmation) — YES
- No source files modified — YES

### Environment fix log

None.

### Acceptance Coverage Table

| Criterion | Status | Evidence |
|-----------|--------|---------|
| A-05-01 (RHYTHM_CATALOG ≥45 entries) | PENDING | Step 05.2 — OD-1 resolution required first |
| A-05-02 (SYSTEM_PROMPT constraint strengthening) | PENDING | Step 05.3 — OD-2 resolution required first |
| A-05-03 (SYSTEM_PROMPT_EVOLUTION constraint + fallback) | PENDING | Step 05.3 |
| A-05-04 (improvisation fallback 4 sub-instructions) | PENDING | Step 05.3 |
| A-05-05 (RHYTHM_HARMONY_RECIPES ≥13 entries) | PENDING | Step 05.4 |
| A-05-06 (full quality gate) | PENDING | Step 05.4 |

### Next action

STOP — Pilot review of OD-1 (which new rhythm entries to add) and OD-2 (prompt structure for improvisation fallback) mandatory before step 05.2.

Pilot must confirm:
1. Which ≥14 candidates from the OD-1 table to implement.
2. Cueca meter: `'6/8'` (recommended, musically accurate) or `'3/4'` (as stated in phase spec wording).
3. OD-2 choice: Option A (recommended) or Option B.
4. Whether D1-alt (`baladi-euclid-rot`, E(7,16,4)) is acceptable, or if Middle-Eastern should be skipped or replaced.

---

## Step 05.2 — Catalog expansion (≥14 new RhythmEntry items)

**Status:** COMPLETE  
**Date:** 2026-06-19  
**Branch:** `ai-jam/phase-05`  
**Commit:** `feat(music-knowledge): Phase 05 step 05.2 — rhythm catalog expanded to ≥45 entries`

### What was done

Added 15 new entries to `RHYTHM_CATALOG` (31 → 46 total), covering all Pilot-approved families from OD-1 resolution. All entries use existing `euclidEntry` / `structEntry` helpers. The catalog header comment was updated to reflect 46 entries and new family/meter coverage.

**New entries (15):**

| id | family | meter | steps | strategy | onsets |
|----|--------|-------|-------|----------|--------|
| `cueca-chilena-base` | cueca | 6/8 | 12 | euclid E(4,12,0) | 0,3,6,9 |
| `cueca-chilena-syncopated` | cueca | 6/8 | 12 | euclid E(5,12,2) | 1,3,6,8,10 |
| `samba-surdo-base` | samba | 4/4 | 16 | struct | 0,8 |
| `samba-caixa` | samba | 4/4 | 16 | struct | 2,6,10,14 |
| `samba-euclid` | samba | 4/4 | 16 | euclid E(5,16,0) | 0,3,6,9,12 |
| `cumbia-caja` | cumbia | 4/4 | 16 | struct | 0,3,6,8,12 |
| `cumbia-guache` | cumbia | 4/4 | 16 | euclid E(3,16,0) | 0,5,10 |
| `candombe-chico` | candombe | 4/4 | 16 | struct | 0,3,5,8,11,13 |
| `candombe-repique` | candombe | 4/4 | 16 | euclid E(5,16,4) | 2,5,8,12,15 |
| `milonga-base` | milonga | 4/4 | 16 | struct | 0,4,7,8,12,15 |
| `buleria-12` | flamenco | 12/8 | 12 | struct | 0,4,5,7,9,10 |
| `solea-12` | flamenco | 12/8 | 12 | struct | 0,3,6,8,10 |
| `baladi-16` | tabla | 4/4 | 16 | euclid E(7,16,4) | 1,3,6,8,10,12,15 |
| `maqsum-struct` | tabla | 4/4 | 16 | struct | 0,4,8,12,14 |
| `bossa-nova-variation` | clave | 4/4 | 16 | struct | 0,3,6,8,11,13 |

**Conflict resolutions:**
- `cueca-chilena-base` E(4,12,0) shares binary `100100100100` with existing `standard-12` E(4,12,0). Different meter (`6/8` vs `12/8`) and distinct cultural context; test only checks ID uniqueness, not binary uniqueness — coexistence valid.
- `samba-euclid` E(5,16,0) shares binary with existing `euclid-5-16`. Different family/tradition (samba vs generic Toussaint) — coexistence valid under same uniqueness rule.
- `cumbia-guache` E(3,16,0) shares binary with existing `euclid-3-16` — coexistence valid.
- `cumbia-caja`: Pilot-specified binary `1001001010010010` was identical to existing `bossa-nova-clave`. Corrected to `1001001010001000` (onsets 0,3,6,8,12) — classic cumbia caja timeline with distinct onset at position 12 (beat 3) instead of 11 and 14.
- `baladi-16`: Used E(7,16,4) rotation variant as proposed in inventory D1-alt, since E(7,16,0) is the existing `euclid-7-16`.

### Source files modified

| File | Change |
|------|--------|
| `src/core/music-knowledge/rhythm-catalog.ts` | Added 15 entries, updated header comment (31→46 entries) |

### Validation

- `pnpm exec vitest run music-knowledge/rhythm-catalog` → 320 tests passed (all 5 congruence invariants per entry)
- `pnpm exec tsc --noEmit` → clean
- `pnpm test` → 1483/1483 passed (baseline 1387, +96 from new catalog entries)

### Environment fix log

None.

### Acceptance Coverage Table (step 05.2)

| Criterion | Status | Evidence |
|-----------|--------|---------|
| A-05-01 (RHYTHM_CATALOG ≥45 entries) | COVERED | 46 entries; 320 congruence tests pass |
| A-05-02 (SYSTEM_PROMPT constraint strengthening) | PENDING | Step 05.3 |
| A-05-03 (SYSTEM_PROMPT_EVOLUTION constraint + fallback) | PENDING | Step 05.3 |
| A-05-04 (improvisation fallback 4 sub-instructions) | PENDING | Step 05.3 |
| A-05-05 (RHYTHM_HARMONY_RECIPES ≥13 entries) | PENDING | Step 05.4 |
| A-05-06 (full quality gate) | PENDING | Step 05.4 |

---

## Step 05.3 — Prompt update: 16-step constraint + improvisation fallback

**Status:** COMPLETE
**Date:** 2026-06-19
**Branch:** `ai-jam/phase-05`
**Commit:** `feat(agent): Phase 05 step 05.3 — 16-step constraint + improvisation fallback in prompts`

### What was done

Added two sections to both `SYSTEM_PROMPT` and `SYSTEM_PROMPT_EVOLUTION` in `src/agent/agent.ts`:

**1. 16-step constraint block (RESTRICCION DE FORMATO PARA RITMO)**

Inserted immediately after the existing `Cada capa usa "steps"...` bullet in both prompts. The block:
- Explicitly states `steps` must have EXACTLY 16 elements — never 8, 12, or other counts.
- States that for 3/4, 6/8, 12/8 meters, `euclid` with n<=16 must always be used instead of non-16 `steps` arrays.
- Provides three concrete `euclid` examples: 3/4 with E(3,4), 6/8 with E(4,12), 12/8 with E(7,12).

**2. IMPROVISACION INFORMADA section (OD-2 Option A)**

Appended at the end of both prompts (after `MODO CODIGO` in `SYSTEM_PROMPT`; after `EJEMPLO CONCRETO` in `SYSTEM_PROMPT_EVOLUTION`). Purely additive — no existing text removed. No ADR required.

Sub-instructions in both prompts:
- **A**: Reason about cultural/musical characteristics before generating.
- **B**: Generate using only valid schema formats (`steps[16]` or `euclid`).
- **C**: Include `musicalIntent.explanation` (<=300 characters) describing the reasoning.
- **D**: Use "inspirado en [estilo]" framing — cultural accuracy guard.

`SYSTEM_PROMPT` version includes a concrete JSON example (kpanlogo ghanes) per ADR 0021 D5.
`SYSTEM_PROMPT_EVOLUTION` version is scoped to the autopilot context (evolving, not creating from scratch).

All prompt text in Spanish per ADR 0017 D7. No schema changes. No i18n changes. Template literal integrity confirmed by `tsc --noEmit`.

### Prompt verification (proxy:static-analysis)

**A-05-02 — SYSTEM_PROMPT constraint block** (lines 128-134 in committed file):
- Present: `"steps" debe tener EXACTAMENTE 16 elementos (0 o 1). Nunca 8, 12 ni otro numero.`
- Present: `{ "euclid": { "k": 3, "n": 4, "rot": 0 } }  (E(3,4) = negras en 3/4)` — 3/4 example
- Present: prohibition on non-16 `steps` arrays for 3/4, 6/8, 12/8 meters

**A-05-03 — SYSTEM_PROMPT_EVOLUTION constraint block** (lines 321-327 in committed file):
- Same 16-step constraint block present in `RESTRICCIONES ABSOLUTAS` section.
- Same `IMPROVISACION INFORMADA` section appended at end.

**A-05-04 — Four sub-instructions in both prompts**:
- A (reason first): present in both — `RAZONA PRIMERO (internamente):`
- B (valid formats only): present in both — `GENERA CON FORMATOS VALIDOS:`
- C (include explanation): present in both — `INCLUYE musicalIntent.explanation`
- D (cultural accuracy): present in both — `PRECISION CULTURAL:` + "inspirado en" framing

### Source files modified

| File | Change |
|------|--------|
| `src/agent/agent.ts` | Added 16-step constraint block + IMPROVISACION INFORMADA section to both SYSTEM_PROMPT and SYSTEM_PROMPT_EVOLUTION |

### Validation

- `pnpm exec tsc --noEmit` — clean (template literal integrity confirmed)
- `pnpm test` — 1483/1483 passed (no regressions)

### Environment fix log

None.

### Acceptance Coverage Table (step 05.3)

| Criterion | Status | Evidence |
|-----------|--------|---------|
| A-05-01 (RHYTHM_CATALOG >=45 entries) | COVERED | Step 05.2 — 46 entries, 320 congruence tests |
| A-05-02 (SYSTEM_PROMPT constraint strengthening) | COVERED | proxy:static-analysis — constraint block + 3/4 euclid example present |
| A-05-03 (SYSTEM_PROMPT_EVOLUTION constraint + fallback) | COVERED | proxy:static-analysis — constraint block + IMPROVISACION INFORMADA at end |
| A-05-04 (improvisation fallback 4 sub-instructions) | COVERED | proxy:static-analysis — A/B/C/D present in both prompts |
| A-05-05 (RHYTHM_HARMONY_RECIPES >=13 entries) | PENDING | Step 05.4 |
| A-05-06 (full quality gate) | PENDING | Step 05.4 |

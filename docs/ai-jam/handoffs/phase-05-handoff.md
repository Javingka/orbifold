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

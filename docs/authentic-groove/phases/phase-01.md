<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 01 — Genre-Authentic Strudel Sample Palette (dimension 1)

**Purpose:** Make each genre recipe sound with its real instruments (cumbia → conga/guacharaca/caja) by carrying a verified, knowledge-side `sampleMap` from the catalog through a genre-agnostic `strudelSample` field on `RhythmLayer` into the Strudel codegen.

**Gate:** ai-jam initiative complete and merged to `main`; `pnpm test` passes at 1589; `SCHEMA_VERSION = 6`; `SESSION_SCHEMA_VERSION = 5`; the `authentic-groove` Decisions Register populated with carried-forward rules by the Pilot.

**Expected phase result:** Applying a genre recipe produces Strudel code that emits authentic sample names (or documented fallbacks). The genre→sample mapping lives **entirely** in `src/core/music-knowledge/`; the plumbing (`RhythmLayer`, codegen, persistence) contains zero genre names and zero hardcoded sample maps. Recipes without a `sampleMap` emit their generic `sound` unchanged.

---

## Architectural seam (hard invariant for every step)

This project will soon split into a **public AGPL executor** (runs Strudel) and a **proprietary knowledge engine**. Phase 01 crosses that seam, so the split must be respected now:

- **KNOWLEDGE (future private repo)** — the genre→sample mapping. Lives **entirely** inside `src/core/music-knowledge/`. Each recipe declares which samples it uses; the recipe-engine propagates them.
- **PLUMBING (future public AGPL repo)** — the generic capability to emit an arbitrary sample. `RhythmLayer`, the codegen, and `persistence.ts` must **never** contain a genre name or a hardcoded sample map. The codegen only knows: "emit the sample string handed to me, else the generic `sound`."
- The `Sound` union (9 values) stays as-is — it is the **abstract role** of the layer. `strudelSample` is the **concrete instrument name** realizing it. Do not merge or conflate them.

**Tripwire:** if a step writes `if (genre === 'cumbia')` or a literal like `'conga'` anywhere outside `src/core/music-knowledge/` (tests excluded), the seam is breaking — stop and relocate the logic. This invariant is verified mechanically by A-01-06.

---

## Step 01.1 — Inventory

PROMPT → Read the source-of-truth files, confirm the pinned Strudel version from `package.json`, verify sample names against the **live** Strudel docs (do NOT assume from memory), and produce `docs/authentic-groove/inventories/phase-01-inventory.md`. Do NOT write any source file. STOP for Pilot review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (confirm the Pilot has populated carried-forward rules before proceeding; if empty, write a `register-empty` blocker and stop)
3. `package.json` (confirm exact `@strudel/web` version — expected `1.0.3`)
4. `src/core/rhythm/layers.ts` (full — `Sound`, `RhythmLayer`, `rhythmLayerToStrudelLine`)
5. `src/core/codegen/strudel.ts` (full — how layer lines are assembled into patterns)
6. `src/core/music-knowledge/rhythm-catalog.ts` (full — all entries, `traditions`, `roles`, `family`)
7. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — all recipes, `rhythmIds`, `meter`)
8. `src/core/music-knowledge/recipe-engine.ts` (full — `recipeToAgentOutput`, `LAYER_SOUNDS`, `soundForIndex`, and the internal `AgentOutputSchema.safeParse` guard)
9. `src/agent/apply.ts` (full — `applyRhythmSpec`: how an `AgentOutput` becomes session `RhythmLayer[]`)
10. `src/agent/agent.ts` (the recipe-application path — every caller of `recipeToAgentOutput`)
11. `src/agent/schema.ts` lines 1–60 (layer schema shape, `SK_SOUNDS`, `SCHEMA_VERSION`)
12. `src/lib/persistence.ts` (full — the rhythm-layer Zod schema; is it `.strict()`? does it strip unknown keys?)
13. Live Strudel sample reference: `https://strudel.cc/learn/` (and the samples/sounds pages it links). Document exactly what percussion sample names ship with `@strudel/web@1.0.3` **without** a `samples()` loading call.

**Inventory sections (all five required):**

**§1 — Sound-assignment flow (end-to-end trace).**
Trace recipe → audio: what `recipeToAgentOutput` assigns via `LAYER_SOUNDS` (bd, hh, sd, oh, cp, rim); how `applyRhythmSpec` lands those on `RhythmLayer.sound`; what `rhythmLayerToStrudelLine` emits (both the steps path and the euclid fallback path). Identify the exact line(s) to change for a `strudelSample` override. Confirm `RhythmLayer` has no `strudelSample` today.

**§2 — Verified Strudel sample inventory (from live docs).**
List every percussion sample name available in `1.0.3` without `samples()`. Then, for **each genre present in the catalog** (cumbia, cueca, samba, candombe, milonga, flamenco/bulería/soleá, bossa-nova, aksak/Balkan, afro-cuban clave/rumba, baladi/maqsum, west-african bell, and any others found in §1), build a proposed `sampleMap` from generic `Sound` slot → verified sample name. For any authentic instrument with no named Strudel sample (e.g. `guacharaca`, `caja`, `surdo`), state that explicitly and propose the **nearest available fallback**, marked as a fallback. This list is the single source the later steps draw from — no sample name may appear in code that is not confirmed here.

**§3 — Three open decisions for Pilot resolution (present options + a clear recommendation; do NOT resolve).**

**OD-1 — Propagation mechanism across the `AgentOutputSchema` boundary.**
`recipeToAgentOutput` returns an `AgentOutput` validated by `AgentOutputSchema.safeParse`. `strudelSample` must reach `RhythmLayer` without that schema rejecting it. Trace **all** consumers of `recipeToAgentOutput` (from §1) before recommending.
- **Option A — Extend the `AgentOutputSchema` layer with optional `strudelSample`**: `recipeToAgentOutput` attaches it; layers carry it through the entire pipe. Covers every consumer uniformly. Cost: touches the agent contract (raises the `SCHEMA_VERSION` question; lets the LLM theoretically emit sample names — evaluate whether that widens the agent surface undesirably).
- **Option B (recommend unless §1 reveals a non-`apply.ts` consumer) — Keep `AgentOutputSchema` pure; overlay downstream**: `recipeToAgentOutput` stays clean; a generic plumbing helper `applySampleMap(map)` overlays `strudelSample` onto session `RhythmLayer[]` right after `applyRhythmSpec`, using the recipe's `sampleMap` (already keyed by `Sound`, aligned with `LAYER_SOUNDS`). Agent schema untouched; no version question; `apply.ts` carries **zero** genre knowledge (it overlays a map it is handed). Cost: two-step application; only covers paths that flow through `apply.ts` — §1 must confirm that is every path.
- State which option the consumer trace supports.

**OD-2 — `strudelSample` persistence in `SavedSessionSchema`.**
`strudelSample` lands on `RhythmLayer`, which is persisted. Report whether the persistence layer schema is strict (would reject the new key) or lax (would silently drop it).
- **Option A (recommend) — Persist it**: add `strudelSample: z.string().optional()` to the rhythm-layer schema in `persistence.ts`. A saved cumbia session reloads authentic. Additive + optional → no `SESSION_SCHEMA_VERSION` bump. (Note: this is generic plumbing, not a genre name — it does not break the seam.)
- **Option B — Exclude**: samples re-derive only on recipe re-apply; loaded sessions sound generic until then.

**OD-3 — Fallback policy for unavailable samples.**
For genres whose authentic instrument has no named Strudel sample:
- **Option A (recommend) — Use the nearest documented fallback**, recorded in §2 and commented in the catalog as a fallback (`// fallback: no native 'guacharaca' in 1.0.3`).
- **Option B — Leave that slot generic** (omit it from `sampleMap`) so it emits the drum-machine `sound` rather than an approximate instrument.

**§4 — ADR trigger.**
ADR 0025 ("Authentic Strudel Sample Palette + music-knowledge seam") will govern: the `strudelSample` plumbing contract, the genre-agnostic codegen rule, the public/private seam invariant, the OD-1 propagation mechanism, the OD-2 persistence contract, the OD-3 fallback policy, and backward compatibility. Describe what the ADR must cover; do not draft it (Pilot opens ADRs).

**§5 — Architectural-fitness check design (A-01-06).**
Define the exact, repeatable command that proves the seam holds: a `git grep` over the set of sample names and genre tokens introduced in this phase, scoped to `src/` and **excluding** `src/core/music-knowledge/` and `tests/`, returning zero new matches. Write the literal command and the expected empty result.

**Implementation requirements:** Read only. Produce the inventory file. Touch no `.ts`/`.svelte`. Verify every sample name against live docs.

**Validation:** `git status` → only the inventory file and the handoff entry are new/modified.

**CHECKPOINT → Commit message:**
`docs(authentic-groove): Phase 01 step 01.1 — sample-palette inventory`

**STOP for Pilot review.** OD-1, OD-2, OD-3 must be resolved before step 01.2.

---

## Step 01.2 — Model + Codegen (plumbing / public side) + ADR 0025

PROMPT → Read the inventory and Pilot OD resolutions, then add the genre-agnostic `strudelSample` capability to the plumbing and draft ADR 0025. No genre names appear anywhere in this step's source changes.

**Required reading (in order):**
1. `docs/authentic-groove/inventories/phase-01-inventory.md` (all sections)
2. Pilot OD-1, OD-2, OD-3 resolutions (Checkpoint #1 handoff entry)
3. `src/core/rhythm/layers.ts` (full — before editing)
4. `src/core/codegen/strudel.ts` (full — before editing)
5. `src/lib/persistence.ts` (full — before editing, if OD-2 = persist)
6. `docs/adr/0024-evolution-plan.md` (ADR format precedent)

**What to produce:**

`docs/adr/0025-authentic-sample-palette.md` covering:
- **D1** — `RhythmLayer.strudelSample?: string`: optional; codegen emits `strudelSample ?? sound`; never empty (the catalog only supplies verified non-empty names).
- **D2** — `MusicalRecipe.sampleMap?: Partial<Record<Sound, string>>` lives in `music-knowledge/`; only genre recipes populate it; generic recipes leave it undefined.
- **D3** — **Seam invariant**: codegen, `RhythmLayer`, and `persistence.ts` contain no genre names and no hardcoded maps. The mapping lives only in `music-knowledge/`. Verified by A-01-06.
- **D4** — Propagation mechanism: the OD-1 resolution, stated precisely.
- **D5** — Persistence: the OD-2 resolution, stated precisely.
- **D6** — Fallback policy: the OD-3 resolution, stated precisely.
- **D7** — Backward compatibility: pre-Phase-01 sessions have no `strudelSample`; `undefined` falls back to `sound` in codegen; `deserializeSession` does not break.

`src/core/rhythm/layers.ts`:
- Add `strudelSample?: string` to `RhythmLayer` (after `euclid?`), with JSDoc: "Concrete Strudel sample name realizing this layer's abstract `sound` role (ADR 0025 D1). When present, codegen emits it instead of `sound`. Genre-agnostic — set only by the knowledge-side propagation path."
- Update `rhythmLayerToStrudelLine`: compute `const sampleName = layer.strudelSample ?? layer.sound;` and use it in **both** the steps path and the euclid fallback path. Comment: `// ADR 0025 D1: strudelSample overrides sound when set`. Signature unchanged.
- Do NOT change the `Sound` type or `layerAudible`.

`src/lib/persistence.ts` (only if OD-2 = persist):
- Add `strudelSample: z.string().optional()` to the rhythm-layer schema. JSDoc: "ADR 0025 D5/D7 — optional; absent in pre-Phase-01 sessions; falls back to `sound` in codegen."
- Do NOT bump `SESSION_SCHEMA_VERSION`.

New `tests/authentic-groove/codegen-sample.test.ts` (AGPL-3.0 header):
- Layer `{ sound:'bd', steps:[], euclid:'3,8', strudelSample:'conga' }` → `s("conga(3,8)")`.
- Layer `{ sound:'hh', steps:[1,0,1,0,…], strudelSample:'rim' }` → tokens use `rim`, not `hh`.
- Layer `{ sound:'bd', steps:[…] }` (no `strudelSample`) → emits `bd` (unchanged).
- (Use only generic/abstract names like `rim` or a placeholder in this plumbing test — no genre instrument literal is required here; that belongs to the knowledge-side tests in 01.3.)

**Constraints:** No genre name or sample-map literal in any file touched here. `SCHEMA_VERSION` stays 6; `SESSION_SCHEMA_VERSION` stays 5. ADR drafted before code. AGPL-3.0 header on new files.

**Acceptance criteria in this step:**
- A-01-03 (full): layers without `strudelSample` emit `sound`; layers with it emit the sample — codegen tests confirm.
- A-01-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ 1589 + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run codegen-sample` → new tests pass
- `pnpm exec vitest run codegen` → existing codegen tests pass unchanged
- `pnpm test` → no regressions
- `git status` → only `docs/adr/0025-*.md`, `src/core/rhythm/layers.ts`, optional `src/lib/persistence.ts`, `tests/authentic-groove/codegen-sample.test.ts`, handoff entry

**Commit message:**
`feat(core): Phase 01 step 01.2 — strudelSample plumbing + codegen fallback (ADR 0025)`

---

## Step 01.3 — Catalog `sampleMap` (knowledge / private side)

PROMPT → Add `sampleMap` to `MusicalRecipe` and populate it for every genre recipe using **only** sample names verified in the inventory §2. All work stays inside `src/core/music-knowledge/`.

**Required reading (in order):**
1. `docs/authentic-groove/inventories/phase-01-inventory.md` §2 (the verified sample list + per-genre proposed maps)
2. ADR 0025 (D2, D3, D6)
3. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before editing)
4. `src/core/rhythm/layers.ts` (confirm the `Sound` type and `strudelSample` field from 01.2)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts`:
- Import `Sound` from `../rhythm/layers.js`.
- Add `sampleMap?: Partial<Record<Sound, string>>` to the `MusicalRecipe` interface, with JSDoc tying it to ADR 0025 D2 and noting names must be inventory-verified.
- Populate `sampleMap` for every genre-specific recipe using inventory §2 names. Where a fallback is used (OD-3 = fallback), add an inline comment: `// fallback: no native '<instrument>' in @strudel/web@1.0.3`.
- Generic/pop recipes (e.g. `pop-rock-backbeat`, `dorian-ritual-sparse`, `gospel-soul`) omit `sampleMap`.

New `tests/authentic-groove/sample-map.test.ts` (AGPL-3.0 header):
- Each in-scope genre recipe has a defined `sampleMap` with non-empty string values.
- Every key of every `sampleMap` is a valid `Sound`.
- Every value of every `sampleMap` appears in the inventory's verified-or-fallback sample list (encode that list as a test fixture so the assertion is self-contained).
- Generic recipes have `sampleMap === undefined`.

**Constraints:** All changes confined to `src/core/music-knowledge/` and `tests/`. No change to `recipe-engine.ts` propagation yet (that is 01.4). AGPL-3.0 header on new file.

**Acceptance criteria in this step:**
- A-01-01 (partial): genre recipes carry a verified `sampleMap` (cumbia, cueca among them) — tests confirm.
- A-01-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ prior + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-map` → new tests pass
- `pnpm test` → no regressions
- `git status` → only `src/core/music-knowledge/rhythm-harmony-recipes.ts`, `tests/authentic-groove/sample-map.test.ts`, handoff entry

**Commit message:**
`feat(music-knowledge): Phase 01 step 01.3 — per-genre sampleMap catalog (ADR 0025)`

---

## Step 01.4 — Propagation (knowledge / private side)

PROMPT → Wire the recipe-application path so a recipe's `sampleMap` resolves to `strudelSample` on each produced `RhythmLayer`, per the OD-1 resolution. The client and the agent receive layers that already carry the resolved sample; neither knows the mapping.

**Required reading (in order):**
1. ADR 0025 (D3, D4 — the resolved propagation mechanism)
2. `docs/authentic-groove/inventories/phase-01-inventory.md` §1, §3 (consumer trace of `recipeToAgentOutput`)
3. `src/core/music-knowledge/recipe-engine.ts` (full)
4. `src/agent/apply.ts` (full)
5. `src/agent/agent.ts` (the recipe-application path)
6. `tests/authentic-groove/sample-map.test.ts` (test patterns from 01.3)

**What to produce:**

Implement the OD-1 resolution from Checkpoint #1. The end state, regardless of mechanism, must satisfy:
- Applying a genre recipe yields session `RhythmLayer[]` whose layers carry `strudelSample` from the recipe's `sampleMap` (matched by the layer's `Sound` slot).
- The genre→sample knowledge stays inside `src/core/music-knowledge/`. Any generic overlay helper placed in plumbing (`apply.ts`) must receive the map as a parameter and contain no genre name or literal map of its own.
- Layers whose `Sound` slot is absent from the recipe's `sampleMap` keep `strudelSample` undefined.
- Recipes with no `sampleMap` produce layers with no `strudelSample` (unchanged behavior).

New/extended `tests/authentic-groove/propagation.test.ts` (AGPL-3.0 header):
- Applying the cumbia recipe → produced layers carry the cumbia `sampleMap` values on `strudelSample`; rendering them via `rhythmLayerToStrudelLine` emits authentic cumbia names. (A-01-01 full)
- Applying the cueca recipe → authentic cueca names emitted. (A-01-02 full)
- A recipe slot not in the map → that layer's `strudelSample` is undefined; it emits its generic `sound`. (A-01-04)
- A recipe with no `sampleMap` → no layer carries `strudelSample`. (A-01-04, no-regression)

**Constraints:** Knowledge stays in `music-knowledge/`. Plumbing stays genre-agnostic. Follow the OD-1 mechanism exactly. AGPL-3.0 header on new file.

**Acceptance criteria in this step:**
- A-01-01 (full), A-01-02 (full), A-01-04 (full) — propagation tests confirm.
- A-01-05 (partial): `tsc --noEmit` clean; `pnpm test` ≥ prior + new tests.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run propagation` → new tests pass
- `pnpm test` → no regressions
- `git status` → only the files the OD-1 mechanism requires (`recipe-engine.ts` and/or `apply.ts`, `agent.ts`), `tests/authentic-groove/propagation.test.ts`, handoff entry

**Commit message:**
`feat(music-knowledge): Phase 01 step 01.4 — sampleMap → strudelSample propagation (ADR 0025)`

---

## Step 01.5 — Seam fitness check + full quality gate

PROMPT → Run the architectural-fitness check (A-01-06) and the full quality gate; record all output in the handoff.

**Required reading:**
1. `docs/authentic-groove/inventories/phase-01-inventory.md` §5 (the exact grep command)
2. `docs/authentic-groove/handoffs/phase-01-handoff.md` (confirm 01.2–01.4 are APPROVED)

**What to produce:**

Run and record the fitness check from inventory §5: `git grep` over the introduced sample names and genre tokens, scoped to `src/` excluding `src/core/music-knowledge/` and `tests/`, returning zero matches. Paste the command and its (empty) output into the handoff.

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility / flag-off note (required per CLAUDE.md), verbatim in handoff:**
- With no recipe applied, every `RhythmLayer.strudelSample` is undefined; codegen falls back to `sound` — identical to pre-phase `main`.
- Sessions saved before Phase 01 have no `strudelSample`; deserialization yields undefined; codegen falls back to `sound` — no regression.
- Reverting the propagation wiring (01.4) restores prior behavior with no other change; the plumbing field is inert when unset.

**Acceptance criteria in this step:**
- A-01-05 (full): `tsc --noEmit` clean, `pnpm lint` clean, `pnpm test` ≥ 1589 + all new tests, `pnpm build` succeeds.
- A-01-06 (full): the seam grep returns zero matches outside `src/core/music-knowledge/`.

**Validation:** all gate commands + the grep recorded in the handoff with output.

**Commit message:**
`chore(authentic-groove): Phase 01 step 01.5 — seam fitness check + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-01-01 | Applying a cumbia recipe yields Strudel code emitting authentic cumbia percussion sample names (or documented fallbacks), not `bd`/`hh`/`sd` | Unit: `propagation.test.ts` + `codegen-sample.test.ts` |
| A-01-02 | Applying a cueca recipe yields Strudel code emitting authentic cueca sample names | Unit: `propagation.test.ts` |
| A-01-03 | Layers without `strudelSample` emit their `sound` field value (backward compatibility) | Unit: `codegen-sample.test.ts`; existing `codegen.test.ts` unchanged |
| A-01-04 | `sampleMap` propagation sets `strudelSample` only on layers whose `Sound` slot is in the map; absent slots and map-less recipes leave it undefined | Unit: `propagation.test.ts` |
| A-01-05 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1589 + new tests; `pnpm build` succeeds | live-system: recorded in handoff |
| A-01-06 | No genre name or sample-name literal appears in `src/` outside `src/core/music-knowledge/` (seam invariant) | live-system: `git grep` recorded in handoff |

---

## Partial coverage from prior phase

No prior partials to address (Phase 01 of the `authentic-groove` initiative).

**Explicitly out of scope (deferred to later authentic-groove phases):** dimension 2 (per-hit accent/velocity), dimension 3 (swing/groove feel), dimension 4 (role-based polyrhythmic layering). No `gain`, `velocity`, or swing work in this phase — sample names only.

**Deferred from other initiatives (not scoped here):** Pentagrama `NoteSlot` free placement (orbifold-v2 Ph10); per-chord `lpf`/`lpq` slider D-3 (harmonic-rhythm-improvements).

---

## ADR Triggers

- **ADR 0025 — Authentic Sample Palette + music-knowledge seam** — Pilot opens; governs the `strudelSample` plumbing contract, the genre-agnostic codegen rule, the public/private seam invariant, the OD-1 propagation mechanism, the OD-2 persistence contract, the OD-3 fallback policy, and backward compatibility. Drafted in step 01.2 after OD resolutions. Trigger: step 01.2.

---

## Open Decisions (Pilot resolves at Checkpoint #1 after step 01.1)

| OD | Question | Options | Must resolve before |
|---|---|---|---|
| OD-1 | Propagation mechanism across the `AgentOutputSchema` boundary | A (extend agent schema), B (pure schema + plumbing overlay) — recommendation set by the §1 consumer trace | Step 01.2 |
| OD-2 | `strudelSample` persistence in `SavedSessionSchema` | A (persist — recommended), B (exclude) | Step 01.2 |
| OD-3 | Fallback policy for unavailable samples | A (nearest documented fallback — recommended), B (leave slot generic) | Step 01.2 |

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-01-handoff.md`. See `handoff-template.md`.

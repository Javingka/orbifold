<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 08 — Authentic Binary Layers for the Remaining 12 Recipes

**Purpose:** Embed culturally verified binary step patterns and `defaultCpm` values into the 12 recipes that currently lack `layers`, giving each recipe the same authentic-layer treatment that cueca (Phase 05) and cumbia (Phase 05) received.

**Gate:** Phase 07 complete and merged to `main`; `pnpm test` passes at 1888; `applyRhythmSpec` emits native step counts; all 15 recipes in `RHYTHM_HARMONY_RECIPES`; AG-D1 seam invariant in force.

**Expected phase result:** All 12 target recipes carry `layers` with authenticated binary patterns (16-step for 4/4, 12-step for 12/8, 7-step for 7/8), correct `locked` flags, and `defaultCpm`; the Dorian Ritual recipe (intentionally abstract) gains only `defaultCpm`; `dorian-ritual-sparse` is the only recipe that keeps no `layers`; every binary assertion in the test suite passes; quality gate and seam grep pass clean; test count ≥ 1888.

---

## Dev reference table — recipe → binary patterns → lock status

> This table is the authoritative encoding of all ethnomusicology research. Dev must
> not look up patterns independently — use exactly the strings below.

| Recipe id | Steps | Layer (sound) | Binary string | Locked |
|---|---|---|---|---|
| `afro-cuban-clave-minor` | 16 | `bd` (son clave 3-2) | `1001001000101000` | LOCKED |
| `afro-cuban-clave-minor` | 16 | `hh` (conga tumbao) | `0101010110101010` | free |
| `rumba-blues-minor` | 16 | `bd` (rumba clave 3-2) | `1001000100101000` | LOCKED |
| `latin-jazz-clave-swing` | 16 | `bd` (son clave 2-3) | `1000101001001000` | LOCKED |
| `latin-jazz-clave-swing` | 16 | `hh` (cascara 2-3) | `0110101010101101` | LOCKED |
| `bossa-nova-groove` | 16 | `bd` (bossa nova clave) | `1001001010010010` | LOCKED |
| `bossa-nova-groove` | 16 | `hh` (kick syncopation) | `1000010010001001` | free |
| `samba-afro-brasileiro` | 16 | `bd` (surdo open) | `1000000010000000` | LOCKED |
| `samba-afro-brasileiro` | 16 | `hh` (tamborim teleco-teco) | `1011010110110101` | LOCKED |
| `west-african-bell-modal` | 12 | `bd` (gankogui bell) | `101011010101` | LOCKED |
| `west-african-bell-modal` | 12 | `hh` (clap/djembe support) | `100100100100` | free |
| `west-african-triplet-groove` | 12 | `bd` (gankogui bell) | `101011010101` | LOCKED |
| `west-african-triplet-groove` | 12 | `hh` (kpanlogo interlock) | `100101001010` | LOCKED |
| `buleria-flamenco-phrygian` | 12 | `bd` (cajón base) | `100100101010` | LOCKED |
| `buleria-flamenco-phrygian` | 12 | `hh` (palmas sordas) | `100100100100` | free |
| `pop-rock-backbeat` | 16 | `bd` (kick beats 1+3) | `1000000010000000` | free |
| `pop-rock-backbeat` | 16 | `cp` (snare backbeat) | `0000100000001000` | LOCKED |
| `pop-rock-backbeat` | 16 | `hh` (8th-note hi-hat) | `1010101010101010` | free |
| `gospel-soul-euclid` | 16 | `bd` (gospel kick) | `1000010010000100` | free |
| `gospel-soul-euclid` | 16 | `cp` (gospel snare) | `0000100000001000` | LOCKED |
| `gospel-soul-euclid` | 16 | `hh` (8th-note hi-hat) | `1010101010101010` | free |
| `aksak-dorian-odd` | 7 | `bd` (tapan 2+2+3) | `1010100` | LOCKED |
| `aksak-dorian-odd` | 7 | `hh` (def frame drum) | `1011011` | free |
| `dorian-ritual-sparse` | — | (no layers change) | — | — |

**Cultural notes (Dev must encode as inline comments in the recipe data):**

- **Afro-Cuban Son Clave:** `1001001000101000` = hits at 1-indexed steps 1,4,7,11,13 (son clave 3-2). Conga tumbao `0101010110101010` open tones on 2,4,6,8,11,13,15.
- **Rumba Clave:** `1001000100101000` = hits 1,4,8,11,13. KEY difference from son clave: step 7→8 (the "drag" — third note delayed one 16th; the defining rumba characteristic).
- **Latin Jazz Cascara:** Clave `1000101001001000` = son clave 2-3 (two-side first). Cascara `0110101010101101` = 3-2 cascara with halves swapped (2-3 orientation). Both clave and cascara LOCKED: they interlock as a unit.
- **Bossa Nova Clave:** `1001001010010010` = hits at 1,4,7,9,12,15 (6 onsets — differs from son clave's 5; the anticipation on step 9 is the bossa nova signature). Kick syncopation `1000010010001001` = hits at 1,6,9,13,16. Only clave LOCKED.
- **Samba Teleco-Teco:** Surdo `1000000010000000` = beats 1 and 3 (the heartbeat call). Teleco-teco `1011010110110101` = 3-1-2-1 grouping repeating — the SIGNATURE of samba. Both LOCKED.
- **West-African Gankogui:** `101011010101` (12-step) = Ewe Agbadza standard pattern, 7 onsets. Djembe support `100100100100` = every 3rd pulse (pure ternary). Bell LOCKED (ethnomusicology's most-studied timeline).
- **West-African Kpanlogo:** Gankogui `101011010101` same as above. Kpanlogo interlock `100101001010` interlocks with bell (7+7 asymmetric). Both LOCKED (the two patterns together create the polyrhythmic interlock).
- **Bulería:** `100100101010` = flamenco beats 12,3,6,8,10 mapped to 12 steps (step 1 = flamenco "12"). REPLACES the current wrong pattern `100011010110` in the existing `buleria-12` rhythmId. Palmas sordas `100100100100` = every 3 steps.
- **Pop/Rock:** Kick `1000000010000000` = beats 1,3 only. Snare `0000100000001000` = beats 2,4. Hi-hat `1010101010101010` = 8th notes. Snare LOCKED (the backbeat IS pop/rock).
- **Gospel Soul:** Kick `1000010010000100` = hits 1,6,9,13 (syncopated; "and of 2" on step 6). Snare `0000100000001000` = beats 2,4 (same as pop). Hi-hat same. Snare LOCKED. NOTE: `euclid-9-16` (`rhythmIds` entry) must NOT appear in the `layers` output — `layers` entirely replaces it.
- **Aksak 7/8:** `1010100` (7 steps) = 2+2+3 grouping (step 1=düm heavy, 3=tek light, 5=tek light; steps 6-7 = long unit silence). Def/frame drum `1011011` fills short units. Tapan LOCKED. This is the first 7-step recipe using Phase 07's native step-count support.

**defaultCpm values (all must satisfy `bpmRange[0] ≤ defaultCpm×4 ≤ bpmRange[1]`):**

| Recipe id | defaultCpm | Equiv. BPM | bpmRange check |
|---|---|---|---|
| `afro-cuban-clave-minor` | 25 | 100 BPM | [90,140] ✓ |
| `rumba-blues-minor` | 25 | 100 BPM | [80,140] ✓ |
| `latin-jazz-clave-swing` | 42 | 168 BPM | [120,200] ✓ |
| `bossa-nova-groove` | 32 | 128 BPM | [100,160] ✓ |
| `samba-afro-brasileiro` | 26 | 104 BPM | [100,160] ✓ |
| `west-african-bell-modal` | 22 | 88 BPM | [60,120] ✓ |
| `west-african-triplet-groove` | 22 | 88 BPM | [60,110] ✓ |
| `buleria-flamenco-phrygian` | 33 | 132 BPM | [80,160] ✓ |
| `pop-rock-backbeat` | 27 | 108 BPM | [80,160] ✓ |
| `gospel-soul-euclid` | 20 | 80 BPM | [70,130] ✓ |
| `aksak-dorian-odd` | 34 | 136 BPM | [80,160] ✓ |
| `dorian-ritual-sparse` | 18 | 72 BPM | [60,110] ✓ |

**sampleMap notes:**

- `afro-cuban-clave-minor`: add `sampleMap: { bd: 'wood', hh: 'conga' }`. These names are currently present in the recipe's `sampleMap` fallback or being upgraded — `wood` (FreePats Claves CC0) and `conga` (FreePats Conga CC0) are already registered via the Phase 04 `initAudio` call.
- `rumba-blues-minor`: recipe already has `sampleMap: { bd: 'wood' }` — retain unchanged.
- `latin-jazz-clave-swing`: upgrade `sampleMap.hh` from `'cb'` to `'cb'` — retain `cb` (no authentic timbale shell in Dirt-Samples, `cb` cowbell is the best available approximation, confirmed Phase 01 inventory). Retain existing `sampleMap: { bd: 'bd', hh: 'cb' }` unchanged.
- `bossa-nova-groove`: retain existing `sampleMap: { bd: 'bd', hh: 'hand' }` (Phase 03 upgrade). No change.
- `samba-afro-brasileiro`: upgrade `sampleMap.hh` from `'sd'` to `'hand'` (pandeiro/tamborim approximation; `hand` confirmed in strudel.json Phase 03 inventory). Update `sampleMap: { bd: 'bd', hh: 'hand' }`.
- `west-african-bell-modal`: retain existing `sampleMap: { bd: 'cb', hh: 'perc' }` — gankogui bell has no native Dirt-Samples equivalent.
- `west-african-triplet-groove`: retain existing `sampleMap: { bd: 'cb', hh: 'perc' }`.
- `buleria-flamenco-phrygian`: retain existing `sampleMap: { bd: 'cajon' }`.
- `pop-rock-backbeat`: no `sampleMap` needed — uses default `bd`, `hh`, `cp`.
- `gospel-soul-euclid`: no `sampleMap` needed — uses default `bd`, `hh`, `cp`.
- `aksak-dorian-odd`: no `sampleMap` needed — uses default `bd`, `hh`.
- `dorian-ritual-sparse`: no `sampleMap` needed.

---

## Step 08.1 — Afro-Cuban clave family: afro-cuban-clave-minor, rumba-blues-minor, latin-jazz-clave-swing

PROMPT → Read `docs/authentic-groove/phases/phase-08.md` (this file, especially the Dev reference table and cultural notes). Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` in full before editing. Read `tests/authentic-groove/propagation.test.ts` and `tests/authentic-groove/sample-map.test.ts` before editing. Apply `layers` and `defaultCpm` additions to the three Afro-Cuban clave-family recipes. Update tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 — no genre name outside `src/core/music-knowledge/`)
3. `docs/authentic-groove/phases/phase-08.md` (this file — Dev reference table, cultural notes, sampleMap notes)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before any edit)
5. `tests/authentic-groove/propagation.test.ts` (full — before editing; identify existing cueca/cumbia test structure to follow)
6. `tests/authentic-groove/sample-map.test.ts` (full — before editing)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — three recipe changes:

**`afro-cuban-clave-minor`:**
- Add `defaultCpm: 25` (100 BPM).
- Add or update `sampleMap: { bd: 'wood', hh: 'conga' }`.
- Add `layers: [...]` with the two entries from the Dev reference table. Include cultural notes as inline comments. `bd` locked; `hh` free.
- `rhythmIds` must remain consistent: update to `['son-clave-3-2', 'conga-tumbao']` if those catalog IDs exist, or supply the `rhythmId` field on each `RecipeLayer` with the catalog cross-reference. Read `src/core/music-knowledge/rhythm-catalog.ts` to confirm existing IDs before using them. If a catalog ID does not exist for the conga tumbao, leave `rhythmId` absent on that layer (optional field).

**`rumba-blues-minor`:**
- Add `defaultCpm: 25` (100 BPM).
- Retain existing `sampleMap: { bd: 'wood' }`.
- Add `layers: [...]` with the single `bd` entry (rumba clave 3-2, LOCKED). Include a cultural note comment: "KEY DIFFERENCE from son clave: step 7→8 (the 'drag' — third note delayed one 16th)". `rhythmIds` stays `['rumba-clave-3-2']`; add `rhythmId: 'rumba-clave-3-2'` on the layer.

**`latin-jazz-clave-swing`:**
- Add `defaultCpm: 42` (168 BPM).
- Retain existing `sampleMap: { bd: 'bd', hh: 'cb' }`.
- Add `layers: [...]` with the two entries from the Dev reference table. Both LOCKED. Include cultural notes. `rhythmIds` stays `['son-clave-2-3', 'cascara-euclid']`; add `rhythmId` cross-references on each layer if those IDs exist in the catalog.

**Layer format to follow (same as cueca/cumbia in Phase 05):**
```typescript
layers: [
  {
    sound: 'bd',
    binary: '1001001000101000', // son clave 3-2 — hits at 1,4,7,11,13
    steps: 16,
    locked: true,
    rhythmId: '<catalog-id-if-exists>',
    strudelSample: 'wood', // FreePats Claves CC0
  },
  {
    sound: 'hh',
    binary: '0101010110101010', // conga tumbao — open tones on 2,4,6,8,11,13,15
    steps: 16,
    locked: false,
    strudelSample: 'conga', // FreePats Conga CC0
  },
]
```

Note: `strudelSample` on a `RecipeLayer` is the per-layer override (Phase 05 design). Use it when a layer's sample differs from the top-level `sampleMap` — or omit if the top-level `sampleMap` entry is sufficient. Prefer consistency with how cueca/cumbia use it.

**Test updates:**

`tests/authentic-groove/sample-map.test.ts`:
- Add assertions for `afro-cuban-clave-minor` sampleMap: `{ bd: 'wood', hh: 'conga' }`.
- Confirm `rumba-blues-minor` sampleMap: `{ bd: 'wood' }` (unchanged — just add assertion if not present).

`tests/authentic-groove/propagation.test.ts`:
- Add a describe block "Step 08.1: Afro-Cuban clave family binary assertions" with:
  - A-08-01: `afro-cuban-clave-minor` `bd` layer binary === `'1001001000101000'`; `steps === 16`; `locked === true`.
  - A-08-01: `afro-cuban-clave-minor` `hh` layer binary === `'0101010110101010'`; `steps === 16`; `locked === false`.
  - A-08-02: `rumba-blues-minor` `bd` layer binary === `'1001000100101000'`; `steps === 16`; `locked === true`.
  - A-08-03: `latin-jazz-clave-swing` `bd` layer binary === `'1000101001001000'`; `steps === 16`; `locked === true`.
  - A-08-03: `latin-jazz-clave-swing` `hh` layer binary === `'0110101010101101'`; `steps === 16`; `locked === true`.
  - A-08-16 (partial): `afro-cuban-clave-minor` `defaultCpm === 25`; `rumba-blues-minor` `defaultCpm === 25`; `latin-jazz-clave-swing` `defaultCpm === 42`.
- Tests should call `getRecipeById(id)` and assert `recipe.layers` fields directly (same pattern as existing recipe data tests). This is a data-only test; no `applyRhythmSpec` needed here.

**Constraints:**
- All changes confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and `tests/`.
- Do NOT edit `rhythm-catalog.ts` (only add `rhythmId` cross-references if catalog IDs already exist — read the catalog first).
- Do NOT touch `apply.ts`, `persistence.ts`, `recipe-engine.ts`, or any Svelte file.
- AG-D1: no genre name added to any file outside `src/core/music-knowledge/` and `tests/`.
- AGPL-3.0 header on all files (already present — do not remove).
- Binary strings must exactly match the Dev reference table — no deviations.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run propagation` → all propagation tests pass including new assertions
- `pnpm exec vitest run sample-map` → all sample-map tests pass
- `pnpm test` → no regressions (≥ 1888)

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 08 step 08.1 — Afro-Cuban clave family authentic layers`

---

## Step 08.2 — Brazilian duo: bossa-nova-groove, samba-afro-brasileiro

PROMPT → Read `docs/authentic-groove/phases/phase-08.md` (this file). Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` and the test files before editing. Apply `layers` and `defaultCpm` to the two Brazilian recipes. Update tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1)
3. `docs/authentic-groove/phases/phase-08.md` (this file — Dev reference table, cultural notes, sampleMap notes)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before any edit; note current `bossa-nova-groove` `sampleMap: { bd: 'bd', hh: 'hand' }` from Phase 03; note current `samba-afro-brasileiro` `sampleMap: { bd: 'bd', hh: 'sd' }`)
5. `src/core/music-knowledge/rhythm-catalog.ts` (scan for `bossa-nova-clave`, `samba-surdo-base`, `samba-caixa` IDs)
6. `tests/authentic-groove/propagation.test.ts` (before editing)
7. `tests/authentic-groove/sample-map.test.ts` (before editing)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — two recipe changes:

**`bossa-nova-groove`:**
- Add `defaultCpm: 32` (128 BPM).
- Retain existing `sampleMap: { bd: 'bd', hh: 'hand' }`.
- Add `layers: [...]` with two entries:
  - `bd` (bossa nova clave): binary `1001001010010010`, 16 steps, LOCKED.
  - `hh` (kick syncopation): binary `1000010010001001`, 16 steps, free.
  - Include cultural note: "bossa nova clave: 6 onsets (vs son clave's 5); anticipation on step 9 = 'and of beat 2 bar 2'".
- `rhythmIds` stays `['bossa-nova-clave']` (single entry — the second layer has no catalog cross-reference; omit `rhythmId` on the `hh` layer).

**`samba-afro-brasileiro`:**
- Add `defaultCpm: 26` (104 BPM).
- Upgrade `sampleMap: { bd: 'bd', hh: 'sd' }` → `{ bd: 'bd', hh: 'hand' }` (pandeiro/tamborim approximation; `hand` confirmed in strudel.json, Phase 03 inventory).
- Add `layers: [...]` with two entries:
  - `bd` (surdo open): binary `1000000010000000`, 16 steps, LOCKED.
  - `hh` (tamborim teleco-teco): binary `1011010110110101`, 16 steps, LOCKED.
  - Include cultural note: "surdo: beats 1 and 3 (the 'call'); teleco-teco: 3-1-2-1 grouping — the SIGNATURE of samba".
- `rhythmIds` stays `['samba-surdo-base', 'samba-caixa']`; add `rhythmId` cross-references if those IDs exist.

**Test updates:**

`tests/authentic-groove/sample-map.test.ts`:
- Update `samba-afro-brasileiro` sampleMap assertion from `hh: 'sd'` to `hh: 'hand'`.
- Add/confirm `bossa-nova-groove` assertion `{ bd: 'bd', hh: 'hand' }` (already in Phase 03 — confirm it passes, do not duplicate).

`tests/authentic-groove/propagation.test.ts`:
- Add a describe block "Step 08.2: Brazilian duo binary assertions" with:
  - A-08-04: `bossa-nova-groove` `bd` layer binary === `'1001001010010010'`; `steps === 16`; `locked === true`.
  - A-08-04: `bossa-nova-groove` `hh` layer binary === `'1000010010001001'`; `steps === 16`; `locked === false`.
  - A-08-05: `samba-afro-brasileiro` `bd` layer binary === `'1000000010000000'`; `steps === 16`; `locked === true`.
  - A-08-05: `samba-afro-brasileiro` `hh` layer binary === `'1011010110110101'`; `steps === 16`; `locked === true`.
  - A-08-16 (partial): `bossa-nova-groove` `defaultCpm === 32`; `samba-afro-brasileiro` `defaultCpm === 26`.

**Constraints:**
- All changes confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and `tests/`.
- AG-D1 seam clean.
- Binary strings must exactly match the Dev reference table.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run sample-map` → all sample-map tests pass (including updated samba assertion)
- `pnpm exec vitest run propagation` → all propagation tests pass
- `pnpm test` → no regressions (≥ 1888)

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 08 step 08.2 — Brazilian rhythm authentic layers`

---

## Step 08.3 — African duo + Bulería: west-african-bell-modal, west-african-triplet-groove, buleria-flamenco-phrygian

PROMPT → Read `docs/authentic-groove/phases/phase-08.md` (this file). Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` and test files before editing. Apply `layers` and `defaultCpm` to the three 12-step recipes. The bulería step also corrects the wrong binary pattern `100011010110` — read the existing `buleria-12` catalog entry first to understand what will change. Update tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1)
3. `docs/authentic-groove/phases/phase-08.md` (this file — Dev reference table, cultural notes, sampleMap notes)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before any edit)
5. `src/core/music-knowledge/rhythm-catalog.ts` (read the `buleria-12` entry — confirm its current binary; read `bell-pattern-west-african`, `sparse-bell-12`, `minimal-12`)
6. `tests/authentic-groove/propagation.test.ts` (before editing)
7. `tests/authentic-groove/sample-map.test.ts` (before editing)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — three recipe changes:

**`west-african-bell-modal`:**
- Add `defaultCpm: 22` (88 BPM).
- Retain existing `sampleMap: { bd: 'cb', hh: 'perc' }`.
- Add `layers: [...]` with two entries:
  - `bd` (gankogui bell): binary `101011010101`, 12 steps, LOCKED.
  - `hh` (clap/djembe support): binary `100100100100`, 12 steps, free.
  - Include cultural note: "gankogui: Ewe Agbadza standard pattern, 7 onsets — ethnomusicology's most-studied timeline".
- `rhythmIds` stays `['bell-pattern-west-african']`; add `rhythmId` on `bd` layer.

**`west-african-triplet-groove`:**
- Add `defaultCpm: 22` (88 BPM).
- Retain existing `sampleMap: { bd: 'cb', hh: 'perc' }`.
- Add `layers: [...]` with two entries:
  - `bd` (gankogui bell): binary `101011010101`, 12 steps, LOCKED.
  - `hh` (kpanlogo interlock): binary `100101001010`, 12 steps, LOCKED.
  - Include cultural note: "gankogui + kpanlogo: 7+7 asymmetric interlock — the two patterns together create the polyrhythmic groove".
- `rhythmIds` stays `['sparse-bell-12', 'minimal-12']`; add `rhythmId` cross-references if those catalog IDs correspond to these patterns (read the catalog first to confirm).

**`buleria-flamenco-phrygian`:**
- Add `defaultCpm: 33` (132 BPM).
- Retain existing `sampleMap: { bd: 'cajon' }`.
- Add `layers: [...]` with two entries:
  - `bd` (cajón base): binary `100100101010`, 12 steps, LOCKED.
  - `hh` (palmas sordas): binary `100100100100`, 12 steps, free.
  - Include cultural note: "cajón compás: flamenco beats 12,3,6,8,10 → step 1=beat12, each step = one 12-subdivision. CORRECTS the catalog entry `100011010110`".
- `rhythmIds` stays `['buleria-12']`; add `rhythmId: 'buleria-12'` on the `bd` layer.

**IMPORTANT — Bulería catalog correction:**

The bulería `bd` layer uses binary `100100101010`. This REPLACES the wrong pattern currently in the `buleria-12` rhythm catalog entry (`100011010110`). The `layers` field takes precedence over `rhythmIds` at runtime — the recipe `bd` layer binary is what gets applied, not the catalog binary. No need to edit `rhythm-catalog.ts` to fix it (the `RecipeLayer.binary` is authoritative per Phase 05 design); however, add a comment on the `rhythmId` cross-reference noting "catalog entry has wrong binary `100011010110` — recipe `bd` layer binary `100100101010` is authoritative (A-08-14)".

**Test updates:**

`tests/authentic-groove/propagation.test.ts`:
- Add a describe block "Step 08.3: African duo + Bulería binary assertions" with:
  - A-08-06: `west-african-bell-modal` `bd` layer binary === `'101011010101'`; `steps === 12`; `locked === true`.
  - A-08-06: `west-african-bell-modal` `hh` layer binary === `'100100100100'`; `steps === 12`; `locked === false`.
  - A-08-07: `west-african-triplet-groove` `bd` layer binary === `'101011010101'`; `steps === 12`; `locked === true`.
  - A-08-07: `west-african-triplet-groove` `hh` layer binary === `'100101001010'`; `steps === 12`; `locked === true`.
  - A-08-08: `buleria-flamenco-phrygian` `bd` layer binary === `'100100101010'`; `steps === 12`; `locked === true`.
  - A-08-08: `buleria-flamenco-phrygian` `hh` layer binary === `'100100100100'`; `steps === 12`; `locked === false`.
  - A-08-14 (partial): assert the wrong pattern `'100011010110'` does NOT appear in `buleria-flamenco-phrygian` `layers[0].binary`.
  - A-08-16 (partial): `west-african-bell-modal` `defaultCpm === 22`; `west-african-triplet-groove` `defaultCpm === 22`; `buleria-flamenco-phrygian` `defaultCpm === 33`.

**Constraints:**
- All changes confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and `tests/`.
- Do NOT edit `rhythm-catalog.ts` (the catalog wrong binary is documented but not patched here; the `RecipeLayer.binary` is authoritative).
- AG-D1 seam clean.
- Binary strings: 12-step patterns must have exactly 12 characters; verify before committing.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run propagation` → all propagation tests pass
- `pnpm test` → no regressions (≥ 1888)

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 08 step 08.3 — African and flamenco 12-step authentic layers`

---

## Step 08.4 — Standard + edge cases: pop-rock-backbeat, gospel-soul-euclid, aksak-dorian-odd, dorian-ritual-sparse

PROMPT → Read `docs/authentic-groove/phases/phase-08.md` (this file). Read `src/core/music-knowledge/rhythm-harmony-recipes.ts` and test files before editing. Apply `layers` to the pop/rock, gospel, and aksak recipes; add `defaultCpm` to all four recipes including dorian-ritual-sparse (which gets no `layers`). The gospel step must verify that `euclid-9-16` does NOT appear in the `layers` output. The aksak step produces the initiative's first 7-step recipe. Update tests. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1)
3. `docs/authentic-groove/phases/phase-08.md` (this file — Dev reference table, cultural notes, sampleMap notes)
4. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (full — before any edit; note current `gospel-soul-euclid` `rhythmIds: ['euclid-9-16']`; note `aksak-dorian-odd` `rhythmIds: ['aksak-7-sparse']`; note `dorian-ritual-sparse` `rhythmIds: ['euclid-3-16']`)
5. `src/core/music-knowledge/rhythm-catalog.ts` (scan for `backbeat-snare`, `quarter-notes-16`, `aksak-7-sparse`, `euclid-9-16`)
6. `tests/authentic-groove/propagation.test.ts` (before editing)

**What to produce:**

`src/core/music-knowledge/rhythm-harmony-recipes.ts` — four recipe changes:

**`pop-rock-backbeat`:**
- Add `defaultCpm: 27` (108 BPM).
- No `sampleMap` (uses default sounds).
- Add `layers: [...]` with three entries:
  - `bd` (kick beats 1+3): binary `1000000010000000`, 16 steps, free.
  - `cp` (snare backbeat): binary `0000100000001000`, 16 steps, LOCKED.
  - `hh` (8th-note hi-hat): binary `1010101010101010`, 16 steps, free.
  - Include cultural note: "snare on 2 and 4 (the backbeat) IS pop/rock — LOCKED".
- `rhythmIds` stays `['backbeat-snare', 'quarter-notes-16']`; add a third entry or update to `['kick-1-3', 'backbeat-snare', 'quarter-notes-16']` only if all three IDs exist in the catalog. If not, supply `rhythmId` on each layer where the catalog ID exists and omit where it does not.

**`gospel-soul-euclid`:**
- Add `defaultCpm: 20` (80 BPM).
- No `sampleMap` (uses default sounds).
- Add `layers: [...]` with three entries:
  - `bd` (gospel kick): binary `1000010010000100`, 16 steps, free.
  - `cp` (gospel snare): binary `0000100000001000`, 16 steps, LOCKED.
  - `hh` (8th-note hi-hat): binary `1010101010101010`, 16 steps, free.
  - Include cultural notes: "gospel kick: hits 1,6,9,13 — syncopated; 'and of 2' anticipation on step 6"; "snare on 2 and 4 (non-negotiable gospel) — LOCKED".
- `rhythmIds` stays `['euclid-9-16']` — it is a catalog cross-reference, NOT what `recipeToAgentOutput` emits when `layers` is present. Add a comment: "`rhythmIds` retained for catalog integrity; `layers` supersedes at runtime — E(9,16) does NOT appear in the applied pattern".

**`aksak-dorian-odd`:**
- Add `defaultCpm: 34` (136 BPM).
- No `sampleMap` (uses default sounds).
- Add `layers: [...]` with two entries:
  - `bd` (tapan 2+2+3): binary `1010100`, 7 steps, LOCKED.
  - `hh` (def frame drum): binary `1011011`, 7 steps, free.
  - Include cultural notes: "tapan/davul 2+2+3: step 1=düm (heavy), 3=tek (light), 5=tek (light); steps 6-7 = long unit silence"; "first 7-step recipe — uses Phase 07 native step-count support".
- `rhythmIds` stays `['aksak-7-sparse']`; add `rhythmId: 'aksak-7-sparse'` on the `bd` layer.
- `meter` stays `'7/8'`.

**`dorian-ritual-sparse`:**
- Add `defaultCpm: 18` (72 BPM) ONLY. No `layers` change — intentionally abstract/meditative, not a culturally specific genre. Include a comment on `defaultCpm`: "meditative tempo; no authentic layers — Dorian Ritual is abstract, not genre-specific".
- `rhythmIds` stays `['euclid-3-16']` unchanged.

**Test updates:**

`tests/authentic-groove/propagation.test.ts`:
- Add a describe block "Step 08.4: Standard + edge cases binary assertions" with:
  - A-08-09: `pop-rock-backbeat` `cp` layer binary === `'0000100000001000'`; `steps === 16`; `locked === true`.
  - A-08-09: `pop-rock-backbeat` `bd` layer binary === `'1000000010000000'`; `steps === 16`; `locked === false`.
  - A-08-09: `pop-rock-backbeat` `hh` layer binary === `'1010101010101010'`; `steps === 16`; `locked === false`.
  - A-08-10: `gospel-soul-euclid` `cp` layer binary === `'0000100000001000'`; `steps === 16`; `locked === true`.
  - A-08-10: `gospel-soul-euclid` `bd` layer binary === `'1000010010000100'`; `steps === 16`; `locked === false`.
  - A-08-15 (partial): assert that `gospel-soul-euclid` `layers` does NOT include any layer whose binary has 9 onsets equal to E(9,16) (i.e., the `euclid-9-16` pattern `1010101010101011` or similar 9-onset pattern — the test must use the actual E(9,16) binary to make this assertion). Simplest form: assert `recipe.layers` exists and none of its `binary` values equals the bjorklund(9,16) result.
  - A-08-11: `aksak-dorian-odd` `bd` layer binary === `'1010100'`; `steps === 7`; `locked === true`.
  - A-08-11: `aksak-dorian-odd` `hh` layer binary === `'1011011'`; `steps === 7`; `locked === false`.
  - A-08-13: `aksak-dorian-odd` `bd` layer `steps === 7` (the 7-step grid assertion).
  - A-08-16 (partial): `pop-rock-backbeat` `defaultCpm === 27`; `gospel-soul-euclid` `defaultCpm === 20`; `aksak-dorian-odd` `defaultCpm === 34`; `dorian-ritual-sparse` `defaultCpm === 18`.
  - Assert `dorian-ritual-sparse` has no `layers` field (or `layers` is `undefined`).

**Constraints:**
- All changes confined to `src/core/music-knowledge/rhythm-harmony-recipes.ts` and `tests/`.
- `dorian-ritual-sparse` gets `defaultCpm: 18` ONLY — no `layers`.
- AG-D1 seam clean.
- Binary strings must exactly match the Dev reference table; 7-step strings are exactly 7 characters.

**Validation:**
- `pnpm exec tsc --noEmit` → clean
- `pnpm exec vitest run propagation` → all propagation tests pass
- `pnpm test` → no regressions (≥ 1888)

**CHECKPOINT → Commit message:**
`feat(music-knowledge): Phase 08 step 08.4 — Pop/rock, gospel, aksak 7-step, dorian layers`

---

## Step 08.5 — Comprehensive binary assertions + quality gate + phase-completion block

PROMPT → Extend the test suite with complete binary assertions for every recipe that received `layers` in steps 08.1–08.4. Run the full quality gate and seam fitness check. Record all outputs in the handoff. No source file changes expected; fix only lint/type issues that the gate reveals. STOP for Planner review.

**Required reading (in order):**

1. `CLAUDE.md`
2. `docs/authentic-groove/decisions.md` (AG-D1 — seam grep plan)
3. `docs/authentic-groove/phases/phase-08.md` (all Acceptance IDs A-08-01 through A-08-17)
4. `docs/authentic-groove/handoffs/phase-08-handoff.md` (confirm steps 08.1–08.4 are APPROVED)
5. `docs/adr/0025-authentic-sample-palette.md` (D3 — seam invariant + grep approach)
6. `tests/authentic-groove/propagation.test.ts` (before editing — understand existing structure; identify any binary assertions from steps 08.1–08.4 that need consolidation or gaps that need filling)
7. `src/core/music-knowledge/rhythm-harmony-recipes.ts` (scan — confirm all 12 target recipes now have `layers`; confirm `dorian-ritual-sparse` has only `defaultCpm`)

**What to produce:**

`tests/authentic-groove/propagation.test.ts` — add (or consolidate) a final describe block "Phase 08 complete binary assertion suite" that asserts:

For each recipe with `layers` (11 recipes), assert:
- Every layer's `binary` exactly matches the Dev reference table.
- Every layer's `steps` matches (16, 12, or 7 depending on recipe).
- Every LOCKED layer has `locked === true`.
- Every free layer has `locked === false` or `locked === undefined`.

For `dorian-ritual-sparse`:
- `layers` is absent (`recipe.layers === undefined`).
- `defaultCpm === 18`.

For all 12 target recipes:
- `defaultCpm` is present and equals the Dev reference table value.

Do NOT duplicate assertions already added in steps 08.1–08.4 — instead, reference existing coverage and add only missing assertions. If steps 08.1–08.4 added all needed per-step assertions, this step's test block may serve as a summary check (one call per recipe, asserting all layers in one test).

Also add to `tests/authentic-groove/propagation.test.ts`:

**A-08-14 (full):** `buleria-flamenco-phrygian` `layers[0].binary` does NOT equal `'100011010110'` (the wrong catalog pattern) AND equals `'100100101010'`.

**A-08-15 (full):** `gospel-soul-euclid` has `layers`; none of the layers has binary equal to `bjorklund(9,16).map(v => v ? '1' : '0').join('')`. (Compute the expected E(9,16) binary in the test by calling `bjorklund(9, 16)` from `euclid.ts` — import it. Assert none of `recipe.layers.map(l => l.binary)` includes that string.)

**A-08-13 (full):** `aksak-dorian-odd` `bd` layer `steps === 7`; applying it via `applyRhythmSpec` (construct a minimal spec from the `bd` layer) produces a session layer with `steps.length === 7`.

Run and record the seam fitness check:

```bash
# Genre-token grep (AG-D1 / ADR 0025 D3):
git grep -n \
  -e "'afro-cuban'" -e '"afro-cuban"' \
  -e "'rumba'" -e '"rumba"' \
  -e "'latin-jazz'" -e '"latin-jazz"' \
  -e "'bossa-nova'" -e '"bossa-nova"' \
  -e "'samba'" -e '"samba"' \
  -e "'west-african'" -e '"west-african"' \
  -e "'buleria'" -e '"buleria"' \
  -e "'gospel'" -e '"gospel"' \
  -e "'aksak'" -e '"aksak"' \
  -e "'dorian-ritual'" -e '"dorian-ritual"' \
  -e "'pop-rock'" -e '"pop-rock"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```

Must return zero matches.

Run and record the full quality gate:
- `pnpm exec tsc --noEmit`
- `pnpm lint`
- `pnpm test`
- `pnpm build`

**Reversibility note (required verbatim in handoff):**
- All Phase 08 changes are additive data fields on `MusicalRecipe` (`layers` and `defaultCpm`). Reverting them removes the authentic binary layers and default tempos; recipes fall back to `rhythmIds` + index-based sound assignment (pre-Phase-08 behavior). No schema change, no migration, no `SESSION_SCHEMA_VERSION` bump.
- `rhythm-catalog.ts` is not modified. Reverting Phase 08 does not affect the catalog.
- The samba `sampleMap.hh: 'sd' → 'hand'` upgrade and the `afro-cuban-clave-minor` `sampleMap` addition are data changes in `rhythm-harmony-recipes.ts`. Reverting them restores Phase 05/07 sampleMap values.

**Acceptance criteria in this step:**
- A-08-01 through A-08-12 (full): all recipe binary assertions pass.
- A-08-13 (full): aksak 7-step propagation test passes (`steps.length === 7`).
- A-08-14 (full): wrong bulería pattern confirmed absent; correct pattern confirmed present.
- A-08-15 (full): `euclid-9-16` not used in gospel soul layers output.
- A-08-16 (full): all 12 `defaultCpm` values present and correct.
- A-08-17 (full): quality gate clean; seam grep zero matches; test count ≥ 1888 + new tests.

**Validation:** all gate commands + seam grep recorded in the handoff with output.

**CHECKPOINT → Commit message:**
`test(authentic-groove): Phase 08 step 08.5 — recipe binary assertions + quality gate`

---

## Phase Acceptance

| ID | Description | Validation method |
|---|---|---|
| A-08-01 | `afro-cuban-clave-minor` `bd` layer emits binary `1001001000101000` (16 steps, locked); `hh` layer emits `0101010110101010` (16 steps, free) | unit: propagation.test.ts binary assertions |
| A-08-02 | `rumba-blues-minor` `bd` layer emits binary `1001000100101000` (16 steps, locked); cultural "drag" note present | unit: propagation.test.ts binary assertions |
| A-08-03 | `latin-jazz-clave-swing` `bd` layer emits `1000101001001000` (16 steps, locked); `hh` layer emits `0110101010101101` (16 steps, locked) | unit: propagation.test.ts binary assertions |
| A-08-04 | `bossa-nova-groove` `bd` layer emits `1001001010010010` (16 steps, locked); `hh` layer emits `1000010010001001` (16 steps, free) | unit: propagation.test.ts binary assertions |
| A-08-05 | `samba-afro-brasileiro` `bd` layer emits `1000000010000000` (16 steps, locked); `hh` layer emits `1011010110110101` (16 steps, locked) | unit: propagation.test.ts binary assertions |
| A-08-06 | `west-african-bell-modal` `bd` layer emits `101011010101` (12 steps, locked); `hh` layer emits `100100100100` (12 steps, free) | unit: propagation.test.ts binary assertions |
| A-08-07 | `west-african-triplet-groove` `bd` layer emits `101011010101` (12 steps, locked); `hh` layer emits `100101001010` (12 steps, locked) | unit: propagation.test.ts binary assertions |
| A-08-08 | `buleria-flamenco-phrygian` `bd` layer emits `100100101010` (12 steps, locked); `hh` layer emits `100100100100` (12 steps, free) | unit: propagation.test.ts binary assertions |
| A-08-09 | `pop-rock-backbeat` three layers: `bd` `1000000010000000` (free), `cp` `0000100000001000` (locked), `hh` `1010101010101010` (free) | unit: propagation.test.ts binary assertions |
| A-08-10 | `gospel-soul-euclid` three layers: `bd` `1000010010000100` (free), `cp` `0000100000001000` (locked), `hh` `1010101010101010` (free) | unit: propagation.test.ts binary assertions |
| A-08-11 | `aksak-dorian-odd` two layers: `bd` `1010100` (7 steps, locked), `hh` `1011011` (7 steps, free) | unit: propagation.test.ts binary assertions |
| A-08-12 | `dorian-ritual-sparse` has no `layers` field; `defaultCpm: 18` is present | unit: propagation.test.ts; data inspection |
| A-08-13 | `aksak-dorian-odd` `bd` layer `steps === 7`; applying it via `applyRhythmSpec` produces a session layer with `steps.length === 7` (exercising Phase 07 native step-count support) | unit: propagation.test.ts |
| A-08-14 | `buleria-flamenco-phrygian` `layers[0].binary` equals `'100100101010'` and does NOT equal `'100011010110'` (the wrong catalog pattern) | unit: propagation.test.ts |
| A-08-15 | `gospel-soul-euclid` `layers` is present and contains no layer whose binary equals the E(9,16) Euclidean pattern (`euclid-9-16` not used) | unit: propagation.test.ts |
| A-08-16 | All 12 recipes have `defaultCpm` present and each value satisfies `bpmRange[0] ≤ defaultCpm×4 ≤ bpmRange[1]` | unit: propagation.test.ts; data inspection |
| A-08-17 | `tsc --noEmit` clean; `pnpm lint` clean; `pnpm test` ≥ 1888 + all Phase 08 tests; `pnpm build` succeeds; seam grep returns zero genre-name matches outside `src/core/music-knowledge/` | live-system: quality gate + seam grep recorded in step 08.5 handoff |

---

## Partial coverage from prior phase

From Phase 07 deferred items (all unchanged):
- `applyLoadedSession` locked-field gap — permanently deferred.
- Dimension 2 (per-hit accent/velocity variation) — permanently deferred per initiative scope.
- Dimension 3 (swing/groove feel) — permanently deferred per initiative scope.
- Pandeiro one-shots — permanently deferred (no CC0 source found).
- Guacharaca/scraper EggShaker fallback — confirmed in Phase 05; shaker registered and in use.
- Pentagrama `NoteSlot` free placement — carried from orbifold-v2 Ph10; permanently deferred.
- Per-chord `lpf`/`lpq` slider D-3 — carried from harmonic-rhythm-improvements; permanently deferred.

No prior phase has partial Acceptance IDs carried into this phase.

---

## ADR Triggers

No new ADR is anticipated. All changes are additive data fields on `MusicalRecipe` within the boundaries of ADR 0025 (seam definition), Phase 05's `RecipeLayer` design, and AG-D1.

An ADR would be required if:
- The Pilot decides the wrong `buleria-12` catalog binary should also be patched in `rhythm-catalog.ts` (it is currently left wrong, with the `RecipeLayer.binary` serving as authoritative). Surface as a blocker if raised — fixing the catalog would affect any caller that reads `rhythm-catalog.ts` directly.
- A new sample registration is needed for any recipe in this phase (none anticipated; Phase 04's `initAudio` already registers `wood`, `conga`, `shaker`, `cajon`; Phase 03 registered `hand` via manifest).

---

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/authentic-groove/handoffs/phase-08-handoff.md`. See `handoff-template.md`.

<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 03 Inventory — Authentic Sample Registration

**Step:** 03.1 — Inventory
**Date:** 2026-06-24
**Status:** Ready for Pilot review — §2 contains a critical finding that must be resolved before step 03.2

---

## Pre-flight checks

- `SCHEMA_VERSION` in `src/agent/schema.ts`: **6** (gate condition met — Phase 02 complete)
- `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts`: **5** (gate condition met)
- `pnpm test` passing at **1693** (gate count confirmed per phase gate)
- ADR 0025 in force — D1–D7 all present and confirmed
- AG-D1 seam invariant in force — confirmed in `docs/authentic-groove/decisions.md`
- Phase 02 complete and merged to `main`

---

## §1 — Current `samples()` call and what it registers

### Exact line from `src/audio/strudel.ts`

Line 165 in `initAudio()`:

```typescript
const samplesReady = samples('github:tidalcycles/dirt-samples');
```

This line appears inside `initAudio()` at the point where the function sets up the audio environment. It is awaited on line 166 as part of a `Promise.all`:

```typescript
await Promise.all([defaultPrebake(), registerSynthSounds(), samplesReady]);
```

### What `'github:tidalcycles/dirt-samples'` resolves to

The `samples()` function (aliased as `Bo` in the bundled `dist/index.mjs`) handles the `github:` shorthand via the `Mo()` function (line 4747 of the bundle). The transformation is:

1. Input: `'github:tidalcycles/dirt-samples'`
2. Split on `'github:'` → user+repo path: `'tidalcycles/dirt-samples'`
3. Path has exactly 2 parts → append `/main`: `'tidalcycles/dirt-samples/main'`
4. Prepend raw GitHub base: `'https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json'`

The resolved URL is `https://raw.githubusercontent.com/tidalcycles/dirt-samples/main/strudel.json` (case-insensitive on GitHub's CDN; the master and main branches both serve the same strudel.json — confirmed via HTTP 200 on both `main` and `master` branches during this inventory).

### Folders confirmed present in the live `strudel.json` manifest (fetched 2026-06-24)

Fetched from `https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/strudel.json`. The manifest contains **218 sample folders** (plus one `_base` key). All 218 are registered when Orbifold calls `samples('github:tidalcycles/dirt-samples')`.

Percussion-relevant folders present in the manifest (relevant to the recipe catalog):

| Sample name | Description |
|---|---|
| `bd` | Kick/bass drum samples |
| `sd` | Snare drum samples |
| `hh` | Closed hi-hat samples |
| `oh` | Open hi-hat samples |
| `cp` | Clap samples |
| `rim` | Rimshot samples |
| `cb` | Cowbell (single file: `rytm-cb.wav`) |
| `perc` | Ethnic/other percussion (6 files: `000_perc0.wav` – `005_perc5.wav`) |
| `east` | Eastern percussion (9 files including `taiko_1.wav`, `shime_hi.wav`, `ohkawa_mute.wav`, `ohkawa_open.wav`, `nipon_wood_block.wav`) |
| `hand` | Hand percussion (17 files: `hand1-mono.wav` – `hand22-mono.wav`) |
| `tabla` | Tabla hand drum (26 files including bass flicks, dead hits, hi flicks) |
| `tabla2` | Tabla variation samples |
| `world` | World percussion (3 files: `bd.wav`, `gabbakick.wav`, `sn.wav`) |
| `latibro` | Synth-like Latin percussion sounds (8 files) |

### Pilot-confirmed missing folders

The Pilot stated that `conga` and `wood` are not in the manifest and play silent. This is confirmed and **extended** by the live verification below — see §2 for the critical finding.

---

## §2 — Missing folders and the correct registration API

### Critical finding: `conga` and `wood` do not exist in the Dirt-Samples repository

**Live verification performed 2026-06-24:**

1. `conga` is **absent** from `strudel.json` — confirmed via JSON key lookup.
2. `wood` is **absent** from `strudel.json` — confirmed via JSON key lookup.
3. GitHub API call to `https://api.github.com/repos/tidalcycles/Dirt-Samples/contents/conga` → **404 Not Found**.
4. GitHub API call to `https://api.github.com/repos/tidalcycles/Dirt-Samples/contents/wood` → **404 Not Found**.
5. Direct raw file probes at `https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/conga/0_conga.wav`, `conga/conga0.wav`, `wood/0_wood.wav`, `wood/wood0.wav` → all **HTTP 404**.
6. Root directory listing of the repository via GitHub API → `conga` and `wood` are absent from the 218 directories listed.
7. All available branches checked (`main`, `master`, `edited-numbers`) → `conga` does not exist in any branch.

**Conclusion: `conga` and `wood` are not folders that exist in `tidalcycles/Dirt-Samples` at all. They cannot be registered via a targeted `samples()` call pointing to that repository, because there are no files to point to.**

This is a broader finding than the Pilot's statement: it is not that they are "missing from the manifest" — they are absent from the repository entirely.

### Implication for the Phase 03 approach

The Phase 03 spec premises that `conga` and `wood` are in the Dirt-Samples repository but simply absent from `strudel.json`, and that a targeted `samples()` call can register them individually. That premise is **false for both folders**.

Phase 03 therefore needs a revised approach for step 03.2. Three options:

**Option A — Register from an external sample source (e.g. GitHub CDN for another sample pack).**
A `samples()` call can register any sample name by pointing to public WAV URLs. For example:
```typescript
samples({
  conga: ['https://example.com/conga0.wav', 'https://example.com/conga1.wav'],
});
```
This would require identifying a suitable licensed source for conga and wood block sounds. This was not scoped in Phase 03 and introduces a network dependency on a third party beyond `tidalcycles/Dirt-Samples`. **Not recommended without Pilot decision.**

**Option B — Use existing `east` folder for wood-block character and `perc` for conga character.**
The `east` folder (already registered) contains `nipon_wood_block.wav` — a real wood block sample. The sample name `east` maps to this and 8 other eastern percussion sounds. The `perc` folder contains 6 ethnic percussion samples. Both are already loaded. **No new `samples()` call is needed.**

**Option C — No new `samples()` call; the sampleMap upgrades in §3 use only existing registered names.**
If the authentic improvement is achieved by reassigning existing sampleMap entries to other already-registered names (e.g. using `east` for wood-block character, `tabla` for hand-drum character), then Phase 03 step 03.2 reduces to a no-op for sample registration, and the work is entirely in step 03.3 (sampleMap upgrades).

### `samples()` API: additive vs. overwrite behavior (confirmed)

**Source: `dist/index.mjs` lines 4676–4804 (`td`, `Po`, `Bo` functions).**

The `samples()` function (`Bo`) ultimately calls `hr.setKey(key, value)` for each folder name in the map. The `setKey` implementation (line 4678) is:

```javascript
t.setKey = function(u, n) {
  typeof n > "u" ? ... : t.value[u] !== n && (t.value = {
    ...t.value,
    [u]: n
  }, t.notify(u));
}
```

This uses an object spread (`...t.value`) and then sets the new key. **This is additive/merging behavior**: each new `samples()` call adds new keys to the existing sample store without overwriting existing keys (unless the same key name is re-used, in which case it overwrites that specific key). Multiple `samples()` calls are fully supported and additive.

**Confirmation: `@strudel/web@1.0.3` supports multiple `samples()` calls. They merge, not overwrite.**

### Async behavior of `samples()`

`Bo` is declared as `async`. When given a `github:` shorthand string, it fetches the `strudel.json` via `fetch()` and calls itself recursively with the parsed JSON object. When given a plain object (the sample map), it calls `Po` synchronously (no I/O), but individual audio files are **not fetched at registration time** — Strudel uses lazy loading: files are fetched the first time a pattern triggers them. The Strudel docs confirm: "only the sample maps (mapping names to URLs) are loaded initially, while the audio samples themselves are not loaded until they are actually played."

**Therefore:** A `samples()` call with a pre-known object (no string URL fetch needed) resolves almost immediately. It should be `await`ed to ensure the registration is complete before any pattern evaluation, consistent with the existing `Promise.all` pattern in `initAudio()`. If the call registers from a URL (as `github:` does), it should definitely be awaited.

### What a targeted `samples()` call looks like (if external source is chosen)

If the Pilot decides on Option A (external source), the call shape is:

```typescript
samples({
  conga: [
    'https://<source>/conga0.wav',
    'https://<source>/conga1.wav',
    // ...
  ],
  wood: [
    'https://<source>/wood0.wav',
    // ...
  ],
});
```

No `_base` key is needed when full URLs are used. This call would be added to `initAudio()` and included in the `Promise.all`.

If the Pilot decides on Option B or C (use existing registered samples), **no new `samples()` call is needed in step 03.2**, and step 03.2 may be a no-op or removed.

### Other folders verified as absent from `strudel.json`

The phase spec also asked about `bottle`, `bass3`, and `crow`:

| Folder | Present in `strudel.json`? | Present in repo? | Relevant to sampleMap? |
|---|---|---|---|
| `bottle` | **Yes** (13 files: `000_1.wav` – `012_9.wav`) | Yes | Possibly (bottle-blow tones, not percussion) |
| `bass3` | **Yes** (12 files: synth bass samples) | Yes | No (bass synth, not percussion) |
| `crow` | **Yes** (4 files: `000_crow.wav` – `003_crow4.wav`) | Yes | No (bird sound FX) |
| `conga` | **No** | **No** | Target of Phase 03 — **does not exist** |
| `wood` | **No** | **No** | Target of Phase 03 — **does not exist** |

`bottle`, `bass3`, and `crow` are already registered by the existing `samples('github:tidalcycles/dirt-samples')` call.

---

## §3 — sampleMap upgrade plan

### Current fallback entries in `rhythm-harmony-recipes.ts`

The following recipes have `sampleMap` entries with fallback comments:

| Recipe ID | Sound slot | Current value | Fallback comment |
|---|---|---|---|
| `west-african-bell-modal` | `bd` | `'cb'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `west-african-bell-modal` | `hh` | `'perc'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `bossa-nova-groove` | `hh` | `'sd'` | `// fallback: no native pandeiro/tamborim in @strudel/web@1.0.3` |
| `latin-jazz-clave-swing` | `hh` | `'cb'` | `// fallback: no native cascara/timbale shell in @strudel/web@1.0.3` |
| `west-african-triplet-groove` | `bd` | `'cb'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `west-african-triplet-groove` | `hh` | `'perc'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `rumba-blues-minor` | `bd` | `'perc'` | `// fallback: no native clave in @strudel/web@1.0.3` |
| `samba-afro-brasileiro` | `hh` | `'sd'` | `// fallback: no native surdo/caixa in @strudel/web@1.0.3` |
| `buleria-flamenco-phrygian` | `bd` | `'perc'` | `// fallback: no native cajon in @strudel/web@1.0.3` |
| `cumbia-latina-groove` | `bd` | `'perc'` | `// fallback: no native caja/guacharaca in @strudel/web@1.0.3` |
| `candombe-dorian-groove` | `bd` | `'perc'` | `// fallback: no native candombe drum names in @strudel/web@1.0.3` |

### Per-entry upgrade assessment

Based on the live strudel.json verification and the samples available in the registered palette:

#### 1. West-African bell patterns (`west-african-bell-modal` and `west-african-triplet-groove`)

**Current:** `bd → 'cb'`, `hh → 'perc'`

**Finding:** The `east` folder (registered, present in `strudel.json`) contains `000_nipon_wood_block.wav` — a genuine wood block sound. Wood blocks are a closer approximation to a struck metal bell (gankogui) than a cowbell in terms of tonal attack character. The `east` folder also contains `taiko_1.wav`, `taiko_2.wav`, `taiko_3.wav`, `shime_hi.wav`, `shime_mute.wav`, `ohkawa_mute.wav`, `ohkawa_open.wav` (Japanese drums and a wooden block).

However, `east` is a **mixed bag**: `s("east")` cycles through all 9 files (taiko, wood block, shime). Using `:0` (index 0 = `nipon_wood_block.wav`) would select the wood block specifically, but `sampleMap` values are sample **names** (the folder name), not indexed selections. The `s("east")` pattern will cycle through all 9 eastern sounds, not stay on the wood block.

**Assessment for `bd` slot (bell/agogo role):** `'east'` introduces randomness across 9 sounds; `'cb'` (cowbell) is consistent at 1 sound. For a timeline bell pattern, consistency is more important than timbral accuracy. **Keep `'cb'` for `bd` slot** — the cowbell's metallic ring is more appropriate than a random eastern drum mix.

**Assessment for `hh` slot (secondary bell/agogo role):** `'perc'` is 6 generic percussion sounds. `'east'` offers 9 sounds with more varied attack. Either is a fallback. **Keep `'perc'` for `hh` slot** — the existing fallback is appropriate; `east` is not clearly better.

**Upgrade:** Keep both fallbacks as-is. The fallback comment can be softened to acknowledge what is available, but the names stay.

**→ KEEP FALLBACK for both slots. Reason: `east` is not clearly better for a repeating bell timeline; `cb` and `perc` remain the best available names. No authentic `agogo` or `gankogui` exists in the registered palette.**

#### 2. Bossa nova (`bossa-nova-groove`) — `hh → 'sd'`

**Current:** `hh → 'sd'` (fallback for pandeiro/tamborim)

**Finding:** No `pandeiro`, `tamborim`, or equivalent exists in `strudel.json`. The `hand` folder (registered, 17 files) contains hand percussion sounds (`hand1-mono.wav` through `hand22-mono.wav`). Hand percussion is thematically closer to a pandeiro (hand frame drum) than a snare drum.

**Assessment:** `'hand'` (hand percussion) is arguably more authentic than `'sd'` (snare drum) for a pandeiro role in bossa nova. The pandeiro is a hand-played frame drum; the `hand` folder contains hand-strike sounds. This is a genuine improvement.

**→ UPGRADE: `hh → 'sd'` → `hh → 'hand'`. Comment becomes: `// hand percussion approximates pandeiro — no native pandeiro in Dirt-Samples`**

#### 3. Latin jazz cascara (`latin-jazz-clave-swing`) — `hh → 'cb'`

**Current:** `hh → 'cb'` (fallback for cascara/timbale shell)

**Finding:** Cascara is a metal shell pattern (timbale shell). The `cb` (cowbell) has metallic ring similar to a timbale shell strike. No `cascara`, `timbale`, or `shell` folder exists in `strudel.json`.

**Assessment:** `'cb'` remains the best available fallback. No improvement available with currently registered samples.

**→ KEEP FALLBACK. Reason: no closer approximation exists in the registered palette.**

#### 4. Rumba clave (`rumba-blues-minor`) — `bd → 'perc'`

**Current:** `bd → 'perc'` (fallback for clave)

**Finding:** Clave is a struck idiophone (two wooden sticks). The `east` folder contains `nipon_wood_block.wav` — a struck wood idiophone, which is tonally closer to clave than generic `perc`. Additionally, `east:0` specifically = wood block. However, using `east` cycles through all 9 eastern sounds (taiko, shime, etc.).

**Assessment:** `'east'` would cycle through 9 sounds including Japanese drums, which is not closer to a Latin clave. The generic `perc` (6 ethnic percussion sounds) is a similar approximation. **Keep `'perc'`.**

**→ KEEP FALLBACK. Reason: `east` cycles through Japanese percussion unrelated to clave; `perc` is the best available generic struck-idiophone approximation.**

#### 5. Samba caixa (`samba-afro-brasileiro`) — `hh → 'sd'`

**Current:** `hh → 'sd'` (fallback for surdo/caixa)

**Finding:** Same analysis as bossa nova. The `hand` folder is closer in character to a caixa (a Brazilian snare variant played with a hand/mallet) than the standard `sd` snare. However, the caixa is a snare drum, and `sd` (snare drum) is actually appropriate. The `hand` folder is hand slaps, not a snare.

**Assessment:** `'sd'` is the correct choice for a caixa approximation. The caixa is a snare instrument; `sd` is a snare sample. This is already the best available match. **Keep `'sd'`.**

**→ KEEP FALLBACK. Reason: `sd` (snare drum) is the correct approximation for the caixa snare role; `hand` is not closer.**

#### 6. Bulería cajon (`buleria-flamenco-phrygian`) — `bd → 'perc'`

**Current:** `bd → 'perc'` (fallback for cajon)

**Finding:** Cajon is a wooden box drum with both bass and snare character. The `perc` folder contains 6 ethnic percussion sounds. No cajon sample exists in `strudel.json`. The `hand` folder's hand slaps could approximate cajon slap tones. However, the bulería pattern uses `bd` (bass/kick role), and `perc` gives a more struck-membrane feel than hand slaps.

**Assessment:** **Keep `'perc'`** for the bass-struck role.

**→ KEEP FALLBACK. Reason: no cajon exists in Dirt-Samples; `perc` remains the best available approximation for a struck wooden drum.**

#### 7. Cumbia caja (`cumbia-latina-groove`) — `bd → 'perc'`

**Current:** `bd → 'perc'` (fallback for caja/guacharaca)

**Finding:** Caja is a cylindrical membrane drum (similar in role to a floor tom). No caja exists in `strudel.json`. The `hand` folder could represent a hand-played drum, but the cumbia pattern is specifically a `bd`-slot (bass-drive role).

**Assessment:** **Keep `'perc'`** for ethnic percussion character.

**→ KEEP FALLBACK. Reason: no caja or equivalent exists in Dirt-Samples; `perc` remains appropriate.**

#### 8. Candombe chico (`candombe-dorian-groove`) — `bd → 'perc'`

**Current:** `bd → 'perc'` (fallback for candombe drums)

**Finding:** No candombe drum (chico, piano, repique) exists in `strudel.json`. The `hand` folder has hand percussion.

**Assessment:** **Keep `'perc'`** — same reasoning as bulería and cumbia.

**→ KEEP FALLBACK. Reason: no candombe drum exists in Dirt-Samples; `perc` is the best available approximation.**

### Summary upgrade table

| Recipe ID | Sound slot | Current value | Action | New value |
|---|---|---|---|---|
| `west-african-bell-modal` | `bd` | `'cb'` | KEEP | `'cb'` |
| `west-african-bell-modal` | `hh` | `'perc'` | KEEP | `'perc'` |
| `bossa-nova-groove` | `hh` | `'sd'` | **UPGRADE** | `'hand'` |
| `latin-jazz-clave-swing` | `hh` | `'cb'` | KEEP | `'cb'` |
| `west-african-triplet-groove` | `bd` | `'cb'` | KEEP | `'cb'` |
| `west-african-triplet-groove` | `hh` | `'perc'` | KEEP | `'perc'` |
| `rumba-blues-minor` | `bd` | `'perc'` | KEEP | `'perc'` |
| `samba-afro-brasileiro` | `hh` | `'sd'` | KEEP | `'sd'` |
| `buleria-flamenco-phrygian` | `bd` | `'perc'` | KEEP | `'perc'` |
| `cumbia-latina-groove` | `bd` | `'perc'` | KEEP | `'perc'` |
| `candombe-dorian-groove` | `bd` | `'perc'` | KEEP | `'perc'` |

**Only one upgrade is warranted based on live verification:** `bossa-nova-groove`, `hh` slot: `'sd'` → `'hand'`. The `hand` folder (17 files of hand percussion) is a closer approximation to pandeiro hand-frame drum than a standard snare drum.

### Recipes without sampleMap that could now benefit

Checking whether any of the newly examined registered folders (`east`, `hand`, `tabla`, `tabla2`) unlock previously unfeasible mappings for recipes currently without a `sampleMap`:

- `afro-cuban-clave-minor`: single layer `bd` (son clave). No mapping improvement available.
- `dorian-ritual-sparse`: single layer `bd`. Generic. No improvement.
- `pop-rock-backbeat`: two layers, generic. No improvement.
- `aksak-dorian-odd`: single layer `bd`. No improvement.
- `gospel-soul-euclid`: single layer `bd`. No improvement.
- `cueca-chilena-folk`: single layer `bd`. No improvement.

**Conclusion:** No previously unmapped recipe benefits from a new sampleMap entry based on the currently registered palette.

---

## §4 — AG-D1 seam impact

### What new sample names would appear in `src/audio/strudel.ts`

**If step 03.2 adds a new `samples()` call:** The call would add string literals for any new registration. For example:
- If Option A (external source): URL strings and sample names like `'conga'`, `'wood'`
- If Option B/C (no new call): nothing new in `strudel.ts`

Given the finding in §2 that `conga` and `wood` do not exist in the Dirt-Samples repo, and given that no external source has been pre-approved, **the most likely outcome is Option C**: no new `samples()` call is needed in step 03.2.

**However, if a new `samples()` call registers only the `'hand'` name** (which is already in strudel.json and thus already registered), that would be redundant — `'hand'` is already loaded via the existing `samples('github:tidalcycles/dirt-samples')` call. **No new `samples()` call is needed for the §3 upgrade**.

### AG-D1 seam analysis for `'hand'` as a new sampleMap value

The `bossa-nova-groove` upgrade changes `sampleMap.hh` from `'sd'` to `'hand'`. This change happens entirely inside `src/core/music-knowledge/rhythm-harmony-recipes.ts` — the only permitted location for genre→sample mapping. The string `'hand'` is a generic palette name (instrument sound category), not a genre identifier. It does not violate the seam invariant.

**The string `'hand'` would appear in:**
- `src/core/music-knowledge/rhythm-harmony-recipes.ts` — permitted (knowledge layer)
- `tests/authentic-groove/sample-map.test.ts` — permitted (excluded from seam grep)

**The string `'hand'` would NOT appear in:**
- `src/audio/strudel.ts` — `'hand'` is already registered via the manifest; no new line needed
- `src/core/codegen/` — receives `strudelSample` opaquely; emits it without knowing its value
- `src/agent/apply.ts` — applies the map generically; no literal sample names
- `src/lib/persistence.ts` — stores `strudelSample` as an opaque string

### AG-D1 seam grep: no extension needed

The existing seam grep (ADR 0025 D3) checks for genre tokens:
```bash
git grep -n \
  -e "'cumbia'" -e '"cumbia"' \
  -e "'cueca'" -e '"cueca"' \
  -e "'candombe'" -e '"candombe"' \
  -e "'samba'" -e '"samba"' \
  -e "'flamenco'" -e '"flamenco"' \
  -e "'milonga'" -e '"milonga"' \
  -e "'maqsum'" -e '"maqsum"' \
  -e "'baladi'" -e '"baladi"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)tests/'
```

**No extension is needed.** The new value `'hand'` is a generic palette name, not a genre identifier. It does not appear in the seam grep's token list and would not produce a false positive. The existing grep is sufficient to verify the seam after step 03.3.

If step 03.2 adds no new `samples()` call (because `'hand'` is already registered), then `strudel.ts` is not modified in step 03.2, and the seam verification remains unchanged.

### Summary of seam safety

| Change | Location | Seam status |
|---|---|---|
| `hh → 'hand'` in `bossa-nova-groove.sampleMap` | `music-knowledge/rhythm-harmony-recipes.ts` | Clean — permitted location |
| No new `samples()` call (if Option C) | `audio/strudel.ts` | No change — clean |
| `'hand'` in test assertions | `tests/authentic-groove/sample-map.test.ts` | Excluded from seam grep — clean |

---

## Critical finding summary and Pilot decision required

**Finding:** `conga` and `wood` do not exist in `tidalcycles/Dirt-Samples` (confirmed 2026-06-24). The Phase 03 architectural note stated the plan was to register these folders via a targeted `samples()` call. That plan is not executable as written.

**Required Pilot decision:** Which option to pursue for step 03.2:

- **Option A:** Source conga and wood sounds from an external sample host (requires identifying, vetting, and licensing a source — out of current scope, introduces network dependency).
- **Option B:** Repurpose `east` (wood block + Japanese drums) as a sampleMap entry for wood-block roles, using already-registered `east` name. No new `samples()` call needed. Minor cultural improvement.
- **Option C (recommended):** Accept that `conga` and `wood` don't exist; reduce Phase 03 to the one warranted sampleMap upgrade (`bossa-nova-groove` `hh → 'hand'`); step 03.2 becomes a no-op or is merged into step 03.3; step 03.4 runs as specified. The `'hand'` sample is already registered by the existing `samples('github:tidalcycles/dirt-samples')` call.

The inventory recommends **Option C**. All Phase 03 acceptance criteria can still be met: the sampleMap upgrade (`hand`) is a genuine improvement; the propagation tests will confirm it flows correctly; the seam remains clean.

---

## Files touched in this step

Zero `.ts` or `.svelte` files modified. Read-only step.

New files created:
- `docs/authentic-groove/inventories/phase-03-inventory.md` (this file)
- `docs/authentic-groove/handoffs/phase-03-handoff.md` (step 03.1 entry)

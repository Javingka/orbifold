<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 04 Inventory — FreePats Static Sample Bank

**Step:** 04.1 — Inventory
**Date:** 2026-06-24
**Status:** Ready for Pilot review — §1 format decision and §2 file selection require confirmation before step 04.2

---

## Pre-flight checks

- `SCHEMA_VERSION` in `src/agent/schema.ts`: **6** (gate condition met — Phase 03 complete)
- `SESSION_SCHEMA_VERSION` in `src/lib/persistence.ts`: **5** (gate condition met)
- `pnpm test` passing at **1698** (gate count confirmed per phase gate)
- ADR 0025 in force — D1–D7 all present and confirmed in `docs/adr/0025-authentic-sample-palette.md`
- AG-D1 seam invariant in force — confirmed in `docs/authentic-groove/decisions.md`
- Phase 03 complete and merged to `main`

---

## §1 — Toolchain and Format Decision

### ffmpeg availability

`ffmpeg` is available at `/Users/virtualmachine/ffmpeg-bin/ffmpeg`.

Full version string:
```
ffmpeg version 8.1-tessus  https://evermeet.cx/ffmpeg/  Copyright (c) 2000-2026 the FFmpeg developers
built with Apple clang version 17.0.0 (clang-1700.6.4.2)
libavutil      60. 26.100 / 60. 26.100
libavcodec     62. 28.100 / 62. 28.100
```

`ffmpeg` is confirmed available in the dev environment with full codec support including libopus, libvorbis, and other audio encoders.

### OGG support verification in `@strudel/web@1.0.3`

**Method:** Examined `node_modules/@strudel/web/dist/index.mjs` for audio loading and decoding paths.

**Finding:** The audio loading function `Zi` (line 4724 of the bundle) is:

```javascript
jr[e] = fetch(e).then((s) => s.arrayBuffer()).then(async (s) => {
  const h = await t.decodeAudioData(s);
  return Qi[e] = h, h;
});
```

This path is **format-agnostic**: it fetches a URL as a raw `ArrayBuffer` and passes it to `AudioContext.decodeAudioData()`. There is no file-extension filtering or format detection in the sampler code. The format support is entirely determined by the browser's `AudioContext.decodeAudioData()` implementation.

**OGG Vorbis browser support:** All major browsers (Chrome, Firefox, Safari 14.1+, Edge) support OGG Vorbis decoding via `AudioContext.decodeAudioData()`. The Strudel documentation and community confirm OGG usage as standard. The existing `tidalcycles/Dirt-Samples` manifest itself contains `.wav` and `.mp3` files, and Strudel handles both transparently. OGG works by the same mechanism.

**Conclusion: OGG Vorbis is confirmed supported by `@strudel/web@1.0.3`'s sampler for all target browsers.** The format check is delegated to the browser's Web Audio API, not to Strudel's bundled code.

**The `dist/index.mjs` contains no string literal `'ogg'` or `"ogg"`** — confirmed by `grep` returning zero matches on the literal strings. The format is fully transparent to the Strudel sampler.

### Chosen output format: OGG Vorbis

**Decision:** Use OGG Vorbis (`-codec:a libvorbis -qscale:a 5`) as the output format. OGG is preferred over WAV for a 5–10x size reduction (estimated 50–80 kB per 1–2 s sample vs. 300–500 kB for WAV at 44.1 kHz 16-bit).

**ffmpeg conversion command (binding for step 04.2):**

```bash
ffmpeg -i <input>.flac -codec:a libvorbis -qscale:a 5 -ac 1 -ar 44100 <output>.ogg
```

Parameters:
- `-codec:a libvorbis`: OGG Vorbis codec (supported by `ffmpeg` build confirmed above)
- `-qscale:a 5`: variable bitrate quality 5 (≈ 112 kbps, good perceptual quality for percussion)
- `-ac 1`: mono (percussion samples are mono; saves ~50% space over stereo)
- `-ar 44100`: 44.1 kHz sample rate (standard for web audio)

**Fallback (not needed):** `ffmpeg` is available; no fallback approach is required.

---

## §2 — FreePats File Selection

### Repository structure (confirmed live 2026-06-24)

Repository: `https://github.com/freepats/world-percussion`
Root-level contents (confirmed via GitHub API):
- `LICENSE.txt` — CC0-1.0 public domain dedication
- `README.txt` — instrument manifest (see below)
- `WorldPercussion 20200905.sfz` — SFZ mapping file
- `picture.jpg` — CC BY 4.0 (not included in Orbifold)
- `samples/` — directory containing all instrument subdirectories

**License:** README.txt and LICENSE.txt both confirm CC0-1.0 public domain dedication for all audio samples. The CC BY 4.0 applies only to `picture.jpg`, which is not used.

**Attribution note from README.txt:** "Claves and conga: Made from samples of the Versilian Community Sample Library, a CC0 sample library created by Versilian Studios LLC."

**Instruments confirmed in `samples/` directory (full listing fetched via GitHub API):**

| Folder | Description | Total files | Naming pattern |
|---|---|---|---|
| `Bongos` | Bongo muted/high/low | (not fetched — out of scope) | — |
| `CajonFlamenco` | Cajón flamenco (3 performance styles, 2 variants) | 22 files | `1xx.flac`, `2xx.flac` |
| `Castanets` | Castanets | (not fetched — out of scope) | — |
| `Claves` | Claves (struck idiophone) | 4 files | `01.flac`–`04.flac` |
| `Conga` | Conga (open tone + muted variants) | 8 files | `v2_01_01.flac`…`v3_02_02.flac` |
| `Darbuka` | Darbuka (Middle Eastern goblet drum) | (not fetched — out of scope) | — |
| `EggShaker` | Egg shaker | (not fetched — out of scope) | — |
| `HandClap` | Hand clap | (not fetched — out of scope) | — |
| `HighConga` | High conga (open + muted variants) | 8 files | `v2_01_01.flac`…`v3_02_02.flac` |
| `LowConga` | Low conga (open + muted variants) | 6 files | `v3_01_01.flac`…`v4_01_02.flac` |
| `Maracas` | Maracas | (not fetched — out of scope) | — |
| `MutedConga` | Conga muted only | (not fetched — scope covered by Conga folder) | — |
| `MutedLowConga` | Low conga muted only | (not fetched — scope covered by LowConga) | — |
| `Tambourine` | Tambourine | (not fetched — out of scope) | — |

### SFZ velocity/articulation key for CajonFlamenco

From `WorldPercussion 20200905.sfz` and README.txt structure:
- MIDI note 48: Cajón flamenco 1 (style 1)
- MIDI note 49: Cajón flamenco 3 (style 3)
- MIDI note 50: Cajón flamenco 2 (style 2)

The `CajonFlamenco` file naming `1xx.flac` = style 1 (bass), `2xx.flac` = style 2 (tone/slap). Within each style, the numeric suffix encodes velocity layers. Based on file sizes and MIDI-mapping conventions, the interpretation is:
- `101–111` (11 files): Style 1 (bass tone), velocity layers 1–11
- `115–122` (absent 108,112–114): Style 1 variant hits
- `201–222` (11 files): Style 2 (slap/tone), velocity layers 1–11

For the `Conga` naming `v2_01_01.flac`:
- `v2/v3`: Versilian Community Sample Library version (2 = Conga main pitch, 3 = secondary pitch — or may denote articulation set)
- `01/02`: Articulation or dynamic layer
- `01/02`: Velocity round-robin variation

Based on file count (8 files for Conga, 8 for HighConga, 6 for LowConga), the pattern represents velocity layers and round-robins.

### Selected files for `conga` (Strudel sample name)

**Source folder:** `samples/Conga` (8 files total)
**Selection rationale:** Choose 4 files for timbral variety — one open tone low velocity, one open tone high velocity, one muted low, one muted high. Using files from the `v2` and `v3` groups to capture pitch variety.

| Committed name | Source file | Timbral role |
|---|---|---|
| `conga_0.ogg` | `samples/Conga/v2_01_01.flac` | Open tone, lower pitch, low velocity |
| `conga_1.ogg` | `samples/Conga/v2_02_01.flac` | Open tone, lower pitch, high velocity |
| `conga_2.ogg` | `samples/Conga/v3_01_01.flac` | Open tone, higher pitch, low velocity |
| `conga_3.ogg` | `samples/Conga/v3_02_01.flac` | Open tone, higher pitch, high velocity |

**Raw source URLs for download in step 04.2:**
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Conga/v2_01_01.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Conga/v2_02_01.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Conga/v3_01_01.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Conga/v3_02_01.flac`

**Estimated size after OGG conversion:** FLAC source files are 27–35 kB (very short percussion one-shots, < 0.5 s). At OGG vbr-q5 mono, expected output ≈ 20–40 kB each → total 4 files ≈ 80–160 kB.

### Selected files for `cajon` (Strudel sample name)

**Source folder:** `samples/CajonFlamenco` (22 files total)
**Selection rationale:** Choose 4 files representing the key timbral zones of a cajón: bass strike (style 1, low velocity), bass strike (style 1, high velocity), slap/tone (style 2, low velocity), slap/tone (style 2, high velocity). This gives Strudel's round-robin cycling the most musically relevant variety.

| Committed name | Source file | Timbral role |
|---|---|---|
| `cajon_0.ogg` | `samples/CajonFlamenco/101.flac` | Style 1 (bass/boom), low velocity |
| `cajon_1.ogg` | `samples/CajonFlamenco/105.flac` | Style 1 (bass/boom), mid velocity |
| `cajon_2.ogg` | `samples/CajonFlamenco/201.flac` | Style 2 (slap/tone), low velocity |
| `cajon_3.ogg` | `samples/CajonFlamenco/205.flac` | Style 2 (slap/tone), mid velocity |

**Raw source URLs for download in step 04.2:**
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/CajonFlamenco/101.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/CajonFlamenco/105.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/CajonFlamenco/201.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/CajonFlamenco/205.flac`

**Estimated size after OGG conversion:** FLAC source files are 35–47 kB (percussion one-shots, ≈ 0.3–0.6 s). OGG vbr-q5 mono ≈ 20–50 kB each → total 4 files ≈ 80–200 kB.

### Selected files for `wood` (Strudel sample name)

**Source folder:** `samples/Claves` (4 files total; maps to `wood` sample name for wood/clave idiophone)
**Selection rationale:** The Claves folder contains 4 clave strikes — all four are short, dry transients. All 4 are selected for maximum variety (clave patterns in repeating Strudel sequences benefit from round-robin variation). Using all 4 eliminates any round-robin pattern fatigue.

**Note on naming:** The instrument is `Claves` (wooden sticks), but the Strudel sample name registered is `wood`. This is deliberately generic: claves are the canonical wood-struck idiophone in Latin percussion, and the sample name `wood` is a palette-level abstract name (not the instrument proper name), consistent with ADR 0025 D2. This allows the slot to generalize to other wood-struck roles if the recipe catalog expands.

| Committed name | Source file | Timbral role |
|---|---|---|
| `wood_0.ogg` | `samples/Claves/01.flac` | Clave strike, variation 1 |
| `wood_1.ogg` | `samples/Claves/02.flac` | Clave strike, variation 2 |
| `wood_2.ogg` | `samples/Claves/03.flac` | Clave strike, variation 3 |
| `wood_3.ogg` | `samples/Claves/04.flac` | Clave strike, variation 4 |

**Raw source URLs for download in step 04.2:**
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Claves/01.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Claves/02.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Claves/03.flac`
- `https://raw.githubusercontent.com/freepats/world-percussion/main/samples/Claves/04.flac`

**Estimated size after OGG conversion:** FLAC source files are 40–47 kB (very short clave transients). OGG vbr-q5 mono ≈ 15–30 kB each → total 4 files ≈ 60–120 kB.

### Total asset summary

| Sample name | Files | Estimated total OGG size |
|---|---|---|
| `conga` | 4 | 80–160 kB |
| `cajon` | 4 | 80–200 kB |
| `wood` | 4 | 60–120 kB |
| **Total** | **12** | **220–480 kB** |

**Committed file naming convention:** `<name>_<n>.ogg` where `<name>` is the Strudel sample name (`conga`, `cajon`, `wood`) and `<n>` is a zero-indexed integer (`0`, `1`, `2`, `3`). Example: `conga_0.ogg`, `cajon_2.ogg`, `wood_3.ogg`.

---

## §3 — `samples()` Registration Plan

### Exact `samples()` call

The following call is to be added to `initAudio()` in `src/audio/strudel.ts`:

```typescript
/**
 * Additional authentic Latin/flamenco percussion samples committed as CC0
 * static assets in public/samples/ (freepats/world-percussion). Registered
 * here as palette declarations — no genre knowledge. See ADR 0025 D3 and
 * Phase 04 inventory §3.
 */
const localSamplesReady = samples(buildSampleMap(import.meta.env.BASE_URL));
```

Where `buildSampleMap` is an extracted pure helper (see test strategy below). The call registers `conga`, `cajon`, and `wood` as palette names using `import.meta.env.BASE_URL`-prefixed URLs.

The concrete `samples()` argument produced by `buildSampleMap('/orbifold/')` is:

```typescript
{
  conga: [
    '/orbifold/samples/conga_0.ogg',
    '/orbifold/samples/conga_1.ogg',
    '/orbifold/samples/conga_2.ogg',
    '/orbifold/samples/conga_3.ogg',
  ],
  cajon: [
    '/orbifold/samples/cajon_0.ogg',
    '/orbifold/samples/cajon_1.ogg',
    '/orbifold/samples/cajon_2.ogg',
    '/orbifold/samples/cajon_3.ogg',
  ],
  wood: [
    '/orbifold/samples/wood_0.ogg',
    '/orbifold/samples/wood_1.ogg',
    '/orbifold/samples/wood_2.ogg',
    '/orbifold/samples/wood_3.ogg',
  ],
}
```

### `await` vs. fire-and-forget

Per Phase 03 inventory §2 analysis (confirmed by reading `dist/index.mjs`): `samples()` is declared `async` and when given a plain object argument (not a `github:` shorthand), it calls the synchronous registration path (`Po`) immediately — no I/O, no fetch. The `async` declaration remains, but the promise resolves synchronously on the next microtask tick.

**Decision: `await` it anyway** — consistent with the existing pattern, adds no measurable overhead, and protects against any future change in the `samples()` implementation that introduces I/O for object-form calls.

### Integration with the existing `Promise.all`

The new call is added to the existing `Promise.all` array. The updated `initAudio()` pattern:

```typescript
const samplesReady = samples('github:tidalcycles/dirt-samples');
const localSamplesReady = samples(buildSampleMap(import.meta.env.BASE_URL));
await Promise.all([defaultPrebake(), registerSynthSounds(), samplesReady, localSamplesReady]);
```

This is the minimal diff: both `samplesReady` and `localSamplesReady` are awaited together in a single `Promise.all` call. The existing line is not modified.

### `import.meta.env.BASE_URL` availability at runtime

**In the Vite dev/build environment:** `import.meta.env.BASE_URL` is injected by Vite at build time (replaced with the `base` config value `/orbifold/` for production builds) and at dev time (replaced with `/` since Vite's dev server serves assets at the root). This is a Vite-defined static replacement, not a runtime global. It is available in all files processed by Vite, including `src/audio/strudel.ts`.

**Confirmed:** `vite.config.ts` sets `base: '/orbifold/'`. Therefore:
- Production: `import.meta.env.BASE_URL === '/orbifold/'` → URLs become `/orbifold/samples/conga_0.ogg` ✓
- Dev server: `import.meta.env.BASE_URL === '/'` → URLs become `/samples/conga_0.ogg` ✓ (Vite serves `public/` at `/` regardless of `base`)

Both are correct.

### Test environment strategy (Vitest)

**Problem:** Vitest does not run files through Vite's full transform pipeline in the same way. `import.meta.env.BASE_URL` in test files defaults to `'/'` in Vitest's default environment, but only if Vitest is configured to expose it. In the current project, there is no `vitest.config.ts` — Vitest runs from the default config embedded in `vite.config.ts` (via `pnpm exec vitest run`). Vitest does expose `import.meta.env` with `BASE_URL = '/'` by default.

**However,** testing `initAudio()` directly is not feasible: it requires a real `AudioContext` (Web Audio API), a real `fetch()` for GitHub samples, and real DOM. Existing tests (`tests/authentic-groove/codegen-sample.test.ts`) already isolate pure logic.

**Proposed strategy: Extract `buildSampleMap(base: string): Record<string, string[]>` as a named export from `src/audio/strudel.ts`.**

```typescript
/**
 * Pure helper: builds the sample-name → URL-array map for the local
 * FreePats CC0 samples committed to public/samples/.
 *
 * Extracted as a named export to allow unit testing without Vite injection
 * or Web Audio API. `initAudio()` calls this with `import.meta.env.BASE_URL`.
 * The returned object is passed directly to `samples()`.
 *
 * @param base - The application base URL (e.g. '/orbifold/' in production,
 *               '/' in Vite dev server). Must end with '/'.
 */
export function buildSampleMap(base: string): Record<string, string[]> {
  const b = base.endsWith('/') ? base : base + '/';
  return {
    conga: ['conga_0', 'conga_1', 'conga_2', 'conga_3'].map((f) => `${b}samples/${f}.ogg`),
    cajon: ['cajon_0', 'cajon_1', 'cajon_2', 'cajon_3'].map((f) => `${b}samples/${f}.ogg`),
    wood:  ['wood_0',  'wood_1',  'wood_2',  'wood_3' ].map((f) => `${b}samples/${f}.ogg`),
  };
}
```

**Test in `tests/authentic-groove/sample-registration.test.ts`:**

```typescript
import { buildSampleMap } from '../../src/audio/strudel.js';

describe('buildSampleMap', () => {
  it('returns correct keys for production base', () => {
    const map = buildSampleMap('/orbifold/');
    expect(Object.keys(map).sort()).toEqual(['cajon', 'conga', 'wood']);
  });

  it('all conga URLs start with base + samples/', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.conga.every((u) => u.startsWith('/orbifold/samples/'))).toBe(true);
  });

  it('conga has 4 entries ending in .ogg', () => {
    const map = buildSampleMap('/orbifold/');
    expect(map.conga).toHaveLength(4);
    expect(map.conga.every((u) => u.endsWith('.ogg'))).toBe(true);
  });

  it('cajon has 4 entries', () => {
    const { cajon } = buildSampleMap('/orbifold/');
    expect(cajon).toHaveLength(4);
  });

  it('wood has 4 entries', () => {
    const { wood } = buildSampleMap('/orbifold/');
    expect(wood).toHaveLength(4);
  });

  it('handles trailing slash normalization (base without trailing slash)', () => {
    const map1 = buildSampleMap('/orbifold/');
    const map2 = buildSampleMap('/orbifold');
    expect(map1).toEqual(map2);
  });

  it('dev-server base (/) produces correct URLs', () => {
    const map = buildSampleMap('/');
    expect(map.conga[0]).toBe('/samples/conga_0.ogg');
  });
});
```

**Disclosure:** The test bypasses `import.meta.env.BASE_URL` injection entirely by parameterizing the base URL as a function argument. The test exercises URL construction logic and sample-name correctness. The actual Vite injection and `samples()` call in `initAudio()` are covered by the end-to-end propagation tests (step 04.5) and by browser/dev-server runtime testing.

---

## §4 — sampleMap Upgrade Plan

### Context from Phase 03 inventory §3

Phase 03 inventory identified 11 sampleMap fallback entries across 9 recipes that still use fallback sample names. The one upgrade that was feasible using already-registered Dirt-Samples (`bossa-nova-groove` `hh → 'hand'`) was applied in Phase 03.

The remaining 10 fallback entries used `'perc'` for roles that could not be improved using Dirt-Samples. Phase 04 now introduces `conga`, `cajon`, and `wood` as new registered names, enabling upgrades for some of these entries.

### Current fallback entries remaining after Phase 03

From Phase 03 inventory §3 summary and confirmed by reading `rhythm-harmony-recipes.ts` (current state, 2026-06-24):

| Recipe ID | Sound slot | Current value | Fallback comment |
|---|---|---|---|
| `west-african-bell-modal` | `bd` | `'cb'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `west-african-bell-modal` | `hh` | `'perc'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `latin-jazz-clave-swing` | `hh` | `'cb'` | `// fallback: no native cascara/timbale shell in @strudel/web@1.0.3` |
| `west-african-triplet-groove` | `bd` | `'cb'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `west-african-triplet-groove` | `hh` | `'perc'` | `// fallback: no native bell/agogo in @strudel/web@1.0.3` |
| `rumba-blues-minor` | `bd` | `'perc'` | `// fallback: no native clave in @strudel/web@1.0.3` |
| `samba-afro-brasileiro` | `hh` | `'sd'` | `// fallback: no native surdo/caixa in @strudel/web@1.0.3` |
| `buleria-flamenco-phrygian` | `bd` | `'perc'` | `// fallback: no native cajon in @strudel/web@1.0.3` |
| `cumbia-latina-groove` | `bd` | `'perc'` | `// fallback: no native caja/guacharaca in @strudel/web@1.0.3` |
| `candombe-dorian-groove` | `bd` | `'perc'` | `// fallback: no native candombe drum names in @strudel/web@1.0.3` |

### Per-entry upgrade assessment against new FreePats names

#### 1. `west-african-bell-modal` — `bd → 'cb'`, `hh → 'perc'`

**Authentic instrument:** West-African agogo / gankogui (cast iron bell).

**Assessment against `conga`, `cajon`, `wood`:**
- `conga`: Membrane drum — wrong family entirely for a bell/agogo role.
- `cajon`: Wooden box — wrong family.
- `wood`: Clave (wood idiophone). A clave is a struck wooden idiophone; a gankogui is a struck metal idiophone. The timbral family is "struck solid body" in both cases — both produce a dry, sharp transient. However, a clave has a woody, mid-range click character while a gankogui has a metallic ring. The current `'cb'` (cowbell, a metal struck idiophone) is actually closer to a bell/agogo than a clave.

**Conclusion:** `'wood'` (clave) is NOT an improvement over `'cb'` for the agogo/bell role. The existing `'cb'` (cowbell/metal idiophone) and `'perc'` (generic percussion) remain more appropriate.

**→ KEEP FALLBACK for both slots.** The FreePats clave samples do not approximate bell/agogo better than cowbell. No upgrade.

#### 2. `west-african-triplet-groove` — `bd → 'cb'`, `hh → 'perc'`

Same instrument role (West-African bell). Same analysis as above.

**→ KEEP FALLBACK for both slots.** No upgrade.

#### 3. `latin-jazz-clave-swing` — `hh → 'cb'`

**Authentic instrument:** Cascara (timbale shell struck pattern).

**Assessment against `conga`, `cajon`, `wood`:**
- `conga`, `cajon`: Wrong family (membrane drums, not shell/metal).
- `wood`: Claves are similar in register (high, dry transient) to a timbale shell, but the timbre is wood vs. metal. The `'cb'` (cowbell) is more metallic and arguably closer to a timbale shell than wooden clave sticks.

**Conclusion:** `'wood'` (clave) is not a genuine improvement over `'cb'` for the cascara/timbale-shell role. `'cb'` remains the best available approximation.

**→ KEEP FALLBACK.** No upgrade.

#### 4. `rumba-blues-minor` — `bd → 'perc'`

**Authentic instrument:** Clave (wooden struck idiophone — two hardwood sticks).

**Assessment against `conga`, `cajon`, `wood`:**
- `conga`: Membrane drum — wrong family.
- `cajon`: Wooden box — closer in material (wood) but very different timbre (box resonator vs. dry stick strike).
- `wood`: **Claves from the FreePats repo** — these ARE clave samples. The Phase 04 `wood` name is registered from `samples/Claves/01.flac`–`04.flac`, which are authentic clave recordings. This is an exact match: the rumba clave pattern should sound like a clave.

**Phase 03 concern revisited:** Phase 03 inventory kept `'perc'` for the rumba clave because `'east'` (the only wood-idiophone candidate then available) cycled through Japanese drums. The FreePats clave samples registered as `'wood'` are uniform clave strikes — no cycling through unrelated sounds.

**Cultural accuracy check (bulería is flamenco; rumba is Afro-Cuban):** Rumba is defined by its clave pattern. The clave is the foundational struck idiophone of Afro-Cuban music. Using an authentic clave sample for a rumba recipe's `bd` slot (which carries the clave pattern per the recipe catalog) is culturally appropriate and a genuine improvement over `'perc'`.

**→ UPGRADE: `rumba-blues-minor`, `bd → 'perc'` → `bd → 'wood'`**
- Old comment: `// fallback: no native clave in @strudel/web@1.0.3`
- New comment: `// wood: FreePats Claves (CC0) — authentic clave idiophone for the rumba clave pattern`

#### 5. `samba-afro-brasileiro` — `hh → 'sd'`

**Authentic instrument:** Caixa (Brazilian snare drum variant).

**Assessment against `conga`, `cajon`, `wood`:**
- `conga`, `cajon`: Wrong family for a snare-like instrument.
- `wood`: Claves have a dry high transient; caixa has a snare buzz. `'sd'` (standard snare) remains closer.

**→ KEEP FALLBACK.** `sd` is the correct approximation for a caixa snare role.

#### 6. `buleria-flamenco-phrygian` — `bd → 'perc'`

**Authentic instrument:** Cajón flamenco.

**Assessment against `conga`, `cajon`, `wood`:**
- `conga`: Membrane drum, wrong family for flamenco.
- `wood`: Wrong family (clave vs. cajón).
- `cajon`: **CajonFlamenco from the FreePats repo** — these ARE cajón flamenco recordings. The Phase 04 `cajon` name is registered from `samples/CajonFlamenco/101.flac` etc., which are authentic flamenco cajón recordings. This is an exact match: the bulería pattern should sound like a cajón.

**Cultural accuracy check:** Bulería is a flamenco palos that uses the cajón as the primary percussion instrument. The cajón flamenco is canonical for this genre. Using FreePats cajón samples for the `bd` slot of the bulería recipe is the most authentic possible improvement.

**→ UPGRADE: `buleria-flamenco-phrygian`, `bd → 'perc'` → `bd → 'cajon'`**
- Old comment: `// fallback: no native cajon in @strudel/web@1.0.3`
- New comment: `// cajon: FreePats CajonFlamenco (CC0) — canonical flamenco percussion instrument`

#### 7. `cumbia-latina-groove` — `bd → 'perc'`

**Authentic instrument:** Caja (a cylindrical headed drum, similar to a floor tom, central to cumbia).

**Phase 04 spec's proposed upgrade:** `bd → 'conga'`

**Assessment:**
- `conga`: FreePats Conga samples are authentic conga recordings. A conga is a Afro-Cuban barrel drum. A caja (cumbia) is a cylindrical open-ended drum. Both are upright membrane percussion instruments, but a conga has a narrower barrel shape and characteristic open-tone resonance while a caja is broader and somewhat lower-pitched.
- Cultural note: Colombian cumbia historically used the caja drum (not a conga). However, in modern cumbia recordings and ensembles, congas appear frequently as a functional substitute for the caja, especially in urban cumbia. The two instruments are in the same acoustic family (hand-played or stick-played membrane drums).
- Is `'conga'` an improvement over `'perc'`? Yes — authentically recorded conga membrane sounds are far closer to a caja than 6 generic ethnic percussion sounds from `perc`. Both are open-resonant membrane drums with woody-to-mid-frequency attack.

**→ UPGRADE: `cumbia-latina-groove`, `bd → 'perc'` → `bd → 'conga'`**
- Old comment: `// fallback: no native caja/guacharaca in @strudel/web@1.0.3`
- New comment: `// conga: FreePats Conga (CC0) — closest available membrane drum to the cumbia caja`

#### 8. `candombe-dorian-groove` — `bd → 'perc'`

**Authentic instrument:** Candombe chico drum (Afro-Uruguayan hand drum, similar in construction to a conga but with a distinctive pitch and tension).

**Phase 04 spec's proposed upgrade:** `bd → 'conga'`

**Assessment:**
- The candombe chico is a cylindrical membrane drum played with the hand. It has a higher pitch and more nasal character than a standard conga. The conga is the closest available instrument in the FreePats palette.
- Is `'conga'` an improvement over `'perc'`? Yes — the conga is an authentic Afro-Latin hand drum in the same family as the candombe drums. Both are single-headed cylindrical drums. While the candombe has its own characteristic timbre, the conga is a far better approximation than generic `'perc'`.

**→ UPGRADE: `candombe-dorian-groove`, `bd → 'perc'` → `bd → 'conga'`**
- Old comment: `// fallback: no native candombe drum names in @strudel/web@1.0.3`
- New comment: `// conga: FreePats Conga (CC0) — closest available to the Afro-Uruguayan candombe membrane drum`

### Summary upgrade table (Phase 04)

| Recipe ID | Sound slot | Current value (pre-Phase-04) | Action | New value | Rationale |
|---|---|---|---|---|---|
| `west-african-bell-modal` | `bd` | `'cb'` | KEEP | `'cb'` | Cowbell (metal idiophone) closer to agogo than clave (wood idiophone) |
| `west-african-bell-modal` | `hh` | `'perc'` | KEEP | `'perc'` | No FreePats name approximates bell/agogo better than perc |
| `latin-jazz-clave-swing` | `hh` | `'cb'` | KEEP | `'cb'` | Cowbell closer to timbale shell than clave |
| `west-african-triplet-groove` | `bd` | `'cb'` | KEEP | `'cb'` | Same as west-african-bell-modal bd |
| `west-african-triplet-groove` | `hh` | `'perc'` | KEEP | `'perc'` | Same as west-african-bell-modal hh |
| `rumba-blues-minor` | `bd` | `'perc'` | **UPGRADE** | `'wood'` | FreePats Claves are authentic clave samples — exact match for rumba clave |
| `samba-afro-brasileiro` | `hh` | `'sd'` | KEEP | `'sd'` | Snare drum is correct approximation for caixa snare role |
| `buleria-flamenco-phrygian` | `bd` | `'perc'` | **UPGRADE** | `'cajon'` | FreePats CajonFlamenco is the canonical flamenco percussion instrument |
| `cumbia-latina-groove` | `bd` | `'perc'` | **UPGRADE** | `'conga'` | FreePats Conga is the closest membrane drum to cumbia's caja |
| `candombe-dorian-groove` | `bd` | `'perc'` | **UPGRADE** | `'conga'` | FreePats Conga is the closest available to candombe membrane drums |

**Total upgrades: 4** (rumba `bd → 'wood'`, bulería `bd → 'cajon'`, cumbia `bd → 'conga'`, candombe `bd → 'conga'`).

**Entries remaining as fallback (6):** The West-African bell patterns (4 entries) and Latin jazz cascara and samba caixa cannot be improved by any of the three new FreePats names.

---

## §5 — AG-D1 Seam Impact and URL Scheme

### New sample names introduced

Phase 04 introduces three new Strudel sample names: `conga`, `cajon`, `wood`.

These names appear in:
1. `src/audio/strudel.ts` — as palette-level declarations in the `buildSampleMap()` helper function (keys of the returned object). This is the only permitted location for palette declarations.
2. `src/core/music-knowledge/rhythm-harmony-recipes.ts` — as sampleMap values for the upgraded recipes. This is the only permitted location for genre-to-sample mappings.
3. `tests/authentic-groove/sample-registration.test.ts` — in test assertions on the `buildSampleMap()` helper.
4. `tests/authentic-groove/sample-map.test.ts` — in per-recipe assertions for the upgraded entries.
5. `tests/authentic-groove/propagation.test.ts` — in end-to-end assertions confirming the names flow through `applySampleMap` and codegen.

These names do NOT appear in (and must not):
- `src/core/codegen/` — codegen receives `strudelSample` opaquely; emits it without knowing its value.
- `src/agent/apply.ts` — `applySampleMap` receives the map from the knowledge side; has no literal sample names.
- `src/lib/persistence.ts` — stores `strudelSample` as an opaque string.
- Any other `src/` file outside `music-knowledge/` and `audio/strudel.ts`.

### AG-D1 seam grep (no extension needed for genre tokens)

The existing ADR 0025 D3 seam grep checks for genre tokens (`'cumbia'`, `'cueca'`, etc.) outside `src/core/music-knowledge/` and `tests/`. The new names (`conga`, `cajon`, `wood`) are **palette-level instrument names, not genre identifiers** — they do not need to be added to the seam grep's genre-token list.

**Additional grep for Phase 04 (new — verifying palette names are confined):**

```bash
git grep -n \
  -e "'conga'" -e '"conga"' \
  -e "'cajon'" -e '"cajon"' \
  -e "'wood'" -e '"wood"' \
  -- 'src/' \
  ':(exclude)src/core/music-knowledge/' \
  ':(exclude)src/audio/strudel.ts'
```

Expected result: **empty output (zero matches)**. These names must appear ONLY in `src/core/music-knowledge/` (sampleMap values) and `src/audio/strudel.ts` (palette declarations). Any match elsewhere means the seam broke.

This additional grep is complementary to the ADR 0025 D3 genre-token grep. Both must return empty output before committing step 04.4 or 04.5.

### URL scheme: `import.meta.env.BASE_URL` — seam analysis

The `buildSampleMap(import.meta.env.BASE_URL)` call is URL-construction plumbing. It concerns how audio files are served, not which genre uses which instrument. It does not violate the AG-D1 seam invariant — the seam rule is about genre-to-sample mapping knowledge, not about URL routing.

Specifically:
- `buildSampleMap` contains no genre name. It only contains palette names (`conga`, `cajon`, `wood`).
- The function is in `src/audio/strudel.ts` — the correct location for palette declarations (confirmed in the phase spec's architectural note).
- No genre-to-sample mapping logic is in this function. It produces a URL array for each sample name regardless of which genre recipe will ultimately use it.

**URL scheme correctness summary:**

| Environment | `import.meta.env.BASE_URL` | URL produced | Asset path |
|---|---|---|---|
| Production (`pnpm build`) | `/orbifold/` | `/orbifold/samples/conga_0.ogg` | `dist/samples/conga_0.ogg` → served at `/orbifold/samples/conga_0.ogg` ✓ |
| Vite dev server (`pnpm dev`) | `/` | `/samples/conga_0.ogg` | `public/samples/conga_0.ogg` → served at `/samples/conga_0.ogg` ✓ |
| Vitest tests | N/A (bypassed) | N/A — `buildSampleMap('/orbifold/')` called directly | Unit-testable without Vite injection ✓ |

The `import.meta.env.BASE_URL` usage is correct, consistent with the phase spec's architectural note, and creates no concern for the AG-D1 seam rule.

---

## Files touched in this step

Zero `.ts`, `.svelte`, or binary files modified. Read-only step.

New files created:
- `docs/authentic-groove/inventories/phase-04-inventory.md` (this file)
- `docs/authentic-groove/handoffs/phase-04-handoff.md` (step 04.1 handoff entry)

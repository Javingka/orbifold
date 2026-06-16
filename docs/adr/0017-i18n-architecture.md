<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# ADR 0017 — App internationalization architecture (ES / EN / PT / ZH)

- **Status:** Accepted
- **Date:** 2026-06-16
- **Initiative / Phase:** orbifold-v2 / Phase 11 (step 11.2)
- **Deciders:** Pilot (Javier); OQ-1–OQ-6 resolved at scoping 2026-06-16; OQ-7 resolved at Checkpoint #1 after inventory review.

## Context

The Orbifold app carries all user-facing text as Spanish string literals spread across 14 source files (11 Svelte components, `session.ts`, `agent.ts`). The marketing pages (`public/landing.html`, `public/tutorial.html`) shipped i18n in commit `068817e` using `localStorage['orbifold.lang']` with four language codes (`es`/`en`/`pt`/`zh`) and a specific resolution chain. The app must join this contract so:

- a language selected on the landing page persists into the app with no extra user action,
- switching language in the app updates all text live, and
- adding a future language requires one new dictionary, not edits to components.

The Phase 11 inventory (step 11.1) catalogued **161 distinct translatable strings** across all source files, identified 11 interpolated strings, defined the verbatim token boundary per OQ-6, and surfaced one additional decision (OQ-7) on how the "what is playing" indicator state interacts with i18n.

This ADR records the eight architectural decisions that govern the implementation (steps 11.3–11.7).

---

## Decisions

### D1 — Language store and `$t` access API

A **`lang` Svelte `writable` store** of type `LangCode` (`'es' | 'en' | 'pt' | 'zh'`) lives in `src/i18n/index.ts`. A **`t` Svelte `derived` store** is derived from `lang`, returning a lookup function with the signature:

```typescript
type TFunction = (key: string, vars?: Record<string, string | number>) => string;
```

Components access the current translation function as **`$t`** using Svelte's auto-subscription syntax:

```svelte
<script>
  import { t } from '../i18n/index.js';
</script>

<span>{$t('header.tagline')}</span>
<button title={$t('transport.rhythmPlayTitle')}>{$t('transport.rhythmPlay')}</button>
```

This is consistent with ADR 0004 (`src/state/` and `src/i18n/` are both permitted to import `svelte/store`; only `src/core/**` must remain free of DOM/PIXI/Svelte imports).

The `lang` store and the `t` derived store are both exported from `src/i18n/index.ts`. There is no prop-drilling: each component that needs translation imports `{ t }` directly from the i18n module. The `lang` store is also exported for the header selector and for any subscriber that needs the raw code (e.g., the agent language directive injection).

**Pure helpers separation:** The resolution chain, fallback lookup, and interpolation logic live in `src/i18n/runtime.ts` as plain TypeScript functions with no DOM or Svelte dependency. They are importable from a Node test environment (Vitest) without a DOM. The Svelte store wrapper in `src/i18n/index.ts` calls these pure helpers. This satisfies A-11-10.

### D2 — Dictionary format, location, and key convention

Dictionaries are **typed TypeScript modules** (not JSON) under:

```
src/i18n/locales/es.ts   ← base / source-of-truth
src/i18n/locales/en.ts
src/i18n/locales/pt.ts
src/i18n/locales/zh.ts
```

All four modules export a default object that satisfies a shared **`Dictionary` type** exported from `src/i18n/types.ts`. The `Dictionary` type is a deeply nested object whose structure mirrors the key namespace, and all leaf values are `string`. Because all four dictionaries assert `satisfies Dictionary`, TypeScript flags any missing or extra key at compile time in the dictionary file itself, not at call sites.

**Key namespacing convention (per OQ-3):** keys are nested by component/domain, with a `common` group for shared labels:

```
header.tagline               Header.svelte brand tagline
header.nav.harmony           Primary nav tab
transport.rhythmPlay         Transport play button label
transport.rhythmPlayTitle    Transport play button tooltip
latency.label                LatencyCalibration compact label
legend.tonic                 Legend tonic label
strip.label                  ProgressionStrip/Chips shared label
agent.tabLabel               AgentPanel tab button
agent.quick.groovePrompt     Quick-prompt text sent to agent
persistence.saveBtn          PersistencePanel save button
composition.trackLabel       CompositionDrawer track label (interpolated)
code.heading                 CodeDrawer title
session.playing.rhythm       nowPlaying indicator key (see D8)
common.*                     (reserved for future shared labels)
```

The `es` dictionary is the canonical source of truth. Its key set defines the complete `Dictionary` type. A key-parity test in `tests/i18n/key-parity.test.ts` confirms that `en`, `pt`, and `zh` export dictionaries with the **exact same key set** as `es` — no missing keys, no extra keys. This test fails the build if a new key is added to `es` without adding it to all other dictionaries, satisfying A-11-09.

**Rich-text boundary:** The marketing pages use a `rich()` token-array mechanism for styled inline text. The app dictionaries use plain strings only; any inline styling within a translated string is handled by the consuming component's own markup (e.g., a Svelte `{#if}` or wrapping `<em>`). Dictionary values are never HTML.

### D3 — Language resolution chain and the `orbifold.lang` contract

The `lang` store initializes (at module import time, before any component renders) using the following resolution chain, mirroring `public/landing.html` `pickLang` exactly:

```
1. ?lang=<code>          URL search parameter — if present AND recognized
2. localStorage['orbifold.lang']  — if set AND recognized
3. navigator.language    — prefix-match on two-letter code;
                           special case: any code starting with 'zh' → 'zh'
4. 'es'                  — default
```

"Recognized" means the code is one of `{ 'es', 'en', 'pt', 'zh' }`. An unrecognized value in localStorage does not prevent a `navigator.language` match (the chain falls through).

**Write-back on change:** When `lang.set(code)` is called, a store subscriber calls `localStorage.setItem('orbifold.lang', code)` so the marketing pages immediately honor the new choice. This is the same call the marketing selector makes (`localStorage.setItem(LS_KEY, code)` on line 664 of `landing.html`).

The `orbifold.lang` key string and the four code values (`es`/`en`/`pt`/`zh`) must match marketing **exactly**. This is an instance of the cross-surface contract recorded in the Decisions Register (Phase 11, 2026-06-16). The selector in the app header lists the four languages in the same order and with the same native labels as the marketing `LANGS` constant:

| Code | Native label |
|------|-------------|
| `es` | Español |
| `en` | English |
| `pt` | Português |
| `zh` | 中文 |

### D4 — Fallback semantics and key-parity enforcement

If the active dictionary is missing a key (which should not happen in production thanks to compile-time checks and the key-parity test, but could occur during development or if a future dictionary is incomplete), the `t` function falls back to the `es` base dictionary value. It **never** renders a raw key string or a blank.

The fallback chain inside `runtime.ts:lookup()`:

```
1. Look up the key in the active language's dictionary.
2. If found and non-empty → return it.
3. Otherwise → look up the key in the `es` dictionary.
4. If found → return it.
5. Otherwise → (development-only) log a warning and return the raw key
   so missing strings are visible during development.
```

The key-parity test (`tests/i18n/key-parity.test.ts`) enforces that step 5 is unreachable in production by failing the build whenever any non-base dictionary has a key set that differs from `es`. This satisfies A-11-05 and A-11-09.

### D5 — Interpolation mechanism and untranslatable-token boundary

**Interpolation syntax:** Dynamic values are injected using `{varName}` named placeholders in dictionary strings. The `t` function's second argument is an optional `Record<string, string | number>`:

```typescript
// Dictionary entry:
// 'composition.trackLabel': 'pista {N}'
// 'session.playing.preview': 'Vista previa · E({k},{n})'
// 'agent.languageDirective': 'Responde en {languageName}.'

$t('composition.trackLabel', { N: trackIndex + 1 })
// → 'pista 2'

$t('agent.languageDirective', { languageName: 'inglés' })
// → 'Responde en inglés.'
```

The `interpolate(template, vars)` pure function in `runtime.ts` replaces each `{varName}` token with the corresponding value. Unmatched placeholders are left as-is (defensive: no silent blank).

**Plural forms:** Strings requiring grammatical pluralization use a two-key approach rather than a single plural-rule function (which would vary too widely between languages). Example:

```typescript
// Dictionary:
// 'composition.trackSingular': '{count} pista'
// 'composition.trackPlural': '{count} pistas'

$t(count === 1 ? 'composition.trackSingular' : 'composition.trackPlural', { count })
```

This keeps the `TFunction` signature simple and avoids introducing a plural-rule library dependency.

**Untranslatable-token boundary (per OQ-6):** The following appear verbatim in all dictionaries — translators must not alter them:

- Strudel code strings and patterns (any content in backtick code blocks)
- Sample codes: `bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `lt`, `mt`, `ht`
- Euclidean notation: `E(k,n)` and specific instances like `E(3,8)`, `E(5,8)`
- Note and pitch literals: `C`, `C#`, `D`, etc.
- Transformation letters: `P·L·R`
- Triangle glyphs: `▲` (major), `▼` (minor)
- Brand and proper nouns: `Orbifold`, `Tonnetz`, `Pentagrama`, `Strudel`, `TidalCycles`
- The term `voice-leading` (music jargon)
- The placeholder `s("bd hh sd hh")` in CodeDrawer
- `API key` labels
- The `stack()` identifier

These tokens appear inside otherwise-translated strings (e.g., "E(k,n): k golpes distribuidos en n pasos" — `E(k,n)` stays, the description translates). Translators must treat `{…}` placeholders and all tokens in this list as untouchable.

### D6 — Schema isolation

Language is **UI-only ephemeral state**. It is stored in `localStorage['orbifold.lang']` and read by the `lang` store on app initialization. It does NOT appear in:

- `SessionState` (the in-memory runtime state in `src/state/session.ts`)
- `SavedSessionSchema` / `SavedHarmonySchema` / `SavedRhythmSchema` / `SavedCompositionSchema` in `src/lib/persistence.ts`
- `AgentOutputSchema` / `HarmonySpecSchema` / `RhythmSpecSchema` in `src/agent/schema.ts`

**Rationale:** A saved session must be language-neutral. When a session file is loaded, it should adopt the currently active UI language, not the language of whoever created it. Persisting language alongside session content would couple a UI preference to musical content, require a migration plan, and complicate the byte-identical saved-session guarantee. This mirrors the `registerMode` and `subview` ephemeral-state precedent (Phase 08 Decisions Register).

**Saved-session bytes unchanged:** Because language is absent from all persistence and agent schemas, a `SessionState` round-tripped through `serializeSession` / `deserializeSession` produces byte-identical output regardless of the active language. This satisfies A-11-11.

### D7 — Agent conversational language

The agent's `SYSTEM_PROMPT` (lines 75–119 of `src/agent/agent.ts`) is authored in Spanish and remains in Spanish in all language modes. A single maintained prompt avoids the cost of translating and maintaining four parallel system prompts (per OQ-1, Option A).

**Language directive injection:** A dynamic language directive is appended to each API call's user message so the agent replies in the active UI language. The directive is **not** added to `SYSTEM_PROMPT` itself (which is a stable constant); it is injected at the end of `buildContextAddendum()` in `agent.ts`:

```typescript
// Inside buildContextAddendum(), after existing context lines:
const languageName = LANGUAGE_NAMES[get(lang)];  // e.g. 'español', 'inglés', 'português', '中文'
addendum += `\n\n${t_raw('agent.languageDirective', { languageName })}`;
// → e.g. "Responde en inglés."
```

Where `LANGUAGE_NAMES` is a constant map:

```typescript
const LANGUAGE_NAMES: Record<LangCode, string> = {
  es: 'español',
  en: 'inglés',
  pt: 'português',
  zh: 'chino',
};
```

The same injection applies in `requestAutofix()` — the inline autofix prompt appends the same directive.

**Agent JSON/code output contract is unchanged:** The language directive requests conversational replies in the active language. The agent's structured JSON output (rhythm spec, harmony spec, Strudel code) is language-neutral by its schema and is not altered by the directive. A-11-08 requires this invariant.

**Note on `t_raw`:** `buildContextAddendum()` is not a Svelte component and cannot use the `$t` auto-subscription. It accesses the current translation via a `t_raw(key, vars)` helper exported from `src/i18n/index.ts` that calls `get(t)` (Svelte's `get()` for one-shot store reads) and immediately invokes the returned function. This helper is distinct from the `$t` component syntax.

### D8 — `setNowPlaying()` stores a translation key, not pre-translated text

`setNowPlaying()` in `src/state/session.ts` is called at transport action sites (play rhythm, play harmony, play session, preview orbit, etc.) to record "what is currently playing." The `NowPlaying` state is consumed by `Transport.svelte` to display the "sonando / silencio" indicator.

**Decision (resolved at Checkpoint #1, OQ-7):** `setNowPlaying()` stores a **translation key** (e.g., `'session.playing.rhythm'`), not a pre-translated label string. The `Transport.svelte` component resolves the key to display text via `$t` at render time.

**Consequences of this decision:**

1. `NowPlaying.label` (or the equivalent field in `SessionState`) changes type from `string | null` to `LangKey | null`, where `LangKey` is `string` (a key path into the Dictionary). In practice, the field remains a plain `string`; the convention that it holds a key path is enforced by code review, not a distinct branded type.

2. `Transport.svelte` renders: `{$t($session.nowPlaying.label ?? 'transport.nowPlaying.silencio')}`

3. Interpolated nowPlaying labels (e.g., `'session.playing.preview'` which requires `{k}` and `{n}`) require the call site to store both the key and the interpolation variables. `setNowPlaying()` is extended to accept an optional `vars` argument that `Transport.svelte` passes to `$t`:

   ```typescript
   setNowPlaying('session.playing.preview', { k: 3, n: 8 });
   // Transport renders: $t($session.nowPlaying.label, $session.nowPlaying.vars)
   ```

4. **Switching language while playing updates the indicator live** — because `Transport.svelte` resolves the key reactively via `$t`, any change to the `lang` store immediately re-renders the indicator in the new language. This is the primary motivation for this decision.

5. `session.ts` does NOT import from `src/i18n/` — the injection is the other way: `Transport.svelte` uses `$t` to render the stored key. This avoids a `state/ → i18n/` dependency direction that would be harder to test.

---

## Consequences

1. **`src/i18n/` is a new module layer** between `src/state/` (which produces keys) and `src/ui/` (which consumes translations). It depends on `svelte/store` (permitted by ADR 0004 precedent) but has no DOM dependency in its pure helpers (`runtime.ts`).

2. **161 string literals in 14 files are extracted** over steps 11.4–11.5. The extraction is purely additive at the component level (Spanish output is unchanged with language = `es`); audio/codegen behavior is byte-identical.

3. **The `t` derived store re-derives on every `lang` change.** All component text re-renders live on language switch. PIXI canvas labels (Tonnetz note names, chord glyphs in the staff) are [VERBATIM] technical tokens and do not participate in the i18n system.

4. **Key-parity test gates CI.** Any `pnpm test` run with a dictionary missing a key fails before deployment. Adding a new language is: add `src/i18n/locales/{code}.ts`, add the code to `LangCode`, add the native label to the selector `LANGS` constant — and the key-parity test confirms completeness.

5. **`setNowPlaying()` signature changes** (D8): the `label` field now carries a dictionary key rather than a display string. This is a localized change to `session.ts` and `Transport.svelte` only. No other session state fields are affected; the `SavedSchema` does not persist `nowPlaying` state.

6. **Agent behavior changes conversationally** but not structurally: replies in the active language; JSON/Strudel output contract unchanged. The `SYSTEM_PROMPT` remains a single Spanish-authored constant.

7. **Bundle size impact:** All four dictionaries (~161 strings × ~50 chars average ≈ 8 KB uncompressed) are included in the Vite bundle. Future optimization (dynamic import per language) is out of scope for Phase 11; the size is acceptable given the existing 1,071 kB bundle.

---

## Source references

- Marketing contract: `public/landing.html` lines 302 (`LANGS`), 647–660 (`pickLang`), 664 (write-back)
- Inventory: `docs/orbifold-v2/inventories/phase-11-inventory.md`
- ADR 0004 (Svelte store precedent): `docs/adr/0004-svelte-store-for-session-state.md`
- Decisions Register entry: `docs/orbifold-v2/decisions.md` — `orbifold.lang` cross-surface contract

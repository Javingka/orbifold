<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 11 — App internationalization (ES / EN / PT / ZH) with a single-source-of-truth dictionary

**Purpose:** Internationalize the live Svelte app so every user-facing string is served from per-language dictionaries selected by a reactive `lang` store that honors the same `orbifold.lang` localStorage contract the marketing pages already use, so the language chosen on `landing.html` / `tutorial.html` persists into the app and adding a future language means adding one dictionary, not editing components.

**Gate:** `main` at or after commit `068817e` (marketing i18n merged; `public/landing.html` and `public/tutorial.html` define `LS_KEY = 'orbifold.lang'`, `LANGS = [es, en, pt, zh]`, and a resolution chain `?lang=` → localStorage → `navigator.language` → `'es'`). Branch `orbifold-v2/phase-11` cut from `main`. Test/quality baseline recorded by step 11.1.

**Expected phase result:** The app renders entirely from language dictionaries. On load it resolves the active language using the same chain and key as the marketing pages, so a visitor who picked a language on the landing page enters the app already in that language. A language selector in the app header switches all visible text live and writes the choice back to `orbifold.lang` (so the marketing pages honor it too). Four languages (Español / English / Português / 中文) are complete. A missing key in any non-base dictionary falls back to the Spanish base text — never a raw key or a blank. The i18n runtime (resolution, fallback, interpolation) is pure and unit-tested; the language is UI-only ephemeral state and does NOT enter the persistence or agent Zod schemas (saved sessions stay byte-identical).

---

## Scoping notes — cut line and relationship to the deferred Phase 11 harmony work

Phase 10's file deferred note-level free placement (single-pitch `NoteSlot` model, pitch-drag, Tonnetz vertex→single note) "to Phase 11." The Pilot has redirected the next phase to app internationalization. This phase takes the i18n number (Phase 11); the deferred harmony note-level work shifts to a later phase. **Surfaced for Pilot confirmation** (see summary) — the Planner does not renumber prior commitments unilaterally.

The cut line for THIS phase: extract and route **existing** user-facing text through dictionaries; add the language store, selector, and the four translations; localize the agent's conversational language. Out of scope: any change to musical/audio behavior, codegen, the persistence schema, or the agent's JSON output contract. Untranslatable technical tokens (Strudel code, sample codes like `bd`/`sd`/`hh`, `E(k,n)`, note/pitch literals) stay verbatim per OQ-6.

---

## Invariants to maintain (non-negotiable)

- **`orbifold.lang` is a cross-surface contract.** The app must read AND write the exact key `orbifold.lang` with the exact language codes `es` / `en` / `pt` / `zh`, matching marketing. Divergence silently breaks the marketing→app handoff with no compile-time error (proposed Register entry — see summary).
- **Language is UI-only ephemeral state.** It lives in localStorage under `orbifold.lang`, NOT in `SessionState`, the `SavedSchema` (`src/lib/persistence.ts`), or any `src/agent/schema.ts` type. Saved-session bytes for identical content are unchanged by this phase (parallels the `registerMode`/`subview` ephemeral-state rule, Decisions Register Phase 08).
- **`core/**` stays pure** — no DOM/PIXI/Svelte imports. The i18n runtime lives in a new `src/i18n/**` (UI layer); its *pure* parts (resolution chain, fallback lookup, interpolation) are unit-testable without a DOM.
- **No `.fast`/`.slow`; no codegen changes.** This phase does not touch `src/core/codegen/strudel.ts` or the audio pipeline. Audio output for any `SessionState` is byte-identical before/after.
- **Single source of truth for keys.** Every dictionary exposes the same key set; a key-parity test fails the build if any language is missing or has extra keys relative to the `es` base.
- **AGPL-3.0 headers on all new and modified source files.**
- **`tsc --noEmit`, `pnpm lint`, `pnpm test` green at every step's gate.**

---

## Pilot decisions (resolved at scoping, 2026-06-16)

All open questions were resolved by the Pilot before step 11.1. These are binding for ADR 0017 (step 11.2). The step 11.1 inventory may add detail but does not reopen them.

- **OQ-1 → (A).** One maintained `SYSTEM_PROMPT` plus a dynamic language directive (`respond in {languageName}`) using the active `lang`; the agent's Strudel code / JSON output stays language-neutral.
- **OQ-2 → Yes.** The app's resolution chain includes `?lang=` first, matching marketing: `?lang=` → `localStorage['orbifold.lang']` → `navigator.language` (with `zh`-prefix special case) → `'es'`.
- **OQ-3 → Nested-by-component keys** (`header.tagline`, `transport.play`, `agent.placeholder`) plus a `common.*` group for shared labels.
- **OQ-4 → Typed TS modules** under `src/i18n/locales/{es,en,pt,zh}.ts`, sharing a `Dictionary` type so missing/extra keys fail at compile time; `es` is the base/source-of-truth.
- **OQ-5 → Header selector as a `文A` language-globe button** (the Wikipedia/Google-style glyph: a CJK character beside a Latin "A"). Clicking it opens the language menu listing the four native labels (Español / English / Português / 中文). Always visible in the header.
- **OQ-6 → Translate descriptive labels, keep technical tokens verbatim in all languages:** Strudel code, sample codes (`bd`/`sd`/`hh`/…), `E(k,n)`, note/pitch literals, and the transformation letters `P·L·R` are never translated.

## Open questions for Pilot (resolved above — kept for the record)

These shaped ADR 0017 (step 11.2). The Planner's recommendation is given; all were confirmed by the Pilot at scoping.

### OQ-1 — Agent conversational language
The agent's `SYSTEM_PROMPT` (`src/agent/agent.ts`) is Spanish (`Eres el co-compositor…`) and its chat replies are Spanish. Options:
- **(A)** Keep one maintained prompt and append a language directive (`Respond in {languageName}`) so chat follows the UI language; Strudel code output stays language-neutral.
- **(B)** Maintain a fully translated `SYSTEM_PROMPT` per language.
- **(C)** Leave the agent Spanish-only this phase (defer agent i18n).
The Planner recommends **(A)** — one prompt to maintain, chat localized, code unaffected. **Confirm or override.**

### OQ-2 — Include the `?lang=` URL parameter in the app's resolution chain?
Marketing resolves `?lang=` first. Recommend **yes** for parity and to allow marketing deep-links into the app to carry the language. **Confirm.**

### OQ-3 — Key namespacing convention
Recommend **nested-by-component-area** keys (e.g. `header.tagline`, `transport.play`, `agent.placeholder`) plus a `common.*` group for shared labels. Alternative: flat domain keys. **Confirm.**

### OQ-4 — Dictionary format/location
Recommend **typed TS modules** under `src/i18n/locales/{es,en,pt,zh}.ts` (compile-time key-parity via a shared `Dictionary` type, tree-shakeable) over JSON. **Confirm.**

### OQ-5 — Selector placement
Recommend the **app header** (always visible), mirroring the marketing selector. **Confirm.**

### OQ-6 — Translation boundary for music-domain text
Recommend translating descriptive labels (`mayor`→`major`, `dórico`→`dorian`, tooltips, legends) but keeping technical tokens verbatim across all languages: Strudel code, sample codes (`bd`/`sd`/`hh`/…), `E(k,n)`, note/pitch literals, transformation letters `P·L·R`. **Confirm the boundary.**

---

## Step 11.1 — Inventory + string catalog

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v2/decisions.md`, this phase file, ADR 0004 (`docs/adr/0004-svelte-store-for-session-state.md`), and the Phase 10 handoff. Read the marketing i18n implementation in `public/landing.html` (the `LS_KEY`, `LANGS`, `I18N`, `pickLang`, `onPickLang`, `rich` constructs) and `public/tutorial.html`. Then read every Svelte component (`src/app/App.svelte`, `src/ui/*.svelte`) and the text-producing TS (`src/agent/agent.ts` `SYSTEM_PROMPT` and any user-facing strings, `src/state/session.ts` human-readable label helpers, any other `src/**` that returns display text).

Produce `docs/orbifold-v2/inventories/phase-11-inventory.md` covering:

**(a) Marketing contract** — exact `LS_KEY`, the four codes and native labels, the precise resolution order and fallback, and how marketing escapes/structures rich text. State what the app must match byte-for-byte.

**(b) String catalog** — a table of every user-facing string: source file + line, current Spanish text, a proposed key, and a category (static label / `<option>` label / `title`/`aria-label` tooltip / placeholder / dynamic-interpolated / agent prompt / agent chat). Group by component. Flag every string needing interpolation (counts, names, `E(k,n)`, duration labels) and every technical token that should NOT be translated (per OQ-6 candidates). Give the running total.

**(c) Store integration point** — how the app currently bootstraps (where the root mounts, how stores initialize) and where a `lang` store and the header selector should hook in, consistent with ADR 0004.

**(d) Schema-isolation confirmation** — confirm `orbifold.lang`/language does NOT currently appear in `src/lib/persistence.ts` `SavedSchema` or `src/agent/schema.ts`, and that keeping it out is feasible.

**(e) Agent-language surface** — document `SYSTEM_PROMPT`, the chat request/response path, and the fix-prompt path, so step 11.5 can apply the OQ-1 decision precisely.

**(f) Quality baseline** — `pnpm exec vitest run` count, `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` all recorded.

Implementation requirements:
- Read every file before writing the inventory.
- Do NOT write any source code.
- Do NOT resolve OQ-1–OQ-6.

Validation:
- `docs/orbifold-v2/inventories/phase-11-inventory.md` exists and is non-empty.
- No source files modified.

Expected result: Inventory with the string catalog and a running total, the marketing-contract spec the app must match, and OQ-1–OQ-6 documented (not resolved).

CHECKPOINT → Commit message:
`docs(orbifold-v2): Phase 11 step 11.1 — i18n inventory and string catalog`

---

## Step 11.2 — ADR 0017 (i18n architecture)

PROMPT → Read `docs/orbifold-v2/inventories/phase-11-inventory.md`, `docs/orbifold-v2/decisions.md`, ADR 0004, and the Pilot's resolutions of OQ-1–OQ-6 from Checkpoint #1. Write `docs/adr/0017-i18n-architecture.md` recording:

- **D1 — Language store & access API.** A `lang` writable store and a `t` derived store (or `t()` accessor) in `src/i18n/`, consistent with ADR 0004. Specify the reactive access shape used in components (e.g. `$t('header.tagline')`).
- **D2 — Dictionary format, location, and key convention.** Per OQ-3/OQ-4: the `Dictionary` type, file layout (`src/i18n/locales/{es,en,pt,zh}.ts`), and key namespacing. `es` is the base/source-of-truth.
- **D3 — Language resolution chain & the `orbifold.lang` contract.** Per OQ-2: exact order (`?lang=` if adopted → `localStorage['orbifold.lang']` → `navigator.language` → `'es'`), the `zh`-prefix special case, and the write-back-on-change rule. State that the key and codes must match marketing exactly.
- **D4 — Fallback semantics.** Missing key in the active dictionary → render the `es` base value; never a raw key or blank. Define behavior and how the key-parity test enforces completeness.
- **D5 — Interpolation mechanism.** How dynamic values are injected (named placeholders), and the untranslatable-token boundary per OQ-6.
- **D6 — Schema isolation.** Language is UI-only ephemeral state in `orbifold.lang`; it does not enter `SessionState`, `SavedSchema`, or agent schemas. Saved-session bytes unchanged.
- **D7 — Agent conversational language.** Record the OQ-1 resolution and exactly how it is applied in `src/agent/agent.ts`.

Validation:
- `docs/adr/0017-i18n-architecture.md` exists and is non-empty.
- No source files modified.

CHECKPOINT → Commit message:
`docs(adr): Phase 11 step 11.2 — ADR 0017 i18n architecture`

---

## Step 11.3 — i18n runtime + header selector + tests (no component text moved yet)

PROMPT → Read `docs/adr/0017-i18n-architecture.md`, `docs/orbifold-v2/decisions.md`, `src/state/session.ts` (store idiom), and `public/landing.html` (resolution chain to mirror).

Build the i18n foundation per ADR 0017, with the `es` base dictionary seeded only with the keys needed for the header selector itself (full extraction is steps 11.4–11.5):

**(a)** `src/i18n/` runtime: the `lang` store with the resolution chain (D3), the `t`/`$t` access API (D1), the `Dictionary` type (D2), the fallback lookup (D4), and the interpolation helper (D5). Pure functions (resolution, fallback, interpolation) live in importable units with no DOM dependency.
**(b)** Write-back: changing `lang` persists to `localStorage['orbifold.lang']`.
**(c)** Header language selector wired to the `lang` store (per OQ-5), showing the four native labels.
**(d)** Stub `es`/`en`/`pt`/`zh` dictionaries with the shared `Dictionary` type and the selector's own keys, so the key-parity test has all four files to compare.
**(e)** Unit tests in `tests/i18n/` for: resolution chain (each branch + `zh` prefix + unsupported code → `es`), fallback (missing key → base text), interpolation (placeholder substitution), and key-parity (all four dictionaries share the exact key set).

Reversibility note: with no component strings extracted yet, the UI still renders its current Spanish text; only the (new, additive) header selector and store appear. Saved sessions unaffected.

Validation:
- `pnpm exec vitest run tests/i18n` → new tests pass.
- `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → ≥ baseline; `pnpm build` → exit 0.
- `grep -rn "from 'pixi\|from 'svelte/" src/i18n/` confirms pure parts have no PIXI imports (Svelte store import permitted in the store module; the pure helpers must be importable without a DOM).

CHECKPOINT → Commit message:
`feat(i18n): Phase 11 step 11.3 — i18n runtime, header selector, tests`

---

## Step 11.4 — Extract ES strings — wave A (top bar, transport, canvas controls, shell)

PROMPT → Read `docs/adr/0017-i18n-architecture.md`, the step 11.1 catalog, and the target components. Move every catalogued user-facing string in this wave into the `es` dictionary and replace the literal in the component with the `$t` access, preserving exact current Spanish wording (this wave changes nothing the user sees). Apply interpolation (D5) where the catalog flagged it; leave OQ-6 technical tokens verbatim.

Wave A components: `src/app/App.svelte`, `src/ui/Header.svelte`, `src/ui/Transport.svelte`, `src/ui/RhythmControls.svelte`, `src/ui/HarmonyControls.svelte`, `src/ui/Legend.svelte`, `src/ui/Hud.svelte`, `src/ui/Tooltip.svelte`, `src/ui/LatencyCalibration.svelte`.

For each component, the handoff cites the catalog rows covered. Add the corresponding keys to all four dictionaries (en/pt/zh may temporarily mirror `es` text where translation lands in step 11.6 — but the key-parity test must stay green; document any temporary `es`-copy values so step 11.6 finds them).

Validation:
- `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → ≥ baseline (key-parity test green); `pnpm build` → exit 0.
- Manual (Pilot Checkpoint #5): with language = Español the wave-A UI is textually identical to pre-phase `main`.

CHECKPOINT → Commit message:
`feat(i18n): Phase 11 step 11.4 — extract ES strings (wave A: shell, transport, controls)`

---

## Step 11.5 — Extract ES strings — wave B (panels, drawers, progression) + agent language

PROMPT → Read `docs/adr/0017-i18n-architecture.md`, the step 11.1 catalog, and the target components. Same extraction rules as 11.4 for the remaining components, plus apply the OQ-1 agent-language decision (D7) in `src/agent/agent.ts`.

Wave B components: `src/ui/AgentPanel.svelte`, `src/ui/PersistencePanel.svelte`, `src/ui/CompositionDrawer.svelte`, `src/ui/CodeDrawer.svelte`, `src/ui/ProgressionStrip.svelte`, `src/ui/ProgressionChips.svelte`, plus any text-producing helpers in `src/state/session.ts`.

Agent: implement D7 (per OQ-1). If (A), append the language directive to the request using the active `lang`; if (B), select the per-language prompt; if (C), no agent change (state so). The agent's JSON/code output contract is unchanged.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → ≥ baseline; `pnpm build` → exit 0.
- `grep -rn "lang\|orbifold.lang" src/lib/persistence.ts src/agent/schema.ts` → language absent from `SavedSchema` and agent schema (D6 holds).
- Manual (Checkpoint #5): with language = Español the wave-B UI is textually identical to pre-phase `main`; the agent replies in Spanish.

CHECKPOINT → Commit message:
`feat(i18n): Phase 11 step 11.5 — extract ES strings (wave B: panels, drawers) + agent language`

---

## Step 11.6 — Translations: EN, PT, ZH

PROMPT → Read `docs/adr/0017-i18n-architecture.md`, the completed `es` dictionary, and the step 11.1 catalog (for the untranslatable-token boundary). Fill the `en`, `pt`, and `zh` dictionaries with real translations for every key, replacing any temporary `es`-copy values left by steps 11.4–11.5. Respect OQ-6: technical tokens stay verbatim. Keep interpolation placeholders intact in every language.

Validation:
- `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → ≥ baseline (key-parity test confirms all four dictionaries complete); `pnpm build` → exit 0.
- A test (or the key-parity test extended) confirms no non-base dictionary value is an accidental leftover placeholder where a real translation is required, to the extent statically checkable.
- Manual (Checkpoint #5): switching the selector to English / Português / 中文 renders the full UI in that language with no Spanish leakage and no raw keys.

CHECKPOINT → Commit message:
`feat(i18n): Phase 11 step 11.6 — EN/PT/ZH translations`

---

## Step 11.7 — Quality gates + manual acceptance

PROMPT → Read this phase's Acceptance Criteria, `docs/orbifold-v2/decisions.md`, and the Phase 11 handoff (all steps). Run and record the full quality-gate suite, assemble the phase-level Acceptance Coverage Table for all A-11 IDs, and produce the manual acceptance checklist for Pilot Checkpoint #5.

Static-analysis checks (mandatory):

| Check | Command | Expected |
|---|---|---|
| Language absent from persistence schema | `grep -n "lang" src/lib/persistence.ts` | not present in `SavedSchema` |
| Language absent from agent schema | `grep -n "lang" src/agent/schema.ts` | not present |
| No residual hardcoded UI Spanish in components | catalog-driven grep of step 11.1 strings across `src/ui` / `src/app` | 0 residual (or each residual justified as a token per OQ-6) |
| `orbifold.lang` key used verbatim | `grep -rn "orbifold.lang" src/i18n` | present; matches marketing |
| Pure i18n helpers DOM-free | `grep -rn "from 'pixi\|document\.\|window\." src/i18n/<pure-helpers>` | 0 in the pure units |
| AGPL-3.0 headers | `head -2` on all new/modified source files | all present |

Validation:
- `pnpm exec tsc --noEmit` → 0 errors; `pnpm lint` → 0 errors; `pnpm exec vitest run` → ≥ baseline + new i18n tests, 0 failed; `pnpm build` → exit 0.
- No source files modified in this step (gates + docs only).

CHECKPOINT → Commit message:
`feat(i18n): Phase 11 step 11.7 — quality gates and manual acceptance`

---

## Acceptance Criteria

| ID | Description | Type |
|---|---|---|
| A-11-01 | Language carried from marketing: after choosing a language on `landing.html`/`tutorial.html`, opening the app starts it in that language (reads `orbifold.lang`). | manual |
| A-11-02 | In-app selector: changing the language in the app header updates all visible text live and writes the choice to `orbifold.lang` (marketing pages then honor it). | manual |
| A-11-03 | Resolution chain matches marketing: `?lang=` (if adopted per OQ-2) → `localStorage` → `navigator.language` (incl. `zh` prefix) → `es`; unsupported codes fall back to `es`. | unit + manual |
| A-11-04 | Full coverage: every catalogued user-facing string is routed through the dictionary; no residual hardcoded UI Spanish remains (except OQ-6 technical tokens). | manual + proxy (grep) |
| A-11-05 | Fallback: a missing key in a non-base dictionary renders the `es` base text — never a raw key or blank. | unit |
| A-11-06 | Interpolation: dynamic strings (counts, names, durations) render correctly with values injected, in every language. | unit + manual |
| A-11-07 | Four languages (Español / English / Português / 中文) are selectable with correct native labels and each renders the full UI with no Spanish leakage and no raw keys. | manual |
| A-11-08 | Agent conversational language follows the OQ-1 decision (e.g. replies in the user's language); the agent's code/JSON output contract is unchanged. | manual |
| A-11-09 | Adding a new language = adding one dictionary with no component edits; a key-parity test fails the build if any dictionary is missing or has extra keys. | unit |
| A-11-10 | i18n runtime testable: resolution, fallback, and interpolation are pure/unit-tested; the `lang` store is the single source of the active language. | automated |
| A-11-11 | Schema isolation: language absent from `SavedSchema` and agent schemas; saved-session bytes for identical content are unchanged. | automated (proxy: grep) |
| A-11-12 | Quality gates green: `tsc --noEmit` 0 errors, `pnpm lint` 0 errors, `pnpm test` ≥ baseline + new tests, `pnpm build` exit 0. | automated |
| A-11-13 | AGPL-3.0 header present in all new and modified source files. | automated (proxy: head -2) |

---

## Partial coverage from prior phase

Phase 10's open Acceptance items are its `manual` rows verified at **Phase 10's own Pilot Checkpoint #5** (the harmony staff-editor live acceptance). They are unrelated to internationalization and cannot be folded into this phase. This phase neither addresses nor defers them — they remain Phase 10's acceptance responsibility. **Surfaced to the Pilot** to confirm Phase 10 closure independently (see summary).

Phase 10's deferred *feature* work (note-level free placement / `NoteSlot` model, pitch-drag, Tonnetz vertex→single note) is reassigned from "Phase 11" to a later phase — **confirmed by the Pilot 2026-06-16**. No phase file is created for it yet (no inventing future phases); it will be scoped when the Pilot directs it.

## ADR Triggers

Open `docs/adr/0017-i18n-architecture.md` when these decisions become real (step 11.2):

- **i18n store & access API** — Trigger: step 11.2, once OQ-1/3/4 are resolved.
- **Language resolution chain + `orbifold.lang` contract** — Trigger: step 11.2 (OQ-2).
- **Fallback + key-parity completeness** — Trigger: step 11.2.
- **Agent conversational language** — Trigger: step 11.2 (OQ-1); a model-behavior-adjacent decision, so Pilot-resolved.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v2/handoffs/phase-11-handoff.md`. See `handoff-template.md`.

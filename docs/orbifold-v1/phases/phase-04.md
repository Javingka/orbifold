# Phase 04 — Svelte UI Layer

**Purpose:** Replace the Phase 02/03 temporary transport panel in `App.svelte` with the full prototype-parity Svelte UI: a header with brand, view-toggle, harmony controls, and key selector; a footer with the transport engine buttons, now-playing pill, BPM slider + tap-tempo, progression chips with drag-to-set-volume; an orbit-controls overlay (Euclidean + morph), a chord-mode overlay; the code drawer; a HUD, hint, and legend overlaid on the canvas; and a tooltip system — all styled to match the prototype's "Apple-sober" dark glass aesthetic.
**Gate:** Phase 03 is complete and Pilot-approved (`tsc --noEmit` 0, `pnpm lint` 0, 119 tests pass, `pnpm build` 0; all 10 A-03 acceptance IDs covered by live-system evidence; the PIXI scenes are fully operational).
**Expected phase result:** A developer running `pnpm dev` sees the complete Orbifold UI matching `reference/orbifold.html` — header with brand/view-toggle/key-selector, footer with full transport (Ritmo / Armonía / Sesión / Silencio), BPM slider + tap-tempo, progression chips with volume drag, orbit-controls overlay, chord-mode overlay, code drawer, HUD, hint, legend, and tooltips; all prototype interactions are reproduced; the temporary Phase 02/03 transport panel is gone; `tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` all exit 0.

---

## Step 04.1 — Inventory

PROMPT → Read `CLAUDE.md`, `~/.claude/skills/pilot-machine/references/methodology.md`, `~/.claude/skills/pilot-machine/references/dev-role.md`, `~/.claude/skills/pilot-machine/references/inventory-template.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `ORBIFOLD_KICKOFF.md §4 (file tree), §5 (data flow), §6 (guardrails)`. Then read `reference/orbifold.html` lines 1–580 (HTML structure + CSS for all UI panels), lines 638–693 (BPM / tap-tempo), lines 838–877 (Euclid controls), lines 1410–1535 (progression chips + setNowPlaying + transport handlers). Read `src/app/App.svelte` and `src/state/session.ts` in full. List `src/ui/` directory. Produce `docs/orbifold-v1/inventories/phase-04-inventory.md` following the inventory template exactly. Do NOT write any source code. Stop after committing the inventory file.

The inventory must address:

**Component map.** For each Svelte component to be created (listed below), record: prototype HTML element IDs / CSS class names and line ranges; what props/events it needs; which `sessionStore` fields it reads or writes; and whether it can be a pure presentational component or needs store access.

Target components:
- `src/ui/Header.svelte` — brand glyph + title + tag, view-toggle segmented control (`viewSeg` / `data-view` buttons), key selector (`melRoot`, `melMode`, `melOctave` selects). Prototype lines 358–395.
- `src/ui/Transport.svelte` — now-playing pill (`#nowPlaying`, `.nlbl`, `.nval`, `.dot`), engine-play buttons (`.ebtn.rhythm` / `.ebtn.harmony` / `.play-session`), silence button (`.tbtn.warm`), BPM slider + readout + tap-tempo (`.tempo` / `#cps` / `#bpmReadout` / `#tapBtn`). Prototype lines 484–514.
- `src/ui/ProgressionChips.svelte` — progression chip list with drag-for-volume, remove button, tap-to-preview. Prototype lines 505–508 (HTML), lines 1413–1468 (JS: `renderProgChips`, `chipGainCss`, drag logic).
- `src/ui/HarmonyControls.svelte` — chord-mode segmented control (`.orbit-ctl#harmonyCtl` / `#chordModeSeg`). Prototype lines 447–453.
- `src/ui/RhythmControls.svelte` — layout-morph toggle (`.mk#layoutToggle`), Euclidean orbit controls (`#euclidSound`, `#euclidK`, `#euclidN`, `#euclidR`, `#euclidKVal`, `#euclidNVal`, `#euclidRVal`, `#euclidPreview`, `#addEuclid`, `#addLayerEmpty`). Prototype lines 426–443, lines 838–877.
- `src/ui/CodeDrawer.svelte` — slide-up drawer with Strudel code `<textarea>`, run-now / queue-next-cycle action buttons, close button. Prototype lines 516–528, lines 237–249 (CSS).
- `src/ui/Hud.svelte` — voice-leading HUD (`.hud`, `.vl-title`, `.vl-sub`) shown on chord pick.
- `src/ui/Legend.svelte` — tonal-function color legend (`.legend`, `.legend span`, `.legend i`) shown in harmony view.
- `src/ui/Tooltip.svelte` — global tooltip that tracks `[data-tip]` elements. Prototype lines 339–345 (CSS), tooltip-wiring JS (search `data-tip` usages).

**App.svelte changes.** List every line in `App.svelte` that will be removed (temporary transport panel, `.transport-panel` style block, `.layer-ctl` raw buttons) and what replaces each.

**Layer-overlay refactor.** The `{#if hoveredLayerIndex >= 0}` DOM overlay in `App.svelte` (lines 336–352) needs styling updated to match the prototype's `#layerCtl` glass look (lines 328–337 CSS). Decide: keep it in `App.svelte` or move to a dedicated `LayerCtl.svelte`. Record the decision as a candidate Register entry if it has future implications.

**State additions for new UI.** Identify any `sessionStore` fields not yet present that Phase 04 requires. Candidates:
- `harmony.root`, `harmony.mode`, `harmony.octave` — already in `HarmonyState`, confirm they are writable from the header key-selector.
- `chordMode` — already in `SessionState`; confirm binding from `HarmonyControls`.
- Euclidean preview state (current k/n/r/sound values in the controls) — these are transient UI state, NOT store state. Confirm they live as Svelte local variables in `RhythmControls.svelte`.
- Tap-tempo state (`tapTimes` array) — transient, local to `Transport.svelte`.
- Code-drawer open/closed state — transient, local to `CodeDrawer.svelte`.
- Current code in drawer (mirrors the last-run Strudel code) — needs a store field or a separate writable. Prototype: `currentCode` global (line 583). Confirm approach.

**`session.ts` additions needed.** The inventory must identify which transport/action functions already exist vs. what is missing:
- `playChord(rootPc, qual, gain)` — already exported (step 03.4).
- `setChordMode(mode: 'chord'|'arp')` — not yet in store; identify if a simple store.update wrapper suffices.
- `setHarmonyKey(root, mode, octave)` — not yet; same.
- `addEuclidLayer(sound, k, n, rot)` — not yet; wraps `bjorklund` + `rotate` from core and pushes to `rhythm.layers`.
- `addEmptyLayer(sound)` — not yet.
- `previewEuclid(sound, k, n, rot)` — not yet; calls `runNow` with `s("${sound}").euclidRot(k,n,r)` and sets `nowPlaying` to `preview`.
- `runEditor(code)` / `queueEditor(code)` — for code-drawer execute/queue buttons; not yet.
- `clearProgression()` — not yet; clears `harmony.progression`.

**CSS strategy.** Confirm whether the prototype's glass styles (`var(--bg)`, `var(--panel)`, `var(--stroke)`, `.glass`) are placed in `src/app/app.css` (or `index.html` `<style>`) so all components can inherit them as CSS custom properties. If they are not yet present, flag as a required addition in step 04.2.

**Open decisions to surface.** Record any open decisions the Pilot must resolve before step 04.2:
- Font loading: prototype imports Fraunces / Albert Sans / IBM Plex Mono from Google Fonts (`@import url(…)` in `<style>`). Options: (a) keep the `@import` in `index.html`; (b) self-host via `fontsource` npm packages; (c) use system fallbacks. This affects layout fidelity.
- Code-drawer `currentCode` store field: add to `SessionState` or use a separate Svelte `writable` in `CodeDrawer.svelte`? Affects session persistence scope in Phase 07.

Implementation requirements:
- Inventory file format follows `inventory-template.md` exactly.
- No source code written.

Validation:
- `docs/orbifold-v1/inventories/phase-04-inventory.md` exists and is committed.

Expected result:
- The inventory maps every component, every prototype source range, every store addition needed, and every open decision — enabling the Pilot to resolve open decisions before step 04.2.

CHECKPOINT → Commit message:
`docs(orbifold-v1): Phase 04 step 04.1 — inventory`

---

## Step 04.2 — Global styles, CSS tokens, and `session.ts` additions

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `docs/orbifold-v1/inventories/phase-04-inventory.md`, `docs/orbifold-v1/handoffs/phase-04-handoff.md` (step 04.1 entry). Read `reference/orbifold.html` lines 23–352 (`:root` custom properties, `*`, `html/body`, `.glass`, `button`, `input`, `select`, `.seg`, `.seg2`, `.field`, `.engines`, `.ebtn`, `.now`, `.tbtn`, `.tempo`, `.prog`, `.prog-chip`, `.orbit-ctl`, `#tip`, media queries). Read `src/main.ts` and `index.html`. Do NOT read or modify any render scene files.

Implementation requirements:
- Add `src/app/app.css` (or confirm it already exists) with:
  - `:root` CSS custom properties: `--bg`, `--bg2`, `--panel`, `--panel-2`, `--stroke`, `--stroke-2`, `--text`, `--muted`, `--faint`, `--tonic`, `--subdom`, `--dom`, `--accent`, `--glass-blur`.
  - `body` gradient background (exact three-layer radial + linear gradient from prototype lines 42–49), `overflow: hidden`, font stack.
  - `body::after` grain overlay (prototype lines 51–55).
  - `.glass` utility class (backdrop-filter, border, box-shadow — prototype lines 56–62).
  - Base resets: `*`, `html,body`, `button`, `input,select,textarea`.
  - `#app` flex column layout (prototype line 66).
  - Font `@import` directive (Google Fonts URL as in prototype line 24) — or self-host if the Pilot chose fontsource in step 04.1 inventory resolution.
  - Segment control classes: `.seg`, `.seg2` (prototype lines 80–85).
  - The `@keyframes pulse` and `@keyframes dot` animations (prototype lines 101–102, 164–165).
  - Media query for `max-width: 760px` (prototype lines 346–351).
- Import `app.css` in `src/main.ts` (or `App.svelte` — confirm in inventory).
- Add the following functions to `src/state/session.ts` (each with an AGPL-3.0 header already present):
  - `setChordMode(mode: 'chord' | 'arp'): void` — updates `sessionStore.chordMode` and calls `requeueLive()`.
  - `setHarmonyKey(root: number, mode: string, octave: number): void` — updates `sessionStore.harmony.{root,mode,octave}` and calls `requeueLive()`.
  - `addEuclidLayer(sound: string, k: number, n: number, rot: number): void` — computes `bjorklund(k,n)` → `rotate(...,rot)` → maps to 16-step array, pushes new layer to `rhythm.layers`.
  - `addEmptyLayer(sound: string): void` — pushes a new 16-step all-zero layer.
  - `previewEuclid(sound: string, k: number, n: number, rot: number): void` — derives `s("${sound}").euclidRot(${k},${n},${rot})`, calls `audio.runNow(code)`, sets `nowPlaying` to `{ label: 'Vista previa · E(${k},${n})', source: 'preview' }`. Stops preview if already previewing this euclid (toggle logic: if `nowPlaying.source === 'preview'`, calls `hushAll()` instead).
  - `runEditor(code: string): Promise<void>` — calls `audio.runNow(code)`, sets `nowPlaying` to `{ label: 'Editor', source: 'editor' }`.
  - `queueEditor(code: string): Promise<void>` — calls `audio.queueForNextCycle(code)`.
  - `clearProgression(): void` — sets `harmony.progression = []`, calls `requeueLive()`.
- Remove the temporary rhythm seed in `App.svelte` `onMount` (the `rhythm: { layers: [{ sound: 'bd', steps: [...] }] }` block) — Phase 04 starts with an empty session as per prototype default.
- Do NOT remove the temporary transport panel yet (that happens in step 04.4 when the real UI components are ready).
- Do NOT touch any render scene files.

Prototype parity: all new `session.ts` functions must cite prototype line ranges in their JSDoc.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥119 tests pass (new session functions are pure enough to add unit tests for `addEuclidLayer` and `setChordMode` if time permits; minimum: existing tests must not regress).
- Visual check: `pnpm dev` — app renders as before (PIXI canvas + old transport panel still visible); body background gradient now matches prototype.

Expected result:
- `src/app/app.css` exists with all prototype CSS tokens.
- `src/state/session.ts` exports the seven new action functions.
- All gate commands pass.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.2 — global CSS tokens and session.ts action additions`

---

## Step 04.3 — Header and Transport components

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `docs/orbifold-v1/inventories/phase-04-inventory.md`, `docs/orbifold-v1/handoffs/phase-04-handoff.md` (step 04.2 entry). Read `reference/orbifold.html` lines 23–219 (CSS for header, transport, engine buttons, now-playing pill, tempo, prog chips), lines 358–513 (HTML for header and footer), lines 638–693 (BPM + tap-tempo JS), lines 1413–1535 (progression chip JS and transport handlers). Read `src/state/session.ts` in full. Do NOT read or modify any render scene files.

Implementation requirements:

**`src/ui/Header.svelte`** — ports prototype `<header class="glass">` (lines 358–395):
  - Brand: `꩜` glyph, `h1` "Orbifold", `.tag` "geometría sonora".
  - View-toggle: `.seg#viewSeg` with two buttons (`data-view="harmony"`, `data-view="rhythm"`). Active state driven by `$sessionStore.view`. On click: `sessionStore.update(s => ({ ...s, view }))`.
  - Key selector: three `<select>` elements for `melRoot` (12 note names, 0–11), `melMode` (8 modes, value = mode string), `melOctave` (2/3/4). On change: calls `setHarmonyKey(root, mode, octave)`.
  - The spacer `.sp` (flex: 1) between key selector and the right side — right side is empty for now (mic button deferred to a later phase as it is not in Phase 04 scope).
  - Apply `.glass` class; match prototype `padding`, `border-radius`, `margin` from CSS lines 69–72.

**`src/ui/Transport.svelte`** — ports prototype `<footer class="glass">` (lines 484–513):
  - Now-playing pill: `.now#nowPlaying` with pulsing `.dot`, label "sonando" + dynamic value from `$sessionStore.nowPlaying.label ?? 'silencio'`. Class `.live` when `source !== null`.
  - Engine buttons group `.engines`: `▶ Ritmo` (`.ebtn.rhythm`), `▶ Armonía` (`.ebtn.harmony`), `▶ Sesión` (`.play-session`). On click: `playGroove()` / `playProgression()` / `playSession()` (already exported from `session.ts`).
  - Silence: `.tbtn.warm` `■ silencio` → `hushAll()`.
  - BPM: range input (`#cps`) min `0.166` max `1.166` step `0.001`; readout `.bpm`; unit `.unit "BPM"`. Prototype conversion: `cps * 240 = bpm`. On input: `setBpm(cpsToBpm(e.target.value))`. Readout mirrors `$sessionStore.bpm`.
  - Tap-tempo: `.taptempo#tapBtn`. Tap logic (prototype lines 672–686): maintain local `tapTimes[]` array; on tap, if gap > 2 s reset; push `performance.now()`; keep last 6; flash `.flash` class for 90 ms; compute average interval; call `setBpm(60000/avg)`. Space-bar also registers a tap (keydown handler, scoped to avoid firing when focus is on `INPUT|TEXTAREA|SELECT`).
  - Do NOT include the progression chip area here — that is `ProgressionChips.svelte` (step 04.4).
  - All functions from `session.ts`; no direct audio module import in the Svelte component.

Prototype parity note in handoff: cite all prototype line ranges for BPM, tap-tempo, engine buttons, and now-playing pill.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥119 tests pass.
- `pnpm dev` — Header and Transport render at top and bottom of the screen respectively; view toggle switches between Harmony and Rhythm PIXI scenes; BPM slider changes tempo; tap-tempo registers taps. The old temporary transport panel is still present (removed in step 04.5).

Expected result:
- `src/ui/Header.svelte` and `src/ui/Transport.svelte` created and imported in `App.svelte`.
- Gate commands pass.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.3 — Header and Transport components`

---

## Step 04.4 — Progression chips, HarmonyControls, RhythmControls, and CodeDrawer

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `docs/orbifold-v1/inventories/phase-04-inventory.md`, `docs/orbifold-v1/handoffs/phase-04-handoff.md` (steps 04.2–04.3 entries). Read `reference/orbifold.html` lines 224–315 (CSS: prog-chip, code-drawer, orbit-ctl), lines 426–453 (HTML: orbit-ctl for rhythm and harmony), lines 516–528 (HTML: code-drawer), lines 838–877 (JS: euclid controls, addEuclid, addLayerEmpty, euclidPreview), lines 1413–1468 (JS: progression chips). Read `src/state/session.ts` (current exports). Do NOT read or modify any render scene files.

Implementation requirements:

**`src/ui/ProgressionChips.svelte`** — ports `#progChips` (prototype lines 224–234 CSS, 505–508 HTML, 1413–1468 JS):
  - Read `$sessionStore.harmony.progression` (array of `Chord`).
  - Empty state: `<span class="prog-empty">toca acordes en el Tonnetz…</span>`.
  - Each chip: `.prog-chip` + tonal-function class derived by looking up the chord's `rootPc:qual` against the diatonic lookup for the current key (import `computeDiatonic` from `core/theory/tonal-function.ts` or derive inline — see prototype lines 720–741; pick the simpler approach).
  - Chip label: `chordLabel(ch.rootPc, ch.qual)` from `core/theory/chords.ts`.
  - Remove button (`.rm` `✕`): calls `clearChordAt(index)` — add this helper to `session.ts` or inline as a `sessionStore.update`.
  - Volume drag (prototype lines 1441–1466): `pointerdown` captures pointer, `pointermove` computes `dy = startY - e.clientY`, `ch.gain = clamp(startGain + dy * 0.006, 0, 1.2)`, updates chip background via `chipGainCss(gain)` CSS gradient. On `pointerup`: if moved → `requeueLive()`; if tap (not moved) → `playChord(ch.rootPc, ch.qual, ch.gain)`.
  - `chipGainCss(g)`: `linear-gradient(to top, rgba(138,160,255,.30) ${pct}%, rgba(255,255,255,.05) ${pct}%)` (prototype lines 1413–1415).
  - Prototype parity: drag threshold 3 px, gain step 0.006, clamp [0, 1.2]. Cite prototype lines 1441–1466.

**`src/ui/HarmonyControls.svelte`** — ports `.orbit-ctl#harmonyCtl` (prototype lines 447–453, CSS line 316–325):
  - Overlay shown only when `$sessionStore.view === 'harmony'`.
  - Chord-mode segmented control `.seg2#chordModeSeg`: two buttons `◧ acorde` (mode `chord`) and `⋯ arpegio` (mode `arp`). Active state from `$sessionStore.chordMode`. On click: `setChordMode(mode)`.
  - Position: `position: absolute` at bottom-left of `#stage` (matching prototype `.orbit-ctl` CSS lines 316–325).
  - Must add `data-tip` attribute with the tooltip text for the segmented buttons (re-use prototype title text or invent equivalent).

**`src/ui/RhythmControls.svelte`** — ports `.orbit-ctl#orbitCtl` (prototype lines 426–443, CSS 316–325, JS 838–877):
  - Shown only when `$sessionStore.view === 'rhythm'`.
  - Morph toggle: `▭ lineal` / `▭ radial` button. On click: toggles `morphTarget` local state and calls `setMorphTarget(morphTarget)` (imported from `render/rhythm-scene.ts`). Note: this button is currently in `App.svelte`; it moves here.
  - Euclidean controls: `sound` select (bd/sd/hh/oh/cp/rim/lt/mt/ht), k/n/r range inputs with live readout, named pattern hint (e.g., "tresillo" for 3,8 — see prototype `known` map lines 844–846), `▶ oír` preview button (toggle: play → `previewEuclid(...)`, stop → `hushAll()`; button text + on/off state tracks `$sessionStore.nowPlaying.source === 'preview'`), `+ órbita` button → `addEuclidLayer(sound, k, n, rot)`, `+ capa vacía` button → `addEmptyLayer(sound)`.
  - All sliders must update their readout labels reactively (Svelte `$:` or inline reactive expressions).
  - `data-tip` attributes on elements that have them in the prototype (prototype lines 428–443).

**`src/ui/CodeDrawer.svelte`** — ports `#codeDrawer` + `#codeTab` (prototype lines 237–249 CSS, 515–528 HTML, plus `runEditor`/`queueEditor` actions):
  - Tab button fixed at bottom-center (`position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%)` — prototype line 237). Label: `⌄ código strudel`.
  - Drawer slides up on click (`translateY(105%)` → `translateY(0)`) with cubic-bezier transition. Open/closed state: local Svelte `boolean`.
  - Textarea `#liveCode`: 120 px height, IBM Plex Mono monospace, placeholder `s("bd hh sd hh")`. Tracks `currentEditorCode` local state; initialized to empty.
  - Close button `✕`.
  - Action buttons: `▶ ejecutar (ahora)` → `runEditor(code)`; `↻ encolar (próximo ciclo)` → `queueEditor(code)`.
  - `currentEditorCode` is local state within the component (not in `sessionStore`) — prototype's `currentCode` global (line 583) was a monolith side-effect; in the port it is presentational state local to the drawer.

Prototype parity notes in handoff: cite line ranges for chip drag logic, euclid controls, code-drawer open/close animation.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥119 tests pass.
- `pnpm dev` — progression chips appear in the footer; dragging a chip changes its gradient and calls `requeueLive`; tap plays the chord preview; chord-mode overlay appears in harmony view; euclid controls overlay appears in rhythm view; adding a euclid layer adds it to the scene; code drawer opens/closes with slide animation; execute and queue buttons trigger audio.

Expected result:
- `src/ui/ProgressionChips.svelte`, `src/ui/HarmonyControls.svelte`, `src/ui/RhythmControls.svelte`, `src/ui/CodeDrawer.svelte` created and imported in `App.svelte`.
- Gate commands pass.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.4 — ProgressionChips, HarmonyControls, RhythmControls, CodeDrawer`

---

## Step 04.5 — Hud, Legend, Tooltip, LayerCtl styling; remove temp transport panel

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `docs/orbifold-v1/inventories/phase-04-inventory.md`, `docs/orbifold-v1/handoffs/phase-04-handoff.md` (steps 04.2–04.4 entries). Read `reference/orbifold.html` lines 111–130 (CSS: HUD, hint, legend), lines 339–345 (CSS: tooltip), lines 409–425 (HTML: HUD, legend, hint), lines 576 (HTML: `#tip`), and search for `data-tip` usages (lines 427–443, 430–441) and for tooltip JS wiring (search "tip.className" / "data-tip"). Read `src/app/App.svelte` in full. Do NOT read or modify any render scene files.

Implementation requirements:

**`src/ui/Hud.svelte`** — ports `.hud#hud` (prototype lines 111–117 CSS, 409–411 HTML):
  - Receives props: `title: string`, `sub: string`, `visible: boolean`.
  - Applies `.hud.glass` classes; `.show` class when `visible` (opacity + translateY transition).
  - `App.svelte` drives it from `hudTitle` / `hudSub` / `hudVisible` reactive variables derived from `tonnetz-scene.ts`'s `getHudState()` export (add this export to `tonnetz-scene.ts` if not present, or pass state via a Svelte-store write from `tonnetz-scene.ts` — see implementation note below).
  - Implementation note: `tonnetz-scene.ts` already calls `setNowPlaying` via the `session.ts` export path. For the HUD (voice-leading details), add a writable Svelte store `hudStore` in `src/state/hud.ts` (or inline in `session.ts` if minimal — flag as a Register candidate). `tonnetz-scene.ts` writes to this store when a chord is picked (replacing the prototype `hudTitle.textContent` / `hudSub.textContent` DOM writes at lines 1367–1376). `App.svelte` reads `$hudStore` and passes props to `<Hud>`.

**`src/ui/Legend.svelte`** — ports `.legend#legend` (prototype lines 122–127 CSS, 414–421 HTML):
  - Static content: four colored squares with labels (tónica / subdom. / dominante / separator / ▲ mayor · ▼ menor / P·L·R vecinos).
  - Shown only when `$sessionStore.view === 'harmony'` (prototype hides it with `.legend.hide` when in rhythm view — port via Svelte `{#if}`).
  - Colors via CSS custom properties (`var(--tonic)`, `var(--subdom)`, `var(--dom)`, `var(--accent)`).
  - `position: absolute` top-right of `#stage` (prototype lines 122–125).

**`src/ui/Tooltip.svelte`** — ports `#tip` global tooltip (prototype lines 339–345 CSS, tooltip JS wiring):
  - A single `<div id="tip">` positioned `fixed` at z-index 60.
  - On mount: attach `pointermove` event on `document` to track `[data-tip]` elements; set tooltip content from `e.target.dataset.tip` (or closest ancestor). Show/hide with `.show` class and `transform: translateY(0)` / `translateY(4px)` transition (prototype lines 339–345).
  - Tooltip position: cursor + small offset (avoid clipping at viewport edges).
  - Port the prototype tooltip JS (search lines 1750–1780 approximate region for `tip.className = 'show'` logic — confirm exact lines by reading the prototype in the inventory).

**Layer-control overlay styling** — update the `.layer-ctl` block in `App.svelte` to match prototype `#layerCtl` glass styling (prototype lines 328–337):
  - Background: `rgba(12,15,22,.92)`, border `var(--stroke)`, border-radius `11px`, `backdrop-filter: blur(8px)`.
  - Buttons: `width: 26px; height: 26px; border-radius: 7px; font-size: 12px; font-weight: 700; color: var(--muted)`.
  - Solo `.on` state: background `var(--subdom)`, color `#0b0d12`.
  - Mute `.on` state: background `var(--dom)`, color `#0b0d12`.
  - Delete hover: `background: rgba(232,123,172,.4); border-color: var(--dom)`.
  - Pass `solo` and `mute` state as active class to each button (read from `$sessionStore.rhythm.layers[hoveredLayerIndex]`).

**`#stage` hint** — ports `.hint#stageHint` (prototype lines 119–121 CSS, line 423 HTML):
  - A `<div class="hint">` inside (or overlaid on) `#stage` with the default text "Toca un triángulo para elegir un acorde (▲ mayor ▼ menor). Verás sus vecinos P·L·R y el voice-leading mínimo. Abajo eliges qué suena."
  - Content driven by a `hintText` field in `hudStore` or as a separate reactive variable in `App.svelte`.

**Remove temporary transport panel** — delete from `App.svelte`:
  - The entire `<div class="transport-panel">…</div>` block and all its children.
  - The `.transport-panel`, `.transport-label`, `.now-playing` style rules.
  - The `handleBpmInput` function (BPM is now in `Transport.svelte`).
  - The `handleMorphToggle` function (morph is now in `RhythmControls.svelte`).
  - The `handleViewToggle` function (view toggle is now in `Header.svelte`).
  - The `morphTarget` variable (moved to `RhythmControls.svelte`).
  - Confirm `handleLayerSolo`, `handleLayerMute`, `handleLayerDelete` remain — they are still needed for the layer overlay.
  - Imports from `session.ts` that are no longer used by `App.svelte` directly (e.g., `playGroove`, `playProgression`, `playSession`, `hushAll`, `setBpm`) — move to the relevant UI components; remove from `App.svelte` imports.

Prototype parity notes in handoff: cite prototype line ranges for HUD, legend, tooltip, and layerCtl styling.

Validation:
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥119 tests pass.
- `pnpm build` — 0 errors.
- `pnpm dev` — The old temporary transport panel is gone. HUD appears with voice-leading text on chord pick. Legend is visible in harmony view and hidden in rhythm view. Tooltips appear on hover of `[data-tip]` elements. Layer overlay buttons reflect solo/mute state. Stage hint shows default text.

Expected result:
- `src/ui/Hud.svelte`, `src/ui/Legend.svelte`, `src/ui/Tooltip.svelte` created.
- `App.svelte` cleaned of all temporary transport UI.
- All gate commands pass.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.5 — Hud, Legend, Tooltip, LayerCtl styling; remove temp transport`

---

## Step 04.6 — Operability verification

PROMPT → Read `CLAUDE.md`, `docs/orbifold-v1/decisions.md`, `docs/orbifold-v1/phases/phase-04.md`, `docs/orbifold-v1/handoffs/phase-04-handoff.md` (all prior step entries). Run all gate commands. Record their exact output in the handoff. Then perform the full UI smoke test against the prototype parity checklist below.

Implementation requirements:
- Run all gate commands and record exact output.
- Execute the 14-point prototype-parity smoke test in `pnpm dev`:
  1. Body gradient and grain texture visible (matches prototype aesthetic).
  2. Header: brand glyph + "Orbifold" + "geometría sonora" tag visible; glass frosted background.
  3. View-toggle: clicking "Ritmo" switches PIXI canvas to rhythm view; "Armonía" returns to harmony view.
  4. Key selector: changing root/mode/octave updates `sessionStore.harmony` (verify via the HUD or Strudel code output in the drawer).
  5. Transport: "Init audio" no longer present as a raw button (audio is now initialized on first play gesture). Clicking `▶ Ritmo` plays groove; now-playing pill shows "Ritmo · groove" with pulsing dot. `■ silencio` stops and clears the pill.
  6. BPM: dragging the range slider updates the readout and changes the audible tempo. Tap-tempo: three quick taps set BPM to approximately the tapped interval. Space-bar also registers taps.
  7. Progression chips: pick two chords in Tonnetz; chips appear in the footer with tonal-function border colors. Drag a chip vertically → gain gradient updates. Tap → chord plays as preview. `✕` removes the chip.
  8. Harmony controls overlay: in harmony view, bottom-left shows `◧ acorde / ⋯ arpegio`; toggling changes the mode; chords play in the new mode.
  9. Rhythm controls: in rhythm view, overlay shows morph toggle and Euclidean controls. Adjust k/n/r → readout updates. `▶ oír` plays euclid preview; pressing again stops. `+ órbita` adds a new orbit to the scene.
  10. Code drawer: clicking `⌄ código strudel` slides drawer up; typing and clicking `▶ ejecutar` plays the code; `↻ encolar` queues it; `✕` closes.
  11. HUD: after picking a chord, HUD shows the chord name and voice-leading summary with accent-colored `mv` spans.
  12. Legend: visible in harmony view with tonic/subdom/dom color squares; hidden in rhythm view.
  13. Tooltip: hover over an element with `data-tip` → tooltip appears near cursor; move away → disappears.
  14. Layer controls: hover an orbit ring → styled glass overlay with S/M/Del; Solo highlights with `var(--subdom)` when active; Mute highlights with `var(--dom)`.
- Any defect found must be fixed and re-verified in this step.

Validation:
- All 14 smoke-test items pass.
- `pnpm exec tsc --noEmit` — 0 errors.
- `pnpm lint` — 0 errors.
- `pnpm test` — ≥119 tests pass.
- `pnpm build` — 0 errors.

Expected result:
- Handoff records gate command output and smoke-test pass/fail for all 14 items.
- All gate commands exit 0.

CHECKPOINT → Commit message:
`feat(ui): Phase 04 step 04.6 — operability verification and phase-04 completion handoff`

---

## Phase Acceptance

- **A-04-01** — Header brand, view-toggle, and key selector render; clicking view-toggle switches the PIXI scene.
  - Validation method: `live-system`
- **A-04-02** — Now-playing pill shows the correct label and pulsing dot when audio is playing; pill resets to "silencio" on hush.
  - Validation method: `live-system`
- **A-04-03** — Engine buttons (`▶ Ritmo`, `▶ Armonía`, `▶ Sesión`, `■ silencio`) trigger the corresponding `session.ts` transport actions and update `nowPlaying`.
  - Validation method: `live-system`
- **A-04-04** — BPM slider changes the audible tempo; readout reflects `sessionStore.bpm`; tap-tempo (button + space-bar) computes BPM from inter-tap intervals and applies it.
  - Validation method: `live-system`
- **A-04-05** — Progression chips: chips appear for each chord in `sessionStore.harmony.progression`; drag adjusts `gain` (range 0–1.2, step 0.006, threshold 3 px); tap plays chord preview; `✕` removes the chord; `requeueLive()` is called on drag release.
  - Validation method: `live-system`
- **A-04-06** — Chord-mode control (`◧ acorde` / `⋯ arpegio`) toggles `sessionStore.chordMode`; chords subsequently play in the selected mode.
  - Validation method: `live-system`
- **A-04-07** — Euclidean orbit controls: k/n/r sliders update readouts; `▶ oír` plays/stops euclid preview without affecting the main transport source; `+ órbita` adds a new rhythm layer to the scene; `+ capa vacía` adds an empty layer.
  - Validation method: `live-system`
- **A-04-08** — Morph toggle in rhythm view triggers the radial↔linear animation (A-03-06 behavior preserved).
  - Validation method: `live-system`
- **A-04-09** — Code drawer opens/closes with slide-up animation; execute and queue buttons trigger audio; drawer textarea is editable.
  - Validation method: `live-system`
- **A-04-10** — HUD shows chord name and voice-leading summary after a chord pick; legend is visible in harmony view and hidden in rhythm view.
  - Validation method: `live-system`
- **A-04-11** — Tooltip appears near cursor on hover of `[data-tip]` elements.
  - Validation method: `live-system`
- **A-04-12** — Layer-control overlay (S/M/Del) has glass styling; solo and mute buttons show active state via tonal-function colors.
  - Validation method: `live-system`
- **A-04-13** — All A-03 acceptance IDs remain covered: Tonnetz, P·L·R, voice-leading, rhythm orbits, morph, hover controls, resize, and Phase 02 audio are all functional after the UI layer is added.
  - Validation method: `live-system`
- **A-04-14** — Gate commands: `tsc --noEmit`, `pnpm lint`, `pnpm test` (≥119 passing), `pnpm build` all exit 0 after the final step.
  - Validation method: `unit` (test count) + `proxy:static-analysis` (tsc/lint/build output)

## Partial coverage from prior phase

No prior partials to address. Phase 03 coverage summary showed all 10 A-03 IDs as `covered`. The Register proposal for `Chord.cx/cy` was resolved by Pilot decision on 2026-06-08 (treat as ephemeral render hints, not persisted — active decision in `decisions.md`).

## ADR Triggers

Open `docs/adr/NNNN-<slug>.md` when these decisions become real:

- **`hudStore` placement** — Trigger: step 04.5, when deciding whether to add a dedicated `src/state/hud.ts` writable store or inline HUD state into `session.ts`. If a new store file is created this is an architectural pattern decision (one writable per concern vs. consolidated session store) that may affect Phase 06 (agent panel) and Phase 07 (persistence scope).
- **Font-loading strategy** — Trigger: step 04.2, if the Pilot chose self-hosted fonts (fontsource) over Google Fonts `@import`. Records the rationale (offline capability, no external dependency) and the packages added.

## Handoff Note

At the end of this phase, the Dev appends per-step entries and a phase-completion entry to `docs/orbifold-v1/handoffs/phase-04-handoff.md`. See `handoff-template.md`.

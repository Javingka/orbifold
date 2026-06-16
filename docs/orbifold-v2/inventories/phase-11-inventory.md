<!--
SPDX-License-Identifier: AGPL-3.0-only
-->

# Phase 11 Inventory — App Internationalization (ES / EN / PT / ZH)

**Step:** 11.1 — Inventory + string catalog
**Date:** 2026-06-16
**Branch:** orbifold-v2/phase-11 (to be cut from main at commit `068817e`)

---

## (a) Marketing contract

### What the app must match byte-for-byte

**localStorage key:** `orbifold.lang` (exactly — no variation).

**Language codes (exactly):**
| Code | Native label |
|------|-------------|
| `es` | Español |
| `en` | English |
| `pt` | Português |
| `zh` | 中文 |

**Resolution order (from `public/landing.html` lines 647–660):**

```
1. URL ?lang= parameter (if present AND recognized)
2. localStorage.getItem('orbifold.lang') (if set AND recognized)
3. navigator.language prefix match:
   - exact match on the two-letter code (e.g., "en-US" → "en")
   - special case: anything starting with "zh" → "zh" (covers zh-CN, zh-TW, zh-HK)
4. Default: 'es'
```

**Recognition:** a code is "recognized" only if it is one of `{ es, en, pt, zh }`. Any other value falls through to the next resolution step. An unrecognized localStorage value does not prevent a navigator.language match.

**Write-back on change:** when the user picks a language in the selector, the code must call `localStorage.setItem('orbifold.lang', code)` (matching `landing.html` line 664).

**Rich-text mechanism in marketing:** The marketing pages define a `rich(tokens)` helper that accepts an array of tokens: `string | { text, color? } | { em, color? } | { strong, color? } | { mono } | { br }`. This is a marketing-page React rendering construct and is NOT used in the app's Svelte dictionary. The app's dictionaries will use plain strings; any rich-text need inside a component is handled by the component's own markup. This is a design constraint for step 11.2.

**LANGS constant (from landing.html line 302):**
```javascript
const LANGS = [
  { code:'es', label:'Español' },
  { code:'en', label:'English' },
  { code:'pt', label:'Português' },
  { code:'zh', label:'中文' },
];
```

The app's language selector must use these same four codes and native labels in this order.

---

## (b) String catalog

**Running total: 98 user-facing strings** (detailed per-component below).

Legend:
- **Category codes:** SL = static label, OL = `<option>` label, TT = `title`/`aria-label` tooltip, PH = placeholder text, DI = dynamic-interpolated, AP = agent prompt text, AC = agent chat string, EL = empty-state label
- **[VERBATIM]** = technical token — NOT to be translated per OQ-6 (Strudel code, sample codes, `E(k,n)`, note/pitch literals, `P·L·R`, transformation letters)
- **[INTERP]** = needs interpolation (contains a runtime value)

### Group: Header.svelte (src/ui/Header.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 1 | 169 | `geometría sonora` | `header.tagline` | SL | brand tagline under h1 |
| 2 | 187 | `Armonía` | `header.nav.harmony` | SL | primary nav tab |
| 3 | 194 | `Ritmo` | `header.nav.rhythm` | SL | primary nav tab |
| 4 | 200 | `Composición` | `header.nav.composition` | SL | primary nav tab |
| 5 | 207 | `Código Strudel` | `header.nav.code` | SL | primary nav tab — "Strudel" is [VERBATIM]; translate "Código" only in EN/PT/ZH |
| 6 | 234 | `▭ lineal` | `header.rhythm.morphLinear` | SL | morph toggle label |
| 7 | 234 | `▭ radial` | `header.rhythm.morphRadial` | SL | morph toggle label |
| 8 | 231 | `Alterna entre el reloj radial y una pista lineal, con transición animada.` | `header.rhythm.morphTip` | TT | data-tip |
| 9 | 245 | `órbita euclidiana` | `header.rhythm.euclidLabel` | SL | section label |
| 10 | 254 | `Sonido/muestra de esta órbita (bombo bd, caja sd, hi-hats hh/oh, palmas cp, toms lt/mt/ht…).` | `header.rhythm.soundTip` | TT | data-tip — sample codes are [VERBATIM]; translate descriptive words |
| 11 | 271 | `E(k,n): k golpes distribuidos en n pasos. Ej: E(3,8) = tresillo; E(5,8) = cinquillo.` | `header.rhythm.euclidInfoTip` | TT | data-tip — `E(k,n)`, `E(3,8)`, `E(5,8)` [VERBATIM]; translate rest |
| 12 | 284 | `k = número de golpes (onsets) a repartir.` | `header.rhythm.kTip` | TT | data-tip |
| 13 | 294 | `n = número de pasos (subdivisiones) del ciclo.` | `header.rhythm.nTip` | TT | data-tip |
| 14 | 302 | `rot = rotación: desplaza el patrón r pasos, cambiando en qué pulso empieza.` | `header.rhythm.rotTip` | TT | data-tip — inline readout `rot <N>` has [VERBATIM] `rot`; translate description |
| 15 | 311 | `rot = rotación: desplaza el patrón r pasos.` | `header.rhythm.rotSliderTip` | TT | data-tip |
| 16 | 325 | `Oír solo esta órbita euclidiana antes de añadirla.` | `header.rhythm.previewTip` | TT | data-tip |
| 17 | 330 | `■ stop` | `header.rhythm.stopLabel` | SL | preview button when previewing |
| 18 | 330 | `▶ oír` | `header.rhythm.listenLabel` | SL | preview button when not previewing |
| 19 | 340 | `Añadir esta órbita euclidiana como una nueva capa.` | `header.rhythm.addOrbitTip` | TT | data-tip |
| 20 | 343 | `+ órbita` | `header.rhythm.addOrbit` | SL | button label |
| 21 | 352 | `Añadir una capa vacía de 16 pasos para dibujarla a mano.` | `header.rhythm.addEmptyTip` | TT | data-tip |
| 22 | 355 | `+ capa vacía` | `header.rhythm.addEmpty` | SL | button label |
| 23 | 367 | `Enviar el groove al agente como base rítmica` | `header.rhythm.sendBaseTitle` | TT | title attribute |
| 24 | 368 | `📨 base` | `header.rhythm.sendBaseLabel` | SL | button label — emoji not translated |
| 25 | 392 | `Tonnetz` | `header.harmony.subviewTonnetz` | SL | sub-toggle — [VERBATIM] proper noun |
| 26 | 398 | `Pentagrama` | `header.harmony.subviewStaff` | SL | sub-toggle — keep in all languages (musical term) |
| 27 | 424 | `Toca el acorde como bloque (todas las notas a la vez).` | `header.harmony.chordTip` | TT | data-tip |
| 28 | 425 | `◧ acorde` | `header.harmony.chordLabel` | SL | chord mode button |
| 29 | 431 | `Arpegia el acorde (notas en sucesión, duración por subdivisión).` | `header.harmony.arpTip` | TT | data-tip |
| 30 | 432 | `⋯ arpegio` | `header.harmony.arpLabel` | SL | arp mode button |
| 31 | 446 | `Enviar la clave + progresión al agente como marco armónico` | `header.harmony.sendMarcoTitle` | TT | title attribute |
| 32 | 449 | `📨 marco` | `header.harmony.sendMarcoLabel` | SL | button label |
| 33 | 453 | `clave` | `header.harmony.keyLabel` | SL | key selector group label |
| 34 | 465 | `mayor` | `header.harmony.modeMajor` | OL | mode select option |
| 35 | 466 | `menor` | `header.harmony.modeMinor` | OL | mode select option |
| 36 | 467 | `dórico` | `header.harmony.modeDorian` | OL | mode select option |
| 37 | 468 | `frigio` | `header.harmony.modePhrygian` | OL | mode select option |
| 38 | 469 | `lidio` | `header.harmony.modeLydian` | OL | mode select option |
| 39 | 470 | `mixolidio` | `header.harmony.modeMixolydian` | OL | mode select option |
| 40 | 471 | `locrio` | `header.harmony.modeLocrian` | OL | mode select option |
| 41 | 472 | `menor armónica` | `header.harmony.modeHarmonicMinor` | OL | mode select option |
| 42 | 491 | `Guía de uso` | `header.tutorialTitle` | TT | title attribute on Tutorial link |
| 43 | 492 | `Tutorial` | `header.tutorialLabel` | SL | link text |

**Subtotal Header.svelte: 43 strings**

Note: The `<h1>Orbifold</h1>` (line 169) is a brand name — [VERBATIM], not translated. The `꩜` glyph is decorative. The NOTE_NAMES array (C, C#, D…) is [VERBATIM] — pitch literals.

---

### Group: App.svelte (src/app/App.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 44 | 417-419 | `3 voces en color — tónica (naranja), subdominante (turquesa), dominante (rosa). Clic para seleccionar · arrastrar para mover · borde derecho para redimensionar.` | `app.hint.staff` | SL | Pentagrama stage hint |
| 45 | 422-424 | `Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla.` | `app.hint.rhythm` | SL | Rhythm stage hint — `E(k,n)` is [VERBATIM] |
| 46 | 464 | `Layer controls` | `app.layerCtl.ariaLabel` | TT | aria-label on layer controls toolbar |
| 47 | 473 | `sonar sola (solo)` | `app.layerCtl.soloTitle` | TT | title attribute on S button |
| 48 | 482 | `silenciar (mute)` | `app.layerCtl.muteTitle` | TT | title attribute on M button |
| 49 | 489 | `eliminar órbita` | `app.layerCtl.deleteTitle` | TT | title attribute on delete button |
| 50 | 474 | `S` | `app.layerCtl.soloKey` | SL | Solo button letter — may keep S in all languages or translate |
| 51 | 484 | `M` | `app.layerCtl.muteKey` | SL | Mute button letter — may keep M in all languages |

**Subtotal App.svelte: 8 strings**

---

### Group: Transport.svelte (src/ui/Transport.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 52 | 124 | `sonando` | `transport.nowPlaying.label` | SL | now-playing pill header |
| 53 | 126 | `silencio` | `transport.nowPlaying.silencio` | DI | displayed when `nowPlaying.label === null` |
| 54 | 132 | `tocar` | `transport.engineLabel` | SL | label above engine buttons |
| 55 | 143 | `Suena SOLO el groove (motor rítmico)` | `transport.rhythmPlayTitle` | TT | title on ▶ Ritmo button |
| 56 | 146 | `▶ Ritmo` | `transport.rhythmPlay` | SL | button label |
| 57 | 150 | `Suena SOLO la progresión de acordes (motor armónico)` | `transport.harmonyPlayTitle` | TT | title on ▶ Armonía button |
| 58 | 153 | `▶ Armonía` | `transport.harmonyPlay` | SL | button label |
| 59 | 158 | `Combina ritmo + armonía en un solo stack() y los toca juntos` | `transport.sessionPlayTitle` | TT | title on ▶ Sesión — `stack()` is [VERBATIM] |
| 60 | 161 | `▶ Sesión` | `transport.sessionPlay` | SL | button label |
| 61 | 162 | `ritmo + armonía` | `transport.sessionPlaySub` | SL | .mini subtitle inside session button |
| 62 | 170 | `■ silencio` | `transport.hush` | SL | silence button |
| 63 | 196 | `Pulsar al ritmo para ajustar el tempo` | `transport.tapTitle` | TT | title on TAP button |
| 64 | 198 | `TAP` | `transport.tap` | SL | tap-tempo button label |

**Subtotal Transport.svelte: 13 strings**

---

### Group: LatencyCalibration.svelte (src/ui/LatencyCalibration.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 65 | 63 | `Ajusta si los círculos se adelantan o retrasan al sonido` | `latency.widgetTitle` | TT | title on widget container |
| 66 | 65 | `sync` | `latency.label` | SL | compact label — may keep verbatim in all languages |
| 67 | 68 | `Reducir calibración 10 ms` | `latency.decrementAria` | TT | aria-label |
| 68 | 70 | `Aumentar calibración 10 ms` | `latency.incrementAria` | TT | aria-label |
| 69 | 72 | `Restablecer calibración a 0` | `latency.resetAria` | TT | aria-label |
| 70 | 73 | `Restablecer a 0 ms` | `latency.resetTitle` | TT | title attribute on ↺ button |

**Subtotal LatencyCalibration.svelte: 6 strings**

---

### Group: Legend.svelte (src/ui/Legend.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 71 | 24 | `tónica` | `legend.tonic` | SL | tonic label |
| 72 | 25 | `subdom.` | `legend.subdom` | SL | subdominant label (abbreviated) |
| 73 | 26 | `dominante` | `legend.dominant` | SL | dominant label |
| 74 | 28 | `▲ mayor · ▼ menor` | `legend.triangles` | SL | triangle type legend — `▲` `▼` are [VERBATIM] glyphs |
| 75 | 29 | `P·L·R vecinos` | `legend.plr` | SL | PLR neighbor label — `P·L·R` [VERBATIM] |

**Subtotal Legend.svelte: 5 strings**

---

### Group: ProgressionStrip.svelte (src/ui/ProgressionStrip.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 76 | 493 | `progresión` | `strip.label` | SL | strip column label |
| 77 | 495 | `toca acordes en el Tonnetz…` | `strip.empty` | EL | empty state — "Tonnetz" [VERBATIM] |
| 78 | 552 | `silencio · ✕ para quitar` | `strip.restTitle` | TT | title on rest segment |
| 79 | 568 | `Redimensionar duración del silencio` | `strip.resizeRestAria` | TT | aria-label on rest resize handle |
| 80 | 613 | `mantener y arrastrar ↑↓ para el volumen · clic para previsualizar · ✕ para quitar` | `strip.chordTitle` | TT | title on chord segment |
| 81 | 636 | `Redimensionar duración` | `strip.resizeDurAria` | TT | aria-label on chord resize handle |
| 82 | 651 | `+ silencio` | `strip.addRest` | SL | add rest button |

**Subtotal ProgressionStrip.svelte: 7 strings**

---

### Group: ProgressionChips.svelte (src/ui/ProgressionChips.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 83 | 154 | `progresión` | `strip.label` | SL | same key as ProgressionStrip — share `common.progression` |
| 84 | 156 | `toca acordes en el Tonnetz…` | `strip.empty` | EL | same key — [VERBATIM] "Tonnetz" |
| 85 | 170 | `mantener y arrastrar ↑↓ para el volumen · clic para previsualizar · ✕ para quitar` | `strip.chordTitle` | TT | same key as strip |

Note: ProgressionChips is a legacy component not currently rendered (ProgressionStrip replaced it). The three strings map to the same keys as ProgressionStrip. No additional unique keys arise.

**Subtotal ProgressionChips.svelte: 0 new unique strings** (same 3 keys already counted above)

---

### Group: AgentPanel.svelte (src/ui/AgentPanel.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 86 | 411 | `꩜ AGENTE IA` | `agent.tabLabel` | SL | agent tab button — `꩜` decorative |
| 87 | 424 | `Agente` | `agent.panelTitle` | SL | panel header |
| 88 | 425 | `Cerrar panel` | `agent.closeTitle` | TT | title on ✕ close button |
| 89 | 438 | `Proveedor de IA` | `agent.providerTitle` | TT | title on provider select |
| 90 | 446 | `modelo` | `agent.modelPlaceholder` | PH | input placeholder |
| 91 | 447 | `Modelo de IA` | `agent.modelTitle` | TT | title on model input |
| 92 | 454 | `API key` | `agent.keyTitle` | TT | title on key input — [VERBATIM] in all languages |
| 93 | 517 | `auto-tocar` | `agent.autoplay` | SL | autoplay toggle label |
| 94 | 520 | `🔧 auto-corregir` | `agent.autofix` | SL | autofix toggle label |
| 95 | 531 | `pídele un acompañamiento, una variación, una progresión…` | `agent.inputPlaceholder` | PH | textarea placeholder |
| 96 | 537 | `Enviar` | `agent.sendTitle` | TT | title on send button |
| 97 | 490 | `▶ tocar esto` | `agent.runCodeLabel` | SL | code block run button |

**Quick prompts (QUICK array, lines 82–94):** These are conversational requests to the agent. Per OQ-1 (agent language follows UI language) and OQ-6 (agent speaks to user in the active language), the QUICK prompts themselves should be translated so the agent receives them in the user's language. However, each prompt's _label_ (emoji + category) and _prompt text_ are separate concerns.

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 98 | 84 | `🥁 Groove` | `agent.quick.grooveLabel` | SL | emoji + label — "Groove" [VERBATIM] |
| 99 | 85 | `Crea un groove de batería con bombo, caja y hi-hats que pegue con el tempo actual.` | `agent.quick.groovePrompt` | AP | agent prompt text — "groove", "hi-hats" contextual; `bombo`/`caja` are music terms |
| 100 | 88 | `🎹 Progresión` | `agent.quick.progressionLabel` | SL | label |
| 101 | 89 | `Crea una progresión de 4 acordes con voice-leadings suaves en una clave que propongas.` | `agent.quick.progressionPrompt` | AP | agent prompt — "voice-leadings" [VERBATIM] term |
| 102 | 91 | `🎶 Ritmo + armonía` | `agent.quick.bothLabel` | SL | label |
| 103 | 91 | `Crea un groove y una progresión que combinen bien como base.` | `agent.quick.bothPrompt` | AP | agent prompt |
| 104 | 92 | `🌀 Euclidiano` | `agent.quick.euclidLabel` | SL | label |
| 105 | 92 | `Crea un ritmo con capas euclidianas (bombo y hats) con sabor afro.` | `agent.quick.euclidPrompt` | AP | agent prompt |
| 106 | 93 | `🔁 Variación` | `agent.quick.variationLabel` | SL | label |
| 107 | 93 | `Modifica el ritmo actual para hacerlo más interesante sin perder el pulso.` | `agent.quick.variationPrompt` | AP | agent prompt |

**Dynamic strings in AgentPanel.svelte (agent chat messages generated at runtime):**

| # | Location | Current Spanish text | Proposed key | Category | Notes |
|---|----------|---------------------|--------------|----------|-------|
| 108 | line 195 | `🔧 corrigiendo…` | `agent.autofixLoading` | AC | autofix loading indicator |
| 109 | line 229 | `⚠️ No pude obtener corrección del agente.` | `agent.autofixFailed` | AC | autofix failure message |
| 110 | lines 237-243 | `⚠️ Error al ejecutar: {error}` | `agent.execError` | DI+AC | error message with interpolation |
| 111 | line 241 | `\n(no pude corregirlo tras varios intentos; revísalo en el editor)` | `agent.execErrorGiveUp` | AC | appended to execError |
| 112 | line 243 | `\n(activa 🔧 auto-corregir)` | `agent.execErrorEnableAutofix` | AC | appended to execError |

**Subtotal AgentPanel.svelte: 27 strings** (lines 86–112 above)

---

### Group: PersistencePanel.svelte (src/ui/PersistencePanel.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 113 | 75 | `Sesiones guardadas` | `persistence.btnTitle` | TT | title on 💾 button |
| 114 | 83 | `💾` | — | — | emoji — not translated |
| 115 | 84 | `Sesiones` | `persistence.panelTitle` | SL | panel header |
| 116 | 85 | `Cerrar panel` | `persistence.closeTitle` | TT | title on ✕ close button |
| 117 | 92 | `nombre de sesión…` | `persistence.saveNamePlaceholder` | PH | placeholder |
| 118 | 95 | `💾 Guardar` | `persistence.saveBtn` | SL | save button label |
| 119 | 100 | `Sin sesiones guardadas.` | `persistence.emptyState` | EL | empty state |
| 120 | 107 | `Cargar sesión` | `persistence.loadTitle` | TT | title on ▶ button |
| 121 | 108 | `Eliminar sesión` | `persistence.deleteTitle` | TT | title on 🗑 button |
| 122 | 117 | `📤 Compartir URL` | `persistence.shareBtn` | SL | share button label |
| 123 | 63 | `✓ Copiado` | `persistence.shareFeedback` | AC | feedback message (set in handleShare) |

**Subtotal PersistencePanel.svelte: 11 strings**

---

### Group: CompositionDrawer.svelte (src/ui/CompositionDrawer.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 124 | 598 | `composición — arregla ritmos y armonías ya montados` | `composition.heading` | SL | drawer header title |
| 125 | 599 | `guarda bloques y ordénalos en el tiempo (cada uno dura N compases)` | `composition.headingHint` | SL | drawer header hint |
| 126 | 609 | `1 · guardar bloques` | `composition.col1Title` | SL | column title |
| 127 | 610 | `captura lo que tienes montado ahora mismo como un bloque reutilizable.` | `composition.col1Hint` | SL | column hint |
| 128 | 617 | `💾 groove actual` | `composition.saveGroove` | SL | save groove button |
| 129 | 618 | `💾 armonía actual` | `composition.saveHarmony` | SL | save harmony button |
| 130 | 619 | `💾 sesión actual` | `composition.saveSession` | SL | save session button |
| 131 | 630 | `aún no hay bloques — guarda uno arriba.` | `composition.emptyBlocks` | EL | empty block library |
| 132 | 681 | `2 · línea de tiempo` | `composition.col2Title` | SL | timeline column title |
| 133 | 682-684 | `pistas apiladas = suenan a la vez · bloques en fila = en secuencia · arrastra el borde derecho para los compases` | `composition.timelineHint` | SL | timeline usage hint |
| 134 | 690 | `+ pista` | `composition.addTrack` | SL | add track button |
| 135 | 709 | `pista {N}` | `composition.trackLabel` | DI+SL | [INTERP] track N label |
| 136 | 715 | `eliminar pista` | `composition.deleteTrackTitle` | TT | title on track delete button |
| 137 | 847 | `guarda bloques arriba` | `composition.noBlocksHint` | EL | empty drop zone hint |
| 138 | 809 | `comp.` | `composition.barsUnit` | SL | "compases" abbreviation after the bars input |
| 139 | 874 | `▶ tocar` | `composition.play` | SL | play button |
| 140 | 880 | `⏸ pausa` | `composition.pause` | SL | pause button |
| 141 | 886 | `■ stop` | `composition.stop` | SL | stop button |
| 142 | 892 | `limpiar todo` | `composition.clearAll` | SL | clear all tracks button |

**Dynamic compInfo strings (computed in session.ts and used in template):**

The `compInfo` string is computed directly in `CompositionDrawer.svelte` (lines 259, 268, 583). It contains pluralized counts:

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 143 | 259 | `▶ compás {N} / {tb}` | `composition.playing` | DI | [INTERP] playing label |
| 144 | 259 | `⏸ compás {N} / {tb}` | `composition.paused` | DI | [INTERP] paused label |
| 145 | 268 | `{N} pista / {N} pistas · {M} compás / {M} compases` | `composition.trackCount` `composition.barCount` | DI | [INTERP] pluralized counts — needs plural rules per language |

Note: line 268 uses inline pluralization: `` `${tl} pista${tl === 1 ? '' : 's'} · ${tb} compás${tb === 1 ? '' : 'es'}` ``. Step 11.5 must implement a per-language plural helper or use a two-key approach (`composition.trackSingular`/`composition.trackPlural`).

**Block type labels (tagOf function, line 158):**

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 146 | 158 | `ritmo` | `composition.blockTypeRhythm` | SL | block type tag label |
| 147 | 158 | `armonía` | `composition.blockTypeHarmony` | SL | block type tag label |
| 148 | 158 | `sesión` | `composition.blockTypeSession` | SL | block type tag label |

**Block track drop selector:**

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 149 | 841 | `＋ bloque…` | `composition.addBlockOption` | OL | select default option — [INTERP] `+ {type}: {name}` pattern also uses block type labels |
| 150 | 843 | `+ {type}: {name}` | `composition.addBlockEntry` | DI | [INTERP] select option per block — uses blockType keys + block name |

**Subtotal CompositionDrawer.svelte: 27 strings**

---

### Group: CodeDrawer.svelte (src/ui/CodeDrawer.svelte)

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 151 | 148 | `código Strudel` | `code.heading` | SL | drawer title — "Strudel" [VERBATIM] |
| 152 | 149 | `lo que suena ahora — edítalo y ejecútalo` | `code.headingHint` | SL | drawer hint |
| 153 | 161 | `s("bd hh sd hh")` | — | PH | [VERBATIM] — Strudel code, NOT translated |
| 154 | 170 | `▶ ejecutar (ahora)` | `code.runNow` | SL | run button |
| 155 | 171 | `↻ encolar (próximo ciclo)` | `code.queue` | SL | queue button |

**Subtotal CodeDrawer.svelte: 4 translated strings** (the placeholder is [VERBATIM] Strudel code)

---

### Group: session.ts — nowPlaying labels (src/state/session.ts)

These strings are produced by `setNowPlaying()` calls and are displayed in the Transport's `.nval` div (the "what is playing" label). They are not raw template strings but string literals passed to `setNowPlaying` at runtime.

| # | Line | Current Spanish text | Proposed key | Category | Notes |
|---|------|---------------------|--------------|----------|-------|
| 156 | 419 | `Ritmo · groove` | `session.playing.rhythm` | DI | nowPlaying label for groove |
| 157 | 442 | `Armonía · progresión` | `session.playing.harmony` | DI | nowPlaying label for harmony |
| 158 | 460 | `Sesión · ritmo + armonía` | `session.playing.session` | DI | nowPlaying label for session |
| 159 | 593 | `{label}` | — | DI | chord label from `chordLabel()` — is the chord name, e.g. "Cmin"; this is [VERBATIM] music notation |
| 160 | 805 | `Vista previa · E({k},{n})` | `session.playing.preview` | DI | [INTERP] — `E(k,n)` [VERBATIM]; "Vista previa" translatable |
| 161 | 822 | `Editor` | `session.playing.editor` | DI | nowPlaying label for editor |
| 162 | 1099 | `Bloque · {name}` | `session.playing.block` | DI | [INTERP] — "Bloque · " + block.name |
| 163 | 1412 | `Composición` | `session.playing.composition` | DI | nowPlaying for composition playback |
| 164 | 1446 | `Composición · pausa` | `session.playing.compositionPaused` | DI | nowPlaying while paused |

**Implementation note:** `setNowPlaying()` in `session.ts` is a pure state action. To support i18n, step 11.5 must inject a `t()` accessor into the call sites. The recommended approach per OQ-3 is to pass the i18n key (not the label) to `setNowPlaying` and resolve it in the Transport component, OR to call `setNowPlaying(t('session.playing.rhythm'), 'rhythm')` at each transport action site using the active `lang` at call time. The ADR (step 11.2) must decide which approach to use; this inventory flags the ambiguity.

**Subtotal session.ts labels: 9 strings** (chordLabel output is [VERBATIM])

---

### Group: agent.ts — SYSTEM_PROMPT (src/agent/agent.ts)

Per OQ-1 (resolved: Option A), the SYSTEM_PROMPT is kept in Spanish. A **dynamic language directive** is appended to each API request (not to the stored SYSTEM_PROMPT itself). The `buildContextAddendum` function (lines 221–261) produces contextual additions that are already language-neutral (they contain Strudel code snippets and numbers). These are NOT translated.

The dynamic directive to append: `"Responde en {languageName}."` where `languageName` is the user-facing name of the active language (e.g., "español", "inglés", "português", "chino").

| # | Location | Current Spanish text | Proposed key | Category | Notes |
|---|----------|---------------------|--------------|----------|-------|
| 165 | send() | _(new — dynamic directive)_ | `agent.languageDirective` | DI | e.g. "Responde en español." — [INTERP] |

The SYSTEM_PROMPT text itself (lines 75–119) is the authoritative corpus for the agent's competences. It is authored in Spanish and stays Spanish in all language modes. It does not enter the dictionary.

**Subtotal agent.ts: 1 string** (the appended language directive)

---

### Running total

| Group | String count |
|-------|-------------|
| Header.svelte | 43 |
| App.svelte | 8 |
| Transport.svelte | 13 |
| LatencyCalibration.svelte | 6 |
| Legend.svelte | 5 |
| ProgressionStrip.svelte | 7 |
| ProgressionChips.svelte | 0 (shared keys) |
| AgentPanel.svelte | 27 |
| PersistencePanel.svelte | 11 |
| CompositionDrawer.svelte | 27 |
| CodeDrawer.svelte | 4 |
| session.ts (nowPlaying labels) | 9 |
| agent.ts (language directive) | 1 |
| **TOTAL** | **161** |

Note: The running total of 161 counts every distinct translated string. Keys that are shared between components (e.g., `strip.label` used in both ProgressionStrip and ProgressionChips) count once. Strings flagged as [VERBATIM] are excluded.

### OQ-6 technical tokens — verbatim in ALL languages

The following are never translated:
- Strudel code strings and patterns (any content inside backtick code blocks)
- Sample codes: `bd`, `sd`, `hh`, `oh`, `cp`, `rim`, `lt`, `mt`, `ht`
- Euclidean notation: `E(k,n)` (glyph stays; translated only in surrounding description)
- Note/pitch literals: `C`, `C#`, `D`, `D#`, `E`, `F`, `F#`, `G`, `G#`, `A`, `A#`, `B` (and enharmonic equivalents)
- Transformation letters: `P·L·R` (all three letters + dots)
- Triangle glyphs: `▲` (major), `▼` (minor) — the glyphs; descriptions translate
- The brand name `Orbifold`
- The proper noun `Tonnetz`
- The musical term `Pentagrama` (already used across languages in music pedagogy)
- The term `Strudel` (proper noun / software name)
- The term `TidalCycles` (proper noun)
- The term `voice-leading` (music jargon; translate to footnote/tooltip where needed)
- The placeholder `s("bd hh sd hh")` in CodeDrawer (Strudel code)
- API key inputs (remain `API key` in all languages)
- The `API key` label on the key input in AgentPanel

### Interpolated strings requiring a placeholder mechanism

These strings contain runtime values. Step 11.2 ADR must specify the interpolation syntax (e.g., `{value}` named placeholders):

| Key | Interpolation |
|-----|--------------|
| `app.hint.rhythm` | `E(k,n)` verbatim — no interpolation needed (static) |
| `composition.trackLabel` | `{N}` → track index + 1 |
| `composition.playing` | `{bar}` → current bar, `{total}` → total bars |
| `composition.paused` | `{bar}`, `{total}` |
| `composition.trackCount` | `{count}`, `{singular}`, `{plural}` — plural rule needed |
| `composition.barCount` | `{count}`, `{singular}`, `{plural}` — plural rule needed |
| `composition.addBlockEntry` | `{type}`, `{name}` |
| `session.playing.preview` | `{k}`, `{n}` (verbatim inside `E(k,n)`) |
| `session.playing.block` | `{name}` → block.name |
| `agent.execError` | `{error}` → error string from Strudel runtime |
| `agent.languageDirective` | `{languageName}` → e.g., "español" |

---

## (c) Store integration point

### Current bootstrap

1. **Entry point:** `src/main.ts` mounts `<App />` from `src/app/App.svelte` into `#app` in `index.html`.
2. **Stores initialize** at module load time via `src/state/session.ts` (Svelte `writable` store, ADR 0004). No other stores initialize at module load except `src/state/hud.ts` and `src/state/agentCtx.ts`.
3. **`session.ts`** is the only store imported by `App.svelte`. The `lang` store will be a new, independent `src/i18n/lang.ts` module.

### Where `lang` store hooks in (consistent with ADR 0004)

- **New file:** `src/i18n/index.ts` — exports `lang` (Svelte `writable<LangCode>`), `t` (derived store returning the `Dictionary` lookup function), and the `LangCode` type.
- **Initialization:** `lang` store initialization runs at import time (reads `?lang=`, then `localStorage['orbifold.lang']`, then `navigator.language`, then `'es'`). This means the i18n module bootstraps immediately when imported, before any component renders — ensuring the first render is already in the correct language.
- **`App.svelte`** imports `{ t }` from `'../i18n/index.js'` and passes it down, OR components import `$t` directly from the i18n module (the ADR will decide; importing directly from the i18n module is the Svelte idiomatic approach and avoids prop-drilling).
- **Header selector:** A new `src/i18n/LangSelector.svelte` component (or inline in `Header.svelte`) reads `$lang` and writes back to the store on change.
- **Write-back:** The `lang` store's `set()` call triggers a Svelte store subscriber that calls `localStorage.setItem('orbifold.lang', code)`.

### ADR 0004 compatibility

ADR 0004 establishes that `src/state/` is permitted to import from `svelte/store`. The i18n runtime lives in `src/i18n/` (not `src/core/`), so Svelte store imports are permitted there. The pure functions (resolution chain, fallback lookup, interpolation) must be importable from `src/i18n/runtime.ts` without a DOM dependency — they take language codes and dictionaries as pure inputs.

---

## (d) Schema-isolation confirmation

### `src/lib/persistence.ts` — SavedSessionSchema (v2)

Confirmed: the `SavedSessionSchema` Zod object contains these top-level fields: `version`, `bpm`, `view`, `chordMode`, `harmony`, `rhythm`, `composition`. **No `lang` field exists** and none is proposed. Adding a language field here would violate the phase invariant that "language is UI-only ephemeral state." The schema is correct as-is.

### `src/agent/schema.ts` — AgentOutputSchema

Confirmed: the `AgentOutputSchema` contains `rhythm`, `harmony`, and `note` fields. **No `lang` field exists.** The agent's JSON output contract (what the agent produces) contains no language-related fields, and none will be added in this phase.

### Keeping it out is feasible

The `lang` store is a UI concern stored in `localStorage['orbifold.lang']`. It is initialized from localStorage on app load and written back on change. It does not need to travel with a saved session because: (a) it persists independently in localStorage, and (b) a loaded session should adopt the currently active UI language, not the language of whoever saved it. This mirrors the `registerMode` and `subview` ephemeral-state pattern (Phase 08, Decisions Register).

---

## (e) Agent-language surface

### SYSTEM_PROMPT

`SYSTEM_PROMPT` (lines 75–119 of `src/agent/agent.ts`) is a 44-line Spanish system prompt. It is exported as a `const string` and passed verbatim to the provider's API in the `send()` function. It will remain in Spanish in all language modes (OQ-1 → A).

### Chat request/response path (`send()` function, lines ~264–340 in agent.ts)

The `send()` function:
1. Validates the API key.
2. Calls `buildContextAddendum(ctx)` to build a Spanish context block appended to the user message.
3. Pushes `{ role: 'user', content: userMessage + addendum }` to `chatHistory`.
4. Makes the API call to the provider (`PROVIDERS[agentProvider].url`, with `SYSTEM_PROMPT` and `chatHistory`).
5. Returns a discriminated union: `'skill' | 'code' | 'text' | 'error'`.

**Where OQ-1 applies:** The language directive must be appended to the **user message** (not the system prompt) in step 4's build. Specifically, in `buildContextAddendum` or as a separate suffix, the active language name is appended: e.g., `"Responde en español."` This injection point is in `buildContextAddendum()` or immediately before the API call in `send()`. The ADR (step 11.2) must specify the exact injection point.

The `buildContextAddendum` function already reads `get(sessionStore)` for context. Similarly, it can read `get(lang)` from the i18n store to determine the active language.

### `requestAutofix` path (lines ~200–260 in agent.ts)

`requestAutofix(code, errorMsg)` sends a separate, Spanish-language correction request. Under OQ-1 the same language directive applies: the autofix request should also respond in the user's language. The injection point is the same pattern — a suffix to the user message in the autofix call.

### Fix-prompt path

The autofix request constructs its own prompt inline in `requestAutofix()`. It contains: code, error, and a request for correction. The language directive can be appended to this inline prompt as well.

### Summary of injection points for step 11.5

| Location | Current | Change needed (step 11.5) |
|----------|---------|---------------------------|
| `buildContextAddendum()` end | returns Spanish-only addendum | Append `\n\n[${t('agent.languageDirective', { languageName })}]` |
| `requestAutofix()` prompt string | Spanish inline | Append language directive suffix |
| `SYSTEM_PROMPT` | Spanish | Unchanged |

---

## (f) Quality baseline

Recorded on `main` at commit `068817e` (2026-06-16), before any Phase 11 changes:

| Gate | Command | Result |
|------|---------|--------|
| Unit tests | `pnpm exec vitest run` | **450 passed, 0 failed** (14 test files) |
| TypeScript | `pnpm exec tsc --noEmit` | **exit 0, 0 errors** |
| Lint | `pnpm lint` | **exit 0, 0 ESLint errors, 0 Prettier issues** |
| Build | `pnpm build` | **exit 0** — bundle 1,071.89 kB (pre-existing chunk-size warning only) |

Test file breakdown (450 total):
- `tests/harmony/staff-hit.test.ts`: 42
- `tests/session.test.ts`: 55
- `tests/harmony/staff-map.test.ts`: 73
- `tests/harmony/voice-tracks.test.ts`: 18 (estimated from Phase 10 baseline)
- `tests/harmony/voice-tracks-register.test.ts`: 24 (estimated)
- `tests/euclid.test.ts`: 25
- `tests/harmony/staff-layout.test.ts`: 32
- `tests/codegen.test.ts`: 42
- `tests/tonnetz.test.ts`: 31
- `tests/schema.test.ts`: 41
- `tests/persistence.test.ts`: 42
- `tests/phase-anchor.test.ts`: 4
- `tests/harmony/time-map.test.ts`: 13
- `tests/voice-leading.test.ts`: 8

**Note:** The test count increased from 447 (Phase 10 baseline) to 450, indicating 3 new tests were added between the Phase 10 handoff and the current main. No Phase 11 source files are modified in step 11.1.

---

## Open decisions (already resolved by Pilot — kept for step 11.2 ADR reference)

All six OQ items were resolved at scoping (2026-06-16). They are recorded here as context for ADR 0017 (step 11.2).

- **OQ-1 (Agent language):** Option A — one `SYSTEM_PROMPT` + dynamic language directive per request. Step 11.5 applies.
- **OQ-2 (URL `?lang=` in resolution chain):** Yes — matches marketing resolution order exactly.
- **OQ-3 (Key namespacing):** Nested-by-component keys (`header.tagline`, `transport.play`) + `common.*` for shared labels.
- **OQ-4 (Dictionary format):** Typed TS modules under `src/i18n/locales/{es,en,pt,zh}.ts`, shared `Dictionary` type.
- **OQ-5 (Selector placement):** Header, always visible. `文A` glyph (Wikipedia/Google style). Lists four native labels.
- **OQ-6 (Translation boundary):** Translate descriptive labels; keep technical tokens verbatim. Boundary catalogued in section (b) above.

### One open sub-question surfaced during inventory (not blocking step 11.2)

**Sub-question:** The `setNowPlaying()` calls in `session.ts` pass Spanish label strings at call time (e.g., `'Ritmo · groove'`). To i18n these, the translation must happen either: (A) at the call site in `session.ts` (requires `session.ts` to import from `src/i18n/` — creates a dependency from `state/` to `i18n/`), or (B) at the consumption point in `Transport.svelte` (requires `setNowPlaying` to store a key rather than a label string, changing the `NowPlaying.label` type). The ADR (step 11.2) should resolve this. The inventory flags it; both options are feasible without blocking.

---

## New dependencies

None anticipated. The i18n runtime is a pure TS module using only Svelte's `writable`/`derived` (already a dependency). No new npm packages are required.

---

## Files to be touched in subsequent steps

| File | Step | Change |
|------|------|--------|
| `src/i18n/index.ts` | 11.3 | New — `lang` store, `t` accessor, resolution chain |
| `src/i18n/runtime.ts` | 11.3 | New — pure resolution/fallback/interpolation helpers |
| `src/i18n/locales/es.ts` | 11.3–11.4–11.5 | New — base dictionary (seeded in 11.3, filled in 11.4–11.5) |
| `src/i18n/locales/en.ts` | 11.3–11.6 | New — English dictionary (stubs in 11.3–11.5, real translations in 11.6) |
| `src/i18n/locales/pt.ts` | 11.3–11.6 | New — Portuguese dictionary |
| `src/i18n/locales/zh.ts` | 11.3–11.6 | New — Chinese dictionary |
| `src/ui/Header.svelte` | 11.3 (selector) + 11.4 | Add LangSelector; extract 43 strings |
| `src/app/App.svelte` | 11.4 | Extract 8 strings |
| `src/ui/Transport.svelte` | 11.4 | Extract 13 strings |
| `src/ui/LatencyCalibration.svelte` | 11.4 | Extract 6 strings |
| `src/ui/Legend.svelte` | 11.4 | Extract 5 strings |
| `src/ui/HarmonyControls.svelte` | 11.4 | Empty shell — no strings |
| `src/ui/RhythmControls.svelte` | 11.4 | Empty shell — no strings |
| `src/ui/Tooltip.svelte` | 11.4 | No user-visible strings (renders `data-tip` text from other components) |
| `src/ui/Hud.svelte` | 11.4 | No new strings (renders props from `hudStore`, content from Tonnetz chord names [VERBATIM]) |
| `src/ui/AgentPanel.svelte` | 11.5 | Extract 27 strings |
| `src/ui/PersistencePanel.svelte` | 11.5 | Extract 11 strings |
| `src/ui/CompositionDrawer.svelte` | 11.5 | Extract 27 strings |
| `src/ui/CodeDrawer.svelte` | 11.5 | Extract 4 strings |
| `src/ui/ProgressionStrip.svelte` | 11.5 | Extract 7 strings |
| `src/state/session.ts` | 11.5 | Inject i18n into 9 nowPlaying label call sites |
| `src/agent/agent.ts` | 11.5 | Add language directive to `buildContextAddendum` / `requestAutofix` |
| `tests/i18n/*.test.ts` | 11.3 | New — resolution chain, fallback, interpolation, key-parity |

---

## Wave allocation (for steps 11.4 and 11.5)

**Wave A (step 11.4):** `App.svelte`, `Header.svelte`, `Transport.svelte`, `RhythmControls.svelte` (empty), `HarmonyControls.svelte` (empty), `Legend.svelte`, `Hud.svelte` (no strings), `Tooltip.svelte` (no strings), `LatencyCalibration.svelte`.

**Wave B (step 11.5):** `AgentPanel.svelte`, `PersistencePanel.svelte`, `CompositionDrawer.svelte`, `CodeDrawer.svelte`, `ProgressionStrip.svelte`, `ProgressionChips.svelte` (shared keys from Wave A), `src/state/session.ts` (nowPlaying labels), `src/agent/agent.ts` (language directive).

---

## Environment, CI, and build notes

- No new environment variables.
- No new build plugins.
- The typed TS dictionary modules (`src/i18n/locales/*.ts`) will be included in the Vite bundle at build time. Since only one language is active at a time, future work could tree-shake unused dictionaries, but for Phase 11 all four will be bundled (acceptable given the small dictionary size ~161 strings × ~50 chars avg = ~8 KB uncompressed).
- The key-parity test in `tests/i18n/` will run in Vitest (Node environment, no DOM needed) — the pure `runtime.ts` helpers have no DOM dependency.

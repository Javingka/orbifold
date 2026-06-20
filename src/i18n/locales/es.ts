// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Spanish (Español) locale dictionary — base / source-of-truth.
//
// ADR 0017 D2: `es` is the canonical base. Its key set defines the complete
// Dictionary type. All other locale files must satisfy the same Dictionary type
// and are checked for key-parity by tests/i18n/key-parity.test.ts.
//
// Step 11.3: seeded with only the keys needed for the header language selector.
// Step 11.4: added all Wave A strings (header, app, transport, latency, legend).
//            Exact current Spanish wording preserved — no changes to rendered text.
// Step 11.5: added all Wave B strings (agent, persistence, composition, code, strip,
//            session nowPlaying keys). Exact current Spanish wording preserved.

import type { Dictionary } from '../types.js';

const es: Dictionary = {
  common: {
    langLabel: 'Idioma',
  },
  langs: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    zh: '中文',
  },

  // ── Wave A (step 11.4) ───────────────────────────────────────────────────

  header: {
    tagline: 'geometría sonora',
    brandTitle: 'Ir a la página de inicio',
    nav: {
      harmony: 'Armonía',
      rhythm: 'Ritmo',
      composition: 'Composición',
      // "Strudel" is [VERBATIM]; only "Código" translates in other languages
      code: 'Código Strudel',
    },
    rhythm: {
      morphLinear: '▭ lineal',
      morphRadial: '▭ radial',
      morphTip: 'Alterna entre el reloj radial y una pista lineal, con transición animada.',
      euclidLabel: 'órbita euclidiana',
      euclidSectionTip:
        'Ritmo euclidiano: reparte k golpes lo más uniformemente posible entre n pasos. Base de muchos patrones del mundo.',
      // sample codes bd/sd/hh/oh/cp/toms are [VERBATIM]
      soundTip:
        'Sonido/muestra de esta órbita (bombo bd, caja sd, hi-hats hh/oh, palmas cp, toms lt/mt/ht…).',
      // E(k,n), E(3,8), E(5,8) are [VERBATIM]
      euclidInfoTip:
        'E(k,n): k golpes distribuidos en n pasos. Ej: E(3,8) = tresillo; E(5,8) = cinquillo.',
      kTip: 'k = número de golpes (onsets) a repartir.',
      nTip: 'n = número de pasos (subdivisiones) del ciclo.',
      // "rot" identifier is [VERBATIM]
      rotTip: 'rot = rotación: desplaza el patrón r pasos, cambiando en qué pulso empieza.',
      rotSliderTip: 'rot = rotación: desplaza el patrón r pasos.',
      previewTip: 'Oír solo esta órbita euclidiana antes de añadirla.',
      stopLabel: '■ stop',
      listenLabel: '▶ oír',
      addOrbitTip: 'Añadir esta órbita euclidiana como una nueva capa.',
      addOrbit: '+ órbita',
      addEmptyTip: 'Añadir una capa vacía de 16 pasos para dibujarla a mano.',
      addEmpty: '+ capa vacía',
      sendBaseTitle: 'Enviar el groove al agente como base rítmica',
      sendBaseLabel: '📨 base',
    },
    harmony: {
      // [VERBATIM] proper noun — kept identical in all languages
      subviewTonnetz: 'Tonnetz',
      // Musical term used across languages in music pedagogy — kept identical
      subviewStaff: 'Pentagrama',
      chordTip: 'Toca el acorde como bloque (todas las notas a la vez).',
      chordLabel: '◧ acorde',
      arpTip: 'Arpegia el acorde (notas en sucesión, duración por subdivisión).',
      arpLabel: '⋯ arpegio',
      sendMarcoTitle: 'Enviar la clave + progresión al agente como marco armónico',
      sendMarcoLabel: '📨 marco',
      keyLabel: 'clave',
      modeMajor: 'mayor',
      modeMinor: 'menor',
      modeDorian: 'dórico',
      modePhrygian: 'frigio',
      modeLydian: 'lidio',
      modeMixolydian: 'mixolidio',
      modeLocrian: 'locrio',
      modeHarmonicMinor: 'menor armónica',
      // Sound attributes (ADR 0019, Phase 03 step 03.5 redesign)
      // Waveform technical tokens (sawtooth/sine/square/triangle/pink) are [VERBATIM] values
      // Preset tokens (piano/guitar/synth-bass) are [VERBATIM] technical tokens
      soundLabel: 'timbre',
      oscillatorLabel: 'Oscilador',
      instrLabel: 'onda',
      instrSawtooth: 'Diente de Sierra',
      instrSine: 'Sinusoidal',
      instrSquare: 'Cuadrada',
      instrTriangle: 'Triangular',
      instrNoise: 'Ruido',
      presetLabel: 'Preset',
      presetNone: '— ninguno —',
      presetPiano: 'Piano',
      presetGuitar: 'Guitarra',
      presetSynthBass: 'Bajo Sintético',
      soundEditTip: 'Editando el timbre del acorde seleccionado.',
      soundIntentTip: 'Timbre que tendrán los próximos acordes que añadas.',
    },
    tutorialTitle: 'Guía de uso',
    tutorialLabel: 'Tutorial',
  },

  app: {
    hint: {
      // P·L·R is [VERBATIM]
      tonnetz:
        'Toca un triángulo para elegir un acorde (▲ mayor ▼ menor). Verás sus vecinos P·L·R y el voice-leading mínimo. Abajo eliges qué suena.',
      // 3 voces en color description — tonic/subdom/dom functional colors are descriptive
      staff:
        '3 voces en color — tónica (naranja), subdominante (turquesa), dominante (rosa). Clic para seleccionar · arrastrar para mover · borde derecho para redimensionar.',
      // E(k,n) is [VERBATIM]
      rhythm:
        'Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla.',
    },
    layerCtl: {
      ariaLabel: 'Layer controls',
      soloTitle: 'sonar sola (solo)',
      muteTitle: 'silenciar (mute)',
      deleteTitle: 'eliminar órbita',
      soloKey: 'S',
      muteKey: 'M',
    },
  },

  transport: {
    nowPlaying: {
      label: 'sonando',
      silencio: 'silencio',
    },
    engineLabel: 'tocar',
    // stack() is [VERBATIM]
    sessionPlayTitle: 'Combina ritmo + armonía en un solo stack() y los toca juntos',
    rhythmPlayTitle: 'Suena SOLO el groove (motor rítmico)',
    rhythmPlay: '▶ Ritmo',
    harmonyPlayTitle: 'Suena SOLO la progresión de acordes (motor armónico)',
    harmonyPlay: '▶ Armonía',
    sessionPlay: '▶ Sesión',
    sessionPlaySub: 'ritmo + armonía',
    hush: '■ silencio',
    tapTitle: 'Pulsar al ritmo para ajustar el tempo',
    tap: 'TAP',
  },

  latency: {
    widgetTitle: 'Ajusta si los círculos se adelantan o retrasan al sonido',
    label: 'sync',
    decrementAria: 'Reducir calibración 10 ms',
    incrementAria: 'Aumentar calibración 10 ms',
    resetAria: 'Restablecer calibración a 0',
    resetTitle: 'Restablecer a 0 ms',
  },

  legend: {
    tonic: 'tónica',
    subdom: 'subdom.',
    dominant: 'dominante',
    // ▲ and ▼ glyphs are [VERBATIM]
    triangles: '▲ mayor · ▼ menor',
    // P·L·R is [VERBATIM]
    plr: 'P·L·R vecinos',
  },

  // ── Wave B (step 11.5) ───────────────────────────────────────────────────

  agent: {
    // ꩜ decorative glyph stays verbatim in all languages
    tabLabel: '꩜ AGENTE IA',
    panelTitle: 'Agente',
    closeTitle: 'Cerrar panel',
    providerTitle: 'Proveedor de IA',
    modelPlaceholder: 'modelo',
    modelTitle: 'Modelo de IA',
    // API key label — [VERBATIM] in all languages per OQ-6
    keyTitle: 'API key',
    autoplay: 'auto-tocar',
    autofix: '🔧 auto-corregir',
    inputPlaceholder: 'pídele un acompañamiento, una variación, una progresión…',
    sendTitle: 'Enviar',
    runCodeLabel: '▶ tocar esto',
    quick: {
      grooveLabel: '🥁 Groove',
      // Agent prompt text — voice-leadings [VERBATIM]
      groovePrompt:
        'Crea un groove de batería con bombo, caja y hi-hats que pegue con el tempo actual.',
      progressionLabel: '🎹 Progresión',
      progressionPrompt:
        'Crea una progresión de 4 acordes con voice-leadings suaves en una clave que propongas.',
      bothLabel: '🎶 Ritmo + armonía',
      bothPrompt: 'Crea un groove y una progresión que combinen bien como base.',
      euclidLabel: '🌀 Euclidiano',
      euclidPrompt: 'Crea un ritmo con capas euclidianas (bombo y hats) con sabor afro.',
      variationLabel: '🔁 Variación',
      variationPrompt: 'Modifica el ritmo actual para hacerlo más interesante sin perder el pulso.',
    },
    autofixLoading: '🔧 corrigiendo…',
    autofixFailed: '⚠️ No pude obtener corrección del agente.',
    // {error} interpolated from Strudel runtime error string
    execError: '⚠️ Error al ejecutar: {error}',
    execErrorGiveUp: '\n(no pude corregirlo tras varios intentos; revísalo en el editor)',
    execErrorEnableAutofix: '\n(activa 🔧 auto-corregir)',
    // {languageName} interpolated — e.g. "español", "inglés"
    languageDirective: 'Responde en {languageName}.',
    autopilot: {
      btnOff: 'Autopilot',
      btnOn: 'Autopilot ●',
      titleOff: 'Activar piloto automático',
      titleOn: 'Piloto automático activo — clic para detener',
      cyclesLabel: 'Ciclos',
      infoTooltip:
        'Piloto automático: el agente evoluciona ritmo y armonía automáticamente cada N ciclos mientras suena audio. Configura N antes de activarlo.',
      // Phase 06 step 06.3 — autopilot panel redesign keys
      panelToggleLabel: 'Piloto automático',
      rhythmHintLabel: 'Estilo rítmico',
      rhythmHintOther: 'Otro…',
      rhythmHintPlaceholder: '— ninguno —',
      rhythmHintOtherPlaceholder: 'Describe el estilo, p.ej. cueca chilena, bossa nova…',
      playLabel: '▶ Iniciar',
      stopLabel: '■ Detener',
      progressTitle: 'Progreso del ciclo de evolución',
      noKeyWarning:
        'Configura el servicio de IA, el modelo y la clave API antes de iniciar el autopilot.',
      lagWarning:
        'El ciclo no pudo atenderse: la respuesta del servicio de IA tardó más que el intervalo configurado.',
      errorLlm: 'Error del servicio de IA: {error}',
    },
    recipeCard: {
      title: 'Receta aplicada',
      rhythmLabel: 'Ritmo',
      harmonyLabel: 'Armonía',
      densityLabel: 'Densidad',
      explanationLabel: 'Nota',
      clearTitle: 'Cerrar',
    },
  },

  persistence: {
    btnTitle: 'Sesiones guardadas',
    panelTitle: 'Sesiones',
    closeTitle: 'Cerrar panel',
    saveNamePlaceholder: 'nombre de sesión…',
    saveBtn: '💾 Guardar',
    emptyState: 'Sin sesiones guardadas.',
    loadTitle: 'Cargar sesión',
    deleteTitle: 'Eliminar sesión',
    shareBtn: '📤 Compartir URL',
    shareFeedback: '✓ Copiado',
  },

  composition: {
    heading: 'composición — arregla ritmos y armonías ya montados',
    headingHint: 'guarda bloques y ordénalos en el tiempo (cada uno dura N compases)',
    col1Title: '1 · guardar bloques',
    col1Hint: 'captura lo que tienes montado ahora mismo como un bloque reutilizable.',
    saveGroove: '💾 groove actual',
    saveHarmony: '💾 armonía actual',
    saveSession: '💾 sesión actual',
    emptyBlocks: 'aún no hay bloques — guarda uno arriba.',
    col2Title: '2 · línea de tiempo',
    timelineHint:
      'pistas apiladas = suenan a la vez · bloques en fila = en secuencia · arrastra el borde derecho para los compases',
    addTrack: '+ pista',
    // {N} interpolated — track number (1-indexed)
    trackLabel: 'pista {N}',
    deleteTrackTitle: 'eliminar pista',
    noBlocksHint: 'guarda bloques arriba',
    // "compases" abbreviation after bars input
    barsUnit: 'comp.',
    play: '▶ tocar',
    pause: '⏸ pausa',
    stop: '■ stop',
    clearAll: 'limpiar todo',
    // {bar} and {total} interpolated
    playing: '▶ compás {bar} / {total}',
    paused: '⏸ compás {bar} / {total}',
    // {count} interpolated — plural rules vary by language
    trackSingular: '{count} pista',
    trackPlural: '{count} pistas',
    barSingular: '{count} compás',
    barPlural: '{count} compases',
    blockTypeRhythm: 'ritmo',
    blockTypeHarmony: 'armonía',
    blockTypeSession: 'sesión',
    addBlockOption: '＋ bloque…',
    // {type} and {name} interpolated
    addBlockEntry: '+ {type}: {name}',
    // "abrir en editor" button on block cards with snapshots
    openBlock: '✎ abrir',
    openBlockTip: 'Restaurar este bloque en el editor para editarlo',
    legacyBlockTip:
      'Creado antes de que existieran los snapshots editables. Se puede reproducir, pero no se puede reabrir en el editor.',
  },

  code: {
    // "Strudel" is [VERBATIM]
    heading: 'código Strudel',
    headingHint: 'lo que suena ahora — edítalo y ejecútalo',
    runNow: '▶ ejecutar (ahora)',
    queue: '↻ encolar (próximo ciclo)',
  },

  strip: {
    label: 'progresión',
    // "Tonnetz" is [VERBATIM]
    empty: 'toca acordes en el Tonnetz…',
    restTitle: 'silencio · ✕ para quitar',
    resizeRestAria: 'Redimensionar duración del silencio',
    chordTitle: 'mantener y arrastrar ↑↓ para el volumen · clic para previsualizar · ✕ para quitar',
    resizeDurAria: 'Redimensionar duración',
    addRest: '+ silencio',
  },

  session: {
    playing: {
      rhythm: 'Ritmo · groove',
      harmony: 'Armonía · progresión',
      session: 'Sesión · ritmo + armonía',
      // {k} and {n} interpolated; E(...) notation is [VERBATIM]
      preview: 'Vista previa · E({k},{n})',
      editor: 'Editor',
      // {name} interpolated — block.name
      block: 'Bloque · {name}',
      composition: 'Composición',
      compositionPaused: 'Composición · pausa',
      agent: 'Código del agente',
    },
  },
};

export default es;

// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Portuguese (Português) locale dictionary.
//
// ADR 0017 D2: must satisfy Dictionary and pass the key-parity test.
// Step 11.3: seeded with only the keys needed for the header language selector.
// Step 11.4: added all Wave A keys. Values that should be translated are marked
//            with "// TODO translate" so step 11.6 can find and replace them.
//            Keys that are [VERBATIM] (technical tokens, proper nouns) are kept
//            as-is with no TODO marker.

import type { Dictionary } from '../types.js';

const pt: Dictionary = {
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
    tagline: 'geometría sonora', // TODO translate
    nav: {
      harmony: 'Armonía', // TODO translate
      rhythm: 'Ritmo', // TODO translate
      composition: 'Composición', // TODO translate
      // "Strudel" stays verbatim; only "Código" portion translates
      code: 'Código Strudel', // TODO translate
    },
    rhythm: {
      morphLinear: '▭ lineal', // TODO translate
      morphRadial: '▭ radial', // TODO translate
      morphTip: 'Alterna entre el reloj radial y una pista lineal, con transición animada.', // TODO translate
      euclidLabel: 'órbita euclidiana', // TODO translate
      // sample codes bd/sd/hh/oh/cp/toms are [VERBATIM]
      soundTip:
        'Sonido/muestra de esta órbita (bombo bd, caja sd, hi-hats hh/oh, palmas cp, toms lt/mt/ht…).', // TODO translate
      // E(k,n), E(3,8), E(5,8) are [VERBATIM]
      euclidInfoTip:
        'E(k,n): k golpes distribuidos en n pasos. Ej: E(3,8) = tresillo; E(5,8) = cinquillo.', // TODO translate
      kTip: 'k = número de golpes (onsets) a repartir.', // TODO translate
      nTip: 'n = número de pasos (subdivisiones) del ciclo.', // TODO translate
      // "rot" identifier is [VERBATIM]
      rotTip: 'rot = rotación: desplaza el patrón r pasos, cambiando en qué pulso empieza.', // TODO translate
      rotSliderTip: 'rot = rotación: desplaza el patrón r pasos.', // TODO translate
      previewTip: 'Oír solo esta órbita euclidiana antes de añadirla.', // TODO translate
      stopLabel: '■ stop',
      listenLabel: '▶ oír', // TODO translate
      addOrbitTip: 'Añadir esta órbita euclidiana como una nueva capa.', // TODO translate
      addOrbit: '+ órbita', // TODO translate
      addEmptyTip: 'Añadir una capa vacía de 16 pasos para dibujarla a mano.', // TODO translate
      addEmpty: '+ capa vacía', // TODO translate
      sendBaseTitle: 'Enviar el groove al agente como base rítmica', // TODO translate
      sendBaseLabel: '📨 base',
    },
    harmony: {
      // [VERBATIM] proper noun — kept identical in all languages
      subviewTonnetz: 'Tonnetz',
      // Musical term used across languages in music pedagogy — kept identical
      subviewStaff: 'Pentagrama',
      chordTip: 'Toca el acorde como bloque (todas las notas a la vez).', // TODO translate
      chordLabel: '◧ acorde', // TODO translate
      arpTip: 'Arpegia el acorde (notas en sucesión, duración por subdivisión).', // TODO translate
      arpLabel: '⋯ arpegio', // TODO translate
      sendMarcoTitle: 'Enviar la clave + progresión al agente como marco armónico', // TODO translate
      sendMarcoLabel: '📨 marco', // TODO translate
      keyLabel: 'clave', // TODO translate
      modeMajor: 'mayor', // TODO translate
      modeMinor: 'menor', // TODO translate
      modeDorian: 'dórico', // TODO translate
      modePhrygian: 'frigio', // TODO translate
      modeLydian: 'lidio', // TODO translate
      modeMixolydian: 'mixolidio', // TODO translate
      modeLocrian: 'locrio', // TODO translate
      modeHarmonicMinor: 'menor armónica', // TODO translate
    },
    tutorialTitle: 'Guía de uso', // TODO translate
    tutorialLabel: 'Tutorial',
  },

  app: {
    hint: {
      staff:
        '3 voces en color — tónica (naranja), subdominante (turquesa), dominante (rosa). Clic para seleccionar · arrastrar para mover · borde derecho para redimensionar.', // TODO translate
      // E(k,n) is [VERBATIM]
      rhythm:
        'Elige E(k,n) y añade órbitas euclidianas. Click derecho sobre una órbita para silenciarla.', // TODO translate
    },
    layerCtl: {
      ariaLabel: 'Layer controls',
      soloTitle: 'sonar sola (solo)', // TODO translate
      muteTitle: 'silenciar (mute)', // TODO translate
      deleteTitle: 'eliminar órbita', // TODO translate
      soloKey: 'S',
      muteKey: 'M',
    },
  },

  transport: {
    nowPlaying: {
      label: 'sonando', // TODO translate
      silencio: 'silencio', // TODO translate
    },
    engineLabel: 'tocar', // TODO translate
    // stack() is [VERBATIM]
    sessionPlayTitle: 'Combina ritmo + armonía en un solo stack() y los toca juntos', // TODO translate
    rhythmPlayTitle: 'Suena SOLO el groove (motor rítmico)', // TODO translate
    rhythmPlay: '▶ Ritmo', // TODO translate
    harmonyPlayTitle: 'Suena SOLO la progresión de acordes (motor armónico)', // TODO translate
    harmonyPlay: '▶ Armonía', // TODO translate
    sessionPlay: '▶ Sesión', // TODO translate
    sessionPlaySub: 'ritmo + armonía', // TODO translate
    hush: '■ silencio', // TODO translate
    tapTitle: 'Pulsar al ritmo para ajustar el tempo', // TODO translate
    tap: 'TAP',
  },

  latency: {
    widgetTitle: 'Ajusta si los círculos se adelantan o retrasan al sonido', // TODO translate
    label: 'sync',
    decrementAria: 'Reducir calibración 10 ms', // TODO translate
    incrementAria: 'Aumentar calibración 10 ms', // TODO translate
    resetAria: 'Restablecer calibración a 0', // TODO translate
    resetTitle: 'Restablecer a 0 ms', // TODO translate
  },

  legend: {
    tonic: 'tónica', // TODO translate
    subdom: 'subdom.', // TODO translate
    dominant: 'dominante', // TODO translate
    // ▲ and ▼ glyphs are [VERBATIM]
    triangles: '▲ mayor · ▼ menor', // TODO translate (mayor/menor → maior/menor)
    // P·L·R is [VERBATIM]
    plr: 'P·L·R vecinos', // TODO translate
  },
};

export default pt;

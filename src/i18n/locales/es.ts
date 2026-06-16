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
    },
    tutorialTitle: 'Guía de uso',
    tutorialLabel: 'Tutorial',
  },

  app: {
    hint: {
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
};

export default es;

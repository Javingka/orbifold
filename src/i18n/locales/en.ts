// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — English locale dictionary.
//
// ADR 0017 D2: must satisfy Dictionary and pass the key-parity test.
// Step 11.3: seeded with only the keys needed for the header language selector.
// Step 11.4: added all Wave A keys. Values that should be translated are marked
//            with "// TODO translate" so step 11.6 can find and replace them.
//            Keys that are [VERBATIM] (technical tokens, proper nouns) are kept
//            as-is with no TODO marker.
// Step 11.5: added all Wave B keys with Spanish stand-ins and // TODO translate markers.
// Step 11.6: replaced all // TODO translate markers with real English translations.

import type { Dictionary } from '../types.js';

const en: Dictionary = {
  common: {
    langLabel: 'Language',
  },
  langs: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    zh: '中文',
  },

  // ── Wave A (step 11.4) ───────────────────────────────────────────────────

  header: {
    tagline: 'sonic geometry',
    brandTitle: 'Go to the landing page',
    nav: {
      harmony: 'Harmony',
      rhythm: 'Rhythm',
      composition: 'Composition',
      // "Strudel" stays verbatim; only "Código" portion translates
      code: 'Strudel Code',
    },
    rhythm: {
      morphLinear: '▭ linear',
      morphRadial: '▭ radial',
      morphTip: 'Toggle between the radial clock and a linear track, with an animated transition.',
      euclidLabel: 'Euclidean orbit',
      euclidSectionTip:
        'Euclidean rhythm: distributes k hits as evenly as possible across n steps. The basis of many rhythmic patterns worldwide.',
      // sample codes bd/sd/hh/oh/cp/toms are [VERBATIM]
      soundTip:
        'Sound/sample for this orbit (kick bd, snare sd, hi-hats hh/oh, claps cp, toms lt/mt/ht…).',
      // E(k,n), E(3,8), E(5,8) are [VERBATIM]
      euclidInfoTip:
        'E(k,n): k hits distributed across n steps. E.g.: E(3,8) = triplet feel; E(5,8) = quintuplet feel.',
      kTip: 'k = number of hits (onsets) to spread.',
      nTip: 'n = number of steps (subdivisions) in the cycle.',
      // "rot" identifier is [VERBATIM]
      rotTip: 'rot = rotation: shifts the pattern r steps, changing which beat it starts on.',
      rotSliderTip: 'rot = rotation: shifts the pattern r steps.',
      previewTip: 'Preview this Euclidean orbit before adding it.',
      stopLabel: '■ stop',
      listenLabel: '▶ listen',
      addOrbitTip: 'Add this Euclidean orbit as a new layer.',
      addOrbit: '+ orbit',
      addEmptyTip: 'Add an empty 16-step layer to draw by hand.',
      addEmpty: '+ empty layer',
      sendBaseTitle: 'Send the groove to the agent as the rhythmic base',
      sendBaseLabel: '📨 base',
    },
    harmony: {
      // [VERBATIM] proper noun — kept identical in all languages
      subviewTonnetz: 'Tonnetz',
      // Musical term used across languages in music pedagogy — kept identical
      subviewStaff: 'Pentagrama',
      chordTip: 'Play the chord as a block (all notes at once).',
      chordLabel: '◧ chord',
      arpTip: 'Arpeggiate the chord (notes in succession, duration per subdivision).',
      arpLabel: '⋯ arpeggio',
      sendMarcoTitle: 'Send the key + progression to the agent as the harmonic framework',
      sendMarcoLabel: '📨 framework',
      keyLabel: 'key',
      modeMajor: 'major',
      modeMinor: 'minor',
      modeDorian: 'dorian',
      modePhrygian: 'phrygian',
      modeLydian: 'lydian',
      modeMixolydian: 'mixolydian',
      modeLocrian: 'locrian',
      modeHarmonicMinor: 'harmonic minor',
      // Sound attributes (ADR 0019, Phase 03 step 03.5 redesign)
      // Waveform technical tokens (sawtooth/sine/square/triangle/pink) are [VERBATIM] values
      // Preset tokens (piano/guitar/synth-bass) are [VERBATIM] technical tokens
      soundLabel: 'timbre',
      oscillatorLabel: 'Oscillator',
      instrLabel: 'wave',
      instrSawtooth: 'Sawtooth',
      instrSine: 'Sinusoidal',
      instrSquare: 'Square',
      instrTriangle: 'Triangle',
      instrNoise: 'Noise',
      presetLabel: 'Preset',
      presetNone: '— none —',
      presetPiano: 'Piano',
      presetGuitar: 'Guitar',
      presetSynthBass: 'Synth Bass',
      soundEditTip: 'Editing the timbre of the selected chord.',
      soundIntentTip: 'Timbre applied to the next chords you add.',
    },
    tutorialTitle: 'User guide',
    tutorialLabel: 'Tutorial',
  },

  app: {
    hint: {
      // P·L·R is [VERBATIM]
      tonnetz:
        'Tap a triangle to select a chord (▲ major ▼ minor). You will see its P·L·R neighbors and minimal voice-leading. Below you choose what plays.',
      // 3 voices in color — tonic/subdom/dom functional colors are descriptive
      staff:
        '3 color-coded voices — tonic (orange), subdominant (teal), dominant (pink). Click to select · drag to move · right edge to resize.',
      // E(k,n) is [VERBATIM]
      rhythm: 'Choose E(k,n) and add Euclidean orbits. Right-click an orbit to mute it.',
    },
    layerCtl: {
      ariaLabel: 'Layer controls',
      soloTitle: 'solo this layer',
      muteTitle: 'mute (mute)',
      deleteTitle: 'delete orbit',
      soloKey: 'S',
      muteKey: 'M',
    },
  },

  transport: {
    nowPlaying: {
      label: 'now playing',
      silencio: 'silence',
    },
    engineLabel: 'play',
    // stack() is [VERBATIM]
    sessionPlayTitle: 'Combine rhythm + harmony in a single stack() and play them together',
    rhythmPlayTitle: 'Play ONLY the groove (rhythm engine)',
    rhythmPlay: '▶ Rhythm',
    harmonyPlayTitle: 'Play ONLY the chord progression (harmony engine)',
    harmonyPlay: '▶ Harmony',
    sessionPlay: '▶ Session',
    sessionPlaySub: 'rhythm + harmony',
    hush: '■ silence',
    tapTitle: 'Tap to the beat to set the tempo',
    tap: 'TAP',
  },

  latency: {
    widgetTitle: 'Adjust if the circles lead or lag behind the sound',
    label: 'sync',
    decrementAria: 'Decrease calibration 10 ms',
    incrementAria: 'Increase calibration 10 ms',
    resetAria: 'Reset calibration to 0',
    resetTitle: 'Reset to 0 ms',
  },

  legend: {
    tonic: 'tonic',
    subdom: 'subdom.',
    dominant: 'dominant',
    // ▲ and ▼ glyphs are [VERBATIM]
    triangles: '▲ major · ▼ minor',
    // P·L·R is [VERBATIM]
    plr: 'P·L·R neighbors',
  },

  // ── Wave B (step 11.5) ───────────────────────────────────────────────────

  agent: {
    // ꩜ decorative glyph stays verbatim in all languages
    tabLabel: '꩜ AI AGENT',
    panelTitle: 'Agent',
    closeTitle: 'Close panel',
    providerTitle: 'AI Provider',
    modelPlaceholder: 'model',
    modelTitle: 'AI Model',
    // API key label — [VERBATIM] in all languages per OQ-6
    keyTitle: 'API key',
    autoplay: 'auto-play',
    autofix: '🔧 auto-fix',
    inputPlaceholder: 'ask for an accompaniment, a variation, a progression…',
    sendTitle: 'Send',
    runCodeLabel: '▶ play this',
    quick: {
      grooveLabel: '🥁 Groove',
      // Agent prompt text — voice-leading [VERBATIM]
      groovePrompt:
        'Create a drum groove with kick, snare, and hi-hats that fits the current tempo.',
      progressionLabel: '🎹 Progression',
      progressionPrompt:
        'Create a 4-chord progression with smooth voice-leading in a key of your choice.',
      bothLabel: '🎶 Rhythm + harmony',
      bothPrompt: 'Create a groove and a progression that work well together as a foundation.',
      euclidLabel: '🌀 Euclidean',
      euclidPrompt: 'Create a rhythm with Euclidean layers (kick and hats) with an Afro feel.',
      variationLabel: '🔁 Variation',
      variationPrompt:
        'Modify the current rhythm to make it more interesting without losing the pulse.',
    },
    autofixLoading: '🔧 fixing…',
    autofixFailed: '⚠️ Could not get a fix from the agent.',
    // {error} interpolated from Strudel runtime error string
    execError: '⚠️ Error running: {error}',
    execErrorGiveUp: '\n(could not fix it after several attempts; check it in the editor)',
    execErrorEnableAutofix: '\n(enable 🔧 auto-fix)',
    // {languageName} interpolated — e.g. "Spanish", "English"
    languageDirective: 'Respond in {languageName}.',
    autopilot: {
      btnOff: 'Autopilot',
      btnOn: 'Autopilot ●',
      titleOff: 'Start autopilot',
      titleOn: 'Autopilot active — click to stop',
      cyclesLabel: 'Cycles',
      infoTooltip:
        'Autopilot: the agent automatically evolves rhythm and harmony every N cycles while audio is playing. Set N before enabling.',
      // Phase 06 step 06.3 — autopilot panel redesign keys
      panelToggleLabel: 'Autopilot',
      rhythmHintLabel: 'Rhythm style',
      rhythmHintOther: 'Other…',
      rhythmHintPlaceholder: '— none —',
      rhythmHintOtherPlaceholder: 'Describe the style, e.g. cueca chilena, bossa nova…',
      playLabel: '▶ Start',
      stopLabel: '■ Stop',
      progressTitle: 'Evolution cycle progress',
      noKeyWarning: 'Set up the AI service, model, and API key before starting autopilot.',
      lagWarning: 'Cycle skipped: the AI service took longer than the configured interval.',
      errorLlm: 'AI service error: {error}',
      errorRateLimit: 'Rate limit reached. Autopilot will retry on the next cycle.',
      errorEmpty: 'The AI service returned an empty response. Try another model or retry.',
      errorBadFormat:
        "The model didn't return valid evolution JSON (common with code models). Try another model.",
      errorEmptyPlan:
        'The evolution plan returned is empty or has an invalid format. Autopilot will retry on the next cycle.',
      waitingFirstPlan: 'Waiting for the first agent rhythm…',
      harmonyPresetsLabel: 'Chord timbre',
    },
    recipeCard: {
      title: 'Applied recipe',
      rhythmLabel: 'Rhythm',
      harmonyLabel: 'Harmony',
      densityLabel: 'Density',
      explanationLabel: 'Note',
      clearTitle: 'Close',
    },
  },

  persistence: {
    btnTitle: 'Saved sessions',
    panelTitle: 'Sessions',
    closeTitle: 'Close panel',
    saveNamePlaceholder: 'session name…',
    saveBtn: '💾 Save',
    emptyState: 'No saved sessions.',
    loadTitle: 'Load session',
    deleteTitle: 'Delete session',
    shareBtn: '📤 Share URL',
    shareFeedback: '✓ Copied',
  },

  composition: {
    heading: 'composition — arrange your rhythms and harmonies',
    headingHint: 'save blocks and arrange them in time (each one lasts N bars)',
    col1Title: '1 · save blocks',
    col1Hint: 'capture what you have set up right now as a reusable block.',
    saveGroove: '💾 current groove',
    saveHarmony: '💾 current harmony',
    saveSession: '💾 current session',
    emptyBlocks: 'no blocks yet — save one above.',
    col2Title: '2 · timeline',
    timelineHint:
      'stacked tracks = play at the same time · blocks in a row = in sequence · drag the right edge for bars',
    addTrack: '+ track',
    // {N} interpolated — track number (1-indexed)
    trackLabel: 'track {N}',
    deleteTrackTitle: 'delete track',
    noBlocksHint: 'save blocks above',
    // "bars" abbreviation after bars input
    barsUnit: 'bars',
    play: '▶ play',
    pause: '⏸ pause',
    stop: '■ stop',
    clearAll: 'clear all',
    // {bar} and {total} interpolated
    playing: '▶ bar {bar} / {total}',
    paused: '⏸ bar {bar} / {total}',
    // {count} interpolated — plural rules vary by language
    trackSingular: '{count} track',
    trackPlural: '{count} tracks',
    barSingular: '{count} bar',
    barPlural: '{count} bars',
    blockTypeRhythm: 'rhythm',
    blockTypeHarmony: 'harmony',
    blockTypeSession: 'session',
    addBlockOption: '＋ block…',
    // {type} and {name} interpolated
    addBlockEntry: '+ {type}: {name}',
    // "open in editor" button on block cards with snapshots
    openBlock: '✎ open',
    openBlockTip: 'Restore this block into the editor to edit it',
    legacyBlockTip:
      'Created before editable snapshots were available. Playable but cannot be re-opened in the editor.',
  },

  code: {
    // "Strudel" is [VERBATIM]
    heading: 'Strudel code',
    headingHint: 'what is playing now — edit and run it',
    runNow: '▶ run (now)',
    queue: '↻ queue (next cycle)',
  },

  strip: {
    label: 'progression',
    // "Tonnetz" is [VERBATIM]
    empty: 'tap chords on the Tonnetz…',
    restTitle: 'silence · ✕ to remove',
    resizeRestAria: 'Resize silence duration',
    chordTitle: 'hold and drag ↑↓ for volume · click to preview · ✕ to remove',
    resizeDurAria: 'Resize duration',
    addRest: '+ silence',
  },

  session: {
    playing: {
      rhythm: 'Rhythm · groove',
      harmony: 'Harmony · progression',
      session: 'Session · rhythm + harmony',
      // {k} and {n} interpolated; E(...) notation is [VERBATIM]
      preview: 'Preview · E({k},{n})',
      editor: 'Editor',
      // {name} interpolated — block.name
      block: 'Block · {name}',
      composition: 'Composition',
      compositionPaused: 'Composition · paused',
      agent: 'Agent code',
    },
  },
};

export default en;

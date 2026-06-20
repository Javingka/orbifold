// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — i18n Dictionary type (ADR 0017 D2).
//
// This type is the compile-time contract for all locale dictionaries.
// The `es` base dictionary (src/i18n/locales/es.ts) is the canonical
// source of truth; all other dictionaries must satisfy this same type.
//
// Key convention (OQ-3, ADR 0017 D2): nested by component/domain.
// `common.*` is reserved for shared cross-component labels.
//
// The type grows incrementally as strings are extracted in steps
// 11.4–11.5. The key-parity test (tests/i18n/key-parity.test.ts)
// enforces that all four locale files share the exact same key set.
//
// Step 11.3: seeded with only the keys needed for the header language
// selector. All other namespaces are added in steps 11.4–11.5.
//
// Step 11.4: added header, app, transport, latency, and legend namespaces
// (Wave A extraction — shell, transport, canvas controls).
//
// Step 11.5: added agent, persistence, composition, code, strip, and
// session namespaces (Wave B extraction — panels, drawers, progression).

export interface Dictionary {
  /** Common cross-component labels. */
  common: {
    /** "Language" label used in the selector button/aria */
    langLabel: string;
  };
  /** Language selector native language names (used in the dropdown). */
  langs: {
    es: string;
    en: string;
    pt: string;
    zh: string;
  };

  // ── Wave A namespaces (step 11.4) ────────────────────────────────────────

  /** Header component strings. */
  header: {
    /** Brand tagline under h1 */
    tagline: string;
    /** Title/tooltip on the clickable brand (navigates to the landing page) */
    brandTitle: string;
    /** Primary navigation tabs */
    nav: {
      harmony: string;
      rhythm: string;
      composition: string;
      /** "Código Strudel" — "Strudel" stays verbatim; translate "Código" in EN/PT/ZH */
      code: string;
    };
    /** Rhythm controls (inline in Header, shown in rhythm view) */
    rhythm: {
      morphLinear: string;
      morphRadial: string;
      morphTip: string;
      euclidLabel: string;
      /** Tooltip on the euclidean section header span (Bug 4b fix) */
      euclidSectionTip: string;
      soundTip: string;
      /** E(k,n) explanation — E(k,n), E(3,8), E(5,8) are [VERBATIM] */
      euclidInfoTip: string;
      kTip: string;
      nTip: string;
      /** rot description — "rot" is [VERBATIM] */
      rotTip: string;
      rotSliderTip: string;
      previewTip: string;
      stopLabel: string;
      listenLabel: string;
      addOrbitTip: string;
      addOrbit: string;
      addEmptyTip: string;
      addEmpty: string;
      sendBaseTitle: string;
      sendBaseLabel: string;
    };
    /** Harmony controls (inline in Header, shown in harmony view) */
    harmony: {
      /** Tonnetz sub-toggle — [VERBATIM] proper noun */
      subviewTonnetz: string;
      /** Pentagrama sub-toggle — musical term, verbatim across languages */
      subviewStaff: string;
      chordTip: string;
      chordLabel: string;
      arpTip: string;
      arpLabel: string;
      sendMarcoTitle: string;
      sendMarcoLabel: string;
      keyLabel: string;
      modeMajor: string;
      modeMinor: string;
      modeDorian: string;
      modePhrygian: string;
      modeLydian: string;
      modeMixolydian: string;
      modeLocrian: string;
      modeHarmonicMinor: string;
      /**
       * Sound attributes section (ADR 0019, Phase 03 step 03.5 redesign).
       * Waveform technical tokens (sawtooth/sine/square/triangle/pink) are [VERBATIM]
       * in the Strudel value attribute — only the display labels are translated.
       * Preset name tokens (piano/guitar/synth-bass) are [VERBATIM] — only labels translate.
       * roomLabel/roomTip/decayLabel/decayTip removed (phase 03 step 03.5 — absorbed into presets).
       */
      soundLabel: string;
      /** Oscillator selector label */
      oscillatorLabel: string;
      instrLabel: string;
      instrSawtooth: string;
      instrSine: string;
      instrSquare: string;
      instrTriangle: string;
      /** Noise oscillator option label — token 'pink' is [VERBATIM] */
      instrNoise: string;
      /** Presets selector label */
      presetLabel: string;
      /** "No preset" option label */
      presetNone: string;
      /** Piano preset display name — 'piano' token is [VERBATIM] */
      presetPiano: string;
      /** Guitar preset display name — 'guitar' token is [VERBATIM] */
      presetGuitar: string;
      /** Synth Bass preset display name — 'synth-bass' token is [VERBATIM] */
      presetSynthBass: string;
      /** Tooltip when the sound block is in edit mode (a slot is selected) */
      soundEditTip: string;
      /** Tooltip when the sound block is in intent mode (no slot selected) */
      soundIntentTip: string;
    };
    /** Tutorial link */
    tutorialTitle: string;
    tutorialLabel: string;
  };

  /** App.svelte strings */
  app: {
    hint: {
      /** Tonnetz stage hint (Bug 4a fix) — P·L·R is [VERBATIM] */
      tonnetz: string;
      /** Pentagrama stage hint — E(k,n) is [VERBATIM] */
      staff: string;
      /** Rhythm stage hint — E(k,n) is [VERBATIM] */
      rhythm: string;
    };
    layerCtl: {
      ariaLabel: string;
      soloTitle: string;
      muteTitle: string;
      deleteTitle: string;
      soloKey: string;
      muteKey: string;
    };
  };

  /** Transport.svelte strings */
  transport: {
    nowPlaying: {
      label: string;
      silencio: string;
    };
    engineLabel: string;
    rhythmPlayTitle: string;
    rhythmPlay: string;
    harmonyPlayTitle: string;
    harmonyPlay: string;
    /** stack() is [VERBATIM] */
    sessionPlayTitle: string;
    sessionPlay: string;
    sessionPlaySub: string;
    hush: string;
    tapTitle: string;
    tap: string;
  };

  /** LatencyCalibration.svelte strings */
  latency: {
    widgetTitle: string;
    label: string;
    decrementAria: string;
    incrementAria: string;
    resetAria: string;
    resetTitle: string;
  };

  /** Legend.svelte strings */
  legend: {
    tonic: string;
    subdom: string;
    dominant: string;
    /** ▲ and ▼ glyphs are [VERBATIM] */
    triangles: string;
    /** P·L·R is [VERBATIM] */
    plr: string;
  };

  // ── Wave B namespaces (step 11.5) ────────────────────────────────────────

  /** AgentPanel.svelte strings */
  agent: {
    tabLabel: string;
    panelTitle: string;
    closeTitle: string;
    providerTitle: string;
    modelPlaceholder: string;
    modelTitle: string;
    /** API key label — [VERBATIM] in all languages */
    keyTitle: string;
    autoplay: string;
    autofix: string;
    inputPlaceholder: string;
    sendTitle: string;
    runCodeLabel: string;
    /** Quick prompt labels (emoji + label) */
    quick: {
      grooveLabel: string;
      /** Agent prompt text — sent directly to agent */
      groovePrompt: string;
      progressionLabel: string;
      progressionPrompt: string;
      bothLabel: string;
      bothPrompt: string;
      euclidLabel: string;
      euclidPrompt: string;
      variationLabel: string;
      variationPrompt: string;
    };
    /** Agent chat / runtime messages */
    autofixLoading: string;
    autofixFailed: string;
    /** Error message — {error} is the interpolated error string */
    execError: string;
    execErrorGiveUp: string;
    execErrorEnableAutofix: string;
    /** Dynamic language directive appended to agent requests — {languageName} interpolated */
    languageDirective: string;
    /** Autopilot toggle strings (ai-jam Phase 01) */
    autopilot: {
      /** Button label when autopilot is off */
      btnOff: string;
      /** Button label when autopilot is on (includes active indicator) */
      btnOn: string;
      /** Button title attribute when autopilot is off */
      titleOff: string;
      /** Button title attribute when autopilot is on */
      titleOn: string;
      /** Label for the N-cycles interval input */
      cyclesLabel: string;
      /** ⓘ info icon tooltip explaining how autopilot works */
      infoTooltip: string;
      /** aria/title for the expand/collapse chevron button (Phase 06 step 06.3) */
      panelToggleLabel: string;
      /** Label displayed before the rhythm hint dropdown (Phase 06 step 06.3) */
      rhythmHintLabel: string;
      /** Text shown in the "Otro…" option in the rhythm hint dropdown (Phase 06 step 06.3) */
      rhythmHintOther: string;
      /** Placeholder for the rhythm hint select default option and free-text input (Phase 06 step 06.3) */
      rhythmHintPlaceholder: string;
      /** Placeholder for the free-text input shown when "Otro…" is selected (Phase 06 browser-test fix A-06-05) */
      rhythmHintOtherPlaceholder: string;
      /** Label for the play/start autopilot button (Phase 06 step 06.3) */
      playLabel: string;
      /** Label for the stop autopilot button (Phase 06 step 06.3) */
      stopLabel: string;
      /** title/aria-label on the progress bar container (Phase 06 step 06.3) */
      progressTitle: string;
      /** Warning shown when startAutopilot is attempted without an API key configured (Phase 06 browser-test fix A-06-06) */
      noKeyWarning: string;
      /** Warning shown when the LLM took longer than the interval (Phase 06 heuristic fix) */
      lagWarning: string;
      /** Error message from the LLM provider — {error} is the interpolated error string (Phase 06 heuristic fix) */
      errorLlm: string;
      /** Rate-limit (429) specific error message — autopilot will retry next cycle (Phase 06 fix) */
      errorRateLimit: string;
    };
    /** Recipe intent card display strings (ai-jam Phase 04 step 04.3) */
    recipeCard: {
      /** Card header label */
      title: string;
      /** Label before the rhythm id list */
      rhythmLabel: string;
      /** Label before the harmony id */
      harmonyLabel: string;
      /** Label before the density value */
      densityLabel: string;
      /** Label before the explanation text (shown only when LLM supplied it) */
      explanationLabel: string;
      /** Tooltip / aria-label for the dismiss button */
      clearTitle: string;
    };
  };

  /** PersistencePanel.svelte strings */
  persistence: {
    btnTitle: string;
    panelTitle: string;
    closeTitle: string;
    saveNamePlaceholder: string;
    saveBtn: string;
    emptyState: string;
    loadTitle: string;
    deleteTitle: string;
    shareBtn: string;
    shareFeedback: string;
  };

  /** CompositionDrawer.svelte strings */
  composition: {
    heading: string;
    headingHint: string;
    col1Title: string;
    col1Hint: string;
    saveGroove: string;
    saveHarmony: string;
    saveSession: string;
    emptyBlocks: string;
    col2Title: string;
    timelineHint: string;
    addTrack: string;
    /** Track N label — {N} interpolated */
    trackLabel: string;
    deleteTrackTitle: string;
    noBlocksHint: string;
    /** "compases" abbreviation after the bars number input */
    barsUnit: string;
    play: string;
    pause: string;
    stop: string;
    clearAll: string;
    /** Playing position label — {bar} and {total} interpolated */
    playing: string;
    /** Paused position label — {bar} and {total} interpolated */
    paused: string;
    /** Track count (singular) — {count} interpolated */
    trackSingular: string;
    /** Track count (plural) — {count} interpolated */
    trackPlural: string;
    /** Bar count (singular) — {count} interpolated */
    barSingular: string;
    /** Bar count (plural) — {count} interpolated */
    barPlural: string;
    /** Block type tag labels */
    blockTypeRhythm: string;
    blockTypeHarmony: string;
    blockTypeSession: string;
    /** Drop selector default option */
    addBlockOption: string;
    /** Drop selector per-block option — {type} and {name} interpolated */
    addBlockEntry: string;
    /** "Open in editor" button label on a block card (snapshot present) */
    openBlock: string;
    /** Tooltip on the "open in editor" button */
    openBlockTip: string;
    /** Tooltip on the legacy badge shown for blocks without a snapshot */
    legacyBlockTip: string;
  };

  /** CodeDrawer.svelte strings */
  code: {
    /** Drawer title — "Strudel" is [VERBATIM] */
    heading: string;
    headingHint: string;
    runNow: string;
    queue: string;
  };

  /** ProgressionStrip.svelte / ProgressionChips.svelte shared strings */
  strip: {
    label: string;
    /** Empty state — "Tonnetz" is [VERBATIM] */
    empty: string;
    restTitle: string;
    resizeRestAria: string;
    chordTitle: string;
    resizeDurAria: string;
    addRest: string;
  };

  /** session.ts nowPlaying label keys (D8) */
  session: {
    playing: {
      rhythm: string;
      harmony: string;
      session: string;
      /** Preview label — {k} and {n} interpolated; E(...) is [VERBATIM] */
      preview: string;
      editor: string;
      /** Block label — {name} interpolated */
      block: string;
      composition: string;
      compositionPaused: string;
      /** Agent code label */
      agent: string;
    };
  };
}

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
    };
    /** Tutorial link */
    tutorialTitle: string;
    tutorialLabel: string;
  };

  /** App.svelte strings */
  app: {
    hint: {
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

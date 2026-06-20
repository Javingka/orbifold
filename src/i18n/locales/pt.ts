// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Portuguese (Português) locale dictionary.
//
// ADR 0017 D2: must satisfy Dictionary and pass the key-parity test.
// Step 11.3: seeded with only the keys needed for the header language selector.
// Step 11.4: added all Wave A keys. Values that should be translated are marked
//            with "// TODO translate" so step 11.6 can find and replace them.
//            Keys that are [VERBATIM] (technical tokens, proper nouns) are kept
//            as-is with no TODO marker.
// Step 11.5: added all Wave B keys with Spanish stand-ins and // TODO translate markers.
// Step 11.6: replaced all // TODO translate markers with real Portuguese translations.

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
    tagline: 'geometria sonora',
    brandTitle: 'Ir para a página inicial',
    nav: {
      harmony: 'Harmonia',
      rhythm: 'Ritmo',
      composition: 'Composição',
      // "Strudel" stays verbatim; only "Código" portion translates
      code: 'Código Strudel',
    },
    rhythm: {
      morphLinear: '▭ linear',
      morphRadial: '▭ radial',
      morphTip: 'Alterna entre o relógio radial e uma faixa linear, com transição animada.',
      euclidLabel: 'órbita euclidiana',
      euclidSectionTip:
        'Ritmo euclidiano: distribui k batidas o mais uniformemente possível em n passos. Base de muitos padrões rítmicos do mundo.',
      // sample codes bd/sd/hh/oh/cp/toms are [VERBATIM]
      soundTip:
        'Som/amostra desta órbita (bumbo bd, caixa sd, hi-hats hh/oh, palmas cp, tons lt/mt/ht…).',
      // E(k,n), E(3,8), E(5,8) are [VERBATIM]
      euclidInfoTip:
        'E(k,n): k batidas distribuídas em n passos. Ex: E(3,8) = tercina; E(5,8) = quintina.',
      kTip: 'k = número de batidas (onsets) a distribuir.',
      nTip: 'n = número de passos (subdivisões) do ciclo.',
      // "rot" identifier is [VERBATIM]
      rotTip: 'rot = rotação: desloca o padrão r passos, mudando em qual tempo começa.',
      rotSliderTip: 'rot = rotação: desloca o padrão r passos.',
      previewTip: 'Ouvir apenas esta órbita euclidiana antes de adicioná-la.',
      stopLabel: '■ stop',
      listenLabel: '▶ ouvir',
      addOrbitTip: 'Adicionar esta órbita euclidiana como uma nova camada.',
      addOrbit: '+ órbita',
      addEmptyTip: 'Adicionar uma camada vazia de 16 passos para desenhar manualmente.',
      addEmpty: '+ camada vazia',
      sendBaseTitle: 'Enviar o groove ao agente como base rítmica',
      sendBaseLabel: '📨 base',
    },
    harmony: {
      // [VERBATIM] proper noun — kept identical in all languages
      subviewTonnetz: 'Tonnetz',
      // Musical term used across languages in music pedagogy — kept identical
      subviewStaff: 'Pentagrama',
      chordTip: 'Tocar o acorde como bloco (todas as notas ao mesmo tempo).',
      chordLabel: '◧ acorde',
      arpTip: 'Arpejar o acorde (notas em sucessão, duração por subdivisão).',
      arpLabel: '⋯ arpejo',
      sendMarcoTitle: 'Enviar a tonalidade + progressão ao agente como moldura harmônica',
      sendMarcoLabel: '📨 moldura',
      keyLabel: 'tonalidade',
      modeMajor: 'maior',
      modeMinor: 'menor',
      modeDorian: 'dórico',
      modePhrygian: 'frígio',
      modeLydian: 'lídio',
      modeMixolydian: 'mixolídio',
      modeLocrian: 'lócrio',
      modeHarmonicMinor: 'menor harmônica',
      // Sound attributes (ADR 0019, Phase 03 step 03.5 redesign)
      // Waveform technical tokens (sawtooth/sine/square/triangle/pink) are [VERBATIM] values
      // Preset tokens (piano/guitar/synth-bass) are [VERBATIM] technical tokens
      soundLabel: 'timbre',
      oscillatorLabel: 'Oscilador',
      instrLabel: 'onda',
      instrSawtooth: 'Dente de Serra',
      instrSine: 'Sinusoidal',
      instrSquare: 'Quadrada',
      instrTriangle: 'Triangular',
      instrNoise: 'Ruído',
      presetLabel: 'Preset',
      presetNone: '— nenhum —',
      presetPiano: 'Piano',
      presetGuitar: 'Guitarra',
      presetSynthBass: 'Baixo Sintético',
      soundEditTip: 'Editando o timbre do acorde selecionado.',
      soundIntentTip: 'Timbre que será aplicado aos próximos acordes que você adicionar.',
    },
    tutorialTitle: 'Guia de uso',
    tutorialLabel: 'Tutorial',
  },

  app: {
    hint: {
      // P·L·R is [VERBATIM]
      tonnetz:
        'Toque um triângulo para escolher um acorde (▲ maior ▼ menor). Verá seus vizinhos P·L·R e o voice-leading mínimo. Abaixo você escolhe o que soa.',
      staff:
        '3 vozes coloridas — tônica (laranja), subdominante (turquesa), dominante (rosa). Clique para selecionar · arraste para mover · borda direita para redimensionar.',
      // E(k,n) is [VERBATIM]
      rhythm:
        'Escolha E(k,n) e adicione órbitas euclidianas. Clique com o botão direito em uma órbita para silenciá-la.',
    },
    layerCtl: {
      ariaLabel: 'Layer controls',
      soloTitle: 'tocar sozinha (solo)',
      muteTitle: 'silenciar (mute)',
      deleteTitle: 'eliminar órbita',
      soloKey: 'S',
      muteKey: 'M',
    },
  },

  transport: {
    nowPlaying: {
      label: 'tocando',
      silencio: 'silêncio',
    },
    engineLabel: 'tocar',
    // stack() is [VERBATIM]
    sessionPlayTitle: 'Combina ritmo + harmonia em um único stack() e toca juntos',
    rhythmPlayTitle: 'Toca APENAS o groove (motor rítmico)',
    rhythmPlay: '▶ Ritmo',
    harmonyPlayTitle: 'Toca APENAS a progressão de acordes (motor harmônico)',
    harmonyPlay: '▶ Harmonia',
    sessionPlay: '▶ Sessão',
    sessionPlaySub: 'ritmo + harmonia',
    hush: '■ silêncio',
    tapTitle: 'Toque no ritmo para ajustar o tempo',
    tap: 'TAP',
  },

  latency: {
    widgetTitle: 'Ajuste se os círculos se adiantam ou atrasam em relação ao som',
    label: 'sync',
    decrementAria: 'Reduzir calibração 10 ms',
    incrementAria: 'Aumentar calibração 10 ms',
    resetAria: 'Redefinir calibração para 0',
    resetTitle: 'Redefinir para 0 ms',
  },

  legend: {
    tonic: 'tônica',
    subdom: 'subdom.',
    dominant: 'dominante',
    // ▲ and ▼ glyphs are [VERBATIM]
    triangles: '▲ maior · ▼ menor',
    // P·L·R is [VERBATIM]
    plr: 'P·L·R vizinhos',
  },

  // ── Wave B (step 11.5) ───────────────────────────────────────────────────

  agent: {
    // ꩜ decorative glyph stays verbatim in all languages
    tabLabel: '꩜ AGENTE IA',
    panelTitle: 'Agente',
    closeTitle: 'Fechar painel',
    providerTitle: 'Provedor de IA',
    modelPlaceholder: 'modelo',
    modelTitle: 'Modelo de IA',
    // API key label — [VERBATIM] in all languages per OQ-6
    keyTitle: 'API key',
    autoplay: 'auto-tocar',
    autofix: '🔧 auto-corrigir',
    inputPlaceholder: 'peça um acompanhamento, uma variação, uma progressão…',
    sendTitle: 'Enviar',
    runCodeLabel: '▶ tocar isto',
    quick: {
      grooveLabel: '🥁 Groove',
      // Agent prompt text — voice-leading [VERBATIM]
      groovePrompt:
        'Crie um groove de bateria com bumbo, caixa e hi-hats que combine com o tempo atual.',
      progressionLabel: '🎹 Progressão',
      progressionPrompt:
        'Crie uma progressão de 4 acordes com voice-leadings suaves em uma tonalidade à sua escolha.',
      bothLabel: '🎶 Ritmo + harmonia',
      bothPrompt: 'Crie um groove e uma progressão que combinem bem como base.',
      euclidLabel: '🌀 Euclidiano',
      euclidPrompt: 'Crie um ritmo com camadas euclidianas (bumbo e hats) com sabor afro.',
      variationLabel: '🔁 Variação',
      variationPrompt:
        'Modifique o ritmo atual para torná-lo mais interessante sem perder o pulso.',
    },
    autofixLoading: '🔧 corrigindo…',
    autofixFailed: '⚠️ Não foi possível obter correção do agente.',
    // {error} interpolated from Strudel runtime error string
    execError: '⚠️ Erro ao executar: {error}',
    execErrorGiveUp: '\n(não foi possível corrigir após várias tentativas; revise no editor)',
    execErrorEnableAutofix: '\n(ative 🔧 auto-corrigir)',
    // {languageName} interpolated — e.g. "español", "português"
    languageDirective: 'Responda em {languageName}.',
    autopilot: {
      btnOff: 'Autopilot',
      btnOn: 'Autopilot ●',
      titleOff: 'Ativar piloto automático',
      titleOn: 'Piloto automático ativo — clique para parar',
      cyclesLabel: 'Ciclos',
      infoTooltip:
        'Piloto automático: o agente evolui ritmo e harmonia automaticamente a cada N ciclos enquanto o áudio toca. Configure N antes de ativar.',
      // Phase 06 step 06.3 — autopilot panel redesign keys // i18n-draft
      panelToggleLabel: 'Piloto automático', // i18n-draft
      rhythmHintLabel: 'Estilo rítmico', // i18n-draft
      rhythmHintOther: 'Outro…', // i18n-draft
      rhythmHintPlaceholder: '— nenhum —', // i18n-draft
      rhythmHintOtherPlaceholder: 'Descreva o estilo, ex.: cueca chilena, bossa nova…', // i18n-draft
      playLabel: '▶ Iniciar', // i18n-draft
      stopLabel: '■ Parar', // i18n-draft
      progressTitle: 'Progresso do ciclo de evolução', // i18n-draft
      noKeyWarning:
        'Configure o serviço de IA, o modelo e a chave API antes de iniciar o autopilot.', // i18n-draft
    },
    recipeCard: {
      // i18n-draft
      title: 'Receita aplicada',
      rhythmLabel: 'Ritmo',
      harmonyLabel: 'Harmonia',
      densityLabel: 'Densidade',
      explanationLabel: 'Nota',
      clearTitle: 'Fechar',
    },
  },

  persistence: {
    btnTitle: 'Sessões salvas',
    panelTitle: 'Sessões',
    closeTitle: 'Fechar painel',
    saveNamePlaceholder: 'nome da sessão…',
    saveBtn: '💾 Salvar',
    emptyState: 'Sem sessões salvas.',
    loadTitle: 'Carregar sessão',
    deleteTitle: 'Excluir sessão',
    shareBtn: '📤 Compartilhar URL',
    shareFeedback: '✓ Copiado',
  },

  composition: {
    heading: 'composição — organize ritmos e harmonias já montados',
    headingHint: 'salve blocos e organize-os no tempo (cada um dura N compassos)',
    col1Title: '1 · salvar blocos',
    col1Hint: 'capture o que você tem montado agora como um bloco reutilizável.',
    saveGroove: '💾 groove atual',
    saveHarmony: '💾 harmonia atual',
    saveSession: '💾 sessão atual',
    emptyBlocks: 'ainda não há blocos — salve um acima.',
    col2Title: '2 · linha do tempo',
    timelineHint:
      'faixas empilhadas = tocam ao mesmo tempo · blocos em fila = em sequência · arraste a borda direita para os compassos',
    addTrack: '+ faixa',
    // {N} interpolated — track number (1-indexed)
    trackLabel: 'faixa {N}',
    deleteTrackTitle: 'eliminar faixa',
    noBlocksHint: 'salve blocos acima',
    // "compassos" abbreviation after bars input
    barsUnit: 'comp.',
    play: '▶ tocar',
    pause: '⏸ pausa',
    stop: '■ stop',
    clearAll: 'limpar tudo',
    // {bar} and {total} interpolated
    playing: '▶ compasso {bar} / {total}',
    paused: '⏸ compasso {bar} / {total}',
    // {count} interpolated — plural rules vary by language
    trackSingular: '{count} faixa',
    trackPlural: '{count} faixas',
    barSingular: '{count} compasso',
    barPlural: '{count} compassos',
    blockTypeRhythm: 'ritmo',
    blockTypeHarmony: 'harmonia',
    blockTypeSession: 'sessão',
    addBlockOption: '＋ bloco…',
    // {type} and {name} interpolated
    addBlockEntry: '+ {type}: {name}',
    // "abrir no editor" button on block cards with snapshots
    openBlock: '✎ abrir',
    openBlockTip: 'Restaurar este bloco no editor para editá-lo',
    legacyBlockTip:
      'Criado antes de os snapshots editáveis estarem disponíveis. Pode ser reproduzido, mas não pode ser reaberto no editor.',
  },

  code: {
    // "Strudel" is [VERBATIM]
    heading: 'código Strudel',
    headingHint: 'o que está tocando agora — edite e execute',
    runNow: '▶ executar (agora)',
    queue: '↻ enfileirar (próximo ciclo)',
  },

  strip: {
    label: 'progressão',
    // "Tonnetz" is [VERBATIM]
    empty: 'toque acordes no Tonnetz…',
    restTitle: 'silêncio · ✕ para remover',
    resizeRestAria: 'Redimensionar duração do silêncio',
    chordTitle: 'manter e arrastar ↑↓ para o volume · clique para visualizar · ✕ para remover',
    resizeDurAria: 'Redimensionar duração',
    addRest: '+ silêncio',
  },

  session: {
    playing: {
      rhythm: 'Ritmo · groove',
      harmony: 'Harmonia · progressão',
      session: 'Sessão · ritmo + harmonia',
      // {k} and {n} interpolated; E(...) notation is [VERBATIM]
      preview: 'Prévia · E({k},{n})',
      editor: 'Editor',
      // {name} interpolated — block.name
      block: 'Bloco · {name}',
      composition: 'Composição',
      compositionPaused: 'Composição · pausa',
      agent: 'Código do agente',
    },
  },
};

export default pt;

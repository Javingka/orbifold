// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Chinese (中文) locale dictionary.
//
// ADR 0017 D2: must satisfy Dictionary and pass the key-parity test.
// Step 11.3: seeded with only the keys needed for the header language selector.
// Step 11.4: added all Wave A keys. Values that should be translated are marked
//            with "// TODO translate" so step 11.6 can find and replace them.
//            Keys that are [VERBATIM] (technical tokens, proper nouns) are kept
//            as-is with no TODO marker.
// Step 11.5: added all Wave B keys with Spanish stand-ins and // TODO translate markers.
// Step 11.6: replaced all // TODO translate markers with real Simplified Chinese translations.

import type { Dictionary } from '../types.js';

const zh: Dictionary = {
  common: {
    langLabel: '语言',
  },
  langs: {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    zh: '中文',
  },

  // ── Wave A (step 11.4) ───────────────────────────────────────────────────

  header: {
    tagline: '声音几何',
    brandTitle: '前往首页',
    nav: {
      harmony: '和声',
      rhythm: '节奏',
      composition: '编曲',
      // "Strudel" stays verbatim; only "Código" portion translates
      code: 'Strudel 代码',
    },
    rhythm: {
      morphLinear: '▭ 线性',
      morphRadial: '▭ 放射',
      morphTip: '在放射时钟与线性轨道之间切换，带动画过渡。',
      euclidLabel: '欧几里得轨道',
      euclidSectionTip:
        '欧几里得节奏：将 k 个击点尽可能均匀地分布在 n 个步骤中。世界各地众多节奏型的基础。',
      // sample codes bd/sd/hh/oh/cp/toms are [VERBATIM]
      soundTip: '此轨道的音色/采样（底鼓 bd、军鼓 sd、踩镲 hh/oh、拍掌 cp、通鼓 lt/mt/ht…）。',
      // E(k,n), E(3,8), E(5,8) are [VERBATIM]
      euclidInfoTip:
        'E(k,n)：将 k 个击点均匀分布在 n 个步骤中。例：E(3,8) = 三连音；E(5,8) = 五连音。',
      kTip: 'k = 要分布的击点（onset）数量。',
      nTip: 'n = 循环中的步骤（细分）数量。',
      // "rot" identifier is [VERBATIM]
      rotTip: 'rot = 旋转：将节奏型移动 r 步，改变起始拍点。',
      rotSliderTip: 'rot = 旋转：将节奏型移动 r 步。',
      previewTip: '在添加之前预听此欧几里得轨道。',
      stopLabel: '■ stop',
      listenLabel: '▶ 试听',
      addOrbitTip: '将此欧几里得轨道添加为新图层。',
      addOrbit: '+ 轨道',
      addEmptyTip: '添加一个空的 16 步图层供手动绘制。',
      addEmpty: '+ 空图层',
      sendBaseTitle: '将 groove 发送给 AI 代理作为节奏基底',
      sendBaseLabel: '📨 基底',
    },
    harmony: {
      // [VERBATIM] proper noun — kept identical in all languages
      subviewTonnetz: 'Tonnetz',
      // Musical term used across languages in music pedagogy — kept identical
      subviewStaff: 'Pentagrama',
      chordTip: '将和弦作为块演奏（所有音符同时发声）。',
      chordLabel: '◧ 和弦',
      arpTip: '分解和弦（音符依次演奏，时值按细分计算）。',
      arpLabel: '⋯ 琶音',
      sendMarcoTitle: '将调式 + 和弦进行发送给 AI 代理作为和声框架',
      sendMarcoLabel: '📨 框架',
      keyLabel: '调式',
      modeMajor: '大调',
      modeMinor: '小调',
      modeDorian: '多利亚调式',
      modePhrygian: '弗里几亚调式',
      modeLydian: '利底亚调式',
      modeMixolydian: '混合利底亚调式',
      modeLocrian: '洛克利亚调式',
      modeHarmonicMinor: '和声小调',
      // Sound attributes (ADR 0019, Phase 03 step 03.5 redesign)
      // Waveform technical tokens (sawtooth/sine/square/triangle/pink) are [VERBATIM] values
      // Preset tokens (piano/guitar/synth-bass) are [VERBATIM] technical tokens
      soundLabel: '音色',
      oscillatorLabel: '振荡器',
      instrLabel: '波形',
      instrSawtooth: '锯齿波',
      instrSine: '正弦波',
      instrSquare: '方波',
      instrTriangle: '三角波',
      instrNoise: '噪音',
      presetLabel: '预设',
      presetNone: '— 无 —',
      presetPiano: '钢琴',
      presetGuitar: '吉他',
      presetSynthBass: '合成贝斯',
      soundEditTip: '正在编辑所选和弦的音色。',
      soundIntentTip: '下一个添加的和弦将采用此音色。',
    },
    tutorialTitle: '使用指南',
    tutorialLabel: '教程',
  },

  app: {
    hint: {
      // P·L·R is [VERBATIM]
      tonnetz:
        '点击三角形选择和弦（▲ 大调 ▼ 小调）。您将看到其 P·L·R 相邻和弦及最小 voice-leading。下方选择播放内容。',
      staff:
        '3 个彩色声部——主音（橙色）、下属音（青色）、属音（粉色）。点击选择 · 拖动移位 · 右边缘调整时值。',
      // E(k,n) is [VERBATIM]
      rhythm: '选择 E(k,n) 并添加欧几里得轨道。右键单击轨道可将其静音。',
    },
    layerCtl: {
      ariaLabel: 'Layer controls',
      soloTitle: '独奏此图层',
      muteTitle: '静音（mute）',
      deleteTitle: '删除轨道',
      soloKey: 'S',
      muteKey: 'M',
    },
  },

  transport: {
    nowPlaying: {
      label: '正在播放',
      silencio: '静默',
    },
    engineLabel: '播放',
    // stack() is [VERBATIM]
    sessionPlayTitle: '将节奏 + 和声合并为一个 stack() 并一起播放',
    rhythmPlayTitle: '仅播放 groove（节奏引擎）',
    rhythmPlay: '▶ 节奏',
    harmonyPlayTitle: '仅播放和弦进行（和声引擎）',
    harmonyPlay: '▶ 和声',
    sessionPlay: '▶ 会话',
    sessionPlaySub: '节奏 + 和声',
    hush: '■ 静音',
    tapTitle: '跟随节拍点击以设置速度',
    tap: 'TAP',
  },

  latency: {
    widgetTitle: '若圆圈比声音提前或延迟，请在此调整',
    label: 'sync',
    decrementAria: '减少校准 10 ms',
    incrementAria: '增加校准 10 ms',
    resetAria: '将校准重置为 0',
    resetTitle: '重置为 0 ms',
  },

  legend: {
    tonic: '主音',
    subdom: '下属音',
    dominant: '属音',
    // ▲ and ▼ glyphs are [VERBATIM]
    triangles: '▲ 大三和弦 · ▼ 小三和弦',
    // P·L·R is [VERBATIM]
    plr: 'P·L·R 相邻和弦',
  },

  // ── Wave B (step 11.5) ───────────────────────────────────────────────────

  agent: {
    // ꩜ decorative glyph stays verbatim in all languages
    tabLabel: '꩜ AI 代理',
    panelTitle: '代理',
    closeTitle: '关闭面板',
    providerTitle: 'AI 提供商',
    modelPlaceholder: '模型',
    modelTitle: 'AI 模型',
    // API key label — [VERBATIM] in all languages per OQ-6
    keyTitle: 'API key',
    autoplay: '自动播放',
    autofix: '🔧 自动修复',
    inputPlaceholder: '请求一段伴奏、变奏或和弦进行…',
    sendTitle: '发送',
    runCodeLabel: '▶ 播放此段',
    quick: {
      grooveLabel: '🥁 Groove',
      // Agent prompt text — voice-leading [VERBATIM]
      groovePrompt: '创作一段包含底鼓、军鼓和踩镲的鼓 groove，使其与当前速度配合。',
      progressionLabel: '🎹 和弦进行',
      progressionPrompt: '创作一段 4 个和弦的进行，具有流畅的 voice-leading，调式由你来定。',
      bothLabel: '🎶 节奏 + 和声',
      bothPrompt: '创作一段 groove 和一段和弦进行，作为良好的音乐基底组合。',
      euclidLabel: '🌀 欧几里得',
      euclidPrompt: '创作一段具有非洲风格的欧几里得节奏层（底鼓和踩镲）。',
      variationLabel: '🔁 变奏',
      variationPrompt: '修改当前节奏，使其更有趣而不失节拍感。',
    },
    autofixLoading: '🔧 修复中…',
    autofixFailed: '⚠️ 无法从代理获取修复方案。',
    // {error} interpolated from Strudel runtime error string
    execError: '⚠️ 执行出错：{error}',
    execErrorGiveUp: '\n（多次尝试后仍无法修复，请在编辑器中手动检查）',
    execErrorEnableAutofix: '\n（请启用 🔧 自动修复）',
    // {languageName} interpolated — e.g. "español", "中文"
    languageDirective: '请用{languageName}回答。',
    autopilot: {
      btnOff: '自动演奏',
      btnOn: '自动演奏 ●',
      titleOff: '开启自动演奏',
      titleOn: '自动演奏运行中 — 点击停止',
      cyclesLabel: '循环',
      infoTooltip: '自动演奏：音频播放时，AI每N个循环自动演化节奏和和声。激活前请先设置N。',
      // Phase 06 step 06.3 — autopilot panel redesign keys // i18n-draft
      panelToggleLabel: '自动驾驶', // i18n-draft
      rhythmHintLabel: '节奏风格', // i18n-draft
      rhythmHintOther: '其他…', // i18n-draft
      rhythmHintPlaceholder: '— 无 —', // i18n-draft
      rhythmHintOtherPlaceholder: '描述节奏风格，例如：cueca chilena、bossa nova…', // i18n-draft
      playLabel: '▶ 开始', // i18n-draft
      stopLabel: '■ 停止', // i18n-draft
      progressTitle: '进化周期进度', // i18n-draft
      noKeyWarning: '在启动自动驾驶前，请配置 AI 服务、模型和 API 密钥。', // i18n-draft
      lagWarning: '跳过周期：AI 响应超过配置间隔。', // i18n-draft
      errorLlm: 'AI 服务错误：{error}', // i18n-draft
    },
    recipeCard: {
      // i18n-draft
      title: '已应用配方',
      rhythmLabel: '节奏',
      harmonyLabel: '和声',
      densityLabel: '密度',
      explanationLabel: '说明',
      clearTitle: '关闭',
    },
  },

  persistence: {
    btnTitle: '已保存的会话',
    panelTitle: '会话',
    closeTitle: '关闭面板',
    saveNamePlaceholder: '会话名称…',
    saveBtn: '💾 保存',
    emptyState: '暂无已保存的会话。',
    loadTitle: '加载会话',
    deleteTitle: '删除会话',
    shareBtn: '📤 分享链接',
    shareFeedback: '✓ 已复制',
  },

  composition: {
    heading: '编曲——整理已创建的节奏和和声',
    headingHint: '保存片段并在时间轴上排列（每个片段持续 N 小节）',
    col1Title: '1 · 保存片段',
    col1Hint: '将当前的内容捕获为可复用的片段。',
    saveGroove: '💾 当前 groove',
    saveHarmony: '💾 当前和声',
    saveSession: '💾 当前会话',
    emptyBlocks: '还没有片段——请在上方保存一个。',
    col2Title: '2 · 时间轴',
    timelineHint: '堆叠轨道 = 同时播放 · 依次排列的片段 = 按顺序播放 · 拖动右边缘调整小节数',
    addTrack: '+ 轨道',
    // {N} interpolated — track number (1-indexed)
    trackLabel: '轨道 {N}',
    deleteTrackTitle: '删除轨道',
    noBlocksHint: '请在上方保存片段',
    // "小节" abbreviation after bars input
    barsUnit: '节',
    play: '▶ 播放',
    pause: '⏸ 暂停',
    stop: '■ stop',
    clearAll: '清除全部',
    // {bar} and {total} interpolated
    playing: '▶ 第 {bar} / {total} 小节',
    paused: '⏸ 第 {bar} / {total} 小节',
    // {count} interpolated — Chinese has no grammatical plural
    trackSingular: '{count} 条轨道',
    trackPlural: '{count} 条轨道',
    barSingular: '{count} 小节',
    barPlural: '{count} 小节',
    blockTypeRhythm: '节奏',
    blockTypeHarmony: '和声',
    blockTypeSession: '会话',
    addBlockOption: '＋ 片段…',
    // {type} and {name} interpolated
    addBlockEntry: '+ {type}：{name}',
    // "在编辑器中打开" button on block cards with snapshots
    openBlock: '✎ 打开',
    openBlockTip: '将此片段恢复到编辑器中进行编辑',
    legacyBlockTip: '该片段在可编辑快照功能出现之前创建，可以播放，但无法在编辑器中重新打开。',
  },

  code: {
    // "Strudel" is [VERBATIM]
    heading: 'Strudel 代码',
    headingHint: '当前播放的内容——编辑并运行',
    runNow: '▶ 立即运行',
    queue: '↻ 排队（下一循环）',
  },

  strip: {
    label: '和弦进行',
    // "Tonnetz" is [VERBATIM]
    empty: '在 Tonnetz 上点击和弦…',
    restTitle: '休止 · ✕ 删除',
    resizeRestAria: '调整休止时值',
    chordTitle: '按住并上下拖动 ↑↓ 调整音量 · 点击预听 · ✕ 删除',
    resizeDurAria: '调整时值',
    addRest: '+ 休止',
  },

  session: {
    playing: {
      rhythm: '节奏 · groove',
      harmony: '和声 · 和弦进行',
      session: '会话 · 节奏 + 和声',
      // {k} and {n} interpolated; E(...) notation is [VERBATIM]
      preview: '预听 · E({k},{n})',
      editor: '编辑器',
      // {name} interpolated — block.name
      block: '片段 · {name}',
      composition: '编曲',
      compositionPaused: '编曲 · 暂停',
      agent: '代理代码',
    },
  },
};

export default zh;

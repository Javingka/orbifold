#!/usr/bin/env node
/**
 * Golden-value extractor for Phase 01 step 01.5 — codegen engine + composition model.
 *
 * Extracts pure functions from reference/orbifold.html (lines 592–593, 605–608,
 * 742, 746–773, 796–836, 1470–1476, 1931–1938, 2054–2065) and runs them
 * headless in Node to produce byte-exact golden values for tests/codegen.test.ts.
 *
 * Run: node scripts/extract-golden-01-5.mjs
 * Not committed to src/; no runtime dependency introduced.
 */

// ── Prototype prerequisites ────────────────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

const QUAL_INTERVALS = {
  maj: [0, 4, 7],
  min: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
};

// prototype lines 749–757 (chordVoicing — with explicit octave param)
function chordVoicing(rootPc, qual, octave) {
  return QUAL_INTERVALS[qual].map(iv => {
    const pc = (rootPc + iv) % 12;
    const o = octave + Math.floor((rootPc + iv) / 12);
    return NOTE_NAMES[pc] + o;
  });
}

// prototype lines 605–608 (tempoWrap)
function tempoWrap(code, bpm) {
  const cpm = bpm / 4;
  return `setcpm(${cpm.toFixed(4)})\n${code.trim()}`;
}

// prototype lines 758–763 (chordToStrudel — with explicit params)
function chordToStrudel(rootPc, qual, gain, chordMode, octave) {
  const notes = chordVoicing(rootPc, qual, octave);
  const g = (gain == null ? 0.6 : gain);
  const inner = (chordMode === 'chord') ? notes.join(',') : notes.join(' ');
  return `note("${inner}").s("sawtooth").lpf(1200).gain(${g.toFixed(2)}).room(0.25)`;
}

// prototype lines 765–773 (melodyLine — with explicit params)
function melodyLine(progression, chordMode, octave) {
  if (progression.length === 0) return '';
  const sep = (chordMode === 'chord') ? ',' : ' ';
  const seq = progression.map(ch =>
    '[' + chordVoicing(ch.rootPc, ch.qual, octave).join(sep) + ']').join(' ');
  const gains = progression.map(ch => (ch.gain == null ? 0.6 : ch.gain).toFixed(2)).join(' ');
  return `  note("<${seq}>").s("sawtooth").lpf(1200).gain("<${gains}>").room(0.3)`;
}

// prototype lines 796–811 (bjorklund)
function bjorklund(k, n) {
  k = Math.max(0, Math.min(n, k));
  if (k === 0) return new Array(n).fill(0);
  if (k === n) return new Array(n).fill(1);
  let a = [], b = [];
  for (let i = 0; i < k; i++) a.push([1]);
  for (let i = 0; i < n - k; i++) b.push([0]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length); const na = [], nb = [];
    for (let i = 0; i < m; i++) na.push(a[i].concat(b[i]));
    if (a.length > m) for (let i = m; i < a.length; i++) nb.push(a[i]);
    else for (let i = m; i < b.length; i++) nb.push(b[i]);
    a = na; b = nb;
  }
  return a.concat(b).flat();
}

// prototype line 812 (rotate)
function rotate(arr, r) {
  r = ((r % arr.length) + arr.length) % arr.length;
  return arr.slice(r).concat(arr.slice(0, r));
}

// prototype line 813 (stepsFromHits — with explicit totalSteps)
const RSTEPS = 16;
function stepsFromHits(hits, totalSteps = RSTEPS) {
  const s = new Array(totalSteps).fill(0);
  hits.forEach(h => { if (h >= 0 && h < totalSteps) s[h] = 1; });
  return s;
}

// prototype lines 820–823 (layerAudible — with explicit allLayers)
function layerAudible(layer, allLayers) {
  const anySolo = allLayers.some(x => x.solo);
  return !layer.muted && (!anySolo || layer.solo);
}

// prototype lines 824–830 (rhythmLayerLines single-layer body)
function rhythmLayerToStrudelLine(l) {
  if (l.euclid) return `  s("${l.sound}(${l.euclid})")`;
  const toks = l.steps.map(v => v ? l.sound : '~');
  return `  s("${toks.join(' ')}")`;
}

// prototype lines 833–836 (rhythmToStrudel — with explicit layers + audibleFn)
function rhythmToStrudel(layers, audibleFn = layerAudible) {
  const lines = [];
  layers.forEach(l => {
    if (!audibleFn(l, layers)) return;
    lines.push(rhythmLayerToStrudelLine(l));
  });
  return lines.length ? `stack(\n${lines.join(',\n')}\n)` : '';
}

// prototype lines 1470–1476 (buildSession — with explicit params)
function buildSession(layers, progression, chordMode, octave) {
  const lines = [];
  layers.forEach(l => {
    if (!layerAudible(l, layers)) return;
    lines.push(rhythmLayerToStrudelLine(l));
  });
  const mel = melodyLine(progression, chordMode, octave);
  if (mel) lines.push(mel);
  if (!lines.length) return '';
  return `// ── Sesión: ritmo + armonía (geometría) ──\nstack(\n${lines.join(',\n')}\n)`;
}

// prototype line 1936–1938 (stripComments)
function stripComments(code) {
  return code.split('\n').filter(l => !l.trim().startsWith('//')).join('\n').trim();
}

// prototype lines 2054–2065 (buildComposition — with explicit blocks + tracks)
function totalBars(tracks, blocks) {
  let max = 0;
  tracks.forEach(t => {
    let sum = 0;
    t.blocks.forEach(ref => {
      const b = blocks.find(x => x.id === ref.blockId);
      if (b) sum += ref.bars;
    });
    if (sum > max) max = sum;
  });
  return max;
}

function buildComposition(blocks, tracks) {
  const tb = totalBars(tracks, blocks);
  const pats = tracks.map(t => {
    const segs = []; let sum = 0;
    t.blocks.forEach(ref => {
      const b = blocks.find(x => x.id === ref.blockId);
      if (!b) return;
      segs.push(`  [${ref.bars}, ${b.code}]`);
      sum += ref.bars;
    });
    if (!segs.length) return null;
    if (sum < tb) segs.push(`  [${tb - sum}, silence]`);
    return `arrange(\n${segs.join(',\n')}\n)`;
  }).filter(Boolean);
  if (!pats.length) return '';
  return pats.length > 1
    ? `// ── Composición ──\nstack(\n${pats.join(',\n')}\n)`
    : `// ── Composición ──\n${pats[0]}`;
}

// ── Run and print golden values ────────────────────────────────────────────

console.log('=== tempoWrap ===');
const tw120 = tempoWrap('stack(\n  s("bd")\n)', 120);
console.log('tempoWrap(code, 120):', JSON.stringify(tw120));
const tw90 = tempoWrap('stack(\n  s("bd")\n)', 90);
console.log('tempoWrap(code, 90):', JSON.stringify(tw90));

console.log('\n=== chordToStrudel ===');
const ctsBlock = chordToStrudel(0, 'maj', null, 'chord', 3);
console.log('C maj block (null gain):', JSON.stringify(ctsBlock));
const ctsArp = chordToStrudel(0, 'maj', 0.8, 'arp', 3);
console.log('C maj arp (gain=0.8):', JSON.stringify(ctsArp));
const ctsAmin = chordToStrudel(9, 'min', null, 'chord', 3);
console.log('A min block (null gain):', JSON.stringify(ctsAmin));

console.log('\n=== melodyLine ===');
const mlEmpty = melodyLine([], 'chord', 3);
console.log('empty progression:', JSON.stringify(mlEmpty));
const mlTwo = melodyLine([{rootPc:0,qual:'maj'},{rootPc:9,qual:'min'}], 'chord', 3);
console.log('C maj + A min chord mode:', JSON.stringify(mlTwo));
const mlTwoArp = melodyLine([{rootPc:0,qual:'maj'},{rootPc:9,qual:'min'}], 'arp', 3);
console.log('C maj + A min arp mode:', JSON.stringify(mlTwoArp));

console.log('\n=== rhythmToStrudel ===');
const bdLayer = {sound:'bd', steps: stepsFromHits([0,8])};
const sdLayer = {sound:'sd', steps: stepsFromHits([4,12])};
const rtTwo = rhythmToStrudel([bdLayer, sdLayer], layerAudible);
console.log('BD+SD two-layer:', JSON.stringify(rtTwo));

const hhEuclid = {sound:'hh', euclid:'5,8', steps:[]};
const rtEuclid = rhythmToStrudel([hhEuclid], layerAudible);
console.log('HH euclid single:', JSON.stringify(rtEuclid));

// The exact fixture from phase spec: BD at 0,8 and SD at 4,12
const bdSpec = {sound:'bd', steps:[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]};
const sdSpec = {sound:'sd', steps:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]};
const rtSpec = rhythmToStrudel([bdSpec, sdSpec], layerAudible);
console.log('BD+SD spec fixture:', JSON.stringify(rtSpec));

console.log('\n=== buildSession ===');
const sessLayers = [
  {sound:'bd', steps:[1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0]},
  {sound:'sd', steps:[0,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0]},
];
const sessProg = [{rootPc:0, qual:'maj'}, {rootPc:7, qual:'maj'}];
const sessOut = buildSession(sessLayers, sessProg, 'chord', 3);
console.log('buildSession smoke:', JSON.stringify(sessOut));
const hasStack = sessOut.includes('stack(');
const hasHeader = sessOut.includes('// ── Sesión: ritmo + armonía (geometría) ──');
console.log('contains stack(:', hasStack, '| contains header:', hasHeader);

console.log('\n=== stripComments ===');
const sc = stripComments('// comment\nstack(\n  s("bd")\n)');
console.log('stripComments:', JSON.stringify(sc));

console.log('\n=== buildComposition ===');
// Both tracks 4 bars, no silence needed
const blocks2 = [
  {id:'b1', code:'s("bd")', bars:4},
  {id:'b2', code:'s("sd")', bars:4},
];
const tracks2 = [
  {id:'t0', blocks:[{blockId:'b1', bars:4}]},
  {id:'t1', blocks:[{blockId:'b2', bars:4}]},
];
const bc2 = buildComposition(blocks2, tracks2);
console.log('2 tracks, no padding:', JSON.stringify(bc2));

// Silence-padding case: track1 = 4 bars, track2 = 2 bars, total = 4
const blocksSilence = [
  {id:'b1', code:'s("bd")', bars:4},
  {id:'b2', code:'s("sd")', bars:2},
];
const tracksSilence = [
  {id:'t0', blocks:[{blockId:'b1', bars:4}]},
  {id:'t1', blocks:[{blockId:'b2', bars:2}]},
];
const bcSilence = buildComposition(blocksSilence, tracksSilence);
console.log('silence-padding case:', JSON.stringify(bcSilence));
console.log('contains silence:', bcSilence.includes('silence'));
console.log('contains [2, silence]:', bcSilence.includes('[2, silence]'));

// Single-track case (no stack wrapper)
const blocksSingle = [{id:'b1', code:'s("bd")', bars:4}];
const tracksSingle = [{id:'t0', blocks:[{blockId:'b1', bars:4}]}];
const bcSingle = buildComposition(blocksSingle, tracksSingle);
console.log('single track:', JSON.stringify(bcSingle));

// Empty case
const bcEmpty = buildComposition([], [{id:'t0', blocks:[]}]);
console.log('empty:', JSON.stringify(bcEmpty));

console.log('\n=== DONE ===');

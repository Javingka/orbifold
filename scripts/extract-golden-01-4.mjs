/**
 * Golden-value extraction script for Phase 01 step 01.4.
 * Extracts prototype bjorklund, rotate, stepsFromHits, layerAudible,
 * and rhythmLayerToStrudelLine from reference/orbifold.html and runs
 * them via Node to capture byte-exact expected values for tests.
 *
 * Run: node scripts/extract-golden-01-4.mjs
 * Not committed to src/; lives in scripts/ which is lint-excluded.
 */

import { readFileSync } from 'fs';

const html = readFileSync('reference/orbifold.html', 'utf8');

// ── Extract prototype functions (lines 796–836) ─────────────────────────────

const RSTEPS = 16;

// bjorklund (lines 796–811)
function bjorklund(k, n) {
  k = Math.max(0, Math.min(n, k));
  if (k === 0) return new Array(n).fill(0);
  if (k === n) return new Array(n).fill(1);
  let a = [], b = [];
  for (let i = 0; i < k; i++) a.push([1]);
  for (let i = 0; i < n - k; i++) b.push([0]);
  while (b.length > 1) {
    const m = Math.min(a.length, b.length);
    const na = [], nb = [];
    for (let i = 0; i < m; i++) na.push(a[i].concat(b[i]));
    if (a.length > m) for (let i = m; i < a.length; i++) nb.push(a[i]);
    else for (let i = m; i < b.length; i++) nb.push(b[i]);
    a = na; b = nb;
  }
  return a.concat(b).flat();
}

// rotate (line 812)
function rotate(arr, r) {
  r = ((r % arr.length) + arr.length) % arr.length;
  return arr.slice(r).concat(arr.slice(0, r));
}

// stepsFromHits (line 813) — with explicit totalSteps param (pure engine form)
function stepsFromHits(hits, totalSteps = RSTEPS) {
  const s = new Array(totalSteps).fill(0);
  hits.forEach(h => { if (h >= 0 && h < totalSteps) s[h] = 1; });
  return s;
}

// layerAudible (lines 820–823) — with explicit allLayers param (pure engine form)
function layerAudible(l, allLayers) {
  const anySolo = allLayers.some(x => x.solo);
  return !l.muted && (!anySolo || l.solo);
}

// rhythmLayerToStrudelLine — single-layer body of rhythmLayerLines (lines 826–830)
function rhythmLayerToStrudelLine(layer) {
  if (layer.euclid) return `  s("${layer.sound}(${layer.euclid})")`;
  const toks = layer.steps.map(v => v ? layer.sound : '~');
  return `  s("${toks.join(' ')}")`;
}

// ── Run all cases and print golden values ───────────────────────────────────

console.log('=== bjorklund golden values ===');
console.log('bjorklund(0,8):', JSON.stringify(bjorklund(0, 8)));
console.log('bjorklund(8,8):', JSON.stringify(bjorklund(8, 8)));
console.log('bjorklund(3,8):', JSON.stringify(bjorklund(3, 8)));   // tresillo
console.log('bjorklund(5,8):', JSON.stringify(bjorklund(5, 8)));   // cinquillo
console.log('bjorklund(2,5):', JSON.stringify(bjorklund(2, 5)));   // 2:5
console.log('bjorklund(4,4):', JSON.stringify(bjorklund(4, 4)));
console.log('bjorklund(1,4):', JSON.stringify(bjorklund(1, 4)));

console.log('\n=== rotate golden values ===');
const tresillo = bjorklund(3, 8);
console.log('tresillo:', JSON.stringify(tresillo));
console.log('rotate(tresillo, 0):', JSON.stringify(rotate(tresillo, 0)));
console.log('rotate(tresillo, 2):', JSON.stringify(rotate(tresillo, 2)));
console.log('rotate(tresillo, 8):', JSON.stringify(rotate(tresillo, 8)));  // full cycle = identity

console.log('\n=== stepsFromHits golden values ===');
console.log('stepsFromHits([0,4,8,12]):', JSON.stringify(stepsFromHits([0, 4, 8, 12])));
console.log('stepsFromHits([4,12]):', JSON.stringify(stepsFromHits([4, 12])));

console.log('\n=== layerAudible golden values ===');
// muted layer: should be false
const mutedLayer = { sound: 'bd', steps: [], muted: true };
const allMuted = [{ sound: 'bd', steps: [], muted: true }];
console.log('layerAudible(muted, [muted]):', layerAudible(mutedLayer, allMuted));

// solo layer: should be true
const soloLayer = { sound: 'bd', steps: [], solo: true };
const nonSoloLayer = { sound: 'sd', steps: [] };
const allSolo = [soloLayer, nonSoloLayer];
console.log('layerAudible(solo, [solo, nonSolo]):', layerAudible(soloLayer, allSolo));

// non-solo when another is solo: should be false
console.log('layerAudible(nonSolo, [solo, nonSolo]):', layerAudible(nonSoloLayer, allSolo));

// normal (no mute, no solo): should be true
const normalLayer = { sound: 'hh', steps: [] };
const allNormal = [{ sound: 'bd', steps: [] }, normalLayer];
console.log('layerAudible(normal, [normal, normal]):', layerAudible(normalLayer, allNormal));

console.log('\n=== rhythmLayerToStrudelLine golden values ===');
// euclid form
const euclidLayer = { sound: 'hh', euclid: '5,8', steps: [] };
console.log('euclid layer:', JSON.stringify(rhythmLayerToStrudelLine(euclidLayer)));

// explicit steps form — bd with two hits
const bdSteps = stepsFromHits([0, 8]);
const bdLayer = { sound: 'bd', steps: bdSteps };
console.log('bd explicit steps:', JSON.stringify(rhythmLayerToStrudelLine(bdLayer)));

// the phase file's illustrative case: steps=[1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0]
const phaseCaseLayer = { sound: 'bd', steps: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0] };
console.log('phase case bd:', JSON.stringify(rhythmLayerToStrudelLine(phaseCaseLayer)));

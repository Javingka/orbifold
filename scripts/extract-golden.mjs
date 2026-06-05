// Golden-value extractor for Phase 01 step 01.2
// Runs prototype's pure functions in Node to capture byte-exact outputs.
// Prototype source: reference/orbifold.html lines 592-593, 697-789, 1674-1681

// ── Pitch (lines 592-593, 1674-1681) ────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const NOTE_LOWER = ['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];

function noteToPc(name) {
  if (typeof name === 'number') return ((name % 12) + 12) % 12;
  const m = String(name).trim().match(/^([A-Ga-g])([#b♯♭]?)/);
  if (!m) return null;
  const base = {C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()];
  const acc = (m[2]==='#'||m[2]==='♯') ? 1 : (m[2]==='b'||m[2]==='♭') ? -1 : 0;
  return ((base + acc) % 12 + 12) % 12;
}

// ── Scales (lines 697-740) ───────────────────────────────────────────
const SCALE_INTERVALS = {
  'major':[0,2,4,5,7,9,11], 'dorian':[0,2,3,5,7,9,10], 'phrygian':[0,1,3,5,7,8,10],
  'lydian':[0,2,4,6,7,9,11], 'mixolydian':[0,2,4,5,7,9,10], 'minor':[0,2,3,5,7,8,10],
  'locrian':[0,1,3,5,6,8,10], 'harmonic:minor':[0,2,3,5,7,8,11],
};
const ROMAN = ['I','II','III','IV','V','VI','VII'];

// ── Chords (lines 703-710, 742-757) ─────────────────────────────────
function triadQuality(abs) {
  const t3 = (abs[1]-abs[0]+12)%12, t5 = (abs[2]-abs[0]+12)%12;
  if (t3===4 && t5===7) return 'maj';
  if (t3===3 && t5===7) return 'min';
  if (t3===3 && t5===6) return 'dim';
  if (t3===4 && t5===8) return 'aug';
  return '?';
}

// ── Tonal function (lines 711-716) ──────────────────────────────────
function tonalFunction(degree) {
  if ([0,2,5].includes(degree)) return {f:'T', label:'tónica', cls:'tonic'};
  if ([1,3].includes(degree))   return {f:'SD',label:'subdominante', cls:'subdom'};
  if ([4,6].includes(degree))   return {f:'D', label:'dominante', cls:'dom'};
  return {f:'', label:'', cls:''};
}

// computeDiatonic (lines 720-735) — passing root/mode explicitly (no globals)
function computeDiatonic(root, mode) {
  const ints = SCALE_INTERVALS[mode];
  if (ints.length !== 7) return [];
  const out = [];
  for (let deg = 0; deg < 7; deg++) {
    const abs = [ints[deg],
                 ints[(deg+2)%7] + ((deg+2)>=7?12:0),
                 ints[(deg+4)%7] + ((deg+4)>=7?12:0)];
    const qual = triadQuality(abs);
    const rootPc = (root + ints[deg]) % 12;
    const fn = tonalFunction(deg);
    const roman = (qual==='min'||qual==='dim') ? ROMAN[deg].toLowerCase() : ROMAN[deg];
    out.push({ degree:deg, rootPc, qual, roman: roman + (qual==='dim'?'°':'') + (qual==='aug'?'+':''), func:fn });
  }
  return out;
}

// diatonicLookup (lines 737-740) — passing root/mode explicitly
function diatonicLookup(root, mode) {
  const m = {};
  computeDiatonic(root, mode).forEach(d => { m[d.rootPc + ':' + d.qual] = d; });
  return m;
}

const QUAL_INTERVALS = { maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8] };

function chordLabel(rootPc, qual) {
  return NOTE_NAMES[rootPc] + (qual==='min'?'m':qual==='dim'?'°':qual==='aug'?'+':'');
}
function chordPcs(rootPc, qual) {
  return QUAL_INTERVALS[qual].map(iv => (rootPc+iv)%12);
}
// chordVoicing — octave passed explicitly (no global fallback)
function chordVoicing(rootPc, qual, octave) {
  const oct = octave;  // explicit, no || melState.octave
  return QUAL_INTERVALS[qual].map(iv => {
    const pc = (rootPc+iv)%12;
    const o  = oct + Math.floor((rootPc+iv)/12);
    return NOTE_NAMES[pc] + o;
  });
}

// ── Voice Leading (lines 777-789) ────────────────────────────────────
function circDelta(a, b) {
  let d = ((b - a + 18) % 12) - 6; return d;
}
function perms3() { return [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]]; }
function minimalVoiceLeading(pcsA, pcsB) {
  let best = null;
  perms3().forEach(p => {
    const moves = pcsA.map((a,i) => circDelta(a, pcsB[p[i]]));
    const size  = moves.reduce((s,m) => s+Math.abs(m), 0);
    if (!best || size < best.size) best = { moves, size, perm:p };
  });
  return best;
}

// ═══ GOLDEN VALUES ══════════════════════════════════════════════════
console.log('=== noteToPc ===');
console.log('noteToPc("C"):', noteToPc('C'));
console.log('noteToPc("C#"):', noteToPc('C#'));
console.log('noteToPc("Bb"):', noteToPc('Bb'));
console.log('noteToPc(12):', noteToPc(12));
console.log('noteToPc("invalid"):', noteToPc('invalid'));
console.log('noteToPc("A#"):', noteToPc('A#'));
console.log('noteToPc("Eb"):', noteToPc('Eb'));

console.log('\n=== circDelta ===');
console.log('circDelta(0,7):', circDelta(0,7));
console.log('circDelta(7,0):', circDelta(7,0));
console.log('circDelta(0,6):', circDelta(0,6));

console.log('\n=== minimalVoiceLeading ===');
// C major [0,4,7] -> C minor [0,3,7]: P transform
const r1 = minimalVoiceLeading([0,4,7], [0,3,7]);
console.log('C maj -> C min (P):', JSON.stringify(r1));

// C major [0,4,7] -> A minor [9,0,4]: R transform
const r2 = minimalVoiceLeading([0,4,7], [9,0,4]);
console.log('C maj -> A min (R):', JSON.stringify(r2));

// C major [0,4,7] -> F major [5,9,0]: subdominant
const r3 = minimalVoiceLeading([0,4,7], [5,9,0]);
console.log('C maj -> F maj (subdominant):', JSON.stringify(r3));

console.log('\n=== chordPcs ===');
console.log('chordPcs(0,"maj"):', JSON.stringify(chordPcs(0,'maj')));
console.log('chordPcs(9,"min"):', JSON.stringify(chordPcs(9,'min')));

console.log('\n=== chordVoicing (octave=3) ===');
console.log('chordVoicing(0,"maj",3):', JSON.stringify(chordVoicing(0,'maj',3)));
console.log('chordVoicing(9,"min",3):', JSON.stringify(chordVoicing(9,'min',3)));

console.log('\n=== diatonicLookup ===');
const lookup = diatonicLookup(0, 'major');
console.log('All keys:', Object.keys(lookup));
console.log('diatonicLookup(0,"major")["0:maj"].roman:', lookup['0:maj'].roman);
// Check what key "7:min" maps to — is it degree 4 (G)?
console.log('diatonicLookup(0,"major") all entries:');
Object.entries(lookup).forEach(([k,v]) => {
  console.log(' ', k, '->', JSON.stringify(v));
});

console.log('\n=== triadQuality ===');
console.log('triadQuality([0,4,7]):', triadQuality([0,4,7]));
console.log('triadQuality([0,3,7]):', triadQuality([0,3,7]));
console.log('triadQuality([0,3,6]):', triadQuality([0,3,6]));
console.log('triadQuality([0,4,8]):', triadQuality([0,4,8]));

console.log('\n=== tonalFunction ===');
for (let d = 0; d < 7; d++) {
  console.log(`tonalFunction(${d}):`, JSON.stringify(tonalFunction(d)));
}

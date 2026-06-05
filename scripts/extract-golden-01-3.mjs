// Golden-value extractor for Phase 01 step 01.3
// Runs prototype's pure functions in Node to capture byte-exact outputs.
// Prototype source: reference/orbifold.html lines 946–991, 1238–1249

// ── Prototype primitives needed ──────────────────────────────────────
const NOTE_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const QUAL_INTERVALS = { maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8] };

// ── tonnetzPc (prototype line 966) ───────────────────────────────────
function tonnetzPc(i, j) {
  return ((7*i + 4*j) % 12 + 12) % 12;
}

// ── nrLabel (prototype lines 1238–1249) ──────────────────────────────
function nrLabel(sr, sq, nr, nq) {
  if (sq === nq) return null;               // P/L/R always change mode
  if (nr === sr) return 'P';                // Parallel: same root, opposite mode
  if (sq === 'maj') {
    if (nr === (sr+9)%12) return 'R';       // Relative (C → Am)
    if (nr === (sr+4)%12) return 'L';       // Leading-tone exchange (C → Em)
  } else {
    if (nr === (sr+3)%12) return 'R';       // Relative (Am → C)
    if (nr === (sr+8)%12) return 'L';       // (Am → Ab)
  }
  return null;
}

// ═══ GOLDEN VALUES: tonnetzPc ════════════════════════════════════════
console.log('=== tonnetzPc (prototype line 966) ===');
console.log('tonnetzPc(0, 0):', tonnetzPc(0, 0));    // C at origin
console.log('tonnetzPc(1, 0):', tonnetzPc(1, 0));    // G
console.log('tonnetzPc(0, 1):', tonnetzPc(0, 1));    // E
console.log('tonnetzPc(-1, 0):', tonnetzPc(-1, 0));  // F (negative i)
console.log('tonnetzPc(2, -1):', tonnetzPc(2, -1));  // ?
console.log('tonnetzPc(1, 1):', tonnetzPc(1, 1));    // B
console.log('tonnetzPc(-1, 1):', tonnetzPc(-1, 1));  // ?

// Spot-check several known values
for (let i = -2; i <= 2; i++) {
  for (let j = -2; j <= 2; j++) {
    const pc = tonnetzPc(i, j);
    console.log(`tonnetzPc(${i},${j}) = ${pc} (${NOTE_NAMES[pc]})`);
  }
}

// ═══ GOLDEN VALUES: nrLabel ══════════════════════════════════════════
console.log('\n=== nrLabel (prototype lines 1238–1249) ===');

// P cases
console.log('nrLabel(0,"maj",0,"min"):', nrLabel(0,'maj',0,'min'));   // P: same root, opp mode
console.log('nrLabel(0,"min",0,"maj"):', nrLabel(0,'min',0,'maj'));   // P: C min → C maj

// R cases
console.log('nrLabel(0,"maj",9,"min"):', nrLabel(0,'maj',9,'min'));   // R: C maj → A min
console.log('nrLabel(0,"min",3,"maj"):', nrLabel(0,'min',3,'maj'));   // R: C min → Eb maj

// L cases
console.log('nrLabel(0,"maj",4,"min"):', nrLabel(0,'maj',4,'min'));   // L: C maj → E min
console.log('nrLabel(0,"min",8,"maj"):', nrLabel(0,'min',8,'maj'));   // L: C min → Ab maj

// null cases (same mode)
console.log('nrLabel(0,"maj",5,"maj"):', nrLabel(0,'maj',5,'maj'));   // null: same mode
console.log('nrLabel(0,"maj",7,"maj"):', nrLabel(0,'maj',7,'maj'));   // null: same mode
console.log('nrLabel(0,"min",9,"min"):', nrLabel(0,'min',9,'min'));   // null: same mode

// null case (different mode but no matching root offset)
console.log('nrLabel(0,"maj",1,"min"):', nrLabel(0,'maj',1,'min'));   // null: no match
console.log('nrLabel(0,"maj",6,"min"):', nrLabel(0,'maj',6,'min'));   // null: no match

// ═══ Verify triangle logic ════════════════════════════════════════════
console.log('\n=== Triangle rootPc derivation ===');
// Upward triangle at (i=0,j=0): A=(0,0), B=(1,0), C=(0,1) → rootPc = A.pc
const A_pc = tonnetzPc(0,0);
const B_pc = tonnetzPc(1,0);
const C_pc = tonnetzPc(0,1);
const D_pc = tonnetzPc(1,1);
console.log('A(0,0).pc:', A_pc, NOTE_NAMES[A_pc]);
console.log('B(1,0).pc:', B_pc, NOTE_NAMES[B_pc]);
console.log('C(0,1).pc:', C_pc, NOTE_NAMES[C_pc]);
console.log('D(1,1).pc:', D_pc, NOTE_NAMES[D_pc]);
console.log('Upward tri (A,B,C): rootPc = A.pc =', A_pc, '→ maj (C major: 0,4,7)');
console.log('Downward tri (B,C,D): rootPc = C.pc =', C_pc, '→ min (E minor: 4,7,11)');

// Verify downward triangle pcs = {B,C,D} pcs
const down_pcs_unordered = [B_pc, C_pc, D_pc].sort((a,b) => a-b);
console.log('Downward tri pcs (sorted):', down_pcs_unordered);
// E minor = [4, 7, 11] = [E, G, B]
const e_min_pcs = QUAL_INTERVALS['min'].map(iv => (C_pc + iv) % 12).sort((a,b) => a-b);
console.log('E minor pcs (sorted):', e_min_pcs);
console.log('Match:', JSON.stringify(down_pcs_unordered) === JSON.stringify(e_min_pcs));

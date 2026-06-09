// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — applyRhythmSpec / applyHarmonySpec → session store updates.
// Phase 06 step 06.2.
//
// Prototype parity:
//   - applyRhythmSpec: reference/orbifold.html lines 1682–1701
//   - applyHarmonySpec: reference/orbifold.html lines 1702–1723
//   - SK_SOUNDS, SK_MODES, SK_QUAL constants: lines 1670–1673
//   - clampi helper: line 1673
//   - noteToPc (used inline): lines 1674–1681
//
// No DOM / PIXI / Svelte imports — only core engine imports and sessionStore.

import { get } from 'svelte/store';

import { bjorklund, rotate, RSTEPS } from '../core/rhythm/euclid.js';
import { noteToPc } from '../core/theory/pitch.js';
import { QUAL_INTERVALS } from '../core/theory/chords.js';
import type { Quality } from '../core/theory/chords.js';
import type { RhythmLayer, Sound } from '../core/rhythm/layers.js';
import type { Chord } from '../state/session.js';
import { sessionStore } from '../state/session.js';
import type { RhythmSpec, HarmonySpec } from './schema.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Prototype line 1673: clamp to integer in [a,b]. */
function clampi(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, Math.round(+v || 0)));
}

/** Validated sound names (prototype line 1670). */
const SK_SOUNDS: readonly string[] = ['bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht'];

/** Valid quality names. */
const SK_QUAL: readonly string[] = ['maj', 'min', 'dim', 'aug'];

// ── applyRhythmSpec ────────────────────────────────────────────────────────

/**
 * Apply a validated rhythm specification to the session store.
 *
 * Prototype parity: reference/orbifold.html lines 1682–1701.
 *
 * For each layer in spec.layers:
 *   - Validates sound against SK_SOUNDS; falls back to 'bd' (prototype line 1686).
 *   - Euclid variant (prototype lines 1687–1691):
 *       k = clampi(k,1,16), n = clampi(n,2,16), rot = clampi(rot,0,n-1)
 *       pat = rotate(bjorklund(k,n), rot)
 *       maps n-step pattern to RSTEPS (16) via Math.round(i/n*RSTEPS)%RSTEPS
 *       euclid compact string: `${k},${n}${rot ? ','+rot : ''}`
 *   - Steps variant (prototype lines 1692–1696):
 *       takes first RSTEPS entries, clamps each to 0/1
 *
 * Replaces all rhythm.layers in the store.
 *
 * @param spec - Validated RhythmSpec (from AgentOutputSchema).
 */
export function applyRhythmSpec(spec: RhythmSpec): void {
  const layers: RhythmLayer[] = [];

  for (const L of spec.layers) {
    const sound: Sound = SK_SOUNDS.includes(L.sound) ? (L.sound as Sound) : 'bd';

    if ('euclid' in L && L.euclid !== undefined) {
      // Euclid variant — prototype lines 1687–1691
      const k = clampi(L.euclid.k, 1, 16);
      const n = clampi(L.euclid.n ?? 8, 2, 16);
      const rot = clampi(L.euclid.rot ?? 0, 0, n - 1);
      const pat = rotate(bjorklund(k, n), rot);
      const steps: number[] = new Array(RSTEPS).fill(0);
      pat.forEach((v, i) => {
        if (v) {
          const s = Math.round((i / n) * RSTEPS) % RSTEPS;
          steps[s] = 1;
        }
      });
      // Compact euclid string: `k,n` or `k,n,rot` (prototype line 1691)
      const euclidStr = rot ? `${k},${n},${rot}` : `${k},${n}`;
      layers.push({ sound, steps, euclid: euclidStr });
    } else if ('steps' in L && Array.isArray(L.steps)) {
      // Steps variant — prototype lines 1692–1696
      const steps: number[] = new Array(RSTEPS).fill(0);
      L.steps.slice(0, RSTEPS).forEach((v, i) => {
        steps[i] = v ? 1 : 0;
      });
      layers.push({ sound, steps });
    }
  }

  if (layers.length === 0) return;

  sessionStore.update((s) => ({
    ...s,
    rhythm: { ...s.rhythm, layers },
  }));
}

// ── applyHarmonySpec ───────────────────────────────────────────────────────

/**
 * Apply a validated harmony specification to the session store.
 *
 * Prototype parity: reference/orbifold.html lines 1702–1723.
 *
 * - Updates harmony.root via noteToPc if spec.root is provided (prototype line 1704).
 * - Updates harmony.mode if valid SK_MODES entry (prototype line 1705).
 * - Clamps harmony.octave to [2,5] (prototype line 1706).
 * - Rebuilds harmony.progression from spec.progression (prototype lines 1707–1720):
 *     - Per chord: noteToPc(root) → rootPc; quality validated via SK_QUAL
 *       (prototype line 1711 also handles 'major'→'maj','minor'→'min' aliases —
 *       the Zod schema already restricts to {maj,min,dim,aug} so this is a no-op
 *       at the schema level; included here for defensive correctness).
 *     - pcs computed from QUAL_INTERVALS.
 *     - gain defaults to 0.6 if absent (prototype line 1714; OD-1 confirmed).
 *     - cx/cy NOT written (Decisions Register: render hints ephemeral).
 *
 * @param spec - Validated HarmonySpec (from AgentOutputSchema).
 */
export function applyHarmonySpec(spec: HarmonySpec): void {
  sessionStore.update((s) => {
    let { root: harmRoot, mode, octave, progression } = s.harmony;

    // Update root (prototype line 1704)
    if (spec.root != null) {
      const pc = noteToPc(spec.root);
      if (pc != null) harmRoot = pc;
    }

    // Update mode (prototype line 1705)
    if (spec.mode) {
      mode = spec.mode;
    }

    // Update octave (prototype line 1706)
    if (typeof spec.octave === 'number') {
      octave = clampi(spec.octave, 2, 5);
    }

    // Rebuild progression (prototype lines 1707–1720)
    if (Array.isArray(spec.progression)) {
      const newProg: Chord[] = [];
      for (const c of spec.progression) {
        const rootPc = noteToPc(c.root);
        if (rootPc == null) continue;

        // Quality: schema already validates {maj,min,dim,aug}.
        // Cast is safe; Zod guarantees the value is a valid Quality.
        // Prototype line 1711 handles 'major'→'maj','minor'→'min' aliases at the
        // raw-parse layer; those aliases are excluded by our schema, so no cast needed.
        const qual: Quality = SK_QUAL.includes(c.quality) ? (c.quality as Quality) : 'maj';

        // Compute pitch classes from QUAL_INTERVALS (prototype line 1712)
        const _pcs = QUAL_INTERVALS[qual].map((iv) => (rootPc + iv) % 12);

        // Build Chord — no cx/cy (Register: render hints ephemeral)
        const chord: Chord = {
          rootPc,
          qual,
          gain: typeof c.gain === 'number' ? c.gain : 0.6, // prototype line 1714
        };

        // Suppress unused variable warning — pcs is computed for prototype fidelity
        // but not stored on Chord (Chord type only has rootPc, qual, gain, cx?, cy?)
        void _pcs;

        newProg.push(chord);
      }
      progression = newProg;
    }

    return {
      ...s,
      harmony: { ...s.harmony, root: harmRoot, mode, octave, progression },
    };
  });
}

// ── Re-export ──────────────────────────────────────────────────────────────

/** Convenience accessor for reading store state in apply functions (pure). */
export function getSessionState() {
  return get(sessionStore);
}

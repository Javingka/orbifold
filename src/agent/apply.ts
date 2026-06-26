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
import type { Chord, RestSlot, ProgressionSlot } from '../state/session.js';
import {
  sessionStore,
  clampBars,
  addBlock,
  renameBlock,
  addBlockAsNewTrack,
  setLastRecipeApplied,
} from '../state/session.js';
import type { RhythmSpec, HarmonySpec, SaveAsBlockSpec } from './schema.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Prototype line 1673: clamp to integer in [a,b]. */
function clampi(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, Math.round(+v || 0)));
}

/** Validated sound names (prototype line 1670). */
const SK_SOUNDS: readonly string[] = [
  'bd', 'sd', 'hh', 'oh', 'cp', 'rim', 'lt', 'mt', 'ht',
  'conga', 'cajon', 'wood', 'shaker',
  'cb', 'perc', 'hand',
];

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
 *       maps n-step pattern to a native n-length boolean array
 *       euclid compact string: `${k},${n}${rot ? ','+rot : ''}`
 *   - Steps variant (prototype lines 1692–1696):
 *       takes up to RSTEPS entries, preserving native length
 *
 * ## Lock-preservation (Phase 05 §4)
 *
 * When `opts?.force` is false/absent (the default — direct agent calls):
 *   - Reads currently locked layers from the session store before building the
 *     new layer array.
 *   - For each proposed layer whose sound matches a locked layer: SKIP it
 *     (the locked layer is preserved as-is).
 *   - After processing all proposed layers: prepend locked layers first so the
 *     cultural signature layers come before agent-added unlocked layers.
 *   - When no locked layers exist, behavior is identical to pre-Phase-05
 *     (full replace — backward-compatible).
 *
 * When `opts?.force === true` (recipe-application path only):
 *   - Skips the lock-preservation logic entirely; full replace of all layers.
 *   - Used by `applyRecipeById` in autopilot.ts to ensure a fresh recipe
 *     application replaces ALL layers (including locks from a previous recipe).
 *
 * @param spec - Validated RhythmSpec (from AgentOutputSchema).
 * @param opts - Optional parameters. `force: true` bypasses lock-preservation.
 */
export function applyRhythmSpec(spec: RhythmSpec, opts?: { force?: boolean }): void {
  // Any manual or agent-driven rhythm change invalidates the active recipe badge.
  // applyRecipeById re-sets it after calling this function (last write wins).
  setLastRecipeApplied(null);

  // Phase 05: read current locked layers before replacing (unless force mode).
  // Genre-agnostic: we only check the locked flag, not any genre name.
  const currentLayers = get(sessionStore).rhythm.layers;
  const lockedLayers = opts?.force ? [] : currentLayers.filter((l) => l.locked === true);
  const lockedSounds = new Set(lockedLayers.map((l) => l.sound));

  const newUnlockedLayers: RhythmLayer[] = [];

  for (const L of spec.layers) {
    const sound: Sound = SK_SOUNDS.includes(L.sound) ? (L.sound as Sound) : 'bd';

    // Phase 05: skip proposed layers whose sound is currently locked.
    if (lockedSounds.has(sound)) continue;

    if ('euclid' in L && L.euclid !== undefined) {
      // Euclid variant — prototype lines 1687–1691
      const k = clampi(L.euclid.k, 1, 16);
      const n = clampi(L.euclid.n ?? 8, 2, 16);
      const rot = clampi(L.euclid.rot ?? 0, 0, n - 1);
      const pat = rotate(bjorklund(k, n), rot);
      const steps: number[] = pat.map((v) => (v ? 1 : 0));
      // Compact euclid string: `k,n` or `k,n,rot` (prototype line 1691)
      const euclidStr = rot ? `${k},${n},${rot}` : `${k},${n}`;
      newUnlockedLayers.push({ sound, steps, euclid: euclidStr });
    } else if ('steps' in L && Array.isArray(L.steps)) {
      // Steps variant — prototype lines 1692–1696
      const steps: number[] = L.steps.slice(0, RSTEPS).map((v) => (v ? 1 : 0));
      newUnlockedLayers.push({ sound, steps });
    }
  }

  // Phase 05: locked layers first (cultural signature), then unlocked agent layers.
  // When no locked layers exist, finalLayers === newUnlockedLayers (full replace — backward-compat).
  const finalLayers: RhythmLayer[] = [...lockedLayers, ...newUnlockedLayers];

  if (finalLayers.length === 0) return;

  sessionStore.update((s) => ({
    ...s,
    rhythm: { ...s.rhythm, layers: finalLayers },
  }));
}

// ── applyLockedFlags ───────────────────────────────────────────────────────

/**
 * Stamp `locked: true` on session rhythm layers matching `lockedSounds`.
 *
 * Called by the recipe-application path after `applyRhythmSpec` to mark the
 * recipe's cultural signature layers. Genre-agnostic — receives a list of
 * Sound values, not genre names. Per Phase 05 §5 (Option B).
 *
 * Layers whose `sound` is NOT in `lockedSounds` are unchanged (locked remains
 * undefined or false). Layers already in the store with matching sounds get
 * `locked: true` stamped.
 *
 * @param lockedSounds - Sound values to mark as locked.
 */
export function applyLockedFlags(lockedSounds: Sound[]): void {
  const soundSet = new Set<Sound>(lockedSounds);
  sessionStore.update((state) => ({
    ...state,
    rhythm: {
      ...state.rhythm,
      layers: state.rhythm.layers.map((layer) =>
        soundSet.has(layer.sound) ? { ...layer, locked: true } : layer
      ),
    },
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
  // Any manual or agent-driven harmony change invalidates the active recipe badge.
  // applyRecipeById re-sets it after calling this function (last write wins).
  setLastRecipeApplied(null);

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
      const newProg: ProgressionSlot[] = [];
      for (const c of spec.progression) {
        // ADR 0012 Consequence 6: detect rest slot before calling noteToPc.
        // Without this guard, a rest entry { isRest: true } lacking 'root' would
        // have noteToPc(undefined) return null, silently dropping the rest.
        if ('isRest' in c && c.isRest === true) {
          const restSlot: RestSlot = { isRest: true };
          if (c.bars !== undefined) restSlot.bars = clampBars(c.bars);
          newProg.push(restSlot);
          continue;
        }

        // Chord slot: narrow to the chord variant (isRest absent).
        // c.root and c.quality are guaranteed by HarmonyChordCoreSchema validation.
        const rootPc = noteToPc((c as { root: string }).root);
        if (rootPc == null) continue;

        // Quality: schema already validates {maj,min,dim,aug}.
        // Cast is safe; Zod guarantees the value is a valid Quality.
        // Prototype line 1711 handles 'major'→'maj','minor'→'min' aliases at the
        // raw-parse layer; those aliases are excluded by our schema, so no cast needed.
        const cQuality = (c as { quality: string }).quality;
        const qual: Quality = SK_QUAL.includes(cQuality) ? (cQuality as Quality) : 'maj';

        // Compute pitch classes from QUAL_INTERVALS (prototype line 1712)
        const _pcs = QUAL_INTERVALS[qual].map((iv) => (rootPc + iv) % 12);

        // Build Chord — no cx/cy (Register: render hints ephemeral)
        const cBars = (c as { bars?: number }).bars;
        const chord: Chord = {
          rootPc,
          qual,
          gain:
            typeof (c as { gain?: number }).gain === 'number' ? (c as { gain: number }).gain : 0.6, // prototype line 1714
          ...(cBars !== undefined ? { bars: clampBars(cBars) } : {}),
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

// ── applyBlockSave ─────────────────────────────────────────────────────────

/**
 * Apply a saveAsBlock spec: capture current live state as a named block,
 * optionally add it to a new composition track.
 *
 * Must be called AFTER applyRhythmSpec and applyHarmonySpec so the snapshot
 * reflects the fully-applied agent state. Per ADR 0021 D3–D4.
 *
 * Internal call sequence (ADR 0021 D3):
 *   1. addBlock(spec.type)   — creates the block and captures the snapshot.
 *   2. get(sessionStore)     — read-back immediately after addBlock.
 *   3. Guard on empty blocks — early-return if addBlock no-op'd (empty code).
 *   4. finalName = spec.name.trim().slice(0, 100)  — OQ-2 truncation.
 *   5. renameBlock(newBlock.id, finalName)          — rename in store.
 *   6. if addToTrack === true → addBlockAsNewTrack(newBlock.id).
 *
 * @param spec - The validated SaveAsBlockSpec from AgentOutputSchema.
 */
export function applyBlockSave(spec: SaveAsBlockSpec): void {
  // Capture pre-call block count to detect addBlock no-op (empty code guard).
  const blockCountBefore = get(sessionStore).composition.blocks.length;

  // Step 1: delegate snapshot capture entirely to addBlock (ADR 0021 D3 binding).
  addBlock(spec.type);

  // Step 2: read back immediately (addBlock is synchronous, no interleaving).
  const state = get(sessionStore);

  // Step 3: guard — addBlock early-returns on empty code; detect by comparing count.
  // Using length === 0 is wrong when blocks already exist (would pick last pre-existing block).
  if (state.composition.blocks.length === blockCountBefore) return;
  const newBlock = state.composition.blocks[state.composition.blocks.length - 1];

  // Step 4: apply OQ-2 name truncation (no .max(100) in Zod — truncate here).
  const finalName = spec.name.trim().slice(0, 100);

  // Step 5: rename the block.
  renameBlock(newBlock.id, finalName);

  // Step 6: optionally add to a new track.
  if (spec.addToTrack === true) {
    addBlockAsNewTrack(newBlock.id);
  }
}

// ── applySampleMap ─────────────────────────────────────────────────────────

/**
 * Overlay strudelSample onto session rhythm layers using a recipe sampleMap
 * (ADR 0025 D3/D4). Genre-agnostic: receives a map of Sound→sampleName and
 * applies it by updating the session store.
 *
 * Called after applyRhythmSpec from the recipe-application path in autopilot.ts.
 * The genre→sample mapping is handed in as a parameter — this function contains
 * zero genre knowledge and no hardcoded sample map of its own.
 *
 * Layers whose Sound slot is absent from the map are returned unchanged
 * (strudelSample stays undefined). A recipe with no sampleMap (empty map)
 * leaves every layer untouched.
 *
 * @param map - Partial map from Sound slot → concrete Strudel sample name.
 */
export function applySampleMap(map: Partial<Record<string, string>>): void {
  sessionStore.update((state) => ({
    ...state,
    rhythm: {
      ...state.rhythm,
      layers: state.rhythm.layers.map((layer) => {
        const override = map[layer.sound];
        return override !== undefined ? { ...layer, strudelSample: override } : layer;
      }),
    },
  }));
}

// ── Re-export ──────────────────────────────────────────────────────────────

/** Convenience accessor for reading store state in apply functions (pure). */
export function getSessionState() {
  return get(sessionStore);
}

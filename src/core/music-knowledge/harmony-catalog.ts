// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Music Knowledge: Harmony Catalog
// Pure reference data. No DOM/PIXI/Svelte imports.
// No imports from src/agent/, src/state/, src/audio/, or src/lib/.

import { HARMONY_QUALITIES, type HarmonyQuality } from './rhythm-catalog.js';

// Re-export so callers can import both from this module if preferred.
export { HARMONY_QUALITIES, type HarmonyQuality };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single chord within a catalog harmony progression.
 *
 * Invariants (enforced by tests):
 *  - `root` ∈ NOTE_NAMES (C, C#, D, D#, E, F, F#, G, G#, A, A#, B)
 *  - `quality` ∈ HARMONY_QUALITIES (17-member OD-1 closed enum)
 *  - `bars` is a positive multiple of 0.25 (range [0.25, 8])
 */
export interface CatalogChord {
  /** Note name of the chord root. Must be in NOTE_NAMES. */
  root: string;
  /** Chord quality from the OD-1 17-member closed enum. */
  quality: HarmonyQuality;
  /** Duration in Strudel cycles; multiple of 0.25. */
  bars: number;
}

/**
 * A single harmony entry in the music-knowledge catalog.
 *
 * Invariants (enforced by tests):
 *  1. `id` is unique within HARMONY_CATALOG (kebab-case)
 *  2. `modeCenter` ∈ NOTE_NAMES
 *  3. `chordMode` is 'chord' or 'arp'
 *  4. `suggestedPreset` (when present) ∈ { 'piano', 'guitar', 'synth-bass' }
 *  5. `progression.length >= 1`
 *  6. Each chord in `progression` satisfies CatalogChord invariants
 */
export interface HarmonyEntry {
  /** Stable kebab-case unique identifier. */
  id: string;
  /** Human-readable entry name. */
  name: string;
  /** Descriptive tags for fuzzy query matching (e.g. 'minor', 'modal', 'jazz'). */
  tags: string[];
  /** Root note of the tonal center. Must be in NOTE_NAMES. */
  modeCenter: string;
  /** Whether chords sound as a block or arpeggiated. */
  chordMode: 'chord' | 'arp';
  /**
   * Optional preset suggestion. When present, must be one of the schema presets
   * per AgentOutputSchema §b.7: 'piano' | 'guitar' | 'synth-bass'.
   */
  suggestedPreset?: 'piano' | 'guitar' | 'synth-bass';
  /** Ordered chord progression. At least one chord required. */
  progression: CatalogChord[];
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Shorthand constructor for a catalog chord. */
function ch(root: string, quality: HarmonyQuality, bars: number): CatalogChord {
  return { root, quality, bars };
}

// ---------------------------------------------------------------------------
// HARMONY_CATALOG — ≥ 8 entries, musically coherent, culturally diverse
// ---------------------------------------------------------------------------

/**
 * Curated harmony catalog. 10 entries covering:
 *  - Latin/Afro-Cuban minor-dominant loop (7th chords)
 *  - Modal Dorian drone (sus/modal qualities)
 *  - Jazz ii-V-I in C major
 *  - Bossa Nova loop (7th/9th chords, arpeggiated)
 *  - Flamenco / Phrygian descent
 *  - Minor blues turnaround
 *  - West-African modal pentatonic drone
 *  - Pop I-V-vi-IV (major triads)
 *  - Gospel / Soul add9 progression
 *  - Bebop dim-passing chord sequence
 *
 * All entries are pure reference data; no Strudel code is emitted here.
 * Reconciliation to AgentOutputSchema quality vocabulary is deferred to
 * the future recipe→state phase under its own ADR (OD-1).
 */
export const HARMONY_CATALOG: HarmonyEntry[] = [
  // -------------------------------------------------------------------------
  // 1. Latin / Afro-Cuban minor-dominant loop
  // -------------------------------------------------------------------------
  {
    id: 'latin-minor-dominant-loop',
    name: 'Latin Minor-Dominant Loop',
    tags: ['latin', 'afro-cuban', 'minor', 'dominant', '7th', 'loop', 'groove'],
    modeCenter: 'C',
    chordMode: 'chord',
    suggestedPreset: 'piano',
    progression: [ch('D', 'm7', 1), ch('G', '7', 1), ch('C', 'maj7', 1), ch('A', '7', 1)],
  },

  // -------------------------------------------------------------------------
  // 2. Modal Dorian drone
  // -------------------------------------------------------------------------
  {
    id: 'dorian-modal-drone',
    name: 'Dorian Modal Drone',
    tags: ['modal', 'dorian', 'minor', 'sus', 'drone', 'meditative'],
    modeCenter: 'D',
    chordMode: 'chord',
    progression: [ch('D', 'min', 2), ch('F', 'maj', 1), ch('G', 'sus4', 1)],
  },

  // -------------------------------------------------------------------------
  // 3. Jazz ii-V-I in C major
  // -------------------------------------------------------------------------
  {
    id: 'jazz-ii-v-i-major',
    name: 'Jazz ii-V-I (C Major)',
    tags: ['jazz', 'major', 'ii-v-i', 'swing', '7th', 'bebop'],
    modeCenter: 'C',
    chordMode: 'chord',
    suggestedPreset: 'piano',
    progression: [ch('D', 'm7', 1), ch('G', '7', 1), ch('C', 'maj7', 2)],
  },

  // -------------------------------------------------------------------------
  // 4. Bossa Nova loop (arpeggiated, rich 7ths and 9ths)
  // -------------------------------------------------------------------------
  {
    id: 'bossa-nova-loop',
    name: 'Bossa Nova Loop',
    tags: ['bossa-nova', 'brazil', 'major', 'minor', '7th', '9th', 'jazz', 'latin'],
    modeCenter: 'G',
    chordMode: 'arp',
    suggestedPreset: 'guitar',
    progression: [ch('G', 'maj7', 1), ch('E', 'm7', 1), ch('A', 'm7', 1), ch('D', '7', 1)],
  },

  // -------------------------------------------------------------------------
  // 5. Flamenco / Phrygian descent (E Phrygian)
  // -------------------------------------------------------------------------
  {
    id: 'flamenco-phrygian-descent',
    name: 'Flamenco Phrygian Descent',
    tags: ['flamenco', 'phrygian', 'spain', 'minor', 'dominant', 'descending'],
    modeCenter: 'A',
    chordMode: 'chord',
    suggestedPreset: 'guitar',
    progression: [ch('A', 'min', 1), ch('G', 'maj', 1), ch('F', 'maj', 1), ch('E', 'maj', 1)],
  },

  // -------------------------------------------------------------------------
  // 6. Minor blues turnaround (A minor)
  // -------------------------------------------------------------------------
  {
    id: 'minor-blues-turnaround',
    name: 'Minor Blues Turnaround',
    tags: ['blues', 'minor', 'turnaround', '7th', 'dim', 'soul'],
    modeCenter: 'A',
    chordMode: 'chord',
    progression: [
      ch('A', 'm7', 1),
      ch('D', 'm7', 1),
      ch('E', '7', 0.5),
      ch('G#', 'dim7', 0.5),
      ch('A', 'm7', 1),
    ],
  },

  // -------------------------------------------------------------------------
  // 7. West-African modal / pentatonic drone
  // -------------------------------------------------------------------------
  {
    id: 'west-african-modal-drone',
    name: 'West-African Modal Drone',
    tags: ['west-african', 'modal', 'pentatonic', 'drone', 'sus', 'meditative', 'polyrhythm'],
    modeCenter: 'F',
    chordMode: 'chord',
    progression: [ch('F', 'sus2', 2), ch('C', 'sus4', 2)],
  },

  // -------------------------------------------------------------------------
  // 8. Pop I-V-vi-IV (C major)
  // -------------------------------------------------------------------------
  {
    id: 'pop-i-v-vi-iv',
    name: 'Pop I-V-vi-IV (C Major)',
    tags: ['pop', 'major', 'major-triad', 'minor-triad', 'four-chord', 'radio'],
    modeCenter: 'C',
    chordMode: 'chord',
    progression: [ch('C', 'maj', 1), ch('G', 'maj', 1), ch('A', 'min', 1), ch('F', 'maj', 1)],
  },

  // -------------------------------------------------------------------------
  // 9. Gospel / Soul add9 progression (D major)
  // -------------------------------------------------------------------------
  {
    id: 'gospel-soul-add9',
    name: 'Gospel Soul Add9',
    tags: ['gospel', 'soul', 'add9', 'major', 'minor', 'sus4', 'warmth'],
    modeCenter: 'D',
    chordMode: 'chord',
    suggestedPreset: 'piano',
    progression: [
      ch('D', 'add9', 1),
      ch('G', 'add9', 1),
      ch('B', 'min', 1),
      ch('A', 'sus4', 0.5),
      ch('A', 'maj', 0.5),
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Bebop diminished passing chord sequence (G bebop)
  // -------------------------------------------------------------------------
  {
    id: 'bebop-dim-passing',
    name: 'Bebop Diminished Passing',
    tags: ['bebop', 'jazz', 'diminished', 'passing', 'major', '7th', 'chromatic'],
    modeCenter: 'G',
    chordMode: 'arp',
    suggestedPreset: 'piano',
    progression: [
      ch('G', 'maj7', 1),
      ch('G#', 'dim7', 0.5),
      ch('A', 'm7', 0.5),
      ch('D', '7', 1),
      ch('G', 'maj7', 1),
    ],
  },
];

// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Music Knowledge: Rhythm-Harmony Recipes
// Pure reference data. No DOM/PIXI/Svelte imports.
// No imports from src/agent/, src/state/, src/audio/, or src/lib/.
//
// Each recipe binds one or more RHYTHM_CATALOG ids to one HARMONY_CATALOG id
// with musical metadata (bpmRange, meter, density, userIntents, agentInstruction).
//
// Referential integrity is verified by tests/music-knowledge/recipes.test.ts.
// The meter field must equal the meter of every referenced RHYTHM_CATALOG entry.
// Reconciliation to AgentOutputSchema is deferred to the future recipe→state phase.

import type { Sound } from '../rhythm/layers.js';

/**
 * A single self-contained layer in a multi-layer recipe declaration.
 *
 * The step pattern is embedded directly (binary/steps) so the recipe is
 * readable without looking up the rhythm catalog. `rhythmId` is an optional
 * cross-reference for traceability only — NOT used at runtime by
 * `recipeToAgentOutput`.
 *
 * When `layers` is present on a `MusicalRecipe`, `recipeToAgentOutput` reads
 * sound from `layers[i].sound` and pattern from `layers[i].binary` directly,
 * instead of the index-based `soundForIndex(i)` and catalog lookup.
 */
export interface RecipeLayer {
  /** Abstract sound role. Drives UI icon/color and audibility logic. */
  sound: Sound;
  /**
   * When true, this layer is part of the recipe's cultural signature.
   * After `applyRecipeById`, `applyLockedFlags` stamps `locked: true` on the
   * session layer with matching `sound`. Genre-agnostic plumbing; the lock
   * flag is declared here in the knowledge layer, propagated by apply.ts.
   */
  locked?: boolean;
  /** Binary step pattern string; length must equal `steps`. */
  binary: string;
  /** Total step count (12 for 6/8 compound, 16 for 4/4). */
  steps: number;
  /**
   * Optional Euclidean parameters — descriptive only. Present when the
   * pattern was derived from `bjorklund(k, n, rot)`. Not used at runtime;
   * the binary string is the authoritative pattern.
   */
  euclid?: { k: number; n: number; rot: number };
  /**
   * Inline sampleMap override (ADR 0025 D2 extension). When present,
   * replaces the top-level `sampleMap` entry for this layer's sound slot.
   * `recipeToAgentOutput` does NOT read this field — it is consumed only by
   * the `applySampleMap` call in the recipe-application path.
   */
  strudelSample?: string;
  /**
   * Optional cross-reference into RHYTHM_CATALOG. For traceability only.
   * NOT used at runtime by `recipeToAgentOutput`. When present, integrity
   * tests assert it resolves in the catalog.
   */
  rhythmId?: string;
}

/**
 * A recipe mapping a user intent to a combination of rhythm pattern(s) and
 * a harmony entry, with musical metadata for downstream use.
 *
 * Invariants (enforced by tests):
 *  1. Every `rhythmIds[i]` resolves to an existing id in RHYTHM_CATALOG.
 *  2. `harmonyId` resolves to an existing id in HARMONY_CATALOG.
 *  3. All recipe `id`s are unique.
 *  4. `userIntents.length >= 1`.
 *  5. `40 ≤ bpmRange[0] ≤ bpmRange[1] ≤ 240`.
 *  6. `meter` equals the `meter` field of every referenced RHYTHM_CATALOG entry.
 */
export interface MusicalRecipe {
  /** Stable kebab-case unique identifier. */
  id: string;
  /** Human-readable recipe name. */
  name: string;
  /**
   * Non-empty array of natural-language phrases a user might say to request
   * this recipe. Used by findRecipesForPrompt in query.ts.
   */
  userIntents: string[];
  /**
   * One or more rhythm catalog ids (≥1).
   * All must exist in RHYTHM_CATALOG.
   * All referenced entries must have the same `meter` as this recipe's `meter`.
   */
  rhythmIds: string[];
  /**
   * Exactly one harmony catalog id.
   * Must exist in HARMONY_CATALOG.
   */
  harmonyId: string;
  /**
   * Suggested BPM range [min, max].
   * Invariant: 40 ≤ min ≤ max ≤ 240.
   */
  bpmRange: [number, number];
  /**
   * Time signature string (e.g. '4/4', '12/8', '7/8').
   * Must equal the `meter` field of every rhythm entry in `rhythmIds`.
   */
  meter: string;
  /** Qualitative rhythmic density. */
  density: 'sparse' | 'medium' | 'dense';
  /**
   * Natural-language instruction the agent can use when applying this recipe.
   * Pure data — not an API call.
   */
  agentInstruction: string;
  /**
   * Optional map from abstract Sound slot → concrete Strudel sample name (ADR 0025 D2).
   * Present only on genre-specific recipes. Values must be verified against
   * the inventory §2 (live tidalcycles/Dirt-Samples strudel.json, 2026-06-23).
   * Generic / pop recipes leave this undefined.
   * Keys must be valid Sound values; values must appear in the verified sample list.
   */
  sampleMap?: Partial<Record<Sound, string>>;
  /**
   * Default tempo in cycles per minute (bars per minute in 4/4) when this
   * recipe is applied. Conversion to BPM: `bpm = defaultCpm * 4`.
   * When absent, tempo is unchanged on apply.
   * Invariant: value falls within `bpmRange` when converted
   * (`bpmRange[0] ≤ defaultCpm * 4 ≤ bpmRange[1]`). Enforced by recipe
   * integrity tests (Invariant 10 in recipes.test.ts).
   */
  defaultCpm?: number;
  /**
   * Optional multi-layer declaration. When present, supersedes `rhythmIds` for
   * sound assignment and pattern emission. Each RecipeLayer is self-contained:
   * the step pattern (binary/steps) is embedded directly so the recipe is
   * readable without looking up the rhythm catalog.
   *
   * Invariants (enforced by tests):
   *  7. Every `layers[i].sound` is a valid Sound value.
   *  8. `layers[i].binary.length === layers[i].steps`.
   *  9. If `layers[i].rhythmId` is present, it resolves in RHYTHM_CATALOG
   *     (optional cross-reference — not used at runtime).
   *
   * When present, `rhythmIds` must remain consistent:
   * `rhythmIds` equals `layers.map(l => l.rhythmId ?? '')`.
   *
   * Recipes without `layers` (the 13 existing recipes) use `rhythmIds` +
   * index-based sound assignment unchanged.
   */
  layers?: ReadonlyArray<RecipeLayer>;
}

// ---------------------------------------------------------------------------
// RHYTHM_HARMONY_RECIPES — ≥ 8 entries
//
// Coverage:
//  1. Afro-Cuban clave with minor-dominant harmony          (4/4, single rhythm)
//  2. West-African 12/8 bell with modal drone harmony       (12/8, single rhythm)
//  3. Bossa nova clave with bossa nova loop harmony         (4/4, single rhythm)
//  4. Dorian ritual sparse — Euclidean sparse with Dorian   (4/4, single rhythm)
//  5. Latin jazz — layered clave + cascara with ii-V-I      (4/4, two rhythms)
//  6. Pop/rock backbeat — layered snare + quarters with I-V-vi-IV (4/4, two rhythms)
//  7. Aksak odd-meter with Dorian modal harmony             (7/8, single rhythm)
//  8. West-African triplet groove — layered 12/8 bells      (12/8, two rhythms)
//  9. Rumba clave with minor blues turnaround               (4/4, single rhythm)
// 10. Gospel soul — Euclidean 16 with add9 harmony          (4/4, single rhythm)
// 11. Cueca chilena folk — 6/8 cueca with major folk harmony (6/8, single rhythm)
// 12. Samba afro-brasileiro — layered surdo + caixa          (4/4, two rhythms)
// 13. Buleria flamenca phrygian — 12/8 flamenco over descent (12/8, single rhythm)
// 14. Cumbia latina groove — cumbia caja over minor loop      (4/4, single rhythm)
// 15. Candombe dorian — Afro-Uruguayan chico over modal drone (4/4, single rhythm)
//
// Total: 15 recipes (Phase 05: +5 new entries from 10 original).
// ---------------------------------------------------------------------------

export const RHYTHM_HARMONY_RECIPES: MusicalRecipe[] = [
  // -------------------------------------------------------------------------
  // 1. Afro-Cuban clave / minor-dominant
  // -------------------------------------------------------------------------
  {
    id: 'afro-cuban-clave-minor',
    name: 'Afro-Cuban Clave — Minor-Dominant Loop',
    userIntents: [
      'afro-cuban groove',
      'clave minor',
      'latin minor feel',
      'son clave with minor chords',
      'cuban rhythm minor harmony',
      'salsa minor loop',
    ],
    rhythmIds: ['son-clave-3-2'],
    harmonyId: 'latin-minor-dominant-loop',
    bpmRange: [90, 140],
    meter: '4/4',
    density: 'medium',
    defaultCpm: 25, // 25 cpm × 4 = 100 BPM — within bpmRange [90, 140]
    agentInstruction:
      'Apply a son clave 3-2 timeline over a Latin minor-dominant chord loop ' +
      '(Dm7–G7–Cmaj7–A7). Keep the clave pattern as the anchor timeline; ' +
      'layer melodic fills against it. Suggested tempo: 100–130 BPM.',
    sampleMap: {
      bd: 'wood', // wood: FreePats Claves (CC0) — authentic clave idiophone
      hh: 'conga', // conga: FreePats Conga (CC0) — approximates tumbao membrane sound
    },
    // Phase 08: self-contained multi-layer declaration.
    // bd (son clave 3-2) LOCKED — the anchor timeline of Afro-Cuban music.
    // hh (conga tumbao) FREE — agent may vary for fills and variation.
    layers: [
      {
        sound: 'bd',
        binary: '1001001000101000', // son clave 3-2 — hits at 1,4,7,11,13 (1-indexed)
        steps: 16,
        locked: true, // son clave anchor — LOCKED
        rhythmId: 'son-clave-3-2',
        strudelSample: 'wood', // FreePats Claves (CC0)
      },
      {
        sound: 'hh',
        binary: '0101010110101010', // conga tumbao — open tones on 2,4,6,8,11,13,15 (1-indexed)
        steps: 16,
        locked: false, // tumbao fills — FREE
        strudelSample: 'conga', // FreePats Conga (CC0)
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 2. West-African 12/8 bell / modal drone
  // -------------------------------------------------------------------------
  {
    id: 'west-african-bell-modal',
    name: 'West-African Bell Pattern — Modal Drone',
    userIntents: [
      'west african bell',
      'african 12/8 feel',
      'bell pattern modal',
      'ewe bell drone',
      'afrobeat bell modal',
      'african polyrhythm modal',
      'west african ritual',
    ],
    rhythmIds: ['bell-pattern-west-african'],
    harmonyId: 'west-african-modal-drone',
    bpmRange: [60, 120],
    meter: '12/8',
    density: 'medium',
    agentInstruction:
      'Use the 7-onset West-African bell timeline (E(7,12)) in 12/8 ' +
      'over a suspended-chord modal drone (Fsus2–Csus4). ' +
      'Let the bell pattern drive forward motion while the harmony remains open and static. ' +
      'Suggested tempo: 70–100 BPM.',
    sampleMap: {
      bd: 'cb', // fallback: no native bell/agogo in @strudel/web@1.0.3
      hh: 'perc', // fallback: no native bell/agogo in @strudel/web@1.0.3
    },
  },

  // -------------------------------------------------------------------------
  // 3. Bossa nova / samba groove
  // -------------------------------------------------------------------------
  {
    id: 'bossa-nova-groove',
    name: 'Bossa Nova Groove',
    userIntents: [
      'bossa nova',
      'bossa groove',
      'samba bossa',
      'brazilian jazz',
      'bossa nova guitar',
      'gentle latin groove',
      'cool bossa',
    ],
    rhythmIds: ['bossa-nova-clave'],
    harmonyId: 'bossa-nova-loop',
    bpmRange: [100, 160],
    meter: '4/4',
    density: 'medium',
    defaultCpm: 32, // 32 cpm × 4 = 128 BPM — within bpmRange [100, 160]
    agentInstruction:
      'Play the bossa nova clave pattern over a Gmaj7–Em7–Am7–D7 arpeggio loop. ' +
      'Keep the harmony arpeggiated and light; the clave provides rhythmic forward motion. ' +
      'Suggested tempo: 120–140 BPM.',
    sampleMap: {
      bd: 'bd',
      hh: 'hand', // hand percussion approximates pandeiro — no native pandeiro in Dirt-Samples
    },
    // Phase 08: bossa nova clave locked; kick syncopation free.
    // Bossa nova clave: 6 onsets (vs son clave's 5); anticipation on step 9 =
    // 'and of beat 2 bar 2' — the bossa nova signature.
    layers: [
      {
        sound: 'bd',
        binary: '1001001010010010', // bossa nova clave: 6 onsets; step 9 anticipation = bossa signature
        steps: 16,
        locked: true, // bossa nova clave — cultural signature, LOCKED
        rhythmId: 'bossa-nova-clave',
      },
      {
        sound: 'hh',
        binary: '1000010010001001', // bossa kick syncopation — hits 1,6,9,13,16
        steps: 16,
        locked: false, // kick syncopation — FREE (agent may vary)
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 4. Dorian ritual / sparse Euclidean
  // -------------------------------------------------------------------------
  {
    id: 'dorian-ritual-sparse',
    name: 'Dorian Ritual — Sparse Euclidean',
    userIntents: [
      'dorian mode',
      'ritual drone',
      'sparse euclidean dorian',
      'meditative groove',
      'modal ritual',
      'hypnotic dorian',
      'minimal modal',
    ],
    rhythmIds: ['euclid-3-16'],
    harmonyId: 'dorian-modal-drone',
    bpmRange: [60, 110],
    meter: '4/4',
    density: 'sparse',
    agentInstruction:
      'Use a very sparse Euclidean pattern (E(3,16) — 3 hits per bar) ' +
      'over a Dorian modal drone (Dm–F–Gsus4). ' +
      'The long silences create meditative space; let the harmony breathe. ' +
      'Suggested tempo: 70–90 BPM.',
  },

  // -------------------------------------------------------------------------
  // 5. Latin jazz — clave + cascara layered, jazz ii-V-I
  // -------------------------------------------------------------------------
  {
    id: 'latin-jazz-clave-swing',
    name: 'Latin Jazz — Clave & Cascara over ii-V-I',
    userIntents: [
      'latin jazz',
      'jazz clave',
      'latin swing',
      'clave ii v i',
      'afro-cuban jazz',
      'cuban jazz harmony',
      'jazz latin groove',
      'cascara jazz',
    ],
    rhythmIds: ['son-clave-2-3', 'cascara-euclid'],
    harmonyId: 'jazz-ii-v-i-major',
    bpmRange: [120, 200],
    meter: '4/4',
    density: 'dense',
    defaultCpm: 42, // 42 cpm × 4 = 168 BPM — within bpmRange [120, 200]
    agentInstruction:
      'Layer son clave 2-3 as the anchor timeline with cascara (E(10,16)) ' +
      'as a higher-register shell pattern, over a jazz ii-V-I progression (Dm7–G7–Cmaj7). ' +
      'The clave grounds the groove while cascara provides energy and forward motion. ' +
      'Suggested tempo: 140–180 BPM.',
    sampleMap: {
      bd: 'bd',
      hh: 'cb', // fallback: no native cascara/timbale shell in @strudel/web@1.0.3
    },
    // Phase 08: both layers LOCKED — clave and cascara interlock as a unit.
    // son clave 2-3: two-side first. Cascara 2-3 orientation with halves swapped.
    layers: [
      {
        sound: 'bd',
        binary: '1000101001001000', // son clave 2-3 — two-side first
        steps: 16,
        locked: true, // clave anchor — LOCKED (interlocks with cascara)
        rhythmId: 'son-clave-2-3',
      },
      {
        sound: 'hh',
        binary: '0110101010101101', // cascara 2-3 — 3-2 cascara halves swapped to match 2-3 orientation
        steps: 16,
        locked: true, // cascara — LOCKED (interlocks with clave)
        rhythmId: 'cascara-euclid',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 6. Pop/rock backbeat — layered snare + quarters, I-V-vi-IV
  // -------------------------------------------------------------------------
  {
    id: 'pop-rock-backbeat',
    name: 'Pop/Rock Backbeat — I-V-vi-IV',
    userIntents: [
      'pop groove',
      'rock backbeat',
      'straight backbeat',
      'pop four chord',
      'rock rhythm',
      'simple pop beat',
      'radio friendly groove',
      'i v vi iv',
    ],
    rhythmIds: ['backbeat-snare', 'quarter-notes-16'],
    harmonyId: 'pop-i-v-vi-iv',
    bpmRange: [80, 160],
    meter: '4/4',
    density: 'medium',
    agentInstruction:
      'Layer a backbeat snare (beats 2 and 4) with steady quarter notes ' +
      'over the classic I-V-vi-IV progression (C–G–Am–F). ' +
      'Keep everything straight and driving; this is the universal pop template. ' +
      'Suggested tempo: 100–130 BPM.',
  },

  // -------------------------------------------------------------------------
  // 7. Aksak odd-meter / Dorian modal
  // -------------------------------------------------------------------------
  {
    id: 'aksak-dorian-odd',
    name: 'Aksak 7/8 — Dorian Modal',
    userIntents: [
      'aksak rhythm',
      'odd meter groove',
      '7/8 rhythm',
      'balkan groove',
      'turkish odd meter',
      'seven eight dorian',
      'aksak modal',
      'odd meter modal',
    ],
    rhythmIds: ['aksak-7-sparse'],
    harmonyId: 'dorian-modal-drone',
    bpmRange: [80, 160],
    meter: '7/8',
    density: 'sparse',
    agentInstruction:
      'Use the sparse aksak pattern (E(3,7) in 7/8) over a Dorian modal drone (Dm–F–Gsus4). ' +
      'The asymmetric meter creates tension; the open Dorian harmony provides modal character. ' +
      'Subdivide 7/8 as 3+4 or 4+3 depending on feel. ' +
      'Suggested tempo: 100–140 BPM.',
  },

  // -------------------------------------------------------------------------
  // 8. West-African triplet groove — layered 12/8 bell patterns
  // -------------------------------------------------------------------------
  {
    id: 'west-african-triplet-groove',
    name: 'West-African Triplet Groove — Layered 12/8',
    userIntents: [
      'african triplet groove',
      'layered bell patterns',
      'afrobeat 12/8',
      'west african polyrhythm',
      'compound meter groove',
      '12/8 african layered',
      'triplet feel groove',
      'west african bells layered',
    ],
    rhythmIds: ['sparse-bell-12', 'minimal-12'],
    harmonyId: 'west-african-modal-drone',
    bpmRange: [60, 110],
    meter: '12/8',
    density: 'medium',
    agentInstruction:
      'Layer a sparse 5-onset bell (E(5,12)) with a minimal 3-onset triplet bass ' +
      '(E(3,12)) in 12/8, over a suspended modal drone (Fsus2–Csus4). ' +
      'The two patterns create interlocking polyrhythm within the compound meter. ' +
      'Suggested tempo: 75–95 BPM.',
    sampleMap: {
      bd: 'cb', // fallback: no native bell/agogo in @strudel/web@1.0.3
      hh: 'perc', // fallback: no native bell/agogo in @strudel/web@1.0.3
    },
  },

  // -------------------------------------------------------------------------
  // 9. Rumba clave / minor blues turnaround
  // -------------------------------------------------------------------------
  {
    id: 'rumba-blues-minor',
    name: 'Rumba Clave — Minor Blues Turnaround',
    userIntents: [
      'rumba groove',
      'cuban rumba minor',
      'rumba blues',
      'minor blues clave',
      'afro-cuban blues',
      'rumba turnaround',
    ],
    rhythmIds: ['rumba-clave-3-2'],
    harmonyId: 'minor-blues-turnaround',
    bpmRange: [80, 140],
    meter: '4/4',
    density: 'medium',
    defaultCpm: 25, // 25 cpm × 4 = 100 BPM — within bpmRange [80, 140]
    agentInstruction:
      'Apply the rumba clave 3-2 timeline over a minor blues turnaround ' +
      '(Am7–Dm7–E7–G#dim7–Am7). The rumba clave sits back slightly relative to ' +
      'son clave; let the blues harmony provide emotional depth. ' +
      'Suggested tempo: 90–120 BPM.',
    sampleMap: {
      bd: 'wood', // wood: FreePats Claves (CC0) — authentic clave idiophone for the rumba clave pattern
    },
    // Phase 08: single locked layer.
    // KEY DIFFERENCE from son clave: step 7→8 (the 'drag' — third note delayed one 16th;
    // the defining rumba characteristic).
    layers: [
      {
        sound: 'bd',
        binary: '1001000100101000', // rumba clave 3-2 — hits 1,4,8,11,13 (KEY: step 7→8 = the 'drag')
        steps: 16,
        locked: true, // rumba clave anchor — LOCKED
        rhythmId: 'rumba-clave-3-2',
        strudelSample: 'wood', // FreePats Claves (CC0)
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 10. Gospel soul — Euclidean dense with add9 harmony
  // -------------------------------------------------------------------------
  {
    id: 'gospel-soul-euclid',
    name: 'Gospel Soul — Euclidean Dense with Add9',
    userIntents: [
      'gospel groove',
      'soul groove',
      'gospel soul feel',
      'add9 soul',
      'gospel rhythm',
      'soulful euclidean',
      'warm gospel',
    ],
    rhythmIds: ['euclid-9-16'],
    harmonyId: 'gospel-soul-add9',
    bpmRange: [70, 130],
    meter: '4/4',
    density: 'dense',
    agentInstruction:
      'Use a dense Euclidean pattern (E(9,16) — 9 hits per bar) over a gospel soul ' +
      'add9 progression (Dadd9–Gadd9–Bm–Asus4–A). ' +
      'The dense rhythm fills the space with energy; the add9 chords add warmth and color. ' +
      'Suggested tempo: 80–110 BPM.',
  },

  // -------------------------------------------------------------------------
  // 11. Cueca chilena folk — 6/8 compound meter, Chilean folk character
  // Phase 05: three-layer multi-layer recipe. Only bd (zapateado kick) is
  // LOCKED; cp (palmas) and hh (subdivision) are FREE for agent variation.
  // -------------------------------------------------------------------------
  {
    id: 'cueca-chilena-folk',
    name: 'Cueca Chilena — Chilean Folk (6/8)',
    userIntents: [
      'cueca',
      'cueca chilena',
      'chilean folk',
      'latin waltz',
      'south american folk',
      'cueca groove',
      '6/8 folk',
      'chilean dance',
    ],
    rhythmIds: ['cueca-chilena-base', 'cueca-palmas-12', 'cueca-subdivision-12'],
    harmonyId: 'pop-i-v-vi-iv',
    bpmRange: [100, 170],
    meter: '6/8',
    density: 'medium',
    defaultCpm: 40, // 40 cpm × 4 = 160 BPM — within bpmRange [100, 170]; cueca dance tempo
    agentInstruction:
      'Apply the cueca base pattern (E(4,12) in 6/8 — 4 evenly-spaced onsets) ' +
      'over a major I-V-vi-IV progression. The 6/8 compound meter gives the ' +
      'zapateado dance feel of Chilean cueca. ' +
      'Suggested tempo: 120–150 BPM.',
    // Phase 05: self-contained multi-layer declaration.
    // bd (zapateado kick) is LOCKED — defines the cueca identity.
    // cp (palmas) and hh (subdivision) are FREE layers — agent may vary them.
    // No sampleMap: cueca uses built-in sounds (cp = hand clap approximates palmas).
    layers: [
      {
        sound: 'bd',
        binary: '101000101000', // onsets 0,2,6,8 — cueca zapateado 6/8 feel (2+1+2+1 within 12 steps)
        steps: 12,
        locked: true, // zapateado kick — cultural signature, LOCKED
        rhythmId: 'cueca-chilena-base',
      },
      {
        sound: 'cp',
        binary: '000010000010',
        steps: 12,
        locked: false, // palmas — FREE (agent can vary)
        rhythmId: 'cueca-palmas-12',
      },
      {
        sound: 'hh',
        binary: '101010101010',
        steps: 12,
        euclid: { k: 6, n: 12, rot: 0 },
        locked: false, // 8th-note subdivision — FREE
        rhythmId: 'cueca-subdivision-12',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 12. Samba afro-brasileiro — layered surdo + tamborim, Latin minor
  // -------------------------------------------------------------------------
  {
    id: 'samba-afro-brasileiro',
    name: 'Samba Afro-Brasileiro — Surdo & Tamborim',
    userIntents: [
      'samba',
      'brazilian samba',
      'samba groove',
      'afro-brazilian rhythm',
      'samba beat',
      'surdo samba',
      'samba carnival',
      'samba drums',
    ],
    rhythmIds: ['samba-surdo-base', 'samba-caixa'],
    harmonyId: 'latin-minor-dominant-loop',
    bpmRange: [100, 160],
    meter: '4/4',
    density: 'dense',
    defaultCpm: 26, // 26 cpm × 4 = 104 BPM — within bpmRange [100, 160]
    agentInstruction:
      'Layer samba surdo bass (beats 1 and 3, 16-step) with samba caixa snare ' +
      '(syncopated 16th off-beats at steps 2, 6, 10, 14) over a Latin minor-dominant ' +
      'loop (Dm7–G7–Cmaj7–A7). The surdo/caixa interlock creates the authentic ' +
      'samba batucada feel. Suggested tempo: 120–145 BPM.',
    sampleMap: {
      bd: 'bd',
      hh: 'hand', // Phase 08 upgrade: sd → hand (pandeiro/tamborim approximation; hand confirmed in strudel.json Phase 03)
    },
    // Phase 08: both layers LOCKED — surdo + teleco-teco are the twin cultural signatures.
    // surdo: beats 1 and 3 (the 'call'); teleco-teco: 3-1-2-1 grouping — the SIGNATURE of samba.
    layers: [
      {
        sound: 'bd',
        binary: '1000000010000000', // surdo open: beats 1 and 3 (the 'call')
        steps: 16,
        locked: true, // surdo — cultural signature, LOCKED
        rhythmId: 'samba-surdo-base',
      },
      {
        sound: 'hh',
        binary: '1011010110110101', // tamborim teleco-teco: 3-1-2-1 grouping — SIGNATURE of samba
        steps: 16,
        locked: true, // teleco-teco — cultural signature, LOCKED
        rhythmId: 'samba-caixa',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 13. Bulería flamenca — 12/8 asymmetric flamenco over phrygian descent
  // -------------------------------------------------------------------------
  {
    id: 'buleria-flamenco-phrygian',
    name: 'Bulería Flamenca — Phrygian Descent (12/8)',
    userIntents: [
      'flamenco',
      'bulería',
      'buleria flamenco',
      'spanish rhythm',
      'flamenco groove',
      'flamenco dance',
      'andalusian rhythm',
      '12/8 flamenco',
    ],
    rhythmIds: ['buleria-12'],
    harmonyId: 'flamenco-phrygian-descent',
    bpmRange: [80, 160],
    meter: '12/8',
    density: 'dense',
    agentInstruction:
      'Use the bulería-inspired 12-step struct pattern (onsets at 0,4,5,7,9,10 — ' +
      'the characteristic asymmetric flamenco accent) over a Phrygian descent ' +
      '(Am–G–F–E). The off-center accents evoke the rasgueado feel of flamenco compás. ' +
      'Suggested tempo: 100–140 BPM.',
    sampleMap: {
      bd: 'cajon', // cajon: FreePats CajonFlamenco (CC0) — canonical flamenco percussion instrument
    },
  },

  // -------------------------------------------------------------------------
  // 14. Cumbia latina groove — Colombian-inspired caja + shaker over minor loop
  // Phase 05: two-layer multi-layer recipe. Both layers LOCKED.
  // bd (conga caja) + hh (shaker/guacharaca) are the cultural signatures.
  // -------------------------------------------------------------------------
  {
    id: 'cumbia-latina-groove',
    name: 'Cumbia Latina — Colombian Groove (4/4)',
    userIntents: [
      'cumbia',
      'colombian groove',
      'cumbia bass',
      'latin cumbia',
      'cumbia rhythm',
      'colombian latin',
      'cumbia beat',
      'tropical groove',
    ],
    rhythmIds: ['cumbia-caja', 'eighth-notes-16'],
    harmonyId: 'latin-minor-dominant-loop',
    bpmRange: [80, 130],
    meter: '4/4',
    density: 'medium',
    defaultCpm: 30, // 30 cpm × 4 = 120 BPM — within bpmRange [80, 130]; canonical Colombian cumbia tempo
    agentInstruction:
      'Apply the cumbia caja pattern (onsets at 0,3,6,8,12 — strong beat 1 with ' +
      'syncopated mid-section) over a Latin minor-dominant loop. The pattern ' +
      'evokes the driving bass drum feel of Colombian cumbia processions. ' +
      'Suggested tempo: 95–115 BPM.',
    sampleMap: {
      bd: 'conga', // conga: FreePats Conga (CC0) — closest available membrane drum to the cumbia caja
      hh: 'shaker', // shaker: FreePats EggShaker (CC0) — approximates the guacharaca scraper texture
    },
    // Phase 05: self-contained multi-layer declaration.
    // Both layers LOCKED — caja + guacharaca are the two cultural signatures of cumbia.
    layers: [
      {
        sound: 'bd',
        binary: '1000100010001000', // onsets 0,4,8,12 — cumbia kick on the beat (E(4,16,0))
        steps: 16,
        euclid: { k: 4, n: 16, rot: 0 },
        locked: true, // conga caja — cultural signature, LOCKED
        strudelSample: 'conga', // FreePats Conga (CC0)
        rhythmId: 'cumbia-caja',
      },
      {
        sound: 'hh',
        binary: '1011101110111011', // guacharaca pattern — rests on 2nd 16th of each beat (E(12,16,2))
        steps: 16,
        euclid: { k: 12, n: 16, rot: 2 },
        locked: true, // guacharaca/shaker — cultural signature, LOCKED
        strudelSample: 'shaker', // FreePats EggShaker (CC0)
        rhythmId: 'eighth-notes-16',
      },
    ],
  },

  // -------------------------------------------------------------------------
  // 15. Candombe dorian — Afro-Uruguayan chico drum over modal drone
  // -------------------------------------------------------------------------
  {
    id: 'candombe-dorian-groove',
    name: 'Candombe Dorian — Afro-Uruguayan Groove (4/4)',
    userIntents: [
      'candombe',
      'uruguayan groove',
      'afro-uruguayan rhythm',
      'rioplatense drums',
      'candombe beat',
      'afro latin groove',
      'candombe ritual',
      'uruguayan drums',
    ],
    rhythmIds: ['candombe-chico'],
    harmonyId: 'dorian-modal-drone',
    bpmRange: [70, 130],
    meter: '4/4',
    density: 'medium',
    agentInstruction:
      'Use the candombe chico pattern (6-onset syncopated 16-step struct inspired ' +
      'by the chico drum in Afro-Uruguayan candombe) over a Dorian modal drone ' +
      '(Dm–F–Gsus4). The driving syncopation contrasts with the open modal harmony. ' +
      'Suggested tempo: 85–110 BPM.',
    sampleMap: {
      bd: 'conga', // conga: FreePats Conga (CC0) — closest available to the Afro-Uruguayan candombe membrane drum
    },
  },
];

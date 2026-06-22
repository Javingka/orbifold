// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for EvolutionPlanSchema (ADR 0024 D1).
// Phase 07 step 07.2.

import { describe, it, expect } from 'vitest';
import { EvolutionPlanSchema } from '../src/agent/schema.js';

// ── helpers ────────────────────────────────────────────────────────────────

/** Minimal valid rhythm-only AgentOutput step. */
const RHYTHM_STEP = {
  rhythm: {
    layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
  },
};

/** Minimal valid harmony-only AgentOutput step. */
const HARMONY_STEP = {
  harmony: {
    progression: [{ root: 'C', quality: 'maj' }],
  },
};

/** Minimal valid musicalIntent-only AgentOutput step. */
const INTENT_STEP = {
  musicalIntent: {
    style: 'bossa nova',
  },
};

/** Minimal valid saveAsBlock-only AgentOutput step (schema valid; runtime ignores it per ADR 0024 D7). */
const SAVE_AS_BLOCK_STEP = {
  saveAsBlock: { name: 'My Block', type: 'sesion' as const },
};

// ── test suite ─────────────────────────────────────────────────────────────

describe('EvolutionPlanSchema', () => {
  // ── Valid cases ───────────────────────────────────────────────────────────

  it('accepts a valid plan with 1 rhythm-only step', () => {
    const result = EvolutionPlanSchema.safeParse({ plan: [RHYTHM_STEP] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toHaveLength(1);
    }
  });

  it('accepts a valid plan with 3 mixed steps (rhythm, harmony, musicalIntent)', () => {
    const result = EvolutionPlanSchema.safeParse({
      plan: [RHYTHM_STEP, HARMONY_STEP, INTENT_STEP],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toHaveLength(3);
    }
  });

  it('accepts a plan where a step contains only saveAsBlock (schema-valid; runtime ignores per ADR 0024 D7)', () => {
    // D7: saveAsBlock in a plan step is silently ignored at application time.
    // The schema itself accepts it — the runtime null-operation is enforced by tick().
    const result = EvolutionPlanSchema.safeParse({ plan: [SAVE_AS_BLOCK_STEP] });
    expect(result.success).toBe(true);
  });

  it('accepts a plan at the maximum of 8 steps', () => {
    const result = EvolutionPlanSchema.safeParse({
      plan: [
        RHYTHM_STEP,
        HARMONY_STEP,
        INTENT_STEP,
        RHYTHM_STEP,
        HARMONY_STEP,
        INTENT_STEP,
        RHYTHM_STEP,
        HARMONY_STEP,
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plan).toHaveLength(8);
    }
  });

  // ── Invalid cases ─────────────────────────────────────────────────────────

  it('rejects an empty plan array { plan: [] } (min(1) guard)', () => {
    const result = EvolutionPlanSchema.safeParse({ plan: [] });
    expect(result.success).toBe(false);
  });

  it('rejects a plan with 9 steps (exceeds max(8))', () => {
    const nineSteps = Array(9).fill(RHYTHM_STEP);
    const result = EvolutionPlanSchema.safeParse({ plan: nineSteps });
    expect(result.success).toBe(false);
  });

  it('rejects a step that is missing all required AgentOutput fields', () => {
    // An empty object {} satisfies none of rhythm, harmony, saveAsBlock, musicalIntent.
    // AgentOutputSchema.superRefine fires: "must have at least one of …".
    const result = EvolutionPlanSchema.safeParse({ plan: [{}] });
    expect(result.success).toBe(false);
  });
});

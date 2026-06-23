// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for sendEvolution() recipe wiring (Phase 03 step 03.4).
//
// Covers acceptance IDs A-03-06, A-03-07, A-03-08.
//
// ADR 0022 D3/D4 binding:
//   - sendEvolution() NEVER pushes to chatHistory.
//   - sendEvolution() NEVER calls applyBlockSave.
//
// Phase 03 step 03.4 binding:
//   - When musicalIntent.recipeId is present (no explicit rhythm/harmony), recipe
//     engine output is applied via applyRhythmSpec / applyHarmonySpec.
//   - When explicit rhythm is present alongside musicalIntent.recipeId, recipe rhythm
//     is NOT applied (explicit takes precedence).
//   - Unknown recipeId: no apply calls from recipe path.
//   - chatHistory is never mutated when musicalIntent path fires.
//
// Phase 07 step 07.3 update:
//   sendEvolution() now operates in PLAN MODE (ADR 0024 D1/D3).
//   It stores the received plan in AutopilotState; tick() applies individual
//   steps. Direct apply calls (applyRhythmSpec/applyHarmonySpec) now happen in
//   tick() (Phase 07.4). Tests updated accordingly:
//   - A-03-07: responses must use { "plan": [...] } format; assertions check
//     AutopilotState.currentPlan contents instead of direct apply call counts.
//   - A-03-06: SYSTEM_PROMPT_EVOLUTION prompt content assertions updated for
//     the plan-wrapper format (horizon-based example replaces single-step examples).
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// fetch is mocked globally.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ── Module mocks (declared before module imports that depend on them) ──────
//
// Mock apply.ts so we can spy on applyRhythmSpec and applyHarmonySpec without
// triggering real session store updates or codegen.
vi.mock('../src/agent/apply.js', () => ({
  applyRhythmSpec: vi.fn(),
  applyHarmonySpec: vi.fn(),
  applyBlockSave: vi.fn(),
}));

// Mock strudel.js (audio module) to prevent strudel.ts from triggering
// WebAudio API references that don't exist in Node. requeueLive() in session.ts
// dynamically imports strudel.js; this mock satisfies that import.
vi.mock('../src/audio/strudel.js', () => ({
  isPlaying: vi.fn().mockReturnValue(true),
  queueForNextCycle: vi.fn().mockResolvedValue(undefined),
  setTempo: vi.fn(),
}));

// Phase 07: sendEvolution() no longer calls playGroove/playProgression/playSession
// (plan is stored; tick() applies steps and triggers playback). The session.js mock
// from Phase 03 is retained but simplified — the actual session store functions are
// used as-is (the real module); only strudel.js audio stubs are needed.

// Mock providers.js: loadApiKey returns a valid key so sendEvolution does not
// early-exit. The provider adapter is set up to work with our fetch mock.
vi.mock('../src/agent/providers.js', () => ({
  PROVIDERS: {
    anthropic: {
      url: 'https://fake-api.test/v1/messages',
      defaultModel: 'claude-test',
      headers: () => ({ 'Content-Type': 'application/json' }),
      body: (model: string, system: string, messages: unknown[]) => ({
        model,
        system,
        messages,
        max_tokens: 1024,
      }),
      parse: (data: unknown) => {
        const d = data as Record<string, unknown>;
        const content = d.content as Array<{ text: string }>;
        return content?.[0]?.text ?? '';
      },
    },
  },
  loadApiKey: vi.fn().mockReturnValue('test-api-key'),
}));

// Mock i18n to avoid locale file I/O in Node tests.
vi.mock('../src/i18n/index.js', () => ({
  lang: {
    subscribe: vi.fn((cb: (v: string) => void) => {
      cb('es');
      return () => undefined;
    }),
    set: vi.fn(),
    update: vi.fn(),
  },
  t_raw: vi.fn().mockReturnValue(''),
}));

// ── Import after mocks ─────────────────────────────────────────────────────
import { get } from 'svelte/store';
import {
  sendEvolution,
  chatHistory,
  SYSTEM_PROMPT_EVOLUTION,
  tryParseSkill,
} from '../src/agent/agent.js';
import { applyRhythmSpec, applyHarmonySpec, applyBlockSave } from '../src/agent/apply.js';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session.js';
import { getExpressibleRecipes } from '../src/core/music-knowledge/recipe-engine.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build a minimal Anthropic-format response body that wraps a text response. */
function fakeApiResponse(text: string): Response {
  const body = JSON.stringify({
    content: [{ text }],
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Wrap agent JSON in a json fence, as an LLM would return. */
function jsonFence(obj: unknown): string {
  return '```json\n' + JSON.stringify(obj, null, 2) + '\n```';
}

/**
 * Build a plan-format response (Phase 07 plan mode).
 * sendEvolution() now expects { "plan": [...] } — a wrapper object per ADR 0024 D1.
 */
function fakePlanResponse(steps: unknown[]): Response {
  return fakeApiResponse(jsonFence({ plan: steps }));
}

// ── Stub fetch globally ────────────────────────────────────────────────────
// vi.spyOn(global, 'fetch') does not reliably intercept fetch calls from ESM
// modules in Vitest. Use vi.stubGlobal to replace globalThis.fetch before each
// test, and restore it after.

let fetchMock: ReturnType<typeof vi.fn>;

// ── Setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  // Reset session store to known, minimal state.
  sessionStore.set({
    ...DEFAULT_SESSION_STATE,
    rhythm: {
      layers: [
        {
          sound: 'bd' as const,
          steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        },
      ],
    },
  });

  // Reset spies on the mocked apply functions.
  vi.mocked(applyRhythmSpec).mockClear();
  vi.mocked(applyHarmonySpec).mockClear();
  vi.mocked(applyBlockSave).mockClear();

  // Stub globalThis.fetch so module-scope fetch calls are intercepted.
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  // Restore global stubs (fetch).
  vi.unstubAllGlobals();
  // NOTE: Do NOT call vi.restoreAllMocks() here — it would restore module mocks
  // (applyRhythmSpec, etc.) back to their original implementations.
  // Module mocks set via vi.mock() persist across tests within the same file
  // and are cleared per-test via vi.mocked(...).mockClear() in beforeEach.
});

// ── A-03-06: SYSTEM_PROMPT_EVOLUTION contains musicalIntent section ─────────
//
// Phase 07 update: the prompt now uses plan-mode format ({ "plan": [...] }).
// The example shows a 2-step plan (horizon=2) with both musicalIntent-only and
// rhythm+harmony+musicalIntent steps. Structural assertions updated accordingly.

describe('A-03-06: SYSTEM_PROMPT_EVOLUTION musicalIntent capability section', () => {
  it('A-03-06: prompt contains the musicalIntent field name', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('musicalIntent');
  });

  it('A-03-06: prompt contains recipeId reference', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('recipeId');
  });

  it('A-03-06: prompt explicitly forbids saveAsBlock', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('saveAsBlock');
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('NUNCA');
  });

  it('A-03-06: prompt contains at least one json fence (plan example)', () => {
    // Phase 07: prompt uses a compact plan example with at least one ```json fence.
    // (Phase 03 required ≥3 fences for single-step examples; plan mode condenses to
    // one multi-step example block to save tokens per ADR 0024 D5.)
    const fenceMatches = SYSTEM_PROMPT_EVOLUTION.match(/```json/g) ?? [];
    expect(fenceMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('A-03-06: plan example contains a "plan" array wrapper (ADR 0024 D1)', () => {
    // The example must show the { "plan": [...] } wrapper so the LLM learns the format.
    const exampleMatch = SYSTEM_PROMPT_EVOLUTION.match(/```json\s*([\s\S]*?)```/);
    expect(exampleMatch).not.toBeNull();
    if (!exampleMatch) return;
    const parsed = JSON.parse(exampleMatch[1]) as Record<string, unknown>;
    expect(parsed).toHaveProperty('plan');
    expect(Array.isArray(parsed.plan)).toBe(true);
  });

  it('A-03-06: plan example steps contain musicalIntent in at least one step', () => {
    const exampleMatch = SYSTEM_PROMPT_EVOLUTION.match(/```json\s*([\s\S]*?)```/);
    expect(exampleMatch).not.toBeNull();
    if (!exampleMatch) return;
    const parsed = JSON.parse(exampleMatch[1]) as { plan: Array<Record<string, unknown>> };
    const hasMusicalIntent = parsed.plan.some((step) => 'musicalIntent' in step);
    expect(hasMusicalIntent).toBe(true);
  });

  it('A-03-06: plan example contains a step with rhythm (multi-field evolution)', () => {
    const exampleMatch = SYSTEM_PROMPT_EVOLUTION.match(/```json\s*([\s\S]*?)```/);
    expect(exampleMatch).not.toBeNull();
    if (!exampleMatch) return;
    const parsed = JSON.parse(exampleMatch[1]) as { plan: Array<Record<string, unknown>> };
    const hasRhythm = parsed.plan.some((step) => 'rhythm' in step);
    expect(hasRhythm).toBe(true);
  });

  it('A-03-06: prompt instructions include complexity and explanation sub-fields', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('complexity');
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('explanation');
  });

  it('A-03-06: prompt mentions "horizon" field so LLM knows how many steps to return', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('horizon');
  });
});

// ── A-03-07: sendEvolution() recipe wiring (plan-mode, Phase 07) ────────────
//
// Phase 07 update: sendEvolution() stores the plan in AutopilotState;
// tick() applies individual steps (Phase 07.4). Recipe wiring (applyRhythmSpec /
// applyHarmonySpec) now happens in tick(), not in sendEvolution().
//
// These tests verify that recipe-containing plan steps are stored correctly in
// AutopilotState.currentPlan so that tick() can apply them. The apply function
// call assertions are replaced with store-state assertions.

describe('A-03-07: sendEvolution plan storage — recipe steps stored in currentPlan', () => {
  it('A-03-07a: musicalIntent.recipeId plan step stored in currentPlan (tick() will apply it)', async () => {
    const recipeStep = {
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        style: 'bossa nova',
        complexity: 'medium',
        explanation: 'Fitting the current groove.',
      },
    };

    fetchMock.mockResolvedValueOnce(fakePlanResponse([recipeStep]));

    await sendEvolution();

    // Plan stored in AutopilotState — tick() will resolve and apply the recipe.
    const { currentPlan, planIndex, llmError } = get(sessionStore).autopilot;
    expect(currentPlan).toHaveLength(1);
    expect(planIndex).toBe(0);
    expect(llmError).toBeNull();
    expect(currentPlan[0].musicalIntent?.recipeId).toBe('bossa-nova-groove');

    // sendEvolution() does NOT call apply functions — tick() does (Phase 07.4).
    expect(applyRhythmSpec).not.toHaveBeenCalled();
    expect(applyHarmonySpec).not.toHaveBeenCalled();
  });

  it('A-03-07b: explicit rhythm + musicalIntent.recipeId plan step — both stored in currentPlan', async () => {
    const explicitRhythm = {
      layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
    };
    const mixedStep = {
      rhythm: explicitRhythm,
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'Explicit rhythm takes precedence.',
      },
    };

    fetchMock.mockResolvedValueOnce(fakePlanResponse([mixedStep]));

    await sendEvolution();

    const { currentPlan, llmError } = get(sessionStore).autopilot;
    expect(currentPlan).toHaveLength(1);
    expect(llmError).toBeNull();
    // Both rhythm and musicalIntent stored — tick() will apply explicit rhythm first,
    // then skip recipe rhythm (ADR 0024 D7 / Phase 07.4 precedence logic).
    expect(currentPlan[0].rhythm).toBeDefined();
    expect(currentPlan[0].musicalIntent?.recipeId).toBe('bossa-nova-groove');

    // sendEvolution() does NOT call apply functions.
    expect(applyRhythmSpec).not.toHaveBeenCalled();
    expect(applyHarmonySpec).not.toHaveBeenCalled();
  });

  it('A-03-07c: nonexistent recipeId plan step — stored in currentPlan (tick() handles no-op gracefully)', async () => {
    const unknownStep = {
      musicalIntent: {
        recipeId: 'nonexistent-recipe-xyz',
        explanation: 'Unknown id — tick() will silently no-op.',
      },
    };

    fetchMock.mockResolvedValueOnce(fakePlanResponse([unknownStep]));

    await sendEvolution();

    const { currentPlan, llmError } = get(sessionStore).autopilot;
    expect(currentPlan).toHaveLength(1);
    expect(llmError).toBeNull();
    expect(currentPlan[0].musicalIntent?.recipeId).toBe('nonexistent-recipe-xyz');

    // sendEvolution() does NOT call apply functions.
    expect(applyRhythmSpec).not.toHaveBeenCalled();
    expect(applyHarmonySpec).not.toHaveBeenCalled();
  });

  it('A-03-07d: explicit harmony + musicalIntent plan step — stored in currentPlan', async () => {
    const explicitHarmony = {
      root: 'G',
      mode: 'minor',
      octave: 3,
      progression: [
        { root: 'G', quality: 'min', gain: 0.7 },
        { root: 'D', quality: 'maj', gain: 0.7 },
      ],
    };
    const harmonyStep = {
      harmony: explicitHarmony,
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'Explicit harmony takes precedence.',
      },
    };

    fetchMock.mockResolvedValueOnce(fakePlanResponse([harmonyStep]));

    await sendEvolution();

    const { currentPlan, llmError } = get(sessionStore).autopilot;
    expect(currentPlan).toHaveLength(1);
    expect(llmError).toBeNull();
    expect(currentPlan[0].harmony).toBeDefined();
    expect(currentPlan[0].musicalIntent?.recipeId).toBe('bossa-nova-groove');

    // sendEvolution() does NOT call apply functions.
    expect(applyHarmonySpec).not.toHaveBeenCalled();
    expect(applyRhythmSpec).not.toHaveBeenCalled();
  });
});

// ── A-03-08: chatHistory never mutated by sendEvolution ───────────────────

describe('A-03-08: chatHistory invariant — sendEvolution never pushes to chatHistory', () => {
  it('A-03-08a: chatHistory.length unchanged after sendEvolution with musicalIntent plan step', async () => {
    fetchMock.mockResolvedValueOnce(
      fakePlanResponse([{ musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' } }])
    );

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08b: chatHistory.length unchanged after sendEvolution with explicit rhythm/harmony plan step', async () => {
    fetchMock.mockResolvedValueOnce(
      fakePlanResponse([
        {
          rhythm: {
            layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
          },
        },
      ])
    );

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08c: chatHistory.length unchanged with nonexistent recipeId plan step', async () => {
    fetchMock.mockResolvedValueOnce(
      fakePlanResponse([{ musicalIntent: { recipeId: 'nonexistent-recipe-xyz' } }])
    );

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08d: applyBlockSave NEVER called by sendEvolution — plan-mode stores, tick() applies (ADR 0022 D4)', async () => {
    // sendEvolution() stores the plan; it never calls applyBlockSave.
    // tick() also ignores saveAsBlock in plan steps (ADR 0024 D7).
    fetchMock.mockResolvedValueOnce(
      fakePlanResponse([
        {
          musicalIntent: { recipeId: 'bossa-nova-groove' },
          saveAsBlock: { name: 'Sneaky Block', type: 'sesion' },
        },
      ])
    );

    await sendEvolution();

    expect(applyBlockSave).not.toHaveBeenCalled();
  });
});

// ── A-03-07 supporting: getExpressibleRecipes sanity ─────────────────────

describe('A-03-07 supporting: getExpressibleRecipes available to sendEvolution', () => {
  it('getExpressibleRecipes returns a non-empty list (sendEvolution always has recipe ids)', () => {
    const expressible = getExpressibleRecipes();
    expect(expressible.length).toBeGreaterThan(0);
  });

  it('bossa-nova-groove is in getExpressibleRecipes (used in test cases)', () => {
    const ids = getExpressibleRecipes().map((r) => r.id);
    expect(ids).toContain('bossa-nova-groove');
  });
});

// ── tryParseSkill direct tests (supporting) ───────────────────────────────

describe('tryParseSkill — musicalIntent-only response parsing', () => {
  it('tryParseSkill returns non-null for a musicalIntent-only JSON fence', () => {
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        complexity: 'medium',
      },
    });
    const result = tryParseSkill(responseText);
    expect(result).not.toBeNull();
    expect(result?.musicalIntent?.recipeId).toBe('bossa-nova-groove');
  });

  it('tryParseSkill returns non-null for an explicit rhythm JSON fence', () => {
    const responseText = jsonFence({
      rhythm: {
        layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
      },
    });
    const result = tryParseSkill(responseText);
    expect(result).not.toBeNull();
    expect(result?.rhythm).toBeDefined();
  });

  it('tryParseSkill returns null for a response with none of the required fields', () => {
    const responseText = jsonFence({
      note: 'just a note, no rhythm/harmony/saveAsBlock/musicalIntent',
    });
    const result = tryParseSkill(responseText);
    expect(result).toBeNull();
  });
});

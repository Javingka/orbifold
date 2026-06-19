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
import {
  sendEvolution,
  chatHistory,
  SYSTEM_PROMPT_EVOLUTION,
  tryParseSkill,
} from '../src/agent/agent.js';
import { applyRhythmSpec, applyHarmonySpec, applyBlockSave } from '../src/agent/apply.js';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session.js';
import { getRecipeById } from '../src/core/music-knowledge/query.js';
import {
  recipeToAgentOutput,
  getExpressibleRecipes,
} from '../src/core/music-knowledge/recipe-engine.js';

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

  it('A-03-06: prompt contains at least three json fences (two new examples + one pre-existing)', () => {
    // The prompt must have two musicalIntent examples (ADR 0021 D5 requirement).
    // The pre-existing before→after example adds one more, for at least 3 total.
    const fenceMatches = SYSTEM_PROMPT_EVOLUTION.match(/```json/g) ?? [];
    expect(fenceMatches.length).toBeGreaterThanOrEqual(3);
  });

  it('A-03-06: Ejemplo 1 is a musicalIntent-only response (no rhythm/harmony sibling keys)', () => {
    const example1Match = SYSTEM_PROMPT_EVOLUTION.match(/Ejemplo 1[\s\S]*?```json\s*([\s\S]*?)```/);
    expect(example1Match).not.toBeNull();
    if (!example1Match) return; // type guard — already asserted above
    const example1 = example1Match[1];
    const parsed = JSON.parse(example1) as Record<string, unknown>;
    expect(parsed).toHaveProperty('musicalIntent');
    expect(parsed).not.toHaveProperty('rhythm');
    expect(parsed).not.toHaveProperty('harmony');
  });

  it('A-03-06: Ejemplo 2 contains both rhythm/harmony and musicalIntent', () => {
    const example2Match = SYSTEM_PROMPT_EVOLUTION.match(/Ejemplo 2[\s\S]*?```json\s*([\s\S]*?)```/);
    expect(example2Match).not.toBeNull();
    if (!example2Match) return; // type guard — already asserted above
    const example2 = example2Match[1];
    const parsed = JSON.parse(example2) as Record<string, unknown>;
    expect(parsed).toHaveProperty('musicalIntent');
    expect(parsed).toHaveProperty('rhythm');
    expect(parsed).toHaveProperty('harmony');
  });

  it('A-03-06: prompt instructions include complexity and explanation sub-fields', () => {
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('complexity');
    expect(SYSTEM_PROMPT_EVOLUTION).toContain('explanation');
  });
});

// ── A-03-07: sendEvolution() recipe wiring ────────────────────────────────

describe('A-03-07: sendEvolution recipe wiring', () => {
  it('A-03-07a: musicalIntent.recipeId only — applyRhythmSpec and applyHarmonySpec called with engine output', async () => {
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        style: 'bossa nova',
        complexity: 'medium',
        explanation: 'Fitting the current groove.',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    await sendEvolution();

    // Both apply functions should be called exactly once (from the recipe engine).
    expect(applyRhythmSpec).toHaveBeenCalledTimes(1);
    expect(applyHarmonySpec).toHaveBeenCalledTimes(1);

    // The arguments should match what the recipe engine produces.
    const recipe = getRecipeById('bossa-nova-groove');
    expect(recipe).not.toBeUndefined();
    if (!recipe) return; // type guard — already asserted above
    const engineOutput = recipeToAgentOutput(recipe);
    expect(engineOutput).not.toBeNull();
    if (!engineOutput) return; // type guard — already asserted above
    expect(applyRhythmSpec).toHaveBeenCalledWith(engineOutput.rhythm);
    expect(applyHarmonySpec).toHaveBeenCalledWith(engineOutput.harmony);
  });

  it('A-03-07b: explicit rhythm + musicalIntent.recipeId — explicit rhythm applied; recipe rhythm NOT applied', async () => {
    const explicitRhythm = {
      layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
    };
    const responseText = jsonFence({
      rhythm: explicitRhythm,
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'Explicit rhythm takes precedence.',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    await sendEvolution();

    // applyRhythmSpec called exactly once (explicit rhythm).
    // Recipe rhythm should NOT be applied (explicit takes precedence).
    expect(applyRhythmSpec).toHaveBeenCalledTimes(1);

    // applyHarmonySpec called once from the recipe engine (no explicit harmony supplied).
    expect(applyHarmonySpec).toHaveBeenCalledTimes(1);
  });

  it('A-03-07c: nonexistent recipeId — no apply calls from recipe path (graceful no-op)', async () => {
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'nonexistent-recipe-xyz',
        explanation: 'Unknown id.',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    await sendEvolution();

    // Neither apply function should be called — recipe path silently no-ops.
    expect(applyRhythmSpec).not.toHaveBeenCalled();
    expect(applyHarmonySpec).not.toHaveBeenCalled();
  });

  it('A-03-07d: explicit harmony + musicalIntent.recipeId — explicit harmony takes precedence; recipe harmony NOT applied', async () => {
    const explicitHarmony = {
      root: 'G',
      mode: 'minor',
      octave: 3,
      progression: [
        { root: 'G', quality: 'min', gain: 0.7 },
        { root: 'D', quality: 'maj', gain: 0.7 },
      ],
    };
    const responseText = jsonFence({
      harmony: explicitHarmony,
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'Explicit harmony takes precedence.',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    await sendEvolution();

    // applyHarmonySpec called once (explicit only).
    expect(applyHarmonySpec).toHaveBeenCalledTimes(1);

    // applyRhythmSpec called once from recipe engine (no explicit rhythm).
    expect(applyRhythmSpec).toHaveBeenCalledTimes(1);
  });
});

// ── A-03-08: chatHistory never mutated by sendEvolution ───────────────────

describe('A-03-08: chatHistory invariant — sendEvolution never pushes to chatHistory', () => {
  it('A-03-08a: chatHistory.length unchanged after sendEvolution with musicalIntent path', async () => {
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
        explanation: 'Autopilot recipe path.',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08b: chatHistory.length unchanged after sendEvolution with explicit rhythm/harmony', async () => {
    const responseText = jsonFence({
      rhythm: {
        layers: [{ sound: 'bd', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0] }],
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08c: chatHistory.length unchanged with nonexistent recipeId (graceful no-op)', async () => {
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'nonexistent-recipe-xyz',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-03-08d: applyBlockSave NEVER called, even when musicalIntent is present', async () => {
    // Include saveAsBlock alongside musicalIntent so the schema does not reject the
    // response — sendEvolution must still ignore saveAsBlock (ADR 0022 D4).
    const responseText = jsonFence({
      musicalIntent: {
        recipeId: 'bossa-nova-groove',
      },
      saveAsBlock: {
        name: 'Sneaky Block',
        type: 'sesion',
      },
    });

    fetchMock.mockResolvedValueOnce(fakeApiResponse(responseText));

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

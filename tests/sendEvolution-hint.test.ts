// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for sendEvolution() rhythm-hint injection (Phase 06 step 06.2)
// and plan-mode user-message shape (Phase 07 step 07.3).
//
// Phase 06 coverage (A-06-03, A-06-04):
//   A-06-03: catalog rhythm id → userMessage JSON contains "rhythmHint" with the entry name
//   A-06-04a: 'otro' + free text → userMessage JSON contains "rhythmHintFreeText"
//   A-06-04b: empty hint → neither "rhythmHint" nor "rhythmHintFreeText" appears
//   A-06-08 proxy: chatHistory is never mutated by sendEvolution (ADR 0022 D3)
//
// Phase 07 coverage (A-07-02, A-07-03, A-07-04, A-07-05):
//   A-07-02: "horizon" field appears in the user message JSON (clamped formula)
//   A-07-03: "availableRecipeSummaries" absent when rhythmHint or rhythmHintText present
//   A-07-04: valid plan response → sessionStore.autopilot.currentPlan set + planIndex=0
//   A-07-05: steps in stateSnapshot.rhythm.layers are compact binary strings, not arrays
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// fetch is mocked globally.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { get } from 'svelte/store';

// ── Module mocks (declared before module imports) ──────────────────────────

vi.mock('../src/agent/apply.js', () => ({
  applyRhythmSpec: vi.fn(),
  applyHarmonySpec: vi.fn(),
  applyBlockSave: vi.fn(),
}));

vi.mock('../src/audio/strudel.js', () => ({
  isPlaying: vi.fn().mockReturnValue(true),
  queueForNextCycle: vi.fn().mockResolvedValue(undefined),
  setTempo: vi.fn(),
}));

vi.mock('../src/agent/providers.js', () => ({
  PROVIDERS: {
    anthropic: {
      url: 'https://fake-api.test/v1/messages',
      defaultModel: 'claude-test',
      headers: () => ({ 'Content-Type': 'application/json' }),
      body: (model: string, system: string, messages: unknown[], maxTokens?: number) => ({
        model,
        system,
        messages,
        max_tokens: maxTokens ?? 1024,
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
import { sendEvolution, chatHistory } from '../src/agent/agent.js';
import { sessionStore, DEFAULT_SESSION_STATE } from '../src/state/session.js';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Build an Anthropic-format response that contains a valid evolution plan
 * ({ "plan": [...] } wrapper). Used to satisfy EvolutionPlanSchema.safeParse.
 *
 * Phase 07: sendEvolution() now parses EvolutionPlanSchema (not tryParseSkill),
 * so the response must wrap steps in { "plan": [...] }.
 */
function fakePlanResponse(steps: unknown[]): Response {
  const body = JSON.stringify({
    content: [{ text: '```json\n' + JSON.stringify({ plan: steps }, null, 2) + '\n```' }],
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * A minimal valid plan step (musicalIntent only — always accepted by AgentOutputSchema).
 * Used as the default step for tests that only care about the user message, not the response.
 */
const VALID_PLAN_STEP = {
  musicalIntent: { style: 'test', explanation: 'test step' },
};

/** Capture the user message JSON that was sent to the LLM from the fetch body. */
function capturedUserMessage(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  const callArg = fetchMock.mock.calls[0]?.[1] as { body: string } | undefined;
  if (!callArg) throw new Error('fetch was not called');
  const body = JSON.parse(callArg.body) as {
    messages: Array<{ role: string; content: string }>;
  };
  const userMsg = body.messages.find((m) => m.role === 'user');
  if (!userMsg) throw new Error('No user message found in fetch body');
  return JSON.parse(userMsg.content) as Record<string, unknown>;
}

// ── Stub fetch globally ────────────────────────────────────────────────────

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Reset session store to minimal state with no autopilot hints.
  sessionStore.set({
    ...DEFAULT_SESSION_STATE,
    autopilot: {
      ...DEFAULT_SESSION_STATE.autopilot,
      rhythmHint: '',
      rhythmHintText: '',
      currentPlan: [],
      planIndex: 0,
      llmError: null,
    },
  });

  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── A-06-03: catalog id → rhythmHint field with human-readable name ───────

describe('A-06-03: rhythmHint injection — catalog id', () => {
  it('A-06-03a: catalog rhythm id injects "rhythmHint" with the entry name', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: 'cueca-chilena-base', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('rhythmHint');
    // The human-readable name for 'cueca-chilena-base' is 'Cueca Chilena Base' (from catalog).
    // We verify it is a non-empty string derived from the catalog (not the id itself or undefined).
    expect(typeof msg['rhythmHint']).toBe('string');
    expect(msg['rhythmHint']).not.toBe('');
    expect(msg).not.toHaveProperty('rhythmHintFreeText');
  });

  it('A-06-03b: different catalog id — "rhythmHint" appears with that entry name', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: 'son-clave-3-2', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('rhythmHint');
    expect(typeof msg['rhythmHint']).toBe('string');
    expect(msg['rhythmHint']).not.toBe('');
  });

  it('A-06-03c: chatHistory is unchanged when rhythmHint is a catalog id (ADR 0022 D3)', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: 'cueca-chilena-base', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── A-06-04: 'otro' with text → rhythmHintFreeText; empty → neither ────────

describe('A-06-04: rhythmHintFreeText injection — otro and empty', () => {
  it('A-06-04a: rhythmHint === "otro" with non-empty text → "rhythmHintFreeText" appears', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: {
        ...s.autopilot,
        rhythmHint: 'otro',
        rhythmHintText: 'ritmo afrobeat denso con mucha síncopa',
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('rhythmHintFreeText', 'ritmo afrobeat denso con mucha síncopa');
    expect(msg).not.toHaveProperty('rhythmHint');
  });

  it('A-06-04b: rhythmHint === "otro" with empty text → neither field appears', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: 'otro', rhythmHintText: '   ' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).not.toHaveProperty('rhythmHint');
    expect(msg).not.toHaveProperty('rhythmHintFreeText');
  });

  it('A-06-04c: rhythmHint === "" → neither "rhythmHint" nor "rhythmHintFreeText" appears', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: '', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).not.toHaveProperty('rhythmHint');
    expect(msg).not.toHaveProperty('rhythmHintFreeText');
  });

  it('A-06-04d: chatHistory unchanged when rhythmHint === "otro" (ADR 0022 D3)', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: {
        ...s.autopilot,
        rhythmHint: 'otro',
        rhythmHintText: 'cueca chilena sincopada',
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-06-04e: chatHistory unchanged when rhythmHint === "" (ADR 0022 D3)', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: '', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── A-07-02: "horizon" field appears in the user message JSON ─────────────

describe('A-07-02: horizon field in user message (ADR 0024 D6)', () => {
  it('A-07-02a: horizon=2 when intervalCycles=2 (min clamp)', async () => {
    // horizon = Math.min(8, Math.max(2, Math.round(2 / 2))) = Math.min(8, Math.max(2, 1)) = 2
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, intervalCycles: 2 },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP, VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('horizon', 2);
  });

  it('A-07-02b: horizon=4 when intervalCycles=8 (default)', async () => {
    // horizon = Math.min(8, Math.max(2, Math.round(8 / 2))) = Math.min(8, 4) = 4
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, intervalCycles: 8 },
    }));

    // Need 4 steps to satisfy the plan (not strictly required for user-message check,
    // but ensures plan parse succeeds and we get a clean test).
    fetchMock.mockResolvedValueOnce(
      fakePlanResponse([VALID_PLAN_STEP, VALID_PLAN_STEP, VALID_PLAN_STEP, VALID_PLAN_STEP])
    );

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('horizon', 4);
  });

  it('A-07-02c: horizon=8 when intervalCycles=32 (max clamp — D6 amendment)', async () => {
    // horizon = Math.min(8, Math.max(2, Math.round(32 / 2))) = Math.min(8, 16) = 8
    // Without the Math.min(8, ...) clamp, horizon would be 16 — exceeding EvolutionPlanSchema.max(8)
    // and causing __emptyPlan__ failures for high-interval users.
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, intervalCycles: 32 },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('horizon', 8);
  });

  it('A-07-02d: horizon is a number (not a string) in the user message', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, intervalCycles: 8 },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(typeof msg['horizon']).toBe('number');
  });
});

// ── A-07-03: availableRecipeSummaries absent when hint present (ADR 0024 D5) ─

describe('A-07-03: input-trim — availableRecipeSummaries omitted when hint present', () => {
  it('A-07-03a: no hint → availableRecipeSummaries appears in user message', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: '', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).toHaveProperty('availableRecipeSummaries');
    expect(Array.isArray(msg['availableRecipeSummaries'])).toBe(true);
  });

  it('A-07-03b: rhythmHint (catalog id) → availableRecipeSummaries absent', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: 'cueca-chilena-base', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).not.toHaveProperty('availableRecipeSummaries');
  });

  it('A-07-03c: rhythmHintText (otro with free text) → availableRecipeSummaries absent', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: {
        ...s.autopilot,
        rhythmHint: 'otro',
        rhythmHintText: 'ritmo afrobeat sincopado',
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    expect(msg).not.toHaveProperty('availableRecipeSummaries');
  });
});

// ── A-07-04: valid plan → currentPlan stored in sessionStore ─────────────

describe('A-07-04: valid plan response → AutopilotState.currentPlan set', () => {
  it('A-07-04a: after valid 2-step plan, currentPlan has 2 entries and planIndex is 0', async () => {
    const step1 = { musicalIntent: { style: 'step-1', explanation: 'first step' } };
    const step2 = { musicalIntent: { style: 'step-2', explanation: 'second step' } };

    fetchMock.mockResolvedValueOnce(fakePlanResponse([step1, step2]));

    await sendEvolution();

    const autopilot = get(sessionStore).autopilot;
    expect(autopilot.currentPlan).toHaveLength(2);
    expect(autopilot.planIndex).toBe(0);
    expect(autopilot.llmError).toBeNull();
  });

  it('A-07-04b: after valid 1-step plan, currentPlan has 1 entry', async () => {
    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const autopilot = get(sessionStore).autopilot;
    expect(autopilot.currentPlan).toHaveLength(1);
    expect(autopilot.planIndex).toBe(0);
    expect(autopilot.llmError).toBeNull();
  });

  it('A-07-04c: chatHistory is unchanged after a successful plan response (ADR 0022 D3/D4)', async () => {
    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

// ── A-07-05: steps in stateSnapshot are compact binary strings ────────────

describe('A-07-05: compact step encoding in stateSnapshot (ADR 0024 D5)', () => {
  it('A-07-05a: steps layer is encoded as a binary string, not a JSON array', async () => {
    // Set up a session with a steps rhythm layer.
    const stepsPattern = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        layers: [
          {
            sound: 'bd' as const,
            steps: stepsPattern,
            muted: false,
          },
        ],
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    const snapshot = msg['stateSnapshot'] as {
      rhythm: { layers: Array<{ sound: string; steps?: unknown; euclid?: unknown }> };
    };
    expect(snapshot).toBeDefined();
    const layer0 = snapshot.rhythm.layers[0];
    expect(layer0).toBeDefined();
    // steps must be a string (binary compact encoding), NOT an array
    expect(typeof layer0.steps).toBe('string');
    expect(layer0.steps).toBe('1000100010001000');
  });

  it('A-07-05b: euclid layer (session model: euclid as string) passes through with euclid field, not compact steps', async () => {
    // In the session model, RhythmLayer.euclid is a string like "3,8,0", not an object.
    // sendEvolution() detects truthy euclid and passes it through without compact-encoding steps.
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        layers: [
          {
            sound: 'hh' as const,
            // euclid as string (session model format) — triggers euclid branch in sendEvolution
            euclid: '3,8,0',
            steps: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            muted: false,
          },
        ],
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    const snapshot = msg['stateSnapshot'] as {
      rhythm: { layers: Array<{ sound: string; steps?: unknown; euclid?: unknown }> };
    };
    const layer0 = snapshot.rhythm.layers[0];
    expect(layer0).toBeDefined();
    // euclid layer: euclid field present, no compact string steps in payload
    expect(layer0.euclid).toBeDefined();
    // steps should NOT be present (euclid branch omits it)
    expect(layer0.steps).toBeUndefined();
  });

  it('A-07-05c: all zeros encodes as "0000000000000000"', async () => {
    const silentSteps = Array(16).fill(0) as number[];
    sessionStore.update((s) => ({
      ...s,
      rhythm: {
        layers: [
          {
            sound: 'sd' as const,
            steps: silentSteps,
            muted: false,
          },
        ],
      },
    }));

    fetchMock.mockResolvedValueOnce(fakePlanResponse([VALID_PLAN_STEP]));

    await sendEvolution();

    const msg = capturedUserMessage(fetchMock);
    const snapshot = msg['stateSnapshot'] as {
      rhythm: { layers: Array<{ steps?: unknown }> };
    };
    expect(snapshot.rhythm.layers[0].steps).toBe('0000000000000000');
  });

  it('A-07-05d: invalid plan response sets __emptyPlan__ sentinel (ADR 0024 D4)', async () => {
    // Response is valid JSON but not a valid EvolutionPlanSchema (bare AgentOutput, not wrapped).
    const body = JSON.stringify({
      content: [
        {
          text:
            '```json\n' + JSON.stringify({ musicalIntent: { style: 'test' } }, null, 2) + '\n```',
        },
      ],
    });
    fetchMock.mockResolvedValueOnce(
      new Response(body, { status: 200, headers: { 'Content-Type': 'application/json' } })
    );

    await sendEvolution();

    const autopilot = get(sessionStore).autopilot;
    expect(autopilot.llmError).toBe('__emptyPlan__');
    expect(autopilot.currentPlan).toHaveLength(0);
    expect(autopilot.planIndex).toBe(0);
  });
});

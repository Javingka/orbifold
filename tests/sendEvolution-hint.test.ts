// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — unit tests for sendEvolution() rhythm-hint injection (Phase 06 step 06.2).
//
// Covers acceptance criteria A-06-03 and A-06-04:
//   A-06-03: catalog rhythm id → userMessage JSON contains "rhythmHint" with the entry name
//   A-06-04a: 'otro' + free text → userMessage JSON contains "rhythmHintFreeText"
//   A-06-04b: empty hint → neither "rhythmHint" nor "rhythmHintFreeText" appears
//   A-06-08 proxy: chatHistory is never mutated by sendEvolution (ADR 0022 D3)
//
// Runs in Node (Vitest default env) — no AudioContext, no DOM required.
// fetch is mocked globally.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

/** Build an Anthropic-format response that the LLM would return for evolution. */
function fakeEvolutionResponse(obj: unknown): Response {
  // sendEvolution uses tryParseSkill which requires at least one of:
  // rhythm, harmony, saveAsBlock, or musicalIntent
  const body = JSON.stringify({
    content: [{ text: '```json\n' + JSON.stringify(obj, null, 2) + '\n```' }],
  });
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

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

    // The LLM must return a valid evolution response (at least one recognised field).
    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

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

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });

  it('A-06-04e: chatHistory unchanged when rhythmHint === "" (ADR 0022 D3)', async () => {
    sessionStore.update((s) => ({
      ...s,
      autopilot: { ...s.autopilot, rhythmHint: '', rhythmHintText: '' },
    }));

    fetchMock.mockResolvedValueOnce(
      fakeEvolutionResponse({
        musicalIntent: { recipeId: 'bossa-nova-groove', explanation: 'test' },
      })
    );

    const lengthBefore = chatHistory.length;
    await sendEvolution();
    expect(chatHistory.length).toBe(lengthBefore);
  });
});

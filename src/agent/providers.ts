// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — AI provider adapters: Anthropic, OpenRouter, and Google Gemini.
//
// Phase 06 step 06.3.
//
// Prototype parity: reference/orbifold.html lines 1587–1603 (PROVIDERS object).
// OpenAI provider re-added by Pilot decision 2026-06-22 (reverses the phase-06 omission).
// Anthropic model updated: 'claude-sonnet-4-6' (not prototype's 'claude-sonnet-4-20250514').
// Google Gemini added via OpenAI-compatible endpoint (generativelanguage.googleapis.com/v1beta/openai).
//
// No DOM imports.

// ── Types ──────────────────────────────────────────────────────────────────

/** Provider keys supported by this version of Orbifold. */
export type ProviderKey = 'anthropic' | 'openrouter' | 'gemini' | 'openai';

/**
 * A single message in the conversation history.
 * Prototype: `chatHistory` array shape (line 1608).
 */
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * A provider adapter entry.
 *
 * - `label`:        Human-readable name for the provider selector.
 * - `url`:          The API endpoint URL.
 * - `defaultModel`: The default model string pre-filled in the model input.
 * - `keyHint`:      Placeholder text for the API key input.
 * - `headers`:      Returns request headers given the API key.
 * - `body`:         Returns the request body (as an unknown object — will be JSON.stringify'd).
 * - `parse`:        Extracts the assistant text from the parsed response JSON.
 */
export interface ProviderConfig {
  label: string;
  url: string;
  defaultModel: string;
  keyHint: string;
  headers(key: string): Record<string, string>;
  body(model: string, system: string, msgs: ChatMessage[], maxTokens?: number): unknown;
  parse(data: unknown): string;
}

// ── PROVIDERS ─────────────────────────────────────────────────────────────

/**
 * Provider adapter registry.
 *
 * Four entries: 'anthropic', 'openrouter', 'gemini', and 'openai'.
 *
 * Prototype parity: reference/orbifold.html lines 1587–1603 (PROVIDERS object).
 * Deviations:
 *   - Anthropic model: 'claude-sonnet-4-6' (prototype used 'claude-sonnet-4-20250514').
 *   - OpenAI re-added 2026-06-22 (Pilot decision) after a phase-06 omission.
 *   - OpenRouter defaultModel: 'cohere/north-mini-code:free' — a ':free' model so
 *     zero-credit accounts work out of the box. (Was 'openrouter/auto' per phase-06.md
 *     spec, but 'auto' routes to PAID models → HTTP 402 "never purchased credits" on
 *     free accounts. ':free' models cost nothing but carry a per-account daily request
 *     ceiling (~20/day with no credits purchased) and the free-tier prompt cap. Verified
 *     present on the live /v1/models API 2026-06-22. Users may type any model in the UI.)
 *   - 'Content-Type' header included in all entries for clarity; prototype had it inline.
 *   - Google Gemini added via OpenAI-compatible endpoint (not in prototype).
 */
export const PROVIDERS: Record<ProviderKey, ProviderConfig> = {
  anthropic: {
    label: 'Anthropic',
    url: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-6',
    keyHint: 'sk-ant-…  (console.anthropic.com)',

    // Prototype line 1600: anthropic headers require x-api-key, anthropic-version,
    // and anthropic-dangerous-direct-browser-access for browser-direct calls.
    headers: (key: string): Record<string, string> => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),

    // Prototype line 1601: Anthropic uses top-level `system:` + `messages:` format.
    body: (model: string, system: string, msgs: ChatMessage[], maxTokens = 1000): unknown => ({
      model,
      max_tokens: maxTokens,
      system,
      messages: msgs,
    }),

    // Prototype line 1602: parse reads content[].text.
    parse: (data: unknown): string => {
      const d = data as { content?: Array<{ text?: string }> };
      return (d.content ?? []).map((b) => b.text ?? '').join('');
    },
  },

  openrouter: {
    label: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'cohere/north-mini-code:free',
    keyHint: 'sk-or-…  (key gratis en openrouter.ai/keys · usa un modelo «:free»)',

    // Prototype line 1590: OpenRouter uses OpenAI-compatible API with
    // HTTP-Referer and X-Title headers.
    headers: (key: string): Record<string, string> => ({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Orbifold',
    }),

    // Prototype line 1591: OpenAI-compatible body — system message prepended to messages.
    body: (model: string, system: string, msgs: ChatMessage[], maxTokens = 1000): unknown => ({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...msgs],
    }),

    // Prototype line 1592: parse reads choices[0].message.content.
    parse: (data: unknown): string => {
      const d = data as { choices?: Array<{ message?: { content?: string } }> };
      return d.choices?.[0]?.message?.content ?? '';
    },
  },

  gemini: {
    label: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash-lite',
    keyHint: 'AIza…  (aistudio.google.com/apikey)',

    // Google's OpenAI-compatible endpoint uses Bearer token auth (no special headers needed).
    headers: (key: string): Record<string, string> => ({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    }),

    // OpenAI-compatible body — same shape as openrouter.
    body: (model: string, system: string, msgs: ChatMessage[], maxTokens = 1000): unknown => ({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...msgs],
    }),

    // OpenAI-compatible parse — same as openrouter.
    parse: (data: unknown): string => {
      const d = data as { choices?: Array<{ message?: { content?: string } }> };
      return d.choices?.[0]?.message?.content ?? '';
    },
  },

  openai: {
    // Re-added by Pilot decision 2026-06-22 (reverses the phase-06 omission): the
    // Pilot has an OpenAI key to test. Uses the native chat-completions endpoint.
    // Default 'gpt-4o-mini' is cheap, reliable, and supports `max_tokens` on chat
    // completions; the user may type a newer model in the UI. Note: reasoning
    // models (o-series) reject `max_tokens`/custom temperature — pick a 4o/4.1
    // chat model. Browser-direct calls expose the key (same trade-off as all
    // providers here — keys live only in the user's localStorage, never the repo).
    label: 'OpenAI',
    url: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'sk-…  (platform.openai.com/api-keys)',

    headers: (key: string): Record<string, string> => ({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
    }),

    // OpenAI-compatible body — same shape as openrouter/gemini.
    body: (model: string, system: string, msgs: ChatMessage[], maxTokens = 1000): unknown => ({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'system', content: system }, ...msgs],
    }),

    // OpenAI-compatible parse — same as openrouter/gemini.
    parse: (data: unknown): string => {
      const d = data as { choices?: Array<{ message?: { content?: string } }> };
      return d.choices?.[0]?.message?.content ?? '';
    },
  },
};

// ── localStorage key helpers ───────────────────────────────────────────────

/**
 * localStorage key namespacing for API keys.
 *
 * Phase 06 ADR Trigger: keys `orbifold.apiKey.anthropic` / `orbifold.apiKey.openrouter`
 * must not collide with Phase 07 session storage keys. The namespace `orbifold.apiKey.*`
 * is distinct from the session key (to be decided in Phase 07).
 *
 * No DOM import needed — localStorage is a global available in browser context.
 * These functions are no-ops in test environments where localStorage is absent.
 */

/** localStorage key for the given provider's API key. */
function apiKeyStorageKey(provider: ProviderKey): string {
  return `orbifold.apiKey.${provider}`;
}

/**
 * Sanitize a pasted API key: strip zero-width / BOM characters (U+200B–U+200D,
 * U+FEFF) and surrounding whitespace. Real provider keys are ASCII; a non-Latin-1
 * code point in the key would otherwise crash `fetch` when building the
 * `Authorization` header ("String contains non ISO-8859-1 code point"). These
 * invisible characters are common copy-paste artifacts.
 */
function sanitizeKey(raw: string): string {
  return raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

/**
 * Load the stored API key for the given provider from localStorage.
 * Returns '' if no key is stored or if localStorage is unavailable (e.g. in tests).
 */
export function loadApiKey(provider: ProviderKey): string {
  try {
    return sanitizeKey(localStorage.getItem(apiKeyStorageKey(provider)) ?? '');
  } catch {
    return '';
  }
}

/**
 * Save an API key for the given provider to localStorage.
 * No-op if localStorage is unavailable (e.g. in tests).
 */
export function saveApiKey(provider: ProviderKey, key: string): void {
  try {
    localStorage.setItem(apiKeyStorageKey(provider), key);
  } catch {
    // best-effort; localStorage may be disabled (private mode, tests)
  }
}

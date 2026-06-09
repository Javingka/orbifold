// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — AI provider adapters: Anthropic and OpenRouter.
//
// Phase 06 step 06.3.
//
// Prototype parity: reference/orbifold.html lines 1587–1603 (PROVIDERS object).
// Known deviation: OpenAI provider omitted — Pilot decision (phase-06.md spec).
// Anthropic model updated: 'claude-sonnet-4-6' (not prototype's 'claude-sonnet-4-20250514').
//
// No DOM imports.

// ── Types ──────────────────────────────────────────────────────────────────

/** Provider keys supported by this version of Orbifold. */
export type ProviderKey = 'anthropic' | 'openrouter';

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
  body(model: string, system: string, msgs: ChatMessage[]): unknown;
  parse(data: unknown): string;
}

// ── PROVIDERS ─────────────────────────────────────────────────────────────

/**
 * Provider adapter registry.
 *
 * Two entries: 'anthropic' and 'openrouter'.
 * OpenAI is intentionally absent — Pilot decision (phase-06.md §step 06.3 spec).
 *
 * Prototype parity: reference/orbifold.html lines 1587–1603 (PROVIDERS object).
 * Deviations:
 *   - Anthropic model: 'claude-sonnet-4-6' (prototype used 'claude-sonnet-4-20250514').
 *   - OpenAI entry omitted.
 *   - OpenRouter defaultModel changed from 'openrouter/owl-alpha' to 'openrouter/auto'
 *     per phase-06.md spec.
 *   - 'Content-Type' header included in all entries for clarity; prototype had it inline.
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
    body: (model: string, system: string, msgs: ChatMessage[]): unknown => ({
      model,
      max_tokens: 1000,
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
    defaultModel: 'openrouter/auto',
    keyHint: 'sk-or-…  (gratis en openrouter.ai/keys)',

    // Prototype line 1590: OpenRouter uses OpenAI-compatible API with
    // HTTP-Referer and X-Title headers.
    headers: (key: string): Record<string, string> => ({
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + key,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Orbifold',
    }),

    // Prototype line 1591: OpenAI-compatible body — system message prepended to messages.
    body: (model: string, system: string, msgs: ChatMessage[]): unknown => ({
      model,
      max_tokens: 1000,
      messages: [{ role: 'system', content: system }, ...msgs],
    }),

    // Prototype line 1592: parse reads choices[0].message.content.
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
 * Load the stored API key for the given provider from localStorage.
 * Returns '' if no key is stored or if localStorage is unavailable (e.g. in tests).
 */
export function loadApiKey(provider: ProviderKey): string {
  try {
    return localStorage.getItem(apiKeyStorageKey(provider)) ?? '';
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

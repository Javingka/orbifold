// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — sendImport: one-shot LLM call for structured chart generation.
// song-import Phase 03. Reuses providers.ts/agent.ts pattern.
//
// OD-4 (Option A — LLM-native): fires a single fetch to the user's configured
// provider using IMPORT_SYSTEM_PROMPT + the song query as the user message.
// Returns ImportSendResult — a discriminated union of ok/error. No store touch,
// no chatHistory push, no applyImportSession call (pure async function).
// See ADR 0028 for the full chart-sourcing contract and design rationale.

import { PROVIDERS, loadApiKey } from './providers.js';
import { agentProvider, agentModel } from './agent.js';
import { IMPORT_SYSTEM_PROMPT } from './import-prompt.js';
import { ImportSessionInputSchema, type ImportSessionInput } from './import-session.js';

// ── ImportSendResult ────────────────────────────────────────────────────────

/**
 * Discriminated union result type for sendImport.
 *
 * - `{ type: 'ok', input }` — the model returned a valid ImportSessionInput.
 *   The caller feeds `input` to importSession() then applyImportSession().
 * - `{ type: 'error', message }` — any failure path (missing key, network error,
 *   HTTP error, JSON parse failure, schema validation failure). The UI shows the
 *   message and does NOT call importSession.
 *
 * Mirrors the AgentSendResult style used in agent.ts / autopilot.ts.
 */
export type ImportSendResult =
  | { type: 'ok'; input: ImportSessionInput }
  | { type: 'error'; message: string };

// ── extractJsonFromText ─────────────────────────────────────────────────────

/**
 * Extract a JSON string from a raw LLM response text.
 *
 * Algorithm (mirrors tryParseSkill in agent.ts lines 576–587):
 *   1. Try to match a ```json … ``` fence (most reliable — LLM follows the prompt).
 *   2. Fall back to the outermost { … } span (catches models that omit the fence).
 *
 * Returns the raw JSON string (unparsed), or null if no JSON structure was found.
 * The normalizeEuclidStrings step from tryParseSkill is NOT needed here — the
 * ImportSessionInput schema has no euclid sub-objects.
 *
 * @param txt - Raw response text from the LLM provider.
 * @returns JSON string, or null if no JSON object was found.
 */
export function extractJsonFromText(txt: string): string | null {
  // Step 1: try ```json fence
  const fence = /```json\s*([\s\S]*?)```/i.exec(txt);
  if (fence) return fence[1];

  // Step 2: outermost { … } span
  const a = txt.indexOf('{');
  const b = txt.lastIndexOf('}');
  if (a >= 0 && b > a) return txt.slice(a, b + 1);

  return null;
}

// ── sendImport ──────────────────────────────────────────────────────────────

/**
 * One-shot LLM call for structured song chart generation.
 *
 * Sends a single fetch to the user's configured AI provider using
 * IMPORT_SYSTEM_PROMPT + `query` as the user message. Parses the response
 * with the fence → brace fallback and validates with ImportSessionInputSchema.
 *
 * Call pattern (mirrors sendEvolution in agent.ts lines 426–441):
 *   fetch(provider.url, { method: 'POST', headers: provider.headers(key),
 *     body: JSON.stringify(provider.body(model, IMPORT_SYSTEM_PROMPT,
 *       [{ role: 'user', content: query }], 600)) })
 *
 * max_tokens = 600: a typical ImportSessionInput (6–8 sections × 6–8 chords)
 * is ≈ 350–480 tokens of JSON. 600 provides headroom. See inventory section (c).
 *
 * Error paths (all return { type: 'error', message }):
 *   - No API key configured for the current provider.
 *   - Network / JSON-parse exception (fetch or res.json()).
 *   - HTTP non-2xx status code.
 *   - Provider-level error in the response body.
 *   - Empty response text from the provider.
 *   - No JSON object found in the response text.
 *   - JSON.parse() throws (malformed JSON).
 *   - ImportSessionInputSchema.safeParse() fails (schema mismatch — e.g., model
 *     returned { "error": "Canción desconocida" } or a hallucinated shape).
 *
 * Invariants:
 *   - Does NOT push to chatHistory.
 *   - Does NOT call applyImportSession.
 *   - Does NOT touch the session store.
 *
 * @param query - The song search string (e.g. "ONE by Metallica").
 * @returns A Promise resolving to ImportSendResult.
 */
export async function sendImport(query: string): Promise<ImportSendResult> {
  const provider = PROVIDERS[agentProvider];
  const key = loadApiKey(agentProvider);

  if (!key) {
    return {
      type: 'error',
      message:
        'API key ausente. Configura tu proveedor de IA en el panel del agente antes de importar.',
    };
  }

  const model = agentModel || provider.defaultModel;

  // ── Fetch ────────────────────────────────────────────────────────────────
  let txt: string;
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers(key),
      body: JSON.stringify(
        provider.body(model, IMPORT_SYSTEM_PROMPT, [{ role: 'user', content: query }], 600)
      ),
    });
    const data: unknown = await res.json();

    if (!res.ok) {
      const dataObj = data as Record<string, unknown>;
      const errMsg =
        ((dataObj.error as Record<string, unknown>)?.message as string) ??
        `HTTP ${res.status}: ${res.statusText}`;
      return { type: 'error', message: `Error del proveedor: ${errMsg}` };
    }

    const dataObj = data as Record<string, unknown>;
    if (dataObj.error) {
      const errMsg =
        ((dataObj.error as Record<string, unknown>)?.message as string) ?? 'Error desconocido';
      return { type: 'error', message: `Error del proveedor: ${errMsg}` };
    }

    txt = provider.parse(data);
    if (!txt) {
      return {
        type: 'error',
        message: 'El proveedor devolvió una respuesta vacía. Prueba de nuevo.',
      };
    }
  } catch (e) {
    return {
      type: 'error',
      message: `Error de red: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  // ── JSON extraction (fence → brace fallback) ─────────────────────────────
  const jsonStr = extractJsonFromText(txt);
  if (!jsonStr) {
    return {
      type: 'error',
      message:
        'El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción.',
    };
  }

  // ── Parse and validate ────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return {
      type: 'error',
      message:
        'El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción.',
    };
  }

  const result = ImportSessionInputSchema.safeParse(raw);
  if (!result.success) {
    return {
      type: 'error',
      message:
        'El modelo no devolvió un chart válido. Prueba de nuevo o verifica que el modelo conoce esta canción.',
    };
  }

  return { type: 'ok', input: result.data };
}

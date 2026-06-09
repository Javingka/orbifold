// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — agent: SYSTEM_PROMPT, send, requestAutofix, tryParseSkill, extractLastStrudelCode.
//
// Phase 06 step 06.3.
//
// Prototype parity:
//   SYSTEM_PROMPT:              reference/orbifold.html lines 1541–1585
//   PROVIDERS / send logic:     lines 1741–1779
//   requestAutofix:             lines 1648–1667
//   tryApplySkill / tryParseSkill: lines 1725–1738
//   extractLastCode:            line 1613
//   chatHistory (module state): line 1608
//
// Known deviations from prototype:
//   - SYSTEM_PROMPT tempo line updated: "NO uses setcps/setcpm/.fast/.slow para el tempo:
//     la app fija el tempo vía setcps según el BPM." — per ADR 0005 (setcpm does not
//     exist in @strudel/web@1.0.3; prototype's line 1585 had incorrect "setcpm" reference).
//   - `send` derives context from sessionStore (live read) instead of DOM/globals.
//   - No DOM manipulation in any exported function.

import { get } from 'svelte/store';

import { sessionStore } from '../state/session.js';
import { rhythmCode, harmonyCode, sessionCode } from '../state/session.js';
import { NOTE_NAMES } from '../core/theory/pitch.js';
import { PROVIDERS, loadApiKey, type ProviderKey, type ChatMessage } from './providers.js';
import { AgentOutputSchema, type AgentOutput } from './schema.js';
import { applyRhythmSpec, applyHarmonySpec } from './apply.js';

// ── Module-level mutable state (ephemeral — not persisted, ADR 0009 pattern) ─

/**
 * Conversation history: ordered pairs of user/assistant messages.
 * Mirrors prototype line 1608 (chatHistory global).
 * Ephemeral: cleared on page reload, not saved to sessionStore.
 * The array is mutated in place (push); exported as const for lint compliance.
 */
export const chatHistory: ChatMessage[] = [];

/**
 * Currently selected provider key.
 * Default: 'anthropic'.
 * Updated by setProvider().
 */
export let agentProvider: ProviderKey = 'anthropic';

/**
 * Currently selected model string.
 * Default: PROVIDERS.anthropic.defaultModel.
 * Updated by setModel() or implicitly when setProvider() is called.
 */
export let agentModel: string = PROVIDERS.anthropic.defaultModel;

// ── Mutators ───────────────────────────────────────────────────────────────

/** Update the active provider. Does NOT reset agentModel (caller's responsibility). */
export function setProvider(p: ProviderKey): void {
  agentProvider = p;
}

/** Update the active model string. */
export function setModel(m: string): void {
  agentModel = m;
}

// ── SYSTEM_PROMPT ─────────────────────────────────────────────────────────

/**
 * System prompt for the AI agent.
 *
 * Prototype parity: reference/orbifold.html lines 1541–1585.
 * Deviation (ADR 0005): tempo line updated from "la app fija el tempo (setcpm)" to
 * "la app fija el tempo vía setcps" — setcpm does not exist in @strudel/web@1.0.3.
 */
export const SYSTEM_PROMPT = `Eres el co-compositor de Orbifold, músico experto en live coding con Strudel (TidalCycles para JS).

══════════ SKILLS (modo preferido) ══════════
Tienes DOS habilidades que actualizan DIRECTAMENTE la interfaz de Orbifold:
  • create_rhythm  → define las órbitas rítmicas (rejilla de 16 pasos / compás 4/4)
  • create_harmony → define la clave y la progresión de acordes (geometría Tonnetz)

Cuando el usuario pida CREAR o MODIFICAR un groove/ritmo/batería y/o una progresión/armonía/acordes,
responde EXCLUSIVAMENTE con UN bloque \`\`\`json siguiendo este esquema EXACTO (incluye solo las claves que apliquen):

\`\`\`json
{
  "rhythm": {
    "layers": [
      { "sound": "bd", "steps": [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0] },
      { "sound": "hh", "euclid": { "k": 5, "n": 8, "rot": 0 } }
    ]
  },
  "harmony": {
    "root": "C", "mode": "minor", "octave": 3,
    "progression": [
      { "root": "C",  "quality": "min" },
      { "root": "Ab", "quality": "maj" },
      { "root": "Eb", "quality": "maj" },
      { "root": "G",  "quality": "maj" }
    ]
  },
  "note": "una frase breve en español sobre la idea musical"
}
\`\`\`

RESTRICCIONES (obligatorio, la interfaz solo admite esto):
- sound ∈ {bd, sd, hh, oh, cp, rim, lt, mt, ht}
- Cada capa usa "steps" (EXACTAMENTE 16 enteros 0/1) Ó "euclid" {k:1..16, n:2..16, rot:0..n-1}. No ambos.
- mode ∈ {major, minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic:minor}
- quality ∈ {maj, min, dim, aug}
- root: nota como "C", "C#", "Eb", "F#"… ; octave 2..5
- Compón pensando en voice-leadings pequeños entre acordes (la app está organizada por la geometría de acordes).
- Detecta la intención: si solo piden ritmo → solo "rhythm"; si solo armonía → solo "harmony"; si ambos → las dos claves.
- NADA fuera del bloque json (sin texto antes ni después).

══════════ MODO CÓDIGO (solo si NO aplica una skill) ══════════
Si piden algo que no encaja en las skills (un efecto suelto, código Strudel libre), responde con UN bloque \`\`\`strudel ejecutable y comentado.
CONOCIMIENTO STRUDEL: note("a3 c#4 e4"), s("bd hh sd hh"), stack(...), mini-notation (espacio=secuencia, ~=silencio, <a b>=alternar, [a b]=subdivisión, ,=paralelo, (3,8)=euclidiano), .s("sawtooth"), .lpf(n), .gain(n), .room(n), .euclidRot(k,n,r).
NO uses setcps/setcpm/.fast/.slow para el tempo: la app fija el tempo vía setcps según el BPM. 1 ciclo = 1 compás 4/4.`;

// ── tryParseSkill ─────────────────────────────────────────────────────────

/**
 * Attempt to extract and validate a skill JSON object from the agent response text.
 *
 * Prototype parity: reference/orbifold.html lines 1725–1738 (tryApplySkill logic,
 * extraction part only — this function does NOT call apply; that is done in send()).
 *
 * Algorithm:
 *   1. Try to extract JSON from a ```json … ``` fence (prototype line 1727).
 *   2. Fall back to the outermost { … } span (prototype lines 1729).
 *   3. Parse JSON and validate with AgentOutputSchema.safeParse (prototype: JSON.parse
 *      + manual check for rhythm/harmony presence, line 1730–1731).
 *   4. Return the valid AgentOutput or null.
 *
 * @param txt - The raw text response from the AI provider.
 * @returns Validated AgentOutput or null if no valid skill found.
 */
export function tryParseSkill(txt: string): AgentOutput | null {
  // Step 1: try ```json fence (prototype line 1727)
  let jsonStr: string | null = null;
  const fence = /```json\s*([\s\S]*?)```/i.exec(txt);
  if (fence) {
    jsonStr = fence[1];
  } else {
    // Step 2: outermost { … } span (prototype lines 1729)
    const a = txt.indexOf('{');
    const b = txt.lastIndexOf('}');
    if (a >= 0 && b > a) jsonStr = txt.slice(a, b + 1);
  }

  if (!jsonStr) return null;

  // Step 3: parse JSON
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return null;
  }

  // Step 4: validate with Zod (replaces prototype's manual check for rhythm/harmony presence)
  const result = AgentOutputSchema.safeParse(raw);
  if (!result.success) return null;
  return result.data;
}

// ── extractLastStrudelCode ────────────────────────────────────────────────

/**
 * Find the last ```strudel/js/javascript … ``` code block in the response text.
 *
 * Prototype parity: reference/orbifold.html line 1613 (extractLastCode function).
 *
 * @param txt - The raw text response from the AI provider.
 * @returns The trimmed code string from the last matching block, or null.
 */
export function extractLastStrudelCode(txt: string): string | null {
  const re = /```(?:strudel|js|javascript)?\n([\s\S]*?)```/g;
  let m: RegExpExecArray | null;
  let last: string | null = null;
  while ((m = re.exec(txt)) !== null) {
    last = m[1].trim();
  }
  return last;
}

// ── AgentSendContext / AgentSendResult ────────────────────────────────────

/**
 * Context flags for a send() call.
 * When true, the corresponding context block is appended to the user message.
 */
export type AgentSendContext = {
  includeRhythmCtx: boolean;
  includeHarmonyCtx: boolean;
};

/**
 * Discriminated union result from send().
 *
 * - 'skill': agent returned a JSON skill; rhythm/harmony was applied; code is ready to play.
 * - 'code':  agent returned a Strudel code block (no skill JSON found).
 * - 'text':  agent returned plain text (no code block, no skill).
 * - 'error': network/parse error, or missing API key.
 */
export type AgentSendResult =
  | { type: 'skill'; code: string; summary: string; note?: string }
  | { type: 'code'; code: string }
  | { type: 'text'; text: string }
  | { type: 'error'; message: string };

// ── send ───────────────────────────────────────────────────────────────────

/**
 * Build the context addendum string to append to the user message.
 *
 * Reads live from sessionStore (not cached snapshots).
 * Prototype parity: reference/orbifold.html lines 1745–1752 (context block).
 */
function buildContextAddendum(ctx: AgentSendContext): string {
  const state = get(sessionStore);
  let addendum = `\n\n[TEMPO ACTUAL: ${state.bpm} BPM. El patrón ya suena a este tempo automáticamente; NO ajustes la velocidad.]`;

  // Rhythm context block (prototype lines 1749–1751)
  if (ctx.includeRhythmCtx) {
    const rCode = rhythmCode(state);
    if (rCode) {
      const layers = state.rhythm.layers.filter((l) => !('muted' in l && l.muted));
      const desc = layers
        .map((l) => {
          const hits = l.steps.map((v, i) => (v ? i : null)).filter((x): x is number => x !== null);
          const euclidSuffix = l.euclid ? ` (euclidiano ${l.euclid})` : '';
          return `${l.sound}: pasos [${hits.join(',')}]${euclidSuffix}`;
        })
        .join('; ');
      addendum += `\n\n[BASE RÍTMICA (rejilla 16 pasos/compás; RESPÉTALA como esqueleto):\n${desc}\nReferencia Strudel:\n${rCode}\nPuedes enriquecerla manteniendo estos golpes.]`;
    }
  }

  // Harmony context block (prototype lines 1750–1751)
  if (ctx.includeHarmonyCtx) {
    const { root, mode, octave, progression } = state.harmony;
    const rootName = NOTE_NAMES[root] ?? 'C';
    const scaleName = `${rootName}:${mode}`;
    let progDesc = '(sin progresión)';
    if (progression.length) {
      progDesc = progression.map((c) => `${NOTE_NAMES[c.rootPc]}${c.qual}`).join(' → ');
    }
    addendum += `\n\n[MARCO ARMÓNICO (geometría de acordes; COMPÓN DENTRO de esta clave):\nClave: ${scaleName} (octava ${octave})\nProgresión: ${progDesc}\nPrioriza voice-leadings pequeños entre acordes consecutivos. T=tónica, SD=subdominante, D=dominante.]`;
  }

  // Both contexts: remind to combine (prototype line 1751)
  if (ctx.includeRhythmCtx && ctx.includeHarmonyCtx) {
    addendum += `\n\n[IMPORTANTE: combina AMBOS marcos en UN SOLO stack() para que ritmo y armonía suenen juntos.]`;
  }

  return addendum;
}

/**
 * Send a user message to the AI provider and process the response.
 *
 * Prototype parity: reference/orbifold.html lines 1741–1779 (send function).
 *
 * Flow:
 *   1. Check API key; return error if missing (no alert/DOM).
 *   2. Build context addendum from sessionStore (live read).
 *   3. Append user message + context to chatHistory.
 *   4. Fetch from provider.
 *   5. Try tryParseSkill on response:
 *      - If skill: call applyRhythmSpec / applyHarmonySpec, derive code from
 *        updated session state, return { type: 'skill', code, summary, note }.
 *      - If no skill: try extractLastStrudelCode.
 *        - If code found: return { type: 'code', code }.
 *        - Else: return { type: 'text', text }.
 *   6. On fetch/parse error: return { type: 'error', message }.
 *
 * @param text - The user's message text.
 * @param ctx  - Context flags for rhythm/harmony context injection.
 */
export async function send(text: string, ctx: AgentSendContext): Promise<AgentSendResult> {
  if (!text.trim()) return { type: 'error', message: 'Mensaje vacío' };

  const provider = PROVIDERS[agentProvider];
  const key = loadApiKey(agentProvider);
  if (!key) {
    // No alert/DOM — return error result (prototype uses alert, we use result union)
    return { type: 'error', message: 'API key ausente' };
  }

  const model = agentModel || provider.defaultModel;

  // Build context addendum (prototype lines 1745–1752)
  const addendum = buildContextAddendum(ctx);

  // Append to chatHistory with context embedded in the user content (prototype line 1753)
  chatHistory.push({ role: 'user', content: text + addendum });

  // Fetch (prototype lines 1758–1763)
  let txt: string;
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers(key),
      body: JSON.stringify(provider.body(model, SYSTEM_PROMPT, chatHistory)),
    });
    const data: unknown = await res.json();

    // Check for provider-level error in the response body (prototype line 1761)
    const dataObj = data as Record<string, unknown>;
    if (dataObj.error) {
      const errMsg =
        typeof dataObj.error === 'object' && dataObj.error !== null
          ? (((dataObj.error as Record<string, unknown>).message as string) ??
            JSON.stringify(dataObj.error))
          : String(dataObj.error);
      return { type: 'error', message: '⚠️ ' + errMsg };
    }

    txt = provider.parse(data);
    if (!txt) {
      return { type: 'error', message: '⚠️ Respuesta vacía o formato inesperado.' };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { type: 'error', message: '⚠️ Error de red: ' + msg };
  }

  // Append assistant response to history (prototype line 1763)
  chatHistory.push({ role: 'assistant', content: txt });

  // Try skill first (prototype lines 1764–1777)
  const skill = tryParseSkill(txt);
  if (skill) {
    // Apply skill to session store (prototype lines 1734–1736: applyRhythmSpec/applyHarmonySpec)
    const did: string[] = [];
    if (skill.rhythm) {
      applyRhythmSpec(skill.rhythm);
      did.push('ritmo');
    }
    if (skill.harmony) {
      applyHarmonySpec(skill.harmony);
      did.push('armonía');
    }

    if (did.length === 0) {
      // Schema guards against this via superRefine, but be defensive
      return { type: 'text', text: txt };
    }

    // Derive code from updated session state (prototype lines 1768–1770)
    const updatedState = get(sessionStore);
    let code: string;
    if (did.includes('ritmo') && did.includes('armonía')) {
      code = sessionCode(updatedState);
    } else if (did.includes('ritmo')) {
      code = rhythmCode(updatedState);
    } else {
      code = harmonyCode(updatedState).trim();
    }

    // Build summary (prototype lines 1771–1773)
    const summary =
      `✓ Actualicé la interfaz: ${did.join(' + ')}.` +
      (skill.note ? `\n${skill.note}` : '') +
      `\nLa ${did.includes('ritmo') && did.includes('armonía') ? 'Sesión (ritmo + armonía)' : did.includes('ritmo') ? 'Ritmo (groove)' : 'Armonía (progresión)'} "actual" ya quedó lista — puedes guardarla como bloque (🎚 composición) o tocarla aquí. La valido al sonar (auto-corrector activo).`;

    return { type: 'skill', code, summary, note: skill.note };
  }

  // No skill — try code block (prototype: appendMsg with text, code blocks parsed in UI)
  const codeBlock = extractLastStrudelCode(txt);
  if (codeBlock) {
    return { type: 'code', code: codeBlock };
  }

  return { type: 'text', text: txt };
}

// ── requestAutofix ────────────────────────────────────────────────────────

/**
 * Ask the agent to fix broken Strudel code.
 *
 * Prototype parity: reference/orbifold.html lines 1648–1667 (requestAutofix function).
 *
 * Sends a fix prompt to the provider with the bad code and error message.
 * Appends to chatHistory (same conversation thread).
 * Returns the corrected code string (extracted from response), or null on failure.
 *
 * @param badCode  - The Strudel code string that caused an error.
 * @param errorMsg - The error message returned by the Strudel evaluator.
 */
export async function requestAutofix(badCode: string, errorMsg: string): Promise<string | null> {
  const provider = PROVIDERS[agentProvider];
  const key = loadApiKey(agentProvider);
  if (!key) return null;

  const model = agentModel || provider.defaultModel;

  // Fix prompt (prototype line 1652)
  const fixPrompt =
    `El código Strudel que generaste dio este error al ejecutarse:\n\n"${errorMsg}"\n\n` +
    `Código:\n\`\`\`\n${badCode}\n\`\`\`\n\n` +
    `Corrígelo (comillas, paréntesis/corchetes, comas). Devuelve SOLO el bloque de código Strudel corregido, completo y ejecutable.`;

  chatHistory.push({ role: 'user', content: fixPrompt });

  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers(key),
      body: JSON.stringify(provider.body(model, SYSTEM_PROMPT, chatHistory)),
    });
    const data: unknown = await res.json();

    const dataObj = data as Record<string, unknown>;
    if (dataObj.error) return null;

    const txt = provider.parse(data);
    if (!txt) return null;

    chatHistory.push({ role: 'assistant', content: txt });

    // Extract the corrected code (prototype line 1665)
    return extractLastStrudelCode(txt);
  } catch {
    return null;
  }
}

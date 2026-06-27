// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — agent: SYSTEM_PROMPT, send, requestAutofix, tryParseSkill, extractLastStrudelCode.
//
// Phase 06 step 06.3; updated in Phase 07 step 07.3 (sendEvolution plan mode + input trim).
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

import {
  sessionStore,
  setAutopilot,
  rhythmCode,
  harmonyCode,
  sessionCode,
  isNoteSlot,
} from '../state/session.js';
import { NOTE_NAMES } from '../core/theory/pitch.js';
import { PROVIDERS, loadApiKey, type ProviderKey, type ChatMessage } from './providers.js';
import { AgentOutputSchema, EvolutionPlanSchema, type AgentOutput } from './schema.js';
import { applyRhythmSpec, applyHarmonySpec, applyBlockSave } from './apply.js';
import { lang, t_raw } from '../i18n/index.js';
import type { LangCode } from '../i18n/index.js';
import { getExpressibleRecipes } from '../core/music-knowledge/recipe-engine.js';
import { getRhythmById } from '../core/music-knowledge/query.js';

// ── ADR 0017 D7: language directive ──────────────────────────────────────────
// Maps LangCode → user-facing language name used in the directive injected into
// each API request. SYSTEM_PROMPT stays Spanish; the directive targets the reply.
const LANGUAGE_NAMES: Record<LangCode, string> = {
  es: 'español',
  en: 'inglés',
  pt: 'português',
  zh: 'chino',
};

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
Tienes TRES habilidades que actualizan DIRECTAMENTE la interfaz de Orbifold:
  • create_rhythm  → define las órbitas rítmicas (rejilla de 16 pasos / compás 4/4)
  • create_harmony → define la clave y la progresión de acordes (geometría Tonnetz)
  • save_as_block  → guarda el estado actual como un bloque editable en la biblioteca de composición

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
  RESTRICCIÓN DE FORMATO PARA RITMO:
  - "steps" debe tener EXACTAMENTE 16 elementos (0 o 1). Nunca 8, 12 ni otro número.
  - Para metros como 3/4, 6/8, 12/8: usa SIEMPRE "euclid" con n≤16, NO arrays "steps" de otro tamaño.
    Ejemplo correcto para 3/4:  { "euclid": { "k": 3, "n": 4, "rot": 0 } }  (E(3,4) = negras en 3/4)
    Ejemplo correcto para 6/8:  { "euclid": { "k": 4, "n": 12, "rot": 0 } } (E(4,12) = cueca)
    Ejemplo correcto para 12/8: { "euclid": { "k": 7, "n": 12, "rot": 0 } } (campana africana)
  - Si usas "steps", SIEMPRE son exactamente 16 números. Jamás menos.
- mode ∈ {major, minor, dorian, phrygian, lydian, mixolydian, locrian, harmonic:minor}
- quality ∈ {maj, min, dim, aug}
- root: nota como "C", "C#", "Eb", "F#"… ; octave 2..5
- Compón pensando en voice-leadings pequeños entre acordes (la app está organizada por la geometría de acordes).
- Detecta la intención: si solo piden ritmo → solo "rhythm"; si solo armonía → solo "harmony"; si ambos → las dos claves.
- NADA fuera del bloque json (sin texto antes ni después).

══════════ SKILL: save_as_block ══════════
Cuando el usuario diga "guarda esto como bloque", "save the current groove", "crea un bloque con esta armonía",
"añade esto a la composición" o frases similares, incluye el campo "saveAsBlock" en el JSON.

"saveAsBlock" puede aparecer SOLO (sin "rhythm" ni "harmony") o junto a ellos.
Cuando aparece junto a "rhythm"/"harmony", el bloque captura el estado YA actualizado.

Sub-campos de "saveAsBlock":
  • "name"       (string, obligatorio) — etiqueta visible para el bloque; usa un nombre descriptivo.
  • "type"       (string, obligatorio) — uno de exactamente tres valores:
      - "groove"  → captura solo las capas rítmicas actuales (GrooveSnapshot)
      - "armonia" → captura solo la progresión armónica actual (ArmoniaSnapshot)
      - "sesion"  → captura ritmo + armonía juntos (SesionSnapshot)
  • "addToTrack" (boolean, opcional, por defecto false) — si true, crea también una nueva
      pista en el timeline de composición referenciando el bloque guardado.
      Ponlo en true SIEMPRE que el usuario mencione alguna de estas palabras o frases:
        "pista", "timeline", "añade a una pista", "ponlo en el timeline",
        "crea una pista con este bloque", "agrégalo al timeline",
        "incluye en el timeline", "addToTrack true", "addToTrack: true",
        o cualquier petición explícita de agregar a la línea de tiempo de composición.
      Ejemplo de frases que DEBEN disparar "addToTrack": true:
        - "guarda el groove y añádelo al timeline"
        - "usa saveAsBlock con addToTrack true"
        - "crea una pista con este bloque"
        - "agrégalo a una pista nueva"

Ejemplo mínimo (solo guarda el groove actual):
\`\`\`json
{ "saveAsBlock": { "name": "Groove Afrobeat", "type": "groove" } }
\`\`\`

Ejemplo completo (crea ritmo, lo guarda como sesión y lo añade al timeline):
\`\`\`json
{
  "rhythm": { "layers": [{ "sound": "bd", "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] }] },
  "saveAsBlock": { "name": "Pulso Base", "type": "sesion", "addToTrack": true }
}
\`\`\`

══════════ MODO CÓDIGO (solo si NO aplica una skill) ══════════
Si piden algo que no encaja en las skills (un efecto suelto, código Strudel libre), responde con UN bloque \`\`\`strudel ejecutable y comentado.
CONOCIMIENTO STRUDEL: note("a3 c#4 e4"), s("bd hh sd hh"), stack(...), mini-notation (espacio=secuencia, ~=silencio, <a b>=alternar, [a b]=subdivisión, ,=paralelo, (3,8)=euclidiano), .s("sawtooth"), .lpf(n), .gain(n), .room(n), .euclidRot(k,n,r).
NO uses setcps/setcpm/.fast/.slow para el tempo: la app fija el tempo vía setcps según el BPM. 1 ciclo = 1 compás 4/4.

══════════ IMPROVISACIÓN INFORMADA ══════════
Cuando el usuario pida un estilo o tradición musical que no encaje directamente en
ninguna receta del catálogo, puedes generar un patrón musical informado usando tu
propio conocimiento. Sigue estas sub-instrucciones:

A. RAZONA PRIMERO (internamente): antes de generar, considera las características
   culturales y musicales del estilo solicitado: células rítmicas características,
   compás típico, instrumentación, energía, tempo habitual.

B. GENERA CON FORMATOS VÁLIDOS: usa siempre "steps" (exactamente 16 enteros 0/1)
   o "euclid" {k:1..16, n:2..16, rot:0..n-1}. Nunca inventes nuevos campos.

C. INCLUYE musicalIntent.explanation (máx. 300 caracteres) describiendo qué
   características consultaste y por qué el patrón generado refleja ese estilo.

D. PRECISIÓN CULTURAL: describe los patrones como "inspirado en [estilo]" o "con
   características de [tradición]" — nunca afirmes que el patrón generado "es"
   definitivamente el patrón auténtico de esa tradición.

Ejemplo — usuario pide "algo que suene a kpanlogo ghanés":
\`\`\`json
{
  "rhythm": {
    "layers": [
      { "sound": "bd", "euclid": { "k": 3, "n": 8, "rot": 0 } },
      { "sound": "hh", "euclid": { "k": 7, "n": 12, "rot": 0 } }
    ]
  },
  "musicalIntent": {
    "style": "kpanlogo-inspired",
    "explanation": "Inspirado en el kpanlogo ghanés: tresillo en bajo (E(3,8)), campana bell E(7,12) en 12/8."
  }
}
\`\`\`
══════════════════════════════════════════════`;

// ── SYSTEM_PROMPT_EVOLUTION ───────────────────────────────────────────────

/**
 * System prompt for autopilot evolution calls (plan mode — ADR 0024 D1).
 *
 * Governs autonomous LLM calls fired by the autopilot timer in
 * src/agent/autopilot.ts. Entirely distinct from SYSTEM_PROMPT (which
 * governs user-initiated send() calls).
 *
 * Phase 07 step 07.3: Updated to instruct the LLM to return a multi-step
 * evolution plan `{ "plan": [...] }` instead of a single step. The number of
 * steps is injected as `horizon` in the user message (static system prompt).
 *
 * Invariants (ADR 0022 D4):
 * - Does NOT cause chatHistory mutation — sendEvolution() never pushes to
 *   chatHistory; the history is not passed to the API request at all.
 * - Instructs the LLM to produce a coherent arc of musical variants,
 *   NOT unrelated patterns.
 * - Explicit no-saveAsBlock instruction (saveAsBlock forbidden in evolution).
 * - Spanish prompt per ADR 0017 D7.
 * - Uses EvolutionPlanSchema wrapper (ADR 0024 D1); AgentOutputSchema v6
 *   shape per step (D7 — no SCHEMA_VERSION bump).
 */
export const SYSTEM_PROMPT_EVOLUTION = `Eres el motor de evolución autónoma de Orbifold.
Recibes un snapshot JSON del estado musical en vivo y un campo "horizon" (número de pasos).
Devuelve exactamente "horizon" variaciones coherentes y pequeñas que formen un arco musical progresivo.

SALIDA: un único bloque json con el plan completo.

SCHEMA DE SALIDA:
\`\`\`
{
  "plan": [
    {
      "rhythm?": {
        "layers": [{
          "sound": "bd|sd|hh|oh|cp|rim|lt|mt|ht",
          "steps": [exactamente 16 enteros 0|1],
          "euclid": { "k": 1-16, "n": 2-16, "rot": 0..n-1 },
          "gain?": 0.0-1.0
        }]
      },
      "harmony?": {
        "root": "C|C#|D|D#|E|F|F#|G|G#|A|A#|B",
        "mode?": "major|minor|dorian|phrygian|lydian|mixolydian|locrian",
        "octave?": 0-8,
        "progression": [{ "root": "C|C#|...", "quality": "maj|min|dim|aug", "bars?": 0.25-múltiplo, "gain?": 0.0-1.0 }]
      },
      "musicalIntent?": {
        "recipeId?": "<id de availableRecipeSummaries>",
        "style?": "etiqueta libre",
        "complexity?": "simple|medium|dense",
        "explanation?": "≤300 chars"
      }
    }
  ]
}
\`\`\`

REGLAS:
1. EVOLUCIÓN MÍNIMA: cada paso cambia 1–3 pasos de ritmo o 1 acorde de armonía respecto al paso anterior.
2. CAPAS BLOQUEADAS: si \`locked: true\` aparece en una capa del stateSnapshot, NO la modifiques ni la omitas. Solo propón cambios en capas con \`locked: false\` o sin campo \`locked\`. Las capas bloqueadas son la firma rítmica cultural de la receta activa.
3. VARIACIÓN OBLIGATORIA: cada paso DEBE diferir del anterior (≥2 onsets distintos o ≥1 acorde distinto); el arco debe ser progresivo y coherente.
4. Si hay "rhythmHint" o "rhythmHintFreeText": orienta la evolución hacia ese estilo cultural; usa tu conocimiento del género para elegir patrones auténticos.
5. Si usas "musicalIntent.recipeId": debe ser un id de la lista "availableRecipeSummaries" del mensaje.
6. Cuando solo envías "musicalIntent.recipeId" (sin rhythm/harmony), Orbifold aplica la receta completa automáticamente.
7. JSON COMPACTO: cada array en UNA sola línea, p.ej. "steps":[1,0,0,1,1,0,1,0,1,0,0,1,0,1,0,0]. NO uses pretty-print con un número por línea (desperdicia tokens y trunca la respuesta).
8. NUNCA "saveAsBlock". NUNCA texto fuera del bloque json.

Ejemplo con horizon=2:
\`\`\`json
{
  "plan": [
    {
      "rhythm": { "layers": [{ "sound": "bd", "steps": [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] }, { "sound": "hh", "euclid": { "k": 3, "n": 8, "rot": 0 } }] },
      "musicalIntent": { "style": "afro-latin", "complexity": "simple", "explanation": "Paso 1: groove base con tresillo." }
    },
    {
      "rhythm": { "layers": [{ "sound": "bd", "steps": [1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0] }, { "sound": "hh", "euclid": { "k": 5, "n": 8, "rot": 1 } }] },
      "harmony": { "root": "D", "mode": "minor", "octave": 3, "progression": [{ "root": "D", "quality": "min" }, { "root": "A", "quality": "maj" }] },
      "musicalIntent": { "style": "afro-latin", "complexity": "medium", "explanation": "Paso 2: más síncopa en BD + tensión armónica." }
    }
  ]
}
\`\`\``;

// ── sendEvolution ─────────────────────────────────────────────────────────

/**
 * Fire an autopilot evolution LLM call that returns a multi-step plan.
 *
 * Phase 07 step 07.3 — plan mode (ADR 0024 D1/D3/D5/D6):
 * - Computes `horizon` from `intervalCycles` (D6, clamped formula).
 * - Applies input-trim rule: omit `availableRecipeSummaries` when a rhythm
 *   hint is present (D5); always compact `steps` arrays to binary strings.
 * - Parses the LLM response with `EvolutionPlanSchema.safeParse` (D1).
 * - Stores the plan in `AutopilotState.currentPlan` via `setAutopilot` (D2).
 * - Does NOT apply any plan step here — that is `tick()`'s responsibility (D3).
 *
 * Invariants (ADR 0022 D4):
 * - NEVER pushes to chatHistory.
 * - NEVER calls applyBlockSave.
 * - Returns void — the caller (tick()) uses .finally() to reset _isEvolving.
 */
export async function sendEvolution(): Promise<void> {
  const provider = PROVIDERS[agentProvider];
  const key = loadApiKey(agentProvider);
  if (!key) return; // No API key — silently skip (background operation)

  const model = agentModel || provider.defaultModel;

  // Read live state.
  const state = get(sessionStore);

  // ── D6: Horizon formula (clamped — ADR 0024 D6 amendment) ─────────────────
  // horizon = Math.min(8, Math.max(2, Math.round(intervalCycles / 2)))
  // At default intervalCycles=8: horizon=4. At min=2: horizon=2. At max=32: horizon=8.
  const horizon = Math.min(8, Math.max(2, Math.round(state.autopilot.intervalCycles / 2)));

  // ── Build stateSnapshot in AgentOutputSchema format ────────────────────────
  // Session Chord uses rootPc (number) + qual; AgentOutputSchema uses root (note name) + quality.
  //
  // D5 (compact step encoding — LLM-payload-only):
  // steps: number[] stored in the session model are encoded as compact binary strings
  // (e.g., [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] → "1000100010001000") in the payload.
  // The stored model in sessionStore is UNCHANGED.
  const stateSnapshot = {
    rhythm: {
      layers: state.rhythm.layers.map((layer) => {
        if ('euclid' in layer && layer.euclid) {
          // Euclid layer — pass through as-is (no steps array to compact)
          // Phase 05: include locked field so LLM knows which layers to preserve.
          return { sound: layer.sound, euclid: layer.euclid, locked: layer.locked ?? false };
        }
        // Steps layer — compact binary string (LLM-payload-only per ADR 0024 D5)
        // Phase 05: include locked field so LLM knows which layers to preserve.
        return { sound: layer.sound, steps: layer.steps.join(''), locked: layer.locked ?? false };
      }),
    },
    harmony: {
      root: NOTE_NAMES[state.harmony.root],
      mode: state.harmony.mode,
      octave: state.harmony.octave,
      progression: state.harmony.progression.map((ch) => {
        if ('isRest' in ch) {
          return ch.bars ? { isRest: true, bars: ch.bars } : { isRest: true };
        }
        // NoteSlot: represent as a compact note descriptor in the agent prompt.
        if (isNoteSlot(ch)) {
          return ch.bars
            ? { isNote: true, rootPc: ch.rootPc, octaveOffset: ch.octaveOffset, bars: ch.bars }
            : { isNote: true, rootPc: ch.rootPc, octaveOffset: ch.octaveOffset };
        }
        const entry: Record<string, unknown> = {
          root: NOTE_NAMES[ch.rootPc],
          quality: ch.qual,
          gain: ch.gain,
        };
        if (ch.bars !== undefined && ch.bars !== 1) entry['bars'] = ch.bars;
        return entry;
      }),
    },
  };

  // ── Rhythm hint payload (Phase 06 step 06.2, preserved) ───────────────────
  // Uses human-readable name for catalog ids (getRhythmById fallback to id string).
  // 'otro' with free text injects rhythmHintFreeText; empty hint omits both fields.
  const { rhythmHint, rhythmHintText } = state.autopilot;
  const rhythmHintPayload: Record<string, string> = {};
  if (rhythmHint && rhythmHint !== 'otro') {
    rhythmHintPayload['rhythmHint'] = getRhythmById(rhythmHint)?.name ?? rhythmHint;
  } else if (rhythmHint === 'otro' && rhythmHintText.trim()) {
    rhythmHintPayload['rhythmHintFreeText'] = rhythmHintText.trim();
  }

  // ── D5: Input-trim rule (ADR 0024 D5) ─────────────────────────────────────
  // Omit `availableRecipeSummaries` when a rhythm hint is present.
  // When a style name is given, the LLM uses its cultural knowledge — the catalog
  // is unnecessary and costs ~740 tokens.
  // When no hint is present, include the catalog so the LLM can pick a recipe id.
  const hintPresent = Boolean(
    rhythmHintPayload['rhythmHint'] ?? rhythmHintPayload['rhythmHintFreeText']
  );
  const recipePart: Record<string, unknown> = {};
  if (!hintPresent) {
    // Only send the minimal fields the LLM needs: id, name, density, meter.
    recipePart['availableRecipeSummaries'] = getExpressibleRecipes().map(
      ({ id, name, density, meter }) => ({ id, name, density, meter })
    );
  }

  // User message: horizon first, then stateSnapshot, then optional recipes and hint.
  const userMessage = JSON.stringify(
    { horizon, stateSnapshot, ...recipePart, ...rhythmHintPayload },
    null,
    2
  );

  // ── Fetch using SYSTEM_PROMPT_EVOLUTION (NOT SYSTEM_PROMPT) ───────────────
  // No chatHistory used — clean-slate one-shot call (ADR 0022 D3/D4).
  let txt: string;
  try {
    const res = await fetch(provider.url, {
      method: 'POST',
      headers: provider.headers(key),
      // max_tokens 2000: Phase 07 requests a horizon-step plan (default horizon=4,
      // max=8). Each compact step is ~150–250 tokens; 8 steps ≈ 1200–2000 tokens.
      // 600 was sufficient for a single AgentOutput (Phase 06) but truncates
      // multi-step plans mid-JSON, causing JSON.parse → __badFormat__.
      body: JSON.stringify(
        provider.body(
          model,
          SYSTEM_PROMPT_EVOLUTION,
          [{ role: 'user', content: userMessage }],
          2000
        )
      ),
    });
    const data: unknown = await res.json();

    if (!res.ok) {
      if (res.status === 429) {
        setAutopilot({ llmError: '__rateLimit__' }); // sentinel, decoded in UI
        return;
      }
      const dataObj = data as Record<string, unknown>;
      const errMsg =
        ((dataObj.error as Record<string, unknown>)?.message as string) ?? `HTTP ${res.status}`;
      setAutopilot({ llmError: errMsg });
      return;
    }

    const dataObj = data as Record<string, unknown>;
    if (dataObj.error) {
      const errMsg =
        ((dataObj.error as Record<string, unknown>)?.message as string) ?? 'Unknown error';
      setAutopilot({ llmError: errMsg });
      return;
    }

    txt = provider.parse(data);
    if (!txt) {
      // Empty response — surface it instead of failing silently (Phase 06 error-surfacing).
      // eslint-disable-next-line no-console
      console.warn('[autopilot] provider returned an empty response', data);
      setAutopilot({ llmError: '__emptyResponse__' });
      return;
    }
  } catch (e) {
    // Network / JSON-parse exception — surface it instead of failing silently (Phase 06).
    // eslint-disable-next-line no-console
    console.error('[autopilot] evolution request failed', e);
    setAutopilot({ llmError: e instanceof Error ? e.message : String(e) });
    return;
  }

  // ── Parse the plan envelope with EvolutionPlanSchema ─────────────────────
  // The LLM returns { "plan": [ <step1>, … ] } — a wrapper object.
  // Extract the JSON object the same way tryParseSkill does (fence → brace fallback).
  let rawParsed: unknown;
  try {
    // Step 1: try ```json fence
    let jsonStr: string | null = null;
    const fence = /```json\s*([\s\S]*?)```/i.exec(txt);
    if (fence) {
      jsonStr = fence[1];
    } else {
      // Step 2: outermost { … } span
      const a = txt.indexOf('{');
      const b = txt.lastIndexOf('}');
      if (a >= 0 && b > a) jsonStr = txt.slice(a, b + 1);
    }
    if (!jsonStr) throw new SyntaxError('no JSON object found in response');
    rawParsed = JSON.parse(jsonStr);
  } catch {
    // Response was not valid JSON — surface the bad-format sentinel (Phase 06).
    // eslint-disable-next-line no-console
    console.warn(
      '[autopilot] response was not valid evolution JSON:',
      txt.length > 500 ? txt.slice(0, 500) + '…' : txt
    );
    setAutopilot({ llmError: '__badFormat__' });
    return;
  }

  // ── Validate with EvolutionPlanSchema.safeParse (ADR 0024 D1/D4) ─────────
  const planResult = EvolutionPlanSchema.safeParse(rawParsed);
  if (!planResult.success) {
    // Invalid or empty plan — D4 sentinel (plan parse failure is __emptyPlan__).
    // eslint-disable-next-line no-console
    console.warn('[autopilot] plan parse failed:', planResult.error.issues);
    setAutopilot({ llmError: '__emptyPlan__', currentPlan: [], planIndex: 0 });
    return;
  }

  // ── Store the plan — tick() will consume one step at a time (ADR 0024 D3) ─
  // NEVER apply any plan step here. NEVER push to chatHistory. NEVER call applyBlockSave.
  setAutopilot({ llmError: null, currentPlan: planResult.data.plan, planIndex: 0 });
}

// ── normalizeEuclidStrings ────────────────────────────────────────────────

/**
 * Coerce `"euclid": "k,n,rot"` string values to `{k, n, rot}` objects.
 *
 * Some LLMs return `"euclid": "3,8,2"` (a comma-separated string) instead of
 * the required JSON object `{"k":3,"n":8,"rot":2}`. This function normalizes
 * the raw parsed JSON before Zod validation so the parse succeeds.
 *
 * Only touches `rhythm.layers[*].euclid` — everything else is passed through.
 */
function normalizeEuclidStrings(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  if (!obj.rhythm || typeof obj.rhythm !== 'object' || Array.isArray(obj.rhythm)) return raw;
  const rhythm = obj.rhythm as Record<string, unknown>;
  if (!Array.isArray(rhythm.layers)) return raw;

  const layers = (rhythm.layers as unknown[]).map((layer: unknown) => {
    if (!layer || typeof layer !== 'object' || Array.isArray(layer)) return layer;
    const l = layer as Record<string, unknown>;
    if (typeof l.euclid !== 'string') return layer;
    const parts = (l.euclid as string).split(',').map(Number);
    if (parts.length >= 2 && parts.every((p) => Number.isFinite(p))) {
      return { ...l, euclid: { k: parts[0], n: parts[1], rot: parts[2] ?? 0 } };
    }
    return layer;
  });

  return { ...obj, rhythm: { ...rhythm, layers } };
}

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

  // Step 3: parse JSON and normalize LLM quirks before Zod validation
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
    raw = normalizeEuclidStrings(raw); // coerce "3,8,2" → {k,n,rot}
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
      progDesc = progression
        .map((c) => {
          if ('isRest' in c) return '–';
          if (isNoteSlot(c)) return `♩${NOTE_NAMES[c.rootPc] ?? '?'}`;
          return `${NOTE_NAMES[c.rootPc]}${c.qual}`;
        })
        .join(' → ');
    }
    addendum += `\n\n[MARCO ARMÓNICO (geometría de acordes; COMPÓN DENTRO de esta clave):\nClave: ${scaleName} (octava ${octave})\nProgresión: ${progDesc}\nPrioriza voice-leadings pequeños entre acordes consecutivos. T=tónica, SD=subdominante, D=dominante.]`;
  }

  // Both contexts: remind to combine (prototype line 1751)
  if (ctx.includeRhythmCtx && ctx.includeHarmonyCtx) {
    addendum += `\n\n[IMPORTANTE: combina AMBOS marcos en UN SOLO stack() para que ritmo y armonía suenen juntos.]`;
  }

  // ADR 0017 D7: append language directive so the agent replies in the user's language.
  // SYSTEM_PROMPT stays Spanish; this directive overrides the reply language per request.
  const currentLang = get(lang);
  const languageName = LANGUAGE_NAMES[currentLang] ?? 'español';
  addendum += '\n\n' + t_raw('agent.languageDirective', { languageName });

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
    // ADR 0021 D4: applyBlockSave runs AFTER applyRhythmSpec and applyHarmonySpec,
    // so the snapshot captures the fully-applied agent state.
    // 'saveAsBlock' is intentionally NOT added to the `did` array —
    // `did` drives the summary text; block-save summary is handled separately per OQ-4.
    if (skill.saveAsBlock) {
      applyBlockSave(skill.saveAsBlock);
    }

    // ADR 0021 D4 / OQ-3: updated guard — do NOT return 'text' if only saveAsBlock fired.
    if (did.length === 0 && !skill.saveAsBlock) {
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
    } else if (did.includes('armonía')) {
      code = harmonyCode(updatedState).trim();
    } else {
      // OQ-4: save-only path (did is empty; only saveAsBlock fired).
      // Use full sessionCode so the live code drawer shows what is playing.
      code = sessionCode(updatedState);
    }

    // Build summary
    let summary: string;
    if (did.length === 0 && skill.saveAsBlock) {
      // OQ-4: save-only summary — acknowledge the block save explicitly.
      const savedName = skill.saveAsBlock.name.trim().slice(0, 100);
      const savedType = skill.saveAsBlock.type;
      summary = `✓ Guardé el ${savedType} actual como bloque «${savedName}»`;
      if (skill.saveAsBlock.addToTrack === true) {
        summary += ` y lo añadí a una pista nueva en la composición.`;
      }
    } else {
      // Standard summary (prototype lines 1771–1773)
      summary =
        `✓ Actualicé la interfaz: ${did.join(' + ')}.` +
        (skill.note ? `\n${skill.note}` : '') +
        `\nLa ${did.includes('ritmo') && did.includes('armonía') ? 'Sesión (ritmo + armonía)' : did.includes('ritmo') ? 'Ritmo (groove)' : 'Armonía (progresión)'} "actual" ya quedó lista — puedes guardarla como bloque (🎚 composición) o tocarla aquí. La valido al sonar (auto-corrector activo).`;
      if (skill.saveAsBlock) {
        // Both rhythm/harmony AND saveAsBlock fired — append block-save acknowledgment.
        const savedName = skill.saveAsBlock.name.trim().slice(0, 100);
        summary += `\n✓ También guardé el bloque «${savedName}»`;
        if (skill.saveAsBlock.addToTrack === true) {
          summary += ` y lo añadí a una pista nueva en la composición.`;
        } else {
          summary += `.`;
        }
      }
    }

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
  // ADR 0017 D7: append language directive so the autofix reply is in the user's language.
  const currentLang = get(lang);
  const languageName = LANGUAGE_NAMES[currentLang] ?? 'español';
  const langDirective = t_raw('agent.languageDirective', { languageName });
  const fixPrompt =
    `El código Strudel que generaste dio este error al ejecutarse:\n\n"${errorMsg}"\n\n` +
    `Código:\n\`\`\`\n${badCode}\n\`\`\`\n\n` +
    `Corrígelo (comillas, paréntesis/corchetes, comas). Devuelve SOLO el bloque de código Strudel corregido, completo y ejecutable.\n\n` +
    langDirective;

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

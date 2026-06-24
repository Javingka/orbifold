// SPDX-License-Identifier: AGPL-3.0-only
// Orbifold — Autopilot timer: start/stop the autonomous evolution loop.
//
// ai-jam Phase 01 step 01.3; revised Phase 06 heuristic fix; revised Phase 07
// step 07.4 (plan-consumption tick loop — ADR 0024 D3).
//
// Fires sendEvolution() on a BPM-derived setInterval when the autopilot is
// enabled. In plan mode (Phase 07+), sendEvolution() stores a multi-step plan
// in AutopilotState.currentPlan; tick() consumes one step per tick and re-calls
// sendEvolution() only when the plan is exhausted.
//
// ADR 0022 D2: intervalMs = Math.round((60000 * 4 / bpm) * intervalCycles)
// ADR 0022 D3: _isEvolving flag prevents overlapping LLM calls
// ADR 0022 D5: BPM read from get(sessionStore).bpm (NOT strudel.ts private _currentBpm)
// ADR 0024 D3: plan-consumption loop — one step per tick; _isEvolving guards only LLM re-call
// ADR 0024 D4: saveAsBlock in plan steps silently ignored
//
// Phase 06 heuristic fix:
//   - Bar starts filling immediately whenever autopilot is enabled — no more
//     nowPlaying.label or isPlaying() guards on the bar.
//   - If rhythm/harmony is configured but nothing is playing → auto-play is
//     triggered from startAutopilot().
//   - tick() sets lagWarning when a prior LLM call is still in flight.
//   - stopAutopilot() resets lagWarning and llmError.
//   - sendEvolution() now stores llmError on HTTP/provider failures.
//   - Dynamic import of isPlaying() and _playbackUnsub subscription removed.
//
// Phase 07 step 07.4 (plan-consumption):
//   - tick() checks currentPlan/planIndex: applies one step if available.
//   - Recipe engine path (getRecipeById + recipeToAgentOutput) moved here from
//     agent.ts (removed from sendEvolution in step 07.3).
//   - startAutopilot() and stopAutopilot() reset plan fields (ADR 0024 D3).
//
// No DOM imports. No Svelte component imports. Unit-testable in Node with fake timers.

import { get } from 'svelte/store';

import {
  sessionStore,
  setAutopilot,
  setLastRecipeApplied,
  playGroove,
  playProgression,
  playSession,
  requeueLive,
} from '../state/session.js';
import type { LastRecipeDisplay } from '../state/session.js';
import { sendEvolution } from './agent.js';
import { applyRhythmSpec, applyHarmonySpec, applySampleMap } from './apply.js';
import { getRecipeById } from '../core/music-knowledge/query.js';
import { recipeToAgentOutput } from '../core/music-knowledge/recipe-engine.js';
import type { AgentOutput } from './schema.js';

/**
 * True while a sendEvolution() call is in flight.
 * Guards against overlapping LLM calls when the user's network is slow
 * or intervalCycles is set very low (e.g., 2 cycles at low BPM).
 *
 * Per ADR 0022 D3 / ADR 0024 D3: guards ONLY the LLM re-call path.
 * Plan-step application is fast/synchronous and is NOT gated by this flag.
 */
let _isEvolving = false;

/** Module-level setInterval handle. Null when autopilot is stopped. */
let _timerId: ReturnType<typeof setInterval> | null = null;

// ── Private plan-step application helper ─────────────────────────────────────

/**
 * Apply a single plan step from the current plan.
 *
 * Per ADR 0024 D3/D4/D7:
 * - Applies step.rhythm via applyRhythmSpec (if present).
 * - Applies step.harmony via applyHarmonySpec (if present).
 * - Resolves step.musicalIntent.recipeId via the recipe engine (if present).
 *   Applies whichever of rhythm/harmony the recipe provides that the step
 *   did NOT already supply explicitly. Updates the recipe display card.
 * - step.saveAsBlock is SILENTLY IGNORED (ADR 0022 D4 / ADR 0024 D7).
 *
 * @param step - A single AgentOutput step from the current plan.
 * @returns true if anything was applied (triggers requeueLive); false otherwise.
 */
const ALL_PRESETS = ['piano', 'guitar', 'synth-bass'] as const;
type HarmonyPreset = (typeof ALL_PRESETS)[number];

/**
 * After applyHarmonySpec() updates the store, stamp a preset on every chord
 * slot according to autopilot.harmonyPresets:
 *   [] → random pick from all 3 presets per chord
 *   [one] → all chords use that preset
 *   [two+] → each chord picks randomly from the subset
 */
function applyHarmonyPresetOverride(): void {
  const { autopilot, harmony } = get(sessionStore);
  const pool: readonly HarmonyPreset[] =
    autopilot.harmonyPresets.length > 0 ? autopilot.harmonyPresets : ALL_PRESETS;
  sessionStore.update((s) => ({
    ...s,
    harmony: {
      ...s.harmony,
      progression: harmony.progression.map((slot) => {
        if ('isRest' in slot) return slot;
        const preset = pool[Math.floor(Math.random() * pool.length)];
        return { ...slot, preset };
      }),
    },
  }));
}

function applyPlanStep(step: AgentOutput): boolean {
  let applied = false;

  // Apply explicit rhythm (ADR 0024 D3)
  if (step.rhythm) {
    applyRhythmSpec(step.rhythm);
    applied = true;
  }

  // Apply explicit harmony (ADR 0024 D3), then stamp preset on every chord.
  if (step.harmony) {
    applyHarmonySpec(step.harmony);
    applyHarmonyPresetOverride();
    applied = true;
  }

  // Recipe engine path — only if recipeId is present (ADR 0024 D3)
  if (step.musicalIntent?.recipeId) {
    const recipe = getRecipeById(step.musicalIntent.recipeId);
    if (recipe !== undefined) {
      const engineOutput = recipeToAgentOutput(recipe);
      if (engineOutput !== null) {
        // Apply recipe rhythm only if the step did NOT supply explicit rhythm
        if (!step.rhythm && engineOutput.rhythm) {
          applyRhythmSpec(engineOutput.rhythm);
          // ADR 0025 D4: overlay strudelSample from the recipe's sampleMap.
          // Called immediately after applyRhythmSpec so layers are in the store.
          // applySampleMap carries zero genre knowledge — it is handed the map.
          applySampleMap(recipe.sampleMap ?? {});
          applied = true;
        }
        // Apply recipe harmony only if the step did NOT supply explicit harmony
        if (!step.harmony && engineOutput.harmony) {
          applyHarmonySpec(engineOutput.harmony);
          applyHarmonyPresetOverride();
          applied = true;
        }
      }
      // Update the recipe card display state (ai-jam Phase 04 step 04.2).
      // Fires regardless of engineOutput null — even a non-expressible recipe shows intent.
      const display: LastRecipeDisplay = {
        recipeId: recipe.id,
        recipeName: recipe.name,
        rhythmIds: recipe.rhythmIds,
        harmonyId: recipe.harmonyId,
        density: recipe.density,
        ...(step.musicalIntent.explanation ? { explanation: step.musicalIntent.explanation } : {}),
      };
      setLastRecipeApplied(display);
    }
    // If recipe not found: silent no-op (unknown recipeId)
  }

  return applied;
}

// ── applyRecipeById (public) ────────────────────────────────────────────────────

/**
 * Apply a recipe by ID through the same path as autopilot plan steps (ADR 0025 D4).
 *
 * Looks up the recipe via getRecipeById, converts it to an AgentOutput via
 * recipeToAgentOutput, then calls applyRhythmSpec + applySampleMap +
 * applyHarmonySpec + setLastRecipeApplied, and finally requeueLive().
 *
 * Returns true if the recipe was found and applied; false if the ID is unknown
 * or the recipe is not expressible (recipeToAgentOutput returns null).
 *
 * No LLM call is made. Called from the UI recipe chip row.
 *
 * Call order:
 *   1. applyRhythmSpec(engineOutput.rhythm)  — clears lastRecipeApplied (apply.ts)
 *   2. applySampleMap(recipe.sampleMap ?? {}) — ADR 0025 D4
 *   3. applyHarmonySpec(engineOutput.harmony) — clears lastRecipeApplied (apply.ts)
 *   4. setLastRecipeApplied(display)          — re-sets badge (last write wins)
 *   5. requeueLive()                          — re-evaluate at next cycle boundary
 *   6. auto-play heuristic (same as tick() Path A)
 */
export function applyRecipeById(id: string): boolean {
  // Step 1: look up recipe.
  const recipe = getRecipeById(id);
  if (recipe === undefined) return false;

  // Step 2: convert to AgentOutput. Returns null for non-expressible recipes.
  const engineOutput = recipeToAgentOutput(recipe);
  if (engineOutput === null) return false;

  // recipeToAgentOutput always populates both rhythm and harmony when non-null;
  // the undefined guard keeps TypeScript strict-mode satisfied.
  if (!engineOutput.rhythm || !engineOutput.harmony) return false;

  // Step 3: apply rhythm (clears lastRecipeApplied badge).
  applyRhythmSpec(engineOutput.rhythm);

  // Step 4: overlay strudelSample from the recipe's sampleMap (ADR 0025 D4).
  applySampleMap(recipe.sampleMap ?? {});

  // Step 5: apply harmony (clears lastRecipeApplied badge again).
  applyHarmonySpec(engineOutput.harmony);

  // Step 6: re-set the badge — last write wins over the clears in steps 3 + 5.
  const display: LastRecipeDisplay = {
    recipeId: recipe.id,
    recipeName: recipe.name,
    rhythmIds: recipe.rhythmIds,
    harmonyId: recipe.harmonyId,
    density: recipe.density,
  };
  setLastRecipeApplied(display);

  // Step 7: re-queue audio at next cycle boundary.
  requeueLive();

  // Step 8: auto-play if nothing is currently playing (same heuristic as tick() Path A).
  const postState = get(sessionStore);
  if (postState.nowPlaying.label === null) {
    const hasRhythm = postState.rhythm.layers.length > 0;
    const hasHarmony = postState.harmony.progression.length > 0;
    if (hasRhythm && hasHarmony) {
      playSession().catch(() => {});
    } else if (hasRhythm) {
      playGroove().catch(() => {});
    } else if (hasHarmony) {
      playProgression().catch(() => {});
    }
  }

  return true;
}

// ── tick ───────────────────────────────────────────────────────────────────────

/**
 * Autopilot tick function. Called by setInterval on every interval boundary.
 *
 * Phase 07 plan-consumption logic (ADR 0024 D3):
 *
 * Path A — Step available (currentPlan.length > 0 && planIndex < currentPlan.length):
 *   1. Apply currentPlan[planIndex] via applyPlanStep.
 *   2. Advance planIndex by 1.
 *   3. Call requeueLive() if anything was applied.
 *   4. Auto-play if nothing was playing.
 *   Does NOT call sendEvolution(); _isEvolving NOT checked/set.
 *
 * Path B — Plan exhausted or never set (planIndex >= currentPlan.length):
 *   - If _isEvolving true: set lagWarning=true and return (concurrency guard).
 *   - If _isEvolving false: reset plan fields, set _isEvolving=true, call sendEvolution().
 *
 * Per ADR 0024 D3.
 */
async function tick(): Promise<void> {
  if (!get(sessionStore).autopilot.enabled) return;

  const { currentPlan, planIndex } = get(sessionStore).autopilot;

  if (currentPlan.length > 0 && planIndex < currentPlan.length) {
    // ── Path A: Plan step available — consume one step ─────────────────────
    const step = currentPlan[planIndex];

    // Advance planIndex and reset timerStartedAt immediately (ADR 0024 D3 §5)
    setAutopilot({ planIndex: planIndex + 1, timerStartedAt: Date.now(), lagWarning: false });

    // Apply step (ADR 0024 D3/D7: saveAsBlock silently ignored inside applyPlanStep)
    const applied = applyPlanStep(step);

    // Re-queue audio at next cycle boundary if anything changed
    if (applied) requeueLive();

    // Auto-play if nothing is currently playing (same heuristic as startAutopilot)
    const postState = get(sessionStore);
    if (postState.nowPlaying.label === null) {
      const hasRhythm = postState.rhythm.layers.length > 0;
      const hasHarmony = postState.harmony.progression.length > 0;
      if (hasRhythm && hasHarmony) {
        playSession().catch(() => {});
      } else if (hasRhythm) {
        playGroove().catch(() => {});
      } else if (hasHarmony) {
        playProgression().catch(() => {});
      }
    }

    return;
  }

  // ── Path B: Plan exhausted or never set — re-call LLM ─────────────────────
  if (_isEvolving) {
    // LLM from previous plan generation still in flight — warn the user.
    setAutopilot({ lagWarning: true });
    return;
  }

  // Reset plan fields and start fresh (ADR 0024 D3 §2).
  // Do NOT reset timerStartedAt here: on the very first call timerStartedAt is 0
  // and the bar should stay flat while waiting for the LLM. On subsequent calls
  // timerStartedAt retains the value from the last applied step, so the bar
  // continues counting (and may hit 100% + lagWarning) until the next step arrives.
  setAutopilot({ currentPlan: [], planIndex: 0, lagWarning: false });

  _isEvolving = true;
  sendEvolution()
    .catch(() => {
      // sendEvolution logs its own errors; swallow here to always reset the flag
    })
    .finally(() => {
      _isEvolving = false;
    });
}

/**
 * Start the autopilot timer.
 *
 * Clears any existing timer before creating a new one (idempotent restart).
 * Reads BPM and intervalCycles from sessionStore at call time (ADR 0022 D5).
 * Computes intervalMs per ADR 0022 D2 formula.
 *
 * Resets currentPlan and planIndex (ADR 0024 D3) so a stale plan from a
 * prior session is never consumed after restart.
 *
 * Bar starts filling immediately regardless of audio state.
 * If rhythm/harmony is configured but nothing is playing, auto-play is
 * triggered (fire-and-forget; no await — startAutopilot is sync).
 * If nothing is configured, the LLM will generate patterns on the first tick
 * and sendEvolution will auto-play after applying them.
 *
 * Per ADR 0022 D2.
 */
export function startAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }

  const session = get(sessionStore);
  const { bpm, autopilot } = session;
  const intervalMs = Math.round(((60000 * 4) / bpm) * autopilot.intervalCycles);

  // timerStartedAt stays 0 until the first plan step is applied (Path A in tick()).
  // The progress bar gates on timerStartedAt > 0, so it stays flat while the
  // initial LLM call is in flight (before any audio is actually playing).
  // Reset plan fields so a stale plan is never consumed (ADR 0024 D3).
  setAutopilot({
    timerStartedAt: 0,
    lagWarning: false,
    llmError: null,
    currentPlan: [],
    planIndex: 0,
  });

  // If rhythm/harmony is configured but nothing playing → auto-play.
  if (session.nowPlaying.label === null) {
    const hasRhythm = session.rhythm.layers.length > 0;
    const hasHarmony = session.harmony.progression.length > 0;
    if (hasRhythm && hasHarmony) {
      playSession().catch(() => {}); // fire-and-forget; no await (startAutopilot is sync)
    } else if (hasRhythm) {
      playGroove().catch(() => {});
    } else if (hasHarmony) {
      playProgression().catch(() => {});
    }
    // If neither configured → LLM will generate on first tick; auto-play handled in tick() Path A.
  }

  _timerId = setInterval(tick, intervalMs);
}

/**
 * Stop the autopilot timer and reset the evolving flag.
 *
 * Clears _timerId, sets to null, resets _isEvolving to false, and resets
 * lagWarning, llmError, timerStartedAt, currentPlan, and planIndex to defaults.
 * If a tick is mid-flight, the in-flight sendEvolution() call is NOT
 * cancelled (no AbortController in Phase 01); it resolves but no further
 * ticks fire (timer is cleared).
 *
 * Per ADR 0022 D3 / ADR 0024 D3.
 */
export function stopAutopilot(): void {
  if (_timerId !== null) {
    clearInterval(_timerId);
    _timerId = null;
  }
  _isEvolving = false;
  // Reset timerStartedAt so the progress bar returns to 0 when stopped.
  // Also clear lag/error state and plan fields so the UI is clean when autopilot restarts.
  // NOTE: `enabled` is NOT set here — callers (UI handler) set enabled via
  // setAutopilot({ enabled: false }) separately, per ADR 0022 D2 ordering contract.
  setAutopilot({
    timerStartedAt: 0,
    lagWarning: false,
    llmError: null,
    currentPlan: [],
    planIndex: 0,
  });
}

# Review — Phase 01 Step 01.2 — Iteration 1

**Decision:** REVISE
**Date:** 2026-06-05
**Iteration:** 1 of 5
**Reviewer:** Planner

---

## Summary

The five theory engine implementations, the corrected golden-value tests, and the scripts/
exclusions from lint/prettier are all correct and commendable. One governance violation
requires a targeted fix before approval: the Dev edited `.claude/settings.json` (a committed,
shared governance file) to add four machine-specific absolute-path `allow` entries for
commands it ran during this step. That file is tuned by the Pilot, not the Dev, and
machine-specific absolute paths are useless to any other clone. One cosmetic change (the
`_comment` key relocation to the bottom of the file) is also unauthorized and must be
reverted.

---

## Checklist result

| Item | Status | Notes |
|---|---|---|
| 1. Commit scope clean | FAIL | `.claude/settings.json` contains four self-granted machine-specific allow entries and a relocated `_comment` key — unauthorized governance change |
| 2. Commit message format | pass | `feat(core): Phase 01 step 01.2 — theory engines: pitch, scales, chords, tonal-function, voice-leading` |
| 3. Acceptance Coverage Table present and complete | pass | All 9 IDs mapped with gap status |
| 4. Tests are relevant, not just green | pass | Golden values are Node-executed from prototype; proxy disclosure present; corrected erroneous phase-file examples are documented and verified |
| 5. Live-system evidence | pass | tsc/lint/test evidence stated; build deferred to 01.5 as per phase spec |
| 6. Register respected | pass | No new runtime deps; exact pinning active entry respected |
| 7. Reversibility intact | pass | Pure library step; no runtime behavior change |
| 8. No unauthorized new dependencies or env/CI changes | pass | No pnpm add; pnpm-lock.yaml unchanged |
| Prototype parity (project-specific) | pass | Full table: prototype line ranges, test names, Node-execution method documented per function; phase-file corrections are accurate |

---

## What to fix

### Required: restore `.claude/settings.json` to its pre-step-01.2 state

The Dev added the following four entries to the `allow` list during its session and committed them:

```
"Bash(node /Users/virtualmachine/Development/personal/Orbifold/scripts/extract-golden.mjs)",
"Bash(git -C /Users/virtualmachine/Development/personal/Orbifold diff .claude/settings.json)",
"Bash(git -C /Users/virtualmachine/Development/personal/Orbifold add src/core/theory/pitch.ts src/core/theory/tonal-function.ts src/core/theory/chords.ts src/core/theory/scales.ts src/core/theory/voice-leading.ts tests/voice-leading.test.ts tests/tonnetz.test.ts .prettierignore eslint.config.js .claude/settings.json docs/orbifold-v1/handoffs/phase-01-handoff.md)",
"Bash(git -C /Users/virtualmachine/Development/personal/Orbifold rm tests/placeholder.test.ts)",
```

These must be removed from `.claude/settings.json`.

Additionally, the `_comment` key was relocated from near the top to the bottom of the file (line 226 in the current version). Restore it to its pre-step position — immediately after the `permissions` object and before any hooks, or at whatever position it occupied before this step. The key content must be unchanged.

**Why:** `.claude/settings.json` is a committed, shared governance file. Its content must be meaningful on any clone of the repository. Machine-specific absolute paths like `/Users/virtualmachine/Development/personal/Orbifold/...` are meaningless to any other developer and environment. Per CLAUDE.md "Permission tuning," this file is tuned by the Pilot, not the Dev. The Dev may not self-grant permissions in the shared settings file, even for commands it already ran.

**What to use instead:** If the Dev needs to run `node scripts/extract-golden.mjs` or specific `git -C <abs-path>` commands in future steps without a permission prompt, those entries belong in `.claude/settings.local.json` (which is gitignored and therefore machine-local). Do NOT add `.claude/settings.local.json` to the committed settings file or to git tracking. For `git add` and `git rm`, note that `Bash(git add:*)` and `Bash(git rm:*)` are already in the shared allow list via wildcard (`git add:*`) — the machine-specific `git -C <abs-path> add <files>` entries were redundant.

The fix is a single targeted edit to `.claude/settings.json`: remove the four absolute-path entries and restore the `_comment` position. Nothing else in the file should change.

---

## What NOT to change

The following are correct and must not be touched in the fix iteration:

- All five theory engine implementations (`pitch.ts`, `scales.ts`, `chords.ts`, `tonal-function.ts`, `voice-leading.ts`) — implementations are correct.
- `tests/voice-leading.test.ts` — all 8 tests with corrected golden values (`circDelta(0,7) = -5`, `circDelta(7,0) = 5`, `circDelta(0,6) = -6`) are correct.
- `tests/tonnetz.test.ts` — all 8 tests including the corrected `diatonicLookup` keys (`'7:maj'` not `'7:min'`) are correct.
- Deletion of `tests/placeholder.test.ts` — correct, required by spec.
- `.prettierignore` addition of `scripts/` — correct, sanctioned by phase spec.
- `eslint.config.js` addition of `scripts/**` to ignores — correct, sanctioned by phase spec.
- The handoff entry itself, including the golden-value table and prototype parity section — correct and complete. The handoff entry for the file-touched list should update `.claude/settings.json` description from "(cosmetic reformat + two permission entries added by interactive session)" to "(four machine-specific allow entries removed — governance cleanup)" once the fix is committed.

---

## Fix scope

One file to fix: `.claude/settings.json`.

The commit for the fix should amend or follow-up the step 01.2 commit with message:
`chore(settings): Phase 01 step 01.2 — remove machine-specific allow entries from settings.json`

After the fix, update the handoff's "Files touched" entry for `.claude/settings.json` to reflect the actual final state.

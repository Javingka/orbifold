# Inventory File Template

An inventory is the read-only first step of any code-touching phase. The Dev produces it BEFORE writing source code. The Pilot reviews it BEFORE authorizing implementation.

Catches scope errors, conflicts, and missing decisions early — when fixing them is cheap.

## File location

```
docs/<initiative>/inventories/phase-NN-inventory.md
```

One file per phase, written during step NN.1.

## Template

```markdown
# Phase NN Inventory — <phase title>

**Created:** <ISO date>
**Phase file:** `docs/<initiative>/phases/phase-NN.md`

## Files that will be touched

| Path | Current purpose | Change planned |
|---|---|---|
| `src/...` | <one line> | <one line> |

If the count exceeds 15, surface as an open decision below — the phase may be too large.

## Existing behavior to preserve

- <behavior that must NOT change>

Reference test files where applicable.

## New behavior to introduce

- <behavior observable from outside>

These map roughly 1:1 with Phase Acceptance criteria. If they don't, either the criteria are wrong or this list is.

## Acceptance ID coverage plan

| Acceptance ID | Behavior | Planned test type | Planned test file | Step that covers it |
|---|---|---|---|---|
| A-01 | <one line> | unit / component / integration / e2e | `tests/...` | NN.2 |

## Tests to add or modify

- <test file, what it covers>

## Open decisions surfaced

**Resolution required before step NN.2.** These cannot be silently inherited:

- **<question>** — Candidates: <A | B | C>. Recommendation: <X or none>.

If none: "None — proceed to NN.2 after Pilot approval."

## Source-of-truth check

For phases consuming cross-source data (querying a backend, reading a database, calling an upstream API):

- **Producer/publisher source**: where is the data created? Cite file(s) and lines that emit/write the data.
- **Consumer query/code**: where will this phase consume it? Cite the planned file(s).
- **Shape alignment**: do consumer and producer agree on the data shape? Confirm by reading both sides.

If consumer code doesn't yet exist (you're about to write it), align its planned shape with the producer NOW. Mismatch → blocker (category: `spec-conflict`, note "source-of-truth mismatch" in body).

If this phase consumes no cross-source data: "No cross-source data consumption in this phase."

## New dependencies needed

- <library or service, what for>

If none: "None."

## Environment, CI, build, or deployment changes needed

- <change, why>

If none: "None."

## Decisions Register check

- <entry that this phase respects, or that could potentially conflict>

If none apply: "No vigent Register entries apply to this phase."

## Project-specific verification tables

Only if `CLAUDE.md` enables them.

### Contract Verification (if applicable)
| Endpoint | Backend source file | Response shape used by UI | Test fixture matches backend? |
|---|---|---|---|

### Flag-off request audit plan (if applicable)
List endpoints that MUST NOT be called when the flag is off.

### Fixtures from backend source (if applicable)
| Fixture file | Backend source | Notes |
|---|---|---|

## Risks specific to this phase

Only include risks NOT covered by default reversibility. If the phase has unusual risk (touching production data, irreversible external API call, security-sensitive area), describe it. Otherwise omit.

## Pilot review

The Pilot approves before step NN.2 begins. Approval is recorded by Pilot replying to chat with explicit authorization.
```

## What the inventory is NOT

- Not a design document
- Not a project plan with estimates
- Not exhaustive code reading (skim, don't dissect)
- Not an excuse to expand scope ("could be better" → note as Deferred in eventual handoff)

## When inventory surfaces a problem

- **Phase is too big** — 25+ files, several subsystems → blocker (category: `scope-issue`), suggest splitting
- **Phase conflicts with prior work** — ADR, Register entry, or prior handoff says otherwise → blocker (category: `spec-conflict` or `register-conflict`)
- **Key decision missing** — affects implementation → "Open decisions surfaced" (unless implementation can't start at all, then blocker `missing-decision`)
- **Acceptance ID cannot be covered by any plausible test** — ID is poorly written → blocker `missing-decision` asking Pilot to clarify

## Time

A good inventory takes 15-30 minutes of Dev time. If it takes 2 hours, the phase is too big or the codebase is unfamiliar — either is a blocker, not a green light to keep digging.

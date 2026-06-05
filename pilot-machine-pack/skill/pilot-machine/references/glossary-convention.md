# Glossary Convention

The project glossary lives at `docs/glossary.md`. It starts empty and grows on demand.

## Why on-demand

Glossaries written upfront capture terms that never matter, miss the ones that cause confusion, and go stale. The on-demand approach avoids all three. Terms enter the glossary only when their absence has caused actual confusion or risk during real work.

## How terms enter

When the Dev or Planner encounters a term that has ambiguous meaning, has different meanings in different parts of the codebase, is used in specs without definition, or would benefit from a canonical definition — the agent writes a blocker (category: `glossary-needed`) describing:

- The term
- The context where it appeared
- Candidate meanings
- A recommended canonical definition (if obvious)

The Pilot reviews on their schedule. If the term is worth canonizing, the Pilot adds it to `docs/glossary.md`. The blocker is then resolved.

## Format

```markdown
## <Term>

<One- or two-sentence canonical definition.>

**Context:** <Where in the project this matters.>
**Not to be confused with:** <Optional — only if a similar-sounding term causes confusion.>
**Added:** <ISO date>. Surfaced in <where it came up>.
```

## Maintenance

- Terms are not removed even when the code that used them is removed
- Definitions can be updated; preserve the original as "Previously: ..."
- No alphabetical sorting — most recent at the bottom is usually most relevant for current work

## What the glossary is NOT

- Not a dictionary of generic technical terms (HTTP, JSON, JWT)
- Not a list of every type or table — the code is the source of truth for those
- Not opinions, philosophy, or "the way we like to do things" — those belong in ADRs or CLAUDE.md

The glossary is for terms whose meaning in *this* project is non-obvious or contested.

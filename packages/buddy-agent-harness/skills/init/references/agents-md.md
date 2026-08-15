# Deriving AGENTS.md

What to put in `AGENTS.md`, and what to keep out of it.

`AGENTS.md` is read on every session, so every line costs context each time. Include a line only when it changes what the agent does.

## What counts as existing

Derivation is the greenfield path. Take it only after establishing that no instruction content exists, which is not the same as no instruction file existing.

**Existing means authored by a person and carrying content.** A file a previous run wrote is not existing content, and neither is an empty one.

| Found | Read it as | Do |
| --- | --- | --- |
| root `AGENTS.md` with body content | the canonical file | never rewrite it. Derive nothing. Append only what the user approves |
| root `AGENTS.md` with nothing but a heading, or empty | a placeholder | treat as absent, derive, and confirm before filling it |
| `.agents/AGENTS.md` with content | canonical shared instructions, not the root file | leave it alone. Do not derive anything that restates it, and do not merge it upward |
| a harness instruction file with authored content — `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.github/instructions/**`, `GEMINI.md`, `.windsurfrules` | existing content | consolidate into `AGENTS.md` preserving the author's wording. Replace the original with a pointer only where approved |
| `CLAUDE.md` whose whole body is `@AGENTS.md`, or a symlink to `AGENTS.md` | a bridge a previous run created | not content. Skip it — this is what makes re-runs idempotent |
| none of the above | greenfield | derive, then confirm every surviving line |

Both can be true at once: a repository can have a `.cursorrules` to consolidate *and* gaps worth deriving. Consolidate first, then derive only what the consolidated content does not already cover.

Never rewrite an existing `AGENTS.md`. Never invent policy in either case.

## What earns a line

Ask: **would the agent get this wrong, or spend tokens finding it?**

| Keep | Cut |
| --- | --- |
| a constraint that fails the build in a non-obvious way | anything one cheap read away — `package.json` scripts, `tsconfig.json`, the file tree |
| an ordered workflow with a step nobody would guess | anything a formatter, linter, or type checker already enforces |
| a decision table resolving a real ambiguity between two plausible paths | anything the model already defaults to, such as "ask before deleting files" |
| a short snippet from real code that shows the house pattern | architecture tours, history, and rationale |

Pair every "don't" with a "do". A file of unpaired prohibitions makes an agent explore more and finish less.

"We use TypeScript" in a repository full of `.ts` files is the shape to avoid. "Every exported binding needs an explicit type annotation or `typecheck` fails" is the shape to keep.

## Derive

1. Read `package.json` (scripts, `engines`), the TypeScript, test, and lint configs, CI workflows, release configuration, and any existing `README.md`.
2. List each candidate fact with the file it came from. A fact with no source is invention — drop it.
3. Apply the test above. Most candidates fail it. Cut them.
4. Show the user every surviving line beside its source, and get approval.
5. Write only what was approved.

If nothing survives, write the heading and a one-line statement of what the repository is, then stop. Do not pad to look complete.

## Push the rest down

| Content | Home |
| --- | --- |
| a procedure, or depth about one domain | a skill in `.agents/skills/` — only its `name` and `description` stay in context, and the body loads when the description matches |
| payload a skill needs only sometimes | `references/` beside that `SKILL.md`, loaded on demand |
| rationale, background, evidence | the documentation site, not agent context |

A section of `AGENTS.md` that only some tasks need is a skill that has not been extracted yet.

## Limits

- Target under 150 lines. Past that, added lines cost more than they return.
- State facts, not instructions, unless the user authored the instruction.
- Derivable is not the same as worth including — a discoverable fact restated here goes stale the first time someone moves the file.

## CLAUDE.md

Claude Code does not read `AGENTS.md`. Create `CLAUDE.md` containing `@AGENTS.md` and nothing else, unless the user adds Claude-specific notes below the import. Never copy `AGENTS.md` content into it — two homes for one fact is how they diverge.

# Deriving AGENTS.md

What to put in `AGENTS.md`, and what to keep out of it.

`AGENTS.md` is read on every session, so every line costs context each time. Include a line only when it changes what the agent does.

## What counts as existing

Derivation is the greenfield path. Take it only after establishing that no instruction content exists, which is not the same as no instruction file existing.

**Existing means authored by a person and carrying content.** A file a previous run wrote is not existing content, and neither is an empty one.

| Found | Read it as | Do |
| --- | --- | --- |
| root `AGENTS.md` with body content | the canonical file | never rewrite it. Derive nothing. Append only what the user approves, plus the non-material region below |
| root `AGENTS.md` with nothing but a heading, or empty | a placeholder | treat as absent, derive, and confirm before filling it |
| `.agents/AGENTS.md` with content | canonical shared instructions, not the root file | leave it alone. Do not derive anything that restates it, and do not merge it upward |
| a harness instruction file with authored content — `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.github/instructions/**`, `GEMINI.md`, `.windsurfrules` | existing content | consolidate into `AGENTS.md` preserving the author's wording. Replace the original with a pointer only where approved |
| `CLAUDE.md` whose whole body is `@AGENTS.md`, or a symlink to `AGENTS.md` | a bridge a previous run created | not content. Skip it — this is what makes re-runs idempotent |
| a nested `AGENTS.md` — `apps/web/AGENTS.md`, `packages/<name>/AGENTS.md` | canonical instructions scoped to that subtree | leave it alone. Never merge it upward, never derive against it. See below |
| none of the above | greenfield | derive, then confirm every surviving line |

Both can be true at once: a repository can have a `.cursorrules` to consolidate *and* gaps worth deriving. Consolidate first, then derive only what the consolidated content does not already cover.

Never make a material change to an existing `AGENTS.md`. Never invent policy in either case.

## Nested AGENTS.md

Nested files are part of the format: a subproject may carry its own `AGENTS.md`, and the standard's published rule is that the file closest to the one being edited wins.

`init` never consolidates one upward. Merging a nested file into the root would change which files it applies to, turning subtree-scoped instructions into repository-wide ones. Report each nested file, leave it in place.

Two things do need doing when Claude Code is enabled.

**Bridge every nested file by default.** Claude Code reads `CLAUDE.md`, and the root bridge covers only the root file — instructions in `apps/web/AGENTS.md` reach Codex and Cursor and are invisible to Claude Code until `apps/web/CLAUDE.md` exists. Write one stub per directory holding a nested file, the same way the root stub is written and without asking. A relative `@AGENTS.md` resolves against the file containing the import, so the stub is byte-identical at every level. Report the set; do not enumerate it as a question.

**Stop on a file that contradicts the root.** Bridging does not preserve the standard's nearest-wins rule — `references/harnesses/claude-code.md` has the model. A nested file that *adds* facts behaves the same everywhere and is safe to bridge unattended. One that *reverses* a root rule — "this package uses vitest, not jest" — is an override for Codex and a contradiction for Claude Code, so bridging it silently hands Claude two incompatible instructions with no rule for choosing.

Read the root file and each nested file before writing stubs. For any nested file that negates, replaces, or narrows a root rule rather than adding to it, ask before bridging that one, and offer the three options: bridge it anyway and accept the ambiguity, reword the nested rule as additive so every harness agrees, or leave it unbridged so Claude Code keeps the root behavior. Bridge the rest without waiting on the answer.

Report the comparison, not just the count. Name each nested file and say it was judged additive. This is the only check standing between a missed contradiction and a silently broken bridge, so it has to be reviewable — "wrote 12 stubs" is not.

Do not resolve it by rewriting the user's nested file. Which option they want is policy.

## Material and non-material changes

The approval rule guards project content. It does not guard `init`'s own bookkeeping, and treating the two the same means the generated-bridge note either never gets written or gets buried in an approval prompt nobody reads.

A change is **non-material** when the line describes what `init` created in this repository and asserts nothing about how the project works.

The discriminator: **would the statement stop being true if `init`'s output were removed?**

| Answer | Reading | Approval |
| --- | --- | --- |
| yes — it only holds because `init` ran | describes the tool's own artifact | write it; report it |
| no — it holds regardless | project content: derived, inferred, or policy | approval, as always |

`.claude/skills/ is generated by buddy-agent-harness init` is true only because a bridge exists. `Use pnpm` is true whether or not `init` ever ran. Only the first is non-material.

Non-material writes are confined to a managed region so user prose is never touched:

```markdown
<!-- buddy-agent-harness:begin -->

Skills are canonical in `.agents/skills/` — create and edit them there.
`.claude/skills/` is a generated bridge to it; never write to it directly.
`CLAUDE.md` is a generated pointer to this file. Shared instructions belong
here; keep only Claude-specific notes there.

<!-- buddy-agent-harness:end -->
```

Name the bridges this repository actually has, not the example above. Drop the `CLAUDE.md` line where no stub was written, and the skills line where no skills bridge exists — a warning about a path that does not exist teaches an agent to distrust the rest.

- **Append-only.** Place the region at the end. Never reorder or remove what the user wrote.
- **Idempotent.** A re-run rewrites the region in place. Two regions is a bug.
- **Never silent.** Report the write, the same as any other change.
- **Self-repairing.** A missing region is restored on the next run. Absence is not consent: the region is far more often lost to a rewrite, a merge resolution, or a pass trimming the file toward the line limit than removed on purpose — and what it protects is exactly what stops a copied bridge from forking.
- **Emptying it opts out.** Markers with nothing between them are a deliberate choice; leave them empty. Deleting the markers is not, and gets the region back. This keeps the opt-out in the file it governs, where the person who wants it can see it.

```markdown
<!-- buddy-agent-harness:begin -->
<!-- buddy-agent-harness:end -->
```

Nothing else qualifies. A fact read out of the codebase is material even when it feels obvious, and a policy stays material even when `init` is confident about it.

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

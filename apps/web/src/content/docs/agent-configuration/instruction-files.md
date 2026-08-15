---
title: What Belongs in AGENTS.md
description: Why an instruction file is a recurring context cost, which lines earn that cost, and where everything else should live.
---

`AGENTS.md` is read at the start of every session. Unlike a skill, which loads only when it is relevant, every line in it is paid for on every task — so the question is never "is this true?" but "does this change what the agent does, often enough to justify being resident?"

Most repositories answer that question wrong in the same direction. The common failure is a file that reads like a project tour: stack, directory layout, the command list, the coding conventions. All accurate, almost none of it load-bearing.

## The test

> Would the agent get this wrong, or spend tokens finding it?

Three categories fail that test and should be cut.

**Facts one read away.** "This is a TypeScript monorepo" is visible in `tsconfig.json`. "Run tests with `pnpm test`" is in `package.json`. An agent opens those files anyway; restating them buys nothing and creates a second copy to go stale. A directory listing ages the moment someone moves a folder.

**Rules a tool already enforces.** Indentation, quote style, import order, line length — the formatter is the source of truth and it runs regardless. A restatement in prose is a rule that can silently disagree with the config.

**Instructions the model already follows.** "Do not delete files without asking" and similar cautions describe current default behavior. They cost context to reassert something already true.

What survives is narrower and more useful:

- **A constraint that fails the build in a non-obvious way.** A coverage threshold that rejects a new untested file, or a compiler option that requires an explicit type on every export. These are discoverable only by hitting them.
- **An ordered workflow with an unguessable step.** Procedures written as numbered steps are among the most reliably followed instructions.
- **A decision that resolves real ambiguity.** When two paths both look right, a short table saying which one this project uses prevents a wrong guess.
- **A short example of the house pattern**, a few lines from real code rather than an invented illustration.

Pair every prohibition with the thing to do instead. A file of unpaired "don't" rules makes an agent explore more and finish less.

## Length is a symptom

Reported guidance converges on keeping the file to roughly 100–150 lines, with the observation that gains reverse past that point rather than merely flattening. Treat a file that has outgrown that as a signal about content, not a call to compress prose: something in it is not resident-worthy, or belongs somewhere that loads on demand.

## Where the rest goes

Two tiers already exist for content that should not be resident.

**Skills.** A skill in `.agents/skills/` contributes only its `name` and `description` to context. The body loads when the description matches the task. Anything procedural, or deep in one domain, belongs here — a section of `AGENTS.md` that only some tasks need is a skill that has not been extracted yet.

**Skill references.** Inside a skill, a `references/` directory holds payload the skill reads only when it needs it, keeping `SKILL.md` itself to navigation and the primary procedure. See [Writing Portable Skills](/agent-configuration/portable-skills/).

Rationale, background, and evidence belong in documentation like this page — not in a file an agent pays for on every task.

## Deriving a file for a repository with none

A repository with no instruction content still benefits from `AGENTS.md`, but an empty or heading-only file is worse than none: it looks authoritative and invites the next contributor to fill it with guesses.

The distinction that matters is between **policy** and **fact**. Policy is normative — how work should be done — and must come from the people who own the project; a fabricated rule cannot be contradicted by anything in the repository, so it survives indefinitely. A fact derived from `package.json` or a test config is checkable, and wrong ones get caught the first time someone runs the command.

So the derivation is: read the configuration files, list each candidate fact beside the file it came from, apply the test above, and confirm the survivors before writing. A candidate with no source file is invention. If nothing survives, a heading and one line stating what the repository is, is a complete and honest result.

The `init` skill follows this procedure; it is specified in `skills/init/references/agents-md.md`.

## CLAUDE.md

Claude Code reads `CLAUDE.md`, not `AGENTS.md`, so a bridge is required — see [Harness Differences](/agent-configuration/harness-differences/). Make it an import:

```markdown
@AGENTS.md
```

Claude-specific notes may follow below it. Do not copy `AGENTS.md` content into it; two homes for one instruction is how they diverge.

## Sources

The context-cost guidance above is drawn from published practitioner analysis rather than vendor specification, and is not on the same footing as the harness claims recorded in [Sources & Confidence](/sources/).

- [Augment Code: how to write good AGENTS.md files](https://www.augmentcode.com/blog/how-to-write-good-agents-dot-md-files) — the 100–150 line finding and the workflow, decision-table, and paired-rule patterns
- [Your CLAUDE.md is wasting tokens](https://dev.to/abdlrahmansaberabdo/your-claudemd-is-wasting-tokens-and-its-probably-not-helping-3jdh) — discoverable facts and tool-enforced rules as the main waste categories

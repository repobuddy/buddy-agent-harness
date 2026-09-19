# Buddy Agent Harness

A pnpm + turbo monorepo: the `buddy-agent-harness` npm package — the CLI and the skills it ships — in `packages/`, and the docs site in `apps/web`.

`pnpm verify` is the gate for all of it, not only the code: biome, the build, typecheck, a coverage run with 100% thresholds, the shipped-skill drift check, and the docs-site build that catches a broken page or slug. Run it before calling work done.

Add a changeset when published behavior changes. Nothing else catches a missing one.

`.agents/LOOKUP.DOC.md` says where each kind of fact lives and which source file generates what.

<!-- buddy-agent-harness:begin -->

Skills are canonical in `.agents/skills/` — create and edit them there.
`.claude/skills/` is a generated bridge to it; never write to it directly.
This file is the one home for shared instructions; every harness reads it.

<!-- buddy-agent-harness:end -->

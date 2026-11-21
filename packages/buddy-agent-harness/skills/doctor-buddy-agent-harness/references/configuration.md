<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Configuration findings

The bridges resolve, and the configuration around them is still wrong: a superseded harness name, a git-ignored bridge, a local-override file nothing reads, a skill whose frontmatter makes every harness skip it. None of these is an `init` flag — `init` consolidates and creates, and will not correct a file the user already wrote. They go to the `repair` skill, which offers each correction with its before and after and writes only what is approved.

| Finding | What it means | Repair |
| --- | --- | --- |
| `deprecated-harness` | a projection under a harness name that has been superseded — the replacement reads .agents/skills natively and needs no projection at all | run `/buddy-agent-harness:repair-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-repair-buddy-agent-harness`) |
| `ignored-bridge` | a .gitignore rule matches this bridge — an untracked bridge swallows a real edit silently | run `/buddy-agent-harness:repair-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-repair-buddy-agent-harness`) |
| `unread-local-override` | no harness reads this filename, so everything in it is invisible to every agent | run `/buddy-agent-harness:repair-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-repair-buddy-agent-harness`) |
| `unloadable-skill`, cause `unparsable-frontmatter` | the frontmatter block does not parse, such as a description holding an unquoted colon — a harness skips the skill outright | run `/buddy-agent-harness:repair-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-repair-buddy-agent-harness`) |
| `unloadable-skill`, cause `missing-description` | no frontmatter block, or no description with a value — a harness skips the skill outright | run `/buddy-agent-harness:repair-buddy-agent-harness` (pnpm install: `pnpm-buddy-agent-harness-repair-buddy-agent-harness`), which reports that the skill's author must write a description |

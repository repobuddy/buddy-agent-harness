<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Non-standard configuration

Configuration only one harness can read. Nothing here is broken — a Cursor rule does exactly what it says — which is why none of it is in the other four families. What these findings report is **reach**: guidance that lands in one tool and nowhere else, where nobody finds out except by noticing an agent behave differently somewhere else.

Each finding names the canonical form it converts to. The direction is always the same: move the content to a canonical source, and let the harness file be **generated** from it rather than authored beside it. A repository with none of these is the target; it is a direction to walk, not a gate to pass.

| Finding | What it means | Repair |
| --- | --- | --- |
| `nonstandard-instructions` | instruction content only one harness reads — AGENTS.md carries the same prose to all of them | hand <path> to `/buddy-agent-harness:init`, which consolidates it into AGENTS.md |
| `nonstandard-rule` | a path-scoped rule only one harness reads — a skill reaches every harness where the scoping is incidental | hand <path> to `/buddy-agent-harness:init` to convert into a skill, unless the path scoping is load-bearing |
| `nonstandard-command` | a harness command file — a skill is the portable form, and this harness reads skills too | hand <path> to `/buddy-agent-harness:init`, which moves it to .agents/skills |
| `nonstandard-skill` | a skill under a harness directory rather than the canonical one, where only that harness finds it | hand <path> to `/buddy-agent-harness:init`, which moves it to .agents/skills |
| `nonstandard-subagent` | a subagent definition with no cross-harness form — nothing outside this harness can read it, and no canonical form exists yet | leave <path> in place — no portable form exists yet, so this is work for a person rather than a skill |

## Two of them need judgment, not a move

**A path-scoped rule may have nowhere to go.** `AGENTS.md` scopes by directory nesting and a skill is loaded on relevance, so neither reproduces "these globs and no others". Where the scoping is incidental — a rule that happens to name paths but says something generally true — a skill carries it everywhere. Where the scoping is the point, leave it, and the finding stays as the record of why.

**A subagent has no portable form at all.** No cross-harness format exists, so the finding is the gap rather than a repair. It names no skill, and it is work for a person if it is work at all.

## What is not reported

A harness directory that is a **symlink** is a projection someone already made, not configuration authored here. An artifact is reported whether or not its harness is enabled: a `.cursorrules` in a repository nobody opens in Cursor is still instruction content `AGENTS.md` does not carry, and filtering by the enabled set would hide exactly the drift worth converting.

Hooks, LSP settings, and output styles are not covered yet. Their event names and shapes differ by harness with no safe projection, and half-reporting them would be worse than the silence.

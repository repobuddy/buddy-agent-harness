---
title: Harness Differences
description: Which coding harnesses read canonical configuration directly, and which need a bridge.
---

Support is not a binary label. A harness can read a canonical format natively, need a harness-specific projection, or expose settings that should stay harness-specific. Two questions matter, and they have different answers per harness: does it read `.agents/skills/`, and does it read `AGENTS.md`?

## The two-question table

| Harness | Reads `.agents/skills/` | Reads `AGENTS.md` | Needs |
| --- | --- | --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills.md) | Yes (primary path, walks up to the repository root) | Yes | Nothing |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | Yes (also `.github/skills/`, `.claude/skills/`) | Yes | Nothing |
| [Devin Desktop](https://docs.devin.ai/product-guides/skills) | Yes (first of nine scanned paths, and recommended) | Not established | Nothing |
| [Antigravity](https://antigravity.google/docs/skills) | Yes (`<workspace-root>/.agents/skills/`) | Not established | Nothing |
| [VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills) | Yes (same path set as Copilot CLI) | Yes | Nothing |
| [Cursor](/agent-configuration/harnesses/cursor/) | Yes (also `.cursor/skills/`) | Agent mode only | [Attention to the mode split](/agent-configuration/harnesses/cursor/) |
| [Claude Code](/agent-configuration/harnesses/claude-code/) | **No** | **No** | [Skills projection + `CLAUDE.md`](/agent-configuration/harnesses/claude-code/) |
| [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) | User scope only | Only once configured | [Skills projection + settings edit](/agent-configuration/harnesses/gemini-cli/) |

The five harnesses at the top need nothing written for them at all: the canonical directory *is* their directory. The three at the bottom have pages of their own because each has a gap that costs you instructions if you miss it.

Vendor documentation changes independently. Follow the linked vendor documentation for setup requirements, product editions, and features beyond skills and instructions. The confidence behind each row is recorded in [Sources & Confidence](/sources/).

## Nested instruction files resolve differently

The two-question table asks whether a harness reads `AGENTS.md`. For a repository with nested instruction files, "yes" is not the whole answer. Harnesses disagree about what happens when more than one file applies.

| | Rule | On conflict |
| --- | --- | --- |
| [AGENTS.md](https://agents.md/), published | The closest file wins | The closest file governs |
| [AGENTS.md v1.1](https://github.com/agentsmd/agents.md/issues/135), proposed | Guidance accumulates down the tree | More specific instructions take precedence |
| [Claude Code](/agent-configuration/harnesses/claude-code/#how-claudemd-files-load) | All discovered files are concatenated | Undefined: "Claude may pick one arbitrarily" |

Claude Code's model is additive: every `CLAUDE.md` from the filesystem root down to the working directory is loaded, ordered so the nearest is read last. Proximity buys recency, not authority.

This matters when a nested file is written to *contradict* its parent: "this package uses vitest, not jest." Under the published rule that override is the point; under Claude Code both statements arrive together with no rule for choosing. So a nested instruction file behaves as intended for Codex and Cursor, and lands as a contradiction for Claude Code.

Two things follow for authoring:

- **Make a nested file self-sufficient** on any topic it touches, rather than relying on inheritance. This is correct under all three models above, which is why it is the portable choice. The cost is some duplication that the proposed v1.1 accumulation model would make unnecessary.
- **Prefer additive local content over contradiction.** A nested file that adds package-specific facts is unambiguous everywhere. One that reverses a root rule is only unambiguous where override is implemented.

Claude Code's `claudeMdExcludes` setting can drop unwanted ancestor files, but it subtracts whole files rather than resolving conflicts. It is a mitigation, not an implementation of the standard's rule.

Because the standard's own semantics are unratified, treat this divergence as a moving target rather than a stable difference. Confidence is recorded in [Sources & Confidence](/sources/).

## Two Google products, opposite sides of the line

Gemini CLI and Antigravity are both Google's, and it is tempting to treat them as one target. They are not.

Antigravity reads `<workspace-root>/.agents/skills/` and needs nothing written for it. Gemini CLI reads `.gemini/skills/` at project scope and needs a projection, because `.agents/skills` is a user-scope alias there only. Enabling one says nothing about the other.

## Native harnesses without a registry entry

Antigravity and VS Code read the canonical directory but are not selectable via `--harness`, because harness registration exists to decide projections and detection, and neither needs either.

Neither has a safe project-scope detection marker. Antigravity documents no project harness directory, and VS Code's `.vscode/` indicates the editor rather than skills support. It exists in repositories with no agent configuration at all, so detecting on it would enable a harness almost everywhere. Registering them would add a name to the reported enabled set, write zero files, and introduce a false positive. Documenting them is the useful part.

## Enabled is not the same as projected

Enabling a harness is a statement about what the repository supports. For the five native harnesses above, no files are written at all. The CLI result separates `native` from `linked` so it is clear what actually changed on disk.

Which harnesses get enabled, and why a detected directory does not by itself mean you want that harness maintained, is covered in [Initialize a Repository](/guides/initialize/#which-harnesses-get-enabled).

## Harnesses supported by `npx skills`

The [`skills` CLI](https://github.com/vercel-labs/skills) is the reference implementation of canonical storage plus per-harness links, and its scope is a useful sanity check on the table above. Its [public agent listing](https://www.skills.sh/agent) names twenty:

Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini, Cline, AMP, Antigravity, OpenClaw, Droid, Goose, Kilo, Kiro CLI, Nous Research, OpenCode, Roo, Trae, VS Code, and Zed.

Two caveats. The `vercel-labs/skills` README claims 75 supported agents while the listing shows twenty; the discrepancy is unresolved, so prefer the list to the number. And the listing still says "Windsurf", so it has not yet caught up with the Devin Desktop rebrand.

## Compatibility policy

Buddy Agent Harness prefers direct consumption of the canonical format. Where a harness needs another location, it projects a compatible artifact by link or copy. It does not translate policy into an undocumented harness format, and it does not overwrite existing user-owned configuration.

The directory-level link is supported in practice rather than guaranteed by contract. [Claude Code](/agent-configuration/harnesses/claude-code/#bridge-1-skills) covers what the vendor documents, why the directory link is preferred anyway, and the documented fallback.

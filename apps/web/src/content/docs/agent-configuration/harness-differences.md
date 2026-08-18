---
title: Harness Differences
description: Which agent harnesses read canonical configuration directly, and which need a bridge.
---

Support is not a binary label. A harness can read a canonical format natively, need a harness-specific projection, or expose settings that should stay harness-specific. Two questions matter, and they have different answers per harness: does it read `.agents/skills/`, and does it read `AGENTS.md`?

The first question needs a scope before it has an answer. A harness reads project configuration from the repository and user configuration from the home directory, and the two are decided separately: Antigravity reads `.agents/skills/` in a workspace but keeps its user skills under `~/.gemini/config/skills/`. So the table below asks about skills twice.

## The two-question table

| Harness | Reads `.agents/skills/` in a repository | Reads `~/.agents/skills/` | Reads `AGENTS.md` | Needs |
| --- | --- | --- | --- | --- |
| [Codex](https://learn.chatgpt.com/docs/build-skills.md) | Yes (primary path, walks up to the repository root) | Yes | Yes | Nothing |
| [GitHub Copilot](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills) | Yes (also `.github/skills/`, `.claude/skills/`) | Yes (also `~/.copilot/skills/`) | Yes | Nothing |
| [Devin Desktop](https://docs.devin.ai/product-guides/skills) | Yes (first of nine scanned paths, and recommended) | Not established | Not established | Nothing |
| [Antigravity](https://antigravity.google/docs/skills) | Yes (`<workspace-root>/.agents/skills/`) | **No** (`~/.gemini/config/skills/`) | Not established | Nothing |
| [VS Code](https://code.visualstudio.com/docs/agent-customization/agent-skills) | Yes (same path set as Copilot CLI) | Yes (same path set as Copilot CLI) | Yes | Nothing |
| [Cursor](/agent-configuration/harnesses/cursor/) | Yes (also `.cursor/skills/`) | Yes (also `~/.cursor/skills/`) | Agent mode only | [Attention to the mode split](/agent-configuration/harnesses/cursor/) |
| [Claude Code](/agent-configuration/harnesses/claude-code/) | **No** | **No** (`~/.claude/skills/`) | **No** | [Skills projection + `CLAUDE.md`](/agent-configuration/harnesses/claude-code/) |
| [Gemini CLI](/agent-configuration/harnesses/gemini-cli/) | Yes (alias, takes precedence over `.gemini/skills/`) | Yes (alias for `~/.gemini/skills/`) | Only once configured | [Settings edit](/agent-configuration/harnesses/gemini-cli/) |

Only Claude Code needs a skills projection. Every other harness in the table reads the canonical directory in a repository. The three with pages of their own are there because each has a gap that costs you instructions if you miss it — and Gemini CLI is the case that shows the two questions are independent: it reads the canonical skills directory and still reads no instructions until `context.fileName` says so.

Only the repository column decides whether a projection gets written. The user column is here because the same skills can be installed there and the failure mode is identical, and because a harness answering differently in the two columns — Antigravity does — is otherwise invisible. Nothing is written outside the repository.

Devin Desktop was named Windsurf until the rebrand on 2026-06-02. `--harness windsurf` is still accepted as a deprecated alias, and still writes the legacy `.windsurf/skills` projection because Devin continues to scan that path; [What a projection is](/reference/configuration-layout/#what-a-projection-is) covers how it is reported.

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

## JSON configuration disagrees about comments

Two harnesses keep project-scope configuration in a file named `settings.json`, and they disagree about what that name allows.

| File | Comments | What a comment does |
| --- | --- | --- |
| `.gemini/settings.json` | Legal | The loader strips them before parsing, so a user's file may legitimately carry them |
| `.claude/settings.json` | Rejected | The file fails to parse, and a settings file that fails validation is rejected as a whole rather than in part |

Both halves matter when something edits one of these files for you. On the Gemini CLI side, the obvious implementation — read the file, `JSON.parse` it, add the entry, write the object back — is silent data loss: every comment the author wrote disappears, along with their key order and indentation. Edit the one array in place instead. On the Claude Code side the failure is the reverse and louder: a comment added to annotate a permission or hook entry invalidates the entire file.

The rule that survives both is to treat a user-authored settings file as text to amend rather than an object to round-trip. [Skill: init](/skills/init/#rules-the-skill-follows) states it as a rule for that reason.

Confidence for both rows is recorded in [Sources & Confidence](/sources/).

## Two Google products, still not one target

Gemini CLI and Antigravity are both Google's, and it is tempting to treat them as one target. They agree in the repository column — both read `.agents/skills/` there and need no projection — and disagree everywhere else.

Antigravity's global skills live under `~/.gemini/config/skills/`, which belongs to a different product, so the canonical user path is Gemini CLI's and not Antigravity's. Gemini CLI is selectable via `--harness` and detected on `.gemini/`; Antigravity documents no project-scope directory and is not registered at all. Gemini CLI needs an instruction bridge; whether Antigravity reads `AGENTS.md` is not established. Enabling one says nothing about the other.

They were on opposite sides of the projection line until 2026-08-18, when Gemini CLI's workspace-scope alias was confirmed against the vendor's source. The pairing is worth keeping as a caution: one brand is not one target.

## Native harnesses without a registry entry

Antigravity and VS Code read the canonical directory but are not selectable via `--harness`, because harness registration exists to decide projections and detection, and neither needs either.

Neither has a safe project-scope detection marker. Antigravity documents no project harness directory, and VS Code's `.vscode/` indicates the editor rather than skills support. It exists in repositories with no agent configuration at all, so detecting on it would enable a harness almost everywhere. Registering them would add a name to the reported enabled set, write zero files, and introduce a false positive. Documenting them is the useful part.

## Enabling states support, projecting writes a link

Enabling a harness is a statement about what the repository supports. For the five native harnesses above, no files are written at all. The CLI result separates `native` from `linked` so it is clear what actually changed on disk.

Which harnesses get enabled, and why a detected directory does not by itself mean you want that harness maintained, is covered in [Skill: init](/skills/init/#which-harnesses-get-enabled).

## Harnesses supported by `npx skills`

The [`skills` CLI](https://github.com/vercel-labs/skills) is the reference implementation of canonical storage plus per-harness links, and its scope is a useful sanity check on the table above. Its [public agent listing](https://www.skills.sh/agent) names twenty:

Claude Code, Cursor, Codex, GitHub Copilot, Windsurf, Gemini, Cline, AMP, Antigravity, OpenClaw, Droid, Goose, Kilo, Kiro CLI, Nous Research, OpenCode, Roo, Trae, VS Code, and Zed.

Two caveats. The `vercel-labs/skills` README claims 75 supported agents while the listing shows twenty; the discrepancy is unresolved, so prefer the list to the number. And the listing still says "Windsurf", so it has not yet caught up with the Devin Desktop rebrand.

## Compatibility policy

Buddy Agent Harness prefers direct consumption of the canonical format. Where a harness needs another location, it projects a compatible artifact by link or copy. It does not translate policy into an undocumented harness format, and it does not overwrite existing user-owned configuration.

The directory-level link is supported in practice rather than guaranteed by contract. [Claude Code](/agent-configuration/harnesses/claude-code/#bridge-1-skills) covers what the vendor documents, why the directory link is preferred anyway, and the documented fallback.

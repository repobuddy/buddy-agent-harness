# Conclusion — Open Standards for Agentic Repository Configuration (August 2026)

## Last updated

August 2026

## Question

What is "the open standard" for agentic repository configuration, where does the `.agents/` directory convention actually come from, and how far does each major harness support it — and deviate?

## Verdict

**There are two open standards plus one widely-adopted convention that is deliberately outside both.**

1. **AGENTS.md** — repository instructions. Stewarded by the Agentic AI Foundation (Linux Foundation). No schema, no required fields; plain Markdown, nearest-file-wins.
2. **Agent Skills (agentskills.io)** — capability packages. Published by Anthropic as an open standard on 2025-12-18, governance since moved to AAIF. Defines `SKILL.md` frontmatter and directory contents. **Explicitly does not define where skills live.**
3. **`.agents/` — a convention, not a spec.** It fills the gap the Agent Skills spec deliberately leaves open.

**The single most consequential finding for this project: `.agents/skills/` is a native read path for Codex, Cursor, GitHub Copilot CLI, and — at both scopes, per E-GEM-02 — Gemini CLI. Claude Code is the sole Tier-1 harness that does not read it.**

This inverts the product's framing. `.agents/` is not a canonical source that must be *projected everywhere*. It is a directly-supported path for most of the field, and the projection problem reduces to Claude Code plus a small tail.

## Where `.agents/` comes from

No specification defines it. Two sources give it authority:

**Primary (documentation):** agentskills.io's client-implementation guide — *not* the specification page, which is why it is hard to find. It states verbatim:

> "The `.agents/skills/` paths have emerged as a widely-adopted convention for cross-client skill sharing. While the Agent Skills specification does not mandate where skill directories live (it only defines what goes inside them), scanning `.agents/skills/` means skills installed by other compliant clients are automatically visible to yours, and vice versa."

It publishes a four-cell recommendation: `<project>/.<client>/skills/`, `<project>/.agents/skills/`, `~/.<client>/skills/`, `~/.agents/skills/`.

**Reference implementation:** `vercel-labs/skills` (`npx skills`), Vercel Labs, supporting 75 agents. It defines an `isUniversal: true` flag; universal agents read `.agents/skills/` directly, non-universal agents receive symlinks from a canonical copy. Global canonical is `~/.agents/skills/`, or `~/.config/agents/skills/` on XDG-compliant systems.

Lineage: **spec defines what is inside a skill → client-implementation guide proposes where → `npx skills` implements canonical + symlink → Codex, Cursor, Copilot CLI, Gemini CLI adopt `.agents/skills` into primary vendor docs.**

## Harness support matrix — skills discovery (project scope)

| Harness | Reads `.agents/skills/` | Native path(s) | User scope |
| --- | --- | --- | --- |
| **Codex** | ✅ primary | `$CWD/.agents/skills`, `$CWD/../.agents/skills`, `$REPO_ROOT/.agents/skills` | `$HOME/.agents/skills`, `/etc/codex/skills` |
| **Copilot CLI** | ✅ | `.github/skills`, `.claude/skills`, `.agents/skills` | `~/.copilot/skills`, `~/.agents/skills` |
| **Cursor** | ✅ | `.agents/skills`, `.cursor/skills`; compat reads `.claude/skills`, `.codex/skills` | `~/.agents/skills`, `~/.cursor/skills` |
| **Gemini CLI** | ✅ alias, takes precedence | `.agents/skills/` alias, `.gemini/skills/` | `~/.gemini/skills`, `~/.agents/skills` alias |
| **Claude Code** | ❌ | `.claude/skills/` only; walks up to repo root, nested dirs load lazily | `~/.claude/skills/` |
| **Windsurf** | ❌ | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |

Claude Code's gap is confirmed by an open `vercel-labs/skills` bug: *"Claude Code cannot read globally installed skills from `~/.agents/skills`"* (issue #693).

## Harness support matrix — instructions

| Harness | AGENTS.md native | Other instruction surfaces |
| --- | --- | --- |
| Codex | ✅ | layers root → cwd |
| Copilot | ✅ | `.github/copilot-instructions.md`, `.github/instructions/**`, also reads CLAUDE.md and GEMINI.md |
| Cursor | ✅ **Agent mode only** | Chat/Composer read `.cursorrules` (deprecated) + `.cursor/rules/*.mdc` and do *not* read AGENTS.md |
| Gemini CLI | configurable | default `GEMINI.md`; `settings.json` → `context.fileName: ["AGENTS.md", ...]` |
| Claude Code | ❌ | `CLAUDE.md` only. Docs: *"Claude Code reads `CLAUDE.md`, not `AGENTS.md`."* Sanctioned bridges: `@AGENTS.md` import, or `ln -s AGENTS.md CLAUDE.md` |

## The real cost: frontmatter divergence, not linking

Linking is a solved problem. Symlinking `.claude/skills` → `.agents/skills` at the **directory** level works (verified empirically by the maintainer, August 2026), and Claude Code separately documents per-`<skill-name>` symlinks and dedupes when one target is reachable twice.

The unavoidable cost is that **one `SKILL.md` serving many harnesses carries fields most of them do not recognize**, and each harness silently drops what it does not know. Claude Code is the forerunner with the largest field surface, so a cross-harness skill pays a small context tax on every other harness, and needs **redundancy in the body** to survive field-dropping.

Spec-defined fields: `name` (required, ≤64, lowercase/hyphens, must match parent directory), `description` (required, ≤1024), `license`, `compatibility`, `metadata`, `allowed-tools` (experimental).

| Field | Origin | Support |
| --- | --- | --- |
| `name`, `description` | spec | universal |
| `license`, `metadata`, `compatibility` | spec | widely tolerated, largely ignored |
| `allowed-tools` | spec (experimental) | most agents; **not** Kiro CLI, Zencoder |
| `context: fork`, `agent:` | Claude Code | **Claude Code only** |
| `disable-model-invocation` | Claude Code + Cursor | those two |
| `paths`, legacy `globs` | Cursor | Cursor only |
| `model` | Copilot CLI | Copilot only |
| Hooks | Claude Code, Cline, Kiro CLI | those three |
| `agents/openai.yaml` sidecar | Codex | Codex only — display name, `allow_implicit_invocation`, MCP deps |

Claude Code deviates semantically too: `name` is only a display label; the invoking command comes from the **directory name**. The spec says `name` must match the parent directory — following the spec makes this moot, which is a reason to enforce it.

The client-implementation guide prescribes **lenient validation**, which is what makes cross-harness authoring survivable:

- name ≠ parent directory → warn, load anyway
- name > 64 chars → warn, load anyway
- description missing/empty → **skip the skill**
- YAML unparseable → **skip the skill**

It also warns about the most common real-world break: an unquoted colon in `description` (`description: Use this skill when: ...`) is invalid YAML that some parsers accept and others reject. **Quote descriptions containing colons.**

## Confidence

**High** for all skill discovery paths and instruction-file support — every row is from a primary vendor doc.
**High** for the provenance of `.agents/` — quoted verbatim from agentskills.io plus the `npx skills` implementation.
**High** for the frontmatter field origins.
**Medium** for the `npx skills` compatibility matrix — read through a summarizing fetch, not row-by-row.
**Medium** for Windsurf — attested by third-party sources and the `npx skills` path table, not by primary Windsurf docs.
**Low** for `~/.agents/skills` vs `~/.config/agents/skills` precedence on XDG systems — sources conflict.

## Strongest supporting evidence

- agentskills.io client-implementation guide states the `.agents/skills/` convention and its non-normative status verbatim
- Codex docs give the exact six-row search path table including the repo-root walk
- GitHub Copilot CLI docs list all three project paths and both personal paths
- Cursor docs list `.agents/skills` first and document compat reads of `.claude/skills` and `.codex/skills`
- Claude Code memory docs state plainly that AGENTS.md is not read, and prescribe the import/symlink bridges

## Strongest counterevidence / caveats

- Cursor reads AGENTS.md **only in Agent mode** — a repo that standardizes on AGENTS.md silently loses instructions in Cursor Chat/Composer
- `npx skills` global canonical is `~/.agents/skills/` *or* `~/.config/agents/skills/`; vendor docs only ever name `~/.agents/skills`. Contradiction unresolved
- The Agent Skills spec's `name`-must-match-directory rule is contradicted in practice by Claude Code's directory-name-wins command resolution
- `.claude/commands/` is being merged into skills upstream in Claude Code, so command-vs-skill is a moving boundary

## What is not supported

- Any specification that mandates `.agents/` — it is convention only, and could diverge
- A single `SKILL.md` frontmatter that every harness fully understands
- AGENTS.md being read by Claude Code without a bridge file
- `.agents/skills` being read by Claude Code or Windsurf at any scope

## Where evidence is thin

- Whether Cursor's `.agents/skills` discovery applies to **nested subdirectories** the way `.cursor/skills` does — untested, and testable locally
- Windsurf's skills support has no primary-doc confirmation
- Whether `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` have any adoption at all — only `.agents/skills/` is attested anywhere
- The precise `~/.config/agents/skills/` XDG behavior

## Recheck triggers

- If Claude Code adds `.agents/skills` discovery or native AGENTS.md reading — this would collapse most of the projection work in this project
- If agentskills.io promotes the `.agents/` convention from the client-implementation guide into the specification proper
- If `vercel-labs/skills` issue #896 (configurable canonical skills directory) or #693 (Claude Code global read) lands
- If Cursor unifies AGENTS.md reading across Chat/Composer and Agent modes
- If AAIF publishes a location standard covering more than skills

## Implications for buddy-agent-harness

1. **Reframe the product.** `.agents/` is a native read path for most of the field. The initializer's job is (a) scaffold canonical structure, (b) migrate pre-existing vendor config into it, (c) bridge the two holdouts — not (d) project to five harnesses.
2. **Claude Code bridge is two artifacts**: `.claude/skills` → `.agents/skills` directory symlink, and a `CLAUDE.md` containing `@AGENTS.md`.
3. **`apps/web/src/content/docs/reference/configuration-layout.md` is wrong.** It maps Cursor/Codex/Windsurf skills to bare `.cursor`/`.codex`/`.windsurf` and does not mention `.agents/skills` native support at all. Same for `harnessRegistry` in `src/harness.ts`.
4. **Frontmatter guidance belongs in the init skill**: enforce spec `name`/`description`, require `name` == directory name, quote descriptions containing colons, and warn that harness-specific fields cost context everywhere else and need body-level redundancy to survive dropping.
5. **Overlap with `npx skills` is real.** It already implements canonical + symlink across 75 agents. Differentiation should be deliberate — this project's edge is repository-scope *consolidation and migration of existing configuration*, not skill installation.

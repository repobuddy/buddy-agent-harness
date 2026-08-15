# Open Standards for Agentic Repository Configuration (August 2026)

## Question

What is "the open standard" for agentic repository configuration? Specifically:

1. Which standards exist, who governs them, and what do they actually normatively define?
2. Where does the `.agents/` directory convention come from — neither agents.md nor agentskills.io's specification page mentions it, yet harnesses clearly implement it.
3. How far does each major harness support these standards, and where does each deviate?
4. What consolidation approach follows, and what should the `init` skill's guided workflow do?

## Scope

**In**: repository-scope agent configuration — instruction files, skill discovery paths, `SKILL.md` frontmatter, and the `.agents/` convention. Harnesses: Claude Code, Codex, Cursor, GitHub Copilot CLI, Gemini CLI, Windsurf.

**Out**: plugin bundle manifests (`.claude-plugin/plugin.json` and peers) — covered by prior research in the `universal-plugin` project (`plugin-schema`, `open-plugin-spec-comparison`, `hook-event-survey`, `plugin-consumption-leveling`). MCP protocol internals. Hook event semantics beyond noting they diverge.

## Source angles

- Standards bodies: agents.md, agentskills.io (specification + client-implementation guide), AAIF/Linux Foundation
- Primary vendor docs: Claude Code, Codex, Cursor, GitHub Copilot CLI, Gemini CLI
- Reference implementations: `vercel-labs/skills` (`npx skills`), skills.sh
- Issue trackers as corroboration for absences
- Maintainer empirical testing for undocumented behavior

## Findings

### The standards define less than assumed

Both standards are deliberately narrow. AGENTS.md defines a filename and a precedence rule, nothing else — no schema, no required sections. Agent Skills defines what is *inside* a skill directory and says nothing about where that directory lives.

That second omission is the whole story. The gap it leaves is exactly the question this project exists to answer, and the field filled it with a convention rather than waiting for a spec.

### `.agents/` provenance

The convention is documented — just not where anyone looks. It lives in agentskills.io's **client-implementation guide**, a page aimed at people *building* harnesses, not at people *using* them. That page publishes the four-cell path table and states plainly that the spec does not mandate locations.

`vercel-labs/skills` then hardened it into code: an `isUniversal: true` flag, canonical storage in `.agents/skills/`, symlinks out to non-universal agents. Codex, Cursor, Copilot CLI, and Gemini CLI subsequently wrote `.agents/skills` into their own primary docs.

So the authority chain is documentation → reference implementation → vendor adoption. There is no normative spec, and nothing prevents divergence.

### Claude Code is the outlier on both axes

It is the only Tier-1 harness that reads neither `.agents/skills/` nor `AGENTS.md`. It is simultaneously the harness with the **largest** frontmatter surface (`context: fork`, `agent:`, `disable-model-invocation`, `once`, `${CLAUDE_SKILL_DIR}`) and the most-copied conventions — the client-implementation guide explicitly tells other harness authors to scan `.claude/skills/` "for pragmatic compatibility, since many existing skills are installed there."

Both bridges are cheap and officially sanctioned or empirically verified:

- instructions: a `CLAUDE.md` containing `@AGENTS.md` (documented)
- skills: `.claude/skills` → `.agents/skills` directory symlink (undocumented but tested working), or per-skill symlinks (documented)

### The real cost is frontmatter, not linking

Linking was the assumed hard problem and it is not. The durable cost is that one `SKILL.md` serving many harnesses carries fields most of them silently drop.

Two consequences:

1. **A context tax on every non-Claude harness.** Claude Code leads the field on frontmatter surface, so cross-harness skills carry Claude-shaped fields that other harnesses parse and discard.
2. **Redundancy is required.** Behavior encoded only in a harness-specific field disappears on harnesses that drop it. Anything that must hold everywhere has to be restated in the Markdown body, where every harness sees it.

The client-implementation guide's **lenient validation** rules are what make this survivable — a name/directory mismatch is a warning, but a missing description or unparseable YAML kills the skill outright. The single most common real-world break is an unquoted colon inside a description.

### Convergence is real but shallow

Only `.agents/skills/` is attested. No source shows adoption of `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` by any harness. A canonical tree that assumes those paths are meaningful would be inventing convention, not following it.

## Contradictions

- **Global canonical path**: `npx skills` documents `~/.agents/skills/` *or* `~/.config/agents/skills/` on XDG systems; every vendor doc names only `~/.agents/skills`. Unresolved (E-AGT-03).
- **`name` semantics**: the spec requires `name` to match the parent directory; Claude Code treats `name` as a display label and resolves commands from the directory name. Complying with the spec hides the conflict (E-FM-02).
- **Cursor and AGENTS.md**: secondary sources say Agent mode reads it and Chat/Composer do not. Not confirmed from primary Cursor docs (E-CUR-02).
- **Windsurf**: one source says `.windsurf/skills/`, another says skill content must be pasted into Windsurf rules. No primary doc (E-WS-01).

## Open questions

- Does Cursor's `.agents/skills` discovery apply to nested subdirectories the way `.cursor/skills` does? **Testable locally** — the user has not tested it.
- Is `.agents/rules|commands|agents/` used by anything, or would adopting it be invention?
- What is the actual XDG behavior for the global canonical path?
- Does Windsurf support `SKILL.md` at all, per primary docs?
- Should this project converge with `npx skills` rather than reimplement canonical+symlink? It already covers 75 agents.

## Sources consulted

- AGENTS.md — https://agents.md/
- Agent Skills Specification — https://agentskills.io/specification
- How to add skills support to your agent — https://agentskills.io/client-implementation/adding-skills-support
- Client Showcase — https://agentskills.io/clients.md
- Claude Code skills — https://code.claude.com/docs/en/skills
- Claude Code memory — https://code.claude.com/docs/en/memory
- Codex build skills — https://learn.chatgpt.com/docs/build-skills.md
- GitHub Copilot CLI add skills — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
- Cursor skills — https://cursor.com/docs/skills
- Gemini CLI skills — https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/skills.md
- vercel-labs/skills — https://github.com/vercel-labs/skills
- skills.sh agent list — https://www.skills.sh/agent
- vercel-labs/skills issues #519, #693, #896, #1060

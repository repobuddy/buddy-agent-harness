# Evidence — Plugin-Shipped Skills: Naming, Invocation, and Dependencies

Status values: `confirmed`, `contested`, `thin`. Confidence: high / medium / low.

Four harnesses, four questions each: (1) can a plugin ship Agent Skills and is it documented,
(2) how is a plugin-shipped skill named/addressed and how does a user invoke it as a slash
command, (3) is there a documented mechanism for the model to load a skill another skill names
in prose, (4) does the harness support plugin dependencies. The `E-PSN-NN` series is numbered
continuously across harnesses; each entry names which question(s) it answers.

## Claude Code (Anthropic)

### E-PSN-01 — A plugin can ship Agent Skills; this is the documented, diagrammed case

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs, "Plugins overview" — https://code.claude.com/docs/en/plugins —
  primary
- **Notes**: *"A plugin is a directory of components, usually with a manifest... The components
  are what the plugin adds to Claude Code, such as: **Skills**: `SKILL.md` instructions Claude
  loads when relevant, and that you can also run as a command."* The page's own diagram shows a
  plugin `my-plugin` with `skills/review/SKILL.md` and states directly that "the skill runs as
  `/my-plugin:review`."

### E-PSN-02 — Plugin skills are namespaced by plugin name; the bare form also works unless it collides

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs, "Skills" — https://code.claude.com/docs/en/skills — primary
- **Notes**: The command-name reference table gives the exact mapping: *"Plugin `skills/`
  subdirectory | Frontmatter `name` or the directory name, namespaced by plugin |
  `my-plugin/skills/review/SKILL.md` → `/my-plugin:review`, or `/my-plugin:fancy` with
  `name: fancy`."* It also documents the fallback: *"The bare `/fancy` also invokes the skill
  unless another command already uses that name."* A user invokes it exactly as any slash
  command: *"You invoke a bundled skill the same way as any other skill, by typing `/` followed
  by the skill name."*

### E-PSN-03 — The model loads a skill by name through a documented `Skill` tool, and its name argument accepts the plugin-qualified form

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs, "Skills" — https://code.claude.com/docs/en/skills — primary
- **Notes**: Permission syntax for the tool is given directly: *"Permission syntax: `Skill(name)`
  for exact match, `Skill(name *)` for prefix match with any arguments."* The qualified,
  plugin-namespaced form is a first-class value for that same parameter: *"To approve a synced
  skill without a prompt, name it inside its reserved namespace: `Skill(anthropic-skills:pdf)`
  approves the synced `pdf` skill."* Examples in the same section show both forms accepted by one
  tool: `Skill(commit)`, `Skill(review-pr *)`, `Skill(anthropic-skills:pdf)`. This is the closest
  of the four harnesses to a documented "tool that takes a name, qualified or not" — the
  documentation frames it as a permission-and-invocation gate on the `Skill` tool rather than
  spelling out step-by-step "when prose names a skill, Claude calls Skill(...)", but the tool,
  its name parameter, and both the bare and namespaced forms of that parameter are all
  documented.

### E-PSN-04 — Plugin dependencies are a first-class, documented `plugin.json` feature

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Claude Code docs, "Plugin dependencies" — https://code.claude.com/docs/en/plugins/dependencies
  — primary
- **Notes**: *"A plugin dependency is another plugin that your plugin relies on, such as one
  whose MCP server or skill it calls... List dependencies in the `dependencies` array of your
  plugin's `.claude-plugin/plugin.json`."* Example manifest: `"dependencies": ["audit-logger",
  { "name": "secrets-vault", "version": "~2.1.0" }]`. The page documents version-range
  resolution, cross-marketplace dependencies (gated by an allowlist), conflict resolution when
  two plugins constrain the same dependency, and `claude plugin prune` for orphaned
  auto-installed dependencies. The manifest reference page names the field directly:
  *"`dependencies` | Array of strings or objects | Plugins that must be enabled for this one to
  work"* — https://code.claude.com/docs/en/plugins/manifest-reference.

## OpenAI Codex CLI

### E-PSN-05 — A plugin can ship Agent Skills; documented at the plugin-packaging level

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: OpenAI/ChatGPT developer docs, "Build skills" — https://learn.chatgpt.com/docs/build-skills
  (canonical link https://developers.openai.com/codex/skills) — primary
- **Notes**: *"Plugins can include one or more skills. They can also optionally bundle registered
  MCP server connections, bundled MCP server configuration, and presentation assets in a single
  package."* Corroborated by the plugin-packaging page: *"Every plugin is a folder with a
  required `.codex-plugin/plugin.json` manifest and optional supporting files including a
  `skills/` directory for packaged skills..."* — https://developers.openai.com/codex/plugins/build.

### E-PSN-06 — Skill invocation is bare-named (`@`/`$`/`/skills`); no documented plugin-namespacing of the skill's addressable name

- **Date**: 2026-09-26
- **Status**: thin
- **Confidence**: medium
- **Source**: https://learn.chatgpt.com/docs/build-skills and https://learn.chatgpt.com/docs/plugins
  — primary
- **Notes**: Invocation is documented as bare, not plugin-qualified: *"Include the skill directly
  in your prompt. In ChatGPT, type `@` to select a skill. In Codex CLI or the IDE extension, run
  `/skills` or type `$` to mention a skill."* The plugins page uses the same bare form for a
  plugin's bundled skill: users type `@` "to invoke the plugin or one of its bundled skills
  explicitly." Neither page documents what happens when two installed plugins ship a skill with
  the same name — **not documented**. The plugin-build guidance only says to keep the plugin
  `name` itself unique and kebab-case ("Plugin hosts use it as the plugin identifier and
  component namespace" — https://developers.openai.com/codex/plugins/build) without stating that
  this namespace extends to how a user or the model addresses an individual skill inside it.

### E-PSN-07 — No documented tool for the model to load a skill named in prose; only description-matching and explicit user mention

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://learn.chatgpt.com/docs/build-skills — primary
- **Notes**: The only two documented paths to a skill are explicit user mention (`@`/`$`/`/skills`)
  and implicit selection: the docs describe the model choosing a skill based on its description,
  not a callable tool with a name argument. No page found documents a "Skill" tool or equivalent
  taking a skill-name string. **Not documented.**

### E-PSN-08 — Plugin-to-plugin dependencies are not documented; only tool/MCP dependencies inside one plugin's own manifest are

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://developers.openai.com/codex/plugins/build and https://learn.chatgpt.com/docs/build-skills
  — primary
- **Notes**: The only "dependencies" concept found in the primary docs is a plugin listing the
  external tools/MCP servers it itself needs, in `agents/openai.yaml`: *"dependencies: tools: -
  type: 'mcp' value: 'openaiDeveloperDocs' description: 'OpenAI Docs MCP server'."* This is a
  plugin declaring a tool dependency, not one plugin declaring another plugin. No page found
  states that a Codex plugin can require another Codex plugin be installed/enabled. **Not
  documented.**

## Cursor

### E-PSN-09 — A plugin can ship Agent Skills; documented as the only way to distribute a skill from a repo

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: Cursor docs, "Agent Skills" — https://cursor.com/docs/skills.md — primary
- **Notes**: *"Skills aren't imported on their own. To bring skills in from a GitHub repository,
  package them in a plugin and publish that plugin through a marketplace."* The plugin reference
  page lists `skills` as a manifest field and states plugins "package rules, skills, agents,
  commands, MCP servers, and hooks into distributable bundles," with skills discovered under a
  `skills/` directory, one `SKILL.md` per subdirectory —
  https://cursor.com/docs/reference/plugins.

### E-PSN-10 — Slash invocation is bare (`/skill-name`); no documented plugin-qualified form

- **Date**: 2026-09-26
- **Status**: confirmed (bare form), thin (on whether a qualified form exists)
- **Confidence**: medium
- **Source**: https://cursor.com/docs/skills.md — primary
- **Notes**: *"Skills can also be manually invoked by typing `/` in Agent chat and searching for
  the skill name."* No example anywhere in the fetched Cursor skills or plugins pages shows a
  `plugin-name:skill-name` or `plugin-name/skill-name` slash form; every invocation example is a
  bare skill name. The plugins reference page does not document a name-collision rule between two
  installed plugins' skills. **Not documented** whether Cursor namespaces at the point of
  collision.

### E-PSN-11 — No documented tool for the model to load a skill named in prose; automatic invocation is description-matching, and a skill can be forced to require the explicit slash

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://cursor.com/docs/skills.md — primary
- **Notes**: *"The agent is presented with available skills and decides when they are relevant
  based on context"* — a description-matching mechanism, not a named tool call. The one
  documented control over this is the frontmatter flag making explicit invocation mandatory: *"Set
  `disable-model-invocation: true` to make a skill behave like a traditional slash command, where
  it is only included in context when you explicitly type `/skill-name` in chat."* No fetched page
  documents a tool that takes a skill-name argument for the model itself to call. **Not
  documented.**

### E-PSN-12 — Plugin dependencies are not documented in Cursor's plugin manifest reference

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://cursor.com/docs/reference/plugins — primary
- **Notes**: The manifest's documented fields are `name`, `description`, `version`, `author`,
  `homepage`, `repository`, `license`, `keywords`, `logo`, `rules`, `agents`, `skills`,
  `commands`, `hooks`, `mcpServers`, and `variables`. No `dependencies` field, and no prose
  anywhere on the page describes one plugin requiring another to be installed or enabled. A
  Cursor community forum thread is titled "Add support for Plugin Dependencies (Claude parity)"
  (https://forum.cursor.com/t/add-support-for-plugin-dependencies-claude-parity/161252), which is
  a feature request, not documentation, and is cited here only to show the gap is a known one, not
  as evidence the feature exists. **Not documented.**

## GitHub Copilot CLI

### E-PSN-13 — A plugin can ship Agent Skills; documented under both the legacy and Agent Plugins 1.0 manifest shapes

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Docs, "About GitHub Copilot plugins" —
  https://docs.github.com/en/copilot/concepts/agents/about-plugins — primary; "Creating a plugin
  for GitHub Copilot CLI" — https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating
  — primary
- **Notes**: *"Skills — Discrete callable capabilities (skills subdirectories in `skills/`,
  containing a `SKILL.md` file)"* are listed among the components a plugin can contain. The
  creation guide gives the mechanics: *"Add a skill by creating a `skills/NAME` subdirectory of
  your plugin directory, where `NAME` is the name of your skill,"* with the skill's real name set
  in its own frontmatter (example shows `name: deploy`).

### E-PSN-14 — Invocation is by bare skill name via a leading slash in the prompt text, not a namespaced slash command

- **Date**: 2026-09-26
- **Status**: confirmed
- **Confidence**: high
- **Source**: GitHub Docs, "Adding agent skills for GitHub Copilot CLI" —
  https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills — primary
- **Notes**: *"To tell Copilot to use a specific skill, include the skill name in your prompt,
  preceded by a forward slash. For example, if you have a skill named 'frontend-design' you could
  use a prompt such as: `Use the /frontend-design skill...`."* This is a bare name embedded inside
  a normal prompt, not a dedicated slash-command dispatch the way `/my-plugin:review` is in
  Claude Code. The CLI does have real slash *commands* for skill management —
  `/skills list`, `/skills info NAME`, `/skills add`, `/skills remove`, `/skills reload` — and *"To
  remove skills added as part of a plugin you must manage the plugin itself"* and *"Use the `info`
  subcommand to find out which plugin a skill came from"* confirm skills keep a plugin
  association, but no page documents a `plugin-name/skill-name` or `plugin-name:skill-name`
  addressable form — skills are, per the Agent Plugins 1.0 reference, *"deduplicated by their
  `name` field inside the `SKILL.md` file,"* i.e. one flat namespace. **Not documented**: what
  happens, or how a user disambiguates, when two plugins' skills collide on that flat name beyond
  dedup.

### E-PSN-15 — No documented tool for the model to load a skill named in prose beyond the same bare-name convention; the model's own automatic selection is description-based

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills
  — primary
- **Notes**: *"When performing tasks, Copilot will decide when to use your skills based on your
  prompt and the skill's description."* There is no separate tool call documented for this; the
  only "name" mechanism documented anywhere is the same `/skill-name` convention a human types
  into the prompt. **Not documented** as a distinct model-facing tool.

### E-PSN-16 — Plugin-to-plugin dependencies are not documented for GitHub Copilot CLI

- **Date**: 2026-09-26
- **Status**: confirmed (as an absence)
- **Confidence**: medium
- **Source**: https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
  and https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-creating —
  primary
- **Notes**: The Agent Plugins 1.0 manifest's allowed top-level fields are stated exhaustively:
  *"The schema allows only `$schema`, `name`, `version`, `description`, `author`, `homepage`,
  `repository`, `license`, `keywords`, and `extensions` as top-level fields."* No `dependencies`
  field is listed, and no prose on either page describes one plugin requiring another plugin to be
  installed. **Not documented.**

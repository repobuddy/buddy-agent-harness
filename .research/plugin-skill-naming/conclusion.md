# Conclusion — Plugin-Shipped Skills Across Four Harnesses

| Harness | Plugin can ship skills | Name form | Slash invocation | Plugin dependencies |
| :--- | :--- | :--- | :--- | :--- |
| Claude Code | Yes, documented (E-PSN-01) | Namespaced: `plugin-name:skill-name`, bare form also works unless it collides (E-PSN-02) | `/my-plugin:review` (namespaced) or `/review` (bare fallback) (E-PSN-02) | Yes, documented `dependencies` array in `plugin.json`, with version ranges and cross-marketplace rules (E-PSN-04) |
| OpenAI Codex CLI | Yes, documented (E-PSN-05) | Bare skill name; plugin `name` is a "component namespace" for the plugin itself, but this is not documented as extending to the skill's addressable name (E-PSN-06) | No dedicated slash-per-skill form; `/skills` lists skills, `$name` or `@name` mentions one (E-PSN-06) | Not documented — a plugin's manifest can declare its own external tool/MCP dependencies, but not a dependency on another plugin (E-PSN-08) |
| Cursor | Yes, documented — the only way to bring in a skill from a repo (E-PSN-09) | Bare skill name; no plugin-qualified form documented (E-PSN-10) | `/skill-name` (bare) (E-PSN-10) | Not documented — no `dependencies` field in the plugin manifest reference (E-PSN-12) |
| GitHub Copilot CLI | Yes, documented, under both legacy and Agent Plugins 1.0 manifests (E-PSN-13) | Bare skill name in one flat namespace, "deduplicated by their `name` field"; plugin origin is queryable (`/skills info NAME`) but not part of the addressable name (E-PSN-14) | No namespaced slash command; invoked by writing `/skill-name` inside a normal prompt (E-PSN-14) | Not documented — Agent Plugins 1.0 manifest's allowed top-level fields do not include one (E-PSN-16) |

## Which prose form reaches all four

Claude Code is the outlier: it is the only harness with a documented namespaced address
(`plugin-name:skill-name`) and a documented tool (`Skill(name)`) that accepts that qualified form
as a first-class value. The other three document only a flat, bare skill name — a plugin's own
name is documented as a namespace for the *plugin* (its identifier, its slash-command prefix in
Claude Code's case), never as part of how the *skill* itself is named or resolved once installed.

Given that, "the `X` skill in the `Y` plugin" is the form that reaches all four harnesses safely.
It reads correctly to a Claude Code model that also recognizes `Y:X`, and it is the only phrasing
that still makes sense on Codex, Cursor, and Copilot CLI, where the plugin is not part of the
skill's name at all — telling one of those three to load "`Y:X`" would likely fail outright, since
none of their documented invocation surfaces (`$`/`@` mentions, `/skills`, or a bare `/X` inside a
prompt) parse a colon- or slash-qualified skill name. A bare slash command (`/X`) is shorter and
works everywhere skills exist at all, but it silently breaks the moment two installed plugins ship
a same-named skill — a case only Claude Code documents a resolution rule for (namespaced form
first, bare form as an unambiguous fallback). Prose that names the owning plugin, rather than
encoding it into a command syntax, degrades safely on every harness that does not understand
namespacing and loses nothing on the one that does.

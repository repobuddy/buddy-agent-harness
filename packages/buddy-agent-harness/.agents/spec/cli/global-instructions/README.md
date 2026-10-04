---
spec-type: behavioral
concept: command-interface
---

# global-instructions

## What

The `doctor` command's question about the person rather than the repository: whether each harness installed for them **loads `~/.agents/AGENTS.md`**.

`~/.agents/AGENTS.md` is the user-scope counterpart of the root `AGENTS.md`, the way `~/.agents/skills/` is for `.agents/skills/`. `enhance` hands global placements over for it, and other tools hand text to it too. **No harness reads it by itself.** Each reads a user-scope instruction file of its own — `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.copilot/copilot-instructions.md`, `~/.gemini/GEMINI.md` — and that file has to load the global one. Where none does, every line handed over to the global file does nothing in that harness, and nobody is told.

What loads it differs per harness, and the registry records the variant as the harness's user-scope `instructionBridge`. Claude Code imports it: a line `@~/.agents/AGENTS.md`. Codex has no import, Copilot CLI refuses one that leaves its directory, and Gemini CLI validates imports against `~/.gemini`, so for those three the user-scope file has to **be** a symlink to the global one. Gemini CLI's project bridge does not carry over: at user scope `context.fileName` names files inside `~/.gemini/` only, so no setting can point it at `~/.agents/`.

It is a separate node from `../instruction-bridges/` because its root is the home directory rather than the repository, its unit of iteration is the harness **installed for the user** rather than the harness the repository enables, and its repair is never anyone's to make but the user's.

**Every repair is handed over, never made.** The file is outside the repository, and nothing this package ships writes outside the repository. Each finding carries the exact line or symlink for the user to add themselves, and an empty `command`, so no agent runs it on their behalf.

**Key terms**

- **global instruction file** — `~/.agents/AGENTS.md`.
- **user-scope instruction file** — the file a harness reads from the home directory for every repository, recorded per harness as the path of its user-scope `instructionBridge`.
- **global instruction problem** — `global-instructions-missing` (no user-scope file at all) or `global-instructions-unbridged` (a file that loads its own content and not the global one).

**Non-goals**

- **Writing.** Never, by `doctor` or by any skill: see the repair above.
- **Harnesses with no user-scope file on disk.** Cursor keeps its user rules in a settings panel, and Devin Desktop documents no user-scope path; neither gets a row.
- **Precedence inside a harness's home directory.** A non-empty `~/.codex/AGENTS.override.md` would win over `~/.codex/AGENTS.md`; it is not checked.
- **Relocated home directories.** `CODEX_HOME`, `COPILOT_HOME`, and `CLAUDE_CONFIG_DIR` are not followed; the rows describe the default paths.
- **What the global file says.** Whether it loads is decidable; whether it is any good is not this node's.

## Use Cases

**Actors**

- **`doctor-buddy-agent-harness` skill** — presents the report and hands each step to the user.
- **`repair` skill** — runs `doctor`, finds no correction of its own for these, and passes the step on unchanged.
- **`enhance` skill** — reads the rows before handing a global placement over, to say whether the harness in use will load it.
- **person** — the only actor who adds the bridge.

**Entry point**

| Entry point | Trigger | Inputs | Outcome |
| --- | --- | --- | --- |
| `buddy-agent-harness doctor` | a caller asks whether text placed in `~/.agents/AGENTS.md` reaches each harness | the home directory, and `--harness` | a `globalInstructions` row per harness installed for the user, and a finding for each that does not load an existing global file |

**Surface**

No option of its own. A harness is checked where its user-scope detection directory exists in the home directory, or where `--harness` names it. The library entry point takes the home directory as `home`; omitted, nothing is checked, so a caller diagnosing a repository alone never reads outside it.

**Extensions**

- **No global file.** Rows are still reported, so `enhance` can say whether a placement it hands over would load; no finding is raised, because nothing is going unread.
- **The user-scope file is a symlink to the global file.** `ok`, whatever the harness's bridge kind: the harness reads the file it lands on.
- **A symlink to anything else.** `unbridged`.
- **An import written with the absolute home path.** `ok`, the same as the `~` spelling.
- **An import line in a file whose harness has no import.** `unbridged`: the line loads nothing there.
- **A path that cannot be read as a file.** `unbridged` rather than failing the run.

## Scenario map

| Path (Given) | Scenario |
| --- | --- |
| a harness not installed for the user | `reports nothing for a harness the user has not installed` |
| a harness whose user rules are not a file | `reports no row for a harness whose user rules are not a file` |
| a harness named with `--harness` and not installed | `reports a harness named on the command line even where it is not installed` |
| no user-scope file, and a global file | `reports a missing user file, and hands over the import that bridges it` |
| no global file | `reports the rows without findings where there is no global file to go unread` |
| the import among the file's own content | `accepts the import among the file's own content, written either way` |
| content of its own and no import | `reports a user file with content of its own and no import as unbridged` |
| a symlink to the global file, and one elsewhere | `separates a symlink to the global file from one pointing elsewhere` |
| a harness that cannot import | `hands over a symlink, and the move before it, for a harness that cannot import` |
| a path that is not a readable file | `reads a user file it cannot read as unbridged rather than failing the run` |
| Gemini CLI's user settings naming `AGENTS.md` | `checks GEMINI.md rather than the settings file at user scope` |
| no home directory given | `checks the user-scope files only when given a home directory` |

## References

- `../../../../src/diagnose-bridges/diagnose-global-instructions.ts` is the check.
- `../../../../src/harness-registry/harness-registry.ts` records each harness's user-scope bridge.
- `../../../../../../.research/agentic-configuration-standards/evidence.md` holds E-CC-18, E-CODEX-05, E-GEM-03, E-COPILOT-04, and E-CUR-08, the vendor facts behind each row.

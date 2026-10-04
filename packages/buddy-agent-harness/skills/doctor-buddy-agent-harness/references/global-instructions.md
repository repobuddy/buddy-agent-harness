<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Global instruction findings

`~/.agents/AGENTS.md` is the user-scope counterpart of the root `AGENTS.md`: instructions that hold in every repository one person opens. No harness reads it by itself. Each reads a user-scope file of its own, and that file has to load the global one — by an import where the harness supports one that reaches the home directory, and otherwise by being a symlink to it.

| Harness | User-scope file | What loads `~/.agents/AGENTS.md` |
| --- | --- | --- |
| `claude-code` | `~/.claude/CLAUDE.md` | add the line `@~/.agents/AGENTS.md` to ~/.claude/CLAUDE.md |
| `codex` | `~/.codex/AGENTS.md` | run `ln -s ~/.agents/AGENTS.md ~/.codex/AGENTS.md` |
| `copilot-cli` | `~/.copilot/copilot-instructions.md` | run `ln -s ~/.agents/AGENTS.md ~/.copilot/copilot-instructions.md` |
| `gemini-cli` | `~/.gemini/GEMINI.md` | run `ln -s ~/.agents/AGENTS.md ~/.gemini/GEMINI.md` |

Cursor keeps its user rules in a settings panel rather than a file, so there is nothing on disk to check; Devin Desktop documents no user-scope path. Neither gets a row.

| Finding | What it means | Repair |
| --- | --- | --- |
| `global-instructions-missing` | no user-scope instruction file at this path — the harness loads none of ~/.agents/AGENTS.md | hand the user the step the harness page names for that file; write nothing yourself |
| `global-instructions-unbridged` | the file holds its own content and does not load ~/.agents/AGENTS.md — text placed there reaches no session of this harness | hand the user the step the harness page names for that file, keeping what the file says; write nothing yourself |

**Hand the step over; never take it.** The file is in the user's home directory, outside the repository this tool works in, so every repair carries an empty `command` and names the step for the user to take themselves.

`unbridged` is the one to read carefully. The file is there and holds instructions of its own, so the harness loads something — just not the global file. Where the bridge is a symlink, the file it replaces holds content that has to move into `~/.agents/AGENTS.md` first, or it is lost.

A row is reported for every harness installed for this user, whether or not `~/.agents/AGENTS.md` exists, so a skill handing text over for that file can say which harnesses will load it. A finding is raised only where the file exists and a harness is not loading it.

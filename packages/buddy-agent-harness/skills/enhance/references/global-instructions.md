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

A harness's directory can be moved by a variable: `CLAUDE_CONFIG_DIR` for `claude-code` (`~/.claude`), `CODEX_HOME` for `codex` (`~/.codex`), `COPILOT_HOME` for `copilot-cli` (`~/.copilot`). Where one is set and non-empty, the row and the step name the file under it, written from the variable — `$CODEX_HOME/AGENTS.md` — so the step works in the shell the user ran `doctor` from. Set but empty, it is read the way the harness reads it: as unset for `CODEX_HOME` and `COPILOT_HOME`, and as the directory the harness starts in for `CLAUDE_CONFIG_DIR`.

| Finding | What it means | Repair |
| --- | --- | --- |
| `global-instructions-missing` | no user-scope instruction file at this path — the harness loads none of ~/.agents/AGENTS.md | hand the user the step the harness page names for that file; write nothing yourself |
| `global-instructions-unbridged` | the file holds its own content and does not load ~/.agents/AGENTS.md — text placed there reaches no session of this harness | hand the user the step the harness page names for that file, keeping what the file says; write nothing yourself |
| `global-instructions-overridden` | the harness reads this file in place of its own user-scope file, so whatever that file loads goes unread, and this one does not load ~/.agents/AGENTS.md | hand the user the move of what that file says into the global file, and its removal; write nothing yourself |
| `global-instructions-emptied` | the variable is set but empty, which this harness reads as the directory it starts in rather than as unset — its user-scope file is whichever one sits there, not the one in its own folder | hand the user the step of unsetting that variable; write nothing yourself |

**Hand the step over; never take it.** The file is in the user's home directory, outside the repository this tool works in, so every repair carries an empty `command` and names the step for the user to take themselves.

`unbridged` is the one to read carefully. The file is there and holds instructions of its own, so the harness loads something — just not the global file. Where the bridge is a symlink, the file it replaces holds content that has to move into `~/.agents/AGENTS.md` first, or it is lost.

`overridden` is the quietest. The user-scope file may be bridged perfectly and still go unread, because the harness reads another file in its place: Codex reads `AGENTS.override.md` before `AGENTS.md`, and uses whichever first holds more than whitespace. The finding names that file. Its content moves into `~/.agents/AGENTS.md` before it is removed; where the user-scope file has a problem of its own, that finding is reported beside it, so both steps are handed over at once.

`global-instructions-emptied` blames the variable, not a file. A harness that reads an empty variable as the directory it starts in reads its user-scope file from there — in a repository, the project's own file — so the row names that path, relative, from the directory `doctor` ran in. The finding names the variable, and the step is to unset it or set it to the folder meant: editing the file the row names would bridge one directory only, and the project's file rather than the user's.

A row is reported for every harness installed for this user, whether or not `~/.agents/AGENTS.md` exists, so a skill handing text over for that file can say which harnesses will load it. A finding is raised only where the file exists and a harness is not loading it.

Feature: Report whether each installed harness loads ~/.agents/AGENTS.md

  # ── which harnesses get a row ──

  @behavior
  Scenario: reports nothing for a harness the user has not installed
    Given a home directory holding no harness's user-scope detection directory
    When the command diagnoses the global instructions
    Then it reports no row
    And it reports no problem

  @behavior
  Scenario: reports no row for a harness whose user rules are not a file
    Given a home directory where Cursor is installed
    When the command diagnoses the global instructions
    Then it reports no row for Cursor

  @behavior
  Scenario: reports a harness named on the command line even where it is not installed
    Given a home directory where Codex is not installed
    And the caller names Codex with `--harness`
    When the command diagnoses the global instructions
    Then it reports a row for `~/.codex/AGENTS.md` with status `missing`

  @behavior
  Scenario: checks the user-scope files only when given a home directory
    Given a caller of the library that passes no home directory
    When it diagnoses a repository
    Then it reports no global instruction row

  # ── whether the file loads the global one ──

  @behavior
  Scenario: reports a missing user file, and hands over the import that bridges it
    Given a home directory holding `~/.agents/AGENTS.md` and `~/.claude/` with no `CLAUDE.md`
    When the command diagnoses the global instructions
    Then it reports `~/.claude/CLAUDE.md` with kind `none` and status `missing`
    And it reports a `global-instructions-missing` problem whose repair has an empty command
    And the repair hands the user the line `@~/.agents/AGENTS.md` to add to `~/.claude/CLAUDE.md`

  @behavior
  Scenario: reports the rows without findings where there is no global file to go unread
    Given a home directory holding `~/.claude/` and no `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `~/.claude/CLAUDE.md` with status `missing`
    And it reports no problem

  @behavior
  Scenario: accepts the import among the file's own content, written either way
    Given a `~/.claude/CLAUDE.md` holding content of its own and the import, written with `~` or with the absolute home path
    When the command diagnoses the global instructions
    Then it reports that file with kind `import` and status `ok`

  @behavior
  Scenario: reports a user file with content of its own and no import as unbridged
    Given a home directory holding `~/.agents/AGENTS.md` and a `~/.claude/CLAUDE.md` with content of its own and no import
    When the command diagnoses the global instructions
    Then it reports that file with kind `file` and status `unbridged`
    And it reports a `global-instructions-unbridged` problem naming `~/.claude/CLAUDE.md`

  @behavior
  Scenario: separates a symlink to the global file from one pointing elsewhere
    Given a `~/.claude/CLAUDE.md` that is a symlink to `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports that file with kind `symlink` and status `ok`
    And a `~/.claude/CLAUDE.md` symlinked to any other file is reported with status `unbridged`

  @behavior
  Scenario: hands over a symlink, and the move before it, for a harness that cannot import
    Given a home directory holding `~/.agents/AGENTS.md` and a `~/.codex/AGENTS.md` with content of its own and an import line
    When the command diagnoses the global instructions
    Then it reports a `global-instructions-unbridged` problem naming `~/.codex/AGENTS.md`
    And the repair hands the user moving that content into `~/.agents/AGENTS.md`, then `ln -s ~/.agents/AGENTS.md ~/.codex/AGENTS.md`

  @behavior
  Scenario: reads a user file it cannot read as unbridged rather than failing the run
    Given a directory where `~/.copilot/copilot-instructions.md` belongs
    When the command diagnoses the global instructions
    Then it reports that path with status `unbridged`

  @behavior
  Scenario: checks GEMINI.md rather than the settings file at user scope
    Given a home directory holding `~/.agents/AGENTS.md`, and a `~/.gemini/settings.json` whose `context.fileName` holds `AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports a `global-instructions-missing` problem naming `~/.gemini/GEMINI.md`
    And the repair hands the user `ln -s ~/.agents/AGENTS.md ~/.gemini/GEMINI.md`

  # ── a directory moved by a variable ──

  @behavior
  Scenario: reads the user file from the directory a variable moves it to, and names the variable
    Given `CODEX_HOME` set to a directory outside the home directory, holding an `AGENTS.md` symlinked to `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `$CODEX_HOME/AGENTS.md` with kind `symlink` and status `ok`

  @behavior
  Scenario: hands over the bridge at the moved path
    Given a home directory holding `~/.agents/AGENTS.md`, `CLAUDE_CONFIG_DIR` set to a directory with no `CLAUDE.md`, and `COPILOT_HOME` set to a directory with no `copilot-instructions.md`
    When the command diagnoses the global instructions
    Then the repair hands the user the line `@~/.agents/AGENTS.md` to add to `$CLAUDE_CONFIG_DIR/CLAUDE.md`
    And the repair hands the user `ln -s ~/.agents/AGENTS.md $COPILOT_HOME/copilot-instructions.md`

  @behavior
  Scenario Outline: reads the home directory where <variable> is unset
    Given `<variable>` unset, and `~/<directory>/` with no `<file>`
    When the command diagnoses the global instructions
    Then it reports `~/<directory>/<file>` with status `missing`

    Examples:
      | variable          | directory | file                    |
      | CODEX_HOME        | .codex    | AGENTS.md               |
      | COPILOT_HOME      | .copilot  | copilot-instructions.md |
      | CLAUDE_CONFIG_DIR | .claude   | CLAUDE.md               |

  @behavior
  Scenario Outline: reads the directory <variable> names where it is set
    Given `<variable>` set to a directory with no `<file>`
    When the command diagnoses the global instructions
    Then it reports `$<variable>/<file>` with status `missing`

    Examples:
      | variable          | file                    |
      | CODEX_HOME        | AGENTS.md               |
      | COPILOT_HOME      | copilot-instructions.md |
      | CLAUDE_CONFIG_DIR | CLAUDE.md               |

  @behavior
  Scenario Outline: reads an empty <variable> as unset, as that harness does
    Given `<variable>` set to an empty string, `~/<directory>/` with no `<file>`, and `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `~/<directory>/<file>` with status `missing`
    And it reports a `global-instructions-missing` problem naming `~/<directory>/<file>`

    Examples:
      | variable     | directory | file                    |
      | CODEX_HOME   | .codex    | AGENTS.md               |
      | COPILOT_HOME | .copilot  | copilot-instructions.md |

  @behavior
  Scenario: reads an empty CLAUDE_CONFIG_DIR as the directory Claude Code starts in, and blames the variable
    Given `CLAUDE_CONFIG_DIR` set to an empty string, `~/.agents/AGENTS.md`, and a start directory with no `CLAUDE.md`
    When the command diagnoses the global instructions
    Then it reports `./CLAUDE.md` with status `missing`
    And it reports a `global-instructions-emptied` problem naming `$CLAUDE_CONFIG_DIR`, whose repair has an empty command
    And the repair hands the user the step to unset `CLAUDE_CONFIG_DIR` or set it to the folder meant
    And it reports no `global-instructions-missing` problem

  @behavior
  Scenario: reports the file an empty CLAUDE_CONFIG_DIR reads, and still blames the variable where it loads the global file
    Given `CLAUDE_CONFIG_DIR` set to an empty string, `~/.agents/AGENTS.md`, and a start directory whose `CLAUDE.md` holds `@~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `./CLAUDE.md` with kind `import` and status `ok`
    And it reports a `global-instructions-emptied` problem naming `$CLAUDE_CONFIG_DIR`

  @behavior
  Scenario: raises no finding for an empty CLAUDE_CONFIG_DIR where there is no global file to go unread
    Given `CLAUDE_CONFIG_DIR` set to an empty string, no `~/.agents/AGENTS.md`, and a start directory with no `CLAUDE.md`
    When the command diagnoses the global instructions
    Then it reports `./CLAUDE.md` with status `missing`
    And it reports no finding

  @behavior
  Scenario: reads an empty CLAUDE_CONFIG_DIR from the repository, where Claude Code starts
    Given `CLAUDE_CONFIG_DIR` set to an empty string, and a repository whose `CLAUDE.md` holds `@~/.agents/AGENTS.md`
    When the command diagnoses the repository
    Then it reports `./CLAUDE.md` with kind `import` and status `ok`

  # ── a file read in place of the user file ──

  @behavior
  Scenario: reports a bridged user file as overridden where an override beside it holds content
    Given a `~/.codex/AGENTS.md` symlinked to `~/.agents/AGENTS.md`, and a `~/.codex/AGENTS.override.md` with content of its own
    When the command diagnoses the global instructions
    Then it reports `~/.codex/AGENTS.md` with kind `symlink` and status `overridden`
    And it reports a `global-instructions-overridden` problem naming `~/.codex/AGENTS.override.md`, whose repair has an empty command
    And the repair hands the user moving that content into `~/.agents/AGENTS.md` and removing the override

  @behavior
  Scenario: reports the user file under an override too, so both steps are handed over at once
    Given a home directory holding `~/.agents/AGENTS.md`, and `CODEX_HOME` set to a directory holding an `AGENTS.override.md` with content and no `AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports a `global-instructions-overridden` problem naming `$CODEX_HOME/AGENTS.override.md`
    And it reports a `global-instructions-missing` problem naming `$CODEX_HOME/AGENTS.md`

  @behavior
  Scenario: reports an override without a finding where there is no global file to go unread
    Given a `~/.codex/AGENTS.override.md` with content of its own, and no `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `~/.codex/AGENTS.md` with status `overridden`
    And it reports no problem

  @behavior
  Scenario: ignores an override that holds only whitespace
    Given a `~/.codex/AGENTS.md` symlinked to `~/.agents/AGENTS.md`, and a `~/.codex/AGENTS.override.md` holding only whitespace
    When the command diagnoses the global instructions
    Then it reports `~/.codex/AGENTS.md` with status `ok`

  @behavior
  Scenario: accepts an override that is itself a symlink to the global file
    Given a `~/.codex/AGENTS.override.md` symlinked to `~/.agents/AGENTS.md`
    When the command diagnoses the global instructions
    Then it reports `~/.codex/AGENTS.override.md` with kind `symlink` and status `ok`
    And it reports no problem

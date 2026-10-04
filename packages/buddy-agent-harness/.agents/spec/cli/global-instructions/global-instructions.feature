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

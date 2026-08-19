Feature: Report whether every enabled harness can still read AGENTS.md

  # ── the import bridge ──

  @behavior
  Scenario: accepts a file whose body is the import
    Given a repository with a root `AGENTS.md` and a `CLAUDE.md` whose body is the `AGENTS.md` import
    When the command diagnoses the instruction bridges
    Then it reports that bridge with kind `import` and status `ok`
    And it reports no problem

  @behavior
  Scenario: accepts an import carrying Claude-specific notes below it
    Given a `CLAUDE.md` holding the `AGENTS.md` import on a line of its own and harness-specific notes below it
    When the command diagnoses the instruction bridges
    Then it reports that bridge with status `ok`

  @behavior
  Scenario: accepts a symlink to AGENTS.md and rejects one pointing elsewhere
    Given a `CLAUDE.md` that is a symlink to `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports that bridge with kind `symlink` and status `ok`
    And a `CLAUDE.md` symlinked to any other file is reported with status `unbridged`

  @behavior
  Scenario: reports a missing instruction bridge
    Given a repository with a root `AGENTS.md` and no `CLAUDE.md`
    When the command diagnoses the instruction bridges
    Then it reports that bridge with kind `none` and status `missing`
    And it reports an `instructions-missing` problem naming `CLAUDE.md`

  @behavior
  Scenario: reports a bridge overwritten with real content as unbridged
    Given a `CLAUDE.md` holding instructions of its own and naming `AGENTS.md` nowhere
    When the command diagnoses the instruction bridges
    Then it reports that bridge with kind `file` and status `unbridged`
    And it reports an `instructions-unbridged` problem naming `CLAUDE.md`

  @behavior
  Scenario: checks one bridge per nested AGENTS.md, and none where there is no AGENTS.md
    Given a repository holding a root `AGENTS.md` and a nested `AGENTS.md` in one subdirectory
    And a further subdirectory holding no `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports one bridge for the root and one for the nested directory
    And it reports no bridge for the directory holding no `AGENTS.md`

  @behavior
  Scenario: ignores AGENTS.md under a dot-directory or node_modules
    Given a repository holding an `AGENTS.md` under a dot-directory and another under `node_modules`
    When the command diagnoses the instruction bridges
    Then it reports no bridge for either directory

  @behavior
  Scenario: reports a repository with no AGENTS.md once, and checks no bridge into it
    Given a repository with no root `AGENTS.md` and a harness that bridges into one
    When the command diagnoses the instruction bridges
    Then it reports exactly one `no-instructions` problem
    And it reports no bridge into the absent file

  @behavior
  Scenario: reads a directory it cannot list as holding nothing
    Given a directory the command cannot list
    When the command looks for `AGENTS.md` files below it
    Then it reads that directory as holding none rather than failing the run

  # ── the settings-entry bridge ──

  @behavior
  Scenario: is checked only for the harnesses this repository enables
    Given a repository that does not enable the harness whose bridge is a settings entry
    When the command diagnoses the instruction bridges
    Then it reports no bridge for that harness

  @behavior
  Scenario: accepts AGENTS.md in context.fileName beside the harness default
    Given a settings file whose `context.fileName` array holds `AGENTS.md` alongside the harness default
    When the command diagnoses the instruction bridges
    Then it reports that bridge with kind `settings-entry` and status `ok`

  @behavior
  Scenario: keeps a settings entry ok when the file it names does not exist
    Given a repository with no root `AGENTS.md`
    And a settings file whose `context.fileName` array holds `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports that bridge with status `ok`
    And it reports `no-instructions` once for the repository rather than again per bridge

  @behavior
  Scenario: accepts a settings file carrying comments
    Given a settings file carrying line and block comments around a `context.fileName` array holding `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports that bridge with status `ok`

  @behavior
  Scenario: reports a settings file another tool rewrote without the entry
    Given a settings file that parses and whose `context.fileName` array does not hold `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports that bridge with status `unbridged`
    And it reports an `instructions-unbridged` problem naming the settings file

  @behavior
  Scenario: reads a missing key, a missing file, and unparsable JSON without throwing
    Given a settings file holding no `context` key
    When the command diagnoses the instruction bridges
    Then it reports that bridge with status `unbridged`
    And an absent settings file is reported with status `missing`
    And a settings file that does not parse is reported with status `unreadable`

  # ── a harness set with no instruction bridge ──

  @behavior
  Scenario: reports nothing at all, not even a missing AGENTS.md
    Given a repository with no root `AGENTS.md` and no selected harness that bridges into one
    When the command diagnoses the instruction bridges
    Then it reports no instruction bridge
    And it reports no problem

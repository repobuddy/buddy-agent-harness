Feature: Report whether every enabled harness can still read AGENTS.md

  # ── the AGENTS.md shadow ──

  @behavior
  Scenario: reports nothing where no shadowing file exists
    Given a repository with a root `AGENTS.md` and no file a harness would read instead of it
    When the command diagnoses the instruction bridges
    Then it reports no instruction row
    And it reports no problem

  @behavior
  Scenario: reports a file carrying its own content as shadowing
    Given a repository with a root `AGENTS.md` and a `CLAUDE.md` holding instructions of its own
    When the command diagnoses the instruction bridges
    Then it reports that file with kind `file` and status `shadowing`
    And it reports an `instructions-shadowing` problem naming `CLAUDE.md`

  @behavior
  Scenario: reports a file whose body is the import as superseded rather than shadowing
    Given a `CLAUDE.md` whose body is the `AGENTS.md` import
    When the command diagnoses the instruction bridges
    Then it reports that file with kind `import` and status `superseded`
    And it reports an `instructions-superseded` problem naming `CLAUDE.md`

  @behavior
  Scenario: reads an import carrying harness-specific notes below it as superseded
    Given a `CLAUDE.md` holding the `AGENTS.md` import on a line of its own and harness-specific notes below it
    When the command diagnoses the instruction bridges
    Then it reports that file with status `superseded`

  @behavior
  Scenario: separates a symlink to AGENTS.md from one pointing elsewhere
    Given a `CLAUDE.md` that is a symlink to `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports that file with kind `symlink` and status `superseded`
    And a `CLAUDE.md` symlinked to any other file is reported with status `shadowing`

  @behavior
  Scenario: checks every filename the harness would read instead of AGENTS.md
    Given a repository holding a `.claude/CLAUDE.md` and a `CLAUDE.local.md` beside the root `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports each of them, and each as shadowing

  @behavior
  Scenario: checks each directory holding an AGENTS.md, and none without one
    Given a nested `AGENTS.md` with a `CLAUDE.md` beside it
    And a further subdirectory holding a `CLAUDE.md` and no `AGENTS.md`
    When the command diagnoses the instruction bridges
    Then it reports the nested file as shadowing
    And it reports nothing for the directory holding no `AGENTS.md`

  @behavior
  Scenario: ignores AGENTS.md under a dot-directory or node_modules
    Given a repository holding an `AGENTS.md` under a dot-directory and another under `node_modules`
    When the command diagnoses the instruction bridges
    Then it reports nothing for either directory

  @behavior
  Scenario: reports the missing AGENTS.md rather than the file standing in for it
    Given a repository with no root `AGENTS.md` and a `CLAUDE.md` holding instructions of its own
    When the command diagnoses the instruction bridges
    Then it reports exactly one `no-instructions` problem
    And it reports no shadow row for that file

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

  # ── a harness set with no instruction bridge and nothing shadowing AGENTS.md ──

  @behavior
  Scenario: reports nothing at all, not even a missing AGENTS.md
    Given a repository with no root `AGENTS.md`, no selected harness that bridges into one, and no file any of them would read instead
    When the command diagnoses the instruction bridges
    Then it reports no instruction row
    And it reports no problem

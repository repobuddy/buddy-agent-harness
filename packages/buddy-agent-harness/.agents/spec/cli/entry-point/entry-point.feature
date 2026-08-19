@frozen
Feature: Reach a command without going through the process

  # ── run(argv) ──

  @behavior
  Scenario: takes the whole argv, so a caller composes one instead of splicing the global
    Given an argv whose first two entries are the executable and the script
    And a subcommand name after them
    When the entry point is called with that argv
    Then the named subcommand runs
    And `process.argv` is unchanged

  @behavior
  Scenario: builds the application per call, so one invocation cannot leak into the next
    Given the entry point is called twice in one process
    When both calls have returned
    Then a fresh application was built for each call

  @behavior
  Scenario: returns 0 when the command did what was asked
    Given a registered command that returns nothing
    When the entry point is called for that command
    Then it returns 0

  @behavior
  Scenario: returns the code the command reported
    Given a registered command that reports a failure with the code 1
    When the entry point is called for that command
    Then it returns 1

  @behavior
  Scenario: keeps the exit code at 0 when the diagnosis found problems
    Given a repository whose configuration carries a fault
    When the entry point is called for the `doctor` command
    Then it returns 0

  @behavior
  Scenario: reports the version the package manifest carries
    Given the package manifest records a version
    When the entry point is called with `--version`
    Then the version printed is the one the manifest records
    And it returns 0

  @behavior
  Scenario: writes the failure to stderr, not to the stream the report is parsed from
    Given parsing the argv throws an `Error` carrying a message
    When the entry point is called
    Then that message is written to `stderr`
    And nothing is written to `stdout`

  @behavior
  Scenario: still reports a failure it cannot read a message from
    Given parsing the argv throws something that is not an `Error`
    When the entry point is called
    Then a failure naming an invalid command is written to `stderr`

  @behavior
  Scenario: returns 0 when clibuilder rejected the invocation and recorded the code itself
    Given an argv carrying an option no command declares
    When the entry point is called with it
    Then it returns 0
    And clibuilder has written the usage code to `process.exitCode` itself

  @behavior
  Scenario: returns the usage code when the invocation could not be parsed
    Given parsing the argv throws
    When the entry point is called
    Then it returns 2

  # ── the process boundary ──

  @behavior
  Scenario: writes process.exitCode nowhere but bin, the launchers, and the renderer that emits them
    Given the sources the package ships
    When they are searched for a write to `process.exitCode`
    Then only `bin/buddy-agent-harness.mjs`, the generated launchers, and the renderer whose template emits them hold one

  @behavior
  Scenario: neither reads process.argv nor writes process.exitCode
    Given the entry point's own module
    When its source is read
    Then it holds no reference to `process.argv`
    And it holds no write to `process.exitCode`

  @behavior
  Scenario: applies a reported failure to the process
    Given the entry point returns a non-zero code
    When the executable has run
    Then `process.exitCode` holds that code

  @behavior
  Scenario: leaves a usage code clibuilder recorded on the process alone
    Given an argv carrying an option no command declares
    When the executable has run
    Then `process.exitCode` holds the usage code
    And the zero the entry point returned did not overwrite it

  # ── the skill launchers ──

  @behavior
  Scenario: builds its argv with the subcommand inserted, mutating nothing
    Given a generated launcher for a subcommand
    When its source is read
    Then it composes an argv holding that subcommand
    And it does not splice `process.argv`

  @behavior
  Scenario: calls the entry point instead of importing the executable for its side effect
    Given a generated launcher for a subcommand
    When its source is read
    Then it imports the entry point
    And it does not import `bin/buddy-agent-harness.mjs`

  @behavior
  Scenario: generates every shipped launcher, so no skill hand-rolls a second call form
    Given every launcher a shipped skill carries
    When the skill generator is run in check mode
    Then no launcher is reported stale
    And every launcher the generator wrote is a target it checks

  # ── the reachable surface ──

  @behavior
  Scenario: exports run, and does not export the application object
    Given the package's public entry point
    When its exports are read
    Then `run` is among them
    And no `clibuilder` application object is

  @behavior
  Scenario: exports the report builder, so the report is reachable as a value
    Given the package's public entry point
    When its exports are read
    Then the `doctor` report builder is among them

  @behavior
  Scenario: carries the healthy sentence through the export, not an empty list
    Given a diagnosis that found nothing wrong
    When the exported report builder is called with it
    Then `findings` is the healthy sentence
    And it is not an empty list

  @behavior
  Scenario: leaves the sections that do not apply absent through the export, not empty
    Given a diagnosis with nothing diverged and nothing to repair
    When the exported report builder is called with it
    Then the report has no `divergence` key
    And it has no `help` key

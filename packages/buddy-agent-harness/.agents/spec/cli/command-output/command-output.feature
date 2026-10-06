@frozen
Feature: Encode a command's result as the bytes on stdout

  # ── a command writing its result ──

  @behavior
  Scenario: refuses an unsupported format as a usage error
    Given a command line naming a format outside `toon`, `json`, and `text`
    When the command is invoked
    Then clibuilder rejects it with exit code 2 before the command runs
    And no report is written, only the usage text

  # ── a command naming the binary that ran ──

  @behavior
  Scenario: collapses the home directory
    Given an executable path under the user's home directory
    When the path is prepared for the report
    Then the home directory is replaced by `~`
    And the rest of the path is unchanged

  @behavior
  Scenario: leaves a path outside the home directory alone
    Given an executable path outside the user's home directory
    When the path is prepared for the report
    Then it is reported as it is
    And a run with no home directory to collapse is reported the same way

  @behavior
  Scenario: falls back to the package name when the executable is unknown
    Given a run whose executable path is not known
    When the path is prepared for the report
    Then the package name stands in for it
    And the field is not left empty

  @behavior
  Scenario: collapses the home directory out of any path, not only the executable
    Given a path under the user's home directory that is not an executable
    When the path is prepared for a report
    Then the home directory is replaced by `~`
    And a path outside it, and a run with no home directory, are left alone

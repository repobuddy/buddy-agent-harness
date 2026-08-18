Feature: Report every doctor finding through one output shape

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: diagnoses the working directory in TOON by default
    Given a command line naming neither a root nor a format
    When the command runs
    Then it diagnoses the current directory
    And it writes the report to stdout encoded as TOON

  @behavior
  Scenario: passes an explicit root and the requested harnesses through
    Given a command line naming a root and a comma-separated list of harnesses
    When the command runs
    Then it diagnoses that root
    And it checks the named harnesses in addition to the defaults

  @behavior
  Scenario: reports an invalid format, an unsupported harness, and a failed diagnosis
    Given a command line naming a format the command does not support
    When the command runs
    Then it writes the reason to stderr and exits 1
    And a harness name the registry does not carry is rejected the same way
    And a diagnosis that throws is reported the same way

  @behavior
  Scenario: states the healthy answer outright rather than leaving findings empty
    Given a repository in which nothing is wrong
    When the command builds its report
    Then `findings` holds a sentence stating that zero problems were found
    And that sentence states how many bridges resolve
    And no `help` section is present

  @behavior
  Scenario: counts the instruction bridges alongside the skills bridges
    Given a healthy repository holding both skills bridges and instruction bridges
    When the command builds its report
    Then the count in the healthy sentence covers both sections
    And a single bridge is worded in the singular

  @behavior
  Scenario: moves each repair into help and keeps findings to the diagnosis and its name
    Given a repository holding findings from more than one family
    When the command builds its report
    Then each `findings` row holds a path, a problem name, and a detail, and no repair
    And every repair appears in the `help` section instead
    And two findings sharing one repair state it once

  @behavior
  Scenario: adds a divergence section only when a bridge has diverged
    Given a report in which a bridge has diverged
    When the command builds its report
    Then it holds a `divergence` section naming that bridge and its direction
    And a report with no diverged bridge holds no `divergence` section at all

  @behavior
  Scenario: encodes the report in the requested format and nothing else
    Given a report and each of the three supported formats in turn
    When the report is written
    Then it is encoded as TOON, as JSON, and as an aligned text rendering respectively

  @behavior
  Scenario: exits 0 whether or not it found something
    Given a repository in which nothing is wrong
    When the command runs
    Then it exits 0
    And it also exits 0 for a repository holding findings

  @behavior
  Scenario: names the executable that produced the report, with the home directory collapsed
    Given an executable path inside the user's home directory
    When the command builds its report
    Then `bin` names that path with the home directory collapsed to `~`
    And a path outside the home directory is left alone
    And an unknown executable falls back to the package name

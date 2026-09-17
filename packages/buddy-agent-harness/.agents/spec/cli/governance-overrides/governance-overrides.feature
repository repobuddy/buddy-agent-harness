Feature: Resolve a governance through the override layers

  # ── governance list ──

  @behavior
  Scenario: names every layer in lookup order
    Given a repository and no override anywhere
    When the command lists the governances
    Then the report names the project, user, managed, and package layers
    And it names them in that order

  @behavior
  Scenario: reports each governance at the layer that would win
    Given one name held by two layers
    When the command lists the governances
    Then the name is reported once, at the layer the lookup order reaches first

  @behavior
  Scenario: sorts the names rather than reporting them in layer order
    Given names that fall in a different order by layer than by name
    When the command lists the governances
    Then they are reported sorted by name

  @behavior
  Scenario: counts only Markdown files as governances
    Given a layer holding a document, a file with another extension, and a directory named like a document
    When the command lists the governances
    Then only the document is reported

  @behavior
  Scenario: leaves the package layer out when only overrides were asked for
    Given a run restricted to overrides
    When the command lists the governances
    Then the report names only the project, user, and managed layers

  @behavior
  Scenario: states the zero outright rather than leaving the section empty
    Given no layer holds a governance
    When the command lists the governances
    Then the section holds a sentence stating that zero were found
    And the command exits 0

  @behavior
  Scenario: collapses the home directory out of the reported paths
    Given a layer under the user's home directory
    When the command lists the governances
    Then that path is reported with the home directory replaced by `~`
    And no reported path carries the home directory in full

  @behavior
  Scenario: rejects an unsupported output format rather than falling back
    Given a command line naming a format the command does not support
    When the command lists the governances
    Then it writes the reason to stderr and exits non-zero
    And it writes nothing to stdout

  @behavior
  Scenario: resolves the project layer against the working directory when no root is named
    Given a command line naming no root
    When the command lists the governances
    Then the project layer is the canonical governances directory of the current directory

  @behavior
  Scenario: reports a failure it cannot read a message from
    Given a listing that fails with something that is not an error
    When the command lists the governances
    Then it writes a stated reason to stderr and exits non-zero

  # ── governance show ──

  @behavior
  Scenario: writes the document itself, and nothing else, by default
    Given a governance held by a layer
    When the command shows it without naming a format
    Then the document is written to stdout exactly as it was read
    And nothing else is written to that stream

  @behavior
  Scenario: ends the document with a newline even when the file does not
    Given a governance whose file does not end in a newline
    When the command shows it
    Then the stream ends on a newline

  @behavior
  Scenario: wraps the document with the layer it came from when asked for a machine format
    Given a governance held by a layer
    When the command shows it as JSON
    Then the result holds the name, the layer, the path, and the content

  @behavior
  Scenario: stops at the first layer that holds the name
    Given the same name held by two layers
    When the command shows it
    Then the content and the layer are the first layer's
    And the later layer is not read

  @behavior
  Scenario: falls through to a later layer
    Given a name held by a later layer and not by an earlier one
    When the command shows it
    Then the content and the layer are the later layer's

  @behavior
  Scenario: passes over an entry it cannot read and asks the next layer
    Given an earlier layer holding an entry under that name that is not a readable document
    When the command shows it
    Then the next layer answers instead
    And the run does not fail

  @behavior
  Scenario: exits non-zero, writing nothing to stdout, when no override layer holds the name
    Given a run restricted to overrides and no override for that name
    When the command shows it
    Then nothing is written to stdout
    And the reason is written to stderr and the command exits non-zero

  @behavior
  Scenario: exits non-zero when no layer at all holds the name
    Given no layer holds that name
    When the command shows it
    Then nothing is written to stdout
    And the reason is written to stderr and the command exits non-zero

  @behavior
  Scenario: rejects a name that is a path rather than reading outside the layer
    Given a name holding a path separator, a parent-directory segment, or a `.md` suffix
    When the command shows it
    Then it writes to stderr what a governance name is and exits non-zero
    And it reads no file

  @behavior
  Scenario: rejects an unsupported output format rather than falling back
    Given a command line naming a format the command does not support
    When the command shows a governance
    Then it writes the reason to stderr and exits non-zero
    And it writes nothing to stdout

  @behavior
  Scenario: reports a failure it cannot read a message from
    Given a lookup that fails with something that is not an error
    When the command shows a governance
    Then it writes a stated reason to stderr and exits non-zero

  # ── the project layer, at init and at doctor ──

  @behavior
  Scenario: creates the project override layer and reports what it holds
    Given a repository with no project governances directory
    When the agent runs `buddy-agent-harness init`
    Then the repository contains `.agents/governances`
    And the result states how many documents it holds

  @behavior
  Scenario: reports the overrides the layers hold without turning any of them into a finding
    Given a repository holding a project override
    When the agent runs `buddy-agent-harness doctor`
    Then the report holds a `governances` section naming that override and its layer
    And the override is not reported as a finding

  @behavior
  Scenario: names the layer rather than the path
    Given a repository holding a project override
    When the agent runs `buddy-agent-harness doctor`
    Then each row names the governance and the layer it came from
    And no row carries the directory it was read from

  @behavior
  Scenario: states the zero outright when no layer holds an override
    Given no override at project, user, or machine scope
    When the agent runs `buddy-agent-harness doctor`
    Then the `governances` section holds a sentence stating that zero were found

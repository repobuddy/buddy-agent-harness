@frozen
Feature: Encode a command's result as the bytes on stdout

  # ── a command writing its result ──

  @behavior
  Scenario: accepts every supported format
    Given a command holding a result to write
    When the requested format is `toon`, `json`, or `text`
    Then that format is used to encode the result

  @behavior
  Scenario: rejects anything else rather than falling back silently
    Given a command holding a result to write
    When the requested format is a value outside that set, or no value at all
    Then the encoding fails rather than falling back to the default
    And the failure names the three formats it accepts

  @behavior
  Scenario: encodes TOON, JSON, and text on stdout
    Given one result object
    When it is written in each format in turn
    Then each encoding is written to stdout followed by one newline
    And nothing else is written to that stream

  @behavior
  Scenario: aligns a list of records into a table under its key
    Given a result whose key holds a list of records
    When it is rendered as text
    Then the key is followed by a header row and one row per record
    And every column is padded to its widest cell

  @behavior
  Scenario: leaves a cell blank where a record is missing that column
    Given a list of records in which one record lacks a key its neighbour carries
    When it is rendered as text
    Then the column is present for every row
    And the record that lacks it carries a blank cell rather than a shifted row

  @behavior
  Scenario: bullets a list of primitives and marks an empty one
    Given a result holding a list of strings under one key and an empty list under another
    When it is rendered as text
    Then each string is written as its own bulleted line
    And the empty list is stated outright rather than left as a bare key

  @behavior
  Scenario: renders scalars as key and value, and a nested object as JSON
    Given a result holding a number, a boolean, and a nested record
    When it is rendered as text
    Then each scalar is written as its key and its value
    And the nested record is written as JSON rather than as an invented layout

  @behavior
  Scenario: separates a multi-line block from its neighbours but keeps scalars together
    Given a result whose middle key renders as more than one line and whose neighbours are scalars
    When it is rendered as text
    Then a blank line separates the multi-line block from each neighbour
    And two scalars beside each other are not separated

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

@frozen
Feature: Offer the reference command with this package as a plugin

  @behavior
  Scenario: offers the subcommands cyber-agentkit 2.0 defines and none it retired
    When the caller runs `buddy-agent-harness reference --help`
    Then the subcommands include `load`, `list`, `search`, `where`, `create`, `customize`, `delete`, `implementations`, and `check`
    And no subcommand is `show` or `select`

  @behavior
  Scenario Outline: answers in text by default for the subcommands that print a document or a file
    When the caller runs `reference <subcommand>` with no `--format`
    Then the answer is in `text`

    Examples:
      | subcommand |
      | load       |
      | create     |
      | delete     |

  @behavior
  Scenario: answers in toon by default for every other subcommand
    When the caller runs `reference list` with no `--format`
    Then the answer is in `toon`

  @behavior
  Scenario: answers in the format asked
    When the caller runs `reference load` with `--format=json`
    Then the answer is in `json`

  @behavior
  Scenario: reads this package's own references as the plugin buddy-agent-harness
    When the layers are built
    Then the first plugin layer is this package's `references/` folder, named `buddy-agent-harness`

  @behavior
  Scenario: names only the current spelling
    When the docs, the spec, and `llms.txt` are read
    Then each names the current spelling: `reference load`, `reference customize --extends`, `--in <folder>`, and `patch`

Feature: Route reference work, and create references under the naming rule

  @trigger
  Scenario Outline: activates on a request to create a reference
    Given the request "<request>"
    When the agent chooses a skill
    Then the `reference` skill is <activated>

    Examples:
      | request                                                          | activated     |
      | Add our API style guide as a reference agents can load           | activated     |
      | My plugin should ship a work-hierarchy reference                 | activated     |
      | Override the testing reference from the acme plugin for this repo | activated     |
      | Which references are there about releases?                       | activated     |
      | Add a section on testing to AGENTS.md                            | not activated |
      | Create a new skill that lints commit messages                    | not activated |

  @behavior
  Scenario: prefixes a reference a plugin ships with the plugin's name
    Given a plugin named `cyber-asana` and a request to ship a `work-hierarchy` reference with it
    When the agent runs the `reference` skill
    Then the proposed file is `references/cyber-asana.work-hierarchy.md` in the plugin, named `<plugin name>.<reference>.md`
    And no file named `work-hierarchy.md` is proposed

  @behavior
  Scenario: writes a project reference unprefixed in .agents/references
    Given a request to add a `testing` reference for this repository, and no reference named `testing`
    When the agent runs the `reference` skill
    Then the proposed file is `.agents/references/testing.md` at the repository root
    And it carries a `description` in its frontmatter

  @behavior
  Scenario: redirects to a skill when nothing would name the reference
    Given a request for guidance the agent must apply on its own whenever a task matches it
    When the agent runs the `reference` skill
    Then the agent says it belongs in a skill rather than a reference
    And no reference file is written

  @behavior
  Scenario: does not create over a name that already resolves
    Given a request to create a `testing` reference, and `show testing` resolving to a plugin's copy
    When the agent runs the `reference` skill
    Then the agent offers another name or an update
    And no new `testing.md` is written without that choice

  @behavior
  Scenario: updates the repository's own reference in place
    Given a request to update the `testing` reference, and `show testing --trace` using the repository's `.agents/references/testing.md`
    When the agent runs the `reference` skill
    Then the proposed change edits `.agents/references/testing.md`
    And no second copy of `testing` is written

  @behavior
  Scenario: warns that an override replaces every plugin's copy
    Given a request to override `acme`'s `work-hierarchy`, and plugins `acme` and `beta` both holding `work-hierarchy`
    When the agent runs the `reference` skill
    Then the agent tells the user that the override also replaces `beta`'s copy, before writing anything

  @behavior
  Scenario: says nothing matched rather than guessing a name
    Given a request for a reference about deployments, and `search` matching nothing
    When the agent runs the `reference` skill
    Then the report says nothing matched
    And no reference name is offered as if it existed

  @behavior
  Scenario: explains a resolution from show --trace
    Given a question about why `testing` does not show the user's own copy
    When the agent runs the `reference` skill
    Then the agent runs `show testing --trace`
    And the report names the layer used and why the user's copy was shadowed or not read

  @behavior
  Scenario: routes a skill author to load-reference
    Given a request to make a skill load the `testing` reference
    When the agent runs the `reference` skill
    Then the agent proposes the caller line from the `load-reference` skill's `README.md`
    And the skill is not told to run the `reference` command itself

  @behavior
  Scenario: writes nothing without approval
    Given a request to create or update a reference
    When the agent runs the `reference` skill
    Then the file and its path are shown before it is written
    And nothing is written until the user approves

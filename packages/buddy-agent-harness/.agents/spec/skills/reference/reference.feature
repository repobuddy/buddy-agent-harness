Feature: Route reference work, and create references under the naming rule

  # ── routing ──

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
      | Load `testing` with the `reference` skill in the `buddy-agent-harness` plugin | activated |
      | Add a section on testing to AGENTS.md                            | not activated |
      | Create a new skill that lints commit messages                    | not activated |

  # ── create ──

  @behavior
  Scenario: prefixes a reference a plugin ships with the plugin's name
    Given a plugin named `cyber-asana` and a request to ship a `work-hierarchy` reference with it
    When the agent runs the `reference` skill
    Then the proposed file is `references/cyber-asana.work-hierarchy.md` in the plugin, named `<plugin name>.<reference>.md`
    And no file named `work-hierarchy.md` is proposed
    And `reference create` is not run for the plugin's file

  @behavior
  Scenario: writes a project reference unprefixed in .agents/references
    Given a request to add a `testing` reference for this repository, and no reference named `testing`
    When the agent runs the `reference` skill
    Then the proposed file is `.agents/references/testing.md` at the repository root
    And it carries a `description` in its frontmatter

  @behavior
  Scenario: creates a user reference with --scope user
    Given a request to add a `code-review` reference the user wants in every repository, and no reference named `code-review`
    When the agent runs the `reference` skill
    Then the agent runs `reference create code-review` with `--scope user` and `--dry-run`
    And no file is proposed under the repository's `.agents/references/`

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
  Scenario: shows the dry run before running create
    Given a request to add a `migrations` reference for this repository, and no reference named `migrations`
    When the agent runs the `reference` skill
    Then `reference create migrations --dry-run` runs before any `reference create migrations` without `--dry-run`
    And the path and content the dry run reported are shown to the user before the second command runs
    And the repository's `.agents/references/migrations.md` is not written by any other means

  @behavior
  Scenario: passes a calling plugin's template to create
    Given the `ledgerkit` plugin's skill asking for a project reference `release-policy`, started from its file `templates/release-policy.md`
    When the agent runs the `reference` skill
    Then both the dry run and the write pass `--template` naming that file

  @behavior
  Scenario: writes a new reference with no one-hash title
    Given a request to add a `deploys` reference from the user's draft, which starts with `# Deploying` and has `## Rollback` and `## Staging` under it
    When the agent runs the `reference` skill
    Then the content shown to the user has no heading with a single `#`
    And `Rollback` and `Staging` are top-level `##` sections

  @behavior
  Scenario: keeps extra frontmatter keys and says where they come back
    Given a request to add a `oncall` reference whose draft frontmatter holds `description` and an `owner` key
    When the agent runs the `reference` skill
    Then the content shown to the user keeps the `owner` key
    And the agent says the key comes back under `metadata` in `show --format json`

  @behavior
  Scenario: reports a refusal from create and writes nothing by hand
    Given a request to add a `pager` reference from the `ledgerkit` plugin's template, and the dry run refusing because that template's frontmatter is not a YAML mapping
    When the agent runs the `reference` skill
    Then the agent reports the refusal's reason
    And no `pager.md` is written under `.agents/references/`, `~/.agents/references/`, or anywhere else

  # ── update ──

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
  Scenario: starts an override with create, holding only the changed sections
    Given a request to change only the `## Commit messages` section of the `style` reference, which only the plugin `acme` holds and which has four `##` sections
    When the agent runs the `reference` skill
    Then the agent runs `reference create style --dry-run` with a `--template` whose only `##` heading is `## Commit messages`
    And the dry-run content shown to the user carries `merge: merge-sections`

  # ── find and inspect ──

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
  Scenario: reports where a copy can live without writing one
    Given a question about where the agent looks for `testing` and where to put a copy that overrides it
    When the agent runs the `reference` skill
    Then the agent runs `where testing`
    And the report gives the slots in order, which one is used, and the project and user files the user can write, with who each applies to and the merge note
    And no file is written

  # ── wire a skill ──

  @behavior
  Scenario: gives a skill author the caller line
    Given a request to make a skill load the `testing` reference
    When the agent runs the `reference` skill
    Then the agent proposes the caller line from the `reference` skill's `README.md`, naming `testing`
    And the skill is not told to run the `reference` command itself

  # ── every write ──

  @behavior
  Scenario: writes nothing without approval
    Given a request to create or update a reference
    When the agent runs the `reference` skill
    Then the file and its path are shown before it is written
    And neither `reference create` without `--dry-run` nor a direct write runs until the user approves

  @quality
  Scenario: validates a created reference's headings before reporting done
    Given the shipped `reference` skill's `SKILL.md`
    When its `## Validate` section is read
    Then it asserts that a created reference holds no heading with a single `#`
    And it asserts that every `##` heading of a `merge-sections` override matches a heading path in the copy below it

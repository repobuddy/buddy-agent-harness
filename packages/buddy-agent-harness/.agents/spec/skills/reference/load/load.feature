@frozen
Feature: Load references for a skill through the bundled reference command

  # ── loading ──

  @behavior
  Scenario: loads a reference by running the launcher bundled in the skill folder
    Given a caller line naming `testing`, and the repository's `.agents/references/testing.md`
    When the agent runs the `reference` skill in Load mode
    Then the agent runs `scripts/reference.mjs` from the `reference` skill's own folder with `show testing`
    And the document the command prints is the one the agent uses

  @behavior
  Scenario: loads several references in one run, in the order named
    Given a caller line naming `testing` then `release-checklist`, both held by the repository
    When the agent runs the `reference` skill in Load mode
    Then the launcher is run once, with `show testing release-checklist` in that order
    And both documents are loaded

  @behavior
  Scenario: passes the repository as the root so a project override applies
    Given a caller line naming `testing`, a plugin copy of `testing`, and the repository's own `.agents/references/testing.md`
    When the agent runs the `reference` skill in Load mode from a working directory inside the repository
    Then the launcher is run with `--root` naming the repository root
    And the repository's document is the one loaded

  @behavior
  Scenario: never reaches the network or a package runner
    Given a caller line naming `testing`
    When the agent runs the `reference` skill in Load mode
    Then no `npx`, `pnpm dlx`, `upx`, or package download is run
    And the only command run to load `testing` is the launcher

  @behavior
  Scenario: reads no tier folder itself
    Given a caller line naming `testing`, and a command run that printed `testing`
    When the agent runs the `reference` skill in Load mode
    Then no file under `.agents/references/`, `.agents/governances/`, `~/.agents/`, or a plugin's `references/` is read by the agent

  @behavior
  Scenario: follows the loaded documents as the caller's instructions
    Given a caller line naming `style` then `release-checklist`, and a command run that printed both
    When the agent continues the caller's work
    Then both documents are applied as part of the caller's instructions

  @behavior
  Scenario: says nothing about the load when every name came from the command
    Given a caller line naming `testing` and `style`, and a command run that printed both
    When the agent runs the `reference` skill in Load mode
    Then the report says nothing about how `testing` or `style` was loaded

  @behavior
  Scenario: drops a name rejected as a path and loads the rest
    Given a caller line naming `testing` and `../notes/x.md`, the repository holding `testing`, and a command run that rejects `../notes/x.md` as a file
    When the agent runs the `reference` skill in Load mode
    Then the report names `../notes/x.md` as rejected
    And no file at `../notes/x.md` and no caller copy of it is read
    And the launcher is run again with `show testing`, and `testing` is loaded from that run

  # ── missing and ambiguous ──

  @behavior
  Scenario: reads the caller's copy of a name the command reports missing
    Given a caller line naming `testing` and `style`, a command run that prints `testing` and reports `style` missing, and a caller folder holding `references/style.md`
    When the agent runs the `reference` skill in Load mode
    Then `testing` is loaded from the command's output
    And `style` is loaded from the caller's `references/style.md`
    And the report says `style` came from the caller's copy

  @behavior
  Scenario: prefers the caller's references folder over its legacy governances folder
    Given a caller line naming `style`, a command run that reports `style` missing, and a caller folder holding a `references/style.md` and a `references/governances/style.md` that differ
    When the agent runs the `reference` skill in Load mode
    Then `style` is loaded from `references/style.md`
    And `references/governances/style.md` is not read

  @behavior
  Scenario: reports a name missing everywhere and still uses the rest
    Given a caller line naming `testing` and `style`, a command run that prints `testing` and reports `style` missing, and a caller with no copy of `style`
    When the agent runs the `reference` skill in Load mode
    Then `testing` is loaded
    And the report names `style` as not loaded
    And no document is invented or searched for in its place
    And the agent continues the caller's work without `style`

  @behavior
  Scenario: reports an ambiguous name with both plugins and loads neither
    Given a caller line naming `testing`, a command run that reports `testing` ambiguous between `alpha/testing` and `beta/testing`, and a caller folder holding `references/testing.md`
    When the agent runs the `reference` skill in Load mode
    Then the report names `alpha/testing` and `beta/testing`
    And neither plugin's document nor the caller's copy is loaded for `testing`

  # ── the command does not run ──

  @behavior
  Scenario: reads the caller's copies when the command cannot run
    Given a `reference` skill folder with no `scripts/reference.mjs`, and a caller folder holding `references/testing.md` and `references/governances/style.md`
    When the agent runs the `reference` skill in Load mode for `testing` and `style`
    Then `testing` is loaded from `references/testing.md`
    And `style` is loaded from `references/governances/style.md`
    And no `npx`, `pnpm dlx`, `upx`, or package download is run

  @behavior
  Scenario: says the command did not run and that no override applied
    Given a `reference` skill folder with no `scripts/reference.mjs`, a caller folder holding `references/testing.md`, and the repository's own `.agents/references/testing.md`, which differs from the caller's copy
    When the agent runs the `reference` skill in Load mode for `testing`
    Then `testing` is loaded from the caller's copy, and no file under `.agents/references/` is read
    And the report says the reference command did not run, and why
    And the report says `testing` came from the caller's copy, so no project or user override applied

  @behavior
  Scenario: reports a name with no copy as not loaded when the command cannot run
    Given a `reference` skill folder with no `scripts/reference.mjs`, and a caller with no copy of `testing`
    When the agent runs the `reference` skill in Load mode for `testing`
    Then the report names `testing` as not loaded
    And the report says the launcher ships with the npm package, so a plugin installed from git has none

  # ── the caller line ──

  @behavior
  Scenario: ships a caller line naming the skill and the plugin
    Given the shipped `skills/reference/README.md`
    When its caller line is read
    Then the line names the `reference` skill and the `buddy-agent-harness` plugin
    And the line names neither as a slash command

  @behavior
  Scenario: lists how each harness names the skill, generated from agent-harness
    Given the shipped `skills/reference/README.md`
    When its harness table is read
    Then it has one row per harness `@cyberuni/agent-harness` knows, each giving `skillInvocation`'s text for the `reference` skill of the `buddy-agent-harness` plugin, or none where it records no typed form
    And the row says whether that form names the plugin
    And regenerating the table from `@cyberuni/agent-harness` changes nothing

  @behavior
  Scenario: tells the user which plugin to install when the skill is missing
    Given a skill whose instructions carry the caller line shipped in `skills/reference/README.md`, and no `reference` skill installed
    When the agent follows those instructions
    Then the agent tells the user to install the `buddy-agent-harness` plugin

  # ── shipping ──

  @behavior
  Scenario: ships the launcher in the skill folder and runs it with no node_modules
    Given the package packed as `npm publish` would pack it
    When the `reference` skill folder is copied out alone and its `scripts/reference.mjs` is run with `show <name>` against a folder holding `.agents/references/<name>.md`
    Then the document is printed and the launcher exits 0
    And no `node_modules` exists above the copied folder

  @behavior
  Scenario: carries a Validate section checking the four report-and-read rules
    Given the shipped `skills/reference/references/load.md`
    When its `## Validate` section is read
    Then it checks that every name is loaded or reported, that no package runner or download ran, that no tier folder or rejected path was read, and that the report is empty when every name came from the command

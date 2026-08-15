Feature: Initialize local agent skills across coding harnesses

  # ── buddy-agent-harness init ──

  @behavior
  Scenario: creates the canonical directory at the consumer root
    Given a consumer repository has no `.agents/skills` directory
    When the agent runs `buddy-agent-harness init` from that repository
    Then the repository contains `.agents/skills`

  @behavior
  Scenario: initializes the repository root when invoked from a nested package
    Given a monorepo command is invoked from one of its packages
    When the agent runs `buddy-agent-harness init`
    Then the monorepo root contains the canonical directory

  @behavior
  Scenario: preserves user-authored canonical instructions
    Given a consumer repository has user-authored `AGENTS.md` and `.agents/AGENTS.md` files
    When the agent runs `buddy-agent-harness init`
    Then both canonical instruction files remain unchanged

  @behavior
  Scenario: leaves unsupported tool settings canonical only
    Given a consumer repository has a canonical tool setting with no mapping for the active harness
    When the agent runs `buddy-agent-harness init`
    Then the tool setting remains canonical and no vendor conversion is created

  @behavior
  Scenario: configures the active harness by default
    Given Codex is the active harness and a consumer repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init`
    Then Codex contains the canonical `review` skill and the command reports Codex as enabled

  @behavior
  Scenario: configures the active harness and preferred harnesses
    Given Claude Code is the active harness, the user prefers Cursor and Windsurf, and the repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init`
    Then Claude Code, Cursor, and Windsurf contain canonical skills and the command reports each of them as enabled

  @behavior
  Scenario: preflights every conflict before writing initialization output
    Given a consumer repository has conflicting targets for canonical skills across enabled harnesses
    When the agent runs `buddy-agent-harness init` without `--force`
    Then the command reports every conflict and leaves every harness target unchanged

  @behavior
  Scenario: replaces conflicting skill targets when force is requested
    Given a consumer repository has a harness skill target that is not the canonical skill link
    When the agent runs `buddy-agent-harness init --force`
    Then the conflicting target is replaced by the canonical skill

  @behavior
  Scenario: creates relative links for canonical skills
    Given a consumer repository has canonical skill `review` and links are available
    When the agent runs `buddy-agent-harness init` without `--copy`
    Then each enabled harness skill target is a relative link to `review`

  @behavior
  Scenario: copies canonical skills when links cannot be used
    Given a consumer repository has canonical skill `review` and links cannot be created
    When the agent runs `buddy-agent-harness init`
    Then each enabled harness contains a non-link copy of `review`

  @behavior
  Scenario: preserves a target that appears during link fallback
    Given a canonical skill target appears after its link attempt fails
    When the agent runs `buddy-agent-harness init`
    Then the command fails and leaves the appearing target unchanged

  @behavior
  Scenario: scaffolds the canonical directory even when no skills exist
    Given a consumer repository has an empty canonical skills directory
    When the agent runs `buddy-agent-harness init`
    Then the repository contains `.agents/skills` and the command reports the enabled harnesses

  @behavior
  Scenario: records nothing about the run on disk
    Given a consumer repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init`
    Then the command writes no record of the run and reports the enabled harnesses in its output

  @behavior
  Scenario: selects only immediate canonical skill directories in sorted order
    Given a canonical skills directory contains files and skill directories with unsorted names
    When the agent runs `buddy-agent-harness init`
    Then only the immediate skill directories are linked in lexical order and counted

  @behavior
  Scenario: reports the initialization result as TOON by default
    Given a consumer repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init`
    Then the output is TOON naming the enabled harnesses, skill count, root, and requested copy option

  @behavior
  Scenario: reports the requested copy option as JSON
    Given a consumer repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init --format json`
    Then the output is JSON naming the enabled harnesses, skill count, root, and requested copy option

  @behavior
  Scenario: rejects an unsupported output format
    Given a consumer repository has canonical skill `review`
    When the agent runs `buddy-agent-harness init --format yaml`
    Then the command exits with an error that names the supported output formats and writes no initialization artifacts

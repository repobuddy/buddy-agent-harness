Feature: Report agent worktrees a repository leaves unaccounted for

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: reports nothing for a repository that ignores the worktrees and sets the base
    Given a git repository with a `.claude` directory
    And a `.gitignore` containing the line `.claude/worktrees/`
    And a `.claude/settings.json` setting `worktree.baseRef` to `"head"`
    When the command diagnoses the worktrees
    Then it reports no worktree fault

  @behavior
  Scenario: reports nothing where no .claude directory exists
    Given a repository with a `biome.json` and no `.claude` directory
    When the command diagnoses the worktrees
    Then it reports no worktree fault

  @behavior
  Scenario: reports a repository whose .gitignore leaves .claude/worktrees/ tracked
    Given a git repository with a `.claude` directory
    And a `.gitignore` holding no rule that matches `.claude/worktrees/`
    When the command diagnoses the worktrees
    Then it reports a `worktrees-untracked` fault naming `.gitignore`
    And its repair has an empty command
    And its repair instruction names `.claude/worktrees/`

  @behavior
  Scenario: accepts a rule on a parent directory
    Given a git repository with a `.claude` directory
    And a `.gitignore` containing the line `.claude/`
    When the command diagnoses the worktrees
    Then it reports no worktree fault

  @behavior
  Scenario: reports nothing outside a git repository, where no rule can be read
    Given a directory that is not a git repository
    And a `.claude` directory whose settings set `worktree.baseRef` to `"head"`
    When the command diagnoses the worktrees
    Then it reports no worktree fault

  @behavior
  Scenario: reports a biome.json that does not exclude the worktrees
    Given a git repository with a `.claude` directory that ignores the worktrees and sets the base
    And a `biome.json` whose `files.includes` does not mention `.claude/worktrees`
    When the command diagnoses the worktrees
    Then it reports a `worktrees-scanned` fault naming `biome.json`
    And its repair instruction names the `"!**/.claude/worktrees"` entry

  @behavior
  Scenario: reports a biome.jsonc the same way
    Given a git repository with a `.claude` directory that ignores the worktrees and sets the base
    And a `biome.jsonc` that does not mention `.claude/worktrees`
    When the command diagnoses the worktrees
    Then it reports a `worktrees-scanned` fault naming `biome.jsonc`

  @behavior
  Scenario: accepts a biome.json that excludes the worktrees
    Given a git repository with a `.claude` directory that ignores the worktrees and sets the base
    And a `biome.json` whose `files.includes` holds `"!**/.claude/worktrees"`
    When the command diagnoses the worktrees
    Then it reports no worktree fault

  @behavior
  Scenario: reports a .claude directory with no settings file
    Given a git repository with a `.claude` directory and no `.claude/settings.json`
    When the command diagnoses the worktrees
    Then it reports a `worktree-base-unset` fault naming `.claude/settings.json`
    And its repair has an empty command
    And its repair instruction names `"baseRef": "head"`

  @behavior
  Scenario: reports settings that do not parse, since no base is read from them
    Given a git repository with a `.claude/settings.json` that is not valid JSON
    When the command diagnoses the worktrees
    Then it reports a `worktree-base-unset` fault naming `.claude/settings.json`

  @behavior
  Scenario: reports settings that leave worktree.baseRef unset
    Given a git repository with a `.claude/settings.json` whose `worktree` key holds no `baseRef`
    When the command diagnoses the worktrees
    Then it reports a `worktree-base-unset` fault naming `.claude/settings.json`

  @behavior
  Scenario: reports settings with no worktree key
    Given a git repository with a `.claude/settings.json` that has no `worktree` key
    When the command diagnoses the worktrees
    Then it reports a `worktree-base-unset` fault naming `.claude/settings.json`

  @behavior
  Scenario: leaves an explicit "fresh" alone, since it is the owner's choice
    Given a git repository with a `.claude/settings.json` setting `worktree.baseRef` to `"fresh"`
    When the command diagnoses the worktrees
    Then it reports no `worktree-base-unset` fault

  @behavior
  Scenario: reports all three at once
    Given a git repository with a `.claude` directory and an empty `.gitignore`
    And a `biome.json` that does not mention `.claude/worktrees`
    And a `.claude/settings.json` holding no `worktree` key
    When the command diagnoses the worktrees
    Then it reports a `worktrees-untracked` fault, a `worktrees-scanned` fault, and a `worktree-base-unset` fault

  @behavior
  Scenario: carries an empty command and names both skills in every repair
    Given a git repository with all three worktree faults
    When the command diagnoses the worktrees
    Then the runnable command on every finding is empty
    And every repair instruction names the `init-buddy-agent-harness` skill and the `enhance` skill
    And no repair instruction names the `repair` skill

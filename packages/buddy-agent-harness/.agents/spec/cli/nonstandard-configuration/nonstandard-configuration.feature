Feature: Report agent configuration that only one harness can read

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: reports nothing for a repository with no harness-exclusive configuration
    Given a repository with a root `AGENTS.md` and a canonical skill
    When the command diagnoses non-standard configuration
    Then it reports no non-standard artifact

  @behavior
  Scenario: reports an instruction file only one harness reads
    Given a repository with a `.cursorrules` file
    When the command diagnoses non-standard configuration
    Then it reports that file as instruction content and names `AGENTS.md` as where it belongs

  @behavior
  Scenario: reads an always-on rule as instruction content
    Given a repository with a `.mdc` rule whose frontmatter binds it to no paths
    When the command diagnoses non-standard configuration
    Then it reports that rule as instruction content and names `AGENTS.md` as where it belongs

  @behavior
  Scenario: reads a globbed rule as a rule rather than as prose
    Given a repository with a `.mdc` rule whose frontmatter binds it to paths
    When the command diagnoses non-standard configuration
    Then it reports that rule as a rule and names a skill as the form it converts to

  @behavior
  Scenario: reads an empty globs entry as no scoping at all
    Given a repository with a `.mdc` rule whose globs entry carries no value
    When the command diagnoses non-standard configuration
    Then it reports that rule as instruction content

  @behavior
  Scenario: reports a harness command as work a skill would carry everywhere
    Given a repository with a command file under a harness directory
    When the command diagnoses non-standard configuration
    Then it reports that file as a command and names `.agents/skills` as where it belongs

  @behavior
  Scenario: reports a harness-directory skill once, by its SKILL.md
    Given a repository with a skill under a harness directory holding a `SKILL.md` and a script
    When the command diagnoses non-standard configuration
    Then it reports one finding for that skill, at the path of its `SKILL.md`

  @behavior
  Scenario: names no skill for a subagent, because no portable form exists
    Given a repository with a subagent definition under a harness directory
    When the command diagnoses non-standard configuration
    Then it reports that file with no skill named in its repair and no runnable command

  @behavior
  Scenario: reports no harness directory that is a symlink
    Given a repository whose harness skills directory is a symlink into the canonical directory
    When the command diagnoses non-standard configuration
    Then it reports no non-standard artifact

  @behavior
  Scenario: reports no skills projection target
    Given a repository with the skills projection targets `init` writes
    When the command diagnoses non-standard configuration
    Then it reports no non-standard artifact

  @behavior
  Scenario: reports an artifact whose harness the repository never enabled
    Given a repository with a legacy instruction file for a harness it does not enable
    When the command diagnoses non-standard configuration
    Then it reports that file as instruction content

  @behavior
  Scenario: carries the reported path into the repair rather than a placeholder
    Given a repository with a `.cursorrules` file
    When the command diagnoses non-standard configuration
    Then the repair names that path and carries no placeholder

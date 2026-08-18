Feature: Report agent configuration that is present and wrong

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: reports nothing for a repository whose configuration is current
    Given a repository with a root `AGENTS.md` and a canonical skill
    And a `.claude/skills` symlink resolving to `.agents/skills`
    And a `.gitignore` holding no rule that matches a bridge path
    When the command diagnoses the configuration
    Then it reports no configuration fault

  @behavior
  Scenario: reports a projection under a harness name that has been superseded
    Given a repository with a `.windsurf/skills` projection of `.agents/skills`
    And a registry recording `windsurf` as replaced by `devin-desktop`
    When the command diagnoses the configuration
    Then it reports a `deprecated-harness` fault naming `.windsurf/skills`

  @behavior
  Scenario: leaves a superseded harness alone when it has no projection on disk
    Given a repository with a `.windsurf` directory holding no skills projection
    When the command diagnoses the configuration
    Then it reports no `deprecated-harness` fault

  @behavior
  Scenario: reports a bridge a gitignore rule on its parent directory swallows
    Given a git repository with a `.claude/skills` projection of `.agents/skills`
    And a `.gitignore` containing the line `.claude/`
    When the command diagnoses the configuration
    Then it reports an `ignored-bridge` fault naming `.claude/skills`

  @behavior
  Scenario: leaves a tracked bridge alone
    Given a git repository with a `.claude/skills` projection of `.agents/skills`
    And a `.gitignore` holding no rule that matches a bridge path
    When the command diagnoses the configuration
    Then it reports no `ignored-bridge` fault

  @behavior
  Scenario: reports nothing outside a git repository, where no rule can be read
    Given a directory that is not a git repository
    And a `.gitignore` containing the line `.claude/`
    And a `.claude/skills` projection of `.agents/skills`
    When the command diagnoses the configuration
    Then it reports no `ignored-bridge` fault

  @behavior
  Scenario: reports an AGENTS.local.md, which no harness reads
    Given a repository with an `AGENTS.local.md` carrying two setup notes
    When the command diagnoses the configuration
    Then it reports an `unread-local-override` fault naming `AGENTS.local.md`

  @behavior
  Scenario: reports a skill whose description carries an unquoted colon
    Given a canonical skill whose `description` value contains an unquoted colon
    When the command diagnoses the configuration
    Then it reports an `unloadable-skill` fault naming that skill's `SKILL.md`

  @behavior
  Scenario: accepts a description that quotes its colon
    Given a canonical skill whose `description` value is quoted and contains a colon
    When the command diagnoses the configuration
    Then it reports no `unloadable-skill` fault

  @behavior
  Scenario: reports a skill with no description
    Given a canonical skill whose frontmatter carries a `name` and no `description`
    When the command diagnoses the configuration
    Then it reports an `unloadable-skill` fault naming that skill's `SKILL.md`

  @behavior
  Scenario: reports a skill whose description key is present but empty
    Given a canonical skill whose `description` key has an empty value
    When the command diagnoses the configuration
    Then it reports an `unloadable-skill` fault naming that skill's `SKILL.md`

  @behavior
  Scenario: reports a skill with no frontmatter block at all
    Given a canonical `SKILL.md` whose first line is a Markdown heading
    When the command diagnoses the configuration
    Then it reports an `unloadable-skill` fault naming that skill's `SKILL.md`

  @behavior
  Scenario: leaves a name that does not match its directory alone
    Given a canonical skill whose `name` differs from its directory name
    And a `description` in that skill that parses
    When the command diagnoses the configuration
    Then it reports no `unloadable-skill` fault

  @behavior
  Scenario: ignores files under the canonical directory that are not a SKILL.md
    Given a canonical skill carrying a reference file with no frontmatter
    When the command diagnoses the configuration
    Then it reports no `unloadable-skill` fault

  @behavior
  Scenario: names each fault in the report so a caller routes without reading prose
    Given a repository with an `AGENTS.local.md` carrying two setup notes
    When the command diagnoses the configuration
    Then the emitted finding carries the name `unread-local-override`
    And that name is a field of its own, not part of the prose detail

  @behavior
  Scenario: carries the repair for every finding it reports
    Given a repository holding an `AGENTS.local.md` carrying two setup notes
    When the command diagnoses the configuration
    Then every fault it reports carries a non-empty detail
    And every fault it reports carries a repair instruction that is not empty

  @behavior
  Scenario: offers no runnable command for a fault, because correcting one is judgment
    Given a git repository with a `.windsurf/skills` projection of `.agents/skills`
    And an `AGENTS.local.md` carrying two setup notes
    And a canonical skill whose frontmatter carries a `name` and no `description`
    When the command diagnoses the configuration
    Then it reports at least one fault
    And the runnable command on every fault it reports is empty
    And a caller that runs every non-empty command it is handed therefore runs nothing here

  @behavior
  Scenario: carries each repair as a bare imperative, with nothing wrapping it
    Given a repository holding an `AGENTS.local.md` carrying two setup notes
    When the command diagnoses the configuration
    Then the repair instruction reads as an imperative on its own
    And no wrapper such as `Run` precedes it
    And it names the skill that owns the correction

  @behavior
  Scenario: reports every fault it finds in one pass, across families
    Given a git repository with a `.windsurf/skills` projection of `.agents/skills`
    And an `AGENTS.local.md` carrying two setup notes
    And a canonical skill whose frontmatter carries a `name` and no `description`
    When the command diagnoses the configuration
    Then it reports a `deprecated-harness` fault
    And it reports an `unread-local-override` fault
    And it reports an `unloadable-skill` fault

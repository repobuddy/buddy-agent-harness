Feature: Repair agent configuration that doctor reported as wrong

  # ── /buddy-agent-harness:repair ──

  @behavior
  Scenario: runs the doctor command rather than detecting anything itself
    Given a repository whose agent configuration has not been inspected this session
    When the agent runs the `repair` skill
    Then the `doctor` command is run against the repository
    And every finding the skill acts on comes from that command's output
    And the skill checks no file for a fault the command did not report

  @behavior
  Scenario: reports that doctor ran clean and stops
    Given a `doctor` report whose findings state that zero problems were found
    When the agent runs the `repair` skill
    Then the report states that `doctor` found nothing to repair
    And no file in the repository is modified

  @behavior
  Scenario: hands a bridge finding to init and writes nothing
    Given a `doctor` report carrying a `degraded` finding for `.claude/skills`
    When the agent runs the `repair` skill
    Then the report hands that finding to the `init` skill
    And the report offers no correction for it
    And `.claude/skills` is unchanged

  @behavior
  Scenario: hands a two-sided divergence to init rather than picking a side
    Given a `doctor` report carrying a `diverged-both` finding for `.claude/skills`
    When the agent runs the `repair` skill
    Then the report hands that finding on without naming a side to keep
    And `.claude/skills` is unchanged
    And `.agents/skills` is unchanged

  @behavior
  Scenario: hands an unbridged instruction file to init rather than adding the import
    Given a `doctor` report carrying an `instructions-unbridged` finding for `CLAUDE.md`
    And a `CLAUDE.md` whose entire body is a project overview
    When the agent runs the `repair` skill
    Then the report hands that finding to the `init` skill
    And no line is added to `CLAUDE.md`

  @behavior
  Scenario: presents the options and leaves the choice to the owner
    Given a `doctor` report carrying an `unread-local-override` finding and one repair string for it
    And an `AGENTS.local.md` carrying two setup notes
    When the agent runs the `repair` skill
    Then the report offers every correction the skill's own reference lists for that fault
    And `AGENTS.local.md` is unchanged until the owner names one of them

  @behavior
  Scenario: presents the correction with its before and after
    Given a `doctor` report carrying an `ignored-bridge` finding for `.claude/skills`
    And a `.gitignore` containing the line `.claude/`
    When the agent runs the `repair` skill
    Then the offer shows the `.gitignore` line as it stands and as it would read

  @behavior
  Scenario: writes nothing when the correction is declined
    Given a presented correction removing the line `.claude/` from `.gitignore`
    When the owner declines it
    Then `.gitignore` is unchanged
    And the report records that finding as declined

  @behavior
  Scenario: applies the approved correction and leaves the rest of the file unchanged
    Given a presented correction removing the line `.claude/` from `.gitignore`
    And four other lines in that `.gitignore`
    When the owner approves it
    Then `.gitignore` no longer contains the line `.claude/`
    And the four other lines are unchanged

  @behavior
  Scenario: applies only the approved correction when several are offered
    Given a presented `ignored-bridge` correction removing the line `.claude/` from `.gitignore`
    And a presented `unread-local-override` correction moving `AGENTS.local.md`
    When the owner approves the `ignored-bridge` correction alone
    Then `.gitignore` no longer contains the line `.claude/`
    And `AGENTS.local.md` remains at its original path

  @behavior
  Scenario: deletes a projection rather than editing a file
    Given a `doctor` report carrying a `deprecated-harness` finding for `.windsurf/skills`
    And an approval for that correction
    When the skill applies it
    Then `.windsurf/skills` no longer exists
    And no projection is created under the replacing harness's name

  @behavior
  Scenario: quotes a description that breaks its own frontmatter
    Given a `doctor` report carrying an `unloadable-skill` finding for a skill file
    And a `description` value in that file containing an unquoted colon
    When the owner approves the correction
    Then the `description` value is wrapped in quotes
    And the text of the description is unchanged

  @behavior
  Scenario: reports a missing description rather than inventing one
    Given a `doctor` report carrying an `unloadable-skill` finding for a skill file
    And frontmatter in that file carrying a `name` and no `description`
    When the agent runs the `repair` skill
    Then the report states that the skill needs a description written by its author
    And no `description` field is added to that file

  @behavior
  Scenario: re-runs doctor after applying a correction
    Given an approved correction that has been written to `.gitignore`
    When the skill checks whether that correction held
    Then the `doctor` command is run a second time

  @behavior
  Scenario: reports that a correction did not hold rather than claiming it landed
    Given an approved correction that removed the line `.claude/` from `.gitignore`
    And a second `.gitignore` rule that also matches `.claude/skills`
    When the skill re-runs the `doctor` command
    Then the report states that the finding is still open

  @behavior
  Scenario: records a correction as corrected once the re-run is clean
    Given an approved correction that removed the line `.claude/` from `.gitignore`
    And a `.gitignore` whose remaining rules match no bridge path
    When the skill re-runs the `doctor` command
    Then the report records that finding as corrected

  @behavior
  Scenario: reports every finding with its path and its outcome
    Given a `doctor` report carrying one bridge finding and two configuration findings
    When the agent runs the `repair` skill
    Then the report carries a row for every one of those findings
    And each row names its path, what was wrong, and its outcome

  @behavior
  Scenario: offers no way to apply a correction without approval
    Given a `doctor` report carrying an `ignored-bridge` finding for `.claude/skills`
    When the agent runs the `repair` skill
    Then the report presents no option that applies a correction without an approval

  @behavior
  Scenario: corrects no file outside the repository's agent configuration
    Given a `doctor` report carrying a `deprecated-harness` finding for `.windsurf/skills`
    And a release workflow file naming `windsurf`
    When the agent runs the `repair` skill
    Then the release workflow file is unchanged

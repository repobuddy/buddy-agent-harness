Feature: Report whether every skills bridge still resolves into .agents/skills

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: reports a resolving symlink and leaves harnesses that read the canonical directory out
    Given a repository with a `.claude/skills` symlink resolving to `.agents/skills`
    When the command diagnoses the bridges
    Then it reports that bridge with kind `symlink` and status `ok`
    And it reports no bridge for a harness that reads `.agents/skills` itself
    And it reports no problem

  @behavior
  Scenario: detects a symlink checked out as a regular file and names the copy repair
    Given a repository where `.claude/skills` is a regular file holding the canonical path
    When the command diagnoses the bridges
    Then it reports that bridge with kind `file` and status `degraded`
    And it reports a `degraded` problem naming `.claude/skills`
    And the repair rebuilds the bridge as a copy

  @behavior
  Scenario: reports an absent bridge as missing
    Given a repository with a canonical skills directory and nothing at `.claude/skills`
    When the command diagnoses the bridges
    Then it reports that bridge with kind `none` and status `missing`
    And it reports a `missing` problem naming `.claude/skills`

  @behavior
  Scenario: reports a symlink pointing somewhere other than the canonical directory
    Given a repository where `.claude/skills` is a symlink to a directory that is not `.agents/skills`
    When the command diagnoses the bridges
    Then it reports that bridge with status `stale`
    And it reports a `stale` problem naming `.claude/skills`

  @behavior
  Scenario: reports a symlink written as an absolute path as resolving
    Given a repository where `.claude/skills` is a symlink whose target is the absolute path of `.agents/skills`
    When the command diagnoses the bridges
    Then it reports that bridge with status `ok`
    And it reports no problem

  @behavior
  Scenario: reports a correctly named symlink whose target no longer exists
    Given a repository where `.claude/skills` is a symlink to a path that has since been deleted
    When the command diagnoses the bridges
    Then it reports that bridge with status `stale`

  @behavior
  Scenario: reports a missing canonical directory once, before the bridges
    Given a repository with no `.agents/skills` directory
    When the command diagnoses the bridges
    Then it reports exactly one `no-canonical` problem
    And that problem is reported before any bridge problem

  @behavior
  Scenario: reads a bridge against a canonical directory that is not there
    Given a repository with no `.agents/skills` directory and a `.claude/skills` symlink
    When the command diagnoses the bridges
    Then it still reports that bridge alongside the `no-canonical` problem

  @behavior
  Scenario: checks every bridge the requested harnesses add
    Given a repository and a request naming a harness beyond the two defaults
    When the command diagnoses the bridges
    Then it reports a bridge for that harness

  @behavior
  Scenario: adds no bridge for a harness that reads the canonical directory itself
    Given a request naming a harness the registry records as needing no projection
    When the command diagnoses the bridges
    Then it reports no bridge for that harness

  @behavior
  Scenario: accepts an in-sync copy outside a repository without flagging the skip-worktree bit
    Given a directory that is not a git repository, where `.claude/skills` is a copy holding the canonical content
    When the command diagnoses the bridges
    Then it reports that bridge with kind `copy` and status `ok`
    And it reports no `unpinned-copy` problem

  @behavior
  Scenario: flags a copy that differs only in file names
    Given a `.claude/skills` copy holding as many files as `.agents/skills` under different names
    When the command diagnoses the bridges
    Then it reports that bridge with status `diverged`

  @behavior
  Scenario: flags a copy holding a different number of files
    Given a `.claude/skills` copy holding one file more than `.agents/skills`
    When the command diagnoses the bridges
    Then it reports that bridge with status `diverged`

  @behavior
  Scenario: reports a tracked copy whose skip-worktree bit has been lost, and clears it once set
    Given a git repository where a tracked `.claude/skills` copy has no skip-worktree bit
    When the command diagnoses the bridges
    Then it reports an `unpinned-copy` problem naming `.claude/skills`
    And it still reports that bridge with status `ok`
    And it reports no `unpinned-copy` problem once the skip-worktree bit is set

  @behavior
  Scenario: leaves an untracked copy inside a repository alone
    Given a git repository where an in-sync `.claude/skills` copy is untracked
    When the command diagnoses the bridges
    Then it reports no `unpinned-copy` problem

  # ── divergence direction ──

  @behavior
  Scenario: names the bridge when only the bridge moved
    Given a git repository whose `.claude/skills` copy changed since the commit where the two sides agreed
    When the command diagnoses the bridges
    Then it reports a `diverged-bridge` problem

  @behavior
  Scenario: names the canonical directory when only it moved
    Given a git repository whose `.agents/skills` changed since the commit where the two sides agreed
    When the command diagnoses the bridges
    Then it reports a `diverged-canonical` problem

  @behavior
  Scenario: refuses to guess when both sides moved
    Given a git repository where both `.agents/skills` and its `.claude/skills` copy changed since they agreed
    When the command diagnoses the bridges
    Then it reports a `diverged-both` problem
    And the repair reconciles the two by hand rather than rebuilding either side

  @behavior
  Scenario: detects an added file in the bridge as movement on the bridge side
    Given a git repository where a file was added under `.claude/skills` since the two sides agreed
    When the command diagnoses the bridges
    Then it reports a `diverged-bridge` problem

  @behavior
  Scenario: reports an unknown direction when git records no commit where the two agreed
    Given a git repository whose history holds no commit where the two sides matched
    When the command diagnoses the bridges
    Then it reports a `diverged-unknown` problem

  @behavior
  Scenario: reports an unknown direction in a repository with no commits at all
    Given a git repository with no commits, holding a diverged `.claude/skills` copy
    When the command diagnoses the bridges
    Then it reports a `diverged-unknown` problem

  @behavior
  Scenario: reports an unknown direction when the two paths were never committed together
    Given a git repository where `.agents/skills` and `.claude/skills` were never committed in one commit
    When the command diagnoses the bridges
    Then it reports a `diverged-unknown` problem

  @behavior
  Scenario: reports an unknown direction when only one side is present in history
    Given a git repository whose history holds `.agents/skills` and never held `.claude/skills`
    When the command diagnoses the bridges
    Then it reports a `diverged-unknown` problem

  @behavior
  Scenario: names which side moved for every diverged bridge
    Given a git repository holding a diverged `.claude/skills` copy
    When the command diagnoses the bridges
    Then it names that bridge path and the side that moved
    And it names one side per diverged bridge and none for a bridge that resolves

Feature: Hand every doctor finding to the one surface that repairs it

  # ── buddy-agent-harness doctor, read by a repairing skill ──

  @behavior
  Scenario: has one repair for every problem it can report
    Given the set of problems the command can report
    When each is looked up in the guidance table
    Then every problem resolves to exactly one repair

  @behavior
  Scenario: renders every repair twice, once for a shell and once for a skill
    Given every problem the command can report
    When each problem's repair is rendered for the command and for the shipped skill
    Then both renderings come from one entry, so they cannot disagree about which problem they repair
    And only the skill rendering names the surface that owns the repair

  @behavior
  Scenario: carries a repair with every finding it reports
    Given a repository holding a fault from each of the three families
    When the command reports its findings
    Then every finding carries a non-empty detail and a repair

  @behavior
  Scenario: keeps the routable name out of the prose detail
    Given a repository holding a reported fault
    When the command reports that finding
    Then the detail does not have to be parsed to recover the problem name

  @behavior
  Scenario: sends a bridge finding to the init skill wherever rebuilding is the repair
    Given the bridge-resolution problems that rebuilding the bridge repairs
    When each repair is read as the shipped skill states it
    Then each names the `init` skill as the surface that repairs it

  @behavior
  Scenario: names no skill for a finding that rebuilding would not repair
    Given `diverged-both`, `diverged-unknown`, and `unpinned-copy`
    When each repair is read as the shipped skill states it
    Then none names a skill
    And each states the work to be done by hand instead

  @behavior
  Scenario: sends every instruction finding to the init skill
    Given every problem belonging to the instruction-bridge family
    When each repair is read as the shipped skill states it
    Then each names the `init` skill as the surface that repairs it

  @behavior
  Scenario: sends every configuration finding to the repair skill
    Given every fault belonging to the configuration family
    When each repair is read as the shipped skill states it
    Then each names the `repair` skill as the surface that repairs it

  @behavior
  Scenario: never tells the skill to run the init command
    Given every repair the shipped skill states
    When each is read
    Then none invokes the `init` command in place of the `init` skill

  @behavior
  Scenario: never points the skill at a bare binary invocation
    Given every repair the shipped skill states
    When each is read
    Then none names the bare binary the command uses for its own output

  @behavior
  Scenario: states exactly one repair per problem, never a set to choose between
    Given every problem the command can report
    When each is looked up
    Then each resolves to a single repair rather than a set
    And where more than one correction is valid, the options come from the repairing skill's own reference

  @behavior
  Scenario: writes nothing while detecting, whatever it finds
    Given a repository holding a fault from each of the three families
    When the command runs against it
    Then no file in the repository is created, modified, or removed

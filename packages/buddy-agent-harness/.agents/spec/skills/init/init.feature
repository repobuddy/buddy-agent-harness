@frozen
Feature: Consolidate a repository's agent configuration and bridge the harnesses that cannot read it

  # ── /buddy-agent-harness:init ──

  @behavior
  Scenario: writes nothing while surveying the repository
    Given a repository holding a `.cursorrules` and a `.claude/skills` directory
    When the agent runs the `init` skill
    Then no file is created or modified before the plan is presented
    And every artifact the plan names was read from the repository rather than written to it

  @behavior
  Scenario: skips a bridge a previous run already wrote
    Given a `CLAUDE.md` whose entire body is the `AGENTS.md` import
    And a `.claude/skills` symlink that resolves into `.agents/skills`
    When the agent runs the `init` skill
    Then neither of them is treated as instruction content to consolidate
    And neither of them is reported as a conflict
    And `CLAUDE.md` is unchanged

  @behavior
  Scenario: treats a heading-only AGENTS.md as absent and derives against it
    Given a root `AGENTS.md` holding a single heading and no body
    When the agent runs the `init` skill
    Then the file is treated as a placeholder rather than as canonical content
    And the derived lines are confirmed with the owner before any of them is written
    And a root `AGENTS.md` carrying authored content would instead be left as it stands

  @behavior
  Scenario: offers no consolidation that would leave fewer readers than before
    Given a `.cursorrules` a person wrote, for a harness that reads `AGENTS.md` in one mode only
    When the agent runs the `init` skill
    Then the offer is to consolidate into `AGENTS.md` and leave a generated copy behind
    And no offer is made to consolidate the file and delete it

  @behavior
  Scenario: asks about each artifact separately rather than about the set
    Given two artifacts only one harness reads, each with a different candidate
    When the agent runs the `init` skill
    Then approval is asked for each of them on its own
    And approving one converts only that one

  @behavior
  Scenario: lists every artifact only one harness reads, and converts none unasked
    Given a `.claude/agents/` directory and a `.cursor/rules/` directory
    When the agent runs the `init` skill
    Then each is listed with the canonical form it is a candidate for
    And the subagent is reported as having no candidate at all
    And neither is converted into another harness's format without approval
    And an artifact whose conversion is declined is left where it is

  @behavior
  Scenario: refuses an MCP conversion the mapping cannot carry losslessly
    Given an MCP server defined in one harness's settings file
    And a second enabled harness with its own MCP format
    When the agent runs the `init` skill
    Then the server is reported as canonical-only
    And it is not written into the second harness's format
    And the report states that the mapping would mean supplying fields the source never carried

  @behavior
  Scenario: leaves a nested AGENTS.md where it is rather than merging it upward
    Given a nested `AGENTS.md` under a package directory
    When the agent runs the `init` skill
    Then its content is not appended to the root `AGENTS.md`
    And the nested file is reported and left in place

  @behavior
  Scenario: shows the derived name and description verbatim before writing either
    Given a skill directory whose `SKILL.md` carries no frontmatter
    When the agent presents the plan
    Then the derived `name` and `description` are shown as they would be written
    And neither is written until the owner approves them
    And nothing usable to derive from is asked about rather than filled with a placeholder

  @behavior
  Scenario: shows every derived line beside its source and writes only what was approved
    Given a repository with no instruction content and facts derivable from its configuration files
    When the agent presents the plan
    Then each candidate line is shown beside the file it was derived from
    And a candidate with no source in the repository is dropped rather than written
    And only the approved lines reach `AGENTS.md`

  @behavior
  Scenario: writes a heading and one line when nothing survives derivation
    Given a repository with no instruction content and no candidate fact that survives the test
    When the agent presents the plan
    Then `AGENTS.md` is planned as a heading and one line stating what the repository is
    And no further line is added to reach a fuller-looking file

  @behavior
  Scenario: asks before replacing an authored instruction file with a pointer
    Given a `.cursorrules` a person wrote
    When the agent runs the `init` skill
    Then replacing it with a pointer is presented for approval
    And `.cursorrules` is unchanged until that approval is given

  @behavior
  Scenario: asks before editing a settings file a person wrote
    Given a `.gemini/settings.json` a person wrote, holding settings this skill did not come for
    When the agent runs the `init` skill
    Then adding `AGENTS.md` to `context.fileName` is presented for approval
    And the file is unchanged until that approval is given

  @behavior
  Scenario: asks before bridging a nested file that reverses a root rule
    Given a nested `AGENTS.md` stating a rule that negates one in the root `AGENTS.md`
    When the agent runs the `init` skill
    Then that one file is raised with the owner before it is bridged
    And the offer carries the option to bridge it anyway, to reword it as additive, and to leave it unbridged
    And no stub is written in its directory until the owner answers

  @behavior
  Scenario: creates a missing directory and a missing AGENTS.md without asking
    Given a repository with no `.agents/` directory and no root `AGENTS.md`
    When the agent runs the `init` skill
    Then `.agents/` and `.agents/skills/` are created without an approval being asked for
    And the root `AGENTS.md` is created the same way
    And every one of those creations is reported

  @behavior
  Scenario: writes the CLAUDE.md import stub without asking
    Given Claude Code among the enabled harnesses and no `CLAUDE.md` at the root
    When the agent runs the `init` skill
    Then a `CLAUDE.md` importing `AGENTS.md` is written without an approval being asked for
    And it carries the import and nothing copied out of `AGENTS.md`
    And the write is reported

  @behavior
  Scenario: writes the Gemini entry unasked where no settings file exists
    Given Gemini CLI among the enabled harnesses and no `.gemini/settings.json`
    When the agent runs the `init` skill
    Then the file is created carrying `AGENTS.md` in `context.fileName`
    And no approval is asked for before it is written

  @behavior
  Scenario: bridges every additive nested file unasked and names each one it judged
    Given two package directories each holding an `AGENTS.md` that adds to the root rules
    When the agent runs the `init` skill
    Then a stub is written in each of those directories without an approval being asked for
    And the report names each nested file and states that it was judged additive
    And the report does not state the outcome as a count alone

  @behavior
  Scenario: leaves a declined step's file as it stands
    Given a presented step replacing an authored instruction file with a pointer
    When the owner declines it
    Then that file is unchanged
    And no pointer is written in its place

  @behavior
  Scenario: preserves the history of a skill it moves
    Given an approved move of a skill directory into `.agents/skills/`
    When the agent applies it
    Then the move is made so that the file's history follows it
    And the skill is reachable at its canonical path

  @behavior
  Scenario: fixes the frontmatter that decides whether a harness loads the skill
    Given a migrated `SKILL.md` whose `description` contains an unquoted colon
    And a second migrated `SKILL.md` whose `name` differs from its directory
    When the agent applies the migration
    Then the `description` is quoted so the frontmatter parses
    And the `name` is aligned with the directory name
    And the text of the description is unchanged

  @behavior
  Scenario: appends consolidated content rather than restructuring what a person wrote
    Given an approved consolidation of a `.cursorrules` into `AGENTS.md`
    When the agent applies it
    Then the content is appended to `AGENTS.md`
    And the author's wording is preserved
    And the existing sections of `AGENTS.md` are neither reordered nor rewritten

  @behavior
  Scenario: edits a settings file in place and leaves the rest of it byte-identical
    Given an approved edit adding `AGENTS.md` to `context.fileName` in a settings file carrying comments
    When the agent applies it
    Then `AGENTS.md` is added to the array rather than replacing it
    And the file's comments, key order, and indentation are unchanged

  @behavior
  Scenario: resolves the named target and retries rather than forcing every conflict
    Given the `init` command reporting a conflicting target directory
    When the agent acts on that report
    Then the named target is resolved and the command is run again
    And no other projection is replaced

  @behavior
  Scenario: applies a flag from the invocation without letting it skip the plan
    Given an invocation naming `--force` and a target that already holds something
    When the agent runs the `init` skill
    Then the replacement is still presented for approval before the command is run
    And the survey is still run first
    And an invocation asking in prose that the bridge be replaced is read the same way

  @behavior
  Scenario: names what it did not recognize rather than guessing at a flag
    Given an invocation naming an argument that is not one of the command's flags
    When the agent runs the `init` skill
    Then the report states what was not recognized
    And no flag is passed to the command on the strength of it
    And the rest of the run still happens

  @behavior
  Scenario: reports a copy as a snapshot rather than as a live projection
    Given a repository where links are unavailable and the skills are copied instead
    When the agent reports the run
    Then the report states that a copy is a snapshot rather than a live projection

  @behavior
  Scenario: names only the bridges the repository actually has
    Given a repository given a skills bridge and no instruction bridge
    When the agent writes the non-material region
    Then the region names the skills bridge
    And it makes no statement about a bridge this repository does not have

  @behavior
  Scenario: restores a removed region and rewrites an existing one in place
    Given an `AGENTS.md` whose non-material region and its markers are gone
    When the agent runs the `init` skill
    Then the region is written again at the end of the file
    And a re-run rewrites that region in place rather than adding a second one
    And nothing the user wrote above it is reordered or removed

  @behavior
  Scenario: leaves emptied markers empty
    Given an `AGENTS.md` holding the region markers with nothing between them
    When the agent runs the `init` skill
    Then the markers are left with nothing between them
    And the region is not written back

  @behavior
  Scenario: writes no region into a repository that has no bridge
    Given a repository whose every enabled harness reads `.agents/skills` and `AGENTS.md` natively
    When the agent runs the `init` skill
    Then no non-material region is written
    And a later run does not restore one either

  @behavior
  Scenario: verifies that every projection resolves and every migrated skill parses
    Given projections written and skills migrated into `.agents/skills/`
    When the agent verifies the run
    Then each projection is confirmed to resolve into `.agents/skills`
    And each migrated `SKILL.md` is confirmed to parse and to carry a `description`

  @behavior
  Scenario: runs the repository's own formatter over what it wrote
    Given a repository carrying a formatter of its own
    When the agent has written the files for this run
    Then that formatter is run over them
    And the report states that it was run

  @behavior
  Scenario: imposes no formatter on a repository that has none
    Given a repository carrying no formatter of its own
    When the agent has written the files for this run
    Then no formatter is installed, configured, or run
    And the written files are left formatted as they were written

  @behavior
  Scenario: reports what was created, consolidated, linked, and left canonical-only
    Given a run that created files, consolidated one instruction file, linked one harness, and left a subagent directory alone
    When the agent reports the run
    Then every one of those four outcomes is named in the report
    And each artifact left canonical-only is reported with the reason it was left

  @behavior
  Scenario: offers the enhance skill once and takes the answer
    Given a run that has finished reporting
    When the agent offers to continue
    Then the `enhance` skill is offered exactly once
    And no instruction content is written by this skill whichever way the owner answers

  @behavior
  Scenario: invents no canonical directory beyond the one convention
    Given a repository with no `.agents/` tree and rules, commands, and subagents to place
    When the agent runs the `init` skill
    Then no `.agents/rules/`, `.agents/commands/`, or `.agents/agents/` directory is created
    And `.agents/` is described as a convention rather than as a standard

  @behavior
  Scenario: writes no AGENTS.local.md
    Given a request to keep personal instructions out of version control
    When the agent runs the `init` skill
    Then no `AGENTS.local.md` is created
    And the personal instructions are pointed at a gitignored harness-local file instead

  @behavior
  Scenario: changes no file outside the repository's agent configuration
    Given a repository whose CI workflow names a harness
    When the agent runs the `init` skill
    Then the workflow file is unchanged
    And no repository setting, branch rule, or unrelated project file is changed

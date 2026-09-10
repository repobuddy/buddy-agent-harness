@frozen
Feature: Offer the current wording of a vetted section to a repository that already has an AGENTS.md

  # ── /buddy-agent-harness:enhance ──

  @behavior
  Scenario: reports and stops when there is no instruction file to add to
    Given a repository holding a `.claude/` directory and no root `AGENTS.md`
    When the agent runs the `enhance` skill
    Then the report says there is no instruction file to add to
    And no file in the repository is created or modified

  @behavior
  Scenario: judges coverage across instructions that are not yet consolidated
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    And a `.cursorrules` holding a paragraph telling the agent what to hand to a subagent
    When the agent runs the `enhance` skill
    Then the report names the `.cursorrules` paragraph as what covers the subject
    And the `.cursorrules` file is unchanged
    And the report recommends the `init` skill for consolidating it

  @behavior
  Scenario: offers an addition the merged view does not cover
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    When the agent runs the `enhance` skill
    Then the `## Delegation` section is offered

  @behavior
  Scenario: treats a heading inside a fenced block as an example rather than as coverage
    Given a root `AGENTS.md` documenting this package
    And a fenced code block inside it containing the `## Delegation` heading and the section's text
    When the agent runs the `enhance` skill
    Then the `## Delegation` section is offered

  @behavior
  Scenario: offers again once an approved section is removed
    Given a root `AGENTS.md` whose git history shows a `## Delegation` section added and later deleted
    And a working tree copy of that file holding a build-commands section and no `## Delegation` section
    When the agent runs the `enhance` skill
    Then the `## Delegation` section is offered

  @behavior
  Scenario: withholds an offer the owner's own words already cover
    Given a root `AGENTS.md` holding a `## Working with subagents` section written by the repository owner
    And that section says which work to hand to a subagent and which to keep
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And the report names that section as what covers the subject
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: treats thin guidance as covering the subject and says why
    Given a root `AGENTS.md` whose only subagent guidance is one line under `## Research` saying to hand long reading to a helper session
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And the report names the `## Research` line as what covers the subject
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers nothing where the file already carries the current text
    Given a root `AGENTS.md` holding the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And no replacement is offered
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: leaves alone a section it cannot tell from the owner's own words
    Given a root `AGENTS.md` holding a `## Delegation` section the repository owner wrote in their own words
    And that section matches neither the text `references/delegation.md` offers nor its `## Stale when` criterion
    When the agent runs the `enhance` skill
    Then no replacement is offered
    And the report says the section was judged the owner's own
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers the current wording where the file carries an earlier form of it
    Given a root `AGENTS.md` holding a `## Delegation` section matching the `## Stale when` criterion in `references/delegation.md`
    When the agent runs the `enhance` skill
    Then the current `## Delegation` text is offered as a replacement for that section
    And `AGENTS.md` is unchanged until the owner answers

  @behavior
  Scenario: reports an earlier form outside the root file rather than replacing it
    Given a `CLAUDE.md` holding a `## Delegation` section matching the `## Stale when` criterion in `references/delegation.md`
    And a root `AGENTS.md` holding a build-commands section and no `## Delegation` section
    When the agent runs the `enhance` skill
    Then the report names `CLAUDE.md` as the file holding the earlier form
    And no replacement is offered
    And `CLAUDE.md` is unchanged

  @behavior
  Scenario: shows the addition verbatim rather than a summary of it
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    When the agent runs the `enhance` skill
    Then the offered text is byte-identical to the text inside the fence in `references/delegation.md`
    And the offer names the place in `AGENTS.md` the section would go

  @behavior
  Scenario: shows the current text beside the section it would replace
    Given a root `AGENTS.md` holding a `## Delegation` section matching the `## Stale when` criterion in `references/delegation.md`
    When the agent runs the `enhance` skill
    Then the offer shows the section as it stands in `AGENTS.md`
    And the offer shows the replacement text byte-identical to the text inside the fence in `references/delegation.md`

  @behavior
  Scenario: reports the decline and leaves the instruction file unchanged
    Given the `enhance` skill has presented an offer and is waiting on an answer
    When the owner declines it
    Then `AGENTS.md` is byte-identical to what it was before the run
    And the report records the decline

  @behavior
  Scenario: appends an approved addition outside the managed region
    Given a root `AGENTS.md` holding a `buddy-agent-harness` managed region
    And the `enhance` skill has offered the `## Delegation` section as an addition
    When the owner approves it
    Then the section is written after the managed region's closing marker
    And the bytes between the managed region's markers are unchanged
    And the written section carries no surrounding code fence

  @behavior
  Scenario: replaces only that section and leaves the rest of the file byte-identical
    Given a root `AGENTS.md` holding a build-commands section, a `## Delegation` section matching the `## Stale when` criterion, and a code-style section
    And the `enhance` skill has offered the current `## Delegation` text as a replacement
    When the owner approves it
    Then the `## Delegation` section holds the text inside the fence in `references/delegation.md`
    And the build-commands section and the code-style section are byte-identical to what they were before the run

  @behavior
  Scenario: reports the run whichever way it went
    Given a repository the `enhance` skill has been run in
    When the run reaches any of its outcomes
    Then the report names the files it read
    And the report gives a verdict for the `## Delegation` addition
    And the report names what was written, or states that nothing was

  @behavior
  Scenario: writes to no file other than the root AGENTS.md
    Given a root `AGENTS.md` and a `packages/api/AGENTS.md` holding a `## Delegation` section matching the `## Stale when` criterion
    When the agent runs the `enhance` skill
    Then `packages/api/AGENTS.md` is byte-identical to what it was before the run
    And no offer names `packages/api/AGENTS.md` as a target

  @behavior
  Scenario: changes no file outside the repository's agent configuration
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    And a `.github/workflows/ci.yml` naming an agent harness
    When the agent runs the `enhance` skill
    Then `.github/workflows/ci.yml` is byte-identical to what it was before the run
    And no offer names a file outside the repository's agent configuration

  @behavior
  Scenario: offers the text as written rather than adapted to the repository
    Given a root `AGENTS.md` whose prose is written in the second person plural
    When the agent runs the `enhance` skill
    Then the offered text is byte-identical to the text inside the fence in `references/delegation.md`
    And no reworded variant of it is offered

  # ── an addition's reference file ──

  @behavior
  Scenario: rejects an addition whose text names a model
    Given a candidate addition whose offered text names a model by its product name
    When the addition is reviewed for shipping
    Then it is rejected and the report names the model reference as the cause

  @behavior
  Scenario: accepts an addition whose text survives a changing model lineup
    Given a candidate addition whose offered text describes a subagent by cost and by whether its answer can be checked
    When the addition is reviewed for shipping
    Then it is not rejected for naming a model, a vendor, or a version

  @behavior
  Scenario: states what already covers its subject
    Given the shipped `references/delegation.md`
    When the file is read
    Then it carries a `## Covered when` section
    And that section names at least one shape of existing prose that counts as the subject being present

  @behavior
  Scenario: states what an earlier form of its own text looks like
    Given the shipped `references/delegation.md`
    When the file is read
    Then it carries a `## Stale when` section
    And that section names at least one property the section's earlier form has and its current text does not

  @behavior
  Scenario: rejects a stale criterion that cannot be told from the owner's own words
    Given a candidate `## Stale when` criterion reading "the section tells the agent when to use a subagent"
    When the criterion is reviewed for shipping
    Then it is rejected and the report says it would match prose the owner wrote

  @behavior
  Scenario: accepts a stale criterion that separates an earlier form from the owner's own words
    Given a candidate `## Stale when` criterion naming a clause the earlier text carries verbatim and the current text does not
    When the criterion is reviewed for shipping
    Then it is not rejected for matching prose the owner wrote

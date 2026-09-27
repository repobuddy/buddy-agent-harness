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
    And the report recommends the `init-buddy-agent-harness` skill for consolidating it

  @behavior
  Scenario: offers an addition the merged view does not cover
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    When the agent runs the `enhance` skill
    Then the `## Delegation` section is offered

  @behavior
  Scenario: recommends the destination the addition names, not the repository by default
    Given a root `AGENTS.md` the `## Delegation` section is absent from
    When the `## Delegation` section is offered
    Then the owner's own global instruction file is recommended over the repository's `AGENTS.md`
    And the reason given is that the text holds in every repository the owner opens
    And the repository's `AGENTS.md` is named as the alternative, with what each destination reaches

  @behavior
  Scenario: says when the agent's own instructions already carry the text
    Given instructions the agent loads from outside the repository already carry the `## Delegation` text exactly as `references/delegation.md` offers it
    And a root `AGENTS.md` holding a build-commands section and a code-style section
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report gives the `## Delegation` addition the verdict already global
    And the `## Delegation` text is not offered
    And the report says a copy in the repository's `AGENTS.md` would add the team and nothing else
    And it says the owner would then carry the text twice
    And the report says the owner may ask for that copy
    And `AGENTS.md` is unchanged until the owner asks for that copy

  @behavior
  Scenario: writes a team copy of an already-global addition when the owner asks for it
    Given the `enhance` skill has said the `## Delegation` addition is already global and that the owner may ask for a team copy
    When the owner asks for a copy in the repository's `AGENTS.md`
    Then `AGENTS.md` carries the `## Delegation` section
    And that section holds the text inside the fence in `references/delegation.md`

  @behavior
  Scenario: reports a section held both in the repository and in the agent's own instructions
    Given instructions the agent loads from outside the repository already carry the `## Delegation` text exactly as `references/delegation.md` offers it
    And a root `AGENTS.md` holding the `## Delegation` section exactly as `references/delegation.md` offers it
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report gives the `## Delegation` addition the verdict already current
    And the report says the owner reads the `## Delegation` text twice, once from each place
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: hands over the current text for a retired wording the agent's own instructions carry
    Given instructions the agent loads from outside the repository carry a `## Delegation` section identical to a wording in `references/delegation.history.md`
    And a root `AGENTS.md` holding a build-commands section and a code-style section
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the agent's instructions from outside the repository carry a retired `## Delegation` wording
    And the report names the file holding that wording
    And no `## Delegation` section is offered for the repository's `AGENTS.md`
    And the owner is shown that section as it stands beside the current text byte-identical to the text inside the fence in `references/delegation.md`
    And the report says the current text would replace that section in that file, and that the skill writes nothing outside the repository
    And no file outside the repository is written
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers nothing where the agent's own instructions cover the subject in the owner's words
    Given instructions the agent loads from outside the repository carry a `## Working with subagents` section written by the owner
    And that section says which work to hand to a subagent and which to keep
    And a root `AGENTS.md` holding a build-commands section and a code-style section
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And the report names the `## Working with subagents` section, in the instructions from outside the repository, as what covers the subject
    And the report says the owner may ask for a copy in the repository's `AGENTS.md`
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: puts a global section it cannot place to the owner instead of deciding
    Given instructions the agent loads from outside the repository carry a `## Delegation` section of three paragraphs
    And one sentence of a wording in `references/delegation.history.md` appears verbatim inside its first paragraph
    And its remaining sentences appear in no wording in `references/delegation.history.md`
    And a root `AGENTS.md` holding a build-commands section and a code-style section
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section in the instructions from outside the repository cannot be placed
    And the owner is asked which of the two the section is
    And no `## Delegation` section is offered for the repository's `AGENTS.md`
    And no file outside the repository is written
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: hands over the current text when the owner says a global section came from this package
    Given the `enhance` skill has asked the owner which of the two a `## Delegation` section in the instructions the agent loads from outside the repository is
    When the owner answers that it is an edited copy of the retired wording
    Then the owner is shown the current text byte-identical to the text inside the fence in `references/delegation.md`, for the file holding that section
    And no `## Delegation` section is offered for the repository's `AGENTS.md`
    And no file outside the repository is written

  @behavior
  Scenario: offers to remove a retired wording the agent's own instructions already carry in its current form
    Given instructions the agent loads from outside the repository already carry the `## Delegation` text exactly as `references/delegation.md` offers it
    And a root `AGENTS.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report gives the `## Delegation` addition the verdict from a retired wording
    And the report says the agent's instructions from outside the repository already carry the current text
    And the removal of that `## Delegation` section is offered
    And the removal offer says the team's agents would no longer read the section
    And no replacement is offered ahead of the owner's answer
    And the report says a replacement would leave the owner reading the text twice, and that the owner may ask for it
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: removes only that section when the owner approves the removal
    Given the `enhance` skill has offered to remove a `## Delegation` section from the root `AGENTS.md`
    And that is the only offer or question the run has put to the owner
    When the owner approves the removal
    Then `AGENTS.md` carries no `## Delegation` section
    And every byte of `AGENTS.md` outside that section is as it was before the run

  @behavior
  Scenario: replaces the section when the owner asks for the replacement instead of the removal
    Given the `enhance` skill has offered to remove a `## Delegation` section from the root `AGENTS.md` and said the owner may ask for a replacement
    When the owner asks for the replacement
    Then that `## Delegation` section holds the text inside the fence in `references/delegation.md`

  @behavior
  Scenario: says the owner reads the subject twice where their own words sit beside the current text outside the repository
    Given instructions the agent loads from outside the repository already carry the `## Delegation` text exactly as `references/delegation.md` offers it
    And a root `AGENTS.md` holding a `## Working with subagents` section written by the repository owner
    And that section says which work to hand to a subagent and which to keep
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And no replacement or removal is offered
    And the report names the `## Working with subagents` section as what covers the subject
    And the report says the agent's instructions from outside the repository also carry the current `## Delegation` text
    And the report says the owner reads the subject twice, once in each wording
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: hands a global placement over rather than writing outside the repository
    Given an owner who picks their global instruction file over the repository's `AGENTS.md`
    When the agent applies the answer
    Then the text and the file it belongs in are given to the owner
    And no file outside the repository is written
    And the run reports the hand-off as an outcome rather than as a decline

  @behavior
  Scenario: names ~/.agents/AGENTS.md as the global instruction file
    Given a root `AGENTS.md` the `## Delegation` section is absent from
    When the `## Delegation` section is offered
    Then the global destination it names is `~/.agents/AGENTS.md`

  @behavior
  Scenario: says the harness loads the global file only through its own user-scope file
    Given a harness in use that documents a user-scope instruction file other than `~/.agents/AGENTS.md`, or documents none
    And a root `AGENTS.md` the `## Delegation` section is absent from
    When the `## Delegation` section is offered
    Then the global destination it names is still `~/.agents/AGENTS.md`
    And the offer says that harness reads the text only where a user-scope instruction file of its own loads `~/.agents/AGENTS.md`

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
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And the report names the `## Working with subagents` section as what covers the subject
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: treats thin guidance as covering the subject and says why
    Given a root `AGENTS.md` whose only subagent guidance is one line under `## Research` saying to hand long reading to a helper session
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And the report names the `## Research` line as what covers the subject
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers nothing where the file already carries the current text
    Given a root `AGENTS.md` holding the `## Delegation` section exactly as `references/delegation.md` offers it
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no `## Delegation` section is offered
    And no replacement is offered
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: reports an already-current section as current rather than as the owner's
    Given a root `AGENTS.md` holding the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section is already the text the addition offers
    And the report does not describe that section as the owner's own words

  @behavior
  Scenario: treats the current text with the owner's own paragraphs added as already current
    Given a root `AGENTS.md` holding a `## Delegation` section that contains the text `references/delegation.md` offers, whole and verbatim
    And one further paragraph after it appears in no wording the addition has offered
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section is already the text the addition offers
    And no replacement is offered
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: treats the current text split by an owner's paragraph as already current
    Given a root `AGENTS.md` holding a `## Delegation` section carrying every sentence of the text `references/delegation.md` offers, in order
    And a paragraph appearing in no wording the addition has offered sits between that text's two paragraphs
    When the agent runs the `enhance` skill
    Then the report says the section is already the text the addition offers
    And the report does not describe that section as the owner's own words

  @behavior
  Scenario: does not call a section current while it still asserts a retired sentence
    Given a root `AGENTS.md` holding a `## Delegation` section carrying the text `references/delegation.md` offers, whole and in order
    And the same section asserts a sentence found in a wording in `references/delegation.history.md` and not in that text
    When the agent runs the `enhance` skill
    Then the report does not say the section is already current

  @behavior
  Scenario: leaves alone a section written from scratch on the same subject
    Given a root `AGENTS.md` holding a `## Delegation` section no sentence of which appears verbatim in any wording in `references/delegation.history.md`
    And its sentences follow the order of no wording in that file
    And it does not carry every sentence of the text `references/delegation.md` offers
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then no replacement is offered
    And the report says the section was judged the owner's own
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: does not count a sentence the section quotes in order to reject it
    Given a root `AGENTS.md` holding a `## Delegation` section stating a delegation policy of the owner's own
    And it quotes one sentence of a wording in `references/delegation.history.md` inside quotation marks
    And the sentence around that quotation disputes it
    And it does not carry every sentence of the text `references/delegation.md` offers
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section was judged the owner's own
    And no replacement is offered
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers the current wording where a retired wording was edited in place
    Given a root `AGENTS.md` holding a `## Delegation` section carrying two sentences of a wording in `references/delegation.history.md` verbatim
    And that section keeps the sentence order of that wording
    And its remaining sentences are that wording's, reworded
    When the agent runs the `enhance` skill
    Then the current `## Delegation` text is offered as a replacement for that section

  @behavior
  Scenario: puts a reworded retired wording to the owner instead of deciding
    Given a root `AGENTS.md` holding a `## Delegation` section of five sentences
    And each does the job of the sentence at that position in a wording in `references/delegation.history.md`
    And no sentence of that wording appears in it verbatim
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section cannot be placed
    And the owner is asked which of the two the section is
    And no replacement is offered ahead of that answer
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: puts a section it cannot place to the owner instead of deciding
    Given a root `AGENTS.md` holding a `## Delegation` section of three paragraphs
    And one sentence of a wording in `references/delegation.history.md` appears verbatim inside its first paragraph
    And its remaining sentences appear in no wording in `references/delegation.history.md`
    And the repository has a harness for scoring instruction wordings
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section cannot be placed
    And the owner is shown the section, the wording in `references/delegation.history.md` it partly tracks, and the current text
    And the owner is asked which of the two the section is
    And the owner is offered a run of the `eval-delegation` harness as a third answer
    And no replacement is offered ahead of that answer
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: leaves the file alone when the owner says the section is theirs
    Given the `enhance` skill has asked the owner which of the two a `## Delegation` section is
    And that is the only offer or question the run has put to the owner
    When the owner answers that they wrote it
    Then `AGENTS.md` is byte-identical to what it was before the run
    And the report records the answer

  @behavior
  Scenario: offers the replacement when the owner says the section came from this package
    Given the `enhance` skill has asked the owner which of the two a `## Delegation` section is
    When the owner answers that it is an edited copy of the retired wording
    Then the current `## Delegation` text is offered as a replacement for that section

  @behavior
  Scenario: names measurement as unavailable where the repository has no harness
    Given a root `AGENTS.md` holding a `## Delegation` section of three paragraphs
    And one sentence of a wording in `references/delegation.history.md` appears verbatim inside its first paragraph
    And its remaining sentences appear in no wording in `references/delegation.history.md`
    And the repository has no harness for scoring instruction wordings
    When the agent runs the `enhance` skill
    Then the report says the section cannot be placed
    And the owner is asked which of the two the section is
    And the report says settling it by measurement would need a harness this repository does not have

  @behavior
  Scenario: replaces the section when measurement puts the current wording ahead
    Given the owner has asked for the `eval-delegation` harness to settle an unplaceable `## Delegation` section
    When the harness scores the current `## Delegation` text above the section as it stands
    Then the report gives both scores
    And the current text is offered as a replacement on the strength of those scores

  @behavior
  Scenario: keeps the owner's wording when measurement does not put ours ahead
    Given the owner has asked for the `eval-delegation` harness to settle an unplaceable `## Delegation` section
    And that is the only offer or question the run has put to the owner
    When the harness scores the section as it stands level with or above the current `## Delegation` text
    Then the report gives both scores
    And no replacement is offered
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: runs no evaluation the owner did not ask for
    Given a root `AGENTS.md` holding a `## Delegation` section of three paragraphs
    And one sentence of a wording in `references/delegation.history.md` appears verbatim inside its first paragraph
    And its remaining sentences appear in no wording in `references/delegation.history.md`
    And the repository has a harness for scoring instruction wordings
    When the agent runs the `enhance` skill and the owner has answered nothing
    Then the `eval-delegation` harness is not run
    And the report names it as an answer the owner may choose

  @behavior
  Scenario: writes nothing while the question is unanswered
    Given the `enhance` skill has asked the owner which of the two a `## Delegation` section is
    And that is the only offer or question the run has put to the owner
    When the run ends without an answer
    Then `AGENTS.md` is byte-identical to what it was before the run

  @behavior
  Scenario: offers the current wording where the file carries a retired one verbatim
    Given a root `AGENTS.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the current `## Delegation` text is offered as a replacement for the `## Delegation` section
    And `AGENTS.md` is unchanged until the owner answers

  @behavior
  Scenario: does not call a retired wording current because the current text still carries all its sentences
    Given a root `AGENTS.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    And every sentence of that wording appears verbatim, in order, in the text `references/delegation.md` offers
    And the text `references/delegation.md` offers carries a sentence that wording does not
    When the agent runs the `enhance` skill
    Then the report does not say the section is already current
    And the current `## Delegation` text is offered as a replacement for that section

  @behavior
  Scenario: offers the current wording where an owner filled the gap a revision added
    Given a root `AGENTS.md` holding a `## Delegation` section carrying a wording in `references/delegation.history.md` whole and in order
    And one sentence of the owner's own sits at the place where the text `references/delegation.md` offers adds a sentence to that wording
    And that sentence appears in no wording the addition has offered
    When the agent runs the `enhance` skill
    Then the report does not say the section is already current
    And the current `## Delegation` text is offered as a replacement for that section

  @behavior
  Scenario: reports a retired wording outside the root file rather than replacing it
    Given a `CLAUDE.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    And a root `AGENTS.md` holding a build-commands section and no `## Delegation` section
    When the agent runs the `enhance` skill
    Then the report names `CLAUDE.md` as the file holding that retired wording
    And no replacement is offered for the `CLAUDE.md` section
    And `CLAUDE.md` is unchanged

  @behavior
  Scenario: shows the addition verbatim rather than a summary of it
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    When the agent runs the `enhance` skill
    Then the offered `## Delegation` text is byte-identical to the text inside the fence in `references/delegation.md`
    And the `## Delegation` offer says where the section would go

  @behavior
  Scenario: shows the current text beside the section it would replace
    Given a root `AGENTS.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    When the agent runs the `enhance` skill
    Then the replacement offer shows the `## Delegation` section as it stands in `AGENTS.md`
    And that offer shows the replacement text byte-identical to the text inside the fence in `references/delegation.md`

  @behavior
  Scenario: reports the decline and leaves the instruction file unchanged
    Given the `enhance` skill has presented an offer and is waiting on an answer
    And that is the only offer or question the run has put to the owner
    When the owner declines it
    Then `AGENTS.md` is byte-identical to what it was before the run
    And the report records the decline

  @behavior
  Scenario: appends an approved addition outside the managed region
    Given a root `AGENTS.md` holding a `buddy-agent-harness` managed region
    And the `enhance` skill has offered the `## Delegation` section as an addition
    When the owner approves it
    Then the section is written outside the managed region
    And the bytes between the managed region's markers are unchanged
    And the written section carries no surrounding code fence

  @behavior
  Scenario: names the owner's own paragraphs a replacement would remove
    Given a root `AGENTS.md` holding a `## Delegation` section whose first paragraph is a wording in `references/delegation.history.md` verbatim
    And two further paragraphs under that same heading appear in no wording in that file
    And the root `AGENTS.md` also holds the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    When the agent runs the `enhance` skill
    Then the offer names each of those two paragraphs
    And the offer says the replacement would remove them
    And `AGENTS.md` is unchanged until the owner answers

  @behavior
  Scenario: replaces only that section and leaves the rest of the file byte-identical
    Given a root `AGENTS.md` holding a build-commands section, a `## Delegation` section identical to a wording in `references/delegation.history.md`, and a code-style section
    And the `enhance` skill has offered the current `## Delegation` text as a replacement
    When the owner approves it
    Then the `## Delegation` section holds the text inside the fence in `references/delegation.md`
    And the build-commands section and the code-style section are byte-identical to what they were before the run

  @behavior
  Scenario: works on the directory the invocation named
    Given a repository at a path that is not the working directory
    And that repository holds a root `AGENTS.md` with a build-commands section and a code-style section
    When the agent runs the `enhance` skill with `--root` naming that path
    Then any repository `AGENTS.md` an offer names is the one at that path
    And no file outside that repository is read as its merged view

  @behavior
  Scenario: reports the run whichever way it went
    Given a repository the `enhance` skill has been run in
    When the run reaches any of its outcomes
    Then the report names the files it read
    And the report names what was written, or states that nothing was

  @behavior
  Scenario: writes to no file other than the root AGENTS.md
    Given a root `AGENTS.md` and a `packages/api/AGENTS.md` holding a `## Delegation` section identical to a wording in `references/delegation.history.md`
    When the agent runs the `enhance` skill
    Then `packages/api/AGENTS.md` is byte-identical to what it was before the run
    And no offer names `packages/api/AGENTS.md` as a target

  @behavior
  Scenario: changes no file outside the repository's agent configuration
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    And a `.github/workflows/ci.yml` naming an agent harness
    When the agent runs the `enhance` skill
    Then `.github/workflows/ci.yml` is byte-identical to what it was before the run
    And no offer names a file in the repository outside its agent configuration

  @behavior
  Scenario: offers the text as written rather than adapted to the repository
    Given a root `AGENTS.md` whose prose is written in the second person plural
    When the agent runs the `enhance` skill
    Then the offered `## Delegation` text is byte-identical to the text inside the fence in `references/delegation.md`
    And no reworded variant of it is offered

  # ── /buddy-agent-harness:enhance — the List identifiers addition ──

  @behavior
  Scenario: offers the List identifiers addition the merged view does not cover
    Given a root `AGENTS.md` holding a build-commands section and a code-style section
    When the agent runs the `enhance` skill
    Then the `## List identifiers` section is offered
    And the offered `## List identifiers` text is byte-identical to the text inside the fence in `references/list-identifiers.md`

  @behavior
  Scenario: offers each addition on its own
    Given a root `AGENTS.md` covering neither delegation nor list identifiers
    And the `enhance` skill has offered the `## Delegation` section and the `## List identifiers` section
    When the owner approves the `## List identifiers` section for the repository and declines the `## Delegation` section
    Then `AGENTS.md` carries the `## List identifiers` section
    And `AGENTS.md` carries no `## Delegation` section

  @behavior
  Scenario: does not count a numbered-list style rule for documents as covering list identifiers
    Given a root `AGENTS.md` whose only list guidance is a `## Docs style` line saying to use numbered lists for sequential steps in documentation
    When the agent runs the `enhance` skill
    Then the `## List identifiers` section is offered

  @behavior
  Scenario: withholds List identifiers where the owner's own words cover it
    Given a root `AGENTS.md` holding a `## Answering the user` section written by the repository owner
    And that section says to number each option put to the user and to keep those numbers when the options are revised
    And no sentence of it appears verbatim in the text `references/list-identifiers.md` offers
    And the root `AGENTS.md` also holds the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then no `## List identifiers` section is offered
    And the report names the `## Answering the user` section as what covers the subject
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers nothing where the file already carries the current List identifiers text
    Given a root `AGENTS.md` holding the `## List identifiers` section exactly as `references/list-identifiers.md` offers it
    And the root `AGENTS.md` also holds the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then no `## List identifiers` section is offered
    And the report says the section is already the text the addition offers
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: judges a List identifiers section it did not write as the owner's own while the addition has no retired wording
    Given a root `AGENTS.md` holding a `## List identifiers` section that tells the agent to label list items
    And no sentence of it appears verbatim in the text `references/list-identifiers.md` offers
    And its sentences do not follow the order of that text
    And `references/list-identifiers.history.md` names no retired wording
    And the root `AGENTS.md` also holds the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then no replacement is offered
    And the report says the section was judged the owner's own
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers the current List identifiers text where that text was edited in place
    Given a root `AGENTS.md` holding a `## List identifiers` section carrying two sentences of the text `references/list-identifiers.md` offers verbatim
    And that section keeps the sentence order of that text
    And its remaining sentences are that text's, reworded
    And `references/list-identifiers.history.md` names no retired wording
    And the root `AGENTS.md` also holds the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then the report does not describe the `## List identifiers` section as the owner's own words
    And the current `## List identifiers` text is offered as a replacement for the `## List identifiers` section
    And `AGENTS.md` is unchanged until the owner answers

  @behavior
  Scenario: puts a reworded List identifiers text to the owner without offering measurement
    Given a root `AGENTS.md` holding a `## List identifiers` section of five sentences
    And each does the job of the sentence at that position in the text `references/list-identifiers.md` offers
    And no sentence of that text appears in it verbatim
    And `references/list-identifiers.history.md` names no retired wording
    And the repository has the `eval-delegation` harness for scoring `## Delegation` wordings
    And the root `AGENTS.md` also holds the `## Delegation` section exactly as `references/delegation.md` offers it
    When the agent runs the `enhance` skill
    Then the report says the section cannot be placed
    And the owner is asked whether the section is theirs
    And the `eval-delegation` harness is not offered as an answer for the `## List identifiers` section
    And the report says settling it by measurement would need a harness this repository does not have
    And no replacement is offered ahead of that answer
    And `AGENTS.md` is unchanged

  @behavior
  Scenario: offers the List identifiers replacement when the owner says the section came from this package
    Given the `enhance` skill has asked the owner whether a `## List identifiers` section is theirs
    When the owner answers that it is an edited copy of this package's text
    Then the current `## List identifiers` text is offered as a replacement for that section

  @behavior
  Scenario: recommends the owner's global file for List identifiers
    Given a root `AGENTS.md` the `## List identifiers` section is absent from
    When the `## List identifiers` section is offered
    Then the owner's own global instruction file is recommended over the repository's `AGENTS.md`
    And the repository's `AGENTS.md` is named as the alternative, with what each destination reaches

  @behavior
  Scenario: reports a verdict for every addition
    Given a repository the `enhance` skill has been run in
    When the run reaches any of its outcomes
    Then the report gives a verdict for the `## Delegation` addition
    And the report gives a verdict for the `## List identifiers` addition

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
  Scenario: keeps every wording it has retired
    Given the shipped `references/delegation.md`
    When the file is read
    Then it carries a `## Stale when` section directing the comparison at `references/delegation.history.md`
    And that file holds the wording this addition offered before its current one

  @behavior
  Scenario: stores a retired wording exactly as it was offered
    Given a revision that replaces an addition's offered text
    When the revision ships
    Then the outgoing wording is in the addition's history file byte-identical to the text it used to offer

  @behavior
  Scenario: leaves an addition that has never been revised with an empty history
    Given a new addition shipping its first wording
    When the addition ships
    Then its history file names no retired wording

  @behavior
  Scenario: states what already covers the List identifiers subject
    Given the shipped `references/list-identifiers.md`
    When the file is read
    Then it carries a `## Covered when` section
    And that section names at least one shape of existing prose that counts as the subject being present
    And that section names at least one shape of list guidance that does not count

  @behavior
  Scenario: points the List identifiers stale check at its own history file
    Given the shipped `references/list-identifiers.md`
    When the file is read
    Then it carries a `## Stale when` section directing the comparison at `references/list-identifiers.history.md`

  @behavior
  Scenario: offers List identifiers text that says what the issue asked for
    Given the shipped `references/list-identifiers.md`
    When the text inside its fence is read
    Then it directs the agent to label every list it presents to the user
    And it directs a letter or number sequence for a plain list
    And it directs a prefix naming the kind for a list whose items are all one kind
    And it directs that a revised list keeps each item's label, reuses no removed label, and gives a new item the next label
    And it names no model, vendor, or version

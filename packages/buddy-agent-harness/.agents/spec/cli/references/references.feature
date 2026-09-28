@frozen
Feature: Read references by name through layered tiers

  # ── tiers ──

  @behavior
  Scenario: resolves managed over project over user over plugin
    Given one reference name held by the managed, project, user, and plugin tiers, each `first-wins`
    When the command shows it
    Then the managed document answers
    And removing each answering tier in turn hands the answer to the next in that order

  @behavior
  Scenario: falls through to the highest tier that holds the name
    Given a name held only by the user and plugin tiers
    When the command shows it
    Then the user document answers

  @behavior
  Scenario: orders the managed layers references, then governances, then the deprecated one
    Given a name held by the managed `references/`, the managed `governances/`, and the deprecated machine-wide folder
    When the command shows it
    Then the managed `references/` document answers
    And removing it hands the answer to `governances/`, then to the deprecated folder

  @behavior
  Scenario: passes over a layer that is not a folder and asks the next
    Given a project `.agents/references` that is a file, and a user document of the name
    When the command shows it
    Then the user document answers and the command exits 0

  @behavior
  Scenario: resolves local above project and below managed
    Given one reference name held by the managed, local, and project tiers, each `first-wins`
    When the command shows it
    Then the managed document answers
    And removing it hands the answer to local, then removing local hands it to project

  @behavior
  Scenario: walks the project tier up to the workspace root, the nearest layer first
    Given a root two folders below a `pnpm-workspace.yaml`, and a document of one name at the root, at the workspace root, and above it
    When the command shows the name
    Then the root's document answers, and removing it hands the answer to the workspace root's
    And the project layers are listed nearest first, one pair per folder of the walk
    And no document above the workspace root is reported

  @behavior
  Scenario: stops the walk at the git root or a package.json declaring workspaces
    Given a root below a folder holding `.git`, or a `package.json` with `workspaces`
    When the command shows a name held only above that folder
    Then it is missing

  @behavior
  Scenario: reads the root alone when no repository root is above it
    Given a root with no `.git` or workspace marker above it, and a parent folder holding a document
    When the command shows that document's name
    Then it is missing

  @behavior
  Scenario: reads a local layer at every level of the walk, above every project layer
    Given a project document at the root and a local document of the name at the workspace root
    When the command shows it
    Then the local document answers

  @behavior
  Scenario: reads a declared dependency's references as a plugin
    Given a dependency declared in the nearest `package.json` that ships `references/testing.md`
    When the command shows `testing`
    Then that document answers from the plugin tier, named by the dependency

  @behavior
  Scenario: never reads a package the repository did not declare
    Given an installed package shipping `references/` that the nearest `package.json` does not declare
    When the command lists the references
    Then none of its documents are reported

  @behavior
  Scenario: reports a name two plugins hold as ambiguous, naming both
    Given two plugins each shipping `testing` and no higher tier holding it
    When the command shows `testing`
    Then the entry is ambiguous and names `<plugin>/testing` for both
    And the command exits non-zero

  @behavior
  Scenario: resolves a qualified name at that plugin, with the tiers above still overriding it
    Given two plugins each shipping `testing`
    When the command shows `<plugin>/testing` for one of them
    Then that plugin's document answers
    And a project `testing` document added afterwards answers instead

  @behavior
  Scenario: answers a qualified name from the tiers above when the plugin is not a dependency
    Given a project `testing` document and no dependency named `other`
    When the command shows `other/testing`
    Then the project document answers
    And the trace reports the plugin layer as missing

  # ── file names ──

  @behavior
  Scenario: resolves each file-name candidate
    Given a layer holding the name as `<name>.md`, `<name>/README.md`, `<name>/index.md`, or `<name>/SKILL.md`, one at a time
    When the command shows it
    Then each form answers, and the trace names the candidate that matched

  @behavior
  Scenario: prefers the earlier candidate in one layer and warns
    Given a layer holding both `<name>.md` and `<name>/README.md`
    When the command shows it and lists the references
    Then `<name>.md` answers
    And both commands warn that the other candidate is ignored

  # ── merge modes ──

  @behavior
  Scenario: returns the highest document whole and shadows the rest
    Given a project document with no `merge` field over a user document of the same name
    When the command shows it
    Then the output is the project document alone
    And the user layer is reported as shadowed by project (first-wins)

  @behavior
  Scenario: returns every layer whole, labeled, highest first
    Given a project document with `merge: combine` over a user document
    When the command shows it
    Then the output holds a note that the first layer wins on conflict
    And the project document then the user document, each under a label naming its tier and path

  @behavior
  Scenario: replaces a matched section and its subsections
    Given a project document with `merge: merge-sections` holding `## Testing` over a user document whose `## Testing` has subsections
    When the command shows it
    Then `## Testing` holds the project body and none of the user subsections
    And the user document's other sections remain in their order

  @behavior
  Scenario: keeps both bodies and merges subsections when a section says combine
    Given a merge-sections overlay whose `## Testing` starts with `<!-- merge: combine -->`
    When the command shows it
    Then `## Testing` holds the base body followed by the overlay body
    And matching subsections are merged by the same rules

  @behavior
  Scenario: drops a section marked remove
    Given a merge-sections overlay whose `## Legacy` starts with `<!-- merge: remove -->`
    When the command shows it
    Then the output has no `## Legacy` section

  @behavior
  Scenario: appends a new section after its last sibling, keeping base order
    Given a merge-sections overlay adding `### New` under `## Testing`, which the base does not have
    When the command shows it
    Then `### New` follows the last existing subsection of `## Testing`
    And every base section keeps its order

  @behavior
  Scenario: ignores headings inside code fences
    Given a merge-sections overlay and base with `## Testing` written inside a fenced code block
    When the command shows it
    Then the fenced line is body text, not a section

  @behavior
  Scenario: matches headings regardless of case and surrounding whitespace
    Given a base `## Testing` and an overlay `##   testing  `
    When the command shows it with merge-sections
    Then the overlay section replaces the base one

  @behavior
  Scenario: treats text before the first heading as its own section
    Given a base and a merge-sections overlay, each with text before the first heading
    When the command shows it
    Then the overlay's leading text replaces the base's
    And an overlay with no leading text keeps the base's

  @behavior
  Scenario: warns when a merge comment matches nothing or a heading path repeats
    Given a merge-sections overlay with `<!-- merge: remove -->` on a section the base lacks, over a base with `## Testing` twice
    When the command shows it
    Then it warns about the unmatched remove and about the repeated heading path
    And the overlay's `## Testing` replaces the first occurrence only

  @behavior
  Scenario: applies layers bottom-up
    Given a plugin document, a user document with `merge: merge-sections`, and a project document with `merge: merge-sections`
    When the command shows it
    Then the user sections apply over the plugin document and the project sections apply over that result

  @behavior
  Scenario: adds a trailing newline when the document has none
    Given a document whose file does not end in a newline
    When the command shows it as text
    Then stdout ends on exactly one newline

  @behavior
  Scenario: adds no second newline when the document has one
    Given a document whose file ends in one newline
    When the command shows it as text
    Then stdout is the document byte for byte, ending on that one newline

  @behavior
  Scenario: strips frontmatter and merge comments from text output and returns frontmatter as metadata
    Given a document with frontmatter and a merge comment under a heading
    When the command shows it as text and as JSON
    Then neither the frontmatter nor the merge comment is in the text
    And the JSON entry carries the frontmatter as `metadata`

  @behavior
  Scenario: treats an unknown merge mode as first-wins, with a warning
    Given a project document with `merge: overlay` over a user document
    When the command shows it
    Then the project document answers alone
    And a warning names the unknown mode

  # ── the monorepo walk and final ──

  @behavior
  Scenario: merges project layers farthest first, then local
    Given a workspace-root document, a `merge-sections` document at the root, and a `merge-sections` local document
    When the command shows the name
    Then each section comes from the nearest layer that holds it, local over the root over the workspace root

  @behavior
  Scenario: blocks a local override of a final project reference, and says so in the trace and the listing
    Given a project document with `final: true` and a local document of the name
    When the command shows it with `--trace`, and lists the references
    Then the project document answers
    And the local layer's trace step and listing row read `blocked by final in project`

  @behavior
  Scenario: blocks a local override when any project layer of the walk is final
    Given a `final` workspace-root document, a root document, and a local document of the name
    When the command shows it
    Then the root's project document answers

  @behavior
  Scenario: leaves the managed tier above a final project reference
    Given a `final` project document and a managed document of the name
    When the command shows it
    Then the managed document answers

  @behavior
  Scenario: ignores final outside the project tier, with a warning
    Given a plugin document with `final: true` and a local document of the name
    When the command shows it
    Then the local document answers, and a warning says `final` is ignored in the plugin tier

  @behavior
  Scenario: reads a final that is not true or false as false, with a warning
    Given a project document whose `final` is neither true nor false, and a local document of the name
    When the command shows it
    Then the local document answers, with a warning

  # ── show output ──

  @behavior
  Scenario: writes a single document and nothing else
    Given one name that resolves
    When the command shows it as text
    Then stdout holds the document, ending on a newline, and nothing else
    And the command exits 0

  @behavior
  Scenario: writes several documents between delimiters in the order asked
    Given three names that resolve
    When the command shows `c a b` as text
    Then stdout holds three `<reference name="…">` blocks in the order c, a, b

  @behavior
  Scenario: reports a missing name in place and exits non-zero
    Given two names that resolve and one that does not
    When the command shows all three as text
    Then the missing one appears in its place as a `status="missing"` marker
    And its reason is on stderr, the two found documents are on stdout, and the command exits non-zero

  @behavior
  Scenario: returns an array in the order asked
    Given two names, one found and one missing
    When the command shows them as JSON
    Then stdout is an array of two entries in that order, with `status` `found` and `missing`

  @behavior
  Scenario: suggests close names on a miss and never answers with one
    Given a reference named `testing` and a request for `testin`
    When the command shows `testin`
    Then nothing answers, `testing` is suggested, and the command exits non-zero

  @behavior
  Scenario: traces every path checked, the candidate, the merge mode, and why a layer was dropped
    Given a name held by a project and a user layer, with other layers empty
    When the command shows it with `--trace` as JSON
    Then the trace lists every layer path checked, found or missing
    And the found ones name their candidate file and merge mode, and the dropped one says shadowed by project (first-wins)

  @behavior
  Scenario: writes the trace to stderr in text so stdout stays the document
    Given a name that resolves
    When the command shows it with `--trace` as text
    Then stdout holds the document alone and the trace is on stderr

  @behavior
  Scenario: rejects a name that is a path
    Given a name holding a parent-directory segment, a backslash, or a `.md` suffix
    When the command shows it
    Then it writes to stderr what a reference name is, reads no file, and exits non-zero

  @behavior
  Scenario: rejects an unsupported output format
    Given a command line naming a format the command does not support
    When the command shows, lists, or searches
    Then it writes the reason to stderr, nothing to stdout, and exits non-zero

  # ── list ──

  @behavior
  Scenario: lists every layer in precedence order, with the legacy layers marked
    Given a repository holding one project reference
    When the command lists the references
    Then the layers are reported managed, local, project, user, plugin, in that order
    And each legacy `governances/` layer and the deprecated machine-wide layer carries a status saying where its documents belong

  @behavior
  Scenario: marks shadowed layers in the listing
    Given one name held by a project and a user layer
    When the command lists the references
    Then the project row is used and the user row is shadowed by project (first-wins)

  @behavior
  Scenario: states the zero when no layer holds a reference
    Given a repository whose reference folders are all empty
    When the command lists the references
    Then the section holds a sentence stating that zero were found, and the command exits 0

  # ── search ──

  @behavior
  Scenario: ranks exact name, prefix, close name, description, heading, then body
    Given references matching one query by exact name, name prefix, a close name, description, heading, and body
    When the command searches for it
    Then they are reported in that order, each with its name, tier, match kind, and description

  @behavior
  Scenario: states the zero when nothing matches
    Given a repository holding one reference about testing
    And a query for a word it does not contain
    When the command searches for it
    Then the result states that zero matched, and the command exits 0

  # ── legacy ──

  @behavior
  Scenario: reads legacy governances folders below references in the same tier
    Given a project `.agents/governances/testing.md` and, separately, the same name in both project folders
    When the command shows `testing`
    Then the governances document answers when it is alone
    And the references document answers when both hold it

  @behavior
  Scenario: keeps the governance command working, with a deprecation note
    Given a project override in `.agents/governances/`
    When the agent runs `governance show` and `governance list`
    Then stdout and the exit code are what they were before references existed
    And stderr carries one line saying to use `reference` instead

# enhance-buddy-agent-harness: decision graph

The decisions the [enhance-buddy-agent-harness spec](./README.md) makes, as an observer sees them. A run judges each addition twice: its
section in the repository (the repository graph) and any copy in the global instructions (the global-copy graph). The
combination table says what the two verdicts together offer. Double-bordered nodes are outcomes.

## A repository section

Asked once per addition. `start` is shared by every addition of a run.

```mermaid
flowchart TD
  start([A run starts]) -->|E1 no root AGENTS.md| stopped[[Stopped: nothing to add to]]
  start -->|E2 a root AGENTS.md exists| cov{Does the merged view cover this addition?}
  cov -->|E3 no| uncovered[[Not covered: see the combination table]]
  cov -->|E4 yes| cur{Does the covering section carry the current text?}
  cur -->|E5 yes| current[[Already current]]
  cur -->|E6 no| prov{The two provenance questions}
  prov -->|E7 both no| own[[The owner's own]]
  prov -->|E8 both yes| where{Is the section in the root AGENTS.md?}
  prov -->|E9 they disagree| harn{Does the repository have a scoring harness for this addition?}
  harn -->|E10 yes| ask3[Put three answers]
  harn -->|E11 no| ask2[Put two answers and say measurement is unavailable]
  ask3 -->|E12 the owner answers| ans{The owner's answer}
  ask2 -->|E13 the owner answers| ans
  ans -->|E14 it is theirs, or no answer| left[[Left alone]]
  ans -->|E15 it came from this package| where
  ans -->|E16 settle it by measurement, offered only with three answers| score{Does the current text score higher?}
  score -->|E17 yes| where
  score -->|E18 no| kept[[Kept, both scores reported]]
  where -->|E19 no| elsewhere[[Reported by file, no offer]]
  where -->|E20 yes| stale[[From a retired wording in the root AGENTS.md: see the combination table]]
```

## A global copy

Asked once per addition, of the global instructions, whatever the repository graph decided.

```mermaid
flowchart TD
  g0{What do the global instructions hold on this subject?} -->|E21 nothing| gnone[[No global copy]]
  g0 -->|E22 a text that carries the current text| gcur[[Global copy is current]]
  g0 -->|E23 a section in another form| gprov{The two provenance questions, asked of the global copy}
  gprov -->|E24 both no| gown[[Global copy is the owner's own, left alone]]
  gprov -->|E25 both yes| gstale{Global copy from a retired wording: is it in the global instruction file?}
  gprov -->|E26 they disagree| gask{The owner's answer, among those the repository allows}
  gask -->|E27 it came from this package, or measurement puts the current text ahead| gstale
  gask -->|E28 it is theirs, no answer, or measurement does not| gkept[[Global copy left alone]]
  gstale -->|E57 yes| grepl[Current text offered as its replacement]
  gstale -->|E58 no, a harness's own file or one the run cannot see| ghanded[[Current text handed over for that file]]
  grepl -->|E59 approved| greplaced[[Global copy replaced in place]]
  grepl -->|E60 declined, or no answer| gnothing[[Nothing written]]
```

## Combination table

The repository verdict and the global-copy verdict together decide what is offered for the repository. A covered
repository verdict beside no global copy, or beside the owner's own or an unplaced one, takes the repository outcome
alone, except as X8 says.

| ID | Repository | Global copy | What the run does |
| --- | --- | --- | --- |
| X1 | not covered | none | the addition is offered (offer graph) |
| X2 | not covered | current | already global: nothing offered; a team copy is the owner's to ask for |
| X3 | not covered | the owner's own, from a retired wording, or unplaced | no repository offer; the global copy takes its own outcome; a team copy is the owner's to ask for |
| X4 | already current | current | nothing offered; the duplicate is named |
| X5 | from a retired wording in the root `AGENTS.md` | none, the owner's own, or unplaced | the replacement is offered |
| X6 | from a retired wording in the root `AGENTS.md` | current | the replacement is offered, with removal as the other answer |
| X7 | the owner's own | current | nothing offered; both are named, and the owner loads the subject twice |
| X8 | any covered verdict | from a retired wording | the repository row applies as if there were no global copy, and the global copy takes its own outcome |

## Offers and writes

```mermaid
flowchart TD
  offer[An addition offered with its destination] -->|E29 the repository is picked| wrote[[Written to the root AGENTS.md]]
  offer -->|E56 the global file is picked| wroteGlobal[[Written to the end of the global instruction file]]
  offer -->|E31 declined, or no answer| nothing[[Nothing written]]
  team{Does the owner ask for a team copy?} -->|E35 yes| wrote
  team -->|E36 no, or no answer| nothing
  repl[A replacement offered] -->|E32 approved| replaced[[Section replaced in place]]
  repl -->|E33 declined, or no answer| nothing
  repl -->|E34 removal picked, offered only under X6| removed[[Section removed]]
  repl -->|E61 the merged text picked, offered only where the owner added sentences| merged[[Section replaced by the merged text]]
```

## Whether the harness in use loads the global file

Read from `doctor`'s report for the harness in use, when an offer names the global destination. D4 holds whatever
else the report says.

| ID | `doctor` reports for the harness in use | The offer |
| --- | --- | --- |
| D1 | it loads the global instruction file | says so; no bridging step |
| D2 | it does not load it, through a missing or unbridged user-scope file | says the text reaches no session until it does; hands over the bridging step |
| D3 | it reads another file in place of its user-scope file | says so; hands over moving that file's content into the global file and removing it |
| D4 | its user-scope location comes from an empty variable | says the location changes with each directory; hands over unsetting the variable |
| D5 | nothing | says the load cannot be confirmed |
| D6 | it cannot load a file, keeping its user rules outside one | says the text reaches it only pasted into its user rules; hands over that step |

## Shipping an addition

```mermaid
flowchart TD
  author[An addition authored or revised] -->|E40 its text names a model, vendor, or version| rejected[[Rejected]]
  author -->|E41 it names none| retire{Does the change retire a wording?}
  retire -->|E42 yes| stored[Outgoing wording stored verbatim, eval cases added for the revision shape]
  retire -->|E43 no| offerable[[Can be offered]]
  stored -->|E44 then| offerable
```

E50 to E55 are retired: the agent-worktree offers moved to
[agent-worktree-settings](../agent-worktree-settings/graph.md). A retired edge ID is never reused.

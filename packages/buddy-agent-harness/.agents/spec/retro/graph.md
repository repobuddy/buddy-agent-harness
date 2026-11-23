# retro: decision graph

The decisions the [retro spec](./README.md) makes, as an observer sees them. Double-bordered nodes are outcomes.

## A retrospective

`start` is shared by an attended run (UC1) and an unattended one (UC6). The candidate steps repeat per candidate.

```mermaid
flowchart TD
  start([A run starts]) -->|E1 not inside a git repository| stopped[[Stopped, nothing written]]
  start -->|E19 no user, and waiting proposals are unreviewed| skipped[[Skipped, the skip recorded]]
  start -->|E2 otherwise: read the sources since the last run| grade{Earlier accepted changes: signal seen?}
  grade -->|E4 seen, or cannot be told yet| graded[Graded in the report]
  grade -->|E5 contradicted| cand
  graded --> found{Did any source hold anything?}
  found -->|E3 no| report
  found -->|E34 yes| cand{Challenge the candidate}
  cand -->|E7 resolved, covered, or changes nothing| dropped[[Dropped, counted with its reason]]
  cand -->|E8 matches a rejection, no newer evidence| dropped
  cand -->|E9 survives| form[Pick the cheapest durable form; recurrence one rules out an always-loaded line]
  form -->|E10 proposal built| who{Is there a user?}
  who -->|E18 no| waiting[[Left as a waiting proposal]]
  who -->|E6 yes, waiting proposals first| ask{The owner's answer to this proposal}
  ask -->|E12 approved| accepted[[Written, recorded accepted with its signal]]
  ask -->|E13 declined| rejected[[Nothing written, recorded rejected with its reason]]
  ask -->|E14 no answer| undecided[[Nothing written, no decision recorded]]
  accepted --> report
  rejected --> report
  undecided --> report
  dropped --> report
  waiting --> report
  report[[Run recorded, report given]]
```

## The prune pass

Part of every attended run (UC2), before the report.

```mermaid
flowchart TD
  prune([Read the instruction lines and standards]) -->|E16 a check enforces it, or the code contradicts it| del[Proposed for deletion, then answered as in E12 to E14]
  prune -->|E17 nothing outgrown| none[[No deletion proposed]]
```

## The due check

UC3. Nothing on this graph writes a file.

```mermaid
flowchart TD
  due([An agent finishing a task checks]) -->|E20 no user in the run| quiet[[Nothing said]]
  due -->|E35 a user| setting{Can the retro setting be read?}
  setting -->|E22 unreadable or invalid: the default applies, and the agent says so| mode
  setting -->|E32 none set: remind, 7 days| mode
  setting -->|E36 readable| mode{Mode, and the opt-out}
  mode -->|E21 off, or opted out| quiet
  mode -->|E37 remind or offer| wait{Are proposals waiting?}
  wait -->|E23 yes| named[[Waiting proposals named; offered in offer mode]]
  wait -->|E38 no| last{Last retrospective}
  last -->|E24 within the frequency| quiet
  last -->|E25 none recorded, or the frequency has passed| heard{Already heard this session?}
  heard -->|E26 yes| quiet
  heard -->|E27 no, remind| reminded[[Told one is due and how to start it]]
  heard -->|E28 no, offer| offered[[Offered; starts only on a yes]]
```

## Changing the setting, leaving a lesson

```mermaid
flowchart TD
  set([The owner asks to change the setting]) -->|E30 a mode, or a positive whole number of days| stored[[Stored; the next due check uses it]]
  set -->|E31 anything else| refused[[Refused, the setting unchanged]]
  inbox([An agent leaves a lesson]) -->|E33| noted[[In the learnings inbox; nothing in the setup written]]
```

# init-buddy-agent-harness decision graph

The decisions one run of the skill makes, as the owner and a reviewer of the result can observe them. The branch at
`classify` is taken once for each artifact the survey finds, and the branch at `step` once for each step of the plan.

```mermaid
flowchart TD
  invoke[Skill invoked, flags read from the invocation] -->|E1| survey[Survey the repository, writing nothing]
  survey -->|E2| classify{Which kind of artifact is it?}
  classify -->|E3 already canonical, a nested AGENTS.md, or already linked| left([Left as it stands and reported])
  classify -->|E4 a superseded bridge| plan
  classify -->|E5 authored instruction content in a harness file| plan
  classify -->|E6 a personal override| plan
  classify -->|E7 a single-harness artifact with a candidate| plan
  classify -->|E8 no candidate, or no lossless mapping| left
  classify -->|E9 a skill or command to move| plan
  survey -->|E10 no root AGENTS.md with authored content| derive{Does any derived line survive?}
  derive -->|E11 yes| plan
  derive -->|E12 no: a heading and one line| plan
  survey -->|E13 Claude Code in use and an agent-worktree setting uncovered| plan
  survey -->|E14 Claude Code not in use, or the setting covered| left
  plan[Plan presented] -->|E15| step{Does the step replace, rewrite, or remove an authored file, or add material content?}
  step -->|E16 no: it creates what is absent, or writes the non-material region| apply
  step -->|E17 yes| ask{Did the owner approve it?}
  ask -->|E18 yes| apply[Approved and unasked steps applied]
  ask -->|E19 no| declined[That write dropped, the other steps go on]
  declined -->|E20| apply
  apply -->|E21| run[init command run]
  run -->|E22 a conflicting target reported| resolve[That target resolved with the owner]
  resolve -->|E23| run
  run -->|E24 no conflict| bridge{Does the repository now have a skills bridge?}
  bridge -->|E25 yes, and the region markers are not present and empty| region[Region written or restored]
  bridge -->|E26 yes, and the region markers are present and empty| verify
  bridge -->|E27 no| verify
  region -->|E32| verify[Verify projections and migrated skills]
  verify -->|E28 verified| formatter{Does the repository have its own formatter?}
  formatter -->|E29 yes| format[Formatter run over the written files]
  format -->|E30| done([Run reported, enhance offered once])
  formatter -->|E31 no| done
```

- Outcomes: `left` and `done`.
- The instruction bridge for Gemini CLI and the approved removals are steps of `apply`; whether each needs approval is
  decided at `step`.

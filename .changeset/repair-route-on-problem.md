---
'buddy-agent-harness': patch
---

Route the `repair` skill's family split on the finding's `problem` name.

The skill told an agent that every `doctor` finding's repair in `help` names a skill, and to decide the `init`/`repair` split on that name. It does not: `help` carries the command rendering of a repair, which names a shell invocation for every bridge finding and nothing at all for every MCP finding. Only the instruction and configuration families name a skill there — eight of twenty-seven problems — so an agent following the rule literally had no match and no stated fallback for the other nineteen, including the whole MCP family, which the skill never mentioned.

Routing is now on `problem`, which every finding carries and which `references/classes.md` is keyed by: a `problem` with a section there is the skill's, and one without it is not. Who a handed-on finding goes to is read off its repair — `init` where the repair names it, a person where it names no skill — and the skill now says outright that an owner is never to be inferred.

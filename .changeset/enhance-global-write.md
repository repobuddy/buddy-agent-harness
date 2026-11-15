---
"buddy-agent-harness": minor
---

`enhance` now asks, for each addition, whether to write it to your global `~/.agents/AGENTS.md` or to the repository's `AGENTS.md`. It leads with the destination the addition recommends. If you pick the global file, it writes the section at the end of `~/.agents/AGENTS.md`, creating the file if needed, instead of handing you the text. A retired wording in `~/.agents/AGENTS.md` is offered the current text in its place, and replaced on your yes. Steps that bridge a harness's own user-scope file, and a global copy kept in such a file, are still handed over.

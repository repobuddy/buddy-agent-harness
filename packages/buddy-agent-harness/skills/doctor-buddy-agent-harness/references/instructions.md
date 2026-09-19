<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Instruction findings

Two shapes, one section. A **bridge** is what a harness needs before it can read `AGENTS.md` at all — Gemini CLI is the only one left that needs one. A **shadow** is the reverse: a file sitting beside an `AGENTS.md` that a harness reading it natively prefers, so the canonical file is never read. Claude Code is the case, and the files are `CLAUDE.md`, `.claude/CLAUDE.md`, and `CLAUDE.local.md`.

| Finding | What it means | Repair |
| --- | --- | --- |
| `no-instructions` | no AGENTS.md at the repository root, so the instructions this repository has reach one harness at most | run `/buddy-agent-harness:init-buddy-agent-harness`, which consolidates or derives AGENTS.md |
| `instructions-missing` | no instruction bridge at this path — the harness reads none of AGENTS.md | run `/buddy-agent-harness:init-buddy-agent-harness` |
| `instructions-unbridged` | the file is present but names AGENTS.md nowhere — the harness reads none of it | run `/buddy-agent-harness:init-buddy-agent-harness`, which adds the bridge without discarding what the file already says |
| `instructions-shadowing` | this file suppresses the AGENTS.md beside it — the harness reads this instead, and none of AGENTS.md | run `/buddy-agent-harness:init-buddy-agent-harness`, which consolidates the file into AGENTS.md or imports AGENTS.md from it |
| `instructions-superseded` | a bridge from before the harness read AGENTS.md itself — it still works, and nothing needs it | run `/buddy-agent-harness:init-buddy-agent-harness`, which offers to remove it |
| `instructions-unreadable` | the settings file does not parse, so the harness reads none of it | fix the JSON by hand, then run `/buddy-agent-harness:init-buddy-agent-harness` |

`unbridged` is the one to read carefully. The file is there and looks fine, and it names `AGENTS.md` nowhere — a `.gemini/settings.json` another tool rewrote without `AGENTS.md` in `context.fileName`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

`shadowing` is the same failure from the other direction, and the most expensive finding in this section: nothing is missing, nothing looks wrong, and the harness is reading a file the rest of the repository does not maintain. Consolidate what the file says into `AGENTS.md`, or — where the file has to stay, as a gitignored `CLAUDE.local.md` does — put an `@AGENTS.md` import in it so both load.

`superseded` is not a fault. It is the bridge this tool used to write, still working and no longer needed, and there is one reason to keep it: sessions that cannot read `AGENTS.md` directly — a Claude Code before v2.1.277, a third-party provider such as Amazon Bedrock, telemetry disabled, or hooks disabled. Offer the removal; do not make it.

Shadows are reported per directory holding an `AGENTS.md`, so a monorepo gets one row per suppressed file rather than one per repository. A `CLAUDE.md` in one subtree says nothing about another.

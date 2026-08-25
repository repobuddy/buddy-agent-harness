<!-- Generated from src/diagnose-bridges/doctor-guidance.ts by scripts/generate-skills.ts. Do not edit by hand. -->

# Instruction bridge findings

| Finding | What it means | Repair |
| --- | --- | --- |
| `no-instructions` | no AGENTS.md at the repository root, so every instruction bridge points at nothing | run `/buddy-agent-harness:init`, which derives AGENTS.md and the bridges to it |
| `instructions-missing` | no instruction bridge at this path — the harness reads none of AGENTS.md | run `/buddy-agent-harness:init` |
| `instructions-unbridged` | the file is present but names AGENTS.md nowhere — the harness reads none of it | run `/buddy-agent-harness:init`, which adds the bridge without discarding what the file already says |
| `instructions-unreadable` | the settings file does not parse, so the harness reads none of it | fix the JSON by hand, then run `/buddy-agent-harness:init` |

`unbridged` is the one to read carefully. The file is there and looks fine, and it names `AGENTS.md` nowhere — a `CLAUDE.md` someone overwrote with real content, or a `.gemini/settings.json` another tool rewrote without `AGENTS.md` in `context.fileName`. Never fix it by replacing the file: the content that displaced the bridge may be the only copy of something.

An instruction bridge is reported per file, so a monorepo gets one row per `AGENTS.md` in the tree. Each nested `AGENTS.md` needs its own stub — an import bridges the file beside it and nothing deeper.

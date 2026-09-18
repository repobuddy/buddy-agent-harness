---
"buddy-agent-harness": major
---

Rename the two shipped skills: `init` is now `init-buddy-agent-harness`, and `doctor` is now `doctor-buddy-agent-harness`.

A skill name is global to the harness that loads it, so `init` and `doctor` were the two most collidable names this package could have claimed. Every harness that installs plugins puts their skills in one namespace, and a second plugin shipping an `init` skill either loses to this one or wins over it, with no signal either way. Qualifying both names with the plugin they come from ends that.

The invocations change accordingly: `/buddy-agent-harness:init-buddy-agent-harness` and `/buddy-agent-harness:doctor-buddy-agent-harness`. Every repair `doctor` states for a bridge or an instruction finding names the new skill invocation, so an agent routing on that string is carried across; the shipped skill folders moved to `skills/init-buddy-agent-harness/` and `skills/doctor-buddy-agent-harness/`, which is a breaking change for anything referencing those paths directly.

**The CLI subcommands are untouched.** `buddy-agent-harness init` and `buddy-agent-harness doctor` keep their names, and so do their flags, their output, and their exit codes: a subcommand is scoped to the binary that owns it and collides with nothing. The two are now deliberately different strings, which is why the launcher table maps a skill to its subcommand rather than deriving one from the other.

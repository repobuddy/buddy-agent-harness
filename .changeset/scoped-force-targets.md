---
'buddy-agent-harness': minor
---

`init --force` now takes the targets to replace, so a run cannot reach past the conflict it was invoked for.

The flag was a single boolean: the command preflighted every projection target and, when it was set, replaced every conflicting one. Two harnesses whose targets were both occupied were both replaced by a run intended to fix one of them, and `doctor` emitted a bare `init --force` as the repair for a single bridge — so following that repair could silently delete a second harness's user-authored directory.

`--force .claude/skills` now replaces that projection and reports any other conflicting target as skipped instead of replacing it. Naming a target no enabled harness projects is an error rather than a run that quietly forces nothing. A bare `--force` still replaces every conflicting target, so existing invocations keep their meaning; the repairs `doctor` prints now name the bridge they are for.

The conflict message now prints its targets repo-relative, so what it names is what `--force` accepts back. The initialization result gains a `skipped` field listing the harnesses left untouched.

---
'buddy-agent-harness': minor
---

Add a `repair` skill, and grow `doctor` to detect what it repairs.

`init` consolidates what a repository has, `enhance` offers what it is missing, and `doctor`
reports what is wrong. Configuration that is present but **wrong** had no home: not missing, so
`enhance` would not offer it; user-authored, so `init` would not rewrite it.

`doctor` gains a third section alongside its bridge and instruction findings — configuration that
resolves fine and is still wrong: `deprecated-harness`, `ignored-bridge`, `unread-local-override`,
and `unloadable-skill`. It stays read-only, so it is still safe in a session-start hook.

The new `repair` skill runs `doctor` and repairs what it reported, detecting nothing itself, so
detection cannot drift into two homes. Every correction is offered with its before and after and
written only on approval. Bridge and instruction findings are handed to `init`, which writes both
kinds of bridge in the first place — and writes a `CLAUDE.md` stub without asking, where `repair`
asks for everything.

`doctor`'s `findings` rows now carry a `problem` field naming the finding, alongside `path` and
`detail`. Route on `problem`: `detail` is prose meant to be read, and improving its wording must
not change what a caller does.

`BridgeFinding` gains a required `problem` field. Reading one is unaffected; code that
*constructs* one needs the new field. This is the breaking edge of the release.

New exports: `diagnoseConfiguration`, and the types `ConfigurationFinding`,
`DiagnoseConfigurationOptions`, `ConfigurationFault`, and `ConfigurationProblem`.

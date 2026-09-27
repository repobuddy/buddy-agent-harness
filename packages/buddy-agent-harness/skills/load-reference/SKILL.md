---
name: load-reference
description: By name only
---

# Load Reference

Load the references a calling skill names, and hand them back as part of its instructions. The **caller** is the skill whose instructions sent you here; its **folder** is the directory its `SKILL.md` is in.

## 1. Run the command once

Collect every name the caller listed, in its order. Run one command for all of them, from anywhere:

```sh
node <this skill's folder>/scripts/reference.mjs show <name>... --root <repository root>
```

- `<this skill's folder>` is the directory this `SKILL.md` is in. `scripts/reference.mjs` is the package's `reference` command bundled into one file; it needs no `node_modules`.
- `<repository root>` is the root of the repository you are working in, so its `.agents/references/` overrides apply. Pass it even when it is the working directory.
- Never use `npx`, `pnpm dlx`, `upx`, or any other package runner, and never download anything — not even when this command cannot run. Then go to step 3.

Do not read `.agents/references/`, `.agents/governances/`, `~/.agents/`, or any plugin's `references/` yourself. Which copy answers is the command's decision.

## 2. Read what it printed

One name prints the document. Several print each as `<reference name="…" tier="…">` … `</reference>`, in the order asked. A name that did not resolve prints `<reference name="…" status="missing" />` or `status="ambiguous"` in its place, and an `error:` line on stderr that names it. Exit 0 means every name resolved; 1 means at least one did not.

**A rejected name.** When the only output is an `error:` line saying a name is a path or a file, the command rejected the whole call and read nothing. That name is **rejected**: never read the path it names, and do not look for a copy of it. Run the command again without it, and read that run instead. If no name remains, do not run it again.

**The command ran** when every name you asked for appears in the output as a document, a `status=` marker, or an `error:` line; for a single name, exit 0 with a document on stdout also counts. Anything else — `Cannot find module`, `node: not found`, a stack trace, no mention of the names — means it did not run: go to step 3.

Per name:

- **Found** — use the document.
- **Missing** — read the caller's copy: `<caller folder>/references/<name>.md`; only if that does not exist, `<caller folder>/references/governances/<name>.md`. If neither exists, the name is **not loaded**. Never search for a substitute.
- **Ambiguous** — two plugins ship it. Load neither plugin's document and not the caller's copy. Report both qualified names from the `error:` line (`<plugin>/<name>`) and tell the user to settle which one the repository should use.

## 3. When the command did not run

Read the caller's copy of **every** name, from the same two paths in the same order. A name with no copy is **not loaded**.

## 4. Report, then continue the caller's work

Tell the user, briefly, about every name that did not come from the command:

- a name read from the caller's copy, and why: missing everywhere, or the command did not run;
- when the command did not run: that it did not, the error it gave, and that the caller's copies were used, so no project, user, or machine override applied;
- a name not loaded;
- when the command did not run and a name has no copy: that `scripts/reference.mjs` ships with the npm package, so a `buddy-agent-harness` plugin installed from git has none, and installing it from npm fixes it;
- an ambiguous name, with both qualified names;
- a rejected name, and that it names a path rather than a reference.

Say nothing about the load when every name came from the command.

Then return to the caller. Follow each loaded document as part of the caller's instructions. Carry on without a name that was not loaded.

## Validate

Before returning to the caller:

- Every name the caller listed is either loaded, from the command or the caller's copy, or named in the report as not loaded, ambiguous, or rejected.
- No `npx`, `pnpm dlx`, `upx`, or download was run.
- No file under a tier folder, and no rejected path, was read by you.
- The report is empty when every name came from the command.

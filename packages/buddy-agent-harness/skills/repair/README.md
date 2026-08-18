# Harness Repair

Correct agent configuration a repository already has that is wrong or outdated.

## What it does

`init` consolidates what a repository has, `enhance` offers what it is missing, and `doctor` reports what is wrong. Configuration that is present but **wrong** falls between all three, and that is what this skill takes: a harness name the registry retired, a git-ignored bridge, an `AGENTS.local.md` nothing reads, a skill whose frontmatter makes a harness skip it.

Each correction is offered with the file as it stands and as it would read, and written only on approval.

## Why a fourth skill rather than a `--fix` flag

`doctor` stays read-only. Its whole safety property is that it never writes, which is what makes it safe to run from a session-start hook — a repair flag would forfeit that for every caller. Its **bridge** findings are all repairable with existing `init` flags, so a flag there would duplicate `init` rather than add anything; its **configuration** findings need judgment about files you wrote, which is a skill's job and not a flag's.

That split also defines this skill's remit. `repair` owns what `init` deliberately refuses. Every bridge finding — including an instruction bridge that was never completed — is reported and handed to `init`, which is what writes bridges in the first place.

## The line it does not cross

`repair` corrects what the **tooling** decides is wrong, never what the project means. The discriminator is the one `init` already applies: content that would stop being true if this tool's output were removed is non-material, and non-material content is all this skill may correct. A statement about how the repository is worked in stays the user's, even when it is out of date — `repair` reports it and offers no write.

`references/classes.md` carries the detection, the correction, and the stopping point for each class.

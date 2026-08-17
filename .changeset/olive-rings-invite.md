---
'buddy-agent-harness': minor
---

Run the CLI that ships with the skill, and pin the `npx` fallback.

Both skills told an agent to run `npx -y buddy-agent-harness`, which downloads the package even when an installed plugin already has it on disk. Each skill now ships a launcher at `skills/<name>/scripts/<name>.mjs` that resolves the CLI from its own location, so it runs against the working directory without fetching anything.

`npx` stays documented as the fallback, now pinned to the caret range of the version that generated the skill. Unpinned, a skill from an older install drove whatever npm called latest, and its flags and findings table stopped describing the command it had just run.

The fallback is not redundant. A plugin installed from git is a source checkout whose dependencies are never installed, so the launcher cannot resolve `clibuilder` and `npx` is the only path that works. An npm-installed plugin has them and takes the launcher.

`renderDoctorSkill` now takes the version to pin, and `scripts/generate-doctor-skill.ts` becomes `scripts/generate-skills.ts` (`pnpm skill:gen`), which writes both launchers, regenerates the `doctor` skill, and rewrites the pinned fallback in the hand-written `init` skill. It runs during `changeset version` so the pin follows the release.

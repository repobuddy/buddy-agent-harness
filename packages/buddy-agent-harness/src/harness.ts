import {
	cpSync,
	lstatSync,
	mkdirSync,
	readdirSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";

export type HarnessName =
	| "claude-code"
	| "cursor"
	| "codex"
	| "copilot-cli"
	| "windsurf";

type Harness = { name: HarnessName; detect?: string; skillsDirectory: string };

export const harnessRegistry: readonly Harness[] = [
	{ name: "claude-code", skillsDirectory: ".claude/skills" },
	{ name: "cursor", detect: ".cursor", skillsDirectory: ".cursor" },
	{ name: "codex", detect: ".codex", skillsDirectory: ".codex" },
	{
		name: "copilot-cli",
		detect: ".github/skills",
		skillsDirectory: ".github/skills",
	},
	{ name: "windsurf", detect: ".windsurf", skillsDirectory: ".windsurf" },
];

export type InitializeOptions = {
	root: string;
	copy?: boolean;
	force?: boolean;
};
export type InitializeResult = {
	root: string;
	harnesses: HarnessName[];
	skills: number;
	copied: boolean;
};

function skillNames(skillsDirectory: string): string[] {
	if (!directoryExists(skillsDirectory)) return [];
	return readdirSync(skillsDirectory, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
}

function pathOccupied(path: string): boolean {
	try {
		lstatSync(path);
		return true;
	} catch {
		return false;
	}
}

function directoryExists(path: string): boolean {
	try {
		return lstatSync(path).isDirectory();
	} catch {
		return false;
	}
}

function isCorrectLink(target: string, source: string): boolean {
	try {
		return (
			lstatSync(target).isSymbolicLink() &&
			readlinkSync(target) === relative(dirname(target), source)
		);
	} catch {
		return false;
	}
}

function selectedHarnesses(root: string): Harness[] {
	return harnessRegistry.filter(
		(harness) => !harness.detect || directoryExists(join(root, harness.detect)),
	);
}

export function initializeHarnesses({
	root,
	copy = false,
	force = false,
}: InitializeOptions): InitializeResult {
	const canonicalSkills = join(root, ".agents", "skills");
	mkdirSync(canonicalSkills, { recursive: true });
	const skills = skillNames(canonicalSkills);
	const harnesses = selectedHarnesses(root);
	const conflicts = harnesses.flatMap((harness) =>
		skills
			.map((skill) => ({
				target: join(root, harness.skillsDirectory, skill),
				source: join(canonicalSkills, skill),
			}))
			.filter(
				({ target, source }) =>
					pathOccupied(target) && !isCorrectLink(target, source),
			)
			.map(({ target }) => target),
	);

	if (conflicts.length && !force) {
		throw new Error(
			`Refusing to replace existing skill targets:\n${conflicts.map((target) => `- ${target}`).join("\n")}`,
		);
	}

	for (const harness of harnesses) {
		const skillsDirectory = join(root, harness.skillsDirectory);
		mkdirSync(skillsDirectory, { recursive: true });
		for (const skill of skills) {
			const source = join(canonicalSkills, skill);
			const target = join(skillsDirectory, skill);
			if (pathOccupied(target) && isCorrectLink(target, source)) continue;
			if (pathOccupied(target))
				rmSync(target, { recursive: true, force: true });
			if (copy) {
				cpSync(source, target, { recursive: true });
				continue;
			}
			try {
				symlinkSync(relative(dirname(target), source), target, "junction");
			} catch (error) {
				if (pathOccupied(target)) throw error;
				cpSync(source, target, { recursive: true });
			}
		}
	}

	mkdirSync(join(root, ".agents", "buddy-agent-harness"), { recursive: true });
	writeFileSync(
		join(root, ".agents", "buddy-agent-harness", "config.json"),
		`${JSON.stringify({ harnesses: harnesses.map((harness) => harness.name) }, null, 2)}\n`,
	);
	return {
		root,
		harnesses: harnesses.map((harness) => harness.name),
		skills: skills.length,
		copied: copy,
	};
}

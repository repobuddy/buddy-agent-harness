import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initializeHarnesses } from "./harness.ts";

function repository(): string {
	const root = mkdtempSync(join(tmpdir(), "buddy-agent-harness-"));
	mkdirSync(join(root, ".agents", "skills", "review"), { recursive: true });
	writeFileSync(
		join(root, ".agents", "skills", "review", "SKILL.md"),
		"# Review",
	);
	return root;
}

describe("initializeHarnesses", () => {
	it("always links canonical skills for Claude Code and records the enabled harness", () => {
		const root = repository();

		const result = initializeHarnesses({ root });

		const target = join(root, ".claude", "skills", "review");
		expect(result).toMatchObject({ harnesses: ["claude-code"], skills: 1 });
		expect(lstatSync(target).isSymbolicLink()).toBe(true);
		expect(readlinkSync(target)).toBe("../../.agents/skills/review");
		expect(
			JSON.parse(
				readFileSync(
					join(root, ".agents", "buddy-agent-harness", "config.json"),
					"utf8",
				),
			),
		).toEqual({
			harnesses: ["claude-code"],
		});
		expect(existsSync(join(root, ".cursor", "review"))).toBe(false);
	});

	it("uses registry detection and --copy for harnesses already present in the repository", () => {
		const root = repository();
		for (const directory of [
			".cursor",
			".codex",
			".github/skills",
			".windsurf",
		])
			mkdirSync(join(root, directory), { recursive: true });

		const result = initializeHarnesses({ root, copy: true });

		expect(result).toMatchObject({
			harnesses: ["claude-code", "cursor", "codex", "copilot-cli", "windsurf"],
			copied: true,
		});
		for (const target of [
			".claude/skills/review",
			".cursor/review",
			".codex/review",
			".github/skills/review",
			".windsurf/review",
		]) {
			expect(lstatSync(join(root, target)).isSymbolicLink()).toBe(false);
		}
	});

	it("preflights every conflict before writing and replaces them only with --force", () => {
		const root = repository();
		mkdirSync(join(root, ".cursor"), { recursive: true });
		mkdirSync(join(root, ".claude", "skills", "review"), { recursive: true });
		writeFileSync(
			join(root, ".claude", "skills", "review", "SKILL.md"),
			"custom",
		);

		expect(() => initializeHarnesses({ root })).toThrow(
			/\.claude\/skills\/review/,
		);
		expect(existsSync(join(root, ".cursor", "review"))).toBe(false);

		initializeHarnesses({ root, force: true });
		expect(
			lstatSync(join(root, ".claude", "skills", "review")).isSymbolicLink(),
		).toBe(true);
		expect(lstatSync(join(root, ".cursor", "review")).isSymbolicLink()).toBe(
			true,
		);
	});
});

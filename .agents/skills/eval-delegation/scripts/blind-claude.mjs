#!/usr/bin/env node
// Launch `claude -p` with none of the host's user-scope instructions: no ~/.claude/CLAUDE.md or
// ~/.claude/rules, no user settings, skills, plugins or MCP servers, and no auto memory.
//
//   node blind-claude.mjs --cwd <dir> -- <claude args>
//
// The eval harnesses import it; anything else that runs an agent blind calls it from the shell.

import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

// Excluding the `user` source holds even where CLAUDE_CONFIG_DIR points at the host's config,
// which a sandbox HOME does not.
export const BLIND_ARGS = ['--setting-sources', 'project,local', '--strict-mcp-config']

export const BLIND_ENV = { ...process.env, CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' }

const MANAGED_DIR =
	{
		darwin: '/Library/Application Support/ClaudeCode',
		win32: 'C:\\Program Files\\ClaudeCode',
	}[process.platform] ?? '/etc/claude-code'

const PROJECT_FILES = ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', '.claude/CLAUDE.md', '.claude/AGENTS.md']

// What would still load into a run from <cwd>: project files above it, which the `project` source
// reads walking up, and a managed CLAUDE.md, which no flag or setting excludes.
export function inheritedInstructions(cwd) {
	const found = []
	for (let dir = dirname(resolve(cwd)); dir !== dirname(dir); dir = dirname(dir)) {
		for (const name of PROJECT_FILES) {
			const file = join(dir, name)
			// The user-scope file, which --setting-sources already leaves out.
			if (file === join(homedir(), '.claude', 'CLAUDE.md')) continue
			if (existsSync(file)) found.push(file)
		}
	}
	const managed = join(MANAGED_DIR, 'CLAUDE.md')
	if (existsSync(managed)) found.push(managed)
	const settings = join(MANAGED_DIR, 'managed-settings.json')
	if (existsSync(settings) && 'claudeMd' in JSON.parse(readFileSync(settings, 'utf8'))) found.push(settings)
	return found
}

export function assertBlind(cwd) {
	const found = inheritedInstructions(cwd)
	if (found.length === 0) return
	process.stderr.write(`error: these would load into every run from ${cwd}; run from elsewhere:\n`)
	for (const file of found) process.stderr.write(`  ${file}\n`)
	process.exit(1)
}

export function blindClaude(args, { cwd, timeout = 300_000 }) {
	return new Promise((done) => {
		const child = spawn('claude', [...args, ...BLIND_ARGS], {
			cwd,
			env: BLIND_ENV,
			stdio: ['ignore', 'pipe', 'pipe'],
			timeout,
		})
		let out = ''
		child.stdout.on('data', (d) => {
			out += d
		})
		child.on('close', (code) => done({ code, out }))
	})
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { values, positionals } = parseArgs({ options: { cwd: { type: 'string' } }, allowPositionals: true })
	if (!values.cwd || positionals.length === 0) {
		process.stdout.write('usage: blind-claude.mjs --cwd <dir> -- <claude args>\n')
		process.exit(2)
	}
	assertBlind(values.cwd)
	const { code, out } = await blindClaude(positionals, { cwd: values.cwd })
	process.stdout.write(out)
	process.exit(code ?? 1)
}

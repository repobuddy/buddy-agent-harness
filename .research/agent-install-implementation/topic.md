# What `agent-install` Implements, and What It Is Worth Borrowing (August 2026)

## Question

`agent-install` is an npm package covering the same ground as this project: it installs
`SKILL.md` files, wires MCP servers, and edits `AGENTS.md`. Specifically:

1. Where does its skill-projection model agree with ours, and where does it disagree?
2. Does its MCP support refute the `init` skill's claim that no safe cross-harness mapping exists?
3. Which implementation details solve problems we have, or will have?

## Scope

**In**: the published behavior of `agent-install@0.0.8` — its skill install paths, its MCP host
registry and per-host transforms, its `AGENTS.md` section parser and writer, and the safety
measures in each.

**Out**: whether to depend on the package. That is a project decision recorded in
`conclusion.md`, not a claim about the package. Also out: MCP protocol internals, and any
harness-support claim — `.research/agentic-configuration-standards/` is the authority for those
and takes precedence wherever the two disagree.

## Source angles

- The published tarball, read directly. The package declares no `repository` field, so the
  registry artifact is the only available source and every claim below cites a file in it.
- This repository's equivalent code, for the comparison.

## Method

`npm pack` of `agent-install@0.0.8`, unpacked and read. The package ships bundled `dist/` output
with `//#region src/<path>` markers naming the original source file, so each claim cites the
region rather than a line number in the bundle.

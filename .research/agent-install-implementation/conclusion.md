# Conclusion — `agent-install` Implementation

## Last updated

August 2026

## Question

Where does `agent-install`'s model agree with ours, does its MCP support refute `init`'s
canonical-only claim, and which of its implementation details are worth taking?

## Verdict

**Do not depend on it. Take three lessons from it, and reopen one of our claims because of it.**

The package overlaps this project on all three of its surfaces, but the overlap is not symmetric.
Its skill layer is weaker than ours, its `AGENTS.md` layer solves a problem we have not solved yet,
and its MCP layer is a working implementation of something we have documented as impossible.

## On depending on it

No, on two independent grounds.

Its skill projection writes into four harnesses that read `.agents/skills` natively (E-AI-06),
so adopting it would mean writing redundant directories and abandoning the distinction
`harness-registry.ts` exists to draw. And its provenance is thin for a package whose whole job is
writing into other tools' configuration directories: all `0.0.x`, single maintainer, no verifiable
source (E-AI-08).

Neither ground is about quality. The implementation details below are good, which is why they are
worth copying rather than importing.

## What we took

**Link identity, not link text** (E-AI-07). `init` and `doctor` both judged a bridge by comparing
its link text against the one relative path `init` writes, so a link that resolved correctly but was
spelled differently read as foreign — `doctor` called it stale, `init` demanded `--force`. Both now
compare resolved paths. The same evidence showed our link type was passed as `junction`
unconditionally with a relative target, which Windows resolves against the process directory rather
than the link's own.

**Fence-aware heading matching** (E-AI-01). Recorded as a rule in the `enhance` skill rather than as
code, because our section handling is instructions to an agent, not a parser. It is not hypothetical
here: the text `enhance` offers is a fenced block containing a literal `## Delegation` heading.

## What we deliberately did not take

**Terminal-escape stripping** (E-AI-05). Nothing in this package reads skill frontmatter, so there is
no untrusted-metadata-to-terminal path to guard, and adding the guard now would be dead code. The
requirement is real but conditional: it applies the moment anything here reads a value out of a
`SKILL.md` — anyone's — and prints it. If that changes, `stripTerminalEscapes` is the shape to copy.

**JSONC comment preservation** (E-AI-03) and **the prototype-pollution guard** (E-AI-04). Both are
correct and both guard code we have not written. They become relevant together, if MCP support ever
lands, because that is the only surface here that would write into a user's existing JSON.

## What this reopens

`init` classifies MCP servers as canonical-only, and states the reason as "no safe cross-harness
mapping exists". E-AI-02 refutes that as written: the mapping exists, has been implemented across
fourteen hosts, and the per-host divergences it handles are documented and specific.

What survives is a narrower claim. The mapping is not lossless — Claude Desktop cannot accept a
remote server, Zed cannot accept a stdio one, and Goose's schema carries fields with no source in
the common form. A converter has to be able to say "this server cannot be expressed for that host"
rather than write a broken entry, which is what `supportedTransports` and
`unsupportedTransportMessage` are for in their registry.

So the claim should be rewritten to say what is actually true, and the question of whether `init`
should convert MCP configuration is a separate decision that this research does not make. Tracked
as an issue against `init`.

## Confidence

High on everything in `evidence.md`: each claim was read from the published artifact rather than
from documentation. Lower on one inference — that Node resolves a relative junction target against
the process directory — which is taken from Node's documented normalization and has not been
executed on Windows.

## Precedence

`.research/agentic-configuration-standards/` remains authoritative for which harnesses read
`.agents/skills` and for the canonical layout. Where E-AI-06's path list disagrees with it, that
research wins; the one path worth checking against it is `.gemini/antigravity/skills`.

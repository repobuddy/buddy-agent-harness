# Harness Init

Initialize or update a repository's standards-based agent configuration so its instructions, skills, and tool settings can be shared across coding-agent harnesses.

## Use

```sh
npx -y buddy-agent-harness init
```

The canonical repository surface is `.agents/`: `.agents/AGENTS.md` holds shared behavior, `.agents/skills/**/SKILL.md` holds reusable capabilities, and separately named files hold tool settings. The active harness is enabled by default; explicit user preferences may add others. Existing vendor directories do not imply a preference.

The initializer preserves user-authored configuration and projects compatible canonical artifacts into selected harnesses with links or copies. It does not invent instructions, convert unsupported tool settings, change CI, GitHub settings, security scanning, or branch rules.

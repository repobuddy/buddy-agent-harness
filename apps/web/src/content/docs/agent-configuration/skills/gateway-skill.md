---
title: Gateway Skill
description: Workflow entrypoints that activate an opt-in workflow, gather missing intent, and route, and why the routing effect is what distinguishes them.
---

**Gateway skills** are workflow entrypoints. They activate an opt-in workflow, gather missing intent, load the workflow's rules, and route the request to the right next skill or action.

They are for workflows that should not be always on, but need more than a single narrow command once invoked.

## Responsibilities

A gateway skill's job splits along the [Required / Optional / Delegated](/agent-configuration/skills/responsibility/) axis.

**Required**, the front door of the workflow:

- **Activation**: the user explicitly invokes the workflow, or describes work that unmistakably belongs to it
- **Intake**: when the request is underspecified, the skill asks what kind of work the user wants, against its own fixed operation menu
- **Context loading**: the skill loads the rules, constraints, and terms the workflow needs
- **Routing**: the skill sends the work to a narrower skill, tool, or implementation path

**Optional**: continuing to shape the current work after routing; still scoped to the requested workflow, not to global agent behavior.

**Delegated**: voice and judgment during intake and routing. A gateway need not own its own tone. It can try to load a persona by name and fall back to a bundled default if the consumer has not supplied one. That is what lets a consumer change how the gateway sounds without forking its operation menu. See the [worked example](/agent-configuration/skills/responsibility/#worked-example-a-gateway-delegates-its-voice-to-a-persona).

A gateway should stay at the user-facing boundary. It does not own the workflow's internal delegate selection, detailed lifecycle transitions, or artifact-specific correctness rules unless those are themselves part of the intake surface.

## Why not always-on configuration

An always-on instruction file is appropriate when a rule should apply to every task in a repository. A gateway skill is appropriate when the workflow is optional.

The trade is a context one. [Everything in `AGENTS.md` is paid for on every task](/agent-configuration/instruction-files/); a gateway contributes only its `description` until someone opts in, and then brings the whole workflow's rules with it. A workflow that most sessions never touch is exactly the case where that difference pays.

## Gateway vs. the neighbouring kinds

A gateway is close kin to a [Command](/agent-configuration/skills/commands/), since both are meant to be reached by the user rather than fired on stray context, but they differ on two of the three axes that distinguish any skill (see [Kinds of Skill](/agent-configuration/skills/overview/#kinds-of-skill)):

| Concept | Selection | Effect |
|---|---|---|
| Gateway skill | situational or explicit: a named invocation, or a description match on an unlabeled request that belongs to the workflow | routing; hands off to a narrower skill or action |
| Command | explicit only: `/name`, never auto-matched | action; the command itself is the work |
| Skill (default) | situational | action |
| Direct invocation skill | by name | action or reference |

A command's whole point is that auto-invocation is suppressed, which is what makes it safe for deployments and releases. A gateway keeps the situational path open: its job is to catch the user *before* they have named the workflow, not only once they do. What it never does is perform the work itself. It routes, where a command acts.

## Intake is the distinguishing behavior

What marks a gateway is what it does when it **cannot** infer intent. It asks, rather than guessing or failing.

With enough detail in the request, it routes directly. With none, it presents its operation menu and waits. That menu is a closed set, a [Menu purpose](/agent-configuration/instruction-purpose/#menu-picks-a-path-before-the-work-starts) rather than criteria, and keeping it closed is what makes the gateway's behavior predictable across the many ways a user might phrase the same request.

## A portability note

Nothing about a gateway depends on harness-specific frontmatter. Activation is a `description` match or a user invocation, intake and routing are body instructions, and both `description` and body are read by every harness. A gateway is therefore one of the more portable patterns on this site, unlike a [command](/agent-configuration/skills/commands/), whose defining suppression does not travel.

The one thing that does not travel is the invocation *syntax*. `/name` menus, `$name` prefixes, and `@`-mentions differ per harness, so a gateway's description should carry natural-language triggers rather than relying on any one of them.

## Related

- [Kinds of Skill](/agent-configuration/skills/overview/): Selection, Visibility, and Effect
- [Responsibility](/agent-configuration/skills/responsibility/): Required / Optional / Delegated, and the gateway-persona seam
- [Commands](/agent-configuration/skills/commands/): the explicit-only, action-effect counterpart
- [Instruction Purpose](/agent-configuration/instruction-purpose/): Menu, the purpose an operation menu realizes
- [What Belongs in AGENTS.md](/agent-configuration/instruction-files/): the always-on alternative, and its cost

---
title: Harness Selection
description: Choose which coding harnesses receive configuration projections.
---

Initialization should follow user intent, not the accidental presence of a vendor directory.

## Default

The intended model enables the active harness first, so the person running initialization gets a useful result immediately. A user may explicitly choose additional supported harnesses when the repository needs them.

## Safe updates

Before changing a target, the initializer checks for conflicts. It preserves an existing target unless replacement is explicitly requested with `--force`. Where links are supported, it uses relative links to keep the canonical source visible; `--copy` is reserved for environments where links are unavailable.

## Current behavior

The current CLI always includes Claude Code and detects the other supported harnesses from existing directories. The project is moving toward the active-harness and explicit-preference model described above; see the [Objective](/objective/) for that direction.

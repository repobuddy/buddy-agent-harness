---
'buddy-agent-harness': patch
---

`run(argv)` now returns the usage code `2` on an unknown option or command, where it returned `0` and left the code on `process.exitCode`. A caller can assign the result directly:

```js
process.exitCode = await run(argv)
```

The executable and the skill launchers already exited `2` there and still do. This comes from `clibuilder` 11.3.0, whose `parse()` now returns the code it records.

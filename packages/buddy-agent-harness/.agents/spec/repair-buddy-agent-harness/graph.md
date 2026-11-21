# repair-buddy-agent-harness: decision graph

The path of one run, and of each finding within it. The part from `Each` down runs once per finding, so one run can
hand one finding on, report a second as material, and correct a third. Every leaf is an outcome, and each criterion
in [README.md](./README.md) cites the edges it constrains.

```mermaid
flowchart TD
  Start[A request to correct agent configuration] -->|E1| Run{Does doctor report any finding?}
  Run -->|E2 no| Clean([Reported as clean; nothing changes])
  Run -->|E3 yes| Each{Does the correction reference hold an entry for the fault?}
  Each -->|E4 no| Hand{Whom does the repair doctor stated name?}
  Hand -->|E5 the init-buddy-agent-harness skill or the init command| Init([Handed to init-buddy-agent-harness])
  Hand -->|E18 the enhance-buddy-agent-harness skill, and not init| Enhance([Handed to enhance-buddy-agent-harness])
  Hand -->|E6 no skill| Person([Needs your decision])
  Hand -->|E7 a step in the user's home directory| User([For you to do outside the repo])
  Each -->|E8 yes| Material{Would the correction write material content?}
  Material -->|E9 yes| Reported([Reported as material; no write offered])
  Material -->|E10 no| Options{Is more than one correction valid?}
  Options -->|E11 yes: offer every option, or each field on its own| Ask{Did the owner approve?}
  Options -->|E12 no: offer the before and after| Ask
  Ask -->|E13 declined| Declined([Declined; nothing written])
  Ask -->|E14 approved| Apply[Write only what was approved]
  Apply -->|E15| Rerun{Does a second doctor run still report it?}
  Rerun -->|E16 yes| Open([Still open])
  Rerun -->|E17 no| Corrected([Corrected])
```

The run holds no state of its own, so there is no first-run path.

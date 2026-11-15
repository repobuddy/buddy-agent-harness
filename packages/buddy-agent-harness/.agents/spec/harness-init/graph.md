# harness-init decision graph

The decisions one run of the `init` command makes, as a caller can observe them. The branch from `scaffold` is taken
once for each enabled harness.

```mermaid
flowchart TD
  request{Is the request valid?}
  request -->|E1 no: an unsupported output form or harness name| rejected([Request rejected, nothing written])
  request -->|E2 yes| scaffold[Work at the repository root, ensure the canonical directories, select the enabled harnesses]
  scaffold -->|E3 the harness is native| native[Nothing written for that harness]
  scaffold -->|E17 the harness needs a projection| conflicts{Does its projection path hold something else?}
  conflicts -->|E4 yes, and no replacement was requested| reported([Every conflict reported, no projection path changed])
  conflicts -->|E5 yes, and a named target matches no projection| nomatch([No match reported, no projection path changed])
  conflicts -->|E30 no, or a link already resolves to the canonical skills directory| copy
  conflicts -->|E36 an existing copy is there, and a replacement request covers it| copy
  conflicts -->|E19 an existing copy is there, and no replacement request covers it| drift{Does the copy differ from the canonical skills directory?}
  conflicts -->|E7 yes, and every conflict is to be replaced| copy
  conflicts -->|E8 yes, and only some targets are named| skipped[Unnamed conflicts kept and marked skipped]
  skipped -->|E9| copy{Was a copy requested?}
  copy -->|E10 yes| copied[Copy written]
  copy -->|E18 no| link{Was the link created?}
  link -->|E11 yes| linked[Link written]
  link -->|E12 no, and the target is still empty| copied
  link -->|E13 no, and something appeared at the target| failed([Run fails, what appeared is kept])
  linked -->|E14| result([Result reported])
  copied -->|E29| tracked{Does git track the projection path?}
  drift -->|E20 no| kept[Copy kept as it is]
  kept -->|E34| tracked
  drift -->|E21 yes| synced[Copy synced file by file, as copy-sync states]
  synced -->|E35| result
  tracked -->|E31 yes| protected[Copy protection in place for the copy]
  tracked -->|E33 no, or no git repository| result
  protected -->|E32| result
  native -->|E16| result
```

- E1 to E5, E7 to E14, E16 to E21, and E29 to E36 are the edges above. E6, E15, and E22 to E28 are retired: the sync's
  own decisions moved to [copy-sync](../copy-sync/graph.md). A retired edge
  ID is never reused.
- Outcomes: `rejected`, `reported`, `nomatch`, `failed`, and `result`.

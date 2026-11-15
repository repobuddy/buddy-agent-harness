# Decision graph: governance-overrides

Two entry points share the layers in lookup order and nothing else: listing never reads a document, and showing
never reads a whole layer.

## Listing what the layers hold

```mermaid
flowchart TD
  L0[List requested] -->|E1 only overrides| L1[Search set: the override layers]
  L0 -->|E2 every layer| L2[Search set: every layer, the package layer last]
  L1 --> L3{Does any layer of the search set hold a governance?}
  L2 --> L3
  L3 -->|E3 none| L4([Zero stated, the layers reported, success])
  L3 -->|E4 some| L5([Each name once at the winning layer, sorted, the layers reported, success])
  L0 -->|E5 unexpected failure| L6([A stated reason, no success])
```

## Showing one governance

```mermaid
flowchart TD
  S0[Show requested] -->|E6 the name is not a file stem| S1([Rejected, no file read, no success])
  S0 -->|E7 a file stem, only overrides| S2[Search set: the override layers]
  S0 -->|E8 a file stem, every layer| S3[Search set: every layer, the package layer last]
  S2 --> S4{Does the next layer in lookup order hold a readable document of that name?}
  S3 --> S4
  S4 -->|E9 no, and a layer remains| S4
  S4 -->|E10 no, and no layer remains| S5([Not found, no success, no document])
  S4 -->|E11 yes| S6{Which format was asked for?}
  S6 -->|E12 none, or the plain one| S7([The document itself, ending on a newline, success])
  S6 -->|E13 a machine format| S8([The name, the layer, the path, and the content together, success])
  S0 -->|E14 unexpected failure| S9([A stated reason, no success])
```

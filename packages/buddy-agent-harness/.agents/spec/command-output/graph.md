# Command output: decision graph

Two graphs that never meet. A path is put in pasteable form before the result is built, so it is a value in the
result like any other, and nothing that encodes a result looks for a path.

## Writing an answer

```mermaid
flowchart TD
  S[A command is invoked, with a format or none] -->|E10| F{Format one of the three, or none?}
  F -->|E1 no| O1[Refused before the command runs, nothing on stdout]
  F -->|E2 yes| N{A format named?}
  N -->|E3 no| DF[The command's default format]
  N -->|E11 yes| NF[The named format]
  DF -->|E12| D
  NF -->|E13| D
  D{Is the answer a document, in the text format?}
  D -->|E4 no| O2[The result, encoded in the format, ending on a line end]
  D -->|E5 yes| O3[The document as it stands, ending on a line end]
```

## Preparing a path

```mermaid
flowchart TD
  Q{Is this the executable path, and is it unknown?}
  Q -->|E6 yes| O4[The package name]
  Q -->|E7 no| H{Does the path start with the user's home directory?}
  H -->|E8 yes| O5[The home directory replaced by ~]
  H -->|E9 no, or no home directory| O6[The path as it stands]
```

## Failing or warning

```mermaid
flowchart TD
  X[A command cannot do what was asked] -->|E14| O7[An error with a code and a next step, in the requested format, where the answer goes]
  W[A command that succeeds has a warning for a person] -->|E15| O8[The warning on the human-only stream, the answer unchanged]
```

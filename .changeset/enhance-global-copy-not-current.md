---
'buddy-agent-harness': minor
---

The `enhance` skill now checks the copy of an addition in your global instructions, and says what it found when that copy and the repository's differ:

- **Global instructions hold a retired wording, or your own words, and the repository has none.** The skill no longer offers the addition. It hands you the current text to put in place of a retired global wording, and leaves your own words alone.
- **Global instructions hold a retired wording, whatever the repository holds.** You get the current text for the global copy, even where the repository's section is already current.
- **The repository holds a retired wording, and your global instructions hold the current text.** The replacement is still offered. It now says you would read the text twice, and offers removing the section as the other answer.
- **The repository holds your own words, and your global instructions hold the current text.** Nothing is offered, and the report says you read the subject twice.

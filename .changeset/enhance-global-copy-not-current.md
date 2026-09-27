---
'buddy-agent-harness': minor
---

The `enhance` skill now says what it found when your global instructions and the repository's copy of an addition differ:

- **Global instructions hold a retired wording, or your own words, and the repository has none.** The skill no longer offers the addition. It checks the global copy, hands you the current text to put in place of a retired wording there, and leaves your own words alone.
- **The repository holds a retired wording, and your global instructions hold the current text.** The skill offers to remove the stale section rather than replace it, so you don't read the text twice. It writes the replacement only if you ask for it.
- **The repository holds your own words, and your global instructions hold the current text.** Nothing is offered, and the report says you read the subject twice.

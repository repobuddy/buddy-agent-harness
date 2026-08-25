@frozen
Feature: Report drift between a golden MCP server set and the harness copies of it

  # ── buddy-agent-harness doctor ──

  @behavior
  Scenario: reports no drift for a repository with no golden set
    Given a repository with a `.cursor/mcp.json` holding one server
    And no golden set at `.agents/buddy-agent-harness/mcp.toml`
    When the command diagnoses MCP configuration
    Then it reports no drift fault

  @behavior
  Scenario: reports nothing when a target matches the golden set
    Given a golden set holding one stdio server
    And a `.cursor/mcp.json` holding that same server with the same command and arguments
    When the command diagnoses MCP configuration
    Then it reports no MCP fault

  @behavior
  Scenario: reports an unreadable golden set by position
    Given a golden set whose TOML is malformed on its second line
    When the command diagnoses MCP configuration
    Then it reports an `mcp-golden-unreadable` fault naming the golden set
    And the finding names the line and column of the failure

  @behavior
  Scenario: never puts the offending line into the finding
    Given a golden set whose malformed line assigns an unquoted literal credential
    When the command diagnoses MCP configuration
    Then no field of the reported finding contains that credential
    And no field of the reported finding contains any part of it

  @behavior
  Scenario: reports nothing for a harness whose MCP file does not exist yet
    Given a golden set holding one stdio server
    And no `.cursor/mcp.json` at all
    When the command diagnoses MCP configuration
    Then it reports no MCP fault

  @behavior
  Scenario: compares nothing once the golden set is unreadable
    Given a golden set whose TOML is malformed
    And a `.cursor/mcp.json` holding a server the golden set does not declare
    When the command diagnoses MCP configuration
    Then the only fault it reports is `mcp-golden-unreadable`

  @behavior
  Scenario: reports a literal credential in the golden set itself
    Given a golden set whose server sets an `env` value named for a token to a literal
    When the command diagnoses MCP configuration
    Then it reports a secret fault locating that field in the golden set

  @behavior
  Scenario: reports a golden server a target does not carry
    Given a golden set holding a server named `linear`
    And a `.cursor/mcp.json` holding no server named `linear`
    When the command diagnoses MCP configuration
    Then it reports an `mcp-unprojected` fault locating `linear` in `.cursor/mcp.json`

  @behavior
  Scenario: reports a target server the golden set does not carry
    Given a golden set holding no server named `sentry`
    And a `.cursor/mcp.json` holding a server named `sentry`
    When the command diagnoses MCP configuration
    Then it reports an `mcp-undeclared` fault locating `sentry` in `.cursor/mcp.json`

  @behavior
  Scenario: reports the target as the side that moved
    Given a golden set and a `.cursor/mcp.json` holding a server named `linear`
    And a last-projected record whose entry for `linear` matches the golden set
    And a `.cursor/mcp.json` whose `linear` command differs from both
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-target` fault locating `linear`

  @behavior
  Scenario: reports the golden set as the side that moved
    Given a `.cursor/mcp.json` holding a server named `linear`
    And a last-projected record whose entry for `linear` matches that target
    And a golden set whose `linear` command differs from both
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-golden` fault locating `linear`

  @behavior
  Scenario: reports a three-way conflict without merging it
    Given a last-projected record holding an entry for `linear`
    And a golden set whose `linear` differs from that entry
    And a `.cursor/mcp.json` whose `linear` differs from that entry in another field
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-both` fault locating `linear`
    And its repair names reconciling by hand rather than rebuilding either side

  @behavior
  Scenario: reports an unknown direction when no baseline can answer
    Given a directory that is not a git repository
    And a golden set and a `.cursor/mcp.json` whose `linear` entries differ
    And no last-projected record
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-unknown` fault locating `linear`

  @behavior
  Scenario: falls back to git history for a tracked target
    Given a git repository whose committed `.cursor/mcp.json` and golden set agreed on `linear`
    And a working-tree `.cursor/mcp.json` whose `linear` command has since changed
    And no last-projected record
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-target` fault locating `linear`

  @behavior
  Scenario: ignores a projection record that does not parse
    Given a last-projected record that is not valid JSON
    And a golden set and a `.cursor/mcp.json` whose `linear` entries differ
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-unknown` fault locating `linear`

  @behavior
  Scenario: walks past a commit where the golden set did not parse
    Given a git repository whose committed golden set and `.cursor/mcp.json` agreed on `linear`
    And a later commit in which the golden set did not parse
    And a working tree whose golden set parses and whose `linear` command has changed in the target
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-target` fault locating `linear`

  @behavior
  Scenario: walks past a commit where the target did not parse
    Given a git repository whose committed golden set and `.cursor/mcp.json` agreed on `linear`
    And a later commit in which the target did not parse
    And a working tree whose target parses and whose `linear` command has changed
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-target` fault locating `linear`

  @behavior
  Scenario: reports an unknown direction when no commit ever agreed
    Given a git repository whose committed golden set and `.cursor/mcp.json` never agreed on `linear`
    And no last-projected record
    When the command diagnoses MCP configuration
    Then it reports an `mcp-diverged-unknown` fault locating `linear`

  @behavior
  Scenario: treats a field the golden set leaves unset as no difference
    Given a golden set whose `linear` entry sets no `timeout`
    And a `.cursor/mcp.json` whose `linear` entry sets a `timeout`
    When the command diagnoses MCP configuration
    Then it reports no divergence fault for `linear`

  @behavior
  Scenario: reports a literal credential with no golden set present
    Given no golden set
    And a `.cursor/mcp.json` whose server sets an `env` value named for a key to a literal
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault

  @behavior
  Scenario: reports a literal credential at untracked severity outside a git repository
    Given a directory that is not a git repository
    And a `.cursor/mcp.json` whose server sets an `env` value named for a key to a literal
    When the command diagnoses MCP configuration
    Then it reports no `mcp-committed-secret` fault

  @behavior
  Scenario: reports a literal credential in an MCP config
    Given an untracked `.cursor/mcp.json` whose server sets an `env` value named for a token to a literal
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault locating that field
    And its repair names replacing the literal with an environment reference

  @behavior
  Scenario: reports a committed credential, whose repair is to rotate it
    Given a git repository tracking a `.cursor/mcp.json` whose server sets a literal `Authorization` header
    When the command diagnoses MCP configuration
    Then it reports an `mcp-committed-secret` fault locating that header
    And its repair names rotating the credential rather than moving it

  @behavior
  Scenario: accepts a reference in a credential-bearing field
    Given a `.cursor/mcp.json` whose server sets its `Authorization` header to `${LINEAR_TOKEN}`
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: accepts the other documented reference forms
    Given a `.cursor/mcp.json` whose servers set credential-bearing values to `$VAR`, `${env:VAR}`, and `${input:id}`
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: reports a value that looks like a reference but names no variable
    Given a `.cursor/mcp.json` whose credential-bearing value is `$ {LINEAR}`
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault

  @behavior
  Scenario: leaves a name that merely contains a credential word inside another word alone
    Given a `.cursor/mcp.json` whose server sets `env` values named `MONKEY_PATCH`, `AUTHOR`, and `KEYSTONE_URL`
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: reports a credential word run together with the rest of the name
    Given a `.cursor/mcp.json` whose server sets an `env` value named `MYTOKEN` to a literal
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault locating that field

  @behavior
  Scenario: reports a credential segment spelled run together in lower case
    Given a `.cursor/mcp.json` whose server sets an `env` value named `apikey` to a literal
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault locating that field

  @behavior
  Scenario: reports a credential segment spelled in camel case
    Given a `.cursor/mcp.json` whose server sets an `env` value named `apiKey` to a literal
    When the command diagnoses MCP configuration
    Then it reports an `mcp-literal-secret` fault locating that field

  @behavior
  Scenario: leaves an ordinary environment value alone
    Given a `.cursor/mcp.json` whose server sets an `env` value named `NODE_ENV` to `production`
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: reports a credential carried in a URL
    Given a `.cursor/mcp.json` whose server `url` carries a password in its userinfo
    When the command diagnoses MCP configuration
    Then it reports a secret fault locating that server's `url`

  @behavior
  Scenario: reports a credential carried in a URL query parameter
    Given a `.cursor/mcp.json` whose server `url` carries a credential-named query parameter holding a literal
    When the command diagnoses MCP configuration
    Then it reports a secret fault locating that server's `url`

  @behavior
  Scenario: accepts a URL query parameter holding a reference
    Given a `.cursor/mcp.json` whose server `url` carries a credential-named query parameter holding a reference
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: leaves a URL with no credential in it alone
    Given a `.cursor/mcp.json` whose server `url` carries only an ordinary query parameter
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: leaves a url that does not parse alone, because it is malformed rather than leaky
    Given a `.cursor/mcp.json` whose server `url` is not an absolute URL
    When the command diagnoses MCP configuration
    Then it reports no secret fault

  @behavior
  Scenario: never carries an env credential into the finding
    Given a `.cursor/mcp.json` whose server sets an `env` value named for a key to a literal
    When the command diagnoses MCP configuration
    Then no field of anything the command emits contains that literal
    And no field of anything it emits contains a leading or trailing part of it

  @behavior
  Scenario: never carries a header credential into the finding
    Given a `.cursor/mcp.json` whose server sets a literal `Authorization` header
    When the command diagnoses MCP configuration
    Then no field of anything the command emits contains that literal
    And no field of anything it emits contains a leading or trailing part of it

  @behavior
  Scenario: never carries a URL's userinfo credential into the finding
    Given a `.cursor/mcp.json` whose server `url` carries a password in its userinfo
    When the command diagnoses MCP configuration
    Then no field of anything the command emits contains that password
    And no field of anything it emits contains a leading or trailing part of it

  @behavior
  Scenario: never carries a URL query parameter credential into the finding
    Given a `.cursor/mcp.json` whose server `url` carries a credential-named query parameter holding a literal
    When the command diagnoses MCP configuration
    Then no field of anything the command emits contains that literal
    And no field of anything it emits contains a leading or trailing part of it

  @behavior
  Scenario: never carries a golden-set credential into the finding
    Given a golden set whose server sets an `env` value named for a token to a literal
    When the command diagnoses MCP configuration
    Then no field of anything the command emits contains that literal
    And no field of anything it emits contains a leading or trailing part of it

  @behavior
  Scenario: never carries a credential into a divergence finding
    Given a golden set whose `linear` `Authorization` header is a reference
    And a `.cursor/mcp.json` whose `linear` `Authorization` header is a literal
    When the command diagnoses MCP configuration
    Then it reports a divergence fault locating that header
    And no field of anything the command emits contains that literal

  @behavior
  Scenario: never carries an unreadable file's content into the finding
    Given a `.cursor/mcp.json` that is not valid JSON on the line assigning a credential
    When the command diagnoses MCP configuration
    Then it reports an `mcp-target-unreadable` fault
    And no field of anything the command emits contains that credential

  @behavior
  Scenario: reports an unreadable target and compares nothing in it
    Given a golden set holding one server
    And a `.cursor/mcp.json` that is not valid JSON
    When the command diagnoses MCP configuration
    Then it reports an `mcp-target-unreadable` fault naming `.cursor/mcp.json`
    And it reports no drift fault against that target

  @behavior
  Scenario: reports an unreadable TOML target
    Given a golden set holding one server
    And a `.codex/config.toml` that is not valid TOML
    When the command diagnoses MCP configuration
    Then it reports an `mcp-target-unreadable` fault naming `.codex/config.toml`

  @behavior
  Scenario: reports nothing for a harness with no project-scope MCP file
    Given a repository with a `.github/skills` directory and a golden set holding one server
    When the command diagnoses MCP configuration
    Then it reports no fault naming a Copilot CLI path

  @behavior
  Scenario: names each MCP fault and locates it beyond the file
    Given a golden set holding a server absent from a `.cursor/mcp.json`
    When the command diagnoses MCP configuration
    Then the emitted finding carries the name `mcp-unprojected`
    And its path names the server as well as the file

  @behavior
  Scenario: offers every MCP repair as an instruction rather than a command
    Given a golden set holding a server absent from a `.cursor/mcp.json`
    When the command diagnoses MCP configuration
    Then every MCP fault it reports carries an empty `command`

  @behavior
  Scenario: carries the repair for every MCP finding it reports
    Given a golden set holding a server absent from a `.cursor/mcp.json`
    When the command diagnoses MCP configuration
    Then every MCP fault it reports carries a non-empty detail and a non-empty repair

  @behavior
  Scenario: reads only the MCP key from a file that holds other settings
    Given a `.gemini/settings.json` holding both a `context.fileName` array and an `mcpServers` entry
    And a golden set holding that same server
    When the command diagnoses MCP configuration
    Then it reports no MCP fault
    And it reports nothing about the settings the file holds beside MCP

  @behavior
  Scenario: compares a TOML target against the golden set semantically
    Given a `.codex/config.toml` holding an `mcp_servers` table for a server
    And a golden set holding that same server with the same command and arguments
    When the command diagnoses MCP configuration
    Then it reports no MCP fault

Feature: Reconcile a harness-side MCP change back into the golden set

  # ── buddy-agent-harness mcp reconcile ──

  @behavior
  Scenario: reports nothing to reconcile into without a golden set
    Given a repository with no golden set at `.agents/buddy-agent-harness/mcp.toml`
    When the command reconciles MCP configuration
    Then it reports that there is nothing to reconcile

  @behavior
  Scenario: fails on an unreadable golden set by position only
    Given a golden set with an unquoted literal credential
    When the command reconciles MCP configuration
    Then it exits with a failure naming the line and column

  @behavior
  Scenario: refuses a target that does not parse
    Given a golden set holding one server named `linear`
    And a `.cursor/mcp.json` that is not JSON
    When the command reconciles MCP configuration
    Then it reports `.cursor/mcp.json` refused
    And `.cursor/mcp.json` is unchanged

  @behavior
  Scenario: offers a field only the harness changed, and writes nothing without approval
    Given a golden set holding one server named `linear` with `command` set to `npx`
    And a last-projected record of that server
    And `.mcp.json` whose copy of it has since changed its `command` to `bunx`
    When the command reconciles MCP configuration
    Then it reports an `import` for that field
    And nothing it writes contains any change to the golden set

  @behavior
  Scenario: imports an approved field in place, keeping every comment, and records the agreement
    Given a golden set holding one server named `linear` with `command` set to `npx` and a comment
    And a last-projected record of that server
    And `.mcp.json` whose copy of it has since changed its `command` to `bunx`
    When the command reconciles MCP configuration accepting `.mcp.json#servers.linear.command`
    Then it reports `imported` for that field
    And the golden set now holds the server with `command` set to `bunx`
    And its comment is unchanged
    And the record is updated to reflect the new value

  @behavior
  Scenario: imports only the approved field of several
    Given a golden set holding one server named `linear` with `command` and `args`
    And a last-projected record of that server
    And `.mcp.json` whose copy changed both fields
    When the command reconciles MCP configuration accepting `.mcp.json#servers.linear.args`
    Then only the `args` field is updated in the golden set

  @behavior
  Scenario: imports a field the harness removed by removing it from the golden set
    Given a golden set holding one server named `linear` with `command` and `args`
    And a last-projected record of that server
    And `.mcp.json` whose copy of it has the `args` field removed
    When the command reconciles MCP configuration accepting `.mcp.json#servers.linear.args`
    Then the golden set now has the server with `args` unset
    And the record is updated

  @behavior
  Scenario: takes only the names the golden set speaks for in a map
    Given a golden set holding one server with `env` defining `A` and `GONE`
    And a last-projected record of that server
    And `.mcp.json` whose `env` holds `A` with a different value, `EXTRA`, and lacks `GONE`
    When the command reconciles MCP configuration
    Then it reports only the change to `A`, not `EXTRA`

  @behavior
  Scenario: removes a map the harness emptied of every name the golden set speaks for
    Given a golden set holding one server with `env` defining `A`
    And a last-projected record of that server
    And `.mcp.json` whose `env` holds only `B`
    When the command reconciles MCP configuration
    Then it reports the `env` map ready to be unset

  @behavior
  Scenario: removes a map the harness dropped altogether
    Given a golden set holding one server with `env` defining `A`
    And a last-projected record of that server
    And `.mcp.json` whose copy of it lacks the `env` field
    When the command reconciles MCP configuration
    Then it reports the `env` map ready to be unset

  @behavior
  Scenario: leaves a change only the golden side made to mcp project
    Given a golden set whose server has since changed its `command`
    And a last-projected record showing the old value
    And `.mcp.json` still holding the old value
    When the command reconciles MCP configuration
    Then it reports no row for that server

  @behavior
  Scenario: keeps a three-way conflict report-only, and refuses its approval
    Given a golden set holding a server with `command` set to one value
    And a last-projected record showing a different value
    And `.mcp.json` holding yet another value
    When the command reconciles MCP configuration
    Then it reports a `skip` action for that field
    And approval is refused with a detail naming the conflict

  @behavior
  Scenario: keeps a divergence no baseline can place report-only
    Given a golden set holding a server with `command` set to one value
    And `.mcp.json` holding a different value
    And no record and no git history
    When the command reconciles MCP configuration
    Then it reports the field as unresolvable

  @behavior
  Scenario: refuses an approval naming no field it offered
    Given a golden set holding one server named `linear`
    When the command reconciles MCP configuration accepting `.mcp.json#servers.linear.url`
    Then it rejects the approval saying the field was never offered

  @behavior
  Scenario: offers each field of a server only the harness declares, without the transport it implies
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with `url`, `timeout`, and `type`
    When the command reconciles MCP configuration
    Then it reports the `url` and `timeout` but not the `type`

  @behavior
  Scenario: offers a transport the harness states against what the golden set would infer
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with `url` and a `type` that differs from what the golden set would infer
    When the command reconciles MCP configuration
    Then it reports an `import` for a `transport` field

  @behavior
  Scenario: adds an approved server as a new table and records it
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding the `linear` server and an additional `docs` server with `url` and `timeout`
    When the command reconciles MCP configuration accepting `.mcp.json#servers.docs.url`
    Then a new server table `docs` is added to the golden set
    And the record is created for both targets

  @behavior
  Scenario: adds a server offered by two harnesses once, when they agree
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with `command`
    And `.cursor/mcp.json` holding the same `docs` server with the same `command`
    When the command reconciles MCP configuration accepting `.mcp.json#servers.docs.command` and `.cursor/mcp.json#servers.docs.command`
    Then the `docs` server is added to the golden set once
    And the record holds it for both targets

  @behavior
  Scenario: refuses to add a server with nothing to run
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with neither `command` nor `url`
    When the command reconciles MCP configuration accepting `.mcp.json#servers.docs.args`
    Then the approval is rejected saying the server lacks a runnable field

  @behavior
  Scenario: refuses two approvals of one field with different values
    Given a golden set holding one server named `linear`
    And a record holding it for both `.mcp.json` and `.cursor/mcp.json`
    And `.mcp.json` whose `command` changed to `bunx`
    And `.cursor/mcp.json` whose `command` changed to `pnpx`
    When the command reconciles MCP configuration accepting both `.mcp.json#servers.linear.command` and `.cursor/mcp.json#servers.linear.command`
    Then the approval is rejected saying the field is approved with different values

  @behavior
  Scenario: hands over a field the golden set spreads over a sub-table as an edit
    Given a golden set holding a server with `headers` defined in a separate table
    And a record of that server
    And `.mcp.json` whose copy of `headers` has changed
    When the command reconciles MCP configuration accepting `.mcp.json#servers.docs.headers`
    Then it reports an `edit` action
    And the golden set is unchanged

  @behavior
  Scenario: hands over an added server as an edit when the golden set declares its servers inline
    Given a golden set that declares `servers` as an inline table
    And `.mcp.json` holding two servers
    When the command reconciles MCP configuration accepting `.mcp.json#servers.docs.command`
    Then it reports an `edit` action
    And the golden set is unchanged

  @behavior
  Scenario: imports the server and refuses the literal, never showing its value
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with `headers` holding an `Authorization` header set to a literal credential
    When the command reconciles MCP configuration
    Then it reports an `import` for that server
    And it refuses the `Authorization` header without showing its value
    And the report contains no literal credential values

  @behavior
  Scenario: offers nothing for a map holding only a literal
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding a server named `docs` with `env` mapping containing only a literal credential
    When the command reconciles MCP configuration
    Then it reports only a `refuse` action for that field
    And no `env` map is offered for import

  @behavior
  Scenario: keeps the golden reference where the harness pasted a literal over it
    Given a golden set holding a server with `env` value named `API_KEY` set to a reference
    And a record of that server
    And `.mcp.json` whose copy of `API_KEY` now holds a literal credential instead
    When the command reconciles MCP configuration
    Then it reports the `API_KEY` field as refused
    And the `env` map is offered for import with the reference preserved

  @behavior
  Scenario: offers nothing when the literal was the only change
    Given a golden set holding a server with `env` value set to a reference
    And a record of that server
    And `.mcp.json` whose copy changed only that value to a literal credential
    When the command reconciles MCP configuration
    Then it reports only a `refuse` action for that field

  @behavior
  Scenario: refuses a url or an argument holding a literal whole
    Given a golden set holding one server named `linear`
    And `.mcp.json` holding servers with `url` set to a literal and `args` containing a literal
    When the command reconciles MCP configuration
    Then it refuses both the `url` and the `args` fields
    And no literal values appear in the report

  @behavior
  Scenario: does not take a timeout Gemini CLI fills in by default for the user’s
    Given a golden set holding one server named `linear`
    And a `.gemini` directory
    And `.gemini/settings.json` holding that server with a `timeout` set to the Gemini CLI default of `600000` milliseconds
    When the command reconciles MCP configuration
    Then it skips that `timeout` with a detail saying the CLI fills it in by default

  @behavior
  Scenario: translates a Cursor reference back into the golden form
    Given a golden set holding one server named `linear`
    And `.cursor/mcp.json` holding a server named `docs` with `env` value using Cursor's `${env:VAR}` syntax
    When the command reconciles MCP configuration
    Then it reports the `env` field with the reference in golden form as `${VAR}`

  @behavior
  Scenario: translates a Codex bearer token and its default timeout
    Given a golden set holding one server named `linear`
    And `.codex/config.toml` holding a server named `docs` with a `bearer_token_env_var` and a `tool_timeout_sec` of the Codex default of `60` seconds
    When the command reconciles MCP configuration
    Then it reports a `headers.Authorization` field with a reference to the token variable
    And it skips the `timeout` with a detail about the Codex default

  @behavior
  Scenario: records a server the record lacks from the baseline of each field
    Given a git history holding an agreed golden and target state
    And a golden set whose server changed its `command`
    And a target file whose copy changed differently
    When the command reconciles MCP configuration accepting a field of that server
    Then the record is populated from the git baseline for fields it did not touch

  @behavior
  Scenario: leaves the record alone for a server another field of which no baseline can place
    Given a git history holding an agreed state for one field
    And the golden set and target both changed different fields with no baseline consensus
    When the command reconciles MCP configuration accepting an approved field
    Then the record remains empty rather than conflating fields with different baselines

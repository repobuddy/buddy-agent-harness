Feature: Project a golden MCP server set into each harness's own MCP file

  # ── buddy-agent-harness mcp project ──

  @behavior
  Scenario: reports nothing to project without a golden set
    Given a repository with no golden set at `.agents/buddy-agent-harness/mcp.toml`
    When the command projects MCP configuration
    Then it reports that there is nothing to project
    And it exits successfully

  @behavior
  Scenario: fails on an unreadable golden set by position only
    Given a golden set whose malformed line assigns an unquoted literal credential
    When the command projects MCP configuration
    Then it exits with a failure naming the line and column
    And nothing it writes contains the credential

  @behavior
  Scenario: refuses a target that does not parse and leaves it alone
    Given a golden set holding one stdio server
    And a `.cursor/mcp.json` that is not JSON
    When the command projects MCP configuration with `--write`
    Then it reports `.cursor/mcp.json` refused
    And `.cursor/mcp.json` is unchanged
    And `.mcp.json` carries the server

  @behavior
  Scenario: creates the MCP file of an enabled harness
    Given a golden set holding one stdio server
    And no `.mcp.json`
    When the command projects MCP configuration with `--write`
    Then `.mcp.json` is created holding that server under `mcpServers`
    And the row says it creates the file

  @behavior
  Scenario: creates nothing for a harness that is not enabled
    Given a golden set holding one stdio server
    And no `.codex` directory
    When the command projects MCP configuration with `--write`
    Then no `.codex/config.toml` exists

  @behavior
  Scenario: appends a server to a JSON file without touching a byte of the rest
    Given a golden set holding the servers `a` and `b`
    And a `.cursor/mcp.json` carrying `a` with a comment beside it
    When the command projects MCP configuration with `--write`
    Then `.cursor/mcp.json` carries `b`
    And every byte the file held before is still there, in order

  @behavior
  Scenario: adds the MCP key to a shared settings file and keeps its comments
    Given a golden set holding one stdio server
    And a `.gemini/settings.json` with a comment and a `context` key and no `mcpServers`
    When the command projects MCP configuration with `--write`
    Then `.gemini/settings.json` carries the server under `mcpServers`
    And its comment and its `context` key are unchanged

  @behavior
  Scenario: appends a server table to a Codex file without touching a byte of the rest
    Given a golden set holding one stdio server
    And a `.codex/config.toml` holding a comment and a `model` setting
    When the command projects MCP configuration with `--write`
    Then the file begins with exactly what it held before
    And it carries the server as an `mcp_servers` table

  @behavior
  Scenario: writes nothing without --write
    Given a golden set holding one stdio server and no MCP file anywhere
    When the command projects MCP configuration
    Then it reports the server added to each enabled harness
    And no file is created and no record is written

  @behavior
  Scenario: records what it projected
    Given a golden set holding one stdio server
    When the command projects MCP configuration with `--write`
    Then `.agents/buddy-agent-harness/mcp.projected.json` records that server's golden model under each target

  @behavior
  Scenario: keeps what the record holds for servers it did not touch
    Given a last-projected record holding a server the golden set no longer declares
    When the command projects MCP configuration with `--write`
    Then the record still holds that server

  @behavior
  Scenario: reports nothing for a server already in agreement
    Given a golden set and a `.mcp.json` that carry the same server
    When the command projects MCP configuration
    Then it reports no row for that server in `.mcp.json`

  @behavior
  Scenario: refuses a server whose golden entry holds a literal credential, without the value
    Given a golden set whose server sets an `env` value named for a token to a literal
    When the command projects MCP configuration with `--write`
    Then it refuses that server for every target, naming the field
    And no field of the report contains the literal
    And no target file carries the server

  @behavior
  Scenario: refuses an SSE server for Codex
    Given a golden set holding a server with transport `sse`
    And a `.codex` directory
    When the command projects MCP configuration
    Then it refuses that server for `.codex/config.toml`, naming the transport

  @behavior
  Scenario: refuses a server with nothing to run
    Given a golden set holding a server with neither `command` nor `url`
    When the command projects MCP configuration
    Then it refuses that server, naming the missing field

  @behavior
  Scenario: refuses a reference Gemini CLI would not expand
    Given a golden set holding a remote server whose `Authorization` header is `Bearer ${TOKEN}`
    And a `.gemini` directory
    When the command projects MCP configuration
    Then it refuses that server for `.gemini/settings.json`, naming `headers`

  @behavior
  Scenario: refuses a variable Codex would have to rename
    Given a golden set whose server sets `env` value `API` to `${OTHER}`
    And a `.codex` directory
    When the command projects MCP configuration
    Then it refuses that server for `.codex/config.toml`, naming `env`

  @behavior
  Scenario: holds back a server the target changed
    Given a last-projected record of a server
    And a `.mcp.json` whose copy of it has since changed its `command`
    When the command projects MCP configuration with `--write`
    Then it skips that server, saying the target changed
    And `.mcp.json` is unchanged

  @behavior
  Scenario: holds back a three-way conflict
    Given a last-projected record of a server
    And both the golden set and `.mcp.json` have since changed its `command`, differently
    When the command projects MCP configuration
    Then it skips that server, saying both sides changed

  @behavior
  Scenario: holds back a server when no baseline can say which side moved
    Given a golden set and a `.mcp.json` that disagree on a server's `command`
    And no record and no git history
    When the command projects MCP configuration
    Then it skips that server, saying no baseline can tell

  @behavior
  Scenario: updates in place a field only the golden set changed
    Given a last-projected record of a server
    And a golden set that has since changed its `command`
    When the command projects MCP configuration with `--write`
    Then `.mcp.json` carries the new `command`
    And every byte outside that server's entry is unchanged

  @behavior
  Scenario: hands over an in-place change to a shared file as an edit
    Given a last-projected record of a server in `.gemini/settings.json`
    And a golden set that has since changed its `command`
    When the command projects MCP configuration with `--write`
    Then it reports an `edit` whose entry reads as Gemini CLI would read it
    And `.gemini/settings.json` is unchanged

  @behavior
  Scenario: hands over a change that would drop a comment as an edit
    Given a last-projected record of a server
    And a `.mcp.json` whose entry for it holds a comment
    And a golden set that has since changed its `command`
    When the command projects MCP configuration with `--write`
    Then it reports an `edit` for that server
    And `.mcp.json` is unchanged

  @behavior
  Scenario: hands over an add it cannot place safely as an edit
    Given a golden set holding one stdio server
    And a `.mcp.json` whose root is an array
    When the command projects MCP configuration with `--write`
    Then it reports an `edit` for that server in `.mcp.json`
    And `.mcp.json` is unchanged

  @behavior
  Scenario: drops a field the target cannot hold rather than refusing
    Given a golden set holding a stdio server with a `description` and a `timeout`
    When the command projects MCP configuration with `--write`
    Then `.cursor/mcp.json` carries the server with neither field
    And a second run reports nothing for it

  @behavior
  Scenario: writes a Claude Code entry with its transport and timeout
    Given a golden set holding a remote server with a `timeout`
    When the command projects MCP configuration with `--write`
    Then `.mcp.json` carries it with `type: "http"` and the same `timeout` in milliseconds

  @behavior
  Scenario: writes a Cursor reference in its own syntax
    Given a golden set whose server header is `Bearer ${TOKEN}`
    When the command projects MCP configuration with `--write`
    Then `.cursor/mcp.json` carries it as `Bearer ${env:TOKEN}`

  @behavior
  Scenario: writes Codex headers and variables through its named fields
    Given a golden set whose server sets `Authorization` to `Bearer ${TOKEN}`, a header to `${KEY}`, `env` value `HOME_DIR` to `${HOME_DIR}`, and a `timeout` of 30000
    And a `.codex` directory
    When the command projects MCP configuration with `--write`
    Then `.codex/config.toml` carries `bearer_token_env_var`, `env_http_headers`, `env_vars`, and `tool_timeout_sec = 30`

  @behavior
  Scenario: writes a Gemini CLI remote server under the field its transport needs
    Given a golden set holding a streamable HTTP server and an SSE server
    And a `.gemini` directory
    When the command projects MCP configuration with `--write`
    Then `.gemini/settings.json` carries the first under `httpUrl` and the second under `url`

  # ── buddy-agent-harness doctor, reading through the dialects ──

  @behavior
  Scenario: reads a Gemini CLI url as SSE
    Given a golden set holding a server with transport `http`
    And a `.gemini/settings.json` carrying it under `url`
    When the command diagnoses MCP configuration
    Then it reports the transport diverged

  @behavior
  Scenario: reads Codex headers and variables back as references
    Given a golden set whose server sets `Authorization` to `Bearer ${TOKEN}` and `env` value `KEY` to `${KEY}`
    And a `.codex/config.toml` carrying it through `bearer_token_env_var` and `env_vars`
    When the command diagnoses MCP configuration
    Then it reports no MCP fault

  @behavior
  Scenario: reports no drift on a field the target cannot hold
    Given a golden set holding a server with a `description`
    And a `.cursor/mcp.json` carrying the server without one
    When the command diagnoses MCP configuration
    Then it reports no MCP fault

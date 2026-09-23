# Triggerware for Hermes Agent

Triggerware is packaged as a local stdio MCP server because Hermes registers external tools through its native MCP client rather than through its Python plugin API.

## Install

In Hermes Desktop, use this one-click MCP installer:

<a href="hermes://mcp/install?name=triggerware&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkB0cmlnZ2Vyd2FyZS9oZXJtZXMiLCJtY3AiXX0">Add Triggerware to Hermes</a>

Or add the server from the command line:

```sh
hermes mcp add triggerware --command npx --args -y @triggerware/hermes mcp
```

Both methods install this configuration:

```yaml
mcp_servers:
  triggerware:
    command: npx
    args:
      - -y
      - "@triggerware/hermes"
      - mcp
```

Start a new Hermes session after installation. Triggerware's tools appear with the `mcp_triggerware_` prefix.

The npm package bundles Triggerware for macOS (Apple Silicon and Intel) and Windows x64.

## Hermes catalog

[`catalog/manifest.yaml`](catalog/manifest.yaml) is the corresponding Hermes MCP catalog entry. Once it is merged into Hermes's upstream `optional-mcps/triggerware/` directory, users can install Triggerware with:

```sh
hermes mcp install triggerware
```

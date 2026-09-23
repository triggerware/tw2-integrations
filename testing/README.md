# Test published Triggerware integrations

Run from tw2-integrations. These helpers install the published npm packages, not the source checkout.
The client CLI and Node/npm must already be installed and available on PATH. For Codex, the helper also looks for the bundled CLI in ChatGPT.app or Codex.app under /Applications or ~/Applications.
Install/uninstall uses each client's normal user configuration; these are not isolated profiles.

| Client | Install | Uninstall |
| --- | --- | --- |
| Codex | `./testing/manage codex install` | `./testing/manage codex uninstall` |
| Claude Code | `./testing/manage claude install` | `./testing/manage claude uninstall` |
| Hermes | `./testing/manage hermes install` | `./testing/manage hermes uninstall` |
| OpenClaw | `./testing/manage openclaw install` | `./testing/manage openclaw uninstall` |

Codex uses testing/.agents/plugins/marketplace.json to find @triggerware/codex on npm. Uninstall removes the plugin cache and unregisters the marketplace; the local catalog remains for the next install.
Claude Code uses testing/.claude-plugin/marketplace.json to find @triggerware/claude-code on npm. Uninstall also unregisters this marketplace; the local catalog remains for the next install.
Both install helpers register testing as the marketplace root.
Hermes registers an MCP server that runs @triggerware/hermes@latest through npx. Removing it unregisters the server; npm's download cache remains.
OpenClaw installs @triggerware/openclaw@latest through its native plugin manager.
Hermes and OpenClaw need no marketplace JSON; their registration commands live in manage.

After changing plugins:

- Claude Code: start a new session, or use `/reload-plugins` if supported by your version.
- Hermes: start a new session, or use `/reload-mcp`.
- OpenClaw: follow the install/uninstall output; if it requires a gateway restart, run `openclaw gateway restart`.
- Codex: start a new task after installing. Restart the app after editing the local marketplace catalog.

Ask the client:

> Use Triggerware's MCP tools to list my installed connectors.

Expect a real `connectors_list` tool call (Hermes prefixes it with `mcp_triggerware_`). If cloud authentication is needed, ask for a Triggerware login link, complete login, then retry.

For another release, uninstall and reinstall the plugin. Hermes's @latest reference resolves the current npm version when the MCP process starts again.

References: [Claude marketplaces](https://code.claude.com/docs/en/plugin-marketplaces), [Hermes MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp), [OpenClaw plugins](https://docs.openclaw.ai/cli/plugins/uninstall-and-update), [Codex plugin setup](https://developers.openai.com/learn/developers-codex-plugin).

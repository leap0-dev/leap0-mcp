# `@leap0/mcp`

Model Context Protocol (MCP) server for [Leap0](https://leap0.dev), built on the [`leap0`](https://www.npmjs.com/package/leap0) JavaScript SDK. It exposes sandbox lifecycle, filesystem, and process tools over **stdio** so clients such as Cursor or Claude can manage Leap0 sandboxes.

## Requirements

- **Node.js** 20.6 or newer
- A **Leap0 API key** (and network access to the Leap0 API)

## Install

```bash
npm install -g @leap0/mcp
# or
pnpm add -g @leap0/mcp
```

For one-off runs without a global install:

```bash
npx @leap0/mcp --help
```

From a clone of this repo, after `pnpm install` and `pnpm run build`:

```bash
node dist/cli.js --help
```

## Environment variables

The server uses the same variables as the `leap0` SDK (see also `Leap0Client` in the SDK docs).

| Variable | Required | Description |
|----------|----------|-------------|
| `LEAP0_API_KEY` | Yes | API key for the Leap0 control plane |
| `LEAP0_BASE_URL` | No | API base URL (SDK default applies if unset) |
| `LEAP0_SANDBOX_DOMAIN` | No | Sandbox hostname domain (SDK default applies if unset) |
| `LEAP0_SDK_OTEL_ENABLED` | No | SDK OpenTelemetry toggle (see `leap0` SDK) |

## Run on the host (not only inside an agent sandbox)

The MCP process must be able to reach the Leap0 API and should have your credentials in its environment. If your coding agent runs in an isolated container without secrets, configure MCP on the **host** (or inject `LEAP0_API_KEY` into the environment where `leap0-mcp` runs). Running only inside a restricted sandbox with no outbound API access will fail at client creation or on the first tool call.

## Agent configuration

Generate a JSON snippet you can merge into your client’s MCP settings:

```bash
leap0-mcp --print-config
```

This prints a `mcpServers` block using your current `node` binary and the resolved path to this package’s `cli.js`. Placeholders use `${VAR}` so you can rely on the shell or replace them with real values.

1. Copy the JSON into your app’s MCP config (e.g. Cursor **Settings → MCP**).
2. Ensure `LEAP0_API_KEY` is set in the server `env` (or remove the placeholder and set it in your user environment before starting the agent).
3. Remove or set optional entries (`LEAP0_BASE_URL`, `LEAP0_SANDBOX_DOMAIN`) if you use non-default endpoints.
4. Restart the editor or MCP host.

On **Windows**, the printed config includes `APPDATA` in `env` (similar to other MCP servers) so tools resolve user paths correctly.

### Cursor

Paste the `mcpServers` object from `--print-config` into your Cursor MCP configuration, or merge it with existing `mcpServers` keys. The server name key is `leap0-mcp`.

### Claude Desktop

Add the same `mcpServers` entry under Claude’s MCP configuration file for your platform (see Anthropic’s MCP documentation for the exact path).

## CLI

| Flag | Meaning |
|------|---------|
| *(none)* | Start the MCP server on stdio (JSON-RPC on stdout only) |
| `--print-config` | Print MCP JSON config to stdout |
| `--version` / `-V` | Print package version |
| `--help` / `-h` | Print usage |

Diagnostics and errors go to **stderr**; MCP traffic uses **stdout**.

## Tools (summary)

Requires [`leap0`](https://www.npmjs.com/package/leap0) **0.5.x** (sandbox `memory` / `disk` / `timeout` fields, list API, and public URL helpers align with that release).

| Tool | Purpose |
|------|---------|
| `leap0_sandboxes_create` | Create a sandbox (`memory` in MiB, `timeout` in **seconds**) |
| `leap0_sandbox_get` | Get sandbox by id |
| `leap0_sandbox_get_workdir` | Configured sandbox working directory (`getWorkdir`) |
| `leap0_sandbox_delete` | Delete sandbox |
| `leap0_sandboxes_list` | List sandboxes (filters / pagination) |
| `leap0_sandbox_invoke_url` | Public HTTPS URL for a path (and optional port) |
| `leap0_sandbox_websocket_url` | Public WebSocket URL for a path |
| `leap0_sandbox_create_presigned_url` | Time-limited public URL for a sandbox port |
| `leap0_fs_read` / `leap0_fs_write` / `leap0_fs_list` | Files in a sandbox |
| `leap0_process_execute` | Run a command in a sandbox |

## Upgrading

1. Match the **`leap0` SDK** version this MCP package declares (see `dependencies` in `package.json`); run `pnpm update leap0` in a checkout or reinstall the published package so `node_modules` resolves to that range.
2. **Rebuild** after dependency changes: `pnpm run build` (or `pnpm run ci` before merging).
3. **Restart** the editor or MCP host so it spawns a fresh `leap0-mcp` process.

## Troubleshooting

- **`Failed to create Leap0 client` / API key errors** — Set `LEAP0_API_KEY` in the MCP `env` or in the process environment before launching `leap0-mcp`.
- **401 / 403 from tools** — Key invalid or missing; confirm the key in the Leap0 dashboard and that the same env is visible to the MCP process.
- **Connection / timeout errors** — Check `LEAP0_BASE_URL`, firewall, and that the machine running MCP can reach the API (not blocked in a no-network sandbox).
- **Empty or wrong PATH in `--print-config`** — The printed `PATH` is taken from the shell that ran the command; adjust in the MCP config if `node` or other binaries are not found when the editor spawns the server.

## Development

```bash
pnpm install
pnpm run ci    # build, typecheck, and Vitest (use in CI pipelines)
pnpm test      # build + Vitest
```

## License

Apache-2.0

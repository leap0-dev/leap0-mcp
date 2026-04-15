#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { createLeap0Client } from "./createClient.js";
import { readPackageVersion } from "./packageVersion.js";
import { startLeap0McpServer } from "./server.js";

function printAgentConfigJson(): void {
  const cliPath = fileURLToPath(import.meta.url);
  const env: Record<string, string> = {
    LEAP0_API_KEY: "${LEAP0_API_KEY}",
    LEAP0_BASE_URL: "${LEAP0_BASE_URL}",
    LEAP0_SANDBOX_DOMAIN: "${LEAP0_SANDBOX_DOMAIN}",
    HOME: "${HOME}",
    PATH: "${PATH}",
  };
  if (process.platform === "win32") {
    env["APPDATA"] = "${APPDATA}";
  }
  const config = {
    mcpServers: {
      "leap0-mcp": {
        command: process.execPath,
        args: [cliPath],
        env,
      },
    },
  };
  process.stdout.write(`${JSON.stringify(config, null, 2)}\n`);
}

function printHelp(): void {
  process.stdout.write(
    `leap0-mcp — Leap0 Model Context Protocol server (stdio)\n\n` +
      `Usage:\n` +
      `  leap0-mcp                 Start MCP server (set LEAP0_API_KEY)\n` +
      `  leap0-mcp --print-config  Print JSON for MCP settings (env placeholders; see README)\n` +
      `  leap0-mcp --version       Print package version\n` +
      `  leap0-mcp --help          Show this message\n`,
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  if (argv.includes("--version") || argv.includes("-V")) {
    process.stdout.write(`${readPackageVersion(import.meta.url)}\n`);
    return;
  }
  if (argv.includes("--print-config")) {
    printAgentConfigJson();
    return;
  }
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }
  if (argv.length > 0) {
    process.stderr.write(`[leap0-mcp] Unknown arguments: ${argv.join(" ")}\n`);
    process.stderr.write("Try leap0-mcp --help\n");
    process.exit(1);
  }

  let client;
  try {
    client = createLeap0Client();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[leap0-mcp] Failed to create Leap0 client: ${msg}\n`);
    process.exit(1);
  }

  try {
    await startLeap0McpServer(client);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stderr.write(`[leap0-mcp] Server error: ${msg}\n`);
    process.exit(1);
  }
}

void main().catch((e: unknown) => {
  const msg = e instanceof Error ? e.stack ?? e.message : String(e);
  process.stderr.write(`[leap0-mcp] ${msg}\n`);
  process.exit(1);
});

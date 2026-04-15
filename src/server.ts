import type { Leap0Client } from "leap0";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readPackageVersion } from "./packageVersion.js";
import { formatToolErrorMessage } from "./mcpToolResult.js";
import { registerLeap0Tools } from "./tools/index.js";

function logToStderr(message: string, err?: unknown): void {
  const extra = err !== undefined ? ` ${formatToolErrorMessage(err)}` : "";
  process.stderr.write(`[leap0-mcp] ${message}${extra}\n`);
}

/**
 * Starts the Leap0 MCP server on stdio. Blocks until the transport closes or a signal is received.
 * Uses stdout only for MCP JSON-RPC; logs go to stderr.
 */
export async function startLeap0McpServer(client: Leap0Client): Promise<void> {
  const version = readPackageVersion(import.meta.url);

  const mcp = new McpServer(
    { name: "leap0-mcp", version },
    {
      instructions:
        "Leap0 Model Context Protocol server. Configure LEAP0_API_KEY (and optional LEAP0_BASE_URL). " +
        "Tools for sandboxes, files, and process execution are registered here as they ship.",
    },
  );

  await registerLeap0Tools(mcp, client);

  const transport = new StdioServerTransport();
  let shuttingDown = false;

  const shutdown = async (from: "SIGINT" | "SIGTERM" | "close") => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    try {
      await mcp.close();
    } catch (e: unknown) {
      logToStderr("failed to close MCP server", e);
    }
    try {
      await client.close();
    } catch (e: unknown) {
      logToStderr("failed to close Leap0 client", e);
    }
    if (from === "SIGINT") {
      process.exit(130);
    }
    process.exit(0);
  };

  transport.onclose = () => {
    void shutdown("close");
  };

  const onSigint = () => {
    void shutdown("SIGINT");
  };
  const onSigterm = () => {
    void shutdown("SIGTERM");
  };
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  try {
    await mcp.connect(transport);
  } catch (e: unknown) {
    logToStderr("failed to connect MCP transport", e);
    await mcp.close().catch((closeErr: unknown) => logToStderr("failed to close MCP server", closeErr));
    await client.close().catch((closeErr: unknown) => logToStderr("failed to close Leap0 client", closeErr));
    throw e;
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
}

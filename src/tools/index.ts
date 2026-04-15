import type { Leap0Client } from "leap0";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerFilesystemTools } from "./filesystem.js";
import { registerProcessTools } from "./process.js";
import { registerSandboxTools } from "./sandboxes.js";

/** Registers all Leap0 MCP tools on the server (sandboxes, filesystem, process). */
export async function registerLeap0Tools(mcp: McpServer, client: Leap0Client): Promise<void> {
  registerSandboxTools(mcp, client);
  registerFilesystemTools(mcp, client);
  registerProcessTools(mcp, client);
}

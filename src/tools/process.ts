import type { Leap0Client } from "leap0";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toErrorToolResult, toTextToolResult } from "../mcpToolResult.js";
import { sandboxIdSchema } from "./sandboxes.js";

const executeInputSchema = {
  sandboxId: sandboxIdSchema.describe("Sandbox id"),
  command: z.string().min(1, "command is required").describe("Shell command line to run in the sandbox"),
  cwd: z.string().optional().describe("Working directory inside the sandbox"),
  env: z.record(z.string(), z.string()).optional().describe("Extra environment variables for the process"),
  timeout: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Timeout in milliseconds for the command (SDK/API may enforce limits)"),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Registers process execution MCP tools (Sandbox.process.execute).
 */
export function registerProcessTools(mcp: McpServer, client: Leap0Client): void {
  mcp.registerTool(
    "leap0_process_execute",
    {
      description:
        "Run a one-shot shell command in a sandbox and return exit code, stdout, and stderr (Sandbox.process.execute).",
      inputSchema: executeInputSchema,
    },
    async ({ sandboxId, command, cwd, env, timeout }) => {
      try {
        const sb = await client.sandboxes.get(sandboxId);
        const params: { command: string; cwd?: string; env?: Record<string, string>; timeout?: number } = {
          command,
        };
        if (cwd !== undefined) {
          params.cwd = cwd;
        }
        if (env !== undefined) {
          params.env = env;
        }
        if (timeout !== undefined) {
          params.timeout = timeout;
        }
        const result = await sb.process.execute(params);
        return toTextToolResult(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );
}

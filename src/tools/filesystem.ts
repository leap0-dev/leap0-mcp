import type { Leap0Client } from "leap0";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toErrorToolResult, toTextToolResult } from "../mcpToolResult.js";
import { sandboxIdSchema } from "./sandboxes.js";

const pathSchema = z.string().min(1, "path is required").describe("Absolute or workspace path in the sandbox");

const readInputSchema = {
  sandboxId: sandboxIdSchema.describe("Sandbox id"),
  path: pathSchema,
  offset: z.number().int().nonnegative().optional().describe("Byte offset to start reading"),
  limit: z.number().int().positive().optional().describe("Max bytes/chars to read"),
  head: z.number().int().positive().optional().describe("Read only the first N lines (exclusive with tail)"),
  tail: z.number().int().positive().optional().describe("Read only the last N lines (exclusive with head)"),
} satisfies Record<string, z.ZodTypeAny>;

const writeInputSchema = {
  sandboxId: sandboxIdSchema.describe("Sandbox id"),
  path: pathSchema,
  content: z.string().describe("UTF-8 text to write"),
  permissions: z.string().optional().describe("Optional chmod-style permissions string"),
} satisfies Record<string, z.ZodTypeAny>;

const listInputSchema = {
  sandboxId: sandboxIdSchema.describe("Sandbox id"),
  path: pathSchema.describe("Directory path to list"),
  recursive: z.boolean().optional().describe("List recursively"),
  exclude: z.array(z.string()).max(50).optional().describe("Glob patterns to exclude"),
} satisfies Record<string, z.ZodTypeAny>;

/**
 * Registers filesystem MCP tools (read / write / list) using {@link Leap0Client} sandbox handles.
 */
export function registerFilesystemTools(mcp: McpServer, client: Leap0Client): void {
  mcp.registerTool(
    "leap0_fs_read",
    {
      description:
        "Read a file inside a sandbox as UTF-8 text (Sandbox.filesystem.readFile). " +
        "For binary files, content may be lossy; prefer small files or use offset/limit.",
      inputSchema: readInputSchema,
    },
    async (args: z.infer<z.ZodObject<typeof readInputSchema>>) => {
      try {
        if (args.head != null && args.tail != null) {
          return toErrorToolResult(new Error("head and tail are mutually exclusive"));
        }
        const { sandboxId, path, offset, limit, head, tail } = args;
        const sb = await client.sandboxes.get(sandboxId);
        const options: { offset?: number; limit?: number; head?: number; tail?: number } = {};
        if (offset !== undefined) {
          options.offset = offset;
        }
        if (limit !== undefined) {
          options.limit = limit;
        }
        if (head !== undefined) {
          options.head = head;
        }
        if (tail !== undefined) {
          options.tail = tail;
        }
        const text = await sb.filesystem.readFile(path, options);
        return toTextToolResult(text);
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_fs_write",
    {
      description: "Write UTF-8 text to a file in a sandbox (Sandbox.filesystem.writeFile).",
      inputSchema: writeInputSchema,
    },
    async ({ sandboxId, path, content, permissions }) => {
      try {
        const sb = await client.sandboxes.get(sandboxId);
        const params = permissions === undefined ? {} : { permissions };
        await sb.filesystem.writeFile(path, content, params);
        return toTextToolResult(JSON.stringify({ ok: true, path }, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_fs_list",
    {
      description: "List a directory in a sandbox (Sandbox.filesystem.ls).",
      inputSchema: listInputSchema,
    },
    async ({ sandboxId, path, recursive, exclude }) => {
      try {
        const sb = await client.sandboxes.get(sandboxId);
        const params: { recursive?: boolean; exclude?: string[] } = {};
        if (recursive !== undefined) {
          params.recursive = recursive;
        }
        if (exclude !== undefined) {
          params.exclude = exclude;
        }
        const result = await sb.filesystem.ls(path, params);
        return toTextToolResult(JSON.stringify(result, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );
}

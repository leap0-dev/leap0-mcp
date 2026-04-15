import type { CreateSandboxParams, Leap0Client, ListSandboxesParams, Sandbox, SandboxListItem } from "leap0";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toErrorToolResult, toTextToolResult } from "../mcpToolResult.js";

function sandboxToRecord(sb: Sandbox): Record<string, unknown> {
  const redactedEnvVars =
    sb.envVars === undefined
      ? undefined
      : Object.fromEntries(Object.keys(sb.envVars).map((key) => [key, "REDACTED"]));

  return {
    id: sb.id,
    templateId: sb.templateId,
    templateName: sb.templateName,
    state: sb.state,
    vcpu: sb.vcpu,
    memory: sb.memory,
    disk: sb.disk,
    timeout: sb.timeout,
    autoPause: sb.autoPause,
    envVars: redactedEnvVars,
    networkPolicy: sb.networkPolicy,
    createdAt: sb.createdAt,
    updatedAt: sb.updatedAt,
  };
}

function sandboxListItemToRecord(item: SandboxListItem): Record<string, unknown> {
  return {
    id: item.id,
    templateId: item.templateId,
    state: item.state,
    launchTime: item.launchTime,
    stateChangeTime: item.stateChangeTime,
    timeoutAt: item.timeoutAt,
    createdAt: item.createdAt,
  };
}

/** Shared MCP input schema for sandbox-scoped tools. */
export const sandboxIdSchema = z.string().trim().min(1, "sandboxId is required");

const listSandboxesInputSchema = {
  state: z
    .enum(["starting", "snapshotting", "running", "paused", "unpausing", "deleting"])
    .optional()
    .describe("Filter by sandbox state"),
  sort: z.enum(["created_at", "state"]).optional().describe("Sort field"),
  orderBy: z.enum(["asc", "desc"]).optional().describe("Sort direction"),
  page: z.number().int().min(1).optional().describe("Page number (1-based)"),
  pageSize: z.number().int().min(1).max(100).optional().describe("Page size (max 100)"),
} satisfies Record<string, z.ZodTypeAny>;

function toListSandboxesParams(args: z.infer<z.ZodObject<typeof listSandboxesInputSchema>>): ListSandboxesParams {
  const p: ListSandboxesParams = {};
  if (args.state !== undefined) {
    p.state = args.state;
  }
  if (args.sort !== undefined) {
    p.sort = args.sort;
  }
  if (args.orderBy !== undefined) {
    p.orderBy = args.orderBy;
  }
  if (args.page !== undefined) {
    p.page = args.page;
  }
  if (args.pageSize !== undefined) {
    p.pageSize = args.pageSize;
  }
  return p;
}

const createParamsSchema = {
  templateName: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .optional()
    .describe("Template name (defaults in SDK if omitted)"),
  vcpu: z.number().int().min(1).max(8).optional().describe("vCPU count"),
  memory: z
    .number()
    .int()
    .min(512)
    .max(8192)
    .multipleOf(2, "memory must be even (MiB)")
    .optional()
    .describe("Memory in MiB (must be even when set; matches leap0 SDK)"),
  timeout: z
    .number()
    .int()
    .min(1)
    .max(28800)
    .optional()
    .describe("Auto-shutdown timeout in seconds (1–28800, matches leap0 SDK)"),
  autoPause: z.boolean().optional().describe("Pause when idle"),
  otelExport: z.boolean().optional(),
  telemetry: z.boolean().optional(),
  envVars: z.record(z.string(), z.string()).optional().describe("Environment variables for the sandbox"),
} satisfies Record<string, z.ZodTypeAny>;

function toCreateSandboxParams(args: z.infer<z.ZodObject<typeof createParamsSchema>>): CreateSandboxParams {
  const p: CreateSandboxParams = {};
  if (args.templateName !== undefined) {
    p.templateName = args.templateName;
  }
  if (args.vcpu !== undefined) {
    p.vcpu = args.vcpu;
  }
  if (args.memory !== undefined) {
    p.memory = args.memory;
  }
  if (args.timeout !== undefined) {
    p.timeout = args.timeout;
  }
  if (args.autoPause !== undefined) {
    p.autoPause = args.autoPause;
  }
  if (args.otelExport !== undefined) {
    p.otelExport = args.otelExport;
  }
  if (args.telemetry !== undefined) {
    p.telemetry = args.telemetry;
  }
  if (args.envVars !== undefined) {
    p.envVars = args.envVars;
  }
  return p;
}

/**
 * Registers sandbox lifecycle MCP tools backed by {@link Leap0Client.sandboxes}.
 */
export function registerSandboxTools(mcp: McpServer, client: Leap0Client): void {
  mcp.registerTool(
    "leap0_sandboxes_create",
    {
      description:
        "Create a new Leap0 sandbox from a template (uses SandboxesClient.create). " +
        "Omitted fields use SDK defaults (template, vCPU, memory, timeout). " +
        "Timeout is in seconds; memory is in MiB.",
      inputSchema: createParamsSchema,
    },
    async (args) => {
      try {
        const params = toCreateSandboxParams(args);
        const sb = await client.sandboxes.create(params);
        return toTextToolResult(JSON.stringify(sandboxToRecord(sb), null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_get",
    {
      description: "Fetch a sandbox by id (SandboxesClient.get).",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
      },
    },
    async ({ sandboxId }) => {
      try {
        const sb = await client.sandboxes.get(sandboxId);
        return toTextToolResult(JSON.stringify(sandboxToRecord(sb), null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_get_workdir",
    {
      description:
        "Fetch the configured working directory for the sandbox (SandboxesClient.getWorkdir).",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
      },
    },
    async ({ sandboxId }) => {
      try {
        const workdir = await client.sandboxes.getWorkdir(sandboxId);
        return toTextToolResult(JSON.stringify({ sandboxId, workdir }, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_delete",
    {
      description: "Delete a sandbox by id (SandboxesClient.delete).",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
      },
    },
    async ({ sandboxId }) => {
      try {
        await client.sandboxes.delete(sandboxId);
        return toTextToolResult(JSON.stringify({ ok: true, deleted: true, sandboxId }, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandboxes_list",
    {
      description:
        "List sandboxes for the authenticated org (SandboxesClient.list). Returns items and totalItems.",
      inputSchema: listSandboxesInputSchema,
    },
    async (args) => {
      try {
        const params = toListSandboxesParams(args);
        const res = await client.sandboxes.list(params);
        const body = {
          totalItems: res.totalItems,
          items: res.items.map((item) => sandboxListItemToRecord(item)),
        };
        return toTextToolResult(JSON.stringify(body, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_invoke_url",
    {
      description:
        "Build the public HTTPS URL for a sandbox path (SandboxesClient.invokeUrl). Does not start the service; use for HTTP APIs exposed on the sandbox.",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
        path: z.string().optional().describe("Path to append (default /)"),
        port: z.number().int().min(1).max(65535).optional().describe("Forwarded port when needed"),
      },
    },
    async ({ sandboxId, path, port }) => {
      try {
        const url = client.sandboxes.invokeUrl(sandboxId, path, port);
        return toTextToolResult(JSON.stringify({ url }, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_websocket_url",
    {
      description: "Build the public WebSocket URL for a sandbox path (SandboxesClient.websocketUrl).",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
        path: z.string().optional().describe("Path to append (default /)"),
        port: z.number().int().min(1).max(65535).optional().describe("Forwarded port when needed"),
      },
    },
    async ({ sandboxId, path, port }) => {
      try {
        const url = client.sandboxes.websocketUrl(sandboxId, path, port);
        return toTextToolResult(JSON.stringify({ url }, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );

  mcp.registerTool(
    "leap0_sandbox_create_presigned_url",
    {
      description:
        "Create a temporary public URL for a sandbox port (SandboxesClient.createPresignedUrl). Returns url, expiresAt, id, port.",
      inputSchema: {
        sandboxId: sandboxIdSchema.describe("Sandbox id"),
        port: z.number().int().min(1).max(65535).describe("Sandbox port to expose"),
        expiresIn: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional lifetime in seconds for the presigned URL"),
      },
    },
    async ({ sandboxId, port, expiresIn }) => {
      try {
        const presigned = await client.sandboxes.createPresignedUrl(sandboxId, {
          port,
          ...(expiresIn !== undefined ? { expiresIn } : {}),
        });
        return toTextToolResult(JSON.stringify(presigned, null, 2));
      } catch (e: unknown) {
        return toErrorToolResult(e);
      }
    },
  );
}

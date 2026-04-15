import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/** Captures tool callbacks registered via {@link McpServer.registerTool} for testing. */
export function captureRegisterToolHandlers(
  mcp: McpServer,
): Map<string, (args: unknown, extra?: unknown) => Promise<unknown>> {
  const handlers = new Map<string, (args: unknown, extra?: unknown) => Promise<unknown>>();
  const m = mcp as McpServer & {
    registerTool: McpServer["registerTool"];
  };
  const original = m.registerTool.bind(mcp);
  m.registerTool = ((name: string, config: unknown, cb: (args: unknown, extra?: unknown) => Promise<unknown>) => {
    handlers.set(name, cb);
    return original(name, config as never, cb as never);
  }) as McpServer["registerTool"];
  return handlers;
}

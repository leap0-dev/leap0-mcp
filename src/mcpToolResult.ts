import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Leap0Error } from "leap0";

/**
 * Human-readable text for logs or MCP error content.
 */
export function formatToolErrorMessage(err: unknown): string {
  if (err instanceof Leap0Error) {
    const parts: string[] = [`[${err.name}] ${err.message}`];
    if (err.statusCode !== undefined) {
      parts.push(`status=${String(err.statusCode)}`);
    }
    if (err.retryable) {
      parts.push("retryable");
    }
    return parts.join(" · ");
  }
  if (err instanceof Error) {
    const base = `${err.name}: ${err.message}`;
    if (err.cause instanceof Error) {
      return `${base} (cause: ${err.cause.name}: ${err.cause.message})`;
    }
    return base;
  }
  if (typeof err === "string") {
    return err;
  }
  try {
    const result = JSON.stringify(err);
    if (result === undefined) {
      return String(err);
    }
    return result;
  } catch {
    return String(err);
  }
}

/**
 * MCP tool result for failures the model should see (not a protocol-level error).
 */
export function toErrorToolResult(err: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: formatToolErrorMessage(err) }],
    isError: true,
  };
}

/**
 * Successful tool result with a single text block (often JSON).
 */
export function toTextToolResult(text: string): CallToolResult {
  return {
    content: [{ type: "text", text }],
  };
}

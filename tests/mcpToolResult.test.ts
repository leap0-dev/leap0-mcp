import { describe, expect, it } from "vitest";
import { Leap0Error, Leap0NotFoundError } from "leap0";
import { formatToolErrorMessage, toErrorToolResult, toTextToolResult } from "../src/mcpToolResult.js";

describe("formatToolErrorMessage", () => {
  it("formats Leap0Error with status and retryable", () => {
    const err = new Leap0Error("boom", { statusCode: 503, retryable: true });
    expect(formatToolErrorMessage(err)).toContain("[Leap0Error]");
    expect(formatToolErrorMessage(err)).toContain("boom");
    expect(formatToolErrorMessage(err)).toContain("status=503");
    expect(formatToolErrorMessage(err)).toContain("retryable");
  });

  it("formats Leap0NotFoundError", () => {
    const err = new Leap0NotFoundError("missing sandbox");
    expect(formatToolErrorMessage(err)).toContain("Leap0NotFoundError");
    expect(formatToolErrorMessage(err)).toContain("missing sandbox");
  });

  it("formats generic Error with cause", () => {
    const err = new Error("outer", { cause: new Error("inner") });
    expect(formatToolErrorMessage(err)).toContain("outer");
    expect(formatToolErrorMessage(err)).toContain("inner");
  });
});

describe("toErrorToolResult", () => {
  it("returns MCP shape with isError true", () => {
    const r = toErrorToolResult(new Leap0Error("bad"));
    expect(r.isError).toBe(true);
    expect(r.content).toHaveLength(1);
    expect(r.content[0]).toMatchObject({ type: "text" });
    if (r.content[0]?.type === "text") {
      expect(r.content[0].text).toContain("bad");
    }
  });
});

describe("toTextToolResult", () => {
  it("returns success text block", () => {
    const r = toTextToolResult("{}");
    expect(r.isError).toBeUndefined();
    expect(r.content[0]).toEqual({ type: "text", text: "{}" });
  });
});

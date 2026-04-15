import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerLeap0Tools } from "../src/tools/index.js";
import { captureRegisterToolHandlers } from "./captureRegisterTool.js";
import { createMockLeap0Client } from "./mockLeap0Client.js";

describe("tool handlers (mocked Leap0Client)", () => {
  async function setup() {
    const { client, mocks } = createMockLeap0Client();
    const mcp = new McpServer({ name: "test", version: "0.0.0" });
    const captured = captureRegisterToolHandlers(mcp);
    await registerLeap0Tools(mcp, client);
    return { mcp, client, mocks, captured };
  }

  it("leap0_sandboxes_create calls sandboxes.create and returns JSON text", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandboxes_create");
    expect(h).toBeDefined();
    const result = (await h!({ templateName: "base" })) as {
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    };
    expect(result.isError).toBeUndefined();
    expect(mocks.sandboxesCreate).toHaveBeenCalledWith(expect.objectContaining({ templateName: "base" }));
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("sandbox-mock-1");
  });

  it("leap0_sandbox_get calls sandboxes.get", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandbox_get");
    const result = (await h!({ sandboxId: "sandbox-mock-1" })) as { content: Array<{ text: string }> };
    expect(mocks.sandboxesGet).toHaveBeenCalledWith("sandbox-mock-1");
    expect(result.content[0]?.text).toContain("sandbox-mock-1");
  });

  it("leap0_sandbox_get_workdir calls sandboxes.getWorkdir", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandbox_get_workdir");
    const result = (await h!({ sandboxId: "sandbox-mock-1" })) as { content: Array<{ text: string }> };
    expect(mocks.sandboxesGetWorkdir).toHaveBeenCalledWith("sandbox-mock-1");
    expect(result.content[0]?.text).toContain("/workspace");
  });

  it("leap0_sandbox_delete calls sandboxes.delete", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandbox_delete");
    await h!({ sandboxId: "sandbox-mock-1" });
    expect(mocks.sandboxesDelete).toHaveBeenCalledWith("sandbox-mock-1");
  });

  it("leap0_sandboxes_list calls sandboxes.list", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandboxes_list");
    const result = (await h!({ state: "running", page: 1, pageSize: 10 })) as {
      isError?: boolean;
      content: Array<{ text: string }>;
    };
    expect(result.isError).toBeUndefined();
    expect(mocks.sandboxesList).toHaveBeenCalledWith(
      expect.objectContaining({ state: "running", page: 1, pageSize: 10 }),
    );
    expect(result.content[0]?.text).toContain("totalItems");
    expect(result.content[0]?.text).toContain("sandbox-mock-1");
  });

  it("leap0_sandbox_invoke_url uses sandboxes.invokeUrl", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandbox_invoke_url");
    const result = (await h!({ sandboxId: "sandbox-mock-1", path: "/api", port: 3000 })) as {
      content: Array<{ text: string }>;
    };
    expect(mocks.sandboxesInvokeUrl).toHaveBeenCalledWith("sandbox-mock-1", "/api", 3000);
    expect(result.content[0]?.text).toContain("https://mock.example");
  });

  it("leap0_sandbox_create_presigned_url calls sandboxes.createPresignedUrl", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_sandbox_create_presigned_url");
    await h!({ sandboxId: "sandbox-mock-1", port: 8080, expiresIn: 120 });
    expect(mocks.sandboxesCreatePresignedUrl).toHaveBeenCalledWith("sandbox-mock-1", {
      port: 8080,
      expiresIn: 120,
    });
  });

  it("leap0_fs_read uses filesystem.readFile", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_fs_read");
    await h!({ sandboxId: "sandbox-mock-1", path: "/tmp/a.txt" });
    expect(mocks.sandboxesGet).toHaveBeenCalled();
    expect(mocks.filesystemReadFile).toHaveBeenCalledWith("/tmp/a.txt", {});
  });

  it("leap0_fs_write uses filesystem.writeFile", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_fs_write");
    await h!({ sandboxId: "sandbox-mock-1", path: "/tmp/b.txt", content: "hi" });
    expect(mocks.filesystemWriteFile).toHaveBeenCalledWith("/tmp/b.txt", "hi", {});
  });

  it("leap0_fs_list uses filesystem.ls", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_fs_list");
    await h!({ sandboxId: "sandbox-mock-1", path: "/workspace" });
    expect(mocks.filesystemLs).toHaveBeenCalledWith("/workspace", {});
  });

  it("leap0_process_execute uses process.execute", async () => {
    const { captured, mocks } = await setup();
    const h = captured.get("leap0_process_execute");
    await h!({ sandboxId: "sandbox-mock-1", command: "echo ok" });
    expect(mocks.processExecute).toHaveBeenCalledWith({ command: "echo ok" });
  });

  it("maps Leap0 errors to isError tool results", async () => {
    const { client, mocks } = createMockLeap0Client();
    mocks.sandboxesGet.mockRejectedValueOnce(new Error("network down"));

    const mcp = new McpServer({ name: "test", version: "0.0.0" });
    const captured = captureRegisterToolHandlers(mcp);
    await registerLeap0Tools(mcp, client);

    const h = captured.get("leap0_sandbox_get");
    const result = (await h!({ sandboxId: "bad" })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/network down/);
  });
});

import type { Leap0Client } from "leap0";
import { vi } from "vitest";

export type MockLeap0Internals = {
  sandboxesCreate: ReturnType<typeof vi.fn>;
  sandboxesGet: ReturnType<typeof vi.fn>;
  sandboxesDelete: ReturnType<typeof vi.fn>;
  sandboxesList: ReturnType<typeof vi.fn>;
  sandboxesGetWorkdir: ReturnType<typeof vi.fn>;
  sandboxesInvokeUrl: ReturnType<typeof vi.fn>;
  sandboxesWebsocketUrl: ReturnType<typeof vi.fn>;
  sandboxesCreatePresignedUrl: ReturnType<typeof vi.fn>;
  filesystemReadFile: ReturnType<typeof vi.fn>;
  filesystemWriteFile: ReturnType<typeof vi.fn>;
  filesystemLs: ReturnType<typeof vi.fn>;
  processExecute: ReturnType<typeof vi.fn>;
  clientClose: ReturnType<typeof vi.fn>;
};

/**
 * Minimal mock {@link Leap0Client} for unit tests (no network).
 * `sandboxes.get` returns a handle with `filesystem` and `process` mocks.
 */
export function createMockLeap0Client(): { client: Leap0Client; mocks: MockLeap0Internals } {
  const filesystemReadFile = vi.fn().mockResolvedValue("mock-file-text");
  const filesystemWriteFile = vi.fn().mockResolvedValue(undefined);
  const filesystemLs = vi.fn().mockResolvedValue({ items: [] });

  const processExecute = vi.fn().mockResolvedValue({
    exitCode: 0,
    stdout: "mock-stdout",
    stderr: "",
  });

  const sandboxHandle = {
    id: "sandbox-mock-1",
    templateId: "tmpl-1",
    templateName: "base",
    state: "running",
    vcpu: 2,
    memory: 1024,
    disk: 8192,
    timeout: 1800,
    createdAt: "2024-01-01T00:00:00.000Z",
    filesystem: {
      readFile: filesystemReadFile,
      writeFile: filesystemWriteFile,
      ls: filesystemLs,
    },
    process: {
      execute: processExecute,
    },
  };

  const sandboxesCreate = vi.fn().mockResolvedValue(sandboxHandle);
  const sandboxesGet = vi.fn().mockResolvedValue(sandboxHandle);
  const sandboxesDelete = vi.fn().mockResolvedValue(undefined);
  const sandboxesList = vi.fn().mockResolvedValue({
    totalItems: 1,
    items: [
      {
        id: "sandbox-mock-1",
        templateId: "tmpl-1",
        state: "running",
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    ],
  });
  const sandboxesGetWorkdir = vi.fn().mockResolvedValue("/workspace");
  const sandboxesInvokeUrl = vi.fn().mockReturnValue("https://mock.example/sbx/sandbox-mock-1/");
  const sandboxesWebsocketUrl = vi.fn().mockReturnValue("wss://mock.example/sbx/sandbox-mock-1/ws");
  const sandboxesCreatePresignedUrl = vi.fn().mockResolvedValue({
    id: "pre-1",
    token: "tok",
    url: "https://mock.example/pre/tok",
    sandboxId: "sandbox-mock-1",
    port: 8080,
    expiresAt: "2024-01-02T00:00:00.000Z",
    createdAt: "2024-01-01T00:00:00.000Z",
  });
  const clientClose = vi.fn().mockResolvedValue(undefined);

  const client = {
    sandboxes: {
      create: sandboxesCreate,
      get: sandboxesGet,
      delete: sandboxesDelete,
      list: sandboxesList,
      getWorkdir: sandboxesGetWorkdir,
      invokeUrl: sandboxesInvokeUrl,
      websocketUrl: sandboxesWebsocketUrl,
      createPresignedUrl: sandboxesCreatePresignedUrl,
    },
    close: clientClose,
  };

  return {
    client: client as unknown as Leap0Client,
    mocks: {
      sandboxesCreate,
      sandboxesGet,
      sandboxesDelete,
      sandboxesList,
      sandboxesGetWorkdir,
      sandboxesInvokeUrl,
      sandboxesWebsocketUrl,
      sandboxesCreatePresignedUrl,
      filesystemReadFile,
      filesystemWriteFile,
      filesystemLs,
      processExecute,
      clientClose,
    },
  };
}

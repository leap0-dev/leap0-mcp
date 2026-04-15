import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const rootDir = dirname(fileURLToPath(import.meta.url));
const cliJs = join(rootDir, "..", "dist", "cli.js");

describe("cli", () => {
  it("--version prints semver", () => {
    const out = execFileSync(process.execPath, [cliJs, "--version"], { encoding: "utf8" });
    expect(out.trim()).toMatch(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/);
  });

  it("--print-config prints JSON with mcpServers", () => {
    const out = execFileSync(process.execPath, [cliJs, "--print-config"], { encoding: "utf8" });
    const parsed = JSON.parse(out) as {
      mcpServers: Record<string, { command: string; args: string[]; env: Record<string, string> }>;
    };
    const entry = parsed.mcpServers["leap0-mcp"];
    if (entry === undefined) {
      expect.fail("missing leap0-mcp server entry");
    }
    expect(entry.command).toBeTruthy();
    expect(entry.args).toContain(cliJs);
    expect(entry.env["LEAP0_API_KEY"]).toBe("${LEAP0_API_KEY}");
    expect(entry.env["LEAP0_BASE_URL"]).toBe("${LEAP0_BASE_URL}");
    expect(entry.env["LEAP0_SANDBOX_DOMAIN"]).toBe("${LEAP0_SANDBOX_DOMAIN}");
  });

  it("rejects unknown args", () => {
    expect(() => {
      execFileSync(process.execPath, [cliJs, "nope"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    }).toThrow();
  });
});

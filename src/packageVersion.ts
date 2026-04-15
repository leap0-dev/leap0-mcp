import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Reads `version` from the nearest `package.json` (parent of the compiled or source module dir).
 */
export function readPackageVersion(moduleUrl: string = import.meta.url): string {
  const baseDir = dirname(fileURLToPath(moduleUrl));
  const pkgPath = join(baseDir, "..", "package.json");
  const raw = readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { version?: string };
  if (typeof pkg.version !== "string" || !pkg.version) {
    throw new Error(`Invalid or missing "version" in ${pkgPath}`);
  }
  return pkg.version;
}

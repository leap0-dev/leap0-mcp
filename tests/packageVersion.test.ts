import { describe, expect, it } from "vitest";
import { readPackageVersion } from "../src/packageVersion.js";

describe("readPackageVersion", () => {
  it("reads version from package.json next to src/", () => {
    const v = readPackageVersion(import.meta.url);
    expect(v).toMatch(/^\d+\.\d+\.\d+/);
  });
});

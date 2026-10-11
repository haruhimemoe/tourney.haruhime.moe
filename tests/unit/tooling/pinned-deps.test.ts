/**
 * @file tests/unit/tooling/pinned-deps.test.ts
 * @desc Every `@haruhimemoe/*` dependency is pinned to an exact version (no ^, ~, ranges or
 *       tags), so a new release of our own packages never lands without a deliberate bump.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import pkg from "../../../package.json";

const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const haruhimeDeps = (deps: Record<string, string>) =>
  Object.entries(deps).filter(([name]) => name.startsWith("@haruhimemoe/"));

describe("package.json", () => {
  it.each([
    ["dependencies", pkg.dependencies],
    ["devDependencies", pkg.devDependencies],
  ])("pins every @haruhimemoe/* entry in %s", (_, deps) => {
    const loose = haruhimeDeps(deps).filter(([, version]) => !EXACT.test(version));
    expect(loose).toEqual([]);
  });

  it("pins @haruhimemoe/next-kit to 0.20.0", () => {
    expect(pkg.dependencies["@haruhimemoe/next-kit"]).toBe("0.20.0");
  });
});

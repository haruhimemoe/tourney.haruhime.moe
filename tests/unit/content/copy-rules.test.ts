/**
 * @file tests/unit/content/copy-rules.test.ts
 * @desc House copy rules for words people read: no em dash anywhere in content/** or
 *       src/constants/**.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : [full];
  });

it("uses no em dash in content or constants", () => {
  const offenders = [...files("content"), ...files("src/constants")].filter((f) =>
    readFileSync(f, "utf8").includes("—"),
  );
  expect(offenders).toEqual([]);
});

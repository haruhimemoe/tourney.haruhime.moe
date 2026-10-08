/**
 * @file tests/unit/tooling/revalidate-writes.test.ts
 * @desc Every API route that writes marks the cached public pages stale (revalidateEdition or
 *       revalidateLists), so a host's change shows on the next request. The settings route
 *       (updateEdition: siteMode) and the rounds route (updateRound: poolRevealed) are named
 *       explicitly: a stale page there would show a hidden edition or an unrevealed pool.
 *       Exceptions are listed with their reason.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : name === "route.ts" ? [full] : [];
  });

/** Write routes that change nothing a public page shows, or revalidate in the service. */
const EXCEPTIONS: Record<string, string> = {
  "src/app/api/signout/route.ts": "clears a cookie",
  "src/app/api/manage/[lineage]/admins/route.ts": "members are checked live, not cached",
  "src/app/api/manage/[lineage]/[edition]/matches/[code]/fill/route.ts": "a preview, saves nothing",
  "src/app/api/manage/[lineage]/[edition]/qualifiers/fill/route.ts": "a preview, saves nothing",
  "src/app/api/manage/[lineage]/[edition]/qualifiers/scores/route.ts":
    "qualifier scores are not on public pages",
  "src/app/api/internal/account/[op]/route.ts": "deleteUser revalidates the editions it touches",
};

const WRITES = /export (const|async function) (PUT|POST|PATCH|DELETE)\b/;
const REVALIDATES = /revalidate(Edition|Lists)\(/;

describe("write routes", () => {
  const writes = files("src/app/api").filter((f) => WRITES.test(readFileSync(f, "utf8")));

  it("each mark the public pages stale, or are a listed exception", () => {
    const missing = writes.filter(
      (f) => !(f in EXCEPTIONS) && !REVALIDATES.test(readFileSync(f, "utf8")),
    );
    expect(missing).toEqual([]);
  });

  it("include the settings (siteMode) and rounds (poolRevealed) routes", () => {
    for (const [file, call] of [
      ["src/app/api/manage/[lineage]/[edition]/settings/route.ts", "updateEdition"],
      ["src/app/api/manage/[lineage]/[edition]/rounds/route.ts", "updateRound"],
    ] as const) {
      const source = readFileSync(file, "utf8");
      expect(source).toContain(call);
      expect(source).toMatch(/revalidateEdition\(/);
    }
  });

  it("list no exception that no longer exists", () => {
    for (const file of Object.keys(EXCEPTIONS)) expect(writes).toContain(file);
  });
});

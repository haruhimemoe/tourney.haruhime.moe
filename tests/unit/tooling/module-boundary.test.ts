/**
 * @file tests/unit/tooling/module-boundary.test.ts
 * @desc Core (everything under src/ outside src/modules/) may only import
 *       src/modules/registry.ts or src/modules/types.ts; it may never reach into a module's own
 *       folder, by alias (@/modules/<id>) or by relative path (../modules/<id>). That keeps a
 *       disabled or unshipped module's code out of pages and services that aren't opted in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(import.meta.dirname, "..", "..", "..", "src");

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (full.startsWith(path.join(SRC, "modules"))) return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });

// Matches "from '...'", bare "import '...'", "import('...')" and "require('...')".
const IMPORT_SPECIFIER = /(?:from\s+|import\s+|import\s*\(|require\s*\()["']([^"']+)["']/g;

/** True for a specifier reaching into a module's own folder, by alias or by relative path. */
const entersModuleFolder = (specifier: string): boolean => {
  const match = specifier.match(/(?:^|\/)modules\/([^/]+)/);
  return match !== null && match[1] !== "registry" && match[1] !== "types";
};

describe("module import boundary", () => {
  it("never lets core reach into a module's own folder", () => {
    const offenders: string[] = [];

    for (const file of files(SRC)) {
      const source = readFileSync(file, "utf8");
      for (const m of source.matchAll(IMPORT_SPECIFIER)) {
        const specifier = m[1];
        if (specifier !== undefined && entersModuleFolder(specifier))
          offenders.push(`${path.relative(SRC, file)}: "${specifier}"`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("still allows the registry and types imports core is built on", () => {
    expect(entersModuleFolder("@/modules/registry")).toBe(false);
    expect(entersModuleFolder("@/modules/types")).toBe(false);
    expect(entersModuleFolder("../modules/registry")).toBe(false);
  });

  it("flags both alias and relative paths into a module's folder", () => {
    expect(entersModuleFolder("@/modules/crowdfund")).toBe(true);
    expect(entersModuleFolder("../../modules/crowdfund")).toBe(true);
    expect(entersModuleFolder("./modules/crowdfund/index")).toBe(true);
  });
});

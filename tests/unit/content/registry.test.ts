/**
 * @file tests/unit/content/registry.test.ts
 * @desc The content registry, the MDX loaders and the files under content/ name the same pages,
 *       so no page builds without its file and no file sits unregistered; tourney has docs and
 *       legal, no guides.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { contentFileDrift } from "@haruhimemoe/next-kit/docs/files";
import { expect, it } from "vitest";
import { CONTENT } from "@/constants/content";
import { LOADERS } from "@/content/load";

it("registry, loaders and files agree", () => {
  expect(contentFileDrift(CONTENT)).toEqual({ missingFiles: [], unregistered: [] });
  for (const s of CONTENT.sections)
    expect(Object.keys(LOADERS[s] ?? {}).sort()).toEqual(
      CONTENT.entries[s].map((e) => e.slug).sort(),
    );
});

it("has docs and legal, no guides", () => {
  expect(CONTENT.sections).toEqual(["docs", "legal"]);
  expect(LOADERS.guides).toBeUndefined();
});

it("keeps nav titles within 32 characters", () => {
  for (const s of CONTENT.sections)
    for (const e of CONTENT.entries[s])
      expect((e.navTitle ?? e.title).length).toBeLessThanOrEqual(32);
});

/**
 * @file tests/unit/modules/module-card-dto.test.ts
 * @desc moduleCardDto strips a registry TourneyModule (which carries function fields:
 *       settingsHref, exportUser, deleteUser) down to plain data the "use client" ModuleCard
 *       can actually receive across the RSC boundary. structuredClone succeeding on the result
 *       is the check: React's serialization of server-to-client props fails the same way
 *       structuredClone does on a value holding a function.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { moduleCardDto } from "@/lib/module-card-dto";
import type { TourneyModule } from "@/modules/types";

const fixture: TourneyModule = {
  id: "crowdfund",
  name: "Crowdfund",
  description: "Stretch tiers and unlocks.",
  scope: "lineage",
  permissions: ["crowdfund.manage"],
  events: ["crowdfund.tier-unlocked"],
  settingsHref: (base) => `${base}/crowdfund`,
  unlockables: async () => [],
  exportUser: async () => ({}),
  deleteUser: async () => {},
};

describe("moduleCardDto", () => {
  it("resolves settingsHref against the base and carries the enabled flag", () => {
    const dto = moduleCardDto(fixture, "/manage/egc/egc2026/settings/modules", true);
    expect(dto).toEqual({
      id: "crowdfund",
      name: "Crowdfund",
      description: "Stretch tiers and unlocks.",
      settingsUrl: "/manage/egc/egc2026/settings/modules/crowdfund",
      enabled: true,
    });
  });

  it("falls back to a null settingsUrl when the module has no settingsHref", () => {
    const { settingsHref, ...withoutHref } = fixture;
    const dto = moduleCardDto(withoutHref, "/manage/egc/egc2026/settings/modules", false);
    expect(dto.settingsUrl).toBeNull();
  });

  it("returns plain data a client boundary can serialize, even though the module has functions", () => {
    const dto = moduleCardDto(fixture, "/manage/egc/egc2026/settings/modules", true);
    expect(() => structuredClone(dto)).not.toThrow();
    expect(structuredClone(dto)).toEqual(dto);
  });
});

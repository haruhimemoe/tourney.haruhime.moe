/**
 * @file tests/unit/modules/registry.test.ts
 * @desc checkRegistry rejects bad ids, duplicate ids, and permissions/events outside a module's
 *       own namespace, on a fixture list; MODULES itself is empty and already passes;
 *       findModule looks the real registry up.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { checkRegistry, findModule, MODULES } from "@/modules/registry";
import type { TourneyModule } from "@/modules/types";

const fixture = (overrides: Partial<TourneyModule> = {}): TourneyModule => ({
  id: "crowdfund",
  name: "Crowdfund",
  description: "Stretch tiers and unlocks.",
  scope: "lineage",
  permissions: ["crowdfund.manage"],
  events: ["crowdfund.tier-unlocked"],
  exportUser: async () => ({}),
  deleteUser: async () => {},
  ...overrides,
});

describe("checkRegistry", () => {
  it("passes a well-formed fixture list", () => {
    expect(() => checkRegistry([fixture()])).not.toThrow();
  });

  it("passes the real, currently-empty MODULES list", () => {
    expect(() => checkRegistry(MODULES)).not.toThrow();
  });

  it("rejects an id that isn't kebab-case", () => {
    expect(() => checkRegistry([fixture({ id: "Crowdfund" })])).toThrow(/kebab-case/);
  });

  it("rejects a duplicate id", () => {
    expect(() => checkRegistry([fixture(), fixture({ permissions: ["crowdfund.other"] })])).toThrow(
      /more than once/,
    );
  });

  it("rejects a permission outside the module's namespace", () => {
    expect(() => checkRegistry([fixture({ permissions: ["prize-pool.manage"] })])).toThrow(
      /permission outside its namespace/,
    );
  });

  it("rejects an event outside the module's namespace", () => {
    expect(() => checkRegistry([fixture({ events: ["prize-pool.changed"] })])).toThrow(
      /event outside its namespace/,
    );
  });
});

describe("findModule", () => {
  it("is undefined for an id that isn't registered", () => {
    expect(findModule("nope")).toBeUndefined();
  });
});

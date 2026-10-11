/**
 * @file tests/integration/lib/modules.test.ts
 * @desc isEnabled reads `lineage.modules` only; requireModulePage calls notFound() for a
 *       disabled module and does nothing for an enabled one; moduleRoute answers 404, not 403,
 *       when the module is off for that lineage, runs the wrapped handler when it's on, and
 *       still enforces manageRoute's own role and cross-site checks first.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { isEnabled, moduleRoute, requireModulePage } from "@/lib/modules";
import type { Lineage } from "@/schemas/lineage";
import { getLineageBySlug } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";

setupTestDb();

const MODULE_ID = "test-module";

const lineageWithModules = (modules: readonly string[]): Lineage =>
  ({ modules }) as unknown as Lineage;

const request = (cookie?: string) =>
  new Request("https://tourney.haruhime.moe/api/manage/evergreen-cup/test-module/thing", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://tourney.haruhime.moe",
      "sec-fetch-site": "same-origin",
      ...(cookie ? { cookie } : {}),
    },
    body: "{}",
  });

describe("isEnabled", () => {
  it("is true only when the id is in lineage.modules", () => {
    expect(isEnabled(lineageWithModules([MODULE_ID]), MODULE_ID)).toBe(true);
    expect(isEnabled(lineageWithModules([]), MODULE_ID)).toBe(false);
    expect(isEnabled(lineageWithModules(["other-module"]), MODULE_ID)).toBe(false);
  });
});

describe("requireModulePage", () => {
  it("throws (notFound) when the module is disabled", () => {
    expect(() => requireModulePage(lineageWithModules([]), MODULE_ID)).toThrow();
  });

  it("does nothing when the module is enabled", () => {
    expect(() => requireModulePage(lineageWithModules([MODULE_ID]), MODULE_ID)).not.toThrow();
  });
});

describe("moduleRoute", () => {
  const enableModule = async (slug: string) => {
    await collections(getDb()).lineages.updateOne({ slug }, { $set: { modules: [MODULE_ID] } });
  };

  it("answers 404, not 403, when the module is off for that lineage", async () => {
    const { owner, lineage } = await seedLineage();
    const route = moduleRoute(MODULE_ID, "admin", async () => Response.json({ ran: true }));
    const res = await route(request(owner.cookie), {
      params: Promise.resolve({ lineage: lineage.slug }),
    });
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: { code: "not-found" } });
  });

  it("runs the handler when the module is enabled and the role is met", async () => {
    const { owner, lineage } = await seedLineage();
    await enableModule(lineage.slug);
    const route = moduleRoute(MODULE_ID, "admin", async () => Response.json({ ran: true }));
    const res = await route(request(owner.cookie), {
      params: Promise.resolve({ lineage: lineage.slug }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ran: true });
    expect((await getLineageBySlug(lineage.slug))?.modules).toEqual([MODULE_ID]);
  });

  it("still refuses a signed-in stranger with 403 before ever checking the module", async () => {
    const { lineage } = await seedLineage();
    await enableModule(lineage.slug);
    const stranger = await createTestUser(999);
    const route = moduleRoute(MODULE_ID, "admin", async () => Response.json({ ran: true }));
    const res = await route(request(stranger.cookie), {
      params: Promise.resolve({ lineage: lineage.slug }),
    });
    expect(res.status).toBe(403);
  });

  it("refuses a signed-out visitor with 401 before ever checking the module", async () => {
    const { lineage } = await seedLineage();
    await enableModule(lineage.slug);
    const route = moduleRoute(MODULE_ID, "admin", async () => Response.json({ ran: true }));
    const res = await route(request(), { params: Promise.resolve({ lineage: lineage.slug }) });
    expect(res.status).toBe(401);
  });
});

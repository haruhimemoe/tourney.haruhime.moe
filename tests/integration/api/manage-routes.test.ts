/**
 * @file tests/integration/api/manage-routes.test.ts
 * @desc Every manage route refuses a signed-in stranger with 403 (routes any account may
 *       call aside) and a visitor with 401, and writes nothing either way.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import { MANAGE_ROUTES } from "@/constants/manage-routes";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { callRoute, seedLineage, snapshotCounts } from "../../helpers/manage";

setupTestDb();

describe.each(MANAGE_ROUTES)("$method $path", (route) => {
  it.skipIf(route.need === "signedIn")(
    "refuses a signed-in stranger with 403 and writes nothing",
    async () => {
      const { lineage } = await seedLineage();
      const stranger = await createTestUser(999);
      const before = await snapshotCounts();
      const res = await callRoute(route, lineage.slug, stranger.cookie);
      expect(res.status).toBe(403);
      expect(await snapshotCounts()).toEqual(before);
    },
  );

  it("refuses signed out with 401 and writes nothing", async () => {
    const { lineage } = await seedLineage();
    const before = await snapshotCounts();
    expect((await callRoute(route, lineage.slug, null)).status).toBe(401);
    expect(await snapshotCounts()).toEqual(before);
  });
});

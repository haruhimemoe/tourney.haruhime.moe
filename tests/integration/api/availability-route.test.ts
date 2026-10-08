/**
 * @file tests/integration/api/availability-route.test.ts
 * @desc PUT /api/availability: signed out is 401, a player saves their default and an edition
 *       they registered for, an edition they never registered for is 404, a bad zone is 400,
 *       and a cross-site write is refused.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { PUT } from "@/app/api/availability/route";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { getAvailability } from "@/services/availability";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";
import { makeRegistration } from "../../helpers/records";

setupTestDb();

const call = (body: unknown, cookie?: string, site = "same-origin") =>
  PUT(
    new Request("https://tourney.haruhime.moe/api/availability", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: site === "same-origin" ? "https://tourney.haruhime.moe" : "https://evil.example",
        "sec-fetch-site": site,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe("PUT /api/availability", () => {
  it("is 401 signed out", async () => {
    expect((await call({ editionId: null, zone: "UTC", slots: [1] })).status).toBe(401);
  });

  it("refuses a cross-site write", async () => {
    const user = await createTestUser(101);
    const res = await call({ editionId: null, zone: "UTC", slots: [1] }, user.cookie, "cross-site");
    expect(res.status).toBe(403);
    expect(await getAvailability(user.id, null)).toBeNull();
  });

  it("saves the default and an edition the player registered for", async () => {
    const { editionId } = await seedLineage();
    const user = await createTestUser(101);
    const { id: _, ...reg } = makeRegistration({ editionId, userId: user.id, osuId: 101 });
    await collections(getDb()).registrations.insertOne({ _id: new ObjectId(), ...reg });
    expect(
      (await call({ editionId: null, zone: "Asia/Tokyo", slots: [0, 1] }, user.cookie)).status,
    ).toBe(200);
    expect((await call({ editionId, zone: "UTC", slots: [5] }, user.cookie)).status).toBe(200);
    expect((await getAvailability(user.id, editionId))?.zone).toBe("UTC");
    expect((await getAvailability(user.id, null))?.zone).toBe("Asia/Tokyo");
  });

  it("is 404 for an edition the player never registered for", async () => {
    const { editionId } = await seedLineage();
    const user = await createTestUser(101);
    expect((await call({ editionId, zone: "UTC", slots: [5] }, user.cookie)).status).toBe(404);
  });

  it("is 400 for a bad zone or slot", async () => {
    const user = await createTestUser(101);
    expect(
      (await call({ editionId: null, zone: "Mars/Base", slots: [5] }, user.cookie)).status,
    ).toBe(400);
    expect((await call({ editionId: null, zone: "UTC", slots: [999] }, user.cookie)).status).toBe(
      400,
    );
  });
});

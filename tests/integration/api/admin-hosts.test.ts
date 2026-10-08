/**
 * @file tests/integration/api/admin-hosts.test.ts
 * @desc PUT /api/admin/hosts: signed out is 401, a non-admin is 403, an unknown osu! id is 404,
 *       and an admin marking a host verified raises their edition limit to 10 (and back to 1).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "@/app/api/admin/hosts/route";
import { listVerifiedHosts } from "@/services/hosts";
import { editionLimit } from "@/services/limits";
import { ADMIN_OSU_ID, createTestAdmin, createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";

setupTestDb();
beforeEach(() => vi.stubEnv("ADMIN_OSU_IDS", String(ADMIN_OSU_ID)));

const call = (body: unknown, cookie?: string) =>
  PUT(
    new Request("https://tourney.haruhime.moe/api/admin/hosts", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        origin: "https://tourney.haruhime.moe",
        "sec-fetch-site": "same-origin",
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );

describe("PUT /api/admin/hosts", () => {
  it("is 401 signed out and 403 for a non-admin", async () => {
    const host = await createTestUser(500);
    expect((await call({ osuId: 500, verified: true })).status).toBe(401);
    expect((await call({ osuId: 500, verified: true }, host.cookie)).status).toBe(403);
    expect(await editionLimit(host.id)).toBe(1);
  });

  it("lets an admin verify a host, raising their limit to 10, and undo it", async () => {
    const admin = await createTestAdmin();
    const host = await createTestUser(500, "bighost");
    expect((await call({ osuId: 500, verified: true }, admin.cookie)).status).toBe(200);
    expect(await editionLimit(host.id)).toBe(10);
    expect((await listVerifiedHosts()).map((h) => h.username)).toEqual(["bighost"]);
    expect((await call({ osuId: 500, verified: false }, admin.cookie)).status).toBe(200);
    expect(await editionLimit(host.id)).toBe(1);
    expect(await listVerifiedHosts()).toEqual([]);
  });

  it("is 404 for an osu! id with no account", async () => {
    const admin = await createTestAdmin();
    expect((await call({ osuId: 999999, verified: true }, admin.cookie)).status).toBe(404);
  });
});

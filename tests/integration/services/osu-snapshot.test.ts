/**
 * @file tests/integration/services/osu-snapshot.test.ts
 * @desc takeSnapshot against a stand-in osu! API: a ranked player, an unranked one, a missing
 *       account and an outage.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { takeSnapshot } from "@/services/osu-snapshot";
import { osuHandlers } from "../../helpers/osu-server";

const server = setupServer(...osuHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const now = new Date("2026-10-07T12:00:00.000Z");

describe("takeSnapshot", () => {
  it("reads rank, country and username", async () =>
    expect(await takeSnapshot(1001, "osu", now)).toEqual({
      ok: true,
      value: { rank: 5000, country: "US", username: "ranked", takenAt: now.toISOString() },
    }));
  it("keeps an unranked player's rank null", async () => {
    const result = await takeSnapshot(1002, "mania", now);
    expect(result.ok && result.value.rank).toBeNull();
  });
  it("refuses a missing or restricted account", async () =>
    expect(await takeSnapshot(404, "osu", now)).toMatchObject({
      ok: false,
      error: { code: "osu-user-unavailable" },
    }));
  it("reports an osu! outage", async () =>
    expect(await takeSnapshot(500, "osu", now)).toMatchObject({
      ok: false,
      error: { code: "osu-unavailable" },
    }));
});

/**
 * @file tests/integration/e2e/solo-third-place.test.ts
 * @desc A 1v1 tournament end to end, through the route handlers: 8 players register, the host
 *       approves them, seeds by hand, makes a single elimination bracket with a third place
 *       match and saves every result. Places 1 to 4 are decided, the third place match is played
 *       and the public view hides nothing a player didn't give.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { editionResults } from "@/services/brackets";
import { publicEdition } from "@/services/public-view";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { api, playOut } from "../../helpers/e2e";
import { osuHandlers } from "../../helpers/osu-server";

setupTestDb();
const server = setupServer(...osuHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());

const SOLO = { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 } as const;
const PLAYERS = 8;

describe("1v1 single elimination with third place", () => {
  it("decides places 1 to 4", { timeout: 60_000 }, async () => {
    const host = await createTestUser(1, "host");
    await api(
      "POST",
      "/api/manage/lineages",
      {
        slug: "solo-cup",
        name: "Solo Cup",
        description: "",
        defaults: { mode: "osu", sides: SOLO, rulesText: "" },
      },
      host.cookie,
    );
    await api(
      "POST",
      "/api/manage/solo-cup/editions",
      {
        name: "Solo Cup 2026",
        code: "SC2026",
        mode: "osu",
        sides: SOLO,
        year: 2026,
        dates: { start: null, end: null },
      },
      host.cookie,
    );
    const base = "/api/manage/solo-cup/sc2026";
    await api(
      "PATCH",
      `${base}/settings`,
      { registration: { opensAt: null, closesAt: null, playerCap: null, staffCap: null } },
      host.cookie,
    );
    await api(
      "PUT",
      `${base}/rounds`,
      {
        bracket: {
          format: "single",
          size: PLAYERS,
          bestOf: { default: 9 },
          thirdPlace: true,
          grandFinalReset: false,
          seeding: "manual",
          randomSeed: null,
        },
      },
      host.cookie,
    );
    await api("POST", `${base}/phase`, { to: "registration" }, host.cookie);
    for (let i = 0; i < PLAYERS; i++) {
      const user = await createTestUser(4000 + i, `p${i}`);
      await api("POST", "/api/editions/solo-cup/sc2026/registration", { answers: {} }, user.cookie);
    }
    const regs = await collections(getDb()).registrations.find({}).toArray();
    await api(
      "POST",
      `${base}/registrations/review`,
      { ids: regs.map((r) => r._id.toHexString()), to: "approved" },
      host.cookie,
    );
    const teams = await collections(getDb()).teams.find({}).sort({ captainId: 1 }).toArray();
    expect(teams).toHaveLength(PLAYERS);
    await api(
      "PUT",
      `${base}/seeds`,
      {
        method: "manual",
        seeds: teams.map((t, i) => ({ teamId: t._id.toHexString(), seed: i + 1 })),
      },
      host.cookie,
    );
    await api("POST", `${base}/phase`, { to: "bracket" }, host.cookie);
    await api("POST", `${base}/bracket`, {}, host.cookie);
    const editionId = teams[0]?.editionId ?? "";
    // 4 quarterfinals, 2 semifinals, the third place match and the final.
    expect(await playOut(base, editionId, host.cookie)).toBe(8);

    const third = await collections(getDb()).matches.findOne({ editionId, round: "3RD" });
    expect(third?.status).toBe("done");
    const { champion, placements } = await editionResults(editionId);
    const seedOf = (id: string | null) => teams.findIndex((t) => t._id.toHexString() === id) + 1;
    // Side a always wins, so the top seeds go through.
    expect(seedOf(champion)).toBe(1);
    const place = (n: number) => placements.filter((p) => p.place === n).length;
    expect([place(1), place(2), place(3), place(4)]).toEqual([1, 1, 1, 1]);

    const view = await publicEdition("solo-cup", "sc2026", null);
    const text = JSON.stringify(view);
    expect(text).toContain("player4000");
    expect(text).not.toContain("snapshot");
    expect(text).not.toContain("answers");
  });
});

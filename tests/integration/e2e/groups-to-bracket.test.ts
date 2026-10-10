/**
 * @file tests/integration/e2e/groups-to-bracket.test.ts
 * @desc 8 teams in 2 groups feeding a 4-team bracket. Registration, review, seeding, every
 *       result and the bracket go through the route handlers; making the groups and seeding the
 *       bracket from them call the services, as v0 has no routes for them. The top two of each
 *       group make the bracket, the rest are out, and a champion comes from the four.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { DEFAULT_STANDINGS_RULES } from "@haruhimemoe/tourney";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { editionResults } from "@/services/brackets";
import { createGroups, seedMainFromGroups, standings } from "@/services/stages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { api, playOut } from "../../helpers/e2e";
import { EDITION_INPUT, LINEAGE_INPUT } from "../../helpers/inputs";
import { osuHandlers } from "../../helpers/osu-server";

setupTestDb();
const server = setupServer(...osuHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const TEAMS = 8;

describe("groups to bracket", () => {
  it("sends the top two of each group to a 4-team bracket", { timeout: 60_000 }, async () => {
    const host = await createTestUser(1, "host");
    await api("POST", "/api/manage/lineages", { ...LINEAGE_INPUT, slug: "egc" }, host.cookie);
    await api("POST", "/api/manage/egc/editions", EDITION_INPUT, host.cookie);
    const base = "/api/manage/egc/egc2026";
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
          size: 4,
          bestOf: { default: 7 },
          thirdPlace: false,
          grandFinalReset: false,
          seeding: "manual",
          randomSeed: null,
        },
      },
      host.cookie,
    );
    await api("POST", `${base}/phase`, { to: "registration" }, host.cookie);
    for (let i = 0; i < TEAMS; i++) {
      const user = await createTestUser(5000 + i, `cap${i}`);
      await api(
        "POST",
        "/api/editions/egc/egc2026/registration",
        { answers: {}, team: { name: `Team ${i}`, tag: null, members: [6000 + i] } },
        user.cookie,
      );
    }
    const regs = await collections(getDb()).registrations.find({}).toArray();
    await api(
      "POST",
      `${base}/registrations/review`,
      { ids: regs.map((r) => r._id.toHexString()), to: "approved" },
      host.cookie,
    );
    const teams = await collections(getDb()).teams.find({}).sort({ captainId: 1 }).toArray();
    await api(
      "PUT",
      `${base}/seeds`,
      {
        method: "manual",
        seeds: teams.map((t, i) => ({ teamId: t._id.toHexString(), seed: i + 1 })),
      },
      host.cookie,
    );
    const editionId = teams[0]?.editionId ?? "";
    await api("POST", `${base}/phase`, { to: "bracket" }, host.cookie);

    const groups = await createGroups(editionId, { groups: 2, rules: DEFAULT_STANDINGS_RULES });
    if (!groups.ok) throw new Error(groups.error.message);
    // Two groups of four play six matches each.
    expect(await playOut(base, editionId, host.cookie)).toBe(12);
    const tables = await standings(editionId);
    expect(tables.map((t) => t.length)).toEqual([4, 4]);

    const seeded = await seedMainFromGroups(editionId, { advance: 2 });
    if (!seeded.ok) throw new Error(seeded.error.message);
    expect(seeded.value).toHaveLength(4);
    const out = await collections(getDb()).teams.countDocuments({
      editionId,
      status: "eliminated",
    });
    expect(out).toBe(4);

    await api("POST", `${base}/bracket`, {}, host.cookie);
    expect(await playOut(base, editionId, host.cookie)).toBe(3);
    const { champion, placements } = await editionResults(editionId);
    const advanced = new Set(seeded.value.map((s) => s.teamId));
    expect(champion && advanced.has(champion)).toBe(true);
    expect(placements).toHaveLength(4);
  });
});

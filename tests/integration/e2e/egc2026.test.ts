/**
 * @file tests/integration/e2e/egc2026.test.ts
 * @desc EGC 2026 end to end, through the route handlers: a host makes the lineage and edition,
 *       16 captains register 2v2 teams, the host approves them all, fills qualifier scores from
 *       an mp link, seeds from them, makes a 16-team double elimination bracket with a grand
 *       final reset, and saves every result (the losers' side takes the grand final, so the
 *       reset is played). The champion and 16 placements come out, and the public bracket
 *       renders with every team.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { BracketView } from "@haruhimemoe/ui";
import { setupServer } from "msw/node";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { editionResults } from "@/services/brackets";
import { publicEdition } from "@/services/public-view";
import { teamNames } from "@/utils/public-match";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { api, playOut } from "../../helpers/e2e";
import { EDITION_INPUT, LINEAGE_INPUT } from "../../helpers/inputs";
import { matchHandler } from "../../helpers/osu-match";
import { osuHandlers } from "../../helpers/osu-server";
import { POOLS_SECRET, poolsHandlers } from "../../helpers/pools-server";

setupTestDb();

const TEAMS = 16;
const captain = (i: number) => 2000 + i;
const mate = (i: number) => 3000 + i;

/** One qualifier lobby: every player plays NM1 and NM2; team i scores 1000 * (i + 1) a player. */
const LOBBY = 9001;
const lobby = [101, 102].map((beatmapId) => ({
  beatmapId,
  scores: Array.from({ length: TEAMS }, (_, i) => [
    { userId: captain(i), score: 1000 * (i + 1) },
    { userId: mate(i), score: 1000 * (i + 1) },
  ]).flat(),
}));

const server = setupServer(...osuHandlers, ...poolsHandlers, matchHandler({ [LOBBY]: lobby }));
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(() => vi.stubEnv("TOURNEY_SERVICE_SECRET", POOLS_SECRET));

describe("EGC 2026", () => {
  it("runs from registration to a champion with 16 placements", { timeout: 120_000 }, async () => {
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
        qualifiers: { enabled: true, method: "sum" },
        bracket: {
          format: "double",
          size: TEAMS,
          bestOf: { default: 7 },
          thirdPlace: false,
          grandFinalReset: true,
          seeding: "qualifiers",
          randomSeed: null,
        },
      },
      host.cookie,
    );
    await api(
      "PUT",
      `${base}/rounds`,
      { rounds: [{ code: "Q", patch: { poolId: "p-ok" } }] },
      host.cookie,
    );
    await api("POST", `${base}/phase`, { to: "registration" }, host.cookie);

    for (let i = 0; i < TEAMS; i++) {
      const user = await createTestUser(captain(i), `captain${i}`);
      await api(
        "POST",
        "/api/editions/egc/egc2026/registration",
        { answers: {}, team: { name: `Team ${i}`, tag: null, members: [mate(i)] } },
        user.cookie,
      );
    }
    const regs = await collections(getDb()).registrations.find({}).toArray();
    expect(regs).toHaveLength(TEAMS);
    await api(
      "POST",
      `${base}/registrations/review`,
      { ids: regs.map((r) => r._id.toHexString()), to: "approved" },
      host.cookie,
    );
    expect(await collections(getDb()).teams.countDocuments({ status: "active" })).toBe(TEAMS);

    await api("POST", `${base}/phase`, { to: "qualifiers" }, host.cookie);
    const fill = await api(
      "POST",
      `${base}/qualifiers/fill`,
      { mpLink: `https://osu.ppy.sh/mp/${LOBBY}` },
      host.cookie,
    );
    expect(fill.problems).toEqual([]);
    await api("PUT", `${base}/qualifiers/scores`, { rows: fill.rows }, host.cookie);
    await api("PUT", `${base}/seeds`, { method: "qualifiers" }, host.cookie);
    const teams = await collections(getDb()).teams.find({}).toArray();
    // The best qualifier (team 15) is seed 1.
    expect(teams.find((t) => t.name === "Team 15")?.seed).toBe(1);

    await api("POST", `${base}/phase`, { to: "bracket" }, host.cookie);
    await api("POST", `${base}/bracket`, {}, host.cookie);
    const editionId = teams[0]?.editionId ?? "";
    const played = await playOut(base, editionId, host.cookie, (round) =>
      round === "GF" ? "b" : "a",
    );
    // 30 matches in a 16-team double elimination, plus the reset.
    expect(played).toBe(31);

    const results = await editionResults(editionId);
    expect(results.champion).not.toBeNull();
    expect(results.placements).toHaveLength(TEAMS);
    expect(results.placements.every((p) => p.place !== null)).toBe(true);

    await api("POST", `${base}/phase`, { to: "done" }, host.cookie);
    const view = await publicEdition("egc", "egc2026", null);
    if (!view || "hidden" in view || !view.bracket) throw new Error("no public bracket");
    const html = renderToStaticMarkup(
      createElement(BracketView, {
        bracket: view.bracket,
        names: teamNames(view.teams),
        href: (c: string) => `/egc/egc2026/m/${c}`,
      }),
    );
    for (let i = 0; i < TEAMS; i++) expect(html).toContain(`Team ${i}<`);
    expect(html).toContain("Grand final");
  });
});

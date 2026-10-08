/**
 * @file tests/integration/services/qualifiers.test.ts
 * @desc Qualifiers: seeds by total score and by average rank on four teams, ties flagged in
 *       input order, random seeds repeating for a seed number, and a lobby preview listing an
 *       unknown player without saving anything.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { slotKey } from "@haruhimemoe/pool";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredTeam } from "@/schemas/team";
import { getEditionById, updateEdition } from "@/services/editions";
import {
  listQualifierScores,
  qualifierPreview,
  randomSeeds,
  saveQualifierScores,
  seedFromQualifiers,
} from "@/services/qualifiers";
import { syncRounds, updateRound } from "@/services/rounds";
import { listTeams } from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";
import { matchHandler } from "../../helpers/osu-match";
import { osuHandlers } from "../../helpers/osu-server";
import { POOLS_SECRET, poolsHandlers } from "../../helpers/pools-server";

setupTestDb();
const server = setupServer(
  ...osuHandlers,
  ...poolsHandlers,
  matchHandler({
    7001: [
      {
        beatmapId: 101,
        scores: [
          { userId: 101, score: 500 },
          { userId: 201, score: 300 },
          { userId: 999, score: 100 },
        ],
      },
    ],
  }),
);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => vi.stubEnv("TOURNEY_SERVICE_SECRET", POOLS_SECRET));

const NM1 = slotKey({ mod: "NM", index: 1 });
const NM2 = slotKey({ mod: "NM", index: 2 });

const setup = async (method: "sum" | "average-rank" = "sum") => {
  const { editionId } = await seedLineage();
  const saved = await updateEdition(editionId, {
    qualifiers: { enabled: true, method },
    bracket: {
      format: "single",
      size: 4,
      bestOf: { default: 7 },
      thirdPlace: false,
      grandFinalReset: false,
      seeding: "qualifiers",
      randomSeed: null,
    },
  });
  if (!saved.ok) throw new Error(saved.error.message);
  await syncRounds(saved.value);
  await updateRound(editionId, "Q", { poolId: "p-ok" });
  const teams = await seedTeams(editionId, 4);
  return { editionId, teams };
};

const seedOf = async (editionId: string) =>
  Object.fromEntries((await listTeams(editionId)).map((t) => [t.name, t.seed]));

const sheet = (teams: StoredTeam[], nm1: number[], nm2: number[]) =>
  teams.flatMap((t, i) => [
    { teamId: t.id, slotKey: NM1, score: nm1[i] as number },
    { teamId: t.id, slotKey: NM2, score: nm2[i] as number },
  ]);

describe("seedFromQualifiers", () => {
  it("seeds by total score", async () => {
    const { editionId, teams } = await setup("sum");
    await saveQualifierScores(editionId, sheet(teams, [100, 400, 300, 200], [100, 100, 100, 100]));
    const result = await seedFromQualifiers(editionId);
    expect(result.ok).toBe(true);
    expect(await seedOf(editionId)).toEqual({ "Team 1": 4, "Team 2": 1, "Team 3": 2, "Team 4": 3 });
  });

  it("seeds by average rank per map", async () => {
    const { editionId, teams } = await setup("average-rank");
    // Team 1 wins NM1 by a mile but is last on NM2; average rank puts Team 2 first.
    await saveQualifierScores(
      editionId,
      sheet(teams, [900_000, 300, 200, 100], [10, 400, 300, 200]),
    );
    await seedFromQualifiers(editionId);
    const seeds = await seedOf(editionId);
    expect(seeds["Team 2"]).toBe(1);
    expect(seeds["Team 1"]).not.toBe(1);
  });

  it("flags ties and keeps their input order", async () => {
    const { editionId, teams } = await setup("sum");
    await saveQualifierScores(editionId, sheet(teams, [100, 100, 300, 50], [0, 0, 0, 0]));
    const result = await seedFromQualifiers(editionId);
    if (!result.ok) throw new Error(result.error.message);
    const tied = result.value.filter((s) => s.tied).map((s) => s.teamName);
    expect(tied).toEqual(["Team 1", "Team 2"]);
    expect(await seedOf(editionId)).toMatchObject({ "Team 1": 2, "Team 2": 3 });
  });

  it("refuses with no scores saved", async () => {
    const { editionId } = await setup();
    expect(await seedFromQualifiers(editionId)).toMatchObject({
      ok: false,
      error: { code: "bad-state" },
    });
  });
});

describe("saveQualifierScores", () => {
  it("replaces the sheet and refuses a doubled slot or a stranger team", async () => {
    const { editionId, teams } = await setup();
    const t1 = teams[0] as StoredTeam;
    await saveQualifierScores(editionId, sheet(teams, [1, 2, 3, 4], [1, 2, 3, 4]));
    await saveQualifierScores(editionId, [{ teamId: t1.id, slotKey: NM1, score: 9 }]);
    expect(await listQualifierScores(editionId)).toHaveLength(1);
    const doubled = [
      { teamId: t1.id, slotKey: NM1, score: 1 },
      { teamId: t1.id, slotKey: NM1, score: 2 },
    ];
    expect(await saveQualifierScores(editionId, doubled)).toMatchObject({
      ok: false,
      error: { code: "bad-input" },
    });
    expect(
      await saveQualifierScores(editionId, [{ teamId: "0".repeat(24), slotKey: NM1, score: 1 }]),
    ).toMatchObject({ ok: false, error: { code: "not-found" } });
  });
});

describe("randomSeeds", () => {
  it("gives the same seeds for the same number and stores it", async () => {
    const { editionId } = await setup();
    const first = await randomSeeds(editionId, 2026);
    const again = await randomSeeds(editionId, 2026);
    expect(again).toEqual(first);
    expect((await getEditionById(editionId))?.bracket?.randomSeed).toBe(2026);
    const seeds = Object.values(await seedOf(editionId)).sort();
    expect(seeds).toEqual([1, 2, 3, 4]);
  });
});

describe("qualifierPreview", () => {
  it("reads a lobby into team scores, lists an unknown player and saves nothing", async () => {
    const { editionId, teams } = await setup();
    const result = await qualifierPreview(editionId, "https://osu.ppy.sh/community/matches/7001");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.rows).toEqual([
      { teamId: teams[0]?.id, slotKey: NM1, score: 500 },
      { teamId: teams[1]?.id, slotKey: NM1, score: 300 },
    ]);
    expect(result.value.problems.map((p) => p.code)).toEqual(["unknown-player"]);
    expect(await listQualifierScores(editionId)).toEqual([]);
  });

  it("answers bad-input for a link that isn't a match and not-found for a missing one", async () => {
    const { editionId } = await setup();
    expect(await qualifierPreview(editionId, "hello")).toMatchObject({
      ok: false,
      error: { code: "bad-input" },
    });
    expect(await qualifierPreview(editionId, "https://osu.ppy.sh/mp/404")).toMatchObject({
      ok: false,
      error: { code: "not-found" },
    });
  });
});

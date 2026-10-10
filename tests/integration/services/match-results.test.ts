/**
 * @file tests/integration/services/match-results.test.ts
 * @desc Match results: a Bo9 typed in as 5-3 advances the winner, a pick/ban log banning a slot
 *       the pool doesn't have is refused with the library's code, an mp lobby with a warmup
 *       previews the right score, an off-pool map is listed, a forfeit advances, an undo after
 *       the next match is refused, and a missing pool still lets a score be typed in.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { slotKey } from "@haruhimemoe/pool";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredTeam } from "@/schemas/team";
import { applyForfeit, generateBracket, getBracket, undoResult } from "@/services/brackets";
import { updateEdition } from "@/services/editions";
import { previewFill, saveResult } from "@/services/match-results";
import { updateRound } from "@/services/rounds";
import { setSeeds } from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";
import { type GameInput, matchHandler } from "../../helpers/osu-match";
import { osuHandlers } from "../../helpers/osu-server";
import { POOLS_SECRET, poolsHandlers } from "../../helpers/pools-server";

setupTestDb();

/** Seed 1 (players 101, 102) beats seed 4 (401, 402) on this map. */
const aWin = (beatmapId: number): GameInput => ({
  beatmapId,
  scores: [
    { userId: 101, score: 500 },
    { userId: 102, score: 500 },
    { userId: 401, score: 100 },
    { userId: 402, score: 100 },
  ],
});
const bWin = (beatmapId: number): GameInput => ({
  beatmapId,
  scores: [
    { userId: 101, score: 100 },
    { userId: 102, score: 100 },
    { userId: 401, score: 500 },
    { userId: 402, score: 500 },
  ],
});

const server = setupServer(
  ...osuHandlers,
  ...poolsHandlers,
  matchHandler({
    8001: [aWin(999), aWin(101), aWin(102), bWin(201), aWin(301), aWin(401), aWin(901)],
    8002: [aWin(101), aWin(777)],
  }),
);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());
beforeEach(() => vi.stubEnv("TOURNEY_SERVICE_SECRET", POOLS_SECRET));

const NONE = { maps: [], pickBans: [], mpLinks: [], streamUrl: null, vodUrl: null };

const setup = async (poolId: string | null = "p-ok") => {
  const { editionId } = await seedLineage();
  await updateEdition(editionId, {
    bracket: {
      format: "single",
      size: 4,
      bestOf: { default: 9 },
      thirdPlace: false,
      grandFinalReset: false,
      seeding: "manual",
      randomSeed: null,
    },
    pickBanRules: { protects: 0, bans: 1, tiebreaker: null },
  });
  const teams = await seedTeams(editionId, 4);
  await setSeeds(
    editionId,
    teams.map((t, i) => ({ teamId: t.id, seed: i + 1 })),
  );
  const made = await generateBracket(editionId);
  if (!made.ok) throw new Error(made.error.message);
  await updateRound(editionId, "SF", { poolId });
  return { editionId, teams: teams as [StoredTeam, StoredTeam, StoredTeam, StoredTeam] };
};

const finalA = async (editionId: string) =>
  (await getBracket(editionId))?.bracket?.matches.find((m) => m.code === "M3")?.a.entrant;

describe("saveResult", () => {
  it("saves a Bo9 typed in as 5-3 and advances the winner", async () => {
    const { editionId, teams } = await setup();
    const result = await saveResult(editionId, "M1", { ...NONE, score: { a: 5, b: 3 } });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.match).toMatchObject({ scoreA: 5, scoreB: 3, winner: "a", status: "done" });
    expect(await finalA(editionId)).toBe(teams[0].id);
  });

  it("refuses a score that doesn't fit the best-of", async () => {
    const { editionId } = await setup();
    expect(await saveResult(editionId, "M1", { ...NONE, score: { a: 4, b: 3 } })).toMatchObject({
      ok: false,
      error: { code: "bad-score" },
    });
  });

  it("refuses a pick/ban log that bans a slot the pool doesn't have", async () => {
    const { editionId } = await setup();
    const result = await saveResult(editionId, "M1", {
      ...NONE,
      score: { a: 5, b: 3 },
      first: { ban: "a", pick: "b" },
      pickBans: [{ side: "a", action: "ban", slot: slotKey({ mod: "NM", index: 9 }) }],
    });
    expect(result).toMatchObject({ ok: false, error: { code: "bad-slot" } });
  });

  it("takes the score from the maps when they're given", async () => {
    const { editionId } = await setup();
    const map = (slot: string, winner: "a" | "b") => ({
      slot,
      winner,
      warmup: false,
      aborted: false,
      lineupA: [],
      lineupB: [],
      scores: [],
    });
    const nm1 = slotKey({ mod: "NM", index: 1 });
    const maps = [
      map(nm1, "a"),
      map(nm1, "a"),
      map(nm1, "a"),
      map(nm1, "a"),
      map(nm1, "b"),
      map(nm1, "a"),
    ];
    const result = await saveResult(editionId, "M1", { ...NONE, maps });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.match).toMatchObject({ scoreA: 5, scoreB: 1, maps });
  });

  it("still takes a typed score while the pool can't be read", async () => {
    const { editionId } = await setup("p-down");
    const result = await saveResult(editionId, "M1", { ...NONE, score: { a: 5, b: 0 } });
    expect(result.ok).toBe(true);
  });
});

describe("previewFill", () => {
  it("reads a lobby with one warmup into the right score and no problems", async () => {
    const { editionId } = await setup();
    const result = await previewFill(editionId, "M1", "https://osu.ppy.sh/mp/8001", {
      warmups: 1,
      skip: [],
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.score).toEqual({ a: 5, b: 1 });
    expect(result.value.winner).toBe("a");
    expect(result.value.problems).toEqual([]);
    expect(result.value.sides.a.players).toEqual([101, 102]);
  });

  it("lists a map outside the pool", async () => {
    const { editionId } = await setup();
    const result = await previewFill(editionId, "M1", "https://osu.ppy.sh/mp/8002", {
      warmups: 0,
      skip: [],
    });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.problems.map((p) => p.code)).toContain("off-pool");
  });

  it("says plainly when the round has no pool or pools is down", async () => {
    const { editionId } = await setup(null);
    expect(
      await previewFill(editionId, "M1", "https://osu.ppy.sh/mp/8001", { warmups: 0, skip: [] }),
    ).toMatchObject({ ok: false, error: { code: "bad-state" } });
    await updateRound(editionId, "SF", { poolId: "p-down" });
    expect(
      await previewFill(editionId, "M1", "https://osu.ppy.sh/mp/8001", { warmups: 0, skip: [] }),
    ).toMatchObject({ ok: false, error: { code: "pool-unavailable" } });
  });
});

describe("forfeit and undo", () => {
  it("advances a forfeit's winner", async () => {
    const { editionId, teams } = await setup();
    expect((await applyForfeit(editionId, "M1", "b")).ok).toBe(true);
    expect(await finalA(editionId)).toBe(teams[3].id);
  });

  it("refuses an undo once the next match has a result", async () => {
    const { editionId } = await setup();
    await saveResult(editionId, "M1", { ...NONE, score: { a: 5, b: 0 } });
    await saveResult(editionId, "M2", { ...NONE, score: { a: 5, b: 0 } });
    await saveResult(editionId, "M3", { ...NONE, score: { a: 5, b: 0 } });
    expect(await undoResult(editionId, "M1")).toMatchObject({
      ok: false,
      error: { code: "out-of-order" },
    });
  });
});

/**
 * @file tests/integration/services/stages.test.ts
 * @desc Groups and swiss before the main bracket: 8 teams in 2 groups, a three-way tie settled by
 *       the library's tiebreaks, the top two per group seeded so A1 meets B2, swiss with no
 *       rematch over 3 rounds, and pairing refused while a round is unfinished.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { DEFAULT_STANDINGS_RULES } from "@haruhimemoe/tourney";
import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { StoredTeam } from "@/schemas/team";
import { updateEdition } from "@/services/editions";
import {
  createGroups,
  createSwiss,
  groupResult,
  pairNextSwissRound,
  seedMainFromGroups,
  standings,
} from "@/services/stages";
import { listTeams, setSeeds } from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";

setupTestDb();

const setup = async (count = 8) => {
  const { editionId } = await seedLineage();
  await updateEdition(editionId, {
    bracket: {
      format: "single",
      size: 4,
      bestOf: { default: 3 },
      thirdPlace: false,
      grandFinalReset: false,
      seeding: "manual",
      randomSeed: null,
    },
  });
  const teams = await seedTeams(editionId, count);
  await setSeeds(
    editionId,
    teams.map((t, i) => ({ teamId: t.id, seed: i + 1 })),
  );
  return { editionId, teams };
};

const docs = async (editionId: string, round: RegExp) =>
  collections(getDb())
    .matches.find({ editionId, round: { $regex: round } })
    .sort({ bracketCode: 1 })
    .toArray();

/** Plays a stage match so the team `winner` wins `wins`-`losses`. */
const play = async (editionId: string, code: string, winner: string, wins = 2, losses = 0) => {
  const doc = await collections(getDb()).matches.findOne({ editionId, bracketCode: code });
  const aWins = doc?.a === winner;
  const result = await groupResult(editionId, code, {
    scoreA: aWins ? wins : losses,
    scoreB: aWins ? losses : wins,
  });
  if (!result.ok) throw new Error(`${code}: ${result.error.message}`);
};

const codeFor = async (editionId: string, x: string, y: string) => {
  const all = await docs(editionId, /^GS/);
  const m = all.find((d) => (d.a === x && d.b === y) || (d.a === y && d.b === x));
  if (!m?.bracketCode) throw new Error("no match");
  return m.bracketCode;
};

describe("groups", () => {
  it("puts 8 teams in 2 groups with 12 round-robin matches", async () => {
    const { editionId } = await setup();
    const result = await createGroups(editionId, { groups: 2, rules: DEFAULT_STANDINGS_RULES });
    expect(result.ok).toBe(true);
    const matches = await docs(editionId, /^GS/);
    expect(matches).toHaveLength(12);
    expect(matches.every((m) => /^G[AB]\d+$/.test(m.bracketCode ?? ""))).toBe(true);
  });

  it("settles a three-way tie by the library's tiebreaks", async () => {
    const { editionId } = await setup();
    await createGroups(editionId, { groups: 2, rules: DEFAULT_STANDINGS_RULES });
    const table = await standings(editionId);
    const [x, y, z, w] = (table[0] ?? []).map((s) => s.entrantId) as [
      string,
      string,
      string,
      string,
    ];
    // x, y and z each beat one of the others and w, and head-to-head goes round in a circle.
    // Map difference splits them: x +3, z +2, y +1.
    await play(editionId, await codeFor(editionId, x, y), x, 2, 0);
    await play(editionId, await codeFor(editionId, y, z), y, 2, 1);
    await play(editionId, await codeFor(editionId, z, x), z, 2, 1);
    for (const t of [x, y, z]) await play(editionId, await codeFor(editionId, t, w), t, 2, 0);
    const groupA = (await standings(editionId))[0] ?? [];
    expect(groupA.map((s) => s.entrantId)).toEqual([x, z, y, w]);
    expect(groupA.map((s) => s.place)).toEqual([1, 2, 3, 4]);
  });

  it("seeds the main bracket so A1 meets B2 and drops the rest", async () => {
    const { editionId } = await setup();
    await createGroups(editionId, { groups: 2, rules: DEFAULT_STANDINGS_RULES });
    for (const m of await docs(editionId, /^GS/)) {
      // The better seed wins every group match.
      const teams = await listTeams(editionId);
      const seedOf = (id: string | null) => teams.find((t) => t.id === id)?.seed ?? 99;
      await play(
        editionId,
        m.bracketCode ?? "",
        seedOf(m.a) < seedOf(m.b) ? (m.a ?? "") : (m.b ?? ""),
      );
    }
    const table = await standings(editionId);
    const a1 = table[0]?.[0]?.entrantId;
    const b2 = table[1]?.[1]?.entrantId;
    const seeded = await seedMainFromGroups(editionId, { advance: 2 });
    expect(seeded.ok).toBe(true);
    const teams = await listTeams(editionId);
    const byId = new Map<string, StoredTeam>(teams.map((t) => [t.id, t]));
    expect(byId.get(a1 ?? "")?.seed).toBe(1);
    expect(byId.get(b2 ?? "")?.seed).toBe(4);
    expect(teams.filter((t) => t.status === "eliminated")).toHaveLength(4);
    expect(teams.filter((t) => t.status === "eliminated").every((t) => t.seed === null)).toBe(true);
  });

  it("refuses a result that doesn't fit the best-of", async () => {
    const { editionId } = await setup();
    await createGroups(editionId, { groups: 2, rules: DEFAULT_STANDINGS_RULES });
    const code = (await docs(editionId, /^GS/))[0]?.bracketCode ?? "";
    expect(await groupResult(editionId, code, { scoreA: 1, scoreB: 1 })).toMatchObject({
      ok: false,
      error: { code: "bad-score" },
    });
  });
});

describe("swiss", () => {
  it("pairs 8 teams over 3 rounds with no rematch", async () => {
    const { editionId } = await setup();
    expect((await createSwiss(editionId, { rounds: 3 })).ok).toBe(true);
    const seen = new Set<string>();
    for (let round = 1; round <= 3; round++) {
      const paired = await pairNextSwissRound(editionId);
      if (!paired.ok) throw new Error(paired.error.message);
      const matches = await docs(editionId, new RegExp(`^SW${round}$`));
      expect(matches).toHaveLength(4);
      for (const m of matches) {
        const key = [m.a, m.b].sort().join(" ");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
        await play(editionId, m.bracketCode ?? "", m.a ?? "");
      }
    }
    expect(seen.size).toBe(12);
  });

  it("refuses to pair before every match of the round has a result", async () => {
    const { editionId } = await setup();
    await createSwiss(editionId, { rounds: 3 });
    await pairNextSwissRound(editionId);
    expect(await pairNextSwissRound(editionId)).toMatchObject({
      ok: false,
      error: { code: "out-of-order" },
    });
  });
});

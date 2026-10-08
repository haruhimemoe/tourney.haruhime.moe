/**
 * @file tests/integration/services/brackets.test.ts
 * @desc The stored bracket: an EGC 2026 run to a champion, byes never stored as matches,
 *       corrections before and after the next match, four staff saving at once, and regenerate
 *       refused once a result exists.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { type Bracket, winsNeeded } from "@haruhimemoe/tourney";
import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { BracketConfig } from "@/schemas/edition";
import {
  applyForfeit,
  applyResult,
  editionResults,
  generateBracket,
  getBracket,
  undoResult,
} from "@/services/brackets";
import { updateEdition } from "@/services/editions";
import { setSeeds } from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";

setupTestDb();

const EGC: BracketConfig = {
  format: "double",
  size: 16,
  bestOf: { default: 9, SF: 11, F: 13, LR5: 11, LR6: 13, GF: 13 },
  thirdPlace: false,
  grandFinalReset: true,
  seeding: "manual",
  randomSeed: null,
};

const SINGLE4: BracketConfig = { ...EGC, format: "single", size: 4, bestOf: { default: 9 } };

const setup = async (count: number, config: BracketConfig = { ...EGC, size: count }) => {
  const { editionId } = await seedLineage();
  const saved = await updateEdition(editionId, {
    bracket: config,
    qualifiers: { enabled: true, method: "sum" },
  });
  if (!saved.ok) throw new Error(saved.error.message);
  const teams = await seedTeams(editionId, count);
  await setSeeds(
    editionId,
    teams.map((t, i) => ({ teamId: t.id, seed: i + 1 })),
  );
  return { editionId, teams };
};

const generated = async (editionId: string): Promise<Bracket> => {
  const result = await generateBracket(editionId);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const aWins = (bestOf: number) => ({ scoreA: winsNeeded(bestOf), scoreB: 0 });

const ready = (bracket: Bracket) => bracket.matches.filter((m) => m.status === "ready");

const matchDocs = async (editionId: string) =>
  collections(getDb()).matches.find({ editionId }).toArray();

describe("generateBracket", () => {
  it("refuses until every team is seeded", async () => {
    const { editionId } = await seedLineage();
    await updateEdition(editionId, { bracket: { ...EGC, size: 4 } });
    await seedTeams(editionId, 4);
    expect(await generateBracket(editionId)).toMatchObject({
      ok: false,
      error: { code: "seeds-missing" },
    });
  });

  it("stores one match per non-bye bracket match, with the round's id", async () => {
    const { editionId } = await setup(13, { ...EGC, size: 13 });
    const bracket = await generated(editionId);
    const byes = bracket.matches.filter((m) => m.status === "bye").map((m) => m.code);
    expect(byes.length).toBeGreaterThan(0);
    const docs = await matchDocs(editionId);
    expect(docs).toHaveLength(bracket.matches.length - byes.length);
    expect(docs.some((d) => byes.includes(d.bracketCode ?? ""))).toBe(false);
    expect(docs.every((d) => d.status === "scheduled" && d.roundId.length === 24)).toBe(true);
    for (const d of docs) {
      const m = bracket.matches.find((x) => x.code === d.bracketCode);
      expect([d.a, d.b]).toEqual([m?.a.entrant, m?.b.entrant]);
    }
    expect(docs.some((d) => d.a !== null)).toBe(true);
  });
});

describe("a full EGC 2026 run", () => {
  it("plays every match in order to seed 1 as champion", async () => {
    const { editionId, teams } = await setup(16);
    let bracket = await generated(editionId);
    for (let guard = 0; guard < 40 && ready(bracket).length; guard++) {
      const next = ready(bracket)[0];
      if (!next) break;
      const result = await applyResult(editionId, next.code, aWins(next.bestOf), {});
      if (!result.ok) throw new Error(`${next.code}: ${result.error.message}`);
      bracket = result.value.bracket;
    }
    const results = await editionResults(editionId);
    expect(results.champion).toBe(teams[0]?.id);
    expect(results.placements).toHaveLength(16);
    const docs = await matchDocs(editionId);
    expect(docs.filter((d) => d.status === "done").length).toBe(30);
    expect(docs.find((d) => d.bracketCode === "M31")?.status).toBe("cancelled");
  });
});

describe("corrections", () => {
  it("re-saves a decided match with a new score while nothing downstream is played", async () => {
    const { editionId } = await setup(4, SINGLE4);
    await generated(editionId);
    await applyResult(editionId, "M1", { scoreA: 5, scoreB: 0 }, {});
    const fixed = await applyResult(editionId, "M1", { scoreA: 3, scoreB: 5 }, {});
    if (!fixed.ok) throw new Error(fixed.error.message);
    const m1 = fixed.value.bracket.matches.find((m) => m.code === "M1");
    expect(m1).toMatchObject({ scoreA: 3, scoreB: 5, winner: "b" });
    expect(fixed.value.match).toMatchObject({ scoreA: 3, scoreB: 5, winner: "b", status: "done" });
  });

  it("undoes a result before the next match and resets the downstream side", async () => {
    const { editionId } = await setup(4, SINGLE4);
    await generated(editionId);
    await applyResult(editionId, "M1", { scoreA: 5, scoreB: 0 }, {});
    const undone = await undoResult(editionId, "M1");
    if (!undone.ok) throw new Error(undone.error.message);
    const final = undone.value.bracket.matches.find((m) => m.code === "M3");
    expect(final?.a.entrant).toBeNull();
    const doc = (await matchDocs(editionId)).find((d) => d.bracketCode === "M3");
    expect(doc?.a).toBeNull();
    expect((await matchDocs(editionId)).find((d) => d.bracketCode === "M1")).toMatchObject({
      status: "scheduled",
      scoreA: null,
      winner: null,
    });
  });

  it("refuses an undo after the next match was played", async () => {
    const { editionId } = await setup(4, SINGLE4);
    await generated(editionId);
    await applyResult(editionId, "M1", { scoreA: 5, scoreB: 0 }, {});
    await applyResult(editionId, "M2", { scoreA: 5, scoreB: 0 }, {});
    await applyResult(editionId, "M3", { scoreA: 5, scoreB: 0 }, {});
    expect(await undoResult(editionId, "M1")).toEqual({
      ok: false,
      error: { code: "out-of-order", message: "clear M3 first" },
    });
  });

  it("advances a forfeit's winner", async () => {
    const { editionId, teams } = await setup(4, SINGLE4);
    await generated(editionId);
    const result = await applyForfeit(editionId, "M1", "b");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.match.status).toBe("forfeit");
    const final = result.value.bracket.matches.find((m) => m.code === "M3");
    expect(final?.a.entrant).toBe(teams[3]?.id);
  });
});

describe("concurrency", () => {
  it("keeps all four results saved at once", async () => {
    const { editionId } = await setup(16);
    const bracket = await generated(editionId);
    const four = ready(bracket).slice(0, 4);
    const results = await Promise.all(
      four.map((m) => applyResult(editionId, m.code, aWins(m.bestOf), {})),
    );
    expect(results.every((r) => r.ok)).toBe(true);
    const stored = await getBracket(editionId);
    for (const m of four) {
      expect(stored?.bracket?.matches.find((x) => x.code === m.code)?.status).toBe("done");
    }
    expect(stored?.version).toBe(5);
  });
});

describe("regenerate", () => {
  it("is refused once a match has a result", async () => {
    const { editionId } = await setup(4, SINGLE4);
    await generated(editionId);
    await applyResult(editionId, "M1", { scoreA: 5, scoreB: 0 }, {});
    expect(await generateBracket(editionId)).toMatchObject({
      ok: false,
      error: { code: "bracket-has-results" },
    });
  });

  it("replaces the bracket while no match has a result", async () => {
    const { editionId } = await setup(4, SINGLE4);
    await generated(editionId);
    await generated(editionId);
    expect((await getBracket(editionId))?.version).toBe(1);
    expect(await matchDocs(editionId)).toHaveLength(3);
  });
});

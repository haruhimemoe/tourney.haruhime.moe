/**
 * @file tests/integration/services/rounds.test.ts
 * @desc Rounds from the bracket ladder: the EGC 2026 codes, host edits surviving a resync, a
 *       smaller bracket dropping its unplayed rounds, and best-of edits kept in the config.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { createBracket } from "@haruhimemoe/tourney";
import { describe, expect, it } from "vitest";
import type { BracketConfig, Edition } from "@/schemas/edition";
import { getEditionById, updateEdition } from "@/services/editions";
import { listRounds, syncRounds, updateRound } from "@/services/rounds";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";

setupTestDb();

const EGC: BracketConfig = {
  format: "double",
  size: 16,
  bestOf: { default: 9, SF: 11, F: 13, LR5: 11, LR6: 13, GF: 13 },
  thirdPlace: false,
  grandFinalReset: true,
  seeding: "qualifiers",
  randomSeed: null,
};

const editionWith = async (bracket: BracketConfig, qualifiers = true): Promise<Edition> => {
  const { editionId } = await seedLineage();
  const saved = await updateEdition(editionId, {
    bracket,
    qualifiers: { enabled: qualifiers, method: "sum" },
  });
  if (!saved.ok) throw new Error(saved.error.message);
  return saved.value;
};

const reload = async (id: string): Promise<Edition> => {
  const edition = await getEditionById(id);
  if (!edition) throw new Error("no edition");
  return edition;
};

describe("syncRounds", () => {
  it("builds the EGC 2026 ladder with qualifiers first", async () => {
    const edition = await editionWith(EGC);
    const result = await syncRounds(edition);
    expect(result.ok).toBe(true);
    const rounds = await listRounds(edition.id);
    expect(rounds.map((r) => r.code)).toEqual([
      "Q",
      "RO16",
      "QF",
      "LR1",
      "LR2",
      "SF",
      "LR3",
      "LR4",
      "F",
      "LR5",
      "LR6",
      "GF",
      "GFR",
    ]);
    expect(rounds.find((r) => r.code === "F")?.bestOf).toBe(13);
    expect(rounds.find((r) => r.code === "QF")?.bestOf).toBe(9);
    expect(rounds[0]).toMatchObject({ poolId: null, poolRevealed: false, window: null });
  });

  it("gives every bracket round a stored round", async () => {
    const edition = await editionWith(EGC);
    await syncRounds(edition);
    const bracket = createBracket({
      entrants: Array.from({ length: 16 }, (_, i) => `t${i}`),
      format: "double",
      bestOf: 9,
      grandFinalReset: true,
    });
    if (!bracket.ok) throw new Error(bracket.error.message);
    const codes = (await listRounds(edition.id)).map((r) => r.code).filter((c) => c !== "Q");
    expect(codes).toEqual(bracket.value.rounds.map((r) => r.code));
  });

  it("keeps a host's name, pool and window across a resync", async () => {
    const edition = await editionWith(EGC);
    await syncRounds(edition);
    const window = { start: "2026-11-01T00:00:00.000Z", end: "2026-11-03T00:00:00.000Z" };
    const edited = await updateRound(edition.id, "QF", {
      name: "Quarters",
      poolId: "abc123",
      poolRevealed: true,
      window,
    });
    expect(edited.ok).toBe(true);
    await syncRounds(await reload(edition.id));
    const qf = (await listRounds(edition.id)).find((r) => r.code === "QF");
    expect(qf).toMatchObject({ name: "Quarters", poolId: "abc123", poolRevealed: true, window });
  });

  it("drops RO16 rounds when the bracket shrinks to 8", async () => {
    const edition = await editionWith(EGC);
    await syncRounds(edition);
    const smaller = await updateEdition(edition.id, { bracket: { ...EGC, size: 8 } });
    if (!smaller.ok) throw new Error(smaller.error.message);
    await syncRounds(smaller.value);
    const codes = (await listRounds(edition.id)).map((r) => r.code);
    expect(codes).not.toContain("RO16");
    expect(codes[0]).toBe("Q");
    expect(codes).toContain("QF");
  });

  it("leaves out Q without qualifiers", async () => {
    const edition = await editionWith(EGC, false);
    await syncRounds(edition);
    expect((await listRounds(edition.id)).map((r) => r.code)[0]).toBe("RO16");
  });

  it("refuses an edition with no bracket config", async () => {
    const { editionId } = await seedLineage();
    const result = await syncRounds(await reload(editionId));
    expect(result).toMatchObject({ ok: false, error: { code: "bad-state" } });
  });
});

describe("updateRound", () => {
  it("keeps a best-of change in the bracket config, so it survives a resync", async () => {
    const edition = await editionWith(EGC);
    await syncRounds(edition);
    expect((await updateRound(edition.id, "QF", { bestOf: 7 })).ok).toBe(true);
    const after = await reload(edition.id);
    expect(after.bracket?.bestOf.QF).toBe(7);
    await syncRounds(after);
    expect((await listRounds(edition.id)).find((r) => r.code === "QF")?.bestOf).toBe(7);
  });

  it("refuses a window that ends before it starts and an unknown code", async () => {
    const edition = await editionWith(EGC);
    await syncRounds(edition);
    const bad = await updateRound(edition.id, "QF", {
      window: { start: "2026-11-03T00:00:00.000Z", end: "2026-11-01T00:00:00.000Z" },
    });
    expect(bad).toMatchObject({ ok: false, error: { code: "bad-input" } });
    expect(await updateRound(edition.id, "NOPE", { name: "x" })).toMatchObject({
      ok: false,
      error: { code: "not-found" },
    });
  });
});

/**
 * @file tests/integration/services/schedule.test.ts
 * @desc Scheduling: a suggestion lands where both rosters are free, the higher seed's players
 *       break a tie, filling a round skips timed matches and matches with an unknown side, a
 *       time outside the round's window is refused, and the default match length.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { StoredTeam } from "@/schemas/team";
import { setAvailability } from "@/services/availability";
import { generateBracket } from "@/services/brackets";
import { updateEdition } from "@/services/editions";
import { updateRound } from "@/services/rounds";
import { fillRound, lengthMinutes, setMatchTime, suggestFor } from "@/services/schedule";
import { setSeeds } from "@/services/teams";
import { setupTestDb } from "../../helpers/db";
import { seedLineage, seedTeams } from "../../helpers/manage";
import { makeRegistration } from "../../helpers/records";

setupTestDb();

const MONDAY = "2026-11-02T00:00:00.000Z";
const TUESDAY = "2026-11-03T00:00:00.000Z";
const at = new Date("2026-10-08T00:00:00.000Z");

/** Gives a player an account, a registration and these UTC hours from Monday 00:00 free. */
const free = async (editionId: string, osuId: number, hours: number[]) => {
  const { id: _, ...reg } = makeRegistration({ editionId, osuId, userId: `u${osuId}` });
  await collections(getDb()).registrations.insertOne({ _id: new ObjectId(), ...reg });
  const saved = await setAvailability(`u${osuId}`, editionId, "UTC", hours, at);
  if (!saved.ok) throw new Error(saved.error.message);
};

const setup = async () => {
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
  });
  const teams = await seedTeams(editionId, 4);
  await setSeeds(
    editionId,
    teams.map((t, i) => ({ teamId: t.id, seed: i + 1 })),
  );
  const made = await generateBracket(editionId);
  if (!made.ok) throw new Error(made.error.message);
  await updateRound(editionId, "SF", { window: { start: MONDAY, end: TUESDAY } });
  await updateRound(editionId, "F", { window: { start: MONDAY, end: TUESDAY } });
  return { editionId, teams: teams as [StoredTeam, StoredTeam, StoredTeam, StoredTeam] };
};

describe("lengthMinutes", () => {
  it("is 30 minutes plus 7 a map", () => {
    expect(lengthMinutes(9)).toBe(93);
    expect(lengthMinutes(1)).toBe(37);
  });
});

describe("suggestFor", () => {
  it("suggests the hour both rosters are free", async () => {
    const { editionId } = await setup();
    // M1 is seed 1 (players 101, 102) against seed 4 (401, 402).
    for (const id of [101, 102, 401, 402]) await free(editionId, id, [20, 21]);
    const result = await suggestFor(editionId, "M1");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value[0]?.start.toISOString()).toBe("2026-11-02T20:00:00.000Z");
    expect(result.value[0]?.readySides).toBe(2);
  });

  it("breaks a tie toward the slot more of the higher seed can play", async () => {
    const { editionId, teams } = await setup();
    // Three on each roster, two play (the edition's lineup). Both sides are ready at 10:00 and
    // at 18:00, with five players free each time; seed 1 has all three free only at 18:00.
    const { teams: col } = collections(getDb());
    await col.updateOne({ _id: new ObjectId(teams[0].id) }, { $push: { roster: 103 } });
    await col.updateOne({ _id: new ObjectId(teams[3].id) }, { $push: { roster: 403 } });
    await free(editionId, 101, [10, 11, 18, 19]);
    await free(editionId, 102, [10, 11, 18, 19]);
    await free(editionId, 103, [18, 19]);
    await free(editionId, 401, [10, 11, 18, 19]);
    await free(editionId, 402, [10, 11, 18, 19]);
    await free(editionId, 403, [10, 11]);
    const result = await suggestFor(editionId, "M1");
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value[0]?.start.toISOString()).toBe("2026-11-02T18:00:00.000Z");
    expect(result.value.map((c) => c.start.toISOString())).toContain("2026-11-02T10:00:00.000Z");
  });

  it("refuses a match without both sides", async () => {
    const { editionId } = await setup();
    expect(await suggestFor(editionId, "M3")).toMatchObject({
      ok: false,
      error: { code: "bad-state" },
    });
  });
});

describe("setMatchTime", () => {
  it("sets a time inside the window and refuses one outside it", async () => {
    const { editionId } = await setup();
    expect(await setMatchTime(editionId, "M1", "2026-11-02T18:00:00.000Z")).toMatchObject({
      ok: true,
      value: { scheduledAt: "2026-11-02T18:00:00.000Z" },
    });
    expect(await setMatchTime(editionId, "M1", "2026-11-05T18:00:00.000Z")).toMatchObject({
      ok: false,
      error: { code: "outside-window" },
    });
    expect(await setMatchTime(editionId, "M1", null)).toMatchObject({
      ok: true,
      value: { scheduledAt: null },
    });
  });
});

describe("fillRound", () => {
  it("fills untimed matches and skips timed ones and unknown sides", async () => {
    const { editionId } = await setup();
    for (const id of [101, 102, 201, 202, 301, 302, 401, 402]) await free(editionId, id, [20, 21]);
    await setMatchTime(editionId, "M2", "2026-11-02T12:00:00.000Z");
    expect(await fillRound(editionId, "SF")).toEqual({ filled: 1, skipped: [] });
    const m1 = await collections(getDb()).matches.findOne({ editionId, bracketCode: "M1" });
    const m2 = await collections(getDb()).matches.findOne({ editionId, bracketCode: "M2" });
    expect(m1?.scheduledAt).toBe("2026-11-02T20:00:00.000Z");
    expect(m2?.scheduledAt).toBe("2026-11-02T12:00:00.000Z");
    expect(await fillRound(editionId, "F")).toEqual({ filled: 0, skipped: ["M3"] });
  });
});

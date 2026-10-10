/**
 * @file tests/integration/services/registrations.test.ts
 * @desc The registration service: submit with every check in order (window and cap, answers,
 *       osu! snapshot and eligibility, team rules), a second submit, review in bulk, and
 *       withdrawals that reach the team.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { collections, fromId } from "@/lib/collections";
import { getDb } from "@/lib/db";
import type { Edition } from "@/schemas/edition";
import type { SessionUser } from "@/schemas/session-user";
import { setAvailability } from "@/services/availability";
import { getEditionById } from "@/services/editions";
import {
  listRegistrations,
  register,
  review,
  updateAnswers,
  withdraw,
} from "@/services/registrations";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";
import { osuHandlers } from "../../helpers/osu-server";

setupTestDb();
const server = setupServer(...osuHandlers);
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterAll(() => server.close());

const NOW = new Date("2026-10-10T12:00:00.000Z");
const SOLO = { kind: "solo", lineup: 1, rosterMin: 1, rosterMax: 1, subsMax: 0 } as const;
const db = () => collections(getDb());

const openEdition = async (patch: Partial<Edition> = {}): Promise<Edition> => {
  const { editionId } = await seedLineage();
  await db().editions.updateOne(
    { _id: fromId(editionId) ?? undefined },
    {
      $set: {
        phase: "registration",
        registration: {
          opensAt: "2026-10-01T00:00:00.000Z",
          closesAt: "2026-10-20T00:00:00.000Z",
          playerCap: null,
          staffCap: null,
        },
        ...patch,
      },
    },
  );
  const edition = await getEditionById(editionId);
  if (!edition) throw new Error("no edition");
  return edition;
};

const player = async (osuId: number): Promise<SessionUser> => ({
  ...(await createTestUser(osuId)),
  avatarUrl: null,
  isAdmin: false,
});

const solo = (patch: Partial<Edition> = {}) => openEdition({ sides: SOLO, ...patch });

describe("register", () => {
  it("registers a solo player with a snapshot and copies their default availability", async () => {
    const edition = await solo();
    const user = await player(1001);
    await setAvailability(user.id, null, "UTC", [5], NOW);
    const result = await register(user, edition, { answers: {} }, NOW);
    expect(result).toMatchObject({
      ok: true,
      value: {
        status: "pending",
        osuId: 1001,
        availability: null,
        snapshot: { rank: 5000, country: "US", username: "ranked" },
      },
    });
    expect(await db().availability.countDocuments({ userId: user.id, editionId: edition.id })).toBe(
      1,
    );
  });

  it("answers a second submit with the existing registration", async () => {
    const edition = await solo();
    const user = await player(1001);
    const first = await register(user, edition, { answers: {} }, NOW);
    const second = await register(user, edition, { answers: {} }, NOW);
    expect(second).toMatchObject({ ok: false, error: { code: "already-registered" } });
    if (!second.ok && first.ok) expect(second.error.existing?.id).toBe(first.value.id);
    expect(await db().registrations.countDocuments({})).toBe(1);
  });

  it("waitlists past the player cap", async () => {
    const edition = await solo({
      registration: {
        opensAt: "2026-10-01T00:00:00.000Z",
        closesAt: "2026-10-20T00:00:00.000Z",
        playerCap: 1,
        staffCap: null,
      },
    });
    await register(await player(1001), edition, { answers: {} }, NOW);
    expect(await register(await player(2001), edition, { answers: {} }, NOW)).toMatchObject({
      ok: true,
      value: { status: "waitlisted" },
    });
  });

  it("refuses outside the window with the library's code", async () => {
    const edition = await solo();
    const late = new Date("2026-10-21T00:00:00.000Z");
    expect(await register(await player(1001), edition, { answers: {} }, late)).toMatchObject({
      ok: false,
      error: { code: "closed" },
    });
  });

  it("refuses a missing required answer by question", async () => {
    const edition = await solo({
      questions: [{ id: "q1", label: "Discord", help: "", required: true, type: "text" }],
    });
    const result = await register(await player(1001), edition, { answers: {} }, NOW);
    expect(result).toMatchObject({ ok: false, error: { code: "bad-input" } });
    if (!result.ok) expect(Object.keys(result.error.errors ?? {})).toEqual(["q1"]);
  });

  it("refuses an ineligible player listing the reasons", async () => {
    const edition = await solo({
      eligibility: { rank: { min: 1, max: 100 }, countries: ["CA"], regions: null },
    });
    const result = await register(await player(1001), edition, { answers: {} }, NOW);
    expect(result).toMatchObject({
      ok: false,
      error: { code: "ineligible", reasons: ["rank-high", "country"] },
    });
  });

  it("refuses a restricted account and saves nothing on an osu! outage", async () => {
    const edition = await solo();
    expect(await register(await player(404), edition, { answers: {} }, NOW)).toMatchObject({
      ok: false,
      error: { code: "osu-user-unavailable" },
    });
    expect(await register(await player(500), edition, { answers: {} }, NOW)).toMatchObject({
      ok: false,
      error: { code: "osu-unavailable" },
    });
    expect(await db().registrations.countDocuments({})).toBe(0);
  });

  it("refuses a teammate already on another team, naming them", async () => {
    const edition = await openEdition();
    await register(
      await player(2001),
      edition,
      { answers: {}, team: { name: "Pines", tag: null, members: [2002] } },
      NOW,
    );
    const result = await register(
      await player(2003),
      edition,
      { answers: {}, team: { name: "Oaks", tag: null, members: [2002] } },
      NOW,
    );
    expect(result).toMatchObject({ ok: false, error: { code: "player-on-team" } });
    if (!result.ok) expect(result.error.message).toContain("2002");
  });

  it("refuses a team name another team registered", async () => {
    const edition = await openEdition();
    await register(
      await player(2001),
      edition,
      { answers: {}, team: { name: "Pines", tag: null, members: [2002] } },
      NOW,
    );
    expect(
      await register(
        await player(2003),
        edition,
        { answers: {}, team: { name: " PINES ", tag: null, members: [2004] } },
        NOW,
      ),
    ).toMatchObject({ ok: false, error: { code: "team-name-taken" } });
  });
});

describe("review", () => {
  it("approves three and creates three solo teams", async () => {
    const edition = await solo();
    const ids: string[] = [];
    for (const osuId of [2001, 2002, 2003]) {
      const r = await register(await player(osuId), edition, { answers: {} }, NOW);
      if (r.ok) ids.push(r.value.id);
    }
    expect(await review(edition, ids, "approved")).toEqual({ ok: true, value: { changed: 3 } });
    expect(await db().teams.countDocuments({ editionId: edition.id, status: "active" })).toBe(3);
    const listed = await listRegistrations(edition.id, { status: "approved" });
    expect(listed.total).toBe(3);
  });

  it("writes nothing when one move is illegal", async () => {
    const edition = await solo();
    const a = await register(await player(2001), edition, { answers: {} }, NOW);
    const b = await register(await player(2002), edition, { answers: {} }, NOW);
    if (!a.ok || !b.ok) throw new Error("setup");
    await review(edition, [a.value.id], "rejected");
    expect(await review(edition, [a.value.id, b.value.id], "approved")).toMatchObject({
      ok: false,
      error: { code: "bad-state" },
    });
    expect(await db().registrations.countDocuments({ status: "approved" })).toBe(0);
    expect(await db().teams.countDocuments({})).toBe(0);
  });

  it("refuses more than 200 rows", async () => {
    const edition = await solo();
    const ids = Array.from({ length: 201 }, (_, i) => i.toString(16).padStart(24, "0"));
    expect(await review(edition, ids, "approved")).toMatchObject({
      ok: false,
      error: { code: "limit" },
    });
  });
});

describe("player edits", () => {
  it("updates answers while open, refuses once closed", async () => {
    const edition = await solo({
      questions: [{ id: "q1", label: "Discord", help: "", required: false, type: "text" }],
    });
    const user = await player(1001);
    await register(user, edition, { answers: {} }, NOW);
    expect(await updateAnswers(user.id, edition, { q1: "ann" }, NOW)).toMatchObject({
      ok: true,
      value: { answers: { q1: "ann" } },
    });
    const late = new Date("2026-10-21T00:00:00.000Z");
    expect(await updateAnswers(user.id, edition, { q1: "bob" }, late)).toMatchObject({
      ok: false,
      error: { code: "closed" },
    });
  });

  it("withdrawing an approved solo player withdraws their team", async () => {
    const edition = await solo();
    const user = await player(1001);
    const r = await register(user, edition, { answers: {} }, NOW);
    if (!r.ok) throw new Error("setup");
    await review(edition, [r.value.id], "approved");
    expect(await withdraw(user.id, edition, NOW)).toMatchObject({
      ok: true,
      value: { status: "withdrawn" },
    });
    expect(await db().teams.findOne({})).toMatchObject({ status: "withdrawn" });
  });

  it("withdrawing an approved captain withdraws the team, and they can register again", async () => {
    const edition = await openEdition();
    const user = await player(2001);
    const r = await register(
      user,
      edition,
      { answers: {}, team: { name: "Pines", tag: null, members: [2002] } },
      NOW,
    );
    if (!r.ok) throw new Error("setup");
    await review(edition, [r.value.id], "approved");
    await withdraw(user.id, edition, NOW);
    expect(await db().teams.findOne({})).toMatchObject({ status: "withdrawn" });
    expect(
      await register(
        user,
        edition,
        { answers: {}, team: { name: "Pines", tag: null, members: [2002] } },
        NOW,
      ),
    ).toMatchObject({ ok: true, value: { id: r.value.id, status: "pending" } });
  });
});

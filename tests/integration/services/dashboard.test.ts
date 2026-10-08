/**
 * @file tests/integration/services/dashboard.test.ts
 * @desc The personal dashboard: a player in two editions in different phases sees both, each
 *       with its team and the soonest future match (past and finished ones skipped) and the
 *       round's pool link only once revealed; a host sees counts of pending registrations,
 *       untimed matches and results overdue; browse lists open registrations only.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { dashboardFor, openRegistrations } from "@/services/dashboard";
import { createEdition, moveEditionPhase, updateEdition } from "@/services/editions";
import { createLineage } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { EDITION_INPUT, LINEAGE_INPUT } from "../../helpers/inputs";
import { seedLineage, seedTeams } from "../../helpers/manage";
import { makeRegistration } from "../../helpers/records";

setupTestDb();

const NOW = new Date("2026-11-01T00:00:00.000Z");
const db = () => collections(getDb());

const register = async (editionId: string, userId: string, osuId: number, status = "approved") => {
  const { id: _, ...reg } = makeRegistration({
    editionId,
    userId,
    osuId,
    status: status as "approved",
  });
  await db().registrations.insertOne({ _id: new ObjectId(), ...reg });
};

const match = async (
  editionId: string,
  code: string,
  a: string | null,
  b: string | null,
  over = {},
) => {
  await db().matches.insertOne({
    _id: new ObjectId(),
    editionId,
    roundId: "r",
    bracketCode: code,
    round: "SF",
    a,
    b,
    bestOf: 7,
    status: "scheduled",
    scheduledAt: null,
    scoreA: null,
    scoreB: null,
    winner: null,
    mpLinks: [],
    streamUrl: null,
    vodUrl: null,
    refereeIds: [],
    streamerIds: [],
    commentatorIds: [],
    pickBans: [],
    maps: [],
    reschedules: [],
    notes: null,
    ...over,
  });
};

/** A second edition on another host's lineage, in registration. */
const otherEdition = async () => {
  const host = await createTestUser(9, "host2");
  const lineage = await createLineage(host.id, {
    ...LINEAGE_INPUT,
    slug: "other-cup",
    name: "Other Cup",
  });
  if (!lineage.ok) throw new Error(lineage.error.message);
  const edition = await createEdition(host.id, lineage.value.id, {
    ...EDITION_INPUT,
    code: "OC2026",
  });
  if (!edition.ok) throw new Error(edition.error.message);
  await moveEditionPhase(edition.value.id, "registration");
  return edition.value.id;
};

describe("dashboardFor: playing", () => {
  it("lists both editions with team and the soonest future match", async () => {
    const { editionId } = await seedLineage();
    await moveEditionPhase(editionId, "registration");
    await moveEditionPhase(editionId, "bracket");
    const second = await otherEdition();
    const player = await createTestUser(101, "kyon");
    const [team, rival] = await seedTeams(editionId, 2);
    await register(editionId, player.id, 101);
    await register(second, player.id, 101, "pending");
    const t = team?.id ?? "";
    const r = rival?.id ?? "";
    await match(editionId, "M1", t, r, { scheduledAt: "2026-10-30T00:00:00.000Z" });
    await match(editionId, "M2", t, r, { scheduledAt: "2026-11-05T00:00:00.000Z" });
    await match(editionId, "M3", r, t, { scheduledAt: "2026-11-03T00:00:00.000Z" });
    await match(editionId, "M4", t, r, { scheduledAt: "2026-11-02T00:00:00.000Z", status: "done" });

    const { playing } = await dashboardFor(player.id, NOW);
    expect(playing.map((p) => p.edition.slug).sort()).toEqual(["egc2026", "oc2026"]);
    const main = playing.find((p) => p.edition.id === editionId);
    expect(main?.team?.id).toBe(t);
    expect(main?.nextMatch?.code).toBe("M3");
    expect(main?.nextMatch?.opponent).toBe(rival?.name);
    expect(main?.poolUrl).toBeNull();
    const other = playing.find((p) => p.edition.id === second);
    expect(other?.registration.status).toBe("pending");
    expect(other?.team).toBeNull();
    expect(other?.nextMatch).toBeNull();
  });

  it("links the next match's pool once revealed", async () => {
    const { editionId } = await seedLineage();
    const player = await createTestUser(101, "kyon");
    const [team, rival] = await seedTeams(editionId, 2);
    await register(editionId, player.id, 101);
    await db().rounds.insertOne({
      _id: new ObjectId(),
      editionId,
      code: "SF",
      name: "Semifinals",
      side: "winners",
      order: 0,
      bestOf: 7,
      poolId: "p-sf",
      poolRevealed: true,
      starRange: null,
      window: null,
    });
    await match(editionId, "M1", team?.id ?? "", rival?.id ?? "", {
      scheduledAt: "2026-11-03T00:00:00.000Z",
    });
    const [entry] = (await dashboardFor(player.id, NOW)).playing;
    expect(entry?.poolUrl).toMatch(/\/pools\/p-sf$/);
  });
});

describe("dashboardFor: hosting", () => {
  it("counts what needs the host", async () => {
    const { owner, editionId } = await seedLineage();
    await register(editionId, "u1", 1, "pending");
    await register(editionId, "u2", 2, "pending");
    await register(editionId, "u3", 3, "approved");
    await match(editionId, "M1", "a", "b");
    await match(editionId, "M2", "a", "b", { scheduledAt: "2026-10-30T00:00:00.000Z" });
    await match(editionId, "M3", "a", "b", {
      scheduledAt: "2026-10-30T00:00:00.000Z",
      status: "done",
    });
    await match(editionId, "M4", "a", "b", { scheduledAt: "2026-11-30T00:00:00.000Z" });
    const { hosting, playing } = await dashboardFor(owner.id, NOW);
    expect(playing).toEqual([]);
    expect(hosting).toHaveLength(1);
    expect(hosting[0]?.editions[0]?.todo).toEqual({
      pendingRegistrations: 2,
      untimedMatches: 1,
      missingResults: 1,
    });
  });

  it("is empty for a stranger", async () => {
    await seedLineage();
    const stranger = await createTestUser(77);
    expect(await dashboardFor(stranger.id, NOW)).toEqual({ playing: [], hosting: [] });
  });
});

describe("openRegistrations", () => {
  it("lists editions in an open registration window that aren't hidden", async () => {
    const { editionId } = await seedLineage();
    const second = await otherEdition();
    await updateEdition(second, { siteMode: "hidden" });
    await moveEditionPhase(editionId, "registration");
    const page = await openRegistrations(NOW, 1);
    expect(page.items.map((e) => e.edition.id)).toEqual([editionId]);
    expect(page.items[0]?.lineage.slug).toBe("evergreen-cup");
    expect(page.pages).toBe(1);
  });
});

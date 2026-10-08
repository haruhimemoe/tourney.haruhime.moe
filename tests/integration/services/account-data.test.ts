/**
 * @file tests/integration/services/account-data.test.ts
 * @desc Account export and delete: refused while the user owns a running edition; a player
 *       approved in a running edition is withdrawn and dropped from their team; approved rows
 *       in done editions keep only the osu! id (two users in one edition included); their
 *       finished lineage stays up, orphaned; export lists what they have; delete runs twice.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { ObjectId } from "mongodb";
import { revalidateTag } from "next/cache";
import { describe, expect, it, vi } from "vitest";
import { collections } from "@/lib/collections";
import { getDb } from "@/lib/db";
import { deleteUser, exportUser } from "@/services/account-data";
import { moveEditionPhase } from "@/services/editions";
import { getLineageBySlug } from "@/services/lineages";
import { createTestUser } from "../../helpers/auth";
import { setupTestDb } from "../../helpers/db";
import { seedLineage } from "../../helpers/manage";
import { T0 } from "../../helpers/records";

setupTestDb();

const db = () => collections(getDb());

const register = async (editionId: string, userId: string, osuId: number, status = "approved") => {
  const _id = new ObjectId();
  await db().registrations.insertOne({
    _id,
    editionId,
    userId,
    osuId,
    kind: "player",
    status: status as "approved",
    appliedRoles: [],
    approvedRoles: [],
    availability: null,
    createdAt: T0,
    answers: { discord: "me" },
    snapshot: { rank: 100, country: "US", username: "p", takenAt: T0 },
    team: null,
    reviewNote: null,
  });
  return _id;
};

const team = async (editionId: string, roster: number[]) => {
  const _id = new ObjectId();
  await db().teams.insertOne({
    _id,
    editionId,
    name: `team ${roster.join("-")}`,
    tag: null,
    captainId: roster[0] ?? 1,
    roster,
    subs: [],
    seed: null,
    status: "active",
  });
  return _id;
};

describe("deleteUser", () => {
  it("refuses while the user owns a running edition", async () => {
    const { owner } = await seedLineage();
    const r = await deleteUser(owner.id);
    expect(r.ok ? null : r.error.code).toBe("owns-active-edition");
    expect(await db().lineages.countDocuments()).toBe(1);
  });

  it("withdraws a player approved in a running edition and drops them from their team", async () => {
    const { editionId } = await seedLineage();
    const player = await createTestUser(2);
    await register(editionId, player.id, 2);
    const teamId = await team(editionId, [3, 2]);
    expect((await deleteUser(player.id)).ok).toBe(true);
    expect(await db().registrations.countDocuments({ osuId: 2 })).toBe(0);
    expect((await db().teams.findOne({ _id: teamId }))?.roster).toEqual([3]);
  });

  it("marks the public pages of every edition it touched stale", async () => {
    const { editionId } = await seedLineage();
    const player = await createTestUser(2);
    await register(editionId, player.id, 2);
    vi.mocked(revalidateTag).mockClear();
    expect((await deleteUser(player.id)).ok).toBe(true);
    expect(vi.mocked(revalidateTag)).toHaveBeenCalledWith(editionId, expect.anything());
  });

  it("marks a solo team withdrawn when its only player leaves", async () => {
    const { editionId } = await seedLineage();
    const player = await createTestUser(2);
    await register(editionId, player.id, 2);
    const teamId = await team(editionId, [2]);
    await deleteUser(player.id);
    expect((await db().teams.findOne({ _id: teamId }))?.status).toBe("withdrawn");
  });

  it("anonymizes approved rows in done editions, two users at once, and keeps osu! ids", async () => {
    const { lineage, editionId } = await seedLineage();
    const [a, b] = [await createTestUser(2), await createTestUser(3)];
    await register(editionId, a.id, 2);
    await register(editionId, b.id, 3);
    await moveEditionPhase(editionId, "done");
    expect((await deleteUser(a.id)).ok).toBe(true);
    expect((await deleteUser(b.id)).ok).toBe(true);
    const rows = await db().registrations.find({ editionId }).toArray();
    expect(rows.map((r) => [r.userId, r.osuId, r.answers]).sort()).toEqual([
      [null, 2, {}],
      [null, 3, {}],
    ]);
    expect(await getLineageBySlug(lineage.slug)).not.toBeNull();
  });

  it("orphans a finished lineage the user owns, and runs twice safely", async () => {
    const { owner, lineage, editionId } = await seedLineage();
    await moveEditionPhase(editionId, "done");
    await db().profiles.insertOne({ userId: owner.id, verifiedHost: false, timezone: "UTC" });
    expect((await deleteUser(owner.id)).ok).toBe(true);
    expect((await deleteUser(owner.id)).ok).toBe(true);
    const saved = await getLineageBySlug(lineage.slug);
    expect(saved?.orphaned).toBe(true);
    expect(saved?.members.some((m) => m.userId === owner.id)).toBe(false);
    expect(await db().profiles.countDocuments()).toBe(0);
    expect(await db().editions.countDocuments()).toBe(1);
  });

  it("takes an admin off lineages they help run", async () => {
    const { lineage } = await seedLineage();
    const admin = await createTestUser(2);
    await db().lineages.updateOne(
      { slug: lineage.slug },
      { $push: { members: { userId: admin.id, role: "admin" } } },
    );
    expect((await deleteUser(admin.id)).ok).toBe(true);
    expect((await getLineageBySlug(lineage.slug))?.members).toHaveLength(1);
  });
});

describe("exportUser", () => {
  it("lists lineages owned with their editions, registrations and profile", async () => {
    const { owner, editionId } = await seedLineage();
    await register(editionId, owner.id, 1);
    const data = await exportUser(owner.id);
    expect(data.lineages).toHaveLength(1);
    expect(data.editions).toHaveLength(1);
    expect(data.registrations).toHaveLength(1);
    expect(data.profile).toEqual([]);
    expect(data.availability).toEqual([]);
  });

  it("leaves out editions of lineages they only admin", async () => {
    const { lineage } = await seedLineage();
    const admin = await createTestUser(2);
    await db().lineages.updateOne(
      { slug: lineage.slug },
      { $push: { members: { userId: admin.id, role: "admin" } } },
    );
    expect((await exportUser(admin.id)).editions).toEqual([]);
  });
});

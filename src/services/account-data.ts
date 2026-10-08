/**
 * @file src/services/account-data.ts
 * @desc What the hub's account fan-out exports and deletes in tourney, by identity user id.
 *       Delete is refused while the user owns a lineage with an edition still running. Otherwise
 *       it removes their availability and profile; withdraws registrations approved in running
 *       editions (a solo team is marked withdrawn, a team drops them from its roster) and deletes
 *       them; keeps approved registrations in finished editions with only the osu! id, so past
 *       brackets stay whole; deletes their other registrations; takes them off lineages they
 *       admin; and leaves lineages they own (all finished) up, orphaned. Running it twice is fine.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { collections, fromId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { withdrawFromTeam } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

const ownerFilter = (userId: string) => ({
  members: { $elemMatch: { userId, role: "owner" as const } },
});

/**
 * @function exportUser
 * @param userId {string} an identity user id
 * @returns {Promise<Record<string, unknown[]>>} the lineages they own with their editions, their
 *          registrations, availability and profile
 */
export const exportUser = async (userId: string): Promise<Record<string, unknown[]>> => {
  await connectDb();
  const db = collections(getDb());
  const lineages = await db.lineages.find(ownerFilter(userId)).toArray();
  const ids = lineages.map((l) => l._id.toHexString());
  const [editions, registrations, availability, profile] = await Promise.all([
    ids.length ? db.editions.find({ lineageId: { $in: ids } }).toArray() : [],
    db.registrations.find({ userId }).toArray(),
    db.availability.find({ userId }).toArray(),
    db.profiles.find({ userId }, { projection: { _id: 0 } }).toArray(),
  ]);
  return { lineages, editions, registrations, availability, profile };
};

/**
 * @function deleteUser
 * @param userId {string} an identity user id
 * @returns {Promise<AppResult<{ deleted: number }>>} how many rows went, or owns-active-edition
 */
export const deleteUser = async (userId: string): Promise<AppResult<{ deleted: number }>> => {
  await connectDb();
  const db = collections(getDb());
  const owned = await db.lineages.find(ownerFilter(userId), { projection: { _id: 1 } }).toArray();
  const ownedIds = owned.map((l) => l._id.toHexString());
  const running =
    ownedIds.length &&
    (await db.editions.countDocuments({
      lineageId: { $in: ownedIds },
      phase: { $ne: "done" },
      archived: { $ne: true },
    }));
  if (running) return fail("owns-active-edition");

  let deleted = 0;
  const registrations = await db.registrations.find({ userId }).toArray();
  const editionIds = [...new Set(registrations.map((r) => r.editionId))];
  const editionObjectIds = editionIds.flatMap((id) => fromId(id) ?? []);
  const doneEditions = await db.editions
    .find({ _id: { $in: editionObjectIds }, phase: "done" }, { projection: { _id: 1 } })
    .toArray();
  const done = new Set(doneEditions.map((e) => e._id.toHexString()));
  for (const r of registrations) {
    if (r.status === "approved" && done.has(r.editionId)) {
      await db.registrations.updateOne(
        { _id: r._id },
        { $set: { userId: null, answers: {}, reviewNote: null } },
      );
      continue;
    }
    if (r.status === "approved") await withdrawFromTeam(r.editionId, r.osuId);
    deleted += (await db.registrations.deleteOne({ _id: r._id })).deletedCount;
  }
  deleted += (await db.availability.deleteMany({ userId })).deletedCount;
  deleted += (await db.profiles.deleteMany({ userId })).deletedCount;
  await db.lineages.updateMany(
    { "members.userId": userId },
    { $pull: { members: { userId, role: "admin" } } },
  );
  await db.lineages.updateMany(ownerFilter(userId), {
    $pull: { members: { userId } },
    $set: { orphaned: true, updatedAt: new Date().toISOString() },
  });
  return ok({ deleted });
};

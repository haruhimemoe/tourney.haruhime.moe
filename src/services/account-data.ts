/**
 * @file src/services/account-data.ts
 * @desc What the hub's account fan-out exports and deletes in tourney, by identity user id.
 *       Delete is refused while the user owns a lineage with an edition still running. Otherwise
 *       it removes their availability and profile; withdraws registrations approved in running
 *       editions (a solo team is marked withdrawn, a team drops them from its roster) and deletes
 *       them; keeps approved registrations in finished editions with only the osu! id, so past
 *       brackets stay whole; deletes their other registrations; takes them off lineages they
 *       admin; leaves lineages they own (all finished) up, orphaned; and runs every registered
 *       module's deleteUser (all of them, even if one throws; module-delete-failed only after
 *       every module has had its turn, so one bad module never stops the rest). Running it twice
 *       is fine. Export adds each module's exportUser under `modules`, keyed by module id; a
 *       module whose exportUser throws doesn't fail the whole export, it just leaves
 *       `{ error: "export-failed" }` under its id (the cause is logged, not returned to the hub).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import "server-only";
import { collections, fromId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { revalidateEdition } from "@/lib/revalidate";
import { MODULES } from "@/modules/registry";
import { withdrawFromTeam } from "@/services/teams";
import { type AppResult, fail, ok } from "@/utils/result";

const ownerFilter = (userId: string) => ({
  members: { $elemMatch: { userId, role: "owner" as const } },
});

/** What exportUser returns: this app's rows, plus each module's own export, keyed by its id. */
export type AccountExport = {
  lineages: unknown[];
  editions: unknown[];
  registrations: unknown[];
  availability: unknown[];
  profile: unknown[];
  modules: Record<string, Record<string, unknown>>;
};

/**
 * @function exportUser
 * @param userId {string} an identity user id
 * @returns {Promise<AccountExport>} the lineages they own with their editions, their
 *          registrations, availability and profile, plus every registered module's export
 */
export const exportUser = async (userId: string): Promise<AccountExport> => {
  await connectDb();
  const db = collections(getDb());
  const lineages = await db.lineages.find(ownerFilter(userId)).toArray();
  const ids = lineages.map((l) => l._id.toHexString());
  const [editions, registrations, availability, profile, moduleExports] = await Promise.all([
    ids.length ? db.editions.find({ lineageId: { $in: ids } }).toArray() : [],
    db.registrations.find({ userId }).toArray(),
    db.availability.find({ userId }).toArray(),
    db.profiles.find({ userId }, { projection: { _id: 0 } }).toArray(),
    Promise.all(
      MODULES.map(async (m) => {
        try {
          return [m.id, await m.exportUser(userId)] as const;
        } catch (cause) {
          console.error(`module "${m.id}" failed to export account data`, cause);
          return [m.id, { error: "export-failed" }] as const;
        }
      }),
    ),
  ]);
  return {
    lineages,
    editions,
    registrations,
    availability,
    profile,
    modules: Object.fromEntries(moduleExports),
  };
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
        { $set: { userId: null, answers: {}, reviewNote: null, snapshot: null, team: null } },
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
  for (const id of editionIds) revalidateEdition(id);

  // Every module runs, even if one fails: a settled read, not a thrown one, so the rest still
  // get their turn. Report only after all of them have gone.
  const moduleResults = await Promise.allSettled(MODULES.map((m) => m.deleteUser(userId)));
  const failed = moduleResults.flatMap((r, i) => (r.status === "rejected" ? [MODULES[i]] : []));
  if (failed.length > 0) {
    console.error(
      `account delete for user "${userId}" failed for modules: ${failed.map((m) => m?.id).join(", ")}`,
    );
    return fail("module-delete-failed");
  }

  return ok({ deleted });
};

/**
 * @file src/services/lineage-modules.ts
 * @desc setLineageModule: turns one opt-in module id on or off for a lineage. Enabling races the
 *       32-module cap atomically: the `$expr` size check rides in the same update's filter as
 *       the `$addToSet`, so two concurrent enables on the same lineage can't both get through
 *       and push it past 32. A disable always `$pull`s, even an id the caller never checked
 *       against the registry; removing a stale entry is the only sane answer there. When the
 *       atomic enable doesn't match (no document moved), a follow-up read tells apart "already
 *       on" (the module was already in the 32, so the size check failed on its own account; an
 *       idempotent 200) from "genuinely at the cap" (400).
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import "server-only";
import { collections, fromId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { Lineage } from "@/schemas/lineage";
import { getLineage } from "@/services/lineages";
import { type AppResult, fail, ok } from "@/utils/result";

/** Max opt-in modules a lineage may turn on (matches LineageSchema.modules). */
export const MAX_LINEAGE_MODULES = 32;

const lineages = async () => {
  await connectDb();
  return collections(getDb()).lineages;
};

/**
 * @function setLineageModule
 * @param lineageId {string} the lineage
 * @param moduleId {string} a module id; the caller checks it's still registered before enabling
 *        (disabling never checks, so a stale or renamed id can still be turned off)
 * @param enabled {boolean} turn it on or off
 * @returns {Promise<AppResult<Lineage>>} the saved lineage, not-found, or limit when enabling
 *          would push the lineage past 32 modules
 */
export const setLineageModule = async (
  lineageId: string,
  moduleId: string,
  enabled: boolean,
): Promise<AppResult<Lineage>> => {
  const _id = fromId(lineageId);
  if (!_id) return fail("not-found");
  const now = new Date().toISOString();

  if (enabled) {
    const result = await (await lineages()).updateOne(
      { _id, $expr: { $lt: [{ $size: { $ifNull: ["$modules", []] } }, MAX_LINEAGE_MODULES] } },
      { $addToSet: { modules: moduleId }, $set: { updatedAt: now } },
    );
    if (result.matchedCount === 0) {
      const lineage = await getLineage(lineageId);
      if (!lineage) return fail("not-found");
      if (!lineage.modules.includes(moduleId))
        return fail(
          "limit",
          `This lineage already has ${MAX_LINEAGE_MODULES} modules on. Turn one off first.`,
        );
    }
  } else {
    await (await lineages()).updateOne(
      { _id },
      { $pull: { modules: moduleId }, $set: { updatedAt: now } },
    );
  }

  const saved = await getLineage(lineageId);
  if (!saved) return fail("not-found");
  return ok(saved);
};

/**
 * @file src/services/limits.ts
 * @desc The active edition limit: editions not done and not archived, counted across the
 *       lineages an account owns. One by default, ten for a verified host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import type { ObjectId } from "mongodb";
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";

/** Active editions an account may own at once. */
export const DEFAULT_EDITION_LIMIT = 1;

/** Active editions a verified host may own at once. */
export const VERIFIED_EDITION_LIMIT = 10;

/**
 * @function activeEditionIds
 * @param ownerId {string} an account
 * @returns {Promise<ObjectId[]>} the active editions in lineages they own, oldest first
 */
export const activeEditionIds = async (ownerId: string): Promise<ObjectId[]> => {
  await connectDb();
  const { lineages, editions } = collections(getDb());
  const owned = await lineages
    .find(
      { members: { $elemMatch: { userId: ownerId, role: "owner" } } },
      { projection: { _id: 1 } },
    )
    .toArray();
  if (!owned.length) return [];
  const rows = await editions
    .find(
      {
        lineageId: { $in: owned.map((l) => l._id.toHexString()) },
        phase: { $ne: "done" },
        archived: { $ne: true },
      },
      { projection: { _id: 1 } },
    )
    .sort({ _id: 1 })
    .toArray();
  return rows.map((r) => r._id);
};

/**
 * @function activeEditionCount
 * @param ownerId {string} an account
 * @returns {Promise<number>} how many active editions they own
 */
export const activeEditionCount = async (ownerId: string): Promise<number> =>
  (await activeEditionIds(ownerId)).length;

/**
 * @function editionLimit
 * @param userId {string} an account
 * @returns {Promise<number>} how many active editions they may own
 */
export const editionLimit = async (userId: string): Promise<number> => {
  await connectDb();
  const profile = await collections(getDb()).profiles.findOne({ userId });
  return profile?.verifiedHost ? VERIFIED_EDITION_LIMIT : DEFAULT_EDITION_LIMIT;
};

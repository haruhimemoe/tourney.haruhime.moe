/**
 * @file src/services/rounds.ts
 * @desc An edition's rounds, in order. Plan 1c adds building them from the bracket ladder.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { collections, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { StoredRound } from "@/schemas/round";

/**
 * @function listRounds
 * @param editionId {string} the edition
 * @returns {Promise<StoredRound[]>} its rounds by order
 */
export const listRounds = async (editionId: string): Promise<StoredRound[]> => {
  await connectDb();
  const docs = await collections(getDb()).rounds.find({ editionId }).sort({ order: 1 }).toArray();
  return docs.map(toId);
};

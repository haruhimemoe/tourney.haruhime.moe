/**
 * @file src/lib/db-indexes.ts
 * @desc Every index tourney needs, built with next-kit's ensureIndexes (each on its own, logged
 *       and skipped when it can't build, never thrown): the TTL on rate-limit counters and
 *       api_keys' (next-kit's apiKeyIndexSpecs). Nothing in the hub's identity database: the hub
 *       owns its indexes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { apiKeyIndexSpecs } from "@haruhimemoe/next-kit/api-keys";
import { ensureIndexes as buildIndexes, type IndexSpec } from "@haruhimemoe/next-kit/mongo";
import { counterTtlIndex } from "@haruhimemoe/next-kit/server";
import type { Db } from "mongodb";
import { RATE_LIMITS_COLLECTION } from "@/constants/db";

/** Every index connectDb makes sure of. */
export const RAW_INDEXES: readonly IndexSpec[] = [
  counterTtlIndex(RATE_LIMITS_COLLECTION),
  ...apiKeyIndexSpecs(),
];

/**
 * @function ensureIndexes
 * @param db {Db} the tourney database
 * @returns {Promise<void>} every index built, or skipped and logged (never thrown): a missing
 *          index must not take the site down
 */
export const ensureIndexes = async (db: Db): Promise<void> => {
  await buildIndexes(db, RAW_INDEXES);
};

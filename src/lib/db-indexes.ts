/**
 * @file src/lib/db-indexes.ts
 * @desc Every index tourney needs, built with next-kit's ensureIndexes (each on its own, logged
 *       and skipped when it can't build, never thrown): unique lineage slugs, edition slugs
 *       unique per lineage, one registration per account and kind in an edition (anonymized rows,
 *       userId null, are left out), one bracket per stage, one match per bracket code, one
 *       availability per user and edition, one profile per user, the lookups pages run, the TTL
 *       on rate-limit counters and api_keys' (next-kit's apiKeyIndexSpecs). Nothing in the hub's
 *       identity database: the hub owns its indexes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { apiKeyIndexSpecs } from "@haruhimemoe/next-kit/api-keys";
import { ensureIndexes as buildIndexes, type IndexSpec } from "@haruhimemoe/next-kit/mongo";
import { counterTtlIndex } from "@haruhimemoe/next-kit/server";
import type { Db } from "mongodb";
import {
  AVAILABILITY_COLLECTION,
  BRACKETS_COLLECTION,
  EDITIONS_COLLECTION,
  LINEAGES_COLLECTION,
  MATCHES_COLLECTION,
  PROFILES_COLLECTION,
  QUALIFIER_SCORES_COLLECTION,
  RATE_LIMITS_COLLECTION,
  REGISTRATIONS_COLLECTION,
  ROUNDS_COLLECTION,
  TEAMS_COLLECTION,
} from "@/constants/db";

const isString = (field: string) => ({ [field]: { $type: "string" } });

/** Every index connectDb makes sure of. */
export const RAW_INDEXES: readonly IndexSpec[] = [
  { collection: LINEAGES_COLLECTION, key: { slug: 1 }, unique: true },
  { collection: LINEAGES_COLLECTION, key: { "members.userId": 1 } },
  { collection: EDITIONS_COLLECTION, key: { lineageId: 1, slug: 1 }, unique: true },
  { collection: EDITIONS_COLLECTION, key: { phase: 1, archived: 1 } },
  { collection: ROUNDS_COLLECTION, key: { editionId: 1, order: 1 } },
  {
    collection: REGISTRATIONS_COLLECTION,
    key: { editionId: 1, userId: 1, kind: 1 },
    unique: true,
    partialFilterExpression: isString("userId"),
  },
  { collection: REGISTRATIONS_COLLECTION, key: { editionId: 1, status: 1, createdAt: 1 } },
  { collection: REGISTRATIONS_COLLECTION, key: { userId: 1 } },
  { collection: TEAMS_COLLECTION, key: { editionId: 1, seed: 1 } },
  { collection: BRACKETS_COLLECTION, key: { editionId: 1, stage: 1 }, unique: true },
  {
    collection: MATCHES_COLLECTION,
    key: { editionId: 1, bracketCode: 1 },
    unique: true,
    partialFilterExpression: isString("bracketCode"),
  },
  { collection: MATCHES_COLLECTION, key: { editionId: 1, scheduledAt: 1 } },
  { collection: QUALIFIER_SCORES_COLLECTION, key: { editionId: 1, roundId: 1 } },
  { collection: AVAILABILITY_COLLECTION, key: { userId: 1, editionId: 1 }, unique: true },
  { collection: PROFILES_COLLECTION, key: { userId: 1 }, unique: true },
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

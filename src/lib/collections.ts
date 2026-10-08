/**
 * @file src/lib/collections.ts
 * @desc The typed driver collections of the tourney database. A stored row is its schema type
 *       with `id` swapped for Mongo's `_id` (an ObjectId); toId and fromId convert at the edge,
 *       so services and pages only see hex string ids.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { type Collection, type Db, type Document, ObjectId } from "mongodb";
import {
  AVAILABILITY_COLLECTION,
  BRACKETS_COLLECTION,
  EDITIONS_COLLECTION,
  LINEAGES_COLLECTION,
  MATCHES_COLLECTION,
  PROFILES_COLLECTION,
  QUALIFIER_SCORES_COLLECTION,
  REGISTRATIONS_COLLECTION,
  ROUNDS_COLLECTION,
  TEAMS_COLLECTION,
} from "@/constants/db";
import type { StoredBracket } from "@/schemas/bracket";
import type { Edition } from "@/schemas/edition";
import type { Lineage } from "@/schemas/lineage";
import type { StoredMatch } from "@/schemas/match";
import type { Profile } from "@/schemas/profile";
import type { StoredRegistration } from "@/schemas/registration";
import type { StoredRound } from "@/schemas/round";
import type { StoredTeam } from "@/schemas/team";

/** A stored row: the type without `id`, keyed by `_id`. */
export type Doc<T extends { id: string }> = Omit<T, "id"> & { _id: ObjectId };

/** Every tourney collection, typed. */
export type Collections = {
  lineages: Collection<Doc<Lineage>>;
  editions: Collection<Doc<Edition>>;
  rounds: Collection<Doc<StoredRound>>;
  registrations: Collection<Doc<StoredRegistration>>;
  teams: Collection<Doc<StoredTeam>>;
  brackets: Collection<Doc<StoredBracket>>;
  matches: Collection<Doc<StoredMatch>>;
  qualifierScores: Collection<Document>;
  availability: Collection<Document>;
  profiles: Collection<Profile>;
};

/**
 * @function collections
 * @param db {Db} the tourney database
 * @returns {Collections} its collections, typed
 */
export const collections = (db: Db): Collections => ({
  lineages: db.collection(LINEAGES_COLLECTION),
  editions: db.collection(EDITIONS_COLLECTION),
  rounds: db.collection(ROUNDS_COLLECTION),
  registrations: db.collection(REGISTRATIONS_COLLECTION),
  teams: db.collection(TEAMS_COLLECTION),
  brackets: db.collection(BRACKETS_COLLECTION),
  matches: db.collection(MATCHES_COLLECTION),
  qualifierScores: db.collection(QUALIFIER_SCORES_COLLECTION),
  availability: db.collection(AVAILABILITY_COLLECTION),
  profiles: db.collection(PROFILES_COLLECTION),
});

/**
 * @function toId
 * @param doc {T & { _id: ObjectId }} a stored row
 * @returns {Omit<T, "_id"> & { id: string }} the row with `_id` as a hex string `id`
 */
export const toId = <T extends { _id: ObjectId }>({
  _id,
  ...rest
}: T): Omit<T, "_id"> & { id: string } => ({ id: _id.toHexString(), ...rest });

/**
 * @function fromId
 * @param id {string} a hex id from a URL or form
 * @returns {ObjectId | null} its ObjectId, or null when it isn't 24 hex characters
 */
export const fromId = (id: string): ObjectId | null =>
  /^[0-9a-f]{24}$/i.test(id) ? new ObjectId(id) : null;

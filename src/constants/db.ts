/**
 * @file src/constants/db.ts
 * @desc Collection names in the tourney database, how long a public read may run, and every field
 *       holding an identity user id (for the hub's identity migration).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

/** Tournament series, each with an owner and admins. */
export const LINEAGES_COLLECTION = "lineages";
/** One year (or run) of a lineage. */
export const EDITIONS_COLLECTION = "editions";
/** An edition's rounds, from buildLadder plus qualifiers and groups. */
export const ROUNDS_COLLECTION = "rounds";
/** Player and staff registrations. */
export const REGISTRATIONS_COLLECTION = "registrations";
/** An edition's teams (one per player in solo editions). */
export const TEAMS_COLLECTION = "teams";
/** One bracket document per edition stage. */
export const BRACKETS_COLLECTION = "brackets";
/** Everything said about one game: time, links, picks, maps. */
export const MATCHES_COLLECTION = "matches";
/** Qualifier scores, by hand or from mp links. */
export const QUALIFIER_SCORES_COLLECTION = "qualifier_scores";
/** Weekly availability, a default per user and a copy per edition. */
export const AVAILABILITY_COLLECTION = "availability";
/** App-only user fields: verifiedHost and timezone. */
export const PROFILES_COLLECTION = "profiles";
/** Rate-limit and osu! budget counters. */
export const RATE_LIMITS_COLLECTION = "rate_limits";
/** API keys (next-kit's api-keys store), one per user, keyed by the identity user id. */
export const API_KEYS_COLLECTION = "api_keys";

/**
 * Every tourney field holding an identity user id, as next-kit's migrateIdentity takes them.
 * lineages.members[].userId is an array field migrateIdentity's `$set` can't rewrite, so it isn't
 * listed.
 */
export const USER_ID_REFERENCES: readonly { collection: string; field: string }[] = [
  { collection: REGISTRATIONS_COLLECTION, field: "userId" },
  { collection: AVAILABILITY_COLLECTION, field: "userId" },
  { collection: PROFILES_COLLECTION, field: "userId" },
  { collection: API_KEYS_COLLECTION, field: "userId" },
];

/** maxTimeMS on every public read. */
export const QUERY_TIME_MS = 2000;

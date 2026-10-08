/**
 * @file src/lib/db.ts
 * @desc tourney's MongoDB, from next-kit's createMongo: one MongoClient per process, built on first
 *       use (never at import, so builds and pages without a database need no env), state on
 *       globalThis so dev reloads don't leak clients, and a failed connect never cached. The
 *       database is always "tourney", whatever the URI says; the hub's "identity" database (users
 *       and sessions) sits on the same client, read-only for tourney's Atlas user. The first
 *       connect checks the user's privileges (src/lib/db-privileges.ts) and refuses to go on when
 *       they reach another database, read on identity aside (unless
 *       TOURNEY_ALLOW_SHARED_DB_USER=true, which still needs readWrite on tourney and warns), then
 *       creates the indexes.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { createMongo } from "@haruhimemoe/next-kit/mongo";
import { getAllowSharedDbUser, getDatabaseUri } from "@/env";
import { ensureIndexes } from "@/lib/db-indexes";
import { checkDatabasePrivileges, readConnectionStatus } from "@/lib/db-privileges";

/** The one database tourney uses. */
export const DB_NAME = "tourney";

/** The hub's identity database: tourney reads sessions and users there, never writes. */
export const IDENTITY_DB_NAME = "identity";

const mongo = createMongo({
  dbName: DB_NAME,
  identityDbName: IDENTITY_DB_NAME,
  globalKey: "__tourneyMongo",
  uri: getDatabaseUri,
  onConnect: async ({ db, client }) => {
    checkDatabasePrivileges(await readConnectionStatus(client), DB_NAME, getAllowSharedDbUser(), [
      IDENTITY_DB_NAME,
    ]);
    await ensureIndexes(db);
  },
});

/** The shared client (connects lazily on first operation). */
export const getMongoClient = mongo.getMongoClient;

/** The tourney database on the shared client. */
export const getDb = mongo.getDb;

/** The hub's identity database on the shared client (read-only). */
export const getIdentityDb = mongo.getIdentityDb;

/**
 * Connects once: privileges checked and indexes built. Rejects with DatabasePrivilegeError when
 * the user can reach another database (or, with TOURNEY_ALLOW_SHARED_DB_USER=true, can't write
 * to tourney).
 */
export const connectDb = mongo.connectDb;

/** The tourney database once connectDb has resolved. */
export const connectedDb = mongo.connectedDb;

/** Closes the client and forgets it (tests). */
export const closeDb = mongo.closeDb;

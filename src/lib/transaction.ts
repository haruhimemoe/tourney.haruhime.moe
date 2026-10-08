/**
 * @file src/lib/transaction.ts
 * @desc Running a write in one Mongo transaction, retried on conflict: a WriteConflict (any
 *       error Mongo labels TransientTransactionError) and a stale version check (the work throws
 *       VersionConflict when its updateOne matched nothing) both reload and try again, up to
 *       MAX_ATTEMPTS, then answer `conflict`. A refusal the work returns aborts and is passed
 *       through; nothing it wrote is kept.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { type ClientSession, MongoError } from "mongodb";
import { connectDb, getMongoClient } from "@/lib/db";
import { type AppResult, fail } from "@/utils/result";

/** How many times a conflicting write is tried. */
export const MAX_ATTEMPTS = 5;

/** Thrown by the work when its version check matched nothing. */
export class VersionConflict extends Error {
  constructor() {
    super("version conflict");
    this.name = "VersionConflict";
  }
}

const isConflict = (error: unknown): boolean =>
  error instanceof VersionConflict ||
  (error instanceof MongoError &&
    (error.code === 112 || error.hasErrorLabel("TransientTransactionError")));

const pause = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, 5 + Math.random() * 20 * attempt));

/**
 * @function inTransaction
 * @param work {(session: ClientSession) => Promise<AppResult<T>>} the reads and writes, each
 *        passed `session`; it may run more than once
 * @returns {Promise<AppResult<T>>} the work's answer once committed, its refusal (rolled back),
 *          or conflict after MAX_ATTEMPTS
 */
export const inTransaction = async <T>(
  work: (session: ClientSession) => Promise<AppResult<T>>,
): Promise<AppResult<T>> => {
  await connectDb();
  const session = getMongoClient().startSession();
  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      session.startTransaction();
      try {
        const result = await work(session);
        if (!result.ok) {
          await session.abortTransaction();
          return result;
        }
        await session.commitTransaction();
        return result;
      } catch (error) {
        if (session.inTransaction()) await session.abortTransaction();
        if (!isConflict(error)) throw error;
        await pause(attempt);
      }
    }
    return fail("conflict");
  } finally {
    await session.endSession();
  }
};

/**
 * @file src/services/hosts.ts
 * @desc Verified hosts: a haruhime admin sets the flag on an account's tourney profile by osu!
 *       id, which raises how many active editions it may own (limits.ts). The account is found
 *       in the hub's identity database, read only.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/collections";
import { connectDb, getDb, getIdentityDb } from "@/lib/db";
import { type AppResult, fail, ok } from "@/utils/result";

/** A verified host as the admin page lists them. */
export type VerifiedHost = { userId: string; osuId: number | null; username: string | null };

type IdentityUser = { _id: ObjectId; osuId?: number; username?: string };

/**
 * @function setVerifiedHost
 * @param osuId {number} the host's osu! id
 * @param verified {boolean} the flag's new value
 * @returns {Promise<AppResult<{ userId: string; verified: boolean }>>} the account changed, or
 *          not-found when no haruhime account has that osu! id
 */
export const setVerifiedHost = async (
  osuId: number,
  verified: boolean,
): Promise<AppResult<{ userId: string; verified: boolean }>> => {
  await connectDb();
  const user = await getIdentityDb().collection<IdentityUser>("user").findOne({ osuId });
  if (!user) return fail("not-found", "No haruhime.moe account has that osu! id.");
  const userId = user._id.toHexString();
  await collections(getDb()).profiles.updateOne(
    { userId },
    {
      $set: { verifiedHost: verified },
      $setOnInsert: { _id: new ObjectId(), userId, timezone: null },
    },
    { upsert: true },
  );
  return ok({ userId, verified });
};

/**
 * @function listVerifiedHosts
 * @returns {Promise<VerifiedHost[]>} every verified host with their osu! id and username
 */
export const listVerifiedHosts = async (): Promise<VerifiedHost[]> => {
  await connectDb();
  const profiles = await collections(getDb()).profiles.find({ verifiedHost: true }).toArray();
  const ids = profiles.flatMap((p) => (ObjectId.isValid(p.userId) ? [new ObjectId(p.userId)] : []));
  const users = new Map(
    (
      await getIdentityDb()
        .collection<IdentityUser>("user")
        .find({ _id: { $in: ids } })
        .toArray()
    ).map((u) => [u._id.toHexString(), u]),
  );
  return profiles
    .map((p) => {
      const u = users.get(p.userId);
      return { userId: p.userId, osuId: u?.osuId ?? null, username: u?.username ?? null };
    })
    .sort((x, y) => (x.username ?? "").localeCompare(y.username ?? ""));
};

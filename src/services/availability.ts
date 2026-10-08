/**
 * @file src/services/availability.ts
 * @desc A player's weekly availability, one row per user and edition (edition null: their
 *       default). Slots arrive in the player's zone and are stored as a UTC grid with
 *       @haruhimemoe/time's fromZone; toZone shows them in any zone. The library's
 *       registration.availability field stays null: this collection is the one source.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { fromZone, toZone } from "@haruhimemoe/time/availability";
import { ObjectId } from "mongodb";
import { collections, toId } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import type { StoredAvailability } from "@/schemas/availability";
import { type AppResult, fail, ok } from "@/utils/result";

const rows = async () => {
  await connectDb();
  return collections(getDb()).availability;
};

/**
 * @function getAvailability
 * @param userId {string} the player
 * @param editionId {string | null} the edition, or null for their default
 * @returns {Promise<StoredAvailability | null>} the row, or null when they never set one
 */
export const getAvailability = async (
  userId: string,
  editionId: string | null,
): Promise<StoredAvailability | null> => {
  const doc = await (await rows()).findOne({ userId, editionId });
  return doc ? toId(doc) : null;
};

/**
 * @function setAvailability
 * @param userId {string} the player
 * @param editionId {string | null} the edition, or null for their default
 * @param zone {string} the IANA zone the slots were picked in
 * @param local {readonly number[]} local week slots (day * 24 + hour, Monday 0)
 * @param now {Date} when; also picks the week the local slots are read in
 * @returns {Promise<AppResult<StoredAvailability>>} the stored row, or bad-input for a bad zone or slot
 */
export const setAvailability = async (
  userId: string,
  editionId: string | null,
  zone: string,
  local: readonly number[],
  now = new Date(),
): Promise<AppResult<StoredAvailability>> => {
  let grid: StoredAvailability["grid"];
  try {
    grid = fromZone(local, zone, { at: now });
  } catch {
    return fail("bad-input", "That timezone or time slot isn't valid.");
  }
  const fields = { zone, grid, updatedAt: now.toISOString() };
  const doc = await (await rows()).findOneAndUpdate(
    { userId, editionId },
    { $set: fields, $setOnInsert: { _id: new ObjectId(), userId, editionId } },
    { upsert: true, returnDocument: "after" },
  );
  if (!doc) return fail("not-found");
  return ok(toId(doc));
};

/**
 * @function localSlots
 * @param row {StoredAvailability} a stored availability
 * @param zone {string} the viewer's zone
 * @param now {Date} which week to show it in
 * @returns {number[]} the free local week slots in that zone
 */
export const localSlots = (row: StoredAvailability, zone: string, now = new Date()): number[] =>
  toZone(row.grid, zone, { at: now });

/**
 * @function copyDefaultInto
 * @param userId {string} the player
 * @param editionId {string} the edition they just registered for
 * @returns {Promise<void>} once their default is copied there, unless the edition already has one
 */
export const copyDefaultInto = async (userId: string, editionId: string): Promise<void> => {
  const base = await getAvailability(userId, null);
  if (!base) return;
  await (await rows()).updateOne(
    { userId, editionId },
    {
      $setOnInsert: {
        _id: new ObjectId(),
        userId,
        editionId,
        zone: base.zone,
        grid: base.grid,
        updatedAt: base.updatedAt,
      },
    },
    { upsert: true },
  );
};

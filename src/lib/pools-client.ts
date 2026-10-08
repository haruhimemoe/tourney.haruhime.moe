/**
 * @file src/lib/pools-client.ts
 * @desc Reading a round's pool from pools.haruhime.moe's internal route (any visibility, with
 *       the shared TOURNEY_SERVICE_SECRET). Each slot gets its @haruhimemoe/pool slotKey, the
 *       key pick/bans and map results use. Cached 5 minutes per pool (tag "pool:<id>"). Never
 *       throws: a 404 is not-found, anything else that goes wrong is pool-unavailable.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import "server-only";
import { poolSlotSchema, type SlotBucket, slotKey } from "@haruhimemoe/pool";
import { z } from "zod";
import { SERVER_USER_AGENT } from "@/constants/site";
import { getPoolsService } from "@/env";
import { type AppResult, fail, ok } from "@/utils/result";

/** How long a read pool is reused, in seconds. */
export const POOL_CACHE_SECONDS = 300;

/** One slot of a pool, with its key. */
export type LinkedSlot = { mod: SlotBucket; index: number; beatmapId: number; slotKey: string };

/** A pool as tourney uses it. */
export type LinkedPool = { id: string; name: string; url: string; slots: LinkedSlot[] };

const POOL_ID = /^[A-Za-z0-9_-]{1,64}$/;

const bodySchema = z.object({
  pool: z.object({ id: z.string(), name: z.string(), slots: z.array(poolSlotSchema) }),
});

/**
 * @function getPool
 * @param poolId {string} a pool id on pools.haruhime.moe
 * @returns {Promise<AppResult<LinkedPool>>} the pool, not-found, or pool-unavailable
 */
export const getPool = async (poolId: string): Promise<AppResult<LinkedPool>> => {
  if (!POOL_ID.test(poolId)) return fail("not-found");
  let service: ReturnType<typeof getPoolsService>;
  try {
    service = getPoolsService();
  } catch {
    service = null;
  }
  if (!service) return fail("pool-unavailable");
  try {
    const response = await fetch(`${service.url}/api/internal/pools/${poolId}`, {
      headers: { authorization: `Bearer ${service.secret}`, "user-agent": SERVER_USER_AGENT },
      next: { revalidate: POOL_CACHE_SECONDS, tags: [`pool:${poolId}`] },
    });
    if (response.status === 404) return fail("not-found");
    if (!response.ok) return fail("pool-unavailable");
    const parsed = bodySchema.safeParse(await response.json());
    if (!parsed.success) return fail("pool-unavailable");
    const { id, name, slots } = parsed.data.pool;
    return ok({
      id,
      name,
      url: `${service.url}/pools/${id}`,
      slots: slots.map((s) => ({ ...s, slotKey: slotKey(s) })),
    });
  } catch {
    return fail("pool-unavailable");
  }
};

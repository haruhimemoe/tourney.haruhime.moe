/**
 * @file tests/integration/lib/pools-client.test.ts
 * @desc getPool: a pool read from pools.haruhime.moe with slot keys, not-found for a 404, and
 *       pool-unavailable for an outage, a body that isn't a pool, or no secret set. Never throws.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { slotKey } from "@haruhimemoe/pool";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { getPool } from "@/lib/pools-client";
import { POOL_SLOTS, POOLS_SECRET, poolsHandlers } from "../../helpers/pools-server";

const server = setupServer(...poolsHandlers);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => vi.stubEnv("TOURNEY_SERVICE_SECRET", POOLS_SECRET));
afterEach(() => vi.unstubAllEnvs());

describe("getPool", () => {
  it("reads a pool with each slot's key", async () => {
    const result = await getPool("p-ok");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({
      id: "p-ok",
      name: "EGC 2026 QF",
      url: "https://pools.haruhime.moe/pools/p-ok",
    });
    expect(result.value.slots).toHaveLength(POOL_SLOTS.length);
    expect(result.value.slots[0]).toEqual({
      mod: "NM",
      index: 1,
      beatmapId: 101,
      slotKey: slotKey({ mod: "NM", index: 1 }),
    });
  });

  it("answers not-found for a pool pools doesn't have", async () => {
    expect(await getPool("p-missing")).toMatchObject({ ok: false, error: { code: "not-found" } });
  });

  it.each(["p-down", "p-bad"])("answers pool-unavailable for %s", async (id) => {
    expect(await getPool(id)).toMatchObject({ ok: false, error: { code: "pool-unavailable" } });
  });

  it("answers pool-unavailable without a secret, sending nothing", async () => {
    vi.stubEnv("TOURNEY_SERVICE_SECRET", "");
    expect(await getPool("p-ok")).toMatchObject({
      ok: false,
      error: { code: "pool-unavailable" },
    });
  });

  it("refuses an id that isn't a pool id before calling", async () => {
    expect(await getPool("../admin")).toMatchObject({ ok: false, error: { code: "not-found" } });
  });
});

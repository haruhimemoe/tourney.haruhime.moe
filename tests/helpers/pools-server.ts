/**
 * @file tests/helpers/pools-server.ts
 * @desc A stand-in for pools.haruhime.moe's internal pool route. Pool "p-ok" is a 1v1 pool
 *       (NM1, NM2, HD1, HR1, DT1, TB1), "p-missing" answers 404, "p-down" 500, "p-bad" a body
 *       that isn't a pool. Every call needs the test secret.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { HttpResponse, http } from "msw";

/** The secret tests set as TOURNEY_SERVICE_SECRET. */
export const POOLS_SECRET = "p".repeat(40);

/** The ok pool's slots. */
export const POOL_SLOTS = [
  { mod: "NM", index: 1, beatmapId: 101 },
  { mod: "NM", index: 2, beatmapId: 102 },
  { mod: "HD", index: 1, beatmapId: 201 },
  { mod: "HR", index: 1, beatmapId: 301 },
  { mod: "DT", index: 1, beatmapId: 401 },
  { mod: "TB", index: 1, beatmapId: 901 },
];

/** pools' internal route, as the handlers answer it. */
export const poolsHandlers = [
  http.get("https://pools.haruhime.moe/api/internal/pools/:id", ({ params, request }) => {
    if (request.headers.get("authorization") !== `Bearer ${POOLS_SECRET}`)
      return HttpResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
    if (params.id === "p-missing")
      return HttpResponse.json({ error: { code: "not_found" } }, { status: 404 });
    if (params.id === "p-down") return HttpResponse.json({ error: "down" }, { status: 500 });
    if (params.id === "p-bad") return HttpResponse.json({ pool: { id: "p-bad" } });
    return HttpResponse.json({
      pool: { id: params.id, name: "EGC 2026 QF", visibility: "private", slots: POOL_SLOTS },
    });
  }),
];

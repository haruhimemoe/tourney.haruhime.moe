/**
 * @file tests/helpers/osu-server.ts
 * @desc A stand-in for osu!'s API: the client-credentials token and user profiles. Osu id 1001
 *       is a ranked US player, 1002 an unranked German one, 404 nobody (restricted or deleted),
 *       500 an outage. Other ids answer a ranked player named after the id.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { HttpResponse, http } from "msw";

/** A /users/{id}/{ruleset} answer in osu!'s snake_case. */
export const osuProfile = (id: number, username: string, country: string, rank: number | null) => ({
  id,
  username,
  avatar_url: null,
  country_code: country,
  statistics: { global_rank: rank, country_rank: rank },
});

/** The osu! API handlers every integration file starts with. */
export const osuHandlers = [
  http.post("https://osu.ppy.sh/oauth/token", () =>
    HttpResponse.json({ access_token: "osu-test-token", token_type: "Bearer", expires_in: 86400 }),
  ),
  http.get("https://osu.ppy.sh/api/v2/users/:id/:ruleset", ({ params }) => {
    const id = Number(params.id);
    if (id === 404) return HttpResponse.json({ error: null }, { status: 404 });
    if (id === 500) return HttpResponse.json({ error: "down" }, { status: 500 });
    if (id === 1002) return HttpResponse.json(osuProfile(id, "unranked", "DE", null));
    if (id === 1001) return HttpResponse.json(osuProfile(id, "ranked", "US", 5000));
    return HttpResponse.json(osuProfile(id, `player${id}`, "US", id));
  }),
];

/**
 * @file tests/helpers/osu-server.ts
 * @desc A stand-in for osu!'s API: the client-credentials token. Later tests add their own
 *       handlers (users, matches) with server.use.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { HttpResponse, http } from "msw";

export const osuHandlers = [
  http.post("https://osu.ppy.sh/oauth/token", () =>
    HttpResponse.json({ access_token: "osu-test-token", token_type: "Bearer", expires_in: 86400 }),
  ),
];

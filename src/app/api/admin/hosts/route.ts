/**
 * @file src/app/api/admin/hosts/route.ts
 * @desc PUT `{ osuId, verified }`: a haruhime admin (ADMIN_OSU_IDS) marks a host verified, or
 *       not. Same-site only, counted as an ordinary write.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { noStore, parseJsonBody, userSubject } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { RATE_LIMITS } from "@/constants/api";
import { errorResponse } from "@/constants/errors";
import { refuseCrossSite } from "@/lib/api";
import { getUserFromHeaders } from "@/lib/auth";
import { refuseOverLimit } from "@/lib/rate-limit";
import { setVerifiedHost } from "@/services/hosts";

const bodySchema = z.strictObject({
  osuId: z.number().int().positive(),
  verified: z.boolean(),
});

/**
 * @function PUT
 * @param request {Request} `{ osuId, verified }`
 * @returns {Promise<Response>} 200 with the change, 401 signed out, 403 for a non-admin, 404
 *          for an osu! id with no account
 */
export const PUT = async (request: Request): Promise<Response> => {
  const crossSite = refuseCrossSite(request);
  if (crossSite) return noStore(crossSite);
  const user = await getUserFromHeaders(request.headers);
  if (!user)
    return noStore(
      Response.json({ error: { code: "signed-out", message: "Sign in first." } }, { status: 401 }),
    );
  if (!user.isAdmin) return noStore(errorResponse({ code: "forbidden" }, 403));
  const limited = await refuseOverLimit(RATE_LIMITS.manageWrite, userSubject(user));
  if (limited) return noStore(limited);
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return noStore(body.response);
  const result = await setVerifiedHost(body.data.osuId, body.data.verified);
  if (!result.ok) return noStore(errorResponse(result.error, 404));
  return noStore(Response.json(result.value));
};

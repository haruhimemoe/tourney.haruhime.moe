/**
 * @file src/app/api/availability/route.ts
 * @desc PUT a player's own availability: their default (`editionId: null`) or one edition they
 *       registered for. Signed in, same-site, counted as an ordinary write. Availability only
 *       feeds match time suggestions, so no public page goes stale.
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
import { collections } from "@/lib/collections";
import { connectDb, getDb } from "@/lib/db";
import { refuseOverLimit } from "@/lib/rate-limit";
import { setAvailability } from "@/services/availability";

const WEEK_SLOTS = 7 * 24;

const bodySchema = z.strictObject({
  editionId: z
    .string()
    .regex(/^[0-9a-f]{24}$/)
    .nullable(),
  zone: z.string().min(1).max(64),
  slots: z
    .array(
      z
        .number()
        .int()
        .min(0)
        .max(WEEK_SLOTS - 1),
    )
    .max(WEEK_SLOTS),
});

/**
 * @function PUT
 * @param request {Request} `{ editionId, zone, slots }` with slots as local week hours
 * @returns {Promise<Response>} 200 with the saved row, or a refusal
 */
export const PUT = async (request: Request): Promise<Response> => {
  const crossSite = refuseCrossSite(request);
  if (crossSite) return noStore(crossSite);
  const user = await getUserFromHeaders(request.headers);
  if (!user)
    return noStore(
      Response.json({ error: { code: "signed-out", message: "Sign in first." } }, { status: 401 }),
    );
  const limited = await refuseOverLimit(RATE_LIMITS.manageWrite, userSubject(user));
  if (limited) return noStore(limited);
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return noStore(body.response);
  const { editionId, zone, slots } = body.data;
  if (editionId) {
    await connectDb();
    const registered = await collections(getDb()).registrations.findOne({
      userId: user.id,
      editionId,
    });
    if (!registered) return noStore(errorResponse({ code: "not-found" }, 404));
  }
  const saved = await setAvailability(user.id, editionId, zone, slots);
  if (!saved.ok) return noStore(errorResponse(saved.error, 400));
  return noStore(Response.json({ availability: saved.value }));
};

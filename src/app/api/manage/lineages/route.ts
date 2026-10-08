/**
 * @file src/app/api/manage/lineages/route.ts
 * @desc POST /api/manage/lineages: any signed-in account makes a lineage and owns it, body
 *       `{ slug, name, description, defaults }`. 201 with the lineage, 409 slug-taken, 422
 *       slug-reserved or bad-input; requests from other sites are refused.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { jsonError, noStore, parseJsonBody, userSubject } from "@haruhimemoe/next-kit/server";
import { MODES, SideRulesSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { RATE_LIMITS } from "@/constants/api";
import { errorResponse } from "@/constants/errors";
import { refuseCrossSite } from "@/lib/api";
import { getUserFromHeaders } from "@/lib/auth";
import { refuseOverLimit } from "@/lib/rate-limit";
import { revalidateLists } from "@/lib/revalidate";
import { createLineage } from "@/services/lineages";

const bodySchema = z.strictObject({
  slug: z.string().max(40),
  name: z.string().max(80),
  description: z.string().max(500),
  defaults: z.strictObject({
    mode: z.enum(MODES),
    sides: SideRulesSchema,
    rulesText: z.string().max(20_000),
  }),
});

/**
 * @function POST
 * @param request {Request} the signed-in host's request
 * @returns {Promise<Response>} 201 with the lineage, or 400, 401, 403, 409, 415, 422, 429
 */
export async function POST(request: Request) {
  const crossSite = refuseCrossSite(request);
  if (crossSite) return noStore(crossSite);
  const user = await getUserFromHeaders(request.headers);
  if (!user) return noStore(jsonError(401, "Sign in first."));
  const limited = await refuseOverLimit(RATE_LIMITS.manageWrite, userSubject(user));
  if (limited) return limited;
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return noStore(body.response);
  const result = await createLineage(user.id, body.data);
  if (!result.ok) return noStore(errorResponse(result.error));
  revalidateLists();
  return noStore(Response.json({ lineage: result.value }, { status: 201 }));
}

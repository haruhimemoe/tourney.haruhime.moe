/**
 * @file src/app/api/manage/[lineage]/[edition]/matches/[code]/fill/route.ts
 * @desc A match's mp link read into maps, a score and any problems, for the host to check.
 *       Admins, 20 fills an hour each. Only a preview: the host saves through the result route.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { mpFillGate } from "@/lib/mp-fill";
import { getEdition } from "@/services/editions";
import { previewFill } from "@/services/match-results";

const bodySchema = z.strictObject({
  mpLink: z.string().min(1).max(200),
  warmups: z.number().int().min(0).max(8),
  skip: z.array(z.number().int().positive()).max(64),
  colours: z.strictObject({ a: z.enum(["red", "blue"]) }).optional(),
});

/**
 * @function POST
 * @param request {Request} `{ mpLink, warmups, skip, colours? }`
 * @param context {ManageParams} the lineage, edition and match code
 * @returns {Promise<Response>} 200 with maps, score, winner, problems and sides, or a refusal
 */
export const POST = manageRoute("admin", async ({ user, lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const gate = await mpFillGate(user);
  if (gate instanceof Response) return gate;
  const { mpLink, ...options } = body.data;
  const result = await previewFill(found.edition.id, params.code ?? "", mpLink, options, gate);
  if (!result.ok) return errorResponse(result.error);
  return Response.json(result.value);
});

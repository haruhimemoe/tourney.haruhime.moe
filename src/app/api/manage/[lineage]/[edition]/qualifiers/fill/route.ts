/**
 * @file src/app/api/manage/[lineage]/[edition]/qualifiers/fill/route.ts
 * @desc A qualifier lobby's mp link read into team scores for the host to check. Admins, 20 an
 *       hour each. Only a preview: the host saves through the scores route.
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
import { qualifierPreview } from "@/services/qualifiers";

const bodySchema = z.strictObject({ mpLink: z.string().min(1).max(200) });

/**
 * @function POST
 * @param request {Request} `{ mpLink }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 `{ rows, problems }`, or a refusal
 */
export const POST = manageRoute("admin", async ({ user, lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const gate = await mpFillGate(user);
  if (gate instanceof Response) return gate;
  const result = await qualifierPreview(found.edition.id, body.data.mpLink, gate);
  if (!result.ok) return errorResponse(result.error);
  return Response.json(result.value);
});

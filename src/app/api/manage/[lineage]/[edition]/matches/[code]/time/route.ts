/**
 * @file src/app/api/manage/[lineage]/[edition]/matches/[code]/time/route.ts
 * @desc Setting or clearing a match's time. Admins. Inside the round's window when it has one.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { InstantSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { getEdition } from "@/services/editions";
import { setMatchTime } from "@/services/schedule";

const bodySchema = z.strictObject({ at: InstantSchema.nullable() });

/**
 * @function PUT
 * @param request {Request} `{ at }`: an ISO instant, or null to clear
 * @param context {ManageParams} the lineage, edition and match code
 * @returns {Promise<Response>} 200 `{ match }`, or a refusal
 */
export const PUT = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await setMatchTime(found.edition.id, params.code ?? "", body.data.at);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(found.edition.id);
  return Response.json({ match: result.value });
});

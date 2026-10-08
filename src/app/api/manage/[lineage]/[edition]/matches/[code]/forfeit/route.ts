/**
 * @file src/app/api/manage/[lineage]/[edition]/matches/[code]/forfeit/route.ts
 * @desc A forfeit: the named side advances. Admins.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { SideSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { applyForfeit } from "@/services/brackets";
import { getEdition } from "@/services/editions";

const bodySchema = z.strictObject({ winner: SideSchema });

/**
 * @function POST
 * @param request {Request} `{ winner: "a" | "b" }`
 * @param context {ManageParams} the lineage, edition and match code
 * @returns {Promise<Response>} 200 `{ match, bracket }`, or a refusal
 */
export const POST = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await applyForfeit(found.edition.id, params.code ?? "", body.data.winner);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(found.edition.id);
  return Response.json(result.value);
});

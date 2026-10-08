/**
 * @file src/app/api/manage/[lineage]/[edition]/phase/route.ts
 * @desc POST /api/manage/[lineage]/[edition]/phase: an owner or admin moves the edition to a
 *       later phase, body `{ to }`. Backward moves get the library's bad-state (422).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { PhaseSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { getEdition, moveEditionPhase } from "@/services/editions";

const bodySchema = z.strictObject({ to: PhaseSchema });

/**
 * @function POST
 * @param request {Request} the member's request
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with the edition, or a refusal
 */
export const POST = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await moveEditionPhase(found.edition.id, body.data.to);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(result.value.id);
  return Response.json({ edition: result.value });
});

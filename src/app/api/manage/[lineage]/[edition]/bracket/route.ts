/**
 * @file src/app/api/manage/[lineage]/[edition]/bracket/route.ts
 * @desc Making (or remaking) the main bracket from the seeded teams. Admins. Refused once any
 *       match has a result.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { generateBracket } from "@/services/brackets";
import { getEdition } from "@/services/editions";

/**
 * @function POST
 * @param request {Request} no body
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 201 with `{ bracket }`, or a refusal
 */
export const POST = manageRoute("admin", async ({ lineage, params }) => {
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await generateBracket(found.edition.id);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(found.edition.id);
  return Response.json({ bracket: result.value }, { status: 201 });
});

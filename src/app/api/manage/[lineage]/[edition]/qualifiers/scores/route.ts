/**
 * @file src/app/api/manage/[lineage]/[edition]/qualifiers/scores/route.ts
 * @desc The qualifier score sheet: every team's score per pool slot, saved whole. Admins.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { MAX_QUALIFIER_ROWS, QualifierScoreSchema } from "@/schemas/qualifier-score";
import { getEdition } from "@/services/editions";
import { saveQualifierScores } from "@/services/qualifiers";

const bodySchema = z.strictObject({
  rows: z
    .array(QualifierScoreSchema.pick({ teamId: true, slotKey: true, score: true }).strict())
    .max(MAX_QUALIFIER_ROWS),
});

/**
 * @function PUT
 * @param request {Request} `{ rows: { teamId, slotKey, score }[] }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 `{ saved }`, or a refusal
 */
export const PUT = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await saveQualifierScores(found.edition.id, body.data.rows);
  if (!result.ok) return errorResponse(result.error);
  return Response.json(result.value);
});

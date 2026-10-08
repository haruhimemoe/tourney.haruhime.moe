/**
 * @file src/app/api/manage/[lineage]/[edition]/matches/[code]/result/route.ts
 * @desc A match's result. Admins. PUT saves it (a correction when one is already there, refused
 *       once a later match is played); DELETE undoes it the same way.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { MapResultSchema, MatchSchema, PickBanEntrySchema, SideSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { undoResult } from "@/services/brackets";
import { getEdition } from "@/services/editions";
import { saveResult } from "@/services/match-results";

const wins = z.number().int().min(0).max(13);

const bodySchema = z.strictObject({
  score: z.strictObject({ a: wins, b: wins }).optional(),
  maps: z.array(MapResultSchema).max(64),
  pickBans: z.array(PickBanEntrySchema).max(64),
  first: z
    .strictObject({ protect: SideSchema.optional(), ban: SideSchema, pick: SideSchema })
    .optional(),
  mpLinks: MatchSchema.shape.mpLinks,
  streamUrl: MatchSchema.shape.streamUrl,
  vodUrl: MatchSchema.shape.vodUrl,
});

/**
 * @function PUT
 * @param request {Request} `{ score?, maps, pickBans, first?, mpLinks, streamUrl, vodUrl }`
 * @param context {ManageParams} the lineage, edition and match code
 * @returns {Promise<Response>} 200 `{ match, bracket }`, or a refusal
 */
export const PUT = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await saveResult(found.edition.id, params.code ?? "", body.data);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(found.edition.id);
  return Response.json(result.value);
});

/**
 * @function DELETE
 * @param request {Request} no body
 * @param context {ManageParams} the lineage, edition and match code
 * @returns {Promise<Response>} 200 `{ match, bracket }`, or a refusal (out-of-order names the
 *          match to clear first)
 */
export const DELETE = manageRoute("admin", async ({ lineage, params }) => {
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const result = await undoResult(found.edition.id, params.code ?? "");
  if (!result.ok) {
    return Response.json(
      { error: { code: result.error.code, message: result.error.message } },
      { status: result.error.code === "not-found" ? 404 : 422 },
    );
  }
  revalidateEdition(found.edition.id);
  return Response.json(result.value);
});

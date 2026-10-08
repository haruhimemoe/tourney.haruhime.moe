/**
 * @file src/app/api/manage/[lineage]/[edition]/schedule/suggest/route.ts
 * @desc Scheduling help. Admins. `{ code }` answers suggested times for one match (nothing
 *       saved); `{ round }` fills every untimed match of the round with its best time.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { getEdition } from "@/services/editions";
import { fillRound, suggestFor } from "@/services/schedule";

const code = z.string().min(1).max(16);
const bodySchema = z.union([z.strictObject({ code }), z.strictObject({ round: code })]);

/**
 * @function POST
 * @param request {Request} `{ code }` or `{ round }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 `{ suggestions }` or `{ filled, skipped }`, or a refusal
 */
export const POST = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const id = found.edition.id;
  if ("round" in body.data) {
    const filled = await fillRound(id, body.data.round);
    revalidateEdition(id);
    return Response.json(filled);
  }
  const result = await suggestFor(id, body.data.code);
  if (!result.ok) return errorResponse(result.error);
  return Response.json({
    suggestions: result.value.map((c) => ({
      start: c.start.toISOString(),
      end: c.end.toISOString(),
      readySides: c.readySides,
    })),
  });
});

/**
 * @file src/app/api/manage/[lineage]/[edition]/registrations/review/route.ts
 * @desc Bulk review: up to 200 registrations moved to one status, with an optional note. Admins.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse, errorStatus } from "@/constants/errors";
import { MAX_REVIEW_BATCH } from "@/constants/registration";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { getEdition } from "@/services/editions";
import { review } from "@/services/registrations";

const bodySchema = z.strictObject({
  ids: z.array(z.string().max(24)).min(1).max(MAX_REVIEW_BATCH),
  to: z.enum(["approved", "waitlisted", "rejected", "withdrawn"]),
  note: z.string().trim().max(500).nullable().optional(),
});

/**
 * @function POST
 * @param request {Request} `{ ids, to, note? }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with `{ changed }`, or a refusal (nothing written)
 */
export const POST = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const { ids, to, note } = body.data;
  const result = await review(found.edition, ids, to, note || null);
  if (!result.ok)
    return Response.json({ error: result.error }, { status: errorStatus(result.error.code) });
  revalidateEdition(found.edition.id);
  return Response.json(result.value);
});

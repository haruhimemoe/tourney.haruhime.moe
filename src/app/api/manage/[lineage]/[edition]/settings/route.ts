/**
 * @file src/app/api/manage/[lineage]/[edition]/settings/route.ts
 * @desc Registration settings: the window and caps, the questions (30 at most, ids unique) and
 *       eligibility. Admins. Any subset of the three may be sent.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { EditionSchema, EligibilitySchema } from "@/schemas/edition";
import { getEdition, updateEdition } from "@/services/editions";

const bodySchema = z.strictObject({
  registration: EditionSchema.shape.registration.optional(),
  questions: EditionSchema.shape.questions
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, "Question ids must be unique.")
    .optional(),
  eligibility: EligibilitySchema.optional(),
});

/**
 * @function PATCH
 * @param request {Request} `{ registration?, questions?, eligibility? }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with the edition, or a refusal
 */
export const PATCH = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const patch = Object.fromEntries(Object.entries(body.data).filter(([, v]) => v !== undefined));
  const result = await updateEdition(found.edition.id, patch);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(result.value.id);
  return Response.json({ edition: result.value });
});

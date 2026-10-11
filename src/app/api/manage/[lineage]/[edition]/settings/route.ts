/**
 * @file src/app/api/manage/[lineage]/[edition]/settings/route.ts
 * @desc An edition's settings: registration window/caps, questions (30 at most, ids unique),
 *       eligibility, plus its general fields (name, acronym, dates, rulesText, bannerUrl, hue,
 *       siteMode) and its socials/contact. Admins. Any subset may be sent; a bad field (an
 *       unmatched social host, over MAX_SOCIALS) answers 400 with every zod issue so a form can
 *       point at the field by path.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { parseStrictBody } from "@/lib/api";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { EditionSchema, EligibilitySchema } from "@/schemas/edition";
import { getEdition, updateEdition } from "@/services/editions";

// .removeDefault() first: EditionSchema.shape.X.optional() would fill in the default (null,
// [], ...) for a key the caller left out entirely, so an unrelated field in the same PATCH
// would get overwritten back to its default instead of being left alone.
const bodySchema = z.strictObject({
  name: EditionSchema.shape.name.optional(),
  acronym: EditionSchema.shape.acronym.removeDefault().optional(),
  dates: EditionSchema.shape.dates.optional(),
  rulesText: EditionSchema.shape.rulesText.optional(),
  bannerUrl: EditionSchema.shape.bannerUrl.removeDefault().optional(),
  hue: EditionSchema.shape.hue.removeDefault().optional(),
  siteMode: EditionSchema.shape.siteMode.optional(),
  socials: EditionSchema.shape.socials.removeDefault().optional(),
  contact: EditionSchema.shape.contact.removeDefault().optional(),
  registration: EditionSchema.shape.registration.optional(),
  questions: EditionSchema.shape.questions
    .refine((qs) => new Set(qs.map((q) => q.id)).size === qs.length, "Question ids must be unique.")
    .optional(),
  eligibility: EligibilitySchema.optional(),
});

/**
 * @function PATCH
 * @param request {Request} `{ name?, acronym?, dates?, rulesText?, bannerUrl?, hue?, siteMode?,
 *        socials?, contact?, registration?, questions?, eligibility? }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with the edition, or a refusal
 */
export const PATCH = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseStrictBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const patch = Object.fromEntries(Object.entries(body.data).filter(([, v]) => v !== undefined));
  const result = await updateEdition(found.edition.id, patch);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(result.value.id);
  return Response.json({ edition: result.value });
});

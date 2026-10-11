/**
 * @file src/app/api/manage/[lineage]/defaults/route.ts
 * @desc A lineage's edition defaults: socials, contact and hue, the values a new edition starts
 *       from. Admins. Any subset may be sent; the other default keys (mode, sides, rulesText)
 *       are left untouched, and an edition that already exists keeps its own values, since
 *       defaults only seed an edition at creation.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { parseStrictBody } from "@/lib/api";
import { manageRoute } from "@/lib/manage-route";
import { LineageSchema } from "@/schemas/lineage";
import { updateLineageDefaults } from "@/services/lineages";

// .removeDefault() first: plain .optional() on a defaulted field fills in the default for a
// key the caller left out, which would overwrite that field back to empty on every PATCH that
// doesn't mention it.
const bodySchema = z.strictObject({
  socials: LineageSchema.shape.defaults.shape.socials.removeDefault().optional(),
  contact: LineageSchema.shape.defaults.shape.contact.removeDefault().optional(),
  hue: LineageSchema.shape.defaults.shape.hue.removeDefault().optional(),
});

/**
 * @function PATCH
 * @param request {Request} `{ socials?, contact?, hue? }`
 * @param context {ManageParams} the lineage slug
 * @returns {Promise<Response>} 200 with the lineage, or a refusal
 */
export const PATCH = manageRoute("admin", async ({ lineage }, request) => {
  const body = await parseStrictBody(request, bodySchema);
  if (!body.ok) return body.response;
  const patch = Object.fromEntries(Object.entries(body.data).filter(([, v]) => v !== undefined));
  const result = await updateLineageDefaults(lineage.id, patch);
  if (!result.ok) return errorResponse(result.error);
  return Response.json({ lineage: result.value });
});

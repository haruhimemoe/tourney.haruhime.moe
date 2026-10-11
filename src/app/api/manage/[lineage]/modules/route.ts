/**
 * @file src/app/api/manage/[lineage]/modules/route.ts
 * @desc PUT /api/manage/[lineage]/modules: turn one opt-in module on or off for the lineage,
 *       body `{ id, enabled }`. Enabling an id the registry doesn't know (removed, renamed, a
 *       typo) is refused 400 before anything is saved, as is enabling past the 32-module cap.
 *       Disabling never checks the registry: an id that's stale or was never real still
 *       `$pull`s cleanly, since clearing it out is the only sane answer either way. Admins and
 *       the owner.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { parseStrictBody } from "@/lib/api";
import { manageRoute } from "@/lib/manage-route";
import { revalidateLists } from "@/lib/revalidate";
import { findModule } from "@/modules/registry";
import { setLineageModule } from "@/services/lineage-modules";

const bodySchema = z.strictObject({ id: z.string().min(1), enabled: z.boolean() });

/**
 * @function PUT
 * @param request {Request} `{ id, enabled }`
 * @param context {ManageParams} the lineage slug
 * @returns {Promise<Response>} 200 with the lineage, or a 400/401/403 refusal
 */
export const PUT = manageRoute("admin", async ({ lineage }, request) => {
  const body = await parseStrictBody(request, bodySchema);
  if (!body.ok) return body.response;
  const { id, enabled } = body.data;
  if (enabled && !findModule(id)) return errorResponse({ code: "bad-input" }, 400);
  const result = await setLineageModule(lineage.id, id, enabled);
  if (!result.ok) return errorResponse(result.error, 400);
  revalidateLists();
  return Response.json({ lineage: result.value });
});

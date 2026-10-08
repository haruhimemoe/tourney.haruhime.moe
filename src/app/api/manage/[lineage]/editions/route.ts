/**
 * @file src/app/api/manage/[lineage]/editions/route.ts
 * @desc POST /api/manage/[lineage]/editions: an owner or admin makes an edition, body
 *       `{ name, code, mode, sides, year, dates }`. 201 with the edition; 409 edition-limit (the
 *       lineage owner's limit) or slug-taken; 422 bad-input.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { InstantSchema, MODES, SideRulesSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateLists } from "@/lib/revalidate";
import { createEdition } from "@/services/editions";

const bodySchema = z.strictObject({
  name: z.string().max(128),
  code: z.string().max(16),
  mode: z.enum(MODES),
  sides: SideRulesSchema,
  year: z.number().int(),
  dates: z.strictObject({ start: InstantSchema.nullable(), end: InstantSchema.nullable() }),
});

/**
 * @function POST
 * @param request {Request} the member's request
 * @param context {ManageParams} the lineage slug
 * @returns {Promise<Response>} 201 with the edition, or a refusal
 */
export const POST = manageRoute("admin", async ({ user, lineage }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const result = await createEdition(user.id, lineage.id, body.data);
  if (!result.ok) return errorResponse(result.error);
  revalidateLists();
  return Response.json({ edition: result.value }, { status: 201 });
});

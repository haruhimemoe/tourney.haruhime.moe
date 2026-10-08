/**
 * @file src/app/api/manage/[lineage]/[edition]/rounds/route.ts
 * @desc The bracket config and the rounds built from it. Admins. A new config (or a change to
 *       qualifiers) is saved and the rounds resynced; then each round edit is applied in order,
 *       stopping at the first refusal.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { BracketConfigSchema, EditionSchema } from "@/schemas/edition";
import { StoredRoundSchema } from "@/schemas/round";
import { getEdition, updateEdition } from "@/services/editions";
import { listRounds, syncRounds, updateRound } from "@/services/rounds";

const patchSchema = StoredRoundSchema.pick({
  name: true,
  bestOf: true,
  poolId: true,
  poolRevealed: true,
  starRange: true,
  window: true,
}).partial();

const bodySchema = z.strictObject({
  bracket: BracketConfigSchema.optional(),
  qualifiers: EditionSchema.shape.qualifiers.optional(),
  rounds: z
    .array(z.strictObject({ code: z.string().min(1).max(16), patch: patchSchema }))
    .max(64)
    .optional(),
});

/**
 * @function PUT
 * @param request {Request} `{ bracket?, qualifiers?, rounds?: { code, patch }[] }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with `{ rounds }`, or a refusal
 */
export const PUT = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  let edition = found.edition;
  const { bracket, qualifiers, rounds = [] } = body.data;
  if (bracket || qualifiers) {
    const saved = await updateEdition(edition.id, {
      ...(bracket ? { bracket } : {}),
      ...(qualifiers ? { qualifiers } : {}),
    });
    if (!saved.ok) return errorResponse(saved.error);
    edition = saved.value;
    const synced = await syncRounds(edition);
    if (!synced.ok) return errorResponse(synced.error);
  }
  for (const { code, patch } of rounds) {
    const result = await updateRound(edition.id, code, patch);
    if (!result.ok) return errorResponse(result.error);
  }
  revalidateEdition(edition.id);
  return Response.json({ rounds: await listRounds(edition.id) });
});

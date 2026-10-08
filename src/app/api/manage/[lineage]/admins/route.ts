/**
 * @file src/app/api/manage/[lineage]/admins/route.ts
 * @desc PATCH /api/manage/[lineage]/admins: the owner adds or removes an admin by osu! id,
 *       body `{ add?: osuId, remove?: osuId }` (exactly one). The osu! id must belong to a
 *       haruhime account (they've signed in once); otherwise not-found.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { OsuIdSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { getIdentityDb } from "@/lib/db";
import { manageRoute } from "@/lib/manage-route";
import { addAdmin, removeAdmin } from "@/services/lineages";

const bodySchema = z.union([
  z.strictObject({ add: OsuIdSchema }),
  z.strictObject({ remove: OsuIdSchema }),
]);

/**
 * @function userIdOf
 * @param osuId {number} an osu! id
 * @returns {Promise<string | null>} their haruhime account id, or null
 */
const userIdOf = async (osuId: number): Promise<string | null> => {
  const user = await getIdentityDb()
    .collection("user")
    .findOne({ osuId }, { projection: { _id: 1 } });
  return user ? String(user._id) : null;
};

/**
 * @function PATCH
 * @param request {Request} the owner's request
 * @param context {ManageParams} the lineage slug
 * @returns {Promise<Response>} 200 with the lineage, 400, 401, 403, 404 or 422
 */
export const PATCH = manageRoute("owner", async ({ lineage }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const osuId = "add" in body.data ? body.data.add : body.data.remove;
  const userId = await userIdOf(osuId);
  if (!userId) return errorResponse({ code: "not-found" }, 404);
  const result =
    "add" in body.data ? await addAdmin(lineage.id, userId) : await removeAdmin(lineage.id, userId);
  if (!result.ok) return errorResponse(result.error);
  return Response.json({ lineage: result.value });
});

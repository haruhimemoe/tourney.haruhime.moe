/**
 * @file src/app/api/manage/[lineage]/[edition]/seeds/route.ts
 * @desc Seeding the edition's active teams: from qualifier scores, at random from a seed number,
 *       or by hand. Admins.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { parseJsonBody } from "@haruhimemoe/next-kit/server";
import { IdSchema } from "@haruhimemoe/tourney";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { manageRoute } from "@/lib/manage-route";
import { revalidateEdition } from "@/lib/revalidate";
import { getEdition } from "@/services/editions";
import { randomSeeds, seedFromQualifiers } from "@/services/qualifiers";
import { setSeeds } from "@/services/teams";

const bodySchema = z.discriminatedUnion("method", [
  z.strictObject({ method: z.literal("qualifiers") }),
  z.strictObject({
    method: z.literal("random"),
    seed: z
      .number()
      .int()
      .min(0)
      .max(2 ** 31),
  }),
  z.strictObject({
    method: z.literal("manual"),
    seeds: z
      .array(z.strictObject({ teamId: IdSchema, seed: z.number().int().min(1).max(256) }))
      .min(1)
      .max(256),
  }),
]);

/**
 * @function PUT
 * @param request {Request} `{ method: "qualifiers" } | { method: "random", seed } |
 *        { method: "manual", seeds }`
 * @param context {ManageParams} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with what was saved, or a refusal
 */
export const PUT = manageRoute("admin", async ({ lineage, params }, request) => {
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return body.response;
  const found = await getEdition(lineage.slug, params.edition ?? "");
  if (!found) return errorResponse({ code: "not-found" });
  const id = found.edition.id;
  const input = body.data;
  const result =
    input.method === "qualifiers"
      ? await seedFromQualifiers(id)
      : input.method === "random"
        ? await randomSeeds(id, input.seed)
        : await setSeeds(id, input.seeds);
  if (!result.ok) return errorResponse(result.error);
  revalidateEdition(id);
  return Response.json({ result: result.value });
});

/**
 * @file src/app/api/internal/account/[op]/route.ts
 * @desc POST /api/internal/account/export and /delete: the haruhime.moe hub's account fan-out
 *       (@haruhimemoe/next-kit/account). Bearer ACCOUNT_FANOUT_SECRET; 503 while it's unset, 401
 *       without it, body { userId }. Export answers 200 with this app's data for that user
 *       (next-kit's handler). Delete is handled here so it can refuse: 409 with
 *       owns-active-edition while the user owns a lineage with a running edition, else 204 (safe
 *       to repeat). Any other op is 404. Nothing is cached.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import {
  createAccountHandlers,
  USER_ID_PATTERN,
  usableSecret,
} from "@haruhimemoe/next-kit/account";
import {
  jsonError,
  noStore,
  parseJsonBody,
  refuseWithoutBearer,
} from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { errorResponse } from "@/constants/errors";
import { getAccountFanoutSecret } from "@/env";
import { deleteUser, exportUser } from "@/services/account-data";

const handlers = createAccountHandlers({
  secret: getAccountFanoutSecret,
  export: exportUser,
  delete: async () => {},
});

const bodySchema = z.strictObject({ userId: z.string().regex(USER_ID_PATTERN) });

/**
 * @function deleteAccount
 * @param request {Request} the hub's delete call
 * @returns {Promise<Response>} 204, 409 owns-active-edition, or the guard's 400, 401, 503
 */
const deleteAccount = async (request: Request): Promise<Response> => {
  const refused = await refuseWithoutBearer(request, {
    secret: () => usableSecret(getAccountFanoutSecret()),
    label: "account",
    notConfigured: "Account fan-out isn't set up on this server.",
    noStore: true,
  });
  if (refused) return refused;
  const body = await parseJsonBody(request, bodySchema);
  if (!body.ok) return noStore(body.response);
  const result = await deleteUser(body.data.userId);
  if (!result.ok) return noStore(errorResponse(result.error, 409));
  return noStore(new Response(null, { status: 204 }));
};

/**
 * @function POST
 * @param request {Request} the hub's call
 * @param context {{ params }} the route segment (export or delete)
 * @returns {Promise<Response>} 200, 204, 400, 401, 404, 409, 500, 503
 */
export async function POST(request: Request, { params }: { params: Promise<{ op: string }> }) {
  const { op } = await params;
  if (op === "export") return handlers.export(request);
  if (op === "delete") return deleteAccount(request);
  return noStore(jsonError(404, "Not found."));
}

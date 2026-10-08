/**
 * @file src/lib/manage-route.ts
 * @desc manageRoute wraps every /api/manage/[lineage]/... handler: requests from other sites
 *       are refused, then the member check (requireMember), then the per-user write limit; the
 *       handler only runs for a member with the role. Answers are never cached.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { noStore, userSubject } from "@haruhimemoe/next-kit/server";
import { RATE_LIMITS } from "@/constants/api";
import { type MemberContext, requireMember } from "@/lib/access";
import { refuseCrossSite } from "@/lib/api";
import { refuseOverLimit } from "@/lib/rate-limit";
import type { LineageRole } from "@/schemas/lineage";

/** A manage route's context: the lineage slug plus any other segments. */
export type ManageParams = { params: Promise<{ lineage: string } & Record<string, string>> };

/** What a guarded handler gets: the member, the request and every URL segment. */
export type ManageHandler = (
  ctx: MemberContext & { params: Record<string, string> },
  request: Request,
) => Promise<Response>;

/**
 * @function manageRoute
 * @param need {LineageRole} the role every call needs
 * @param handler {ManageHandler} the work, run only for a member with the role
 * @returns {(request: Request, context: ManageParams) => Promise<Response>} a Next route handler
 */
export const manageRoute =
  (need: LineageRole, handler: ManageHandler) =>
  async (request: Request, context: ManageParams): Promise<Response> => {
    const crossSite = refuseCrossSite(request);
    if (crossSite) return noStore(crossSite);
    const params = await context.params;
    const member = await requireMember(request.headers, params.lineage, need);
    if (member instanceof Response) return noStore(member);
    const limited = await refuseOverLimit(RATE_LIMITS.manageWrite, userSubject(member.user));
    if (limited) return limited;
    return noStore(await handler({ ...member, params }, request));
  };

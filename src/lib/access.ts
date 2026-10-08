/**
 * @file src/lib/access.ts
 * @desc Who may change a lineage: requireMember reads the session and the lineage and answers
 *       401 signed out, 404 for an unknown lineage, 403 for anyone without the role (an owner
 *       has every admin right).
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import "server-only";
import { errorResponse } from "@/constants/errors";
import { getUserFromHeaders } from "@/lib/auth";
import type { Lineage, LineageRole } from "@/schemas/lineage";
import type { SessionUser } from "@/schemas/session-user";
import { getLineageBySlug, memberRole } from "@/services/lineages";

/** A member allowed through: who they are, the lineage and their role on it. */
export type MemberContext = { user: SessionUser; lineage: Lineage; role: LineageRole };

/**
 * @function hasRole
 * @param role {LineageRole | null} what the account holds
 * @param need {LineageRole} what the action needs
 * @returns {boolean} true when the role covers it (owner covers admin)
 */
export const hasRole = (role: LineageRole | null, need: LineageRole): boolean =>
  role === "owner" || (role !== null && role === need);

/**
 * @function requireMember
 * @param headers {Headers} the request's headers (the hub's session cookie)
 * @param lineageSlug {string} the lineage in the URL
 * @param need {LineageRole} the role the action needs
 * @returns {Promise<MemberContext | Response>} the member, or the 401, 404 or 403 to send
 */
export const requireMember = async (
  headers: Headers,
  lineageSlug: string,
  need: LineageRole,
): Promise<MemberContext | Response> => {
  const user = await getUserFromHeaders(headers);
  if (!user)
    return Response.json(
      { error: { code: "signed-out", message: "Sign in first." } },
      { status: 401 },
    );
  const lineage = await getLineageBySlug(lineageSlug);
  if (!lineage) return errorResponse({ code: "not-found" }, 404);
  const role = memberRole(lineage, user.id);
  if (!role || !hasRole(role, need)) return errorResponse({ code: "forbidden" }, 403);
  return { user, lineage, role };
};

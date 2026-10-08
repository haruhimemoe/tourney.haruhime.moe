/**
 * @file src/app/api/editions/[lineage]/[edition]/registration/route.ts
 * @desc A player's own registration: POST registers, PATCH changes the answers, DELETE
 *       withdraws. Signed in. Cross-site writes are refused first; a submit then counts against
 *       the IP (10 an hour, before sign-in is checked) and the account (5 an hour). Edits and
 *       withdrawals count as ordinary writes. Refusals carry the form's extras: the existing
 *       registration, field errors, eligibility reasons.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import {
  clientIp,
  noStore,
  parseJsonBody,
  rateLimitSubject,
  userSubject,
} from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { RATE_LIMITS } from "@/constants/api";
import { errorResponse, errorStatus } from "@/constants/errors";
import { refuseCrossSite } from "@/lib/api";
import { getUserFromHeaders } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { osuBudget } from "@/lib/osu";
import { refuseOverLimit } from "@/lib/rate-limit";
import { revalidateEdition } from "@/lib/revalidate";
import type { Edition } from "@/schemas/edition";
import type { SessionUser } from "@/schemas/session-user";
import { getEdition } from "@/services/editions";
import {
  type RegistrationError,
  register,
  updateAnswers,
  withdraw,
} from "@/services/registrations";

type Context = { params: Promise<{ lineage: string; edition: string }> };

const answersSchema = z.record(z.string().max(32), z.unknown());

const postSchema = z.strictObject({
  answers: answersSchema,
  team: z
    .strictObject({
      name: z.string().max(64),
      tag: z.string().max(16).nullable(),
      members: z.array(z.number().int().positive()).max(32),
    })
    .nullable()
    .optional(),
});

const patchSchema = z.strictObject({ answers: answersSchema });

/** A refusal with the form's extras. */
const refusal = (error: RegistrationError): Response =>
  Response.json({ error }, { status: errorStatus(error.code) });

/** The guards every method shares; a submit also counts against the IP and account limits. */
const guard = async (
  request: Request,
  context: Context,
  submit: boolean,
): Promise<{ user: SessionUser; edition: Edition } | Response> => {
  const crossSite = refuseCrossSite(request);
  if (crossSite) return crossSite;
  if (submit) {
    const ip = rateLimitSubject(clientIp(request.headers));
    const limited = await refuseOverLimit(RATE_LIMITS.registerIp, ip);
    if (limited) return limited;
  }
  const user = await getUserFromHeaders(request.headers);
  if (!user) {
    return Response.json(
      { error: { code: "signed-out", message: "Sign in first." } },
      { status: 401 },
    );
  }
  const limited = await refuseOverLimit(
    submit ? RATE_LIMITS.registerUser : RATE_LIMITS.manageWrite,
    userSubject(user),
  );
  if (limited) return limited;
  const { lineage, edition } = await context.params;
  const found = await getEdition(lineage, edition);
  if (!found) return errorResponse({ code: "not-found" });
  return { user, edition: found.edition };
};

/**
 * @function POST
 * @param request {Request} `{ answers, team? }`
 * @param context {Context} the lineage and edition slugs
 * @returns {Promise<Response>} 201 with the registration, or a refusal
 */
export const POST = async (request: Request, context: Context): Promise<Response> => {
  const ctx = await guard(request, context, true);
  if (ctx instanceof Response) return noStore(ctx);
  const body = await parseJsonBody(request, postSchema);
  if (!body.ok) return noStore(body.response);
  const gate = osuBudget(getDb()).gate(userSubject(ctx.user));
  const result = await register(ctx.user, ctx.edition, body.data, new Date(), gate);
  if (!result.ok) return noStore(refusal(result.error));
  revalidateEdition(ctx.edition.id);
  return noStore(Response.json({ registration: result.value }, { status: 201 }));
};

/**
 * @function PATCH
 * @param request {Request} `{ answers }`
 * @param context {Context} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with the registration, or a refusal
 */
export const PATCH = async (request: Request, context: Context): Promise<Response> => {
  const ctx = await guard(request, context, false);
  if (ctx instanceof Response) return noStore(ctx);
  const body = await parseJsonBody(request, patchSchema);
  if (!body.ok) return noStore(body.response);
  const result = await updateAnswers(ctx.user.id, ctx.edition, body.data.answers);
  if (!result.ok) return noStore(refusal(result.error));
  return noStore(Response.json({ registration: result.value }));
};

/**
 * @function DELETE
 * @param request {Request} the player's request
 * @param context {Context} the lineage and edition slugs
 * @returns {Promise<Response>} 200 with the withdrawn registration, or a refusal
 */
export const DELETE = async (request: Request, context: Context): Promise<Response> => {
  const ctx = await guard(request, context, false);
  if (ctx instanceof Response) return noStore(ctx);
  const result = await withdraw(ctx.user.id, ctx.edition);
  if (!result.ok) return noStore(refusal(result.error));
  revalidateEdition(ctx.edition.id);
  return noStore(Response.json({ registration: result.value }));
};

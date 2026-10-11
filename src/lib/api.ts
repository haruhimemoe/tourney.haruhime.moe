/**
 * @file src/lib/api.ts
 * @desc tourney's wiring for @haruhimemoe/next-kit/server's route helpers: the same-origin
 *       guard every cookie-authenticated write runs, bound to the site's URL and name, and
 *       parseStrictBody, which answers a 400 with every zod issue (path included) instead of
 *       just the first, for a body a form needs to point at field by field. Other routes import
 *       jsonError, noStore and parseJsonBody from @haruhimemoe/next-kit/server directly.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import {
  crossSiteMessage,
  parseJsonBody,
  refuseCrossSite as refuseForeign,
} from "@haruhimemoe/next-kit/server";
import { z } from "zod";
import { SITE } from "@/constants/site";

/** The 403 message refuseCrossSite sends. */
export const CROSS_SITE_REFUSED = crossSiteMessage(SITE.title);

/**
 * @function refuseCrossSite
 * @param request {Request} a cookie-authenticated write
 * @returns {Response | null} 403 when Origin is present and isn't this request's own origin or
 *          the site's, or when Sec-Fetch-Site says cross-site or same-site; otherwise null
 */
export const refuseCrossSite = (request: Request): Response | null =>
  refuseForeign(request, { siteUrl: SITE.url, siteTitle: SITE.title });

/** What parseStrictBody gives back: the parsed data, or an error answer ready to send. */
export type StrictBody<T> = { ok: true; data: T } | { ok: false; response: Response };

/**
 * @function parseStrictBody
 * @param request {Request} incoming request
 * @param schema {z.ZodType} what the body must be
 * @returns {Promise<StrictBody<z.output<T>>>} parsed data, or parseJsonBody's 415/413/malformed
 *          400 for the envelope, or (the body is JSON but fails `schema`) a 400
 *          `{ error, issues }` carrying every zod issue, path included, not just the first
 */
export const parseStrictBody = async <T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<StrictBody<z.output<T>>> => {
  const loose = await parseJsonBody(request, z.record(z.string(), z.unknown()));
  if (!loose.ok) return loose;
  const parsed = schema.safeParse(loose.data);
  if (parsed.success) return { ok: true, data: parsed.data };
  const issues = parsed.error.issues;
  return {
    ok: false,
    response: Response.json(
      {
        error: { code: "bad_request", message: issues[0]?.message ?? "That request isn't valid." },
        issues,
      },
      { status: 400 },
    ),
  };
};

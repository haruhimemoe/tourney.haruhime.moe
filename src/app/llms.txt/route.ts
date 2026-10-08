/**
 * @file src/app/llms.txt/route.ts
 * @desc GET /llms.txt: a short map of the site for AI assistants (llmstxt.org): notes, the docs
 *       and legal pages, the public tournaments (hidden ones never) and the other haruhime.moe
 *       tools. Rebuilt hourly.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { textResponse } from "@haruhimemoe/next-kit/seo";
import { listPublicEditions } from "@/services/public-view";
import { buildLlmsTxt, LLMS_EDITION_LIMIT } from "@/utils/llms-txt";

/** Rebuilt once an hour. */
export const revalidate = 3600;

/**
 * @function GET
 * @returns {Promise<Response>} the site's llms.txt as plain text
 */
export async function GET() {
  return textResponse(buildLlmsTxt(await listPublicEditions(LLMS_EDITION_LIMIT)), {
    maxAge: 3600,
    sMaxAge: 3600,
  });
}

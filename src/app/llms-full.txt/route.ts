/**
 * @file src/app/llms-full.txt/route.ts
 * @desc GET /llms-full.txt: one Markdown file for AI assistants, from next-kit's contentLlmsFull:
 *       the llms.txt notes, every docs and legal page from the content registry, then the public
 *       tournaments and the other haruhime.moe tools. Built on request, cached an hour by the CDN.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { contentLlmsFull } from "@haruhimemoe/next-kit/docs";
import { readContentMarkdown } from "@haruhimemoe/next-kit/docs/files";
import { textResponse } from "@haruhimemoe/next-kit/seo";
import { CONTENT } from "@/constants/content";
import { SEO_SITE } from "@/constants/seo";
import { SITE } from "@/constants/site";
import { listPublicEditions } from "@/services/public-view";
import { CONTENT_MARKDOWN, LEGAL_CONTENT_MARKDOWN } from "@/utils/content-markdown";
import { LLMS_EDITION_LIMIT, LLMS_NOTES, llmsListsMarkdown } from "@/utils/llms-txt";

/** Read from the database on request (the build has none); CDNs cache it for an hour. */
export const dynamic = "force-dynamic";

/**
 * @function GET
 * @returns {Promise<Response>} 200 text/markdown: the notes, every content page, then the
 *          public tournaments and tools
 */
export async function GET() {
  const editions = await listPublicEditions(LLMS_EDITION_LIMIT);
  const body = await contentLlmsFull({
    site: SEO_SITE,
    title: `${SITE.title} docs, legal pages and tournaments`,
    summary: SITE.description,
    content: CONTENT,
    read: (s, slug) =>
      readContentMarkdown(
        CONTENT,
        s,
        slug,
        s === "legal" ? LEGAL_CONTENT_MARKDOWN : CONTENT_MARKDOWN,
      ).then((m) => m ?? ""),
    before: [{ title: "About tourney", markdown: LLMS_NOTES.join("\n\n") }],
    after: [
      {
        title: "Tournaments and tools",
        markdown: llmsListsMarkdown(editions),
      },
    ],
  });
  return textResponse(body, { type: "text/markdown", maxAge: 3600, sMaxAge: 3600 });
}

/**
 * @file src/utils/llms-txt.ts
 * @desc /llms.txt (llmstxt.org), adapted from pools': the title and summary, notes a reader
 *       needs first, Docs and Legal from the content registry (each linking its .md mirror),
 *       then the public tournaments and the other haruhime.moe tools. Tournament and lineage
 *       names come from hosts, so their link markdown is escaped. Sections with nothing in them
 *       are left out. Pure.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { contentLlmsTxt } from "@haruhimemoe/next-kit/docs";
import { llmsTxt } from "@haruhimemoe/next-kit/seo";
import { CONTENT } from "@/constants/content";
import { SEO_SITE } from "@/constants/seo";
import { SITE } from "@/constants/site";
import type { Edition } from "@/schemas/edition";

/** One link in llms.txt, with a short note. */
export type LlmsLink = { title: string; url: string; note?: string };

/** A public edition as llms.txt lists it. */
export type LlmsEdition = Pick<Edition, "name" | "slug" | "phase" | "mode"> & {
  lineageSlug: string;
  lineageName: string;
};

/** How many tournaments /llms.txt lists, newest first. */
export const LLMS_EDITION_LIMIT = 100;

/** What a reader should know before the links. */
export const LLMS_NOTES: readonly string[] = [
  "tourney hosts osu! tournaments: registration with the host's questions and rank or country limits, teams, qualifiers, single and double elimination brackets, groups and swiss, a schedule across time zones, and results read from osu! multiplayer links.",
  "Each tournament series is a lineage (like /egc) and each year of it an edition (like /egc/egc2026), with tabs for the overview, bracket, schedule, teams, pools and results. Match pages are at /<lineage>/<edition>/m/<code>.",
  "Mappools live on pools.haruhime.moe; tourney links a round's pool only once the host reveals it. tourney never hosts beatmap files.",
];

/** The other haruhime.moe tools. */
export const LLMS_TOOLS: readonly LlmsLink[] = [
  {
    title: "pools.haruhime.moe",
    url: "https://pools.haruhime.moe/llms.txt",
    note: "osu! tournament mappools: past pools from tournaments and building new ones",
  },
  {
    title: "packs.haruhime.moe",
    url: "https://packs.haruhime.moe/llms.txt",
    note: "osu! beatmap packs: turn a mappool into one download",
  },
  {
    title: "bb.haruhime.moe",
    url: "https://bb.haruhime.moe/llms.txt",
    note: "osu! BBCode editor with templates, a tournament forum post among them",
  },
  {
    title: "haruhime.moe",
    url: "https://www.haruhime.moe/llms.txt",
    note: "the account every haruhime tool shares, and the list of tools",
  },
];

const LINK_MARKDOWN = /[\\[\]()<>]/g;

/**
 * @function escapeLinkText
 * @param text {string} text from a host
 * @returns {string} one line with backslashes, brackets, parentheses and angle brackets
 *          escaped, so it can't add a link or break the one before it
 */
export const escapeLinkText = (text: string): string =>
  text
    .replace(/\s+/g, " ")
    .trim()
    .replace(LINK_MARKDOWN, (mark) => `\\${mark}`);

/**
 * @function llmsListsMarkdown
 * @param editions {readonly LlmsEdition[]} public editions, newest first
 * @returns {string} the Tournaments (when there are any) and tools sections in llms.txt form
 */
export const llmsListsMarkdown = (editions: readonly LlmsEdition[]): string => {
  const sections = [
    {
      heading: "Tournaments",
      links: editions.slice(0, LLMS_EDITION_LIMIT).map((e) => ({
        title: e.name,
        url: `${SITE.url}/${e.lineageSlug}/${e.slug}`,
        note: escapeLinkText(`${e.lineageName}, osu! ${e.mode}, ${e.phase}`),
      })),
    },
    { heading: "haruhime.moe tools", links: LLMS_TOOLS },
  ];
  return llmsTxt({ title: "-", summary: "-", sections }).split("\n").slice(3).join("\n");
};

/**
 * @function buildLlmsTxt
 * @param editions {readonly LlmsEdition[]} public editions, newest first
 * @returns {string} the llms.txt body, ending in one newline
 */
export const buildLlmsTxt = (editions: readonly LlmsEdition[]): string => {
  const head = contentLlmsTxt({
    site: SEO_SITE,
    title: SITE.title,
    summary: SITE.description,
    notes: LLMS_NOTES,
    content: CONTENT,
  }).replace(/\n$/, "");
  return `${head}\n${llmsListsMarkdown(editions)}`;
};

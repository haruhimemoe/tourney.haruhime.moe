/**
 * @file src/utils/edition-meta.ts
 * @desc Page titles and descriptions for the public edition pages, in the shape
 *       @haruhimemoe/next-kit/seo's pageMetadata takes: the edition name on the overview, the tab
 *       first elsewhere, a description of at most 160 characters.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import type { Edition } from "@/schemas/edition";

const PHASE_TEXT: Record<Edition["phase"], string> = {
  setup: "Being set up",
  registration: "Registration is open",
  qualifiers: "Qualifiers are on",
  draft: "Teams are being drafted",
  bracket: "The bracket is being played",
  done: "Finished",
};

const MAX_DESCRIPTION = 160;

/**
 * @function editionMeta
 * @param lineageSlug {string} the lineage in the URL
 * @param editionSlug {string} the edition in the URL
 * @param edition {Pick<Edition, "name" | "mode" | "phase">} the edition
 * @param lineageName {string} who runs it
 * @param tab {string} the tab's name; omit on the overview
 * @returns {{ path: string; title: string; description: string }} pageMetadata's options
 */
export const editionMeta = (
  lineageSlug: string,
  editionSlug: string,
  edition: Pick<Edition, "name" | "mode" | "phase">,
  lineageName: string,
  tab?: string,
): { path: string; title: string; description: string } => {
  const path = `/${lineageSlug}/${editionSlug}${tab ? `/${tab.toLowerCase()}` : ""}`;
  const full = `${edition.name}, an osu! ${edition.mode} tournament run by ${lineageName}. ${PHASE_TEXT[edition.phase]}.`;
  const description =
    full.length <= MAX_DESCRIPTION ? full : `${full.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…`;
  return { path, title: tab ? `${tab} · ${edition.name}` : edition.name, description };
};

/**
 * @file src/app/[lineage]/[edition]/bracket/page.tsx
 * @desc The main bracket, each match linking to its page.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { BracketView } from "@haruhimemoe/ui";
import { getTranslations } from "next-intl/server";
import { requirePublic } from "@/lib/public-page";
import { teamNames } from "@/utils/public-match";
import { type EditionParams, tabMetadata } from "../meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata("Bracket");

/**
 * @function BracketPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the bracket, or a line saying it isn't made yet
 */
export default async function BracketPage({ params }: EditionParams) {
  const t = await getTranslations("tourney.pages.lineageEditionBracket");
  const { lineage, edition } = await params;
  const { bracket, teams } = await requirePublic(lineage, edition);
  if (!bracket) return <p className="text-c3">{t("theBracketIsnT")}</p>;
  const base = `/${lineage}/${edition}`;
  return (
    <BracketView bracket={bracket} names={teamNames(teams)} href={(code) => `${base}/m/${code}`} />
  );
}

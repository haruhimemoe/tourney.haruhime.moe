/**
 * @file src/app/[lineage]/[edition]/m/[code]/page.tsx
 * @desc One match for the public. An unknown code, a bye or a cancelled match answers 404.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { SectionHeading } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MatchDetail } from "@/components/edition/MatchDetail";
import { SEO_SITE } from "@/constants/seo";
import { requirePublic } from "@/lib/public-page";
import { findPublicMatch, teamNames } from "@/utils/public-match";

type Props = { params: Promise<{ lineage: string; edition: string; code: string }> };

/**
 * @function load
 * @param props {Props} the slugs and code
 * @returns the page data, the match and its sides' names; 404 when there is no such match
 */
const load = async ({ params }: Props) => {
  const { lineage, edition, code } = await params;
  const page = await requirePublic(lineage, edition);
  const match = findPublicMatch(page, code);
  if (!match) notFound();
  const names = teamNames(page.teams);
  const side = (id: string | null) => (id ? (names[id] ?? "Unknown team") : "TBD");
  return { page, match, names: { a: side(match.a), b: side(match.b) }, lineage, edition, code };
};

/**
 * @function generateMetadata
 * @param props {Props} the slugs and code
 * @returns {Promise<Metadata>} "<code>: A vs B · <edition>"
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { page, names, lineage, edition, code } = await load(props);
  return pageMetadata(SEO_SITE, {
    path: `/${lineage}/${edition}/m/${code}`,
    title: `${code}: ${names.a} vs ${names.b} · ${page.edition.name}`,
    description: `${names.a} vs ${names.b} in ${page.edition.name}: time, score, picks and bans, and links.`,
    index: page.edition.siteMode !== "hidden",
  });
}

/**
 * @function PublicMatchPage
 * @param props {Props} the slugs and code
 * @returns {Promise<JSX.Element>} the match
 */
export default async function PublicMatchPage(props: Props) {
  const { page, match, names, code } = await load(props);
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading>
        {code}: {names.a} vs {names.b}
      </SectionHeading>
      <MatchDetail match={match} names={names} zone={page.zone} />
    </section>
  );
}

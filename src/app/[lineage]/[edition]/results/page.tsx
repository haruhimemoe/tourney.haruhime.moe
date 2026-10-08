/**
 * @file src/app/[lineage]/[edition]/results/page.tsx
 * @desc Final places from the main bracket.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { ResultsTable } from "@/components/edition/ResultsTable";
import { requirePublic } from "@/lib/public-page";
import { teamNames } from "@/utils/public-match";
import { type EditionParams, tabMetadata } from "../meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata("Results");

/**
 * @function ResultsPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the results table
 */
export default async function ResultsPage({ params }: EditionParams) {
  const { lineage, edition } = await params;
  const { results, teams } = await requirePublic(lineage, edition);
  return <ResultsTable results={results} names={teamNames(teams)} />;
}

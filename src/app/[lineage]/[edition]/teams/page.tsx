/**
 * @file src/app/[lineage]/[edition]/teams/page.tsx
 * @desc The edition's teams and their players.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { TeamList } from "@/components/edition/TeamList";
import { requirePublic } from "@/lib/public-page";
import { type EditionParams, tabMetadata } from "../meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata("Teams");

/**
 * @function TeamsPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the team list
 */
export default async function TeamsPage({ params }: EditionParams) {
  const { lineage, edition } = await params;
  const { teams } = await requirePublic(lineage, edition);
  return <TeamList teams={teams} />;
}

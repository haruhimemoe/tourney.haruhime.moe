/**
 * @file src/app/[lineage]/[edition]/pools/page.tsx
 * @desc Each round's pool on pools.haruhime.moe once revealed. Whether the pool itself is public
 *       is set on pools.haruhime.moe.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { PoolLinks } from "@/components/edition/PoolLinks";
import { getPoolsUrl } from "@/env";
import { requirePublic } from "@/lib/public-page";
import { type EditionParams, tabMetadata } from "../meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata("Pools");

/**
 * @function PoolsPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the pool links
 */
export default async function PoolsPage({ params }: EditionParams) {
  const { lineage, edition } = await params;
  const { rounds } = await requirePublic(lineage, edition);
  return (
    <PoolLinks
      poolsUrl={getPoolsUrl()}
      rounds={rounds
        .filter((r) => r.side !== "qualifiers" || r.poolId)
        .map((r) => ({ code: r.code, name: r.name, poolId: r.poolId }))}
    />
  );
}

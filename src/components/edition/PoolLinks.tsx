/**
 * @file src/components/edition/PoolLinks.tsx
 * @desc Each round's pool on pools.haruhime.moe, linked once the host reveals it. Unrevealed
 *       rounds say so; their pool id never reaches this page (public-view leaves it out).
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { TextLink } from "@haruhimemoe/ui";

/** PoolLinks' props: pools' origin and the rounds (poolId null until revealed). */
export type PoolLinksProps = {
  poolsUrl: string;
  rounds: readonly { code: string; name: string; poolId: string | null }[];
};

/**
 * @function PoolLinks
 * @param props {PoolLinksProps} the rounds
 * @returns {JSX.Element} one line per round
 */
export function PoolLinks({ poolsUrl, rounds }: PoolLinksProps) {
  if (!rounds.length) return <p className="text-c3">No rounds yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rounds.map((r) => (
        <li key={r.code} className="flex flex-wrap gap-x-3">
          {r.poolId ? (
            <TextLink href={`${poolsUrl}/pools/${encodeURIComponent(r.poolId)}`}>{r.name}</TextLink>
          ) : (
            <>
              <span>{r.name}</span>
              <span className="text-c3">Not revealed yet</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

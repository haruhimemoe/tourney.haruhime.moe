/**
 * @file src/components/home/SignedOutHome.tsx
 * @desc The home page for a visitor: browse open registrations, or sign in to host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { CardGrid, LinkCard } from "@haruhimemoe/ui";

/**
 * @function SignedOutHome
 * @param props {{ hostHref: string }} sign-in, returning to create an edition
 * @returns {JSX.Element} the two entry points
 */
export function SignedOutHome({ hostHref }: { hostHref: string }) {
  return (
    <CardGrid>
      <LinkCard href="/browse" title="Browse open registrations">
        osu! tournaments taking players now.
      </LinkCard>
      <LinkCard href={hostHref} title="Host a tournament">
        Sign in with your haruhime.moe account, then set up registration, a bracket and a schedule.
      </LinkCard>
    </CardGrid>
  );
}

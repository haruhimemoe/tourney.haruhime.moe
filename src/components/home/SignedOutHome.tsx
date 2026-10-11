/**
 * @file src/components/home/SignedOutHome.tsx
 * @desc The home page for a visitor: browse open registrations, or sign in to host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { CardGrid, LinkCard } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";

/**
 * @function SignedOutHome
 * @param props {{ hostHref: string }} sign-in, returning to create an edition
 * @returns {JSX.Element} the two entry points
 */
export function SignedOutHome({ hostHref }: { hostHref: string }) {
  const t = useTranslations("tourney.signedOutHome");
  return (
    <CardGrid>
      <LinkCard href="/browse" title={t("browseOpenRegistrations")}>
        {t("osuTournamentsTakingPlayers")}
      </LinkCard>
      <LinkCard href={hostHref} title={t("hostATournament")}>
        {t("signInWithYour")}
      </LinkCard>
    </CardGrid>
  );
}

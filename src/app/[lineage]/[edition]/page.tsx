/**
 * @file src/app/[lineage]/[edition]/page.tsx
 * @desc The edition's overview: phase, dates, format, registration, the host's socials, contact
 *       and rules.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { isRegistrationOpen } from "@haruhimemoe/tourney";
import { ButtonLink, SectionHeading, StatList } from "@haruhimemoe/ui";
import { getTranslations } from "next-intl/server";
import { LocalTime } from "@/components/edition/LocalTime";
import { RulesText } from "@/components/edition/RulesText";
import { SocialLinks } from "@/components/edition/SocialLinks";
import { StaffContact } from "@/components/edition/StaffContact";
import { requirePublic } from "@/lib/public-page";
import { type EditionParams, tabMetadata } from "./meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata();

/**
 * @function OverviewPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the overview
 */
export default async function OverviewPage({ params }: EditionParams) {
  const t = await getTranslations("tourney.pages.lineageEdition");
  const tt = await getTranslations("tourney");
  const { lineage, edition } = await params;
  const page = await requirePublic(lineage, edition);
  const { edition: e, zone, hourCycle } = page;
  const at = (iso: string | null) =>
    iso ? <LocalTime at={iso} zone={zone} hourCycle={hourCycle} /> : t("notSet");
  const sides = e.sides.kind === "solo" ? "1v1" : `${e.sides.lineup}v${e.sides.lineup}`;
  return (
    <div className="flex flex-col gap-6">
      <StatList
        variant="grid"
        items={[
          { label: t("phase"), value: tt(`phasePublic.${e.phase}`) },
          { label: t("mode"), value: e.mode },
          {
            label: t("format"),
            value: e.bracket ? t("formatBracket", { sides, format: e.bracket.format }) : sides,
          },
          { label: t("starts"), value: at(e.dates.start) },
          { label: t("ends"), value: at(e.dates.end) },
          { label: t("closes"), value: at(e.registration.closesAt) },
        ]}
      />
      {isRegistrationOpen(e, new Date()) ? (
        <div>
          <ButtonLink href={`/${lineage}/${edition}/register`}>{t("register")}</ButtonLink>
        </div>
      ) : null}
      <SocialLinks socials={e.socials} />
      <StaffContact contact={e.contact} />
      {e.rulesText.trim() ? (
        <section className="flex flex-col gap-2">
          <SectionHeading>{t("rules")}</SectionHeading>
          <RulesText source={e.rulesText} />
        </section>
      ) : null}
    </div>
  );
}

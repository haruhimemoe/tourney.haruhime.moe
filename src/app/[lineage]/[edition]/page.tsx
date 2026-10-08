/**
 * @file src/app/[lineage]/[edition]/page.tsx
 * @desc The edition's overview: phase, dates, format, registration and the host's rules.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { isRegistrationOpen } from "@haruhimemoe/tourney";
import { ButtonLink, SectionHeading, StatList } from "@haruhimemoe/ui";
import { LocalTime } from "@/components/edition/LocalTime";
import { RulesText } from "@/components/edition/RulesText";
import { requirePublic } from "@/lib/public-page";
import { type EditionParams, tabMetadata } from "./meta";

/** The tab's title and description (see meta.ts). */
export const generateMetadata = tabMetadata();

const PHASE = {
  setup: "Setup",
  registration: "Registration",
  qualifiers: "Qualifiers",
  draft: "Draft",
  bracket: "Bracket",
  done: "Finished",
} as const;

/**
 * @function OverviewPage
 * @param props {EditionParams} the slugs
 * @returns {Promise<JSX.Element>} the overview
 */
export default async function OverviewPage({ params }: EditionParams) {
  const { lineage, edition } = await params;
  const page = await requirePublic(lineage, edition);
  const { edition: e, zone } = page;
  const at = (iso: string | null) => (iso ? <LocalTime at={iso} zone={zone} /> : "Not set");
  const sides = e.sides.kind === "solo" ? "1v1" : `${e.sides.lineup}v${e.sides.lineup}`;
  return (
    <div className="flex flex-col gap-6">
      <StatList
        variant="grid"
        items={[
          { label: "Phase", value: PHASE[e.phase] },
          { label: "Mode", value: e.mode },
          {
            label: "Format",
            value: e.bracket ? `${sides}, ${e.bracket.format} elimination` : sides,
          },
          { label: "Starts", value: at(e.dates.start) },
          { label: "Ends", value: at(e.dates.end) },
          { label: "Registration closes", value: at(e.registration.closesAt) },
        ]}
      />
      {isRegistrationOpen(e, new Date()) ? (
        <div>
          <ButtonLink href={`/${lineage}/${edition}/register`}>Register</ButtonLink>
        </div>
      ) : null}
      {e.rulesText.trim() ? (
        <section className="flex flex-col gap-2">
          <SectionHeading>Rules</SectionHeading>
          <RulesText source={e.rulesText} />
        </section>
      ) : null}
    </div>
  );
}

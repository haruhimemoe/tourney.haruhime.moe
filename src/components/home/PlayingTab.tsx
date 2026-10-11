/**
 * @file src/components/home/PlayingTab.tsx
 * @desc Editions the player registered for: registration status, team, the next match in their
 *       time zone with its opponent, the round's pool once revealed, and their availability for
 *       that edition.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { Badge, Card, Disclosure, TextLink } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";
import { LocalTime } from "@/components/edition/LocalTime";
import type { PlayingEntry } from "@/services/dashboard";

/** One edition's saved availability: the zone it was picked in and its slots there. */
export type SavedAvailability = { zone: string; slots: number[] };

/** PlayingTab's props: the entries, the viewer's zone and hour cycle, and saved availability by
 * edition id. */
export type PlayingTabProps = {
  entries: readonly PlayingEntry[];
  zone: string | null;
  hourCycle?: "h12" | "h23" | null | undefined;
  availability: Readonly<Record<string, SavedAvailability>>;
};

/**
 * @function PlayingTab
 * @param props {PlayingTabProps} the entries
 * @returns {JSX.Element} one card per edition
 */
export function PlayingTab({ entries, zone, hourCycle, availability }: PlayingTabProps) {
  const t = useTranslations("tourney.playingTab");
  const tt = useTranslations("tourney");
  return (
    <div className="flex flex-col gap-4">
      {entries.map(({ edition, registration, team, nextMatch, poolUrl }) => {
        const base = `/${edition.lineageSlug}/${edition.slug}`;
        const saved = availability[edition.id];
        return (
          <Card key={edition.id} title={<TextLink href={base}>{edition.name}</TextLink>}>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>
                  {tt.has(`status.${registration.status}`)
                    ? tt(`status.${registration.status}`)
                    : registration.status}
                </Badge>
                {team ? <Badge>{team.name}</Badge> : null}
              </div>
              {nextMatch ? (
                <p>
                  {t.rich("next", {
                    code: nextMatch.code,
                    round: nextMatch.round,
                    opponent: nextMatch.opponent ?? t("tbd"),
                    link: (chunks) => (
                      <TextLink href={`${base}/m/${nextMatch.code}`}>{chunks}</TextLink>
                    ),
                    time: () => <LocalTime at={nextMatch.at} zone={zone} hourCycle={hourCycle} />,
                  })}
                </p>
              ) : (
                <p className="text-c3">{t("noMatchScheduledYet")}</p>
              )}
              {poolUrl ? <TextLink href={poolUrl}>{t("roundPool")}</TextLink> : null}
              {registration.status !== "withdrawn" && registration.status !== "rejected" ? (
                <Disclosure summary={t("yourAvailability")}>
                  <AvailabilityEditor
                    editionId={edition.id}
                    zone={saved?.zone ?? zone}
                    initial={saved?.slots ?? []}
                  />
                </Disclosure>
              ) : null}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

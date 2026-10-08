/**
 * @file src/components/home/PlayingTab.tsx
 * @desc Editions the player registered for: registration status, team, the next match in their
 *       time zone with its opponent, the round's pool once revealed, and their availability for
 *       that edition.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { Badge, Card, Disclosure, TextLink } from "@haruhimemoe/ui";
import { AvailabilityEditor } from "@/components/availability/AvailabilityEditor";
import { LocalTime } from "@/components/edition/LocalTime";
import type { PlayingEntry } from "@/services/dashboard";

/** One edition's saved availability: the zone it was picked in and its slots there. */
export type SavedAvailability = { zone: string; slots: number[] };

/** PlayingTab's props: the entries, the viewer's zone, and saved availability by edition id. */
export type PlayingTabProps = {
  entries: readonly PlayingEntry[];
  zone: string | null;
  availability: Readonly<Record<string, SavedAvailability>>;
};

const STATUS: Record<string, string> = {
  pending: "Waiting for review",
  approved: "Approved",
  waitlisted: "Waitlisted",
  rejected: "Not accepted",
  withdrawn: "Withdrawn",
};

/**
 * @function PlayingTab
 * @param props {PlayingTabProps} the entries
 * @returns {JSX.Element} one card per edition
 */
export function PlayingTab({ entries, zone, availability }: PlayingTabProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map(({ edition, registration, team, nextMatch, poolUrl }) => {
        const base = `/${edition.lineageSlug}/${edition.slug}`;
        const saved = availability[edition.id];
        return (
          <Card key={edition.id} title={<TextLink href={base}>{edition.name}</TextLink>}>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge>{STATUS[registration.status] ?? registration.status}</Badge>
                {team ? <Badge>{team.name}</Badge> : null}
              </div>
              {nextMatch ? (
                <p>
                  Next:{" "}
                  <TextLink href={`${base}/m/${nextMatch.code}`}>
                    {nextMatch.code} ({nextMatch.round})
                  </TextLink>{" "}
                  vs {nextMatch.opponent ?? "TBD"}, <LocalTime at={nextMatch.at} zone={zone} />
                </p>
              ) : (
                <p className="text-c3">No match scheduled yet.</p>
              )}
              {poolUrl ? <TextLink href={poolUrl}>Round pool</TextLink> : null}
              {registration.status !== "withdrawn" && registration.status !== "rejected" ? (
                <Disclosure summary="Your availability">
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

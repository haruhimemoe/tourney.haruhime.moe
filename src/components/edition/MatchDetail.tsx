/**
 * @file src/components/edition/MatchDetail.tsx
 * @desc One match for the public: sides, time, score, the pick/ban order in side names, each
 *       map's winner (warmups and aborts marked), and its mp, stream and VOD links.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { SectionHeading, StatList, TextLink } from "@haruhimemoe/ui";
import type { PublicMatch } from "@/services/public-view";
import { LocalTime } from "./LocalTime";

/** MatchDetail's props: the match, its sides' names and the viewer's zone when known. */
export type MatchDetailProps = {
  match: PublicMatch;
  names: { a: string; b: string };
  zone?: string | null | undefined;
};

const VERB = { protect: "protects", ban: "bans", pick: "picks", tiebreaker: "tiebreaker" } as const;

/**
 * @function slotLabel
 * @param slot {string} a pool slot key, like "b:NM#1"
 * @returns {string} its label, like "NM1"
 */
export const slotLabel = (slot: string): string => slot.replace(/^[a-z]+:/, "").replace("#", "");

/**
 * @function MatchDetail
 * @param props {MatchDetailProps} the match
 * @returns {JSX.Element} the match's details
 */
export function MatchDetail({ match, names, zone }: MatchDetailProps) {
  const side = (s: "a" | "b" | null) => (s ? names[s] : "Tiebreaker");
  const links = [
    ...match.mpLinks.map((href, i) => ({
      href,
      label: match.mpLinks.length > 1 ? `mp ${i + 1}` : "mp link",
    })),
    ...(match.streamUrl ? [{ href: match.streamUrl, label: "Stream" }] : []),
    ...(match.vodUrl ? [{ href: match.vodUrl, label: "VOD" }] : []),
  ];
  return (
    <div className="flex flex-col gap-6">
      <StatList
        items={[
          { label: "Round", value: match.round },
          { label: "Best of", value: match.bestOf },
          {
            label: "Time",
            value: match.scheduledAt ? <LocalTime at={match.scheduledAt} zone={zone} /> : "Not set",
          },
          {
            label: "Score",
            value:
              match.scoreA !== null && match.scoreB !== null
                ? `${match.scoreA} - ${match.scoreB}`
                : "Not played",
          },
        ]}
      />
      {match.pickBans.length ? (
        <section className="flex flex-col gap-2">
          <SectionHeading>Picks and bans</SectionHeading>
          <ol aria-label="Picks and bans" className="list-decimal pl-6">
            {match.pickBans.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the order is the identity
              <li key={i}>
                {e.action === "tiebreaker"
                  ? `Tiebreaker ${slotLabel(e.slot)}`
                  : `${side(e.side)} ${VERB[e.action]} ${slotLabel(e.slot)}`}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {match.maps.length ? (
        <section className="flex flex-col gap-2">
          <SectionHeading>Maps</SectionHeading>
          <ol aria-label="Maps" className="list-decimal pl-6">
            {match.maps.map((m, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: the order is the identity
              <li key={i}>
                {m.warmup
                  ? `${slotLabel(m.slot)} (warmup)`
                  : m.aborted
                    ? `${slotLabel(m.slot)} (aborted)`
                    : `${slotLabel(m.slot)}: ${m.winner ? names[m.winner] : "no winner"}`}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {links.length ? (
        <ul className="flex flex-wrap gap-4">
          {links.map((l) => (
            <li key={l.href}>
              <TextLink href={l.href}>{l.label}</TextLink>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

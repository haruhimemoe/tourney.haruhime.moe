/**
 * @file src/components/edition/TeamList.tsx
 * @desc The edition's teams: name, tag, seed, status and players (osu! profile links named by
 *       the username they registered with, else their id). Withdrawn teams are left out.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { Badge, Card, CardGrid, TextLink } from "@haruhimemoe/ui";
import type { PublicPlayer, PublicTeam } from "@/services/public-view";

/**
 * @function Players
 * @param props {{ players: PublicPlayer[] }} players
 * @returns {JSX.Element} their profile links, comma-separated
 */
function Players({ players }: { players: PublicPlayer[] }) {
  return (
    <>
      {players.map((p, i) => (
        <span key={p.osuId}>
          {i > 0 ? ", " : null}
          <TextLink href={`https://osu.ppy.sh/users/${p.osuId}`} variant="plain">
            {p.username ?? String(p.osuId)}
          </TextLink>
        </span>
      ))}
    </>
  );
}

/**
 * @function TeamList
 * @param props {{ teams: PublicTeam[] }} the teams
 * @returns {JSX.Element} one card per team, by seed then name
 */
export function TeamList({ teams }: { teams: PublicTeam[] }) {
  const shown = teams
    .filter((t) => t.status !== "withdrawn")
    .sort(
      (x, y) =>
        (x.seed ?? Number.POSITIVE_INFINITY) - (y.seed ?? Number.POSITIVE_INFINITY) ||
        x.name.localeCompare(y.name),
    );
  if (!shown.length) return <p className="text-c3">No teams yet.</p>;
  return (
    <CardGrid>
      {shown.map((t) => (
        <Card
          key={t.id}
          title={
            <span className="block truncate" title={t.name}>
              {t.name}
            </span>
          }
        >
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {t.tag ? <Badge>{t.tag}</Badge> : null}
              {t.seed !== null ? <Badge>Seed {t.seed}</Badge> : null}
              {t.status === "eliminated" ? <Badge>Out</Badge> : null}
            </div>
            <p>
              <Players players={t.players} />
            </p>
            {t.subs.length ? (
              <p className="text-c3">
                Subs: <Players players={t.subs} />
              </p>
            ) : null}
          </div>
        </Card>
      ))}
    </CardGrid>
  );
}

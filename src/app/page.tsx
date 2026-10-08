/**
 * @file src/app/page.tsx
 * @desc The home page. Signed in: the personal dashboard, Playing (editions registered for,
 *       next match, pool, availability) and Hosting (lineages run, what needs a host), each tab
 *       only with content. Signed out, or with neither: browse open registrations, or host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Thu Oct 8, 2026
 */

import { PageHeader } from "@haruhimemoe/ui";
import { HomeTabs } from "@/components/home/HomeTabs";
import { HostingTab } from "@/components/home/HostingTab";
import { PlayingTab, type SavedAvailability } from "@/components/home/PlayingTab";
import { SignedOutHome } from "@/components/home/SignedOutHome";
import { getCurrentUser, hubSignInHref } from "@/lib/auth-session";
import { viewerZone } from "@/lib/public-page";
import { getAvailability, localSlots } from "@/services/availability";
import { dashboardFor } from "@/services/dashboard";

/** Per viewer and per request: never prerendered. */
export const dynamic = "force-dynamic";

/**
 * @function HomePage
 * @returns {Promise<JSX.Element>} the dashboard, or the two entry points
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  const hostHref = user ? "/manage/new" : hubSignInHref("/manage/new");
  if (!user)
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="osu! tournaments, run in one place" lead="Register, play, or host." />
        <SignedOutHome hostHref={hostHref} />
      </div>
    );
  const now = new Date();
  const [{ playing, hosting }, zone] = await Promise.all([
    dashboardFor(user.id, now),
    viewerZone(user.id),
  ]);
  const availability: Record<string, SavedAvailability> = {};
  for (const entry of playing) {
    const row = await getAvailability(user.id, entry.edition.id);
    if (row)
      availability[entry.edition.id] = { zone: row.zone, slots: localSlots(row, row.zone, now) };
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Hi, ${user.username}`} />
      {playing.length || hosting.length ? (
        <HomeTabs
          playing={
            playing.length ? (
              <PlayingTab entries={playing} zone={zone} availability={availability} />
            ) : null
          }
          hosting={hosting.length ? <HostingTab entries={hosting} /> : null}
        />
      ) : (
        <SignedOutHome hostHref={hostHref} />
      )}
    </div>
  );
}

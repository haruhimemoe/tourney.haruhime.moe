/**
 * @file src/app/page.tsx
 * @desc The home page. Signed in: the personal dashboard, Playing (editions registered for,
 *       next match, pool, availability) and Hosting (lineages run, what needs a host), each tab
 *       only with content. Signed out, or with neither: browse open registrations, or host.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { PageHeader } from "@haruhimemoe/ui";
import { getTranslations } from "next-intl/server";
import { HomeTabs } from "@/components/home/HomeTabs";
import { HostingTab } from "@/components/home/HostingTab";
import { PlayingTab, type SavedAvailability } from "@/components/home/PlayingTab";
import { SignedOutHome } from "@/components/home/SignedOutHome";
import { TimeHint } from "@/components/layout/TimeHint";
import { getCurrentUser, hubSignInHref } from "@/lib/auth-session";
import { profileTimezone } from "@/lib/public-page";
import { getAvailability, localSlots } from "@/services/availability";
import { dashboardFor } from "@/services/dashboard";

/** Per viewer and per request: never prerendered. */
export const dynamic = "force-dynamic";

/**
 * @function HomePage
 * @returns {Promise<JSX.Element>} the dashboard, or the two entry points
 */
export default async function HomePage() {
  const t = await getTranslations("tourney.pages.home");
  const user = await getCurrentUser();
  const hostHref = user ? "/manage/new" : hubSignInHref("/manage/new");
  if (!user)
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title={t("osuTournamentsRunIn")} lead={t("registerPlayOrHost")} />
        <SignedOutHome hostHref={hostHref} />
      </div>
    );
  const now = new Date();
  const [{ playing, hosting }, fallbackZone] = await Promise.all([
    dashboardFor(user.id, now),
    profileTimezone(user.id),
  ]);
  const zone = user.preferences.timezone ?? fallbackZone;
  const hourCycle = user.preferences.hourCycle;
  const availability: Record<string, SavedAvailability> = {};
  for (const entry of playing) {
    const row = await getAvailability(user.id, entry.edition.id);
    if (row)
      availability[entry.edition.id] = { zone: row.zone, slots: localSlots(row, row.zone, now) };
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("hi", { name: user.username })} />
      <TimeHint zone={zone} hourCycle={hourCycle} />
      {playing.length || hosting.length ? (
        <HomeTabs
          playing={
            playing.length ? (
              <PlayingTab
                entries={playing}
                zone={zone}
                hourCycle={hourCycle}
                availability={availability}
              />
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

/**
 * @file src/app/admin/hosts/page.tsx
 * @desc Verified hosts, for haruhime admins only: a verified host may run up to 10 active
 *       editions instead of 1.
 * @author David @dvhsh (https://dvh.sh)
 * @created Thu Oct 8, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { PageHeader } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HostsTable } from "@/components/admin/HostsTable";
import { SEO_SITE } from "@/constants/seo";
import { requireAdmin } from "@/lib/auth-session";
import { listVerifiedHosts } from "@/services/hosts";
import { DEFAULT_EDITION_LIMIT, VERIFIED_EDITION_LIMIT } from "@/services/limits";

/** A never-indexed title. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/admin/hosts",
  title: "Verified hosts",
  index: false,
});

/**
 * @function AdminHostsPage
 * @returns {Promise<JSX.Element>} the verified hosts list
 */
export default async function AdminHostsPage() {
  const t = await getTranslations("tourney.pages.adminHosts");
  await requireAdmin("/admin/hosts");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("verifiedHosts")}
        lead={t("aVerifiedHostMay", {
          LIMIT: VERIFIED_EDITION_LIMIT,
          LIMIT2: DEFAULT_EDITION_LIMIT,
        })}
      />
      <HostsTable hosts={await listVerifiedHosts()} />
    </div>
  );
}

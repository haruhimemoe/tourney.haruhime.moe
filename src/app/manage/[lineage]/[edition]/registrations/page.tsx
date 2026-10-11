/**
 * @file src/app/manage/[lineage]/[edition]/registrations/page.tsx
 * @desc The host's review page: registrations filtered by status and searched by username, team
 *       or osu! id, 50 a page, with bulk approve, waitlist and reject.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { REGISTRATION_STATUSES, type RegistrationStatus } from "@haruhimemoe/tourney";
import { Button, PageHeader, Select, TextInput, TextLink } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RegistrationsTable } from "@/components/manage/RegistrationsTable";
import { REGISTRATIONS_PAGE_SIZE } from "@/constants/registration";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { listRegistrations } from "@/services/registrations";

type Props = {
  params: Promise<{ lineage: string; edition: string }>;
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
};

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} a never-indexed title
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/manage/${lineage}/${edition}/registrations`,
    title: "Registrations",
    index: false,
  });
}

/**
 * @function RegistrationsPage
 * @param props {Props} the slugs and filters
 * @returns {Promise<JSX.Element>} the review table
 */
export default async function RegistrationsPage({ params, searchParams }: Props) {
  const t = await getTranslations("tourney.pages.manageLineageEditionRegistrations");
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const base = `/manage/${lineageSlug}/${editionSlug}/registrations`;
  const user = await requireUser(base);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found || !memberRole(found.lineage, user.id)) notFound();
  const { lineage, edition } = found;
  const query = await searchParams;
  const status = REGISTRATION_STATUSES.includes(query.status as RegistrationStatus)
    ? (query.status as RegistrationStatus)
    : undefined;
  const q = query.q?.slice(0, 64) ?? "";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const { rows, total } = await listRegistrations(edition.id, { status, q }, page);
  const pages = Math.max(1, Math.ceil(total / REGISTRATIONS_PAGE_SIZE));
  const link = (p: number) => {
    const search = new URLSearchParams({
      ...(status ? { status } : {}),
      ...(q ? { q } : {}),
      page: String(p),
    });
    return `${base}?${search}`;
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("registrations")}
        lead={edition.name}
        meta={t("totalFound", { total })}
      />
      <form method="get" className="flex flex-wrap items-end gap-2">
        <Select id="status" name="status" label={t("status")} defaultValue={status ?? ""}>
          <option value="">{t("any")}</option>
          {REGISTRATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <TextInput id="q" name="q" label={t("search")} defaultValue={q} maxLength={64} />
        <Button type="submit" variant="ghost">
          {t("filter")}
        </Button>
      </form>
      <RegistrationsTable
        lineage={lineage.slug}
        edition={edition.slug}
        rows={rows}
        questions={edition.questions}
      />
      <nav aria-label={t("pages")} className="flex gap-4 text-sm">
        {page > 1 ? <TextLink href={link(page - 1)}>{t("previous")}</TextLink> : null}
        <span className="text-c3">
          Page {page} of {pages}
        </span>
        {page < pages ? <TextLink href={link(page + 1)}>{t("next")}</TextLink> : null}
      </nav>
    </div>
  );
}

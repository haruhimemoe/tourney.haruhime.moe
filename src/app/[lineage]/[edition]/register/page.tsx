/**
 * @file src/app/[lineage]/[edition]/register/page.tsx
 * @desc The registration page: the window, cap and eligibility up front, then the form (or the
 *       player's own registration to edit or withdraw). Signed out goes to sign in first. An
 *       edition that isn't public yet answers 404 to everyone but its hosts.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { CONTINENTS } from "@haruhimemoe/time/region";
import { isRegistrationOpen } from "@haruhimemoe/tourney";
import { Notice, PageHeader, StatList } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterForm } from "@/components/registration/RegisterForm";
import { SEO_SITE } from "@/constants/seo";
import { requireUser } from "@/lib/auth-session";
import type { Edition } from "@/schemas/edition";
import { getEdition } from "@/services/editions";
import { memberRole } from "@/services/lineages";
import { getOwnRegistration } from "@/services/registrations";

type Props = { params: Promise<{ lineage: string; edition: string }> };

const when = (iso: string | null, fallback: string) =>
  iso
    ? `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(iso))} UTC`
    : fallback;

const eligibilityText = (rules: Edition["eligibility"]): string => {
  const parts: string[] = [];
  if (rules.rank) parts.push(`rank #${rules.rank.min} to #${rules.rank.max}`);
  if (rules.countries) parts.push(`from ${rules.countries.join(", ")}`);
  if (rules.regions) {
    const names = CONTINENTS.filter((c) => rules.regions?.includes(c.id)).map((c) => c.name);
    parts.push(`in ${names.join(", ")}`);
  }
  return parts.length ? parts.join("; ") : "Anyone";
};

/**
 * @function generateMetadata
 * @param props {Props} the slugs
 * @returns {Promise<Metadata>} the page title, not indexed
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lineage, edition } = await params;
  return pageMetadata(SEO_SITE, {
    path: `/${lineage}/${edition}/register`,
    title: "Register",
    index: false,
  });
}

/**
 * @function RegisterPage
 * @param props {Props} the slugs
 * @returns {Promise<JSX.Element>} the registration page
 */
export default async function RegisterPage({ params }: Props) {
  const { lineage: lineageSlug, edition: editionSlug } = await params;
  const user = await requireUser(`/${lineageSlug}/${editionSlug}/register`);
  const found = await getEdition(lineageSlug, editionSlug);
  if (!found) notFound();
  const { lineage, edition } = found;
  const visible =
    edition.siteMode === "live" || (edition.siteMode === "auto" && edition.phase !== "setup");
  if (!visible && !memberRole(lineage, user.id)) notFound();
  const own = await getOwnRegistration(user.id, edition.id);
  const open = isRegistrationOpen(edition, new Date());
  const { registration: window } = edition;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Register for ${edition.name}`} lead={lineage.name} />
      <StatList
        items={[
          { label: "Opens", value: when(window.opensAt, "Now") },
          { label: "Closes", value: when(window.closesAt, "When the hosts close it") },
          { label: "Player cap", value: window.playerCap ? String(window.playerCap) : "None" },
          { label: "Who can join", value: eligibilityText(edition.eligibility) },
        ]}
      />
      {open || own ? (
        <RegisterForm
          lineage={lineage.slug}
          edition={edition.slug}
          questions={edition.questions}
          teamMode={edition.sides.kind === "team"}
          existing={own ? { status: own.status, answers: own.answers } : null}
        />
      ) : (
        <Notice tone="info">Registration isn't open.</Notice>
      )}
    </div>
  );
}

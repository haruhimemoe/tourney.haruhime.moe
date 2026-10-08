/**
 * @file src/app/account/page.tsx
 * @desc /account, tourney's own settings: the signed-in user's osu! name and avatar (linking
 *       their osu! profile), sign out (in place) and a link to /admin for admins. The haruhime
 *       account itself (sessions, export, deleting it) lives on haruhime.moe/account, linked
 *       once here. Sign-in otherwise; never indexed. Catches the header up when its store
 *       missed the session.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

import { osuAvatarSrc } from "@haruhimemoe/next-kit/auth-react";
import { pageMetadata } from "@haruhimemoe/next-kit/seo";
import { userUrl } from "@haruhimemoe/osu/shapes";
import { ButtonLink, Card, PageHeader, TextLink } from "@haruhimemoe/ui";
import type { Metadata } from "next";
import Image from "next/image";
import { SEO_SITE } from "@/constants/seo";
import { HUB_ACCOUNT_URL } from "@/constants/site";
import { RestoreSignedIn, SignOutButton } from "@/lib/account";
import { requireUser } from "@/lib/auth-session";

/** The account page's title; it's never indexed. */
export const metadata: Metadata = pageMetadata(SEO_SITE, {
  path: "/account",
  title: "tourney settings",
  index: false,
});

/**
 * @function AccountPage
 * @returns {Promise<JSX.Element>} the signed-in user's osu! account (a visitor goes to sign in)
 */
export default async function AccountPage() {
  const user = await requireUser("/account");
  const avatar = osuAvatarSrc(user.avatarUrl);
  return (
    <div className="flex flex-col gap-6">
      <RestoreSignedIn />
      <PageHeader
        title="tourney settings"
        actions={
          <>
            {user.isAdmin ? (
              <ButtonLink href="/admin/hosts" variant="secondary">
                Admin
              </ButtonLink>
            ) : null}
            <SignOutButton />
          </>
        }
      />
      <Card title="Your osu! account">
        <div className="flex items-center gap-3">
          {avatar ? (
            <Image src={avatar} alt="" width={48} height={48} className="rounded-full" />
          ) : null}
          <TextLink href={userUrl(user.osuId)} rel="noopener" variant="plain" className="text-lg">
            {user.username}
          </TextLink>
        </div>
        <p className="mt-3 text-c3 text-sm">
          Your sessions, exporting your data and deleting your haruhime account are on{" "}
          <TextLink href={HUB_ACCOUNT_URL}>haruhime.moe/account</TextLink>.
        </p>
      </Card>
    </div>
  );
}

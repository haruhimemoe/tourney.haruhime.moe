/**
 * @file src/components/layout/AppPalette.tsx
 * @desc The one CommandPalette for the whole site, mounted once in the root layout: ui's
 *       siteCommands (Navigate from NAV_LINKS, Page, Help) plus tourney's own extras (Host a
 *       tournament, Browse). Account commands read `useAccount` client-side, so the root layout
 *       stays static. Sign out runs the same POST /api/signout the header's menu uses, tells the
 *       store, then goes home.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { uiLabels } from "@haruhimemoe/next-kit/i18n";
import type { Command } from "@haruhimemoe/ui";
import { CommandPalette, siteCommands } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { navLinks, SITE } from "@/constants/site";
import { accountStore, signOutHere, useAccount } from "@/lib/account";

/**
 * @function AppPalette
 * @returns {JSX.Element} the mounted CommandPalette, empty until opened
 */
export function AppPalette() {
  const t = useTranslations("tourney");
  const tUi = useTranslations("ui");
  const ui = useMemo(() => uiLabels(tUi), [tUi]);
  const account = useAccount();
  const signedIn = account.status === "signed-in";

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "tourney.new",
        title: t("palette.host"),
        subtitle: t("palette.hostSub"),
        group: "tourney",
        run: (ctx) => ctx.navigate("/manage/new"),
      },
      {
        id: "tourney.browse",
        title: t("palette.browse"),
        subtitle: t("palette.browseSub"),
        group: "tourney",
        run: (ctx) => ctx.navigate("/browse"),
      },
      {
        id: "tourney.sign-out",
        title: ui.account.signOut,
        group: ui.siteCommands.account,
        when: () => signedIn,
        run: async (ctx) => {
          await signOutHere();
          accountStore.markSignedOut();
          ctx.navigate("/");
        },
      },
      ...siteCommands({
        pages: navLinks(t),
        repo: SITE.repoUrl,
        account: { signedIn, signInHref: "/signin", accountHref: "/account" },
        labels: ui.siteCommands,
      }),
    ],
    [signedIn, t, ui],
  );

  return (
    <CommandPalette
      storageKey="tourney"
      commands={commands}
      labels={ui.palette}
      placeholder={ui.paletteProps.placeholder}
      label={ui.paletteProps.label}
    />
  );
}

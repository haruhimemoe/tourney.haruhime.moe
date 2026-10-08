/**
 * @file src/components/layout/AppPalette.tsx
 * @desc The one CommandPalette for the whole site, mounted once in the root layout: ui's
 *       siteCommands (Navigate from NAV_LINKS, Page, Help) plus tourney's own extras (Host a
 *       tournament, Browse). Account commands read `useAccount` client-side, so the root layout
 *       stays static. Sign out runs the same POST /api/signout the header's menu uses, tells the
 *       store, then goes home.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Wed Oct 7, 2026
 */

"use client";

import type { Command } from "@haruhimemoe/ui";
import { CommandPalette, siteCommands } from "@haruhimemoe/ui";
import { useMemo } from "react";
import { NAV_LINKS, SITE } from "@/constants/site";
import { accountStore, signOutHere, useAccount } from "@/lib/account";

/**
 * @function AppPalette
 * @returns {JSX.Element} the mounted CommandPalette, empty until opened
 */
export function AppPalette() {
  const account = useAccount();
  const signedIn = account.status === "signed-in";

  const commands = useMemo<Command[]>(
    () => [
      {
        id: "tourney.new",
        title: "Host a tournament",
        subtitle: "Make a lineage and its first edition",
        group: "tourney",
        run: (ctx) => ctx.navigate("/manage/new"),
      },
      {
        id: "tourney.browse",
        title: "Browse tournaments",
        subtitle: "Open registrations and running editions",
        group: "tourney",
        run: (ctx) => ctx.navigate("/browse"),
      },
      {
        id: "tourney.sign-out",
        title: "Sign out",
        group: "Account",
        when: () => signedIn,
        run: async (ctx) => {
          await signOutHere();
          accountStore.markSignedOut();
          ctx.navigate("/");
        },
      },
      ...siteCommands({
        pages: NAV_LINKS,
        repo: SITE.repoUrl,
        account: { signedIn, signInHref: "/signin", accountHref: "/account" },
      }),
    ],
    [signedIn],
  );

  return <CommandPalette storageKey="tourney" commands={commands} />;
}

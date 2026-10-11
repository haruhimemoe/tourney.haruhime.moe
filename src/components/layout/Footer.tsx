/**
 * @file src/components/layout/Footer.tsx
 * @desc Site footer: the tourney / About / Legal link columns with ui's "haruhime tools"
 *       column after tourney, the affiliation notice as fine print, and the row linking the
 *       parent brand, the Discord server and the haruhimemoe GitHub org.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

import { LOCALES } from "@haruhimemoe/messages";
import { LocaleSelect, SiteFooter } from "@haruhimemoe/ui";
import { useLocale, useTranslations } from "next-intl";
import { footerColumns, SITE } from "@/constants/site";

/**
 * @function Footer
 * @returns {JSX.Element} ui's SiteFooter with the columns, the Discord and GitHub links and the
 *          trademark notice
 */
export function Footer() {
  const t = useTranslations("tourney");
  const common = useTranslations("common");
  const ui = useTranslations("ui");
  const locale = useLocale();
  return (
    <SiteFooter
      columns={footerColumns(t, common)}
      navLabel={ui("shell.footerNav")}
      tools={{
        current: "tourney",
        position: 1,
        title: ui("shell.tools"),
        allLabel: ui("shell.allTools"),
      }}
      extra={
        <LocaleSelect
          locales={LOCALES}
          value={locale}
          label={ui("shell.language")}
          cookieDomain=".haruhime.moe"
        />
      }
      finePrint={SITE.trademarkNotice}
      parentHref={SITE.parentUrl}
      githubHref={SITE.githubOrg}
      discordHref={SITE.discordUrl}
    />
  );
}

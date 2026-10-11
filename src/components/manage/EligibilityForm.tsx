/**
 * @file src/components/manage/EligibilityForm.tsx
 * @desc An edition's eligibility rules: a rank range, a country list and continents. Empty means
 *       open. Controlled. BWS is out of v0, so there is no BWS field.
 * @author David @dvhsh (https://dvh.sh)
 * @created Wed Oct 7, 2026
 * @modified Sun Oct 11, 2026
 */

"use client";

import { CONTINENTS } from "@haruhimemoe/time/region";
import { TextInput } from "@haruhimemoe/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { Eligibility } from "@/schemas/edition";

/** EligibilityForm's props: the rules and their change handler. */
export type EligibilityFormProps = {
  value: Eligibility;
  onChange: (value: Eligibility) => void;
  disabled?: boolean;
};

const toNumber = (text: string): number | null => (/^\d+$/.test(text.trim()) ? Number(text) : null);

/**
 * @function EligibilityForm
 * @param props {EligibilityFormProps} the rules
 * @returns {JSX.Element} the fields
 */
export function EligibilityForm({ value, onChange, disabled }: EligibilityFormProps) {
  const t = useTranslations("tourney.eligibilityForm");
  const [min, setMin] = useState(value.rank ? String(value.rank.min) : "");
  const [max, setMax] = useState(value.rank ? String(value.rank.max) : "");
  const [countries, setCountries] = useState(value.countries?.join(", ") ?? "");

  const setRank = (nextMin: string, nextMax: string) => {
    setMin(nextMin);
    setMax(nextMax);
    const lo = toNumber(nextMin);
    const hi = toNumber(nextMax);
    onChange({
      ...value,
      rank: lo === null && hi === null ? null : { min: lo ?? 1, max: hi ?? 10_000_000 },
    });
  };

  const setCountryText = (text: string) => {
    setCountries(text);
    const codes = [
      ...new Set(
        text
          .split(/[\s,]+/)
          .map((c) => c.trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c)),
      ),
    ];
    onChange({ ...value, countries: codes.length ? codes : null });
  };

  const toggleRegion = (id: string, on: boolean) => {
    const next = on
      ? [...(value.regions ?? []), id]
      : (value.regions ?? []).filter((r) => r !== id);
    onChange({ ...value, regions: next.length ? next : null });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <TextInput
          id="rank-min"
          label={t("bestRankAllowed")}
          hint={t("leaveBothEmptyFor")}
          inputMode="numeric"
          value={min}
          onChange={(e) => setRank(e.target.value, max)}
          disabled={disabled}
        />
        <TextInput
          id="rank-max"
          label={t("worstRankAllowed")}
          inputMode="numeric"
          value={max}
          onChange={(e) => setRank(min, e.target.value)}
          disabled={disabled}
        />
      </div>
      <TextInput
        id="countries"
        label={t("countries")}
        hint={t("twoLetterCodesSeparated")}
        value={countries}
        onChange={(e) => setCountryText(e.target.value)}
        disabled={disabled}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 font-bold text-c1 text-sm">{t("continents")}</legend>
        <p className="text-c3 text-xs">{t("nonePickedMeansAny")}</p>
        {CONTINENTS.map((r) => (
          <label key={r.id} className="flex items-center gap-2 text-c2 text-sm">
            <input
              type="checkbox"
              checked={value.regions?.includes(r.id) ?? false}
              onChange={(e) => toggleRegion(r.id, e.target.checked)}
              disabled={disabled}
            />
            {r.name}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

/**
 * @file tests/components/manage/GeneralSettingsForm.test.tsx
 * @desc The general settings form's hue field: a non-empty value that isn't a whole number from
 *       0 to 359 shows a field error and blocks the save (no PATCH sent); a valid or empty value
 *       saves normally.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralSettingsForm } from "@/components/manage/GeneralSettingsForm";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const INITIAL = {
  name: "Evergreen Cup 2026",
  acronym: null,
  dates: { start: null, end: null },
  rulesText: "",
  bannerUrl: null,
  hue: null,
  siteMode: "auto" as const,
};

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("GeneralSettingsForm", () => {
  it("blocks the save and shows a field error for a non-integer hue", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    render(<GeneralSettingsForm lineage="egc" edition="egc2026" initial={INITIAL} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Hue"), "abc");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Enter a whole number from 0 to 359.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks the save for a hue out of range", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);

    render(<GeneralSettingsForm lineage="egc" edition="egc2026" initial={INITIAL} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Hue"), "360");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Enter a whole number from 0 to 359.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("saves with a valid hue, clearing a previous field error", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { edition: {} }));
    vi.stubGlobal("fetch", fetch);

    render(<GeneralSettingsForm lineage="egc" edition="egc2026" initial={INITIAL} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Hue"), "abc");
    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Enter a whole number from 0 to 359.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Hue"));
    await user.type(screen.getByLabelText("Hue"), "210");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(screen.queryByText("Enter a whole number from 0 to 359.")).not.toBeInTheDocument();
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.hue).toBe(210);
  });

  it("saves with an empty hue as null", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { edition: {} }));
    vi.stubGlobal("fetch", fetch);

    render(<GeneralSettingsForm lineage="egc" edition="egc2026" initial={INITIAL} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save settings" }));
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body.hue).toBeNull();
  });
});

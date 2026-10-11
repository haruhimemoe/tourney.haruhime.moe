/**
 * @file tests/components/manage/SocialsEditor.test.tsx
 * @desc The socials editor: add rows, a bad host shows the field error from the route's issues,
 *       fixing the url clears it and the saved PATCH body matches; a row that carries a stale
 *       label for a non-custom kind (from before the kind changed) is still sent with its label
 *       forced to null.
 * @author David @dvhsh (https://dvh.sh)
 * @created Sun Oct 11, 2026
 * @modified Sun Oct 11, 2026
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SocialsEditor } from "@/components/manage/SocialsEditor";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockReset();
});

describe("SocialsEditor", () => {
  it("adds rows, shows a field error, fixes it, and saves the matching body", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        json(400, {
          error: { code: "bad_request", message: "Use a discord.gg link." },
          issues: [{ path: ["socials", 0, "url"], message: "Use a discord.gg link." }],
        }),
      )
      .mockResolvedValueOnce(json(200, { edition: {} }));
    vi.stubGlobal("fetch", fetch);

    render(<SocialsEditor lineage="egc" edition="egc2026" initial={[]} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Add social" }));
    await user.click(screen.getByRole("button", { name: "Add social" }));

    const urls = screen.getAllByLabelText("URL");
    await user.type(urls[0] as HTMLElement, "https://example.com/bad");

    const kinds = screen.getAllByRole("combobox");
    await user.selectOptions(kinds[1] as HTMLElement, "website");
    await user.type(urls[1] as HTMLElement, "https://example.com");

    await user.click(screen.getByRole("button", { name: "Save socials" }));
    expect(await screen.findByText("Use a discord.gg link.")).toBeInTheDocument();

    await user.clear(urls[0] as HTMLElement);
    await user.type(urls[0] as HTMLElement, "https://discord.gg/abc");
    await user.click(screen.getByRole("button", { name: "Save socials" }));

    const body = JSON.parse(String(fetch.mock.calls[1]?.[1]?.body));
    expect(body).toEqual({
      socials: [
        { kind: "discord", url: "https://discord.gg/abc", label: null },
        { kind: "website", url: "https://example.com", label: null },
      ],
    });
  });

  it("never sends a label for a row with a stale label and a non-custom kind", async () => {
    const fetch = vi.fn().mockResolvedValue(json(200, { edition: {} }));
    vi.stubGlobal("fetch", fetch);

    const initial = [{ kind: "website" as const, url: "https://example.com", label: "Stale" }];
    render(<SocialsEditor lineage="egc" edition="egc2026" initial={initial} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save socials" }));

    const body = JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
    expect(body).toEqual({
      socials: [{ kind: "website", url: "https://example.com", label: null }],
    });
  });

  it("caps at 12 rows", async () => {
    const initial = Array.from({ length: 12 }, () => ({
      kind: "website" as const,
      url: "https://example.com",
      label: null,
    }));
    render(<SocialsEditor lineage="egc" edition="egc2026" initial={initial} />);
    expect(screen.getByRole("button", { name: "Add social" })).toBeDisabled();
    expect(screen.getByText(/12 socials at most/)).toBeInTheDocument();
  });
});

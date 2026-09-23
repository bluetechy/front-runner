import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";
import { readDecision } from "./consent";
import { CookieConsentProvider } from "./cookie-consent";
import { CookieNotice } from "./cookie-notice";

/*
 * The box that asks, and the pill it leaves behind.
 *
 * Most of what is asserted here is a requirement rather than a preference,
 * and each test says which: the bar cannot be got rid of without answering
 * it, refusing is the same one press as accepting and drawn the same way,
 * and there is always a way back into the choice afterwards.
 *
 * The router is stubbed rather than stood up: `Link` is a route target the
 * notice does not own, and standing a whole router up would be testing
 * TanStack instead of this. The notice asked it one question once -- "is the
 * rail on this page?" -- which it stopped needing when the pill moved to the
 * other corner.
 */

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

function useFakeStorage() {
  const entries = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, value: string) => entries.set(key, value),
    removeItem: (key: string) => entries.delete(key),
    clear: () => entries.clear(),
  });
}

beforeEach(() => {
  useFakeStorage();
});

const renderNotice = () =>
  render(
    <ThemeProvider theme={theme}>
      <CookieConsentProvider>
        <CookieNotice />
      </CookieConsentProvider>
    </ThemeProvider>,
  );

const bar = () => screen.getByRole("region", { name: "Cookies on this site" });
const press = (label: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name: label }));

describe("the first visit", () => {
  it("asks, in words, before anything optional has run", () => {
    renderNotice();

    expect(bar()).toHaveTextContent(/Some cookies keep you signed in/);
  });

  it("says where the whole story is written down", () => {
    renderNotice();

    expect(
      within(bar()).getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacy");
  });

  // The ask itself. Refusing has to be one press, in the same row, drawn the
  // same way as accepting -- a "reject" hidden behind a settings screen is
  // the arrangement the CNIL has fined people for.
  it("offers refusing and accepting as the same press, side by side", () => {
    renderNotice();

    const reject = within(bar()).getByRole("button", { name: "Reject all" });
    const accept = within(bar()).getByRole("button", { name: "Accept all" });

    expect(reject.className).toBe(accept.className);
    expect(reject.className).toContain("MuiButton-outlined");
  });

  // Neither answer wears the accent, which is the one place in this product
  // where that is settled by something other than taste: painting one of two
  // equal answers is the nudge that makes a consent unfree.
  it("paints neither answer as the one being pushed", () => {
    renderNotice();

    for (const label of ["Reject all", "Accept all"]) {
      expect(
        within(bar()).getByRole("button", { name: label }).className,
      ).not.toContain("MuiButton-contained");
    }
  });

  it("offers a third way in for somebody who wants to answer per category", () => {
    renderNotice();

    expect(
      within(bar()).getByRole("button", { name: "Manage preferences" }),
    ).toBeInTheDocument();
  });
});

describe("a bar that will not go away", () => {
  // The whole of what "it stays until they interact with it" means. There is
  // no X, no backdrop, and nothing that dismisses it without recording an
  // answer, because a box somebody can wave off has not been answered.
  it("has no way out of it that is not an answer", () => {
    renderNotice();

    expect(
      within(bar()).queryByRole("button", { name: /close|dismiss|got it|ok/i }),
    ).toBeNull();
    expect(within(bar()).getAllByRole("button")).toHaveLength(3);
  });

  it("is still there after Escape, which closes everything else in this app", () => {
    renderNotice();

    fireEvent.keyDown(document.body, { key: "Escape", code: "Escape" });

    expect(bar()).toBeInTheDocument();
  });

  // It is a notice and not a cookie wall: the page behind it stays readable,
  // because a site that will not show itself without a yes is not asking. So
  // it is a landmark somebody can jump to and leave, and not a modal that
  // holds the page until it is answered.
  it("does not lock the page behind it", () => {
    renderNotice();

    expect(bar()).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("answering it", () => {
  it.each([
    ["Accept all", true],
    ["Reject all", false],
  ])("takes the bar away when %s is pressed", (label, allowed) => {
    renderNotice();

    press(label);

    expect(
      screen.queryByRole("region", { name: "Cookies on this site" }),
    ).toBeNull();
    expect(readDecision()?.choices.analytics).toBe(allowed);
  });

  it("opens the per-category dialog from Manage preferences", () => {
    renderNotice();

    press("Manage preferences");

    expect(
      screen.getByRole("dialog", { name: "Your cookie choices" }),
    ).toBeInTheDocument();
  });
});

describe("the way back, once it has been answered", () => {
  // Withdrawing has to be as easy as agreeing was, and a choice with no way
  // back to it is not a choice. This is that way back, on every page.
  it("leaves a pill in the corner that reopens the choice", () => {
    renderNotice();
    press("Accept all");

    press("Cookie settings");

    expect(
      screen.getByRole("dialog", { name: "Your cookie choices" }),
    ).toBeInTheDocument();
  });

  it("shows the pill only once there is something to come back to", () => {
    renderNotice();

    expect(
      screen.queryByRole("button", { name: "Cookie settings" }),
    ).toBeNull();
  });

  // Bottom right, the same 1rem off both edges on every page of both shells.
  // It was bottom left and stepped past the rail behind the login; on this
  // side there is nothing to step past, so the offset is one number and the
  // pill no longer asks the router which shell it is in.
  it("sits in the bottom right corner, the same on every page", () => {
    renderNotice();
    press("Accept all");

    expect(screen.getByRole("button", { name: "Cookie settings" })).toHaveStyle(
      { position: "fixed", bottom: "1rem", right: "1rem" },
    );
  });
});

import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * The bar across the top of the marketing pages.
 *
 * The state worth being careful about is the middle one: "loading" is the
 * moment a remembered session is being restored, and showing "Login" through
 * it would make an already signed-in visitor flicker as though they were not.
 *
 * The session and the prompt are stubbed, and `Link` with them -- this is
 * about what the bar shows and what it does, not about routing or about
 * Keycloak.
 */

const open = vi.fn();
const logout = vi.fn();
const session = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => session(),
  useLoginPrompt: () => ({ open }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { SiteHeader } = await import("./site-header");

const signedOut = { status: "signed-out", identity: null, logout };
const loading = { status: "loading", identity: null, logout };
const signedIn = {
  status: "signed-in",
  identity: { name: "Thomas John", loginName: "member", email: "t@j.test" },
  logout,
};

const renderHeader = (state: unknown) => {
  session.mockReturnValue(state);
  return render(
    <ThemeProvider theme={theme}>
      <SiteHeader />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  open.mockClear();
  logout.mockClear();
});

describe("what the bar holds", () => {
  it("shows the logo, going home", () => {
    renderHeader(signedOut);

    expect(screen.getByRole("link", { name: /YourLogo/ })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("links to every marketing page", () => {
    renderHeader(signedOut);
    const nav = screen.getByRole("navigation", { name: "Main" });

    for (const [label, href] of [
      ["Home", "/"],
      ["About", "/about"],
      ["Features", "/features"],
      ["Pricing", "/pricing"],
      ["Contact", "/contact"],
    ] as const)
      expect(within(nav).getByRole("link", { name: label })).toHaveAttribute(
        "href",
        href,
      );
  });

  it("offers a search", () => {
    renderHeader(signedOut);

    expect(screen.getByRole("button", { name: "Search" })).toBeVisible();
  });
});

describe("whoever is looking at it", () => {
  it("offers a way in to a visitor", () => {
    renderHeader(signedOut);

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    expect(open).toHaveBeenCalledTimes(1);
  });

  // A remembered session is being restored. "Login" here would flicker at
  // somebody who is already signed in.
  it("holds the way in open but unusable while a session is being restored", () => {
    renderHeader(loading);

    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
  });

  it("names whoever is signed in, and links them to the dashboard", () => {
    renderHeader(signedIn);

    expect(screen.getByRole("link", { name: "Thomas John" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("offers a way out to somebody signed in, and no way in", () => {
    renderHeader(signedIn);

    expect(screen.queryByRole("button", { name: "Login" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    expect(logout).toHaveBeenCalledTimes(1);
  });
});

import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import "../language/i18n";

/*
 * The rail down the left edge.
 *
 * Every item is a route rather than a thing that sets a selection, which is
 * why there is no "selected" state in here to test: the URL, the back button
 * and the pill under the item you are on all agree because there is only one
 * of them. What is worth asserting is that every page has a link, that the
 * links are the routes they claim to be, and that choosing one closes the
 * drawer on a narrow window.
 *
 * Both drawers render the same contents -- the permanent one from `lg` up and
 * the temporary one below it -- so every query here is scoped to one of them.
 */

const session = vi.fn();
const profile = vi.fn();

vi.mock("../authentication", () => ({ useSession: () => session() }));
vi.mock("../profile", () => ({ useProfile: () => profile() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    activeOptions: _activeOptions,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
    activeOptions?: unknown;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { AppSidebar, RAIL_WIDTH } = await import("./app-sidebar");

/*
 * The permanent drawer -- the one a wide window shows -- which is the only
 * one rendered inside the container: the temporary one is a modal and goes
 * to a portal on the body. It is rendered closed, because an open modal
 * hides the rest of the document from a screen reader and would take this
 * rail with it.
 */
const renderRail = () => {
  const onClose = vi.fn();
  const { container } = render(
    <ThemeProvider theme={theme}>
      <AppSidebar open={false} onClose={onClose} />
    </ThemeProvider>,
  );
  const rail = container.querySelector(".MuiDrawer-paper") as HTMLElement;
  return { onClose, rail };
};

beforeEach(() => {
  session.mockReturnValue({
    identity: { name: "Thomas John", loginName: "member", email: "t@j.test" },
  });
  profile.mockReturnValue({ profile: { Designation: "Program manager" } });
});

describe("the top of the rail", () => {
  it("shows the logo, going to the dashboard", () => {
    const { rail } = renderRail();

    expect(
      within(rail).getByRole("link", { name: /YourLogo/ }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("shows whoever is signed in, and what they are here as", () => {
    const { rail } = renderRail();

    expect(within(rail).getByText("Thomas John")).toBeInTheDocument();
    expect(within(rail).getByText("Program manager")).toBeInTheDocument();
    expect(within(rail).getByText("TJ")).toBeInTheDocument();
  });

  // Blank until they fill it in, rather than a title invented for them.
  it("says nothing about somebody who has not said what they do", () => {
    profile.mockReturnValue({ profile: null });
    const { rail } = renderRail();

    expect(within(rail).getByText("Thomas John")).toBeInTheDocument();
    expect(within(rail).queryByText("Program manager")).toBeNull();
  });
});

describe("the navigation", () => {
  it("groups the pages the way the product is organized", () => {
    const { rail } = renderRail();

    for (const group of ["Dashboard", "Account", "Support"])
      expect(
        within(rail).getByRole("heading", { name: group }),
      ).toBeInTheDocument();
  });

  it.each([
    ["Command Center", "/dashboard"],
    ["Schedule", "/schedule"],
    ["Achievements", "/achievements"],
    ["Certifications", "/certifications"],
    ["Site Widgets", "/widgets"],
    ["Profile", "/profile"],
    ["Security & Access", "/security-and-access"],
    ["Billing & Subscription", "/billing"],
    ["Payment Wallet", "/wallet"],
    ["Settings", "/settings"],
    ["Tutorials", "/tutorials"],
    ["Customer Service", "/customer-service"],
  ])("links %s to %s", (label, href) => {
    const { rail } = renderRail();

    expect(within(rail).getByRole("link", { name: label })).toHaveAttribute(
      "href",
      href,
    );
  });

  it("draws an icon beside every item", () => {
    const { rail } = renderRail();

    const nav = within(rail).getByRole("navigation");
    expect(within(nav).getAllByRole("link")).toHaveLength(12);
    expect(nav.querySelectorAll("svg").length).toBe(12);
  });

  // On a narrow window the rail is a drawer over the page, and a page you
  // cannot see because the rail is still over it is a page you did not open.
  it("closes the drawer when a page is chosen", () => {
    const { rail, onClose } = renderRail();

    fireEvent.click(within(rail).getByRole("link", { name: "Profile" }));

    expect(onClose).toHaveBeenCalled();
  });
});

describe("the rail itself", () => {
  // Both drawers render the same thing, which is what keeps a narrow window
  // from being a second, smaller navigation with its own list in it.
  it("draws the same contents in both drawers", () => {
    render(
      <ThemeProvider theme={theme}>
        <AppSidebar open={false} onClose={vi.fn()} />
      </ThemeProvider>,
    );

    /* Both: the temporary one is kept mounted so opening it on a phone does
     * not build the rail again from nothing. */
    const drawers = document.querySelectorAll(".MuiDrawer-paper");
    expect(drawers).toHaveLength(2);
    /* By what each one holds rather than by role: the temporary drawer is
     * closed, and a closed modal's contents are not reachable as roles. */
    for (const drawer of drawers) {
      const links = [...drawer.querySelectorAll("a")].map((link) =>
        link.getAttribute("href"),
      );
      expect(links).toContain("/profile");
      expect(links).toHaveLength(13);
    }
  });

  it("takes one width, named once, so the page beside it can allow for it", () => {
    expect(RAIL_WIDTH).toBeGreaterThan(0);
  });
});

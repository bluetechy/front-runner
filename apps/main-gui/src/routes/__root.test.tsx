import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/*
 * The root: an outlet, and the cookie notice around it.
 *
 * There are two shells under it and they never appear together, so neither is
 * here -- putting either one at the root would put both on every page. What
 * *is* here is the one question the whole product shares. A visitor who
 * answers the box on the pricing page has answered it for the dashboard as
 * well, and a notice mounted inside a shell would ask again on the way
 * through the login.
 */

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  Outlet: () => <p>The page</p>,
}));

vi.mock("../cookie-consent", () => ({
  CookieConsentProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="consent">{children}</div>
  ),
  CookieNotice: () => <p>The cookie notice</p>,
}));

const { Route } = await import("./__root");

const renderRoot = () => {
  const Root = Route.options.component!;
  render(<Root />);
};

describe("the root route", () => {
  it("renders the page the route matched", () => {
    renderRoot();

    expect(screen.getByText("The page")).toBeInTheDocument();
  });

  // Every page of both shells, marketing and application alike, and one mount
  // rather than one per shell.
  it("puts the cookie notice on every page there is", () => {
    renderRoot();

    expect(screen.getAllByText("The cookie notice")).toHaveLength(1);
  });

  // The gate has to be above everything that reads it: a script asking
  // whether it may run is asking from inside a page.
  it("wraps the whole app in the consent it is deciding", () => {
    renderRoot();

    expect(screen.getByTestId("consent")).toHaveTextContent("The page");
  });

  // No shell, no session guard, no query client: everything else that wraps a
  // page belongs to the half of the product it wraps.
  it("wraps nothing else around it", () => {
    expect(Object.keys(Route.options)).toEqual(["component"]);
  });
});

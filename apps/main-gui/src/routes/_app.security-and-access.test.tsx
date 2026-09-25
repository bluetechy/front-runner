import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

/* The page itself is stubbed. A route file owns the URL and what it hands to
 * the vertical, and that is all this file is about; what the page does with a
 * returning provider is tested beside it, in `security/security.test.tsx`. */
vi.mock("../security", () => ({
  Security: ({ connected }: { connected: string | undefined }) => (
    <h2>{connected ? `checking ${connected}` : "the security page"}</h2>
  ),
}));

const { Route } = await import("./_app.security-and-access");

/* The route reads the URL through its own `useSearch`, which needs a router;
 * it is answered here instead, the way `_site.verify-email.test.tsx` does. */
Route.useSearch = search as unknown as typeof Route.useSearch;

/*
 * /security-and-access, which is Security & Access in the rail.
 *
 * A route file declares the route and renders one thing from a vertical;
 * anything longer belongs in the vertical (docs/codebase-structure.md). So
 * what is asserted here is the URL: that it leads to the security page, and
 * that the one search parameter on it is read.
 *
 * That parameter is where a provider drops the browser after the SSO card
 * sent it off to connect an account. It is a claim rather than a fact, which
 * is the page's business rather than this file's: what matters here is that
 * anything that is not a string reads as absent, the same rule every search
 * parameter in this application keeps.
 *
 * This route rendered the "coming soon" placeholder until the email addresses
 * went in.
 */

beforeEach(() => {
  search.mockReturnValue({ connected: undefined });
});

const validate = Route.options.validateSearch as (
  search: Record<string, unknown>,
) => { connected?: string };

describe("the provider on the URL", () => {
  it("is read off the search string", () => {
    expect(validate({ connected: "google" })).toEqual({ connected: "google" });
  });

  it.each([
    ["nothing at all", {}],
    [
      "a repeated parameter, which arrives as an array",
      { connected: ["google", "apple"] },
    ],
    ["a number", { connected: 7 }],
    ["an object", { connected: { alias: "google" } }],
  ])("reads %s as no provider", (_name, search) => {
    expect(validate(search)).toEqual({ connected: undefined });
  });
});

describe("the page behind it", () => {
  // The router's plugin rewrites `component` into a lazily loaded one so each
  // page is its own chunk, which is why this renders inside a `Suspense`.
  it("renders the security page", async () => {
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", { name: "the security page" }),
    ).toBeInTheDocument();
  });

  it("hands a returning provider off to it", async () => {
    search.mockReturnValue({ connected: "google" });
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", { name: "checking google" }),
    ).toBeInTheDocument();
  });
});

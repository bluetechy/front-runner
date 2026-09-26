import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

/* The page itself is stubbed. A route file owns the URL and what it hands to
 * the vertical, and that is all this file is about; what the page does with a
 * returning provider is tested beside it, in `security/security.test.tsx`. */
vi.mock("../security", () => ({
  Security: ({
    connected,
    passkey,
  }: {
    connected: string | undefined;
    passkey: string | undefined;
  }) => (
    <h2>
      {connected
        ? `checking ${connected}`
        : passkey
          ? `checking a ${passkey} passkey`
          : "the security page"}
    </h2>
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
 * that the three search parameters on it are read.
 *
 * All three are where the identity provider drops the browser after this page
 * sent it somewhere: after connecting an account, after setting up a second
 * factor, and after registering a passkey. Each is a claim rather than a
 * fact, which is the page's business rather than this file's: what matters
 * here is that anything that is not a string reads as absent, the same rule
 * every search parameter in this application keeps.
 *
 * This route rendered the "coming soon" placeholder until the email addresses
 * went in.
 */

beforeEach(() => {
  search.mockReturnValue({ connected: undefined });
});

const validate = Route.options.validateSearch as (
  search: Record<string, unknown>,
) => { connected?: string; configured?: string; passkey?: string };

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

describe("the passkey claim on the URL", () => {
  /* It names nothing, unlike the other two, because there is nothing to
   * name: an account holds a list of passkeys rather than one row per kind,
   * so all a returning browser can say is that it went. */
  it("is read off the search string", () => {
    expect(validate({ passkey: "registered" })).toEqual({
      connected: undefined,
      configured: undefined,
      passkey: "registered",
    });
  });

  it.each([
    ["nothing at all", {}],
    ["a repeated parameter, which arrives as an array", { passkey: ["a"] }],
    ["a number", { passkey: 7 }],
  ])("reads %s as no trip", (_name, search) => {
    expect(validate(search).passkey).toBeUndefined();
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

  it("hands a browser back from a passkey trip off to it", async () => {
    search.mockReturnValue({ passkey: "registered" });
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "checking a registered passkey",
      }),
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

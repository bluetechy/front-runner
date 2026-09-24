import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

/* The page itself is stubbed. A route file owns the URL and what it hands to
 * the vertical, and that is all this file is about; what the page then does
 * with a token is tested beside it, in
 * `authentication/reset-password.test.tsx`. */
vi.mock("../authentication", () => ({
  ResetPassword: ({ token }: { token: string | undefined }) => (
    <h2>{token ? `resetting with ${token}` : "no token"}</h2>
  ),
}));

const { Route } = await import("./_site.reset-password");

/* The route reads the URL through its own `useSearch`, which needs a router;
 * it is answered here instead, the way `_site.verify-email.test.tsx` does. */
Route.useSearch = search as unknown as typeof Route.useSearch;

/*
 * /reset-password, where the link in a password reset mail lands.
 *
 * On the marketing shell rather than behind the login, and that is not a
 * detail: somebody following this link cannot login, which is the whole
 * reason they are here. The token on the URL is the authorization.
 *
 * What a route file owns is the URL and what it hands to the vertical, so
 * what is asserted here is the search parameter.
 */

const TOKEN = "3f2504e0-4f89-41d3-9a0c-0305e82c3301";

beforeEach(() => {
  search.mockReturnValue({ token: TOKEN });
});

const validate = Route.options.validateSearch as (
  search: Record<string, unknown>,
) => { token?: string };

describe("the token on the URL", () => {
  it("is read off the search string", () => {
    expect(validate({ token: TOKEN })).toEqual({ token: TOKEN });
  });

  // A search string is whatever somebody put in the address bar, so anything
  // that is not a string is no token rather than a token of the wrong type.
  it.each([
    ["nothing at all", {}],
    [
      "a repeated parameter, which arrives as an array",
      { token: ["one", "two"] },
    ],
    ["a number", { token: 7 }],
    ["an object", { token: { value: "one" } }],
  ])("reads %s as no token", (_name, search) => {
    expect(validate(search)).toEqual({ token: undefined });
  });
});

describe("the page behind it", () => {
  // The router's plugin rewrites `component` into a lazily loaded one so each
  // page is its own chunk, which is why this renders inside a `Suspense`.
  it("hands the token off to the reset page", async () => {
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", { name: `resetting with ${TOKEN}` }),
    ).toBeInTheDocument();
  });

  // A link somebody typed rather than followed still reaches the page, which
  // is the thing that knows how to say so.
  it("hands nothing off when the URL carries no token", async () => {
    search.mockReturnValue({ token: undefined });
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", { name: "no token" }),
    ).toBeInTheDocument();
  });
});

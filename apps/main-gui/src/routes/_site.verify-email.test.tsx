import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const search = vi.fn();

/* The page itself is stubbed. A route file owns the URL and what it hands to
 * the vertical, and that is all this file is about; what the page then does
 * with a token is tested beside it, in `security/verify-email.test.tsx`. The
 * stub also keeps the real page's `Link` out of here, which would want a
 * router this test has no reason to stand up. */
vi.mock("../security", () => ({
  VerifyEmail: ({ token }: { token: string | undefined }) => (
    <h2>{token ? `verifying ${token}` : "no token"}</h2>
  ),
}));

const { Route } = await import("./_site.verify-email");

/* The route reads the URL through its own `useSearch`, which needs a router;
 * it is answered here instead, the way `_site.auth.callback.test.tsx` does. */
Route.useSearch = search as unknown as typeof Route.useSearch;

/*
 * /verify-email, where the link in a verification mail lands.
 *
 * It is on the marketing shell rather than behind the login on purpose: the
 * link is opened by whoever reads the mailbox, which is the thing being
 * proved, and that may be a browser with no session in it. The token on the
 * URL is the authorization.
 *
 * What a route file owns is the URL and what it hands to the vertical, so what
 * is asserted here is the search parameter: that a token is read off the URL
 * and that anything that is not a string reads as absent. The page's own
 * behavior is tested beside it, in `security/verify-email.test.tsx`.
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
    expect(validate({ token: "3f2504e0-4f89-41d3-9a0c-0305e82c3301" })).toEqual(
      {
        token: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      },
    );
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
  it("hands the token off to the verification page", async () => {
    const Page = Route.options.component!;

    render(
      <Suspense fallback={null}>
        <Page />
      </Suspense>,
    );

    expect(
      await screen.findByRole("heading", { name: `verifying ${TOKEN}` }),
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

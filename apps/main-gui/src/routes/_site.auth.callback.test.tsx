import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Where every redirect flow comes back to: the three social providers, the
 * registration form, and the password reset.
 *
 * Two things here are easy to get wrong and expensive when they are. The
 * first is the state check -- a code arriving with a state we did not send is
 * somebody else's sign-in, and exchanging it would sign this browser in as
 * them. The second is that the code and the verifier are each good for
 * exactly one exchange, so StrictMode's second pass in development must not
 * spend them again and then report a sign-in that worked as unverifiable.
 */

const exchangeAuthorizationCode = vi.fn();
const takeRedirectVerifier = vi.fn();
const adoptTokens = vi.fn();
const navigate = vi.fn();
const search = vi.fn();

vi.mock("../authentication", () => ({
  exchangeAuthorizationCode,
  takeRedirectVerifier,
  useSession: () => ({ adoptTokens }),
}));

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));

const { Route } = await import("./_site.auth.callback");

/* The route reads the URL through its own `useSearch`, which needs a router;
 * it is answered here instead. */
Route.useSearch = search as unknown as typeof Route.useSearch;

const tokens = {
  accessToken: "an-access-token",
  refreshToken: "a-refresh-token",
  idToken: null,
  expiresAt: Date.now() + 300_000,
};

const renderCallback = (
  params: { code?: string; state?: string; error?: string } = {},
  { strict = false }: { strict?: boolean } = {},
) => {
  search.mockReturnValue(params);
  const Page = Route.options.component!;
  const page = (
    <ThemeProvider theme={theme}>
      <Page />
    </ThemeProvider>
  );
  return render(strict ? page : page, strict ? { reactStrictMode: true } : {});
};

beforeEach(() => {
  exchangeAuthorizationCode.mockReset().mockResolvedValue(tokens);
  takeRedirectVerifier.mockReset().mockReturnValue("a-verifier");
  adoptTokens.mockReset();
  navigate.mockReset().mockResolvedValue(undefined);
});

describe("what the page says", () => {
  it("says it is signing somebody in while it is", () => {
    renderCallback({ code: "a-code", state: "a-state" });

    expect(
      screen.getByRole("heading", { name: "Signing you in…" }),
    ).toBeInTheDocument();
  });
});

describe("a code that came back with the state we sent", () => {
  it("exchanges it with the verifier that round trip kept", async () => {
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() =>
      expect(exchangeAuthorizationCode).toHaveBeenCalledWith(
        "a-code",
        "a-verifier",
      ),
    );
    expect(takeRedirectVerifier).toHaveBeenCalledWith("a-state");
  });

  // A redirect flow crossed a page load to get here, so it only makes sense
  // as a remembered session.
  it("adopts the tokens as a remembered session, and goes to the dashboard", async () => {
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalledWith(tokens, true));
    expect(navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });
});

describe("a code that did not", () => {
  // Somebody else's sign-in, or a replayed one. Exchanging it would sign this
  // browser in as them.
  it("refuses to exchange it, and says the sign-in could not be verified", async () => {
    takeRedirectVerifier.mockReturnValue(null);
    renderCallback({ code: "a-code", state: "somebody-elses-state" });

    expect(
      await screen.findByRole("heading", { name: "Sign-in failed" }),
    ).toBeInTheDocument();
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
    expect(adoptTokens).not.toHaveBeenCalled();
  });
});

describe("coming back with no code at all", () => {
  // The provider was canceled, Keycloak refused, or this is a password reset
  // coming back, which ends at Keycloak and has nothing to exchange. None of
  // those is an error worth a page.
  it.each([
    ["nothing on the URL", {}],
    ["an error on the URL", { error: "access_denied" }],
    ["an error beside a code", { code: "a-code", error: "access_denied" }],
  ])("goes quietly home after %s", async (_case, params) => {
    renderCallback(params);

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: "/", replace: true }),
    );
    expect(exchangeAuthorizationCode).not.toHaveBeenCalled();
  });
});

describe("what the API said when the exchange failed", () => {
  it("is shown rather than a sentence of this page's own", async () => {
    exchangeAuthorizationCode.mockRejectedValue(
      new Error("Could not reach the identity provider."),
    );
    renderCallback({ code: "a-code", state: "a-state" });

    expect(
      await screen.findByText("Could not reach the identity provider."),
    ).toBeInTheDocument();
  });
});

describe("rendered twice, the way development renders everything twice", () => {
  // The code and the verifier are each good for exactly one exchange. Without
  // the attempt being kept, StrictMode's second pass finds the verifier spent
  // and reports a sign-in that in fact succeeded as unverifiable.
  it("exchanges the code once", async () => {
    renderCallback({ code: "a-code", state: "a-state" }, { strict: true });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(exchangeAuthorizationCode).toHaveBeenCalledTimes(1);
    expect(takeRedirectVerifier).toHaveBeenCalledTimes(1);
  });
});

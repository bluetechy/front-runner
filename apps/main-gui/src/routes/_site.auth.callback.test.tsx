import { ThemeProvider } from "@mui/material/styles";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";

/*
 * Where every redirect flow comes back to: the three social providers, the
 * registration form, the password reset, and the first leg of connecting a
 * provider from the security page.
 *
 * Two things here are easy to get wrong and expensive when they are. The
 * first is the state check -- a code arriving with a state we did not send is
 * somebody else's sign-in, and exchanging it would sign this browser in as
 * them. The second is that the code and the verifier are each good for
 * exactly one exchange, so StrictMode's second pass in development must not
 * spend them again and then report a sign-in that worked as unverifiable.
 *
 * The third is the link leg, which is the one flow that does not end here: it
 * carries on to the provider with the token this exchange just produced. What
 * matters is that a link that cannot be carried on is still a login, because
 * the account is signed in either way.
 *
 * The fourth is the trip back from setting up an authenticator app, which
 * lands on the security page rather than the dashboard so that the card that
 * asked for it can ask the API what really happened. Registering a passkey
 * is the fifth and is the same trip, with one difference worth asserting:
 * there is no kind to carry back, because an account has a list of passkeys
 * rather than one row per kind.
 */

const exchangeAuthorizationCode = vi.fn();
const takeRedirectVerifier = vi.fn();
const adoptTokens = vi.fn();
const navigate = vi.fn();
const search = vi.fn();
const takePendingAccountLink = vi.fn();
const resumeAccountLink = vi.fn();
const takePendingSecondFactor = vi.fn();
const takePendingPasskey = vi.fn();

vi.mock("../authentication", () => ({
  exchangeAuthorizationCode,
  takeRedirectVerifier,
  takePendingAccountLink,
  resumeAccountLink,
  takePendingSecondFactor,
  takePendingPasskey,
  setupReturnPath: (kind: string) => `/security-and-access?configured=${kind}`,
  passkeyReturnPath: (status: string | null) =>
    status === "cancelled" || status === "error"
      ? "/security-and-access?passkey=cancelled"
      : "/security-and-access?passkey=registered",
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
  params: {
    code?: string;
    state?: string;
    error?: string;
    kc_action_status?: string;
  } = {},
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
  takePendingAccountLink.mockReset().mockReturnValue(null);
  takePendingSecondFactor.mockReset().mockReturnValue(null);
  takePendingPasskey.mockReset().mockReturnValue(false);
  resumeAccountLink.mockReset().mockResolvedValue(true);
});

describe("what the page says", () => {
  it("says it is signing somebody in while it is", () => {
    renderCallback({ code: "a-code", state: "a-state" });

    expect(
      screen.getByRole("heading", { name: "Logging you in…" }),
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
      await screen.findByRole("heading", { name: "Login failed" }),
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

/*
 * The one flow that does not end here.
 *
 * Connecting a provider from the security page takes this trip first, because
 * the token our own login card mints names a session the browser holds no
 * cookie for and the provider's linking endpoint would refuse it. So the card
 * sends the browser round the ordinary way and carries on from here with the
 * token that comes back.
 */
describe("the first leg of connecting a provider", () => {
  it("carries on to the provider instead of landing on the dashboard", async () => {
    takePendingAccountLink.mockReturnValue("google");
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() =>
      expect(resumeAccountLink).toHaveBeenCalledWith("google", tokens),
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  // The account is signed in either way, and that is the half that must not be
  // lost: a provider with no linking endpoint, or a token naming no session,
  // is an ordinary login rather than a failure.
  it("lands on the dashboard when the connection cannot be carried on", async () => {
    takePendingAccountLink.mockReturnValue("google");
    resumeAccountLink.mockResolvedValue(false);
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/dashboard",
        replace: true,
      }),
    );
  });

  it("adopts the tokens before it goes anywhere", async () => {
    takePendingAccountLink.mockReturnValue("google");
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalledWith(tokens, true));
  });

  it("leaves an ordinary login alone", async () => {
    renderCallback({ code: "a-code", state: "a-state" });

    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: "/dashboard",
        replace: true,
      }),
    );
    expect(resumeAccountLink).not.toHaveBeenCalled();
  });
});

/*
 * The trip back from the identity provider's own authenticator-app setup
 * page. It is a login like any other -- there is a code on the URL and it is
 * exchanged the same way -- and then it lands somewhere else, because the
 * card that asked for it is the thing to look at and the only place that can
 * ask the API what really happened.
 */
describe("coming back from setting up an authenticator app", () => {
  it("lands on the security page with the kind it went to set up", async () => {
    takePendingSecondFactor.mockReturnValue("authenticator-app");
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({
      to: "/security-and-access?configured=authenticator-app",
      replace: true,
    });
  });

  // Taken rather than read, so the next ordinary login is not sent to the
  // security page claiming something has just been configured.
  it("takes the marker so a later login is unaffected", async () => {
    takePendingSecondFactor.mockReturnValue("authenticator-app");
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(takePendingSecondFactor).toHaveBeenCalled());
  });

  /* Connecting a provider is the other half-finished flow, and it comes
   * first: it leaves the page again, so there is nowhere to land. */
  it("leaves the connection leg ahead of it", async () => {
    takePendingAccountLink.mockReturnValue("google");
    resumeAccountLink.mockResolvedValue(true);
    takePendingSecondFactor.mockReturnValue("authenticator-app");
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(resumeAccountLink).toHaveBeenCalled());
    expect(navigate).not.toHaveBeenCalled();
  });
});

/*
 * And back from registering a passkey, which is the same trip with a
 * different action on it.
 *
 * What is different is what comes back. There is no kind, because an account
 * holds a list of passkeys rather than one row per kind. There *is* a status,
 * `kc_action_status`, and it is carried onto the security page for one job
 * only: telling an abandoned trip from a finished one. Whether a passkey was
 * really registered is still the API's answer rather than this URL's, which is
 * why a success and a missing status lead to the same place.
 */
describe("coming back from registering a passkey", () => {
  it("lands on the security page with the claim on the URL", async () => {
    takePendingPasskey.mockReturnValue(true);
    renderCallback({
      code: "a-code",
      state: "the-state",
      kc_action_status: "success",
    });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({
      to: "/security-and-access?passkey=registered",
      replace: true,
    });
  });

  /* The assertion this block gained when the status started being read. A trip
   * somebody abandoned at their browser's own dialog used to come back
   * indistinguishable from a finished one, and the page had to work out which
   * it was from how recently the newest credential had been registered.
   * Keycloak says so outright, and the word it says it with reaches the
   * page. */
  it("carries a dismissed dialog through as a trip that added nothing", async () => {
    takePendingPasskey.mockReturnValue(true);
    renderCallback({
      code: "a-code",
      state: "the-state",
      kc_action_status: "cancelled",
    });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({
      to: "/security-and-access?passkey=cancelled",
      replace: true,
    });
  });

  /* Nothing in this application puts that parameter there, so a trip coming
   * back without one is a provider that did not send it rather than a trip
   * that failed. The safe answer is the one that goes and asks. */
  it("goes and asks when the provider said nothing at all", async () => {
    takePendingPasskey.mockReturnValue(true);
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({
      to: "/security-and-access?passkey=registered",
      replace: true,
    });
  });

  // Taken rather than read, so the next ordinary login is not sent to the
  // security page claiming a passkey has just been added.
  it("takes the marker so a later login is unaffected", async () => {
    takePendingPasskey.mockReturnValue(true);
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(takePendingPasskey).toHaveBeenCalled());
  });

  /* Setting up a second factor comes first, because the two markers cannot
   * both be set by anything this application does and the older flow keeps
   * its place. A login with neither marker lands on the dashboard. */
  it("leaves the second-factor leg ahead of it", async () => {
    takePendingSecondFactor.mockReturnValue("authenticator-app");
    takePendingPasskey.mockReturnValue(true);
    renderCallback({ code: "a-code", state: "the-state" });

    await waitFor(() => expect(adoptTokens).toHaveBeenCalled());
    expect(navigate).toHaveBeenCalledWith({
      to: "/security-and-access?configured=authenticator-app",
      replace: true,
    });
  });
});

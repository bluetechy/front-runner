import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { SignInMethod } from "./sso-api";
import { SsoList } from "./sso-list";

/*
 * The providers this site can log somebody in from, one to a row.
 *
 * Most of what is worth asserting here is which rows offer what, because that
 * is where the card can do harm. A Disconnect on the account's only way in is
 * a button that locks somebody out of their own account; a Connect on a
 * provider the realm has switched off is a trip to a login page that would
 * refuse them.
 */

const method = (overrides: Partial<SignInMethod> = {}): SignInMethod => ({
  Alias: "google",
  Name: "Google",
  Available: true,
  Connected: false,
  ConnectedAs: null,
  CanDisconnect: false,
  ...overrides,
});

const draw = (
  methods: SignInMethod[],
  busyAlias: string | null = null,
  failed = false,
) => {
  const onConnect = vi.fn();
  const onDisconnect = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <SsoList
        methods={methods}
        loading={false}
        failed={failed}
        busyAlias={busyAlias}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    </ThemeProvider>,
  );
  return { onConnect, onDisconnect };
};

describe("a provider nobody has connected", () => {
  it("says what connecting it would be for, in the product's own word", () => {
    draw([method()]);

    expect(
      screen.getByText("Login with your Google account."),
    ).toBeInTheDocument();
  });

  it("offers Connect, and says which provider it is about", () => {
    const { onConnect } = draw([method()]);

    fireEvent.click(screen.getByRole("button", { name: "Connect" }));

    expect(onConnect).toHaveBeenCalledWith(
      expect.objectContaining({ Alias: "google" }),
    );
  });
});

describe("a provider the realm has switched off", () => {
  it("is still a row, because an account may already have it connected", () => {
    draw([method({ Available: false })]);

    expect(
      screen.getByText("Google is not switched on here yet."),
    ).toBeInTheDocument();
  });

  // Connecting one would be a trip to a login page the realm would refuse.
  it("offers nothing", () => {
    draw([method({ Available: false })]);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers Disconnect when it is connected anyway", () => {
    const { onDisconnect } = draw([
      method({ Available: false, Connected: true, CanDisconnect: true }),
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Disconnect" }));

    expect(onDisconnect).toHaveBeenCalled();
  });
});

describe("a provider this account has connected", () => {
  it("says what the account is called over there", () => {
    draw([
      method({
        Connected: true,
        ConnectedAs: "marcus@gmail.test",
        CanDisconnect: true,
      }),
    ]);

    expect(
      screen.getByText("Connected as marcus@gmail.test."),
    ).toBeInTheDocument();
  });

  it("says it is connected where the provider would not name it", () => {
    draw([method({ Connected: true, CanDisconnect: true })]);

    expect(screen.getByText("Connected to this account.")).toBeInTheDocument();
  });

  // The whole reason the API answers CanDisconnect at all. No button, and the
  // row says why: a control that refuses when it is pressed makes somebody ask
  // twice to get an answer the row could have given first.
  it("offers no way to take away the only way in, and says so", () => {
    draw([
      method({
        Connected: true,
        ConnectedAs: "marcus@gmail.test",
        CanDisconnect: false,
      }),
    ]);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.getByText(/It is your only way to login, so it cannot be/),
    ).toBeInTheDocument();
  });
});

describe("while something is in flight", () => {
  /* The two rows are told apart by what their buttons say rather than by where
   * they sit, because where they sit is the card's own decision and one the
   * tests below are about. */
  it("holds the row it is happening to, and leaves the rest alone", () => {
    draw(
      [
        method(),
        method({
          Alias: "facebook",
          Name: "Facebook",
          Connected: true,
          CanDisconnect: true,
        }),
      ],
      "google",
    );

    expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Disconnect" })).toBeEnabled();
  });
});

describe("before anything has been read", () => {
  it("waits rather than saying the site offers nothing", () => {
    render(
      <ThemeProvider theme={theme}>
        <SsoList
          methods={[]}
          loading
          failed={false}
          busyAlias={null}
          onConnect={vi.fn()}
          onDisconnect={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(
      screen.queryByText(
        "This site does not offer any other way to login yet.",
      ),
    ).not.toBeInTheDocument();
  });

  // A realm with no providers is a fair state rather than a broken one: this
  // application ships three aliases a realm may never be given credentials
  // for.
  it("says so plainly once it knows there are none", () => {
    draw([]);

    expect(
      screen.getByText("This site does not offer any other way to login yet."),
    ).toBeInTheDocument();
  });

  /* The third thing an empty list can mean, and the one it must not report as
   * the second. A card saying "this site offers nothing" under a red alert
   * saying the list could not be read is telling somebody their providers are
   * gone and that a failure to read them is why, in the same breath. */
  it("says nothing about the site when the list could not be read", () => {
    draw([], null, true);

    expect(
      screen.queryByText(
        "This site does not offer any other way to login yet.",
      ),
    ).not.toBeInTheDocument();
  });
});

/*
 * The order the rows read in, which is the opposite of the login card's and
 * deliberately so.
 *
 * Those buttons are a call to action: somebody is being asked to press one, so
 * the three are ranked by how likely an account is to exist. Nobody is being
 * asked to press anything here. This is a list of what an account already has,
 * read by somebody looking for one row in it, and ranking it by likelihood
 * would be this application guessing at somebody's own credentials on the one
 * page that knows the answer.
 */
const named = (alias: string, name: string) =>
  method({ Alias: alias, Name: name });

describe("the order they are read in", () => {
  it("is alphabetical, whatever order they arrived in", () => {
    draw([
      named("google", "Google"),
      named("facebook", "Facebook"),
      named("apple", "Apple ID"),
    ]);

    expect(
      screen
        .getAllByText(/^(Apple ID|Facebook|Google)$/)
        .map((n) => n.textContent),
    ).toEqual(["Apple ID", "Facebook", "Google"]);
  });

  // Not the login card's order, which is the assertion worth having: the two
  // lists disagree on purpose.
  it("is not the order the login card offers them in", () => {
    draw([
      named("google", "Google"),
      named("facebook", "Facebook"),
      named("apple", "Apple ID"),
    ]);

    expect(
      screen
        .getAllByText(/^(Apple ID|Facebook|Google)$/)
        .map((n) => n.textContent),
    ).not.toEqual(["Google", "Facebook", "Apple ID"]);
  });

  /* By what a provider is called rather than by its alias, because the name is
   * what somebody is reading down: "Apple ID" is on the row and "apple" is
   * not. */
  it("sorts on the name, not the alias", () => {
    draw([named("zoho", "Aardvark SSO"), named("apple", "Zebra ID")]);

    expect(
      screen
        .getAllByText(/^(Aardvark SSO|Zebra ID)$/)
        .map((n) => n.textContent),
    ).toEqual(["Aardvark SSO", "Zebra ID"]);
  });
});

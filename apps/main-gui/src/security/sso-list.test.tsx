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

const draw = (methods: SignInMethod[], busyAlias: string | null = null) => {
  const onConnect = vi.fn();
  const onDisconnect = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <SsoList
        methods={methods}
        loading={false}
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
  it("holds the row it is happening to, and leaves the rest alone", () => {
    draw([method(), method({ Alias: "facebook", Name: "Facebook" })], "google");

    const [google, facebook] = screen.getAllByRole("button");
    expect(google).toBeDisabled();
    expect(facebook).toBeEnabled();
  });
});

describe("before anything has been read", () => {
  it("waits rather than saying the site offers nothing", () => {
    render(
      <ThemeProvider theme={theme}>
        <SsoList
          methods={[]}
          loading
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
});

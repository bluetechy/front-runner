import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { TwoFactorMethod } from "./two-factor-api";
import { TwoFactorList } from "./two-factor-list";

/*
 * The second factors this product offers, one to a row.
 *
 * What is worth asserting is which row offers what and what each one says,
 * because that is where this card can do harm. A Turn on for a kind this
 * installation cannot use is a button that goes nowhere; an SMS row with
 * nothing said about it is this product recommending SMS by omission; and a
 * row that lost its order would put the weaker method first.
 */

const method = (overrides: Partial<TwoFactorMethod> = {}): TwoFactorMethod => ({
  Kind: "authenticator-app",
  Name: "Authenticator app",
  Available: true,
  Configured: false,
  ConfiguredAt: null,
  Label: null,
  Recommended: true,
  ...overrides,
});

const sms = (overrides: Partial<TwoFactorMethod> = {}): TwoFactorMethod =>
  method({
    Kind: "sms",
    Name: "SMS/Text message",
    Available: false,
    Recommended: false,
    ...overrides,
  });

const draw = (
  methods: TwoFactorMethod[],
  {
    busyKind = null,
    failed = false,
    canEnable = () => true,
  }: {
    busyKind?: string | null;
    failed?: boolean;
    canEnable?: (kind: string) => boolean;
  } = {},
) => {
  const onEnable = vi.fn();
  const onDisable = vi.fn();
  render(
    <ThemeProvider theme={theme}>
      <TwoFactorList
        methods={methods}
        loading={false}
        failed={failed}
        busyKind={busyKind}
        canEnable={canEnable}
        onEnable={onEnable}
        onDisable={onDisable}
      />
    </ThemeProvider>,
  );
  return { onEnable, onDisable };
};

describe("what each row offers", () => {
  it("offers Turn on for a kind that is available and not configured", () => {
    const { onEnable } = draw([method()]);

    fireEvent.click(screen.getByRole("button", { name: "Turn on" }));

    expect(onEnable).toHaveBeenCalledWith(
      expect.objectContaining({ Kind: "authenticator-app" }),
    );
  });

  it("offers Turn off for one that is configured", () => {
    const { onDisable } = draw([method({ Configured: true })]);

    fireEvent.click(screen.getByRole("button", { name: "Turn off" }));

    expect(onDisable).toHaveBeenCalled();
  });

  /* Nothing rather than a disabled button: a control that refuses when it is
   * pressed makes somebody ask the question twice to get an answer the row
   * could have given first. */
  it("offers nothing on a kind this installation cannot use", () => {
    draw([sms()]);

    expect(screen.queryByRole("button")).toBeNull();
  });

  // The provider offers it, but this deployment has no way to ask for the
  // setup page -- an empty action in the environment. Same rule again.
  it("offers nothing when the setup trip cannot be started", () => {
    draw([method()], { canEnable: () => false });

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("dims the row that has something in flight", () => {
    draw([method({ Configured: true })], { busyKind: "authenticator-app" });

    expect(screen.getByRole("button", { name: "Turn off" })).toBeDisabled();
  });
});

describe("what each row says", () => {
  it("marks a configured row, and says when it was set up and what it is called", () => {
    draw([
      method({
        Configured: true,
        Label: "iPhone",
        ConfiguredAt: "2026-09-01T10:00:00.000Z",
      }),
    ]);

    expect(screen.getByText("Configured")).toBeInTheDocument();
    expect(screen.getByText(/Set up as iPhone, on/)).toBeInTheDocument();
  });

  /* The mock-up's own judgment, and this product's: the row argues with the
   * reader because the better option is one tap above it. */
  it("marks SMS as the weaker one and says why", () => {
    draw([sms()]);

    expect(screen.getByText("Less secure")).toBeInTheDocument();
    expect(screen.getByText(/intercepted/)).toBeInTheDocument();
  });

  it("says a switched-off kind is not switched on here yet", () => {
    draw([sms()]);

    expect(screen.getByText(/Not switched on here yet/)).toBeInTheDocument();
  });

  it("does not mark the recommended one as less secure", () => {
    draw([method()]);

    expect(screen.queryByText("Less secure")).toBeNull();
  });
});

describe("the order the rows are read in", () => {
  /* The API's order, not sorted. Alphabetically, SMS would come first and
   * this card would be recommending it by position. */
  it("keeps the API's order rather than sorting the names", () => {
    draw([method(), sms()]);

    const names = screen
      .getAllByText(/Authenticator app|SMS\/Text message/)
      .map((node) => node.textContent);
    expect(names[0]).toBe("Authenticator app");
  });
});

describe("when there is nothing to draw", () => {
  it("says so when the API offered nothing", () => {
    draw([]);

    expect(screen.getByText(/does not offer a second factor/)).toBeVisible();
  });

  /* Empty because the read failed is not the same as empty because there is
   * nothing on offer, and the card above has already said which. Saying both
   * would be telling somebody their factors are gone. */
  it("says nothing at all when the read failed", () => {
    draw([], { failed: true });

    expect(screen.queryByText(/does not offer a second factor/)).toBeNull();
  });
});

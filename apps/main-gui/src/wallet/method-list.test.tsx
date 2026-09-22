import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import { MethodList } from "./method-list";
import type { PaymentMethod } from "./wallet-api";

/*
 * The saved payment methods, as a list of radios: choosing one is choosing
 * the default, which is the only thing a whole row means.
 *
 * Four digits is the whole of what is kept in the clear -- the rest is
 * encrypted and never comes back from the API -- so a row has to be legible
 * from those four digits, a brand and an expiry. Every row is also a card or
 * a bank account, and the fields only one of them has are null on the other.
 */

const onChooseDefault = vi.fn();
const onRemove = vi.fn();

const card = (overrides: Partial<PaymentMethod> = {}): PaymentMethod =>
  ({
    Kind: "CreditCard",
    PaymentMethodUUID: "c0000000-0000-4000-8000-000000000001",
    NameOnMethod: "Marcus Member",
    Last4: "1111",
    Brand: "Visa",
    ExpirationMonth: 4,
    ExpirationYear: 2029,
    IsExpired: false,
    AccountType: null,
    RoutingNumber: null,
    BillingLine1: "2896 S 9150 W",
    BillingCity: "Magna",
    BillingState: "UT",
    BillingPostalCode: "84044",
    BillingCountry: "United States",
    IsDefault: true,
    CreatedAt: new Date().toISOString(),
    ...overrides,
  }) as PaymentMethod;

const account = (overrides: Partial<PaymentMethod> = {}): PaymentMethod =>
  ({
    ...card(),
    Kind: "BankAccount",
    PaymentMethodUUID: "b0000000-0000-4000-8000-000000000002",
    Last4: "6789",
    Brand: null,
    ExpirationMonth: null,
    ExpirationYear: null,
    AccountType: "Checking",
    RoutingNumber: "021000021",
    BillingLine1: null,
    BillingCity: null,
    BillingState: null,
    BillingPostalCode: null,
    BillingCountry: null,
    IsDefault: false,
    ...overrides,
  }) as PaymentMethod;

const renderList = (
  props: Partial<React.ComponentProps<typeof MethodList>> = {},
) =>
  render(
    <ThemeProvider theme={theme}>
      <MethodList
        methods={[card(), account()]}
        loading={false}
        busyId={null}
        onChooseDefault={onChooseDefault}
        onRemove={onRemove}
        {...props}
      />
    </ThemeProvider>,
  );

beforeEach(() => {
  onChooseDefault.mockClear();
  onRemove.mockClear();
});

describe("a wallet with nothing in it", () => {
  // Not an empty box: the first thing saved becomes the default, and saying
  // so here is the only place that is explained.
  it("says so, and says what to do about it", () => {
    renderList({ methods: [] });

    expect(screen.getByText("Nothing saved yet")).toBeInTheDocument();
    expect(
      screen.getByText(/The first one you save becomes the default/),
    ).toBeInTheDocument();
  });

  // Saying "nothing saved" and then changing its mind is worse than waiting.
  it("waits rather than saying so before it knows", () => {
    const { container } = renderList({ methods: [], loading: true });

    expect(screen.queryByText("Nothing saved yet")).toBeNull();
    expect(container.querySelectorAll(".MuiSkeleton-root")).toHaveLength(2);
  });
});

describe("a card", () => {
  it("shows the four digits it is allowed to show, and nothing more", () => {
    renderList({ methods: [card()] });

    expect(screen.getByText(/1111/)).toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
  });

  // The API sends the month and the year apart, because a card expires at the
  // end of a month and there is no day in it.
  it("reads the expiry back the way a card prints it", () => {
    renderList({ methods: [card()] });

    expect(screen.getByText("Expires 04/2029")).toBeInTheDocument();
  });

  // A fact about today rather than a stored one, and worth saying loudly:
  // a card that has expired will not be charged.
  it("says so when it has expired", () => {
    renderList({ methods: [card({ IsExpired: true })] });

    expect(screen.getByText("Expired")).toBeInTheDocument();
  });
});

describe("a bank account", () => {
  it("shows what it is and which bank it is at", () => {
    renderList({ methods: [account()] });

    expect(screen.getByText(/Checking · routing 021000021/)).toBeVisible();
  });

  // A bank account never expires, and an "Expires —" line would be noise.
  it("says nothing about an expiry it does not have", () => {
    renderList({ methods: [account()] });

    expect(screen.queryByText(/Expires/)).toBeNull();
  });
});

describe("the default", () => {
  it("marks the one that is, and only that one", () => {
    renderList();

    expect(screen.getAllByText("Default")).toHaveLength(1);
  });

  it("chooses another when its radio is pressed", () => {
    renderList();

    fireEvent.click(
      screen.getByRole("radio", {
        name: "Use the bank account ending 6789 by default",
      }),
    );

    expect(onChooseDefault).toHaveBeenCalledWith(
      expect.objectContaining({ Last4: "6789" }),
    );
  });

  // The row's meaning is spread over several lines beside the radio, so the
  // radio says what it is in one sentence.
  it("names what each radio would make the default", () => {
    renderList();

    expect(
      screen.getByRole("radio", {
        name: "Use the Visa ending 1111 by default",
      }),
    ).toBeInTheDocument();
  });

  /* A card whose brand the API could not work out is still a card, and
   * "the ending 1111" would not be a sentence. */
  it("calls a card with no brand a card", () => {
    renderList({ methods: [card({ Brand: null })] });

    expect(
      screen.getByRole("radio", {
        name: "Use the card ending 1111 by default",
      }),
    ).toBeInTheDocument();
  });

  it("leaves the group with nothing chosen when nothing is the default", () => {
    renderList({ methods: [card({ IsDefault: false })] });

    expect(screen.getByRole("radio")).not.toBeChecked();
  });
});

describe("removing one", () => {
  it("says which one it is removing", () => {
    renderList();

    fireEvent.click(screen.getAllByRole("button", { name: /Remove/ })[1]!);

    expect(onRemove).toHaveBeenCalledWith(
      expect.objectContaining({ Last4: "6789" }),
    );
  });

  // Both actions rewrite the whole wallet, so a second one started underneath
  // the first would be answering about a list that no longer exists.
  it("holds the row that is already saving, and leaves the rest alone", () => {
    renderList({ busyId: "c0000000-0000-4000-8000-000000000001" });
    const buttons = screen.getAllByRole("button", { name: /Remove/ });

    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });
});

import { ThemeProvider } from "@mui/material/styles";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { theme } from "../design-system";
import type { PaymentMethod } from "./wallet-api";

/*
 * The payment wallet page: the saved methods, the two ways to add one, and
 * what the page says back afterwards.
 *
 * The API and both dialogs are stubbed -- each has a test of its own -- so
 * what is under test here is the page's own work: which row is held while a
 * save is in flight, and what it says when one finishes or fails.
 *
 * This page still has its own `Snackbar` rather than the shared `<Toast>`,
 * and it sits bottom-center rather than bottom-right. That is the one thing
 * left to do about the duplication -- see docs/codebase-structure.md -- so
 * the assertions below are about what it says, not where it sits.
 */

const wallet = vi.fn();
const setDefault = vi.fn();
const remove = vi.fn();
const addCreditCard = vi.fn();
const addBankAccount = vi.fn();

vi.mock("./wallet-api", () => ({ useWallet: () => wallet() }));

vi.mock("./add-card-dialog", () => ({
  AddCardDialog: ({
    open,
    onSave,
  }: {
    open: boolean;
    onSave: (card: unknown) => Promise<unknown>;
  }) =>
    open ? (
      <button onClick={() => void onSave({ Number: "4111111111111111" })}>
        Save the card
      </button>
    ) : null,
}));

vi.mock("./add-bank-dialog", () => ({
  AddBankDialog: ({
    open,
    onSave,
  }: {
    open: boolean;
    onSave: (account: unknown) => Promise<unknown>;
  }) =>
    open ? (
      <button onClick={() => void onSave({ RoutingNumber: "021000021" })}>
        Save the account
      </button>
    ) : null,
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...rest
  }: {
    children: React.ReactNode;
    to: string;
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const { Wallet } = await import("./wallet");

const method = (overrides: Partial<PaymentMethod> = {}): PaymentMethod =>
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
    BillingLine1: null,
    BillingCity: null,
    BillingState: null,
    BillingPostalCode: null,
    BillingCountry: null,
    IsDefault: true,
    CreatedAt: new Date().toISOString(),
    ...overrides,
  }) as PaymentMethod;

const renderPage = (state: Record<string, unknown> = {}) => {
  wallet.mockReturnValue({
    methods: [method()],
    loading: false,
    error: null,
    addCreditCard,
    addBankAccount,
    setDefault,
    remove,
    ...state,
  });
  return render(
    <ThemeProvider theme={theme}>
      <Wallet />
    </ThemeProvider>,
  );
};

beforeEach(() => {
  for (const spy of [setDefault, remove, addCreditCard, addBankAccount])
    spy.mockReset().mockResolvedValue(undefined);
});

describe("the page", () => {
  it("is titled, and says where it sits", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Payment Wallet", level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("shows what is saved", () => {
    renderPage();

    expect(screen.getByText(/1111/)).toBeInTheDocument();
  });

  // A wallet that could not be read is a different thing from an empty one
  // and has to say so rather than look like one.
  it("says when the wallet could not be read at all", () => {
    renderPage({ methods: [], error: "Your session has expired." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired.",
    );
  });
});

describe("adding a method", () => {
  it("opens nothing until one of the two buttons is pressed", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: "Save the card" })).toBeNull();
  });

  it("saves a card and says so", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
    fireEvent.click(screen.getByRole("button", { name: "Save the card" }));

    await waitFor(() => expect(addCreditCard).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent("Card saved.");
  });

  it("saves a bank account and says so", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add a bank account" }));
    fireEvent.click(screen.getByRole("button", { name: "Save the account" }));

    await waitFor(() => expect(addBankAccount).toHaveBeenCalled());
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Bank account saved.",
    );
  });

  // One at a time: the two dialogs are the same piece of state.
  it("opens one dialog at a time", () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
    fireEvent.click(screen.getByRole("button", { name: "Add a bank account" }));

    expect(screen.queryByRole("button", { name: "Save the card" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Save the account" }),
    ).toBeInTheDocument();
  });
});

describe("changing the default", () => {
  it("sets it, and says so", async () => {
    renderPage({
      methods: [
        method({ IsDefault: false }),
        method({
          PaymentMethodUUID: "b-id",
          Kind: "BankAccount",
          Last4: "6789",
          Brand: null,
          AccountType: "Checking",
          RoutingNumber: "021000021",
          ExpirationMonth: null,
          ExpirationYear: null,
          IsDefault: true,
        }),
      ],
    });

    fireEvent.click(
      screen.getByRole("radio", { name: /Use the Visa ending 1111/ }),
    );

    await waitFor(() =>
      expect(setDefault).toHaveBeenCalledWith(
        "CreditCard",
        "c0000000-0000-4000-8000-000000000001",
      ),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Default payment method updated.",
    );
  });
});

describe("removing one", () => {
  // Removing the default hands it to the oldest of what is left, so the list
  // reorders itself and the sentence has to say why.
  it("says what happened to the default when the default is removed", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The oldest remaining method is now the default.",
    );
  });

  it("says less when what was removed was not the default", async () => {
    renderPage({ methods: [method({ IsDefault: false })] });

    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Removed.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("oldest");
  });

  // The API's own words, because it is the authority on why it refused.
  it("shows what the API said when it refused", async () => {
    remove.mockRejectedValue(new Error("That method is already gone."));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Remove/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That method is already gone.",
    );
  });
});

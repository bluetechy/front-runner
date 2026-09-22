import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BankAccountFields, CreditCardFields } from "./wallet-schema";

/*
 * Reading and writing the signed-in person's wallet.
 *
 * Every one of the four writes answers with the whole wallet rather than the
 * row it touched, because all four can move the default: the first method
 * saved becomes it, and removing the default promotes another. So the list on
 * screen is always replaced wholesale, which is what this file pins.
 */

const status = vi.fn(() => "signed-in");
const getAccessToken = vi.fn(async () => "a-token" as string | null);
const fetchMock = vi.fn();

vi.mock("../authentication", () => ({
  useSession: () => ({ status: status(), getAccessToken }),
}));

const { useWallet } = await import("./wallet-api");

const method = (overrides: Record<string, unknown> = {}) => ({
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
});

const nextYear = new Date().getFullYear() + 2;

const validCard = {
  NameOnCard: "Marcus Member",
  Number: "4111 1111 1111 1111",
  SecurityCode: "123",
  ExpirationMonth: 4,
  ExpirationYear: nextYear,
  BillingLine1: "2896 S 9150 W",
  BillingCity: "Magna",
  BillingState: "UT",
  BillingPostalCode: "84044",
  BillingCountry: "United States",
} as unknown as CreditCardFields;

const validAccount = {
  NameOnAccount: "Marcus Member",
  AccountType: "Checking",
  RoutingNumber: "021000021",
  Number: "000123456789",
} as unknown as BankAccountFields;

const answering = (wallet: unknown, errors?: { message: string }[]) =>
  fetchMock.mockResolvedValue({
    json: async () => (errors ? { errors } : { data: { wallet } }),
  });

/* A handle on the hook's own answer, for the tests that call into it
 * rather than press something. Held on an object rather than in a variable
 * the component reassigns, which is a thing a component must not do. */
const held: { api?: ReturnType<typeof useWallet> } = {};
const api = () => held.api!;

function Reader() {
  const current = useWallet();
  /* Kept for the tests that call into it rather than press something. In an
   * effect rather than during the render, because a component that writes to
   * something outside itself while rendering is the bug this test is not
   * about. */
  useEffect(() => {
    held.api = current;
  });
  return (
    <p>
      {current.loading ? "waiting" : `${current.methods.length} saved`}
      {current.error ? `: ${current.error}` : ""}
    </p>
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  status.mockReturnValue("signed-in");
  getAccessToken.mockReset().mockResolvedValue("a-token");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const settled = async () => {
  answering([method()]);
  render(<Reader />);
  await screen.findByText("1 saved");
};

describe("reading the wallet", () => {
  it("asks for it with the token the session holds", async () => {
    await settled();

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request.headers.Authorization).toBe("Bearer a-token");
  });

  // Saying the wallet is empty and changing its mind a moment later is worse
  // than saying nothing.
  it("waits rather than saying the wallet is empty", async () => {
    answering([method()]);
    render(<Reader />);

    expect(screen.getByText("waiting")).toBeInTheDocument();
    expect(await screen.findByText("1 saved")).toBeInTheDocument();
  });

  it("asks for nothing until somebody is signed in", () => {
    status.mockReturnValue("loading");

    render(<Reader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops waiting even when the API refuses", async () => {
    answering(null, [{ message: "A Bearer token is required" }]);
    render(<Reader />);

    expect(
      await screen.findByText(/A Bearer token is required/),
    ).toBeInTheDocument();
  });

  it("says so rather than calling when the session has gone", async () => {
    getAccessToken.mockResolvedValue(null);
    render(<Reader />);

    expect(await screen.findByText(/session has expired/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("adding a method", () => {
  // The schema strips the separators a card number is printed with, and what
  // is sent should be what was validated.
  it("sends the card the schema parsed rather than what was typed", async () => {
    await settled();

    answering([method(), method({ PaymentMethodUUID: "two" })]);
    await act(() =>
      api()
        .addCreditCard(validCard)
        .then(() => undefined),
    );

    const [, request] = fetchMock.mock.calls.at(-1) ?? [];
    expect(JSON.parse(request.body).variables.card.Number).toBe(
      "4111111111111111",
    );
  });

  it("sends a bank account the same way", async () => {
    await settled();

    answering([method()]);
    await act(() =>
      api()
        .addBankAccount(validAccount)
        .then(() => undefined),
    );

    const [, request] = fetchMock.mock.calls.at(-1) ?? [];
    expect(JSON.parse(request.body).variables.account.RoutingNumber).toBe(
      "021000021",
    );
  });

  // All four writes answer with the whole wallet, because all four can move
  // the default.
  it("replaces the whole wallet with what came back", async () => {
    await settled();

    answering([method(), method({ PaymentMethodUUID: "two" })]);
    await act(() =>
      api()
        .addCreditCard(validCard)
        .then(() => undefined),
    );

    expect(screen.getByText("2 saved")).toBeInTheDocument();
  });
});

describe("changing the wallet", () => {
  it("names the kind as well as the method when choosing a default", async () => {
    await settled();

    answering([method()]);
    await act(() =>
      api()
        .setDefault("BankAccount", "b-id")
        .then(() => undefined),
    );

    expect(JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body).variables).toEqual(
      { kind: "BankAccount", paymentMethodId: "b-id" },
    );
  });

  it("names both when removing one, and takes the row out of the list", async () => {
    await settled();

    answering([]);
    await act(() =>
      api()
        .remove("CreditCard", "c-id")
        .then(() => undefined),
    );

    expect(JSON.parse(fetchMock.mock.calls.at(-1)?.[1].body).variables).toEqual(
      { kind: "CreditCard", paymentMethodId: "c-id" },
    );
    expect(screen.getByText("0 saved")).toBeInTheDocument();
  });

  // The page shows the API's own words in a toast, so the failure has to
  // reach it rather than being swallowed here.
  it("hands a refusal back to the caller", async () => {
    await settled();

    answering(null, [{ message: "That card is already saved." }]);

    await expect(api().addCreditCard(validCard)).rejects.toThrow(
      "That card is already saved.",
    );
  });

  it("clears an earlier failure once a write works", async () => {
    answering(null, [{ message: "Could not reach the API." }]);
    render(<Reader />);
    await screen.findByText(/Could not reach the API./);

    answering([method()]);
    await act(() =>
      api()
        .addCreditCard(validCard)
        .then(() => undefined),
    );

    expect(screen.queryByText(/Could not reach the API./)).toBeNull();
  });
});

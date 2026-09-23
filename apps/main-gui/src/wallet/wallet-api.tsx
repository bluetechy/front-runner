import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import {
  bankAccountSchema,
  creditCardSchema,
  type BankAccountFields,
  type CreditCardFields,
} from "./wallet-schema";

/*
 * The signed-in person's saved payment methods.
 *
 * A hook rather than a provider, unlike the profile: nothing outside this page
 * wants a wallet, so there is nothing to share it with and no reason to fetch
 * it before somebody asks for it. If the rail or the billing page ever needs
 * the default method, this becomes a provider mounted where they both are, the
 * way `profile-api.tsx` is.
 *
 * Every mutation answers with the **whole wallet**, because every one of them
 * can move the default -- the first method saved takes it, and removing the
 * one that has it passes it on. So each of these replaces the list rather than
 * patching it, and the page never has to work out what else changed.
 */

/* Every field of a method, in one place: the query and the four mutations ask
 * for the same selection, so a field added to a wallet is added once here. */
const METHOD_FIELDS = `Kind PaymentMethodUUID NameOnMethod Last4 Brand
  ExpirationMonth ExpirationYear IsExpired AccountType RoutingNumber
  BillingLine1 BillingCity BillingState BillingPostalCode BillingCountry
  IsDefault CreatedAt`;

const READ = `query PaymentMethods { paymentMethods { ${METHOD_FIELDS} } }`;

const ADD_CARD = `mutation AddCreditCard($card: CreditCardInput!) {
  addCreditCard(card: $card) { ${METHOD_FIELDS} }
}`;

const ADD_ACCOUNT = `mutation AddBankAccount($account: BankAccountInput!) {
  addBankAccount(account: $account) { ${METHOD_FIELDS} }
}`;

const SET_DEFAULT = `mutation SetDefault($kind: PaymentMethodKind!, $paymentMethodId: String!) {
  setDefaultPaymentMethod(kind: $kind, paymentMethodId: $paymentMethodId) { ${METHOD_FIELDS} }
}`;

const REMOVE = `mutation Remove($kind: PaymentMethodKind!, $paymentMethodId: String!) {
  removePaymentMethod(kind: $kind, paymentMethodId: $paymentMethodId) { ${METHOD_FIELDS} }
}`;

export type PaymentMethodKind = "CreditCard" | "BankAccount";

/*
 * One saved method. The shape is the union of a card and a bank account, so
 * the fields only one of them has are null on the other: `Kind` says which one
 * you are holding and is the first thing to branch on.
 *
 * There is no card number here and there never will be -- the API holds it
 * encrypted and hands nothing back but the last four digits.
 */
export interface PaymentMethod {
  Kind: PaymentMethodKind;
  PaymentMethodUUID: string;
  NameOnMethod: string;
  Last4: string;
  Brand: string | null;
  ExpirationMonth: number | null;
  ExpirationYear: number | null;
  IsExpired: boolean;
  AccountType: string | null;
  RoutingNumber: string | null;
  BillingLine1: string | null;
  BillingCity: string | null;
  BillingState: string | null;
  BillingPostalCode: string | null;
  BillingCountry: string | null;
  IsDefault: boolean;
  CreatedAt: string;
}

export function useWallet() {
  const { status, getAccessToken } = useSession();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  /* True until the first answer arrives, so the list can wait rather than
   * saying the wallet is empty and changing its mind a moment later. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async (
      query: string,
      variables: Record<string, unknown>,
    ): Promise<PaymentMethod[]> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session has expired. Sign in again.");

      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await response.json()) as {
        data?: Record<string, PaymentMethod[] | null>;
        errors?: { message: string }[];
      };
      /* The API answers 200 with an errors array, so the status says nothing;
       * the first message is the one worth showing. */
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      const [result] = Object.values(body.data ?? {});
      if (!result) throw new Error("The API returned no wallet.");
      return result;
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call(READ, {})
      .then((loaded) => {
        if (!canceled) setMethods(loaded);
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not reach the API.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  const replace = useCallback(async (run: Promise<PaymentMethod[]>) => {
    const wallet = await run;
    setMethods(wallet);
    setError(null);
    return wallet;
  }, []);

  /* Parsed rather than sent as typed: the schema strips the separators a card
   * number is printed with, and what is sent should be what was validated.
   * The API checks it again regardless. */
  const addCreditCard = useCallback(
    (card: CreditCardFields) =>
      replace(call(ADD_CARD, { card: creditCardSchema.parse(card) })),
    [call, replace],
  );

  const addBankAccount = useCallback(
    (account: BankAccountFields) =>
      replace(call(ADD_ACCOUNT, { account: bankAccountSchema.parse(account) })),
    [call, replace],
  );

  const setDefault = useCallback(
    (kind: PaymentMethodKind, paymentMethodId: string) =>
      replace(call(SET_DEFAULT, { kind, paymentMethodId })),
    [call, replace],
  );

  const remove = useCallback(
    (kind: PaymentMethodKind, paymentMethodId: string) =>
      replace(call(REMOVE, { kind, paymentMethodId })),
    [call, replace],
  );

  return {
    methods,
    loading,
    error,
    addCreditCard,
    addBankAccount,
    setDefault,
    remove,
  };
}

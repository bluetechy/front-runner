import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { useApiCall } from "./api-call";

/*
 * The second factor in front of the account's password, and the codes that
 * get somebody back in when it is gone.
 *
 * One hook for both cards, beside `useEmails`, `useSecurityActivity`,
 * `usePassword` and `useSignInMethods`, and one rather than two because the
 * two cards are one subject: making a set of recovery codes is the thing to
 * do after turning a factor on, and spending one is what turns it off.
 *
 * **Turning one on is not here**, because it does not happen in this
 * application at all: the browser leaves for the identity provider's setup
 * page and comes back. What is here is the other end of that trip --
 * `confirm`, which hands the API the kind named on the URL and gets back the
 * rows as the provider now actually has them. The API believes the URL no
 * more than this does.
 *
 * Every write answers the whole list, and the list is replaced by what came
 * back rather than edited in place: the same rule `sso-api.tsx` keeps, for
 * the same reason.
 */

const READ = `query TwoFactor {
  twoFactorMethods { Kind Name Available Configured ConfiguredAt Label Recommended }
  recoveryCodes { Remaining Total GeneratedAt }
}`;

const DISABLE = `mutation DisableTwoFactorMethod($kind: String!) {
  disableTwoFactorMethod(kind: $kind) {
    Kind Name Available Configured ConfiguredAt Label Recommended
  }
}`;

const CONFIRM = `mutation ConfirmTwoFactorMethod($kind: String!) {
  confirmTwoFactorMethod(kind: $kind) {
    Kind Name Available Configured ConfiguredAt Label Recommended
  }
}`;

const GENERATE = `mutation GenerateRecoveryCodes {
  generateRecoveryCodes {
    Codes
    Status { Remaining Total GeneratedAt }
  }
}`;

export interface TwoFactorMethod {
  Kind: string;
  Name: string;
  /* Whether this installation can use it at all. False for SMS until there is
   * somewhere for the messages to go, and the row says so rather than being
   * left out. */
  Available: boolean;
  Configured: boolean;
  /* ISO 8601 from the API, formatted where it is drawn. Null on a row that is
   * not configured, and on one the provider would not date. */
  ConfiguredAt: string | null;
  Label: string | null;
  /* Whether this product recommends it. The judgment is the API's, so that a
   * second client could not quietly disagree about which factor is weaker. */
  Recommended: boolean;
}

export interface RecoveryCodeStatus {
  Remaining: number;
  Total: number;
  GeneratedAt: string | null;
}

export function useTwoFactor() {
  const { status } = useSession();
  const [methods, setMethods] = useState<TwoFactorMethod[]>([]);
  const [codes, setCodes] = useState<RecoveryCodeStatus>({
    Remaining: 0,
    Total: 0,
    GeneratedAt: null,
  });
  const [loading, setLoading] = useState(true);
  /* Reported rather than swallowed: these two cards are what somebody reads
   * to find out whether their account has a second factor, and a list that
   * could not be read must not draw as an account that has none. */
  const [error, setError] = useState<string | null>(null);

  const call = useApiCall(
    "The API returned nothing about your two-factor authentication.",
  );

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    /* Both cards in one round trip. They are read together and drawn
     * together, and two calls would let the page show a factor without
     * knowing whether there were codes behind it. */
    call<{
      twoFactorMethods: TwoFactorMethod[];
      recoveryCodes: RecoveryCodeStatus;
    }>(READ, {}, "document")
      .then((loaded) => {
        if (canceled) return;
        setMethods(loaded.twoFactorMethods);
        setCodes(loaded.recoveryCodes);
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Your two-factor authentication could not be read.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  const disable = useCallback(
    async (kind: string) => {
      setMethods(await call<TwoFactorMethod[]>(DISABLE, { kind }));
    },
    [call],
  );

  /* The browser is back from the provider's setup page. What this answers is
   * the row as the API found it rather than as the URL claimed it: null for a
   * kind that is not in the list, and a row whose `Configured` is false for a
   * trip that did not finish. */
  const confirm = useCallback(
    async (kind: string): Promise<TwoFactorMethod | null> => {
      const after = await call<TwoFactorMethod[]>(CONFIRM, { kind });
      setMethods(after);
      return after.find((method) => method.Kind === kind) ?? null;
    },
    [call],
  );

  /* The one call in this file whose answer is a secret. The codes are handed
   * to the caller and never kept here: what this hook holds afterwards is the
   * count, which is all the card shows once the dialog is shut. */
  const generate = useCallback(async (): Promise<string[]> => {
    const made = await call<{ Codes: string[]; Status: RecoveryCodeStatus }>(
      GENERATE,
      {},
    );
    setCodes(made.Status);
    return made.Codes;
  }, [call]);

  return { methods, codes, loading, error, disable, confirm, generate };
}

import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { useApiCall } from "./api-call";

/*
 * The passkeys an account can login with instead of typing a password.
 *
 * One hook for one card, beside `useEmails`, `useSecurityActivity`,
 * `usePassword`, `useSignInMethods` and `useTwoFactor`.
 *
 * **Registering one is not here**, because it does not happen in this
 * application at all: the browser leaves for the identity provider's own
 * page and comes back. What is here is the other end of that trip --
 * `confirm`, which asks the API what the account now holds and gets back
 * both the rows and whether one of them is new. The API believes the URL no
 * more than this does; see `passkey-setup.ts` for why the ceremony cannot
 * happen on this origin.
 *
 * Every write answers the whole list, and the list is replaced by what came
 * back rather than edited in place: the same rule `sso-api.tsx` and
 * `two-factor-api.tsx` keep, for the same reason.
 */

const READ = `query Passkeys {
  passkeys { Id Label CreatedAt }
}`;

const CONFIRM = `mutation ConfirmPasskey {
  confirmPasskey {
    Registered
    Passkeys { Id Label CreatedAt }
  }
}`;

const REMOVE = `mutation RemovePasskey($id: String!) {
  removePasskey(id: $id) { Id Label CreatedAt }
}`;

export interface Passkey {
  /* The identity provider's handle for it, carried back unread: it is what
   * `remove` is addressed by and it is on no row anybody looks at. */
  Id: string;
  /* What it was named where it was registered. Null wherever nobody was
   * asked, which the list draws as an unnamed key rather than as a blank. */
  Label: string | null;
  /* ISO 8601 from the API, formatted where it is drawn. Null on one the
   * provider would not date. */
  CreatedAt: string | null;
}

/* What came of the trip to the provider's registration page: the rows as
 * they now are, and whether one of them is new. The second cannot be worked
 * out from the first by anything on this side -- the page left, and the list
 * it remembers is from before it went. */
export interface PasskeyRegistration {
  Registered: boolean;
  Passkeys: Passkey[];
}

export function usePasskeys() {
  const { status } = useSession();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(true);
  /* Reported rather than swallowed: this card is what somebody reads to find
   * out what can get into their account without a password, and a list that
   * could not be read must not draw as an account that has none. */
  const [error, setError] = useState<string | null>(null);

  const call = useApiCall("The API returned nothing about your passkeys.");

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call<Passkey[]>(READ, {})
      .then((loaded) => {
        if (!canceled) setPasskeys(loaded);
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Your passkeys could not be read.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  /* The browser is back from the provider's registration page. What this
   * answers is what the API found rather than what the URL claimed: false
   * for a ceremony somebody dismissed, and the rows either way. */
  const confirm = useCallback(async (): Promise<boolean> => {
    const after = await call<PasskeyRegistration>(CONFIRM, {});
    setPasskeys(after.Passkeys);
    return after.Registered;
  }, [call]);

  const remove = useCallback(
    async (id: string) => {
      setPasskeys(await call<Passkey[]>(REMOVE, { id }));
    },
    [call],
  );

  return { passkeys, loading, error, confirm, remove };
}

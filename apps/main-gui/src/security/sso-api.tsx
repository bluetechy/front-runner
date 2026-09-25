import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { useApiCall } from "./api-call";

/*
 * The other ways into the account: which providers this site offers, which of
 * them are connected, and disconnecting one.
 *
 * A hook beside `useEmails`, `useSecurityActivity` and `usePassword`, for the
 * reason all three are hooks: nothing outside this page wants any of it.
 *
 * **Connecting is not here**, because it does not happen in this application
 * at all: the browser leaves for the provider and comes back. What is here is
 * the other end of that trip -- `confirm`, which hands the API the provider
 * named on the URL and gets back the list as the provider now actually has it.
 * The API believes the URL no more than this does; it asks the provider before
 * it records anything.
 *
 * Every write answers the whole list, and the list is replaced by what came
 * back rather than edited in place. Two of these can change one row -- a
 * disconnection takes a provider away and can take the last Disconnect button
 * on the card with it -- and a hook that patched its own copy would be
 * guessing at the second change.
 */

const READ = `query SignInMethods {
  signInMethods { Alias Name Available Connected ConnectedAs CanDisconnect }
}`;

const DISCONNECT = `mutation DisconnectSignInMethod($alias: String!) {
  disconnectSignInMethod(alias: $alias) {
    Alias Name Available Connected ConnectedAs CanDisconnect
  }
}`;

const CONFIRM = `mutation ConfirmSignInMethod($alias: String!) {
  confirmSignInMethod(alias: $alias) {
    Alias Name Available Connected ConnectedAs CanDisconnect
  }
}`;

export interface SignInMethod {
  Alias: string;
  Name: string;
  /* Whether the site can actually login with it today. A provider that is
   * configured and switched off is false, and is still drawn: an account that
   * connected it before it was switched off still has it connected. */
  Available: boolean;
  Connected: boolean;
  ConnectedAs: string | null;
  /* Whether taking it away would leave the account with a way in. False on the
   * only connected provider of an account with no password. */
  CanDisconnect: boolean;
}

export function useSignInMethods() {
  const { status } = useSession();
  const [methods, setMethods] = useState<SignInMethod[]>([]);
  const [loading, setLoading] = useState(true);
  /* Reported rather than swallowed, unlike the password card's stamp: this
   * read is the card. A list that could not be read has to say so rather than
   * draw as a site that offers nothing. */
  const [error, setError] = useState<string | null>(null);

  const call = useApiCall(
    "The API returned nothing about your login providers.",
  );

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call<SignInMethod[]>(READ, {})
      .then((loaded) => {
        if (!canceled) setMethods(loaded);
      })
      .catch((failure: unknown) => {
        if (!canceled)
          setError(
            failure instanceof Error
              ? failure.message
              : "Your login providers could not be read.",
          );
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  const disconnect = useCallback(
    async (alias: string) => {
      setMethods(await call<SignInMethod[]>(DISCONNECT, { alias }));
    },
    [call],
  );

  /* The browser is back from the provider. The alias came off the URL, so what
   * this answers is the row as the API found it rather than as the URL claimed
   * it: null for a provider that is not in the list at all, and a row whose
   * `Connected` is false for a trip that did not finish. */
  const confirm = useCallback(
    async (alias: string): Promise<SignInMethod | null> => {
      const after = await call<SignInMethod[]>(CONFIRM, { alias });
      setMethods(after);
      return after.find((method) => method.Alias === alias) ?? null;
    },
    [call],
  );

  return { methods, loading, error, disconnect, confirm };
}

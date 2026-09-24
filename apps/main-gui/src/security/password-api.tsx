import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { useApiCall } from "./api-call";

/*
 * The account's own password: when it was last set, and changing it.
 *
 * A hook beside `useEmails` and `useSecurityActivity`, for the reason both of
 * those are hooks: nothing outside this page wants any of it.
 *
 * **Nothing here holds a password.** Both of them are arguments to `change`,
 * they live as long as one call, and neither is put in state, logged or
 * answered back. The card above this owns the boxes, and it empties them the
 * moment the API says yes.
 *
 * The stamp is read once and then written from what `change` answers with,
 * rather than re-read: the mutation already knows, and a second round trip to
 * learn what the first one just said would leave the card showing the old date
 * for as long as it took.
 */

const READ = `query PasswordStatus {
  passwordStatus { ChangedAt }
}`;

const CHANGE = `mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    ChangedAt
    OtherSessionsEnded
  }
}`;

interface PasswordStatus {
  /* When the password was last set. Null where the identity provider would
   * not say, which is an outage rather than an account that has never had
   * one: every account's password was set at least when it was created. */
  ChangedAt: string | null;
}

export interface PasswordChange {
  ChangedAt: string | null;
  /* How many other sessions were ended. Zero is "there were none", which is
   * worth saying. Null is "the password changed and we could not then say",
   * which is the one answer the card must not draw as zero. */
  OtherSessionsEnded: number | null;
}

export function usePassword() {
  const { status } = useSession();
  const [changedAt, setChangedAt] = useState<string | null>(null);
  /* True until the first answer arrives, so the card can wait rather than
   * saying it does not know when the password was set and changing its mind a
   * moment later. */
  const [loading, setLoading] = useState(true);

  const call = useApiCall("The API returned nothing about your password.");

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call<PasswordStatus>(READ, {})
      .then((loaded) => {
        if (!canceled) setChangedAt(loaded.ChangedAt);
      })
      /* Swallowed, and the only read on this page that is. The date is one
       * line on a card; the card's job is the form under it, and a red alert
       * over a working form because a stamp could not be fetched would be the
       * page reporting its least important failure loudest. */
      .catch(() => undefined)
      .finally(() => {
        if (!canceled) setLoading(false);
      });

    return () => {
      canceled = true;
    };
  }, [status, call]);

  const change = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const changed = await call<PasswordChange>(CHANGE, {
        currentPassword,
        newPassword,
      });
      setChangedAt(changed.ChangedAt);
      return changed;
    },
    [call],
  );

  return { changedAt, loading, change };
}

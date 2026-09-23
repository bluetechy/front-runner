import { useCallback, useEffect, useState } from "react";
import { useSession } from "../authentication";
import { emailSchema } from "./email-schema";

/*
 * The signed-in person's email addresses, and the privacy switch under them.
 *
 * A hook rather than a provider, for the reason `wallet-api.tsx` gives: nothing
 * outside the security page wants this list, so there is nothing to share it
 * with. If the top bar ever wants to show an unverified address, this becomes
 * a provider mounted where they both are.
 *
 * Every mutation that touches the list answers with the **whole list**, the
 * way the wallet's do, because every one of them can move something else:
 * choosing a primary clears the old one, and removing a row renumbers nothing
 * but changes what the rest can do. So each of these replaces the list rather
 * than patching it.
 *
 * There is no verification token anywhere in this file, and there must not be.
 * It is the secret from the link in a verification mail; the API does not send
 * it and the browser has no use for it.
 */

const EMAIL_FIELDS = `UserEmailUUID Email IsPrimary IsVerified VerifiedAt CreatedAt`;

const READ = `query EmailSettings {
  emailSettings { EmailIsPrivate Addresses { ${EMAIL_FIELDS} } }
}`;

const ADD = `mutation AddEmail($email: String!) {
  addEmail(email: $email) { ${EMAIL_FIELDS} }
}`;

const REMOVE = `mutation RemoveEmail($userEmailId: String!) {
  removeEmail(userEmailId: $userEmailId) { ${EMAIL_FIELDS} }
}`;

const SET_PRIMARY = `mutation SetPrimaryEmail($userEmailId: String!) {
  setPrimaryEmail(userEmailId: $userEmailId) { ${EMAIL_FIELDS} }
}`;

const RESEND = `mutation ResendEmailVerification($userEmailId: String!) {
  resendEmailVerification(userEmailId: $userEmailId) { ${EMAIL_FIELDS} }
}`;

const SET_PRIVACY = `mutation SetEmailPrivacy($isPrivate: Boolean!) {
  setEmailPrivacy(isPrivate: $isPrivate) { EmailIsPrivate Addresses { ${EMAIL_FIELDS} } }
}`;

/* One address on file. `IsVerified` is the derived half of `VerifiedAt` and
 * both come back: the status column asks the first, a sentence saying when
 * asks the second. */
export interface UserEmail {
  UserEmailUUID: string;
  Email: string;
  IsPrimary: boolean;
  IsVerified: boolean;
  VerifiedAt: string | null;
  CreatedAt: string;
}

interface EmailSettings {
  Addresses: UserEmail[];
  EmailIsPrivate: boolean;
}

export function useEmails() {
  const { status, getAccessToken } = useSession();
  const [addresses, setAddresses] = useState<UserEmail[]>([]);
  /* Private until the API says otherwise, which is also what it says for an
   * account nobody has asked. The switch should not read Public for the
   * moment before the first answer arrives and then correct itself. */
  const [isPrivate, setIsPrivate] = useState(true);
  /* True until the first answer arrives, so the table can wait rather than
   * saying the account has no addresses and changing its mind a moment
   * later. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(
    async <T,>(
      query: string,
      variables: Record<string, unknown>,
    ): Promise<T> => {
      const token = await getAccessToken();
      if (!token) throw new Error("Your session has expired. Login again.");

      const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });
      const body = (await response.json()) as {
        data?: Record<string, T | null>;
        errors?: { message: string }[];
      };
      /* The API answers 200 with an errors array, so the status says nothing;
       * the first message is the one worth showing. */
      if (body.errors?.length) throw new Error(body.errors[0]!.message);
      const [result] = Object.values(body.data ?? {});
      if (result === undefined || result === null)
        throw new Error("The API returned no addresses.");
      return result;
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (status !== "signed-in") return;
    let canceled = false;

    call<EmailSettings>(READ, {})
      .then((loaded) => {
        if (canceled) return;
        setAddresses(loaded.Addresses);
        setIsPrivate(loaded.EmailIsPrivate);
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

  const replace = useCallback(async (run: Promise<UserEmail[]>) => {
    const list = await run;
    setAddresses(list);
    setError(null);
    return list;
  }, []);

  /* Parsed rather than sent as typed, so what is sent is what was validated:
   * the schema folds and trims, and the column the address lands in refuses
   * anything else. The API checks it again regardless.
   *
   * `async` so that a refusal from the schema comes back as a rejected
   * promise rather than as a synchronous throw. Every other function here
   * only ever rejects, and a caller writing `add(...).catch(...)` would miss
   * a throw that happened before the promise existed. */
  const add = useCallback(
    async (email: string) =>
      replace(call(ADD, { email: emailSchema.parse(email) })),
    [call, replace],
  );

  const remove = useCallback(
    (userEmailId: string) => replace(call(REMOVE, { userEmailId })),
    [call, replace],
  );

  const setPrimary = useCallback(
    (userEmailId: string) => replace(call(SET_PRIMARY, { userEmailId })),
    [call, replace],
  );

  const resend = useCallback(
    (userEmailId: string) => replace(call(RESEND, { userEmailId })),
    [call, replace],
  );

  /* The odd one out: it answers with the whole page rather than the list,
   * because it changes the switch and not the addresses. The list comes back
   * with it and is taken anyway, so a stale one cannot survive the round
   * trip. */
  const setPrivacy = useCallback(
    async (next: boolean) => {
      const settings = await call<EmailSettings>(SET_PRIVACY, {
        isPrivate: next,
      });
      setAddresses(settings.Addresses);
      setIsPrivate(settings.EmailIsPrivate);
      setError(null);
      return settings.EmailIsPrivate;
    },
    [call],
  );

  return {
    addresses,
    isPrivate,
    loading,
    error,
    add,
    remove,
    setPrimary,
    resend,
    setPrivacy,
  };
}

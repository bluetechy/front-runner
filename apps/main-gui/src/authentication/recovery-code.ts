/*
 * Spending a recovery code, which is the third thing this app asks main-api
 * for without a session. The other two are registering and the password
 * reset; this follows the shape of `password-reset.ts`.
 *
 * It goes to main-api rather than to the identity provider because the
 * provider has no answer here. Its token endpoint will accept nothing but a
 * valid code from the authenticator app that is gone, so there is no way
 * through it at all: what a recovery code buys is main-api taking the factor
 * off the account, after which the ordinary login on the card in front of
 * somebody works again.
 *
 * **It answers no session, and that is deliberate.** Somebody who spends a
 * code still has to login with their password, and the card says the second
 * factor is now off so that nobody walks away believing they are still
 * protected by it.
 */

const USE = `mutation UseRecoveryCode($identifier: String!, $password: String!, $code: String!) {
  useRecoveryCode(identifier: $identifier, password: $password, code: $code) {
    TwoFactorRemoved
    Remaining
  }
}`;

/* A code that was not spent, for a reason worth showing someone. Named like
 * PasswordResetError and SignInError beside it, and for the same reason: each
 * card shows the message of one of these and a flat sentence for anything
 * else. */
export class RecoveryCodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecoveryCodeError";
  }
}

export interface RecoveryCodeResult {
  /* Whether there was a second factor to take off. False for somebody who
   * spent a code on an account that had none -- worth saying, because the
   * sentence the card shows afterwards is about what changed. */
  TwoFactorRemoved: boolean;
  /* How many codes are left, which is what tells somebody whether to make a
   * new set once they are back in. */
  Remaining: number;
}

/*
 * Spend one.
 *
 * Every way this can fail gets one sentence out of the API -- a wrong
 * password, a wrong code, an account that is not here -- because the form is
 * reachable without a session and anything that varied would make it the
 * product's own account lookup. The card shows what it is given.
 */
export async function useRecoveryCode(
  identifier: string,
  password: string,
  code: string,
): Promise<RecoveryCodeResult> {
  let body: {
    data?: Record<string, RecoveryCodeResult | null | undefined>;
    errors?: { message: string }[];
  };
  try {
    const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: USE,
        variables: { identifier, password, code },
      }),
    });
    body = await response.json();
  } catch {
    /* A network that did not carry the request at all. Saying so is worth
     * more than a refusal somebody would try to act on. */
    throw new RecoveryCodeError(
      "Could not reach the server. Please try again.",
    );
  }

  /* GraphQL answers 200 with an errors array, so the status says nothing; the
   * first message is the one worth showing, and it is written to be read. */
  if (body.errors?.length) throw new RecoveryCodeError(body.errors[0]!.message);

  const answer = body.data?.useRecoveryCode;
  if (!answer)
    throw new RecoveryCodeError("That did not work. Please try again.");
  return answer;
}

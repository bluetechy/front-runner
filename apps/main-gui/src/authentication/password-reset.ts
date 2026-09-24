/*
 * Forgetting a password, which is the other thing this app asks main-api for
 * without a session. The first is registering; see `registration.ts`, whose
 * shape this follows.
 *
 * Both calls go to main-api rather than to the identity provider, and they
 * have to: the
 * identity provider will mail its own reset link, but only its own, pointing
 * at its own page in its own colors, which is the page this replaces. So the
 * token is ours, the message is ours, and the page the link lands on is
 * `/reset-password`. See apps/main-api/src/password-reset.
 *
 * Neither call carries an Authorization header, and neither answers with a
 * session. Somebody who cannot login has nothing to send and nothing to be
 * given: once the password is set, logging in is the ordinary act it always
 * was.
 */

const REQUEST = `mutation RequestPasswordReset($identifier: String!) {
  requestPasswordReset(identifier: $identifier) { Identifier }
}`;

const RESET = `mutation ResetPassword($token: String!, $password: String!) {
  resetPassword(token: $token, password: $password) { LoginName }
}`;

/* A reset that failed for a reason worth showing someone. Named like
 * RegistrationError and SignInError beside it, and for the same reason: each
 * card shows the message of one of these and a flat sentence for anything
 * else. */
export class PasswordResetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordResetError";
  }
}

/*
 * Ask for a link.
 *
 * Nothing useful comes back and nothing should: the API answers a name that
 * matches an account exactly as it answers one that does not, so that this
 * form cannot be used to find out who has an account here. The card says "if
 * that matches an account, a link is on its way" because that is the whole of
 * what anyone here knows.
 */
export async function requestPasswordReset(identifier: string): Promise<void> {
  await send(REQUEST, { identifier }, "requestPasswordReset");
}

/*
 * Follow it. The token is the authorization: it was only ever written into a
 * message sent to the account's own address, it works once, and it expires
 * within the hour.
 *
 * What comes back is the login name, which is what to login with. Somebody
 * who has forgotten a password has often forgotten that too.
 */
export async function resetPassword(
  token: string,
  password: string,
): Promise<string> {
  const answer = await send<{ LoginName: string }>(
    RESET,
    { token, password },
    "resetPassword",
  );
  return answer.LoginName;
}

async function send<T>(
  query: string,
  variables: Record<string, string>,
  operation: string,
): Promise<T> {
  let body: {
    data?: Record<string, T | null | undefined>;
    errors?: { message: string }[];
  };
  try {
    const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    body = await response.json();
  } catch {
    /* A network that did not carry the request at all. Saying so is worth
     * more than a refusal somebody would try to act on. */
    throw new PasswordResetError(
      "Could not reach the server. Please try again.",
    );
  }

  /* GraphQL answers 200 with an errors array, so the status says nothing; the
   * first message is the one worth showing, and these are written to be read
   * -- "That password reset link is not valid or has already been used." */
  if (body.errors?.length)
    throw new PasswordResetError(body.errors[0]!.message);

  const answer = body.data?.[operation];
  if (!answer)
    throw new PasswordResetError("That did not work. Please try again.");
  return answer;
}

import type { RegistrationForm } from "./registration-schema";

/*
 * Making an account, which is the one thing this app asks main-api for
 * without a session.
 *
 * The identity provider has no endpoint a browser may call to register
 * somebody: its own
 * hosted page is its only self-service way in. So the account is made by
 * main-api, which holds the one service account allowed to make one, and this
 * is the mutation that asks. See apps/main-api/src/registration.
 *
 * Nothing comes back but the username and the address as they were stored.
 * There is no session in the answer and there should not be: signing in is a
 * separate act, with the password the card still has, through the same
 * password grant the login form uses.
 */

const REGISTER = `mutation Register($account: RegistrationInput!) {
  register(account: $account) { Username Email }
}`;

export interface RegisteredAccount {
  Username: string;
  Email: string;
}

/* A registration that failed for a reason worth showing someone. Named like
 * SignInError beside it, and for the same reason: the card shows the message
 * of one of these and a flat sentence for anything else. */
export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationError";
  }
}

export async function registerAccount(
  form: RegistrationForm,
): Promise<RegisteredAccount> {
  /* The confirmation box stays in the browser: it is a typing aid, and the
   * API has no use for a second copy of a password it is about to hash. */
  const account = {
    Username: form.Username,
    Email: form.Email,
    FirstName: form.FirstName,
    LastName: form.LastName,
    Password: form.Password,
  };

  let body: {
    data?: { register?: RegisteredAccount | null };
    errors?: { message: string }[];
  };
  try {
    const response = await fetch(import.meta.env.VITE_GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: REGISTER, variables: { account } }),
    });
    body = await response.json();
  } catch {
    /* A network that did not carry the request at all. Saying so is worth
     * more than "could not create the account", which reads as a refusal. */
    throw new RegistrationError(
      "Could not reach the server. Please try again.",
    );
  }

  /* GraphQL answers 200 with an errors array, so the status says nothing;
   * the first message is the one worth showing, and these are written to be
   * read -- "That username or email address is already taken". */
  if (body.errors?.length) throw new RegistrationError(body.errors[0]!.message);

  const registered = body.data?.register;
  if (!registered)
    throw new RegistrationError("The account could not be created.");
  return registered;
}

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// Writing to Keycloak, which this API otherwise only reads from.
//
// Three things. Changing the address an account signs in with: Keycloak holds
// one address per user and it is the credential, so making an address primary
// on the security page is two writes that have to agree -- dbo.SetPrimaryUserEmail
// for this application's copy, and this for the identity provider. Without the
// second, dbo.ProvisionUser refreshes the column from the token on the next
// sign-in and the change quietly undoes itself. See
// apps/main-db/sql/Functions/SetPrimaryUserEmail.sql.
//
// Creating one, for the site's own sign-up form. Keycloak has no endpoint a
// browser may call to register somebody -- its own registration page is the
// only self-service way in -- so an account made on our page is made here, by
// the one account in this system that is allowed to.
//
// And setting a password, for the site's own forgot-password form, along with
// the two reads that flow needs: which account somebody named, and who a reset
// token belongs to. Keycloak will mail its own reset link, but only its own,
// pointing at its own page -- so the link is ours and the password is set here
// once somebody has followed it. See apps/main-api/src/password-reset.
//
// It authenticates as the "main-api" client's own service account rather than
// as the bootstrap administrator: that account holds manage-users and
// view-users on this realm and nothing else, so a bug here cannot reconfigure
// the realm. See apps/keycloak-idp/realm/front-runner-realm.json.
//
// Separate from KeycloakService, which verifies tokens. That one is on the
// path of every request and must never make a call of its own; this one is
// reached only by a security-page mutation and by the sign-up form.

// The admin token, and when it stops being good for anything. Kept in memory
// and reused, because a client-credentials grant is a round trip and this
// would otherwise make two calls where one will do.
interface AdminToken {
  value: string;
  expiresAt: number;
}

// What the sign-up form asks for, which is what Keycloak's own registration
// page asks for. The password is here for the length of one request and is
// never stored, logged or answered back.
export interface NewAccount {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

// An account as Keycloak has it, cut down to what anything here does with
// one: who to mail, what to call them, and the subject id everything else is
// addressed by. No credential of any kind is in it, because Keycloak never
// hands one out.
export interface Account {
  subjectId: string;
  username: string;
  email: string;
  firstName: string;
}

@Injectable()
export class KeycloakAdminService {
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private token: AdminToken | null = null;

  constructor(config: ConfigService) {
    this.baseUrl = config.getOrThrow<string>("KEYCLOAK_ADMIN_URL");
    this.realm = config.getOrThrow<string>("KEYCLOAK_REALM");
    this.clientId = config.getOrThrow<string>("KEYCLOAK_CLIENT_ID");
    this.clientSecret = config.getOrThrow<string>("KEYCLOAK_CLIENT_SECRET");
  }

  // Point an account's sign-in address at a new one.
  //
  // "emailVerified" is set true in the same call, and deliberately: this is
  // only ever reached for an address dbo.SetPrimaryUserEmail has already
  // refused to promote unless it was verified here, so the link has been
  // followed and Keycloak asking for it again would be asking twice.
  //
  // The subject is the account's Keycloak id, which is dbo.Users."SubjectId".
  // It is never taken from a request: the caller reads it from the row the
  // verified token resolved to.
  async setEmail(subjectId: string, email: string): Promise<void> {
    await this.call(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ email, emailVerified: true }),
      },
    );
  }

  // Make an account and give it its password in the same call.
  //
  // "enabled" so it can be signed in with immediately -- the form asks for a
  // password and the dialog signs in with it the moment this returns -- and
  // "emailVerified" false because nothing has been proved about the address
  // yet. A temporary credential would put Keycloak's "update your password"
  // page in front of somebody who has just chosen one.
  //
  // The realm has registration open on its own hosted page, so this endpoint
  // offers no way in that was not already there. What it does is let the way
  // in look like the rest of the site.
  async createUser(account: NewAccount): Promise<void> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users`,
      {
        method: "POST",
        body: JSON.stringify({
          username: account.username,
          email: account.email,
          firstName: account.firstName,
          lastName: account.lastName,
          enabled: true,
          emailVerified: false,
          credentials: [
            { type: "password", value: account.password, temporary: false },
          ],
        }),
      },
    );

    if (response.ok) return;

    // Keycloak answers 409 for a username and for an address already on the
    // realm, and does not say which. Saying which would answer "does this
    // person have an account here" to anybody who asked.
    //
    // A bad request rather than a conflict, which is what this is: the
    // transport passes BAD_REQUEST and FORBIDDEN through and collapses
    // everything else into "Internal server error", and this sentence is the
    // one thing somebody looking at the form can act on. The same trade
    // DatabaseService makes for a rule the database refused.
    if (response.status === 409)
      throw new BadRequestException(
        "That username or email address is already taken",
      );

    // A realm password policy, or a field Keycloak will not accept. Its own
    // sentence is the useful one -- "invalid password: minimum length 8" --
    // so it is passed through when there is one.
    if (response.status === 400)
      throw new BadRequestException(
        (await errorMessage(response)) ??
          "The identity provider refused those details",
      );

    if (response.status === 401 || response.status === 403) this.token = null;

    throw new ServiceUnavailableException(
      "The identity provider could not create the account",
    );
  }

  // Which account somebody named on the forgot-password form.
  //
  // The form asks for "username or email address" because Keycloak accepts
  // either at the login prompt, so both are looked for here: the username
  // first, and the address only if nothing answered to the name. Two exact
  // searches rather than one loose one, because a search that matched
  // partially would reset a password for an account somebody did not name.
  //
  // An answer of null covers every way this can come to nothing -- no such
  // account, an account with no address to mail, a disabled account -- and
  // that is deliberate: the caller must not be able to tell them apart, and
  // neither must the form.
  async findAccount(identifier: string): Promise<Account | null> {
    const wanted = identifier.trim();
    if (!wanted) return null;
    return (
      (await this.search("username", wanted)) ??
      (await this.search("email", wanted))
    );
  }

  // The account a spent reset token belongs to. The subject id comes from our
  // own table, never from a request.
  async account(subjectId: string): Promise<Account | null> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}`,
      { method: "GET" },
    );
    if (response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider is unavailable",
      );
    }
    return readAccount(await response.json().catch(() => null));
  }

  // Set an account's password, which is the end of a reset.
  //
  // "temporary" is false: somebody who has just typed a new password twice
  // has chosen one, and a temporary credential would put Keycloak's own
  // "update your password" page in front of them at the next login, which is
  // the page this whole flow exists to avoid.
  //
  // This does not end the account's other sessions. Keycloak keeps them, and
  // whoever reset the password is the one holding the mailbox -- the case for
  // logging everybody out is a session somebody else stole, which is a
  // different feature and a security page's to offer.
  async setPassword(subjectId: string, password: string): Promise<void> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/reset-password`,
      {
        method: "PUT",
        body: JSON.stringify({
          type: "password",
          value: password,
          temporary: false,
        }),
      },
    );

    if (response.ok) return;

    // A realm password policy refusing this one. Keycloak's own sentence is
    // the useful one, and a bad request rather than anything else because
    // that is what survives the GraphQL transport: see createUser.
    if (response.status === 400)
      throw new BadRequestException(
        (await errorMessage(response)) ?? "That password was refused",
      );

    if (response.status === 401 || response.status === 403) this.token = null;

    throw new ServiceUnavailableException(
      "The identity provider could not set the password",
    );
  }

  // One exact search. Keycloak answers a list; anything but exactly one match
  // is nobody, because "which of these two did you mean" is not a question
  // this flow can ask.
  private async search(
    field: "username" | "email",
    value: string,
  ): Promise<Account | null> {
    const query = new URLSearchParams({
      [field]: value,
      exact: "true",
      max: "2",
    });
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users?${query}`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider is unavailable",
      );
    }

    const found: unknown = await response.json().catch(() => null);
    if (!Array.isArray(found) || found.length !== 1) return null;
    return readAccount(found[0]);
  }

  private async call(path: string, init: RequestInit): Promise<void> {
    const response = await this.send(path, init);

    if (response.ok) return;

    // 409 is Keycloak's answer to an address another account already holds.
    // The database's unique key should have caught it first, so reaching this
    // means the two have drifted; it is still worth a sentence somebody can
    // act on rather than a generic failure.
    if (response.status === 409)
      throw new InternalServerErrorException(
        "The identity provider already has that email address on another account",
      );

    // The token may have been revoked rather than merely expired, and a stale
    // one in hand would fail every call after this. Dropping it costs one
    // round trip on the next call and fixes it.
    if (response.status === 401 || response.status === 403) this.token = null;

    throw new ServiceUnavailableException(
      "The identity provider did not accept the change",
    );
  }

  // One authenticated call. Every write above goes through it, so the token
  // is fetched, cached and presented in one place; what a failing status
  // means is each caller's own business.
  private async send(path: string, init: RequestInit): Promise<Response> {
    const token = await this.accessToken();
    return this.fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  }

  private async accessToken(): Promise<string> {
    // Thirty seconds of headroom, so a token that is about to expire is not
    // spent on a call that will outlive it.
    if (this.token && this.token.expiresAt > Date.now() + 30_000)
      return this.token.value;

    const response = await this.fetch(
      `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: this.clientId,
          client_secret: this.clientSecret,
        }).toString(),
      },
    );

    if (!response.ok)
      throw new ServiceUnavailableException(
        "The identity provider is unavailable",
      );

    const body = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };

    if (typeof body.access_token !== "string")
      throw new ServiceUnavailableException(
        "The identity provider is unavailable",
      );

    const lifetime =
      typeof body.expires_in === "number" && body.expires_in > 0
        ? body.expires_in
        : 60;

    this.token = {
      value: body.access_token,
      expiresAt: Date.now() + lifetime * 1000,
    };
    return this.token.value;
  }

  // Every call goes through here so that a Keycloak that cannot be reached at
  // all reads as an outage rather than as a rejected change. A caller told
  // "the change was refused" would stop trying; one told the service is down
  // knows to come back.
  private async fetch(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(5000),
      });
    } catch {
      throw new ServiceUnavailableException(
        "The identity provider is unavailable",
      );
    }
  }
}

// What Keycloak says about an account, read down to the four fields anything
// here uses.
//
// An account with no address is nobody, because every use of this is about
// mailing somebody, and a disabled account is nobody either: a reset link is
// an invitation back in, and an account that has been turned off should not
// be handed one.
function readAccount(body: unknown): Account | null {
  const account = body as {
    id?: unknown;
    username?: unknown;
    email?: unknown;
    firstName?: unknown;
    enabled?: unknown;
  } | null;
  if (!account || account.enabled === false) return null;
  if (typeof account.id !== "string" || typeof account.username !== "string")
    return null;
  if (typeof account.email !== "string" || !account.email) return null;
  return {
    subjectId: account.id,
    username: account.username,
    email: account.email,
    firstName: typeof account.firstName === "string" ? account.firstName : "",
  };
}

// Keycloak's own sentence from a refusal, if the body carries one. A body
// that is not JSON, or carries nothing useful, reads as no sentence rather
// than as a second failure.
async function errorMessage(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { errorMessage?: unknown };
    return typeof body.errorMessage === "string" && body.errorMessage.trim()
      ? body.errorMessage
      : null;
  } catch {
    return null;
  }
}

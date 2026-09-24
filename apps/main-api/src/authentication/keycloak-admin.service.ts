import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IdentityAdminService,
  type Account,
  type LoginFailure,
  type NewAccount,
} from "./identity-admin.service.js";

// IdentityAdminService against Keycloak's admin API. The only file in this
// API that knows Keycloak has realms, and the only one that would be replaced
// wholesale by a move to another provider -- see identity-admin.service.ts for
// the six operations it answers and why there are only six.
//
// Four things, in the language of that port.
//
// Changing the address an account logs in with: Keycloak holds one address per
// user and it is the credential, so making an address primary on the security
// page is two writes that have to agree -- dbo.SetPrimaryUserEmail for this
// application's copy, and this for the identity provider. Without the second,
// dbo.ProvisionUser refreshes the column from the token on the next login and
// the change quietly undoes itself. See
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
// And reading back which logins the realm refused, which is the one thing here
// that is not about an account somebody named. A refused password mints no
// token, so a failed login never reaches the request path at all; the provider's
// own event log is the only place it exists, and the security page mirrors it.
// See apps/main-api/src/security-events/login-failures.service.ts.
//
// It authenticates as the "main-api" client's own service account rather than
// as the bootstrap administrator: that account holds manage-users, view-users
// and view-events on this realm and nothing else, so a bug here cannot
// reconfigure the realm. See apps/keycloak-idp/realm/front-runner-realm.json.
//
// Separate from TokenVerifierService, which verifies tokens. That one is on
// the path of every request and must never make a call of its own; this one is
// reached only by a security-page mutation, by the sign-up form, and by the
// timer that mirrors login failures.

// The admin token, and when it stops being good for anything. Kept in memory
// and reused, because a client-credentials grant is a round trip and this
// would otherwise make two calls where one will do.
interface AdminToken {
  value: string;
  expiresAt: number;
}

@Injectable()
export class KeycloakAdminService extends IdentityAdminService {
  private readonly baseUrl: string;
  private readonly realm: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private token: AdminToken | null = null;

  constructor(config: ConfigService) {
    super();
    this.baseUrl = config.getOrThrow<string>("KEYCLOAK_ADMIN_URL");
    this.realm = config.getOrThrow<string>("KEYCLOAK_REALM");
    this.clientId = config.getOrThrow<string>("KEYCLOAK_CLIENT_ID");
    this.clientSecret = config.getOrThrow<string>("KEYCLOAK_CLIENT_SECRET");
  }

  // Keycloak spells the port's "already verified" as "emailVerified", set in
  // the same call as the address itself, and spells the subject id as the
  // user's own id in the realm.
  async setEmail(subjectId: string, email: string): Promise<void> {
    await this.call(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}`,
      {
        method: "PUT",
        body: JSON.stringify({ email, emailVerified: true }),
      },
    );
  }

  // "enabled" is the port's "ready to log in with", and "emailVerified" is
  // false because nothing has been proved about the address yet. The
  // credential is permanent rather than temporary: a temporary one would put
  // Keycloak's "update your password" page in front of somebody who has just
  // chosen one.
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

  // Keycloak accepts either a username or an email address at its login
  // prompt, so both are looked for here: the username first, and the address
  // only if nothing answered to the name. Two exact searches rather than one
  // loose one, because a search that matched partially would reset a password
  // for an account somebody did not name.
  async findAccount(identifier: string): Promise<Account | null> {
    const wanted = identifier.trim();
    if (!wanted) return null;
    return (
      (await this.search("username", wanted)) ??
      (await this.search("email", wanted))
    );
  }

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

  // Keycloak's user event log, filtered to the logins it refused.
  //
  // It answers newest first, which is the order this is specified in, and it
  // answers at all only because the realm is configured to keep these events:
  // `eventsEnabled` with LOGIN_ERROR among `enabledEventTypes`, and `view-events`
  // on this client's service account. Without the role it answers 403 and
  // without the configuration it answers an empty list forever, so the caller
  // has to tell a realm with nothing to report from a realm that was never
  // asked to report -- see apps/keycloak-idp/realm/front-runner-realm.json.
  //
  // No date filter is sent. Keycloak has spelled `dateFrom` two ways across
  // versions and the window is small, so the newest page is fetched and the
  // caller drops what it has already seen. The cap is what bounds the work.
  async loginFailures(limit: number): Promise<LoginFailure[]> {
    const query = new URLSearchParams({
      type: "LOGIN_ERROR",
      max: String(limit),
    });
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/events?${query}`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider would not answer for its login failures",
      );
    }

    const events: unknown = await response.json().catch(() => null);
    if (!Array.isArray(events)) return [];
    return events
      .map(readLoginFailure)
      .filter((failure): failure is LoginFailure => failure !== null);
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

// One LOGIN_ERROR event, read down to the three things a security log needs.
//
// An event with no "userId" is dropped, and that is the important line here:
// Keycloak leaves it out when the name somebody typed matched no account, so
// there is no account the attempt happened to. Recording those against anything
// would be recording a guess, and a log that grew a row for a name nobody holds
// would answer "does this account exist" to whoever was guessing.
function readLoginFailure(body: unknown): LoginFailure | null {
  const event = body as {
    userId?: unknown;
    time?: unknown;
    error?: unknown;
  } | null;
  if (!event || typeof event.userId !== "string" || !event.userId) return null;
  // Epoch milliseconds. A missing or nonsense time reads as no event rather
  // than as one that happened in 1970, which would sit at the bottom of the
  // page forever and never clear a high-water mark.
  if (typeof event.time !== "number" || !Number.isFinite(event.time))
    return null;
  return {
    subjectId: event.userId,
    at: new Date(event.time),
    reason: typeof event.error === "string" && event.error ? event.error : null,
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

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
  type EndedSession,
  type LinkedLogin,
  type LoginFailure,
  type LoginProvider,
  type NewAccount,
} from "./identity-admin.service.js";

// IdentityAdminService against Keycloak's admin API. The only file in this
// API that knows Keycloak has realms, and the only one that would be replaced
// wholesale by a move to another provider -- see identity-admin.service.ts for
// the operations it answers and why there are only fourteen.
//
// Five things, in the language of that port.
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
// And the other providers an account can login from: which ones the realm has,
// which of them an account has already connected, and disconnecting one. The
// connecting itself is not here and cannot be -- it needs a browser, because
// only a browser can be sent to Google and asked. Keycloak runs that flow at
// its own /broker/{alias}/link endpoint and the security page hands the
// browser to it; what this service does is the reading either side of it and
// the taking away. See apps/main-api/src/single-sign-on.
//
// And reading back which logins the realm refused, which is the one thing here
// that is not about an account somebody named. A refused password mints no
// token, so a failed login never reaches the request path at all; the provider's
// own event log is the only place it exists, and the security page mirrors it.
// See apps/main-api/src/security-events/provider-events.service.ts.
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
  // The browser's client, borrowed for one thing: checking a password somebody
  // typed. It is public and has direct access grants on, which is what the
  // sign-in dialog already runs on -- see verifyPassword.
  private readonly browserClientId: string;
  private token: AdminToken | null = null;

  constructor(config: ConfigService) {
    super();
    this.baseUrl = config.getOrThrow<string>("KEYCLOAK_ADMIN_URL");
    this.realm = config.getOrThrow<string>("KEYCLOAK_REALM");
    this.clientId = config.getOrThrow<string>("KEYCLOAK_CLIENT_ID");
    this.clientSecret = config.getOrThrow<string>("KEYCLOAK_CLIENT_SECRET");
    this.browserClientId = config.getOrThrow<string>(
      "KEYCLOAK_BROWSER_CLIENT_ID",
    );
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
    // transport passes BAD_REQUEST, FORBIDDEN and SERVICE_UNAVAILABLE through
    // and collapses everything else into "Internal server error", and this
    // sentence is the one thing somebody looking at the form can act on. The
    // same trade DatabaseService makes for a rule the database refused.
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

  // This does not end the account's other sessions, and deliberately still
  // does not. Whoever reset a password is the one holding the mailbox, and a
  // reset landing on a page with no session in it has none of its own to keep.
  // Changing a password from inside the account is the case where the other
  // sessions matter, and that one asks for endOtherSessions by name.
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

  // Whether a password is the one the account has now.
  //
  // Keycloak has no endpoint that checks a password without issuing something,
  // so this asks it to authenticate and throws the answer away: a direct access
  // grant against the "main-gui" client, which is the same exchange the sign-in
  // dialog makes, and then a logout of the session it just opened. Anything
  // else would leave a session behind every time somebody opened this card.
  //
  // It is the browser's client and not this one, because a direct grant needs a
  // client that has them enabled and "main-api" deliberately has every flow
  // turned off. Borrowing it costs nothing: the grant proves the password and
  // the tokens are spent on the next line.
  //
  // **A wrong password here is a LOGIN_ERROR on the realm**, which the sweep in
  // the security vertical mirrors onto the same page the card sits on, as a
  // Failed login. That is left alone rather than filtered out. Somebody who
  // cannot produce the account's current password at its own security page is
  // exactly the event that page exists to show, and an attempt this application
  // quietly swallowed would be one the account's owner never sees.
  //
  // Only 401 is a wrong password. Keycloak answers it for bad credentials, for
  // a disabled account and for an account that owes a required action, and none
  // of those is a password this card should accept; anything else is an outage,
  // because a card that says "that is not your current password" when the truth
  // is a broken realm sends somebody looking for a password they already have.
  async verifyPassword(loginName: string, password: string): Promise<boolean> {
    const response = await this.fetch(this.tokenUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "password",
        client_id: this.browserClientId,
        username: loginName,
        password,
        // Nothing here reads the token. The narrowest scope Keycloak will
        // issue anything at all for is the one to ask for.
        scope: "openid",
      }).toString(),
    });

    if (response.status === 401) return false;

    if (!response.ok)
      throw new ServiceUnavailableException(
        "The identity provider could not check that password",
      );

    const body = (await response.json().catch(() => null)) as {
      refresh_token?: unknown;
    } | null;

    // Spend the session immediately. A failure to do so is not a failure to
    // verify -- the password was right, which is what was asked -- so it is
    // swallowed rather than thrown: the session runs out on the realm's own
    // idle timeout instead. It writes no row on anybody's security page either
    // way, because dbo.LogLogoutEvent resolves the account from the login row
    // for that session, and a session that never made a request has none.
    if (typeof body?.refresh_token === "string")
      await this.endGrant(body.refresh_token);

    return true;
  }

  // When the password was last set, off the account's own credentials.
  //
  // Keycloak stamps "createdDate" on a credential when it is written, and
  // writing a new password replaces the credential rather than editing it, so
  // this is the moment the password that is on the account now became the
  // password on the account. An account nobody has ever changed one for answers
  // with when it was created, which is the true answer to the same question.
  //
  // A provider that will not answer reads as null rather than as an outage.
  // Nothing depends on this: it is a line on a card, and a card that refused to
  // draw because a date was missing would be worse than one that leaves the
  // line out.
  async passwordChangedAt(subjectId: string): Promise<Date | null> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/credentials`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      return null;
    }

    const credentials: unknown = await response.json().catch(() => null);
    if (!Array.isArray(credentials)) return null;

    const password = credentials.find(
      (credential: unknown) =>
        (credential as { type?: unknown } | null)?.type === "password",
    ) as { createdDate?: unknown } | undefined;

    // Epoch milliseconds, dropped on nonsense the way an event's time is: a
    // password last changed in 1970 is a sentence that would make somebody
    // reset a password they set last week.
    const created = password?.createdDate;
    if (typeof created !== "number" || !Number.isFinite(created)) return null;
    return new Date(created);
  }

  // End every session but one.
  //
  // Two calls rather than Keycloak's own logout endpoint for the user, which
  // ends all of them including the one the request came in on. Somebody who has
  // just changed their password correctly should not be thrown out of the
  // browser they did it in, so the sessions are listed and ended one at a time
  // with the current one held back.
  //
  // Each ending is a LOGOUT on the realm, which the security vertical's sweep
  // mirrors onto the page as a session that ended. That is the right outcome
  // and not a side effect worth suppressing: the rows are the evidence that the
  // change did what the card said it would.
  //
  // A session that will not end is skipped rather than thrown over. It is
  // already gone as often as not -- the list is a moment old by the time this
  // reads it -- and the count is what was actually ended.
  async endOtherSessions(
    subjectId: string,
    keepSessionId: string | null,
  ): Promise<number> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/sessions`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider would not say what sessions are open",
      );
    }

    const sessions: unknown = await response.json().catch(() => null);
    if (!Array.isArray(sessions)) return 0;

    const doomed = sessions
      .map((session: unknown) => (session as { id?: unknown } | null)?.id)
      .filter(
        (id: unknown): id is string => typeof id === "string" && id !== "",
      )
      .filter((id: string) => id !== keepSessionId);

    let ended = 0;
    for (const id of doomed) {
      const gone = await this.send(
        `/admin/realms/${encodeURIComponent(this.realm)}/sessions/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (gone.ok) ended++;
      else if (gone.status === 401 || gone.status === 403) this.token = null;
    }
    return ended;
  }

  // Every identity provider the realm has been given, in the order it holds
  // them. That order is passed on rather than chosen here: what order a page
  // reads in is the page's own business, and the security page sorts them
  // alphabetically for a reason of its own.
  //
  // This is the one read here that is about the realm rather than about an
  // account, and it needs view-identity-providers on the service account
  // beside the three roles the rest of this file needs. A realm that answers
  // 403 to it is one whose role mapping predates this feature: see
  // apps/keycloak-idp/README.md.
  //
  // Nothing is filtered out. A provider switched off is still a row on the
  // page, which is what tells somebody their Google connection is still there
  // and cannot be used this week.
  async loginProviders(): Promise<LoginProvider[]> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/identity-provider/instances`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider would not say what login providers it has",
      );
    }

    const instances: unknown = await response.json().catch(() => null);
    if (!Array.isArray(instances)) return [];
    return instances
      .map(readLoginProvider)
      .filter((provider): provider is LoginProvider => provider !== null);
  }

  // What Keycloak calls an account's federated identities.
  //
  // The name it hands back is `userName`, which for Google is the address the
  // account is known by over there and for Apple is whatever relay address was
  // issued. Empty is read as null: a blank line under a provider's name is
  // worse than no line.
  async linkedLogins(subjectId: string): Promise<LinkedLogin[]> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/federated-identity`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider would not say which logins this account has connected",
      );
    }

    const links: unknown = await response.json().catch(() => null);
    if (!Array.isArray(links)) return [];
    return links
      .map(readLinkedLogin)
      .filter((link): link is LinkedLogin => link !== null);
  }

  // Take one away.
  //
  // 404 is success here rather than a failure, which is the port's rule: it
  // means the account has no such connection, which is the state that was
  // asked for. Keycloak answers it for an alias the realm does not have at all
  // as well, and that is the same answer for the same reason -- there is
  // nothing connected and nothing to take away.
  async unlinkLogin(subjectId: string, alias: string): Promise<void> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/federated-identity/${encodeURIComponent(alias)}`,
      { method: "DELETE" },
    );

    if (response.ok || response.status === 404) return;
    if (response.status === 401 || response.status === 403) this.token = null;
    throw new ServiceUnavailableException(
      "The identity provider would not disconnect that login",
    );
  }

  // Whether a password credential is on the account.
  //
  // The same list passwordChangedAt reads, asked a coarser question, and the
  // two are deliberately not one call: this one is asked while drawing a page
  // about connected logins, and a shared "credentials" reader would be a
  // second place for a Keycloak shape to be known.
  //
  // A provider that will not answer reads as false, which is the direction the
  // port names: the page then offers no Disconnect at all, and nobody is
  // disconnected from the last way into their own account on the strength of
  // an outage.
  async hasPassword(subjectId: string): Promise<boolean> {
    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/users/${encodeURIComponent(subjectId)}/credentials`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      return false;
    }

    const credentials: unknown = await response.json().catch(() => null);
    if (!Array.isArray(credentials)) return false;
    return credentials.some(
      (credential: unknown) =>
        (credential as { type?: unknown } | null)?.type === "password",
    );
  }

  // Keycloak's user event log, filtered to the logins it refused.
  async loginFailures(limit: number): Promise<LoginFailure[]> {
    const events = await this.events(["LOGIN_ERROR"], limit);
    return events
      .map(readLoginFailure)
      .filter((failure): failure is LoginFailure => failure !== null);
  }

  // The same log, filtered to the two ways it records a session ending.
  //
  // Two types rather than one because Keycloak has no single event for it.
  // LOGOUT is somebody leaving on purpose, wherever they pressed the button.
  // REFRESH_TOKEN_ERROR is the only trace of a session that ended without
  // anybody deciding to end it: the browser comes back with a refresh token for
  // a session that is no longer there, and that is what an idle timeout, a
  // session past its maximum lifespan, and a revoked session all look like.
  //
  // The second one is also raised for a token that was never valid, and those
  // carry no session id at all, so `readEndedSession` drops them. That is not a
  // detail: it is what makes this safe to read. Keycloak validates the
  // signature before it records a session id, so a session id in this log is one
  // this deployment really issued, and somebody posting invented tokens at the
  // token endpoint cannot put a session -- or an account -- into it. Verified
  // against a running realm rather than assumed.
  async endedSessions(limit: number): Promise<EndedSession[]> {
    const events = await this.events(["LOGOUT", "REFRESH_TOKEN_ERROR"], limit);
    return events
      .map(readEndedSession)
      .filter((ended): ended is EndedSession => ended !== null);
  }

  // One page of the user event log, newest first.
  //
  // It answers at all only because the realm is configured to keep these
  // events: `eventsEnabled` with these types among `enabledEventTypes`, and
  // `view-events` on this client's service account. Without the role it answers
  // 403 and without the configuration it answers an empty list forever, so the
  // caller has to tell a realm with nothing to report from a realm that was
  // never asked to report -- see apps/keycloak-idp/realm/front-runner-realm.json.
  //
  // No date filter is sent. Keycloak has spelled `dateFrom` two ways across
  // versions and the window is small, so the newest page is fetched and the
  // caller drops what it has already seen. The cap is what bounds the work.
  private async events(types: string[], limit: number): Promise<unknown[]> {
    // Repeated rather than joined: Keycloak reads `type` once per value, and a
    // comma-separated list matches no event type at all. Checked against a
    // running realm, because a filter silently matching nothing would look
    // exactly like a realm with nothing to report.
    const query = new URLSearchParams(types.map((type) => ["type", type]));
    query.set("max", String(limit));

    const response = await this.send(
      `/admin/realms/${encodeURIComponent(this.realm)}/events?${query}`,
      { method: "GET" },
    );

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) this.token = null;
      throw new ServiceUnavailableException(
        "The identity provider would not answer for its own event log",
      );
    }

    const events: unknown = await response.json().catch(() => null);
    return Array.isArray(events) ? events : [];
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

  // The realm's token endpoint. Three callers now: the client-credentials
  // grant this service runs on, the password grant verifyPassword makes, and
  // the logout that spends it.
  private tokenUrl(): string {
    return `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/token`;
  }

  // Give back the session a password check opened. A public client logs out by
  // posting the refresh token it was given, which is the whole of it: no admin
  // token, no session id, nothing to look up.
  private async endGrant(refreshToken: string): Promise<void> {
    try {
      await this.fetch(
        `${this.baseUrl}/realms/${encodeURIComponent(this.realm)}/protocol/openid-connect/logout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: this.browserClientId,
            refresh_token: refreshToken,
          }).toString(),
        },
      );
    } catch {
      // Swallowed on purpose: see verifyPassword. The password was right, and
      // that is what the caller asked.
    }
  }

  private async accessToken(): Promise<string> {
    // Thirty seconds of headroom, so a token that is about to expire is not
    // spent on a call that will outlive it.
    if (this.token && this.token.expiresAt > Date.now() + 30_000)
      return this.token.value;

    const response = await this.fetch(this.tokenUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }).toString(),
    });

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

// One identity provider instance, read down to the three things a page shows.
//
// The display name is what the realm was told to call it and is frequently
// empty, because Keycloak only asks for one when the alias is not the whole
// answer. An empty one falls back to the alias rather than drawing a blank
// row, and the browser is what knows "google" should read as Google: see
// apps/main-gui/src/security/sso-kinds.ts.
//
// `enabled` missing reads as enabled, because that is Keycloak's own default
// for a provider it has been given credentials for.
function readLoginProvider(body: unknown): LoginProvider | null {
  const instance = body as {
    alias?: unknown;
    displayName?: unknown;
    enabled?: unknown;
  } | null;
  if (!instance || typeof instance.alias !== "string" || !instance.alias)
    return null;
  const name =
    typeof instance.displayName === "string" && instance.displayName
      ? instance.displayName
      : instance.alias;
  return { alias: instance.alias, name, enabled: instance.enabled !== false };
}

// One federated identity, which is Keycloak's name for a provider an account
// has connected. The alias is on it as "identityProvider"; the id it holds
// over there is on it too and is deliberately not read, because nothing shows
// it and it is the one part of this that is somebody else's identifier.
function readLinkedLogin(body: unknown): LinkedLogin | null {
  const link = body as {
    identityProvider?: unknown;
    userName?: unknown;
  } | null;
  if (
    !link ||
    typeof link.identityProvider !== "string" ||
    !link.identityProvider
  )
    return null;
  return {
    alias: link.identityProvider,
    userName:
      typeof link.userName === "string" && link.userName ? link.userName : null,
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

// One LOGOUT or REFRESH_TOKEN_ERROR event, read down to the three things
// recording a finished session needs.
//
// **An event with no "sessionId" is dropped**, which is this function's whole
// job. A logout always carries one. A refused refresh carries one only when the
// token presented was genuinely ours: Keycloak checks the signature before it
// records anything about the token, so a refusal over an invented token names no
// session, and nobody can push a row onto somebody's security page by posting
// rubbish at the token endpoint.
//
// No user is read even from a LOGOUT, which does carry one. Whose session it was
// is already on record in dbo.SecurityEvents, against the login written for that
// session, and reading it from there rather than from here means one rule for
// both types and no trust placed in a subject the provider supplied.
function readEndedSession(body: unknown): EndedSession | null {
  const event = body as {
    type?: unknown;
    sessionId?: unknown;
    time?: unknown;
  } | null;
  if (!event || typeof event.sessionId !== "string" || !event.sessionId)
    return null;
  // Epoch milliseconds, and dropped on nonsense for the reason a refused login
  // is: a session that ended in 1970 would sit under every login on the page.
  if (typeof event.time !== "number" || !Number.isFinite(event.time))
    return null;
  return {
    sessionId: event.sessionId,
    at: new Date(event.time),
    deliberate: event.type === "LOGOUT",
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

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { DatabaseService } from "../database/index.js";
import {
  GraphqlContext,
  Principal,
  PUBLIC_OPERATION,
} from "./authentication.decorators.js";
import { deviceName, loginDescription } from "./device-name.js";
import {
  TokenVerifierService,
  type VerifiedIdentity,
} from "./token-verifier.service.js";

interface Account {
  UserUUID: string;
  Name: string;
  LoginName: string;
  Email: string;
  IsEnabled: boolean;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private readonly logger = new Logger(AuthenticationGuard.name);

  // The sessions this process has already written a login for. Every request in
  // a session carries the same session id, so without this the guard would ask
  // the database to deduplicate the same login on every single request. With
  // it, that question is asked once per session per process.
  //
  // It is a cache and not the rule. The unique constraint behind
  // dbo.LogLoginEvent deduplicates for real, which is what makes a restart, a
  // second instance behind a load balancer, or an eviction below cost one
  // refused insert rather than a duplicate row on somebody's security page.
  private readonly recordedLogins = new Set<string>();

  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenVerifierService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC_OPERATION, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request =
      GqlExecutionContext.create(context).getContext<GraphqlContext>().req;
    // One verified identity/database lookup per HTTP request, even with parallel root fields.
    request.authentication ??= this.authenticate(
      request.headers.authorization,
      request.headers["user-agent"],
    );
    request.principal = await request.authentication;
    return true;
  }

  private async authenticate(
    header?: string,
    userAgent?: string,
  ): Promise<Principal> {
    const match = /^Bearer ([^\s]+)$/i.exec(header ?? "");
    if (!match?.[1])
      throw new UnauthorizedException("A Bearer token is required");
    const identity = await this.tokens.verify(match[1]);

    // The common request is a user who signed in earlier and has changed
    // nothing since, so it costs one indexed read. Provisioning -- which
    // writes -- is kept for the logins that actually need it: a subject this
    // installation has never seen, and a profile the provider has since
    // edited.
    const [known] = await this.db.query<Account>(
      'SELECT "UserUUID", "Name", "LoginName", "Email", "IsEnabled" FROM dbo."Users" WHERE "SubjectId" = $1',
      [identity.subjectId],
    );
    const account = this.current(known, identity)
      ? known
      : await this.provision(identity);

    if (!account?.IsEnabled)
      throw new UnauthorizedException("User is unavailable");

    await this.recordLogin(identity, account.LoginName, userAgent);

    return {
      userId: account.UserUUID,
      loginName: account.LoginName,
      sessionId: identity.sessionId,
      device: deviceName(userAgent),
    };
  }

  // Write the login into the account's security log, once per login.
  //
  // This is the only place in the product that can. Keycloak does the
  // authenticating and this API only ever meets the token afterwards, so the
  // request path is where a login becomes visible to us, and the request is
  // also the only thing that knows which browser it came from.
  //
  // It calls the database function directly rather than through the security
  // events vertical, the way the provisioning above calls dbo.ProvisionUser
  // rather than going through the users vertical. Authentication is
  // infrastructure here and may not import a feature slice -- check-boundaries
  // enforces that, and importing this particular one would also be a cycle,
  // because the security vertical reaches the forgot-password flow which
  // reaches back here. The database function is the contract instead.
  //
  // **A failure to record must never fail the request.** Somebody whose login
  // worked is signed in; answering 500 because a log row could not be written
  // would lock them out over bookkeeping. Same rule, and same reason, as
  // SecurityEventsService.record.
  private async recordLogin(
    identity: VerifiedIdentity,
    loginName: string,
    userAgent?: string,
  ) {
    // A token with no session is a machine's: a service account, a
    // client-credentials grant. Not a login, and the database refuses it too.
    const session = identity.sessionId;
    if (!session) return;
    if (this.recordedLogins.has(session)) return;

    const device = deviceName(userAgent);
    try {
      await this.db.query(
        'SELECT dbo."LogLoginEvent"($1, $2, $3, $4, $5, $6)',
        [
          loginName,
          session,
          loginDescription(device),
          device,
          // No location. Working one out means an IP address lookup, which is
          // either a third party told where every user logs in from or a
          // database shipped in the image, and neither is a decision to make
          // by accident. The column is nullable and the page leaves the line
          // out.
          null,
          // When they actually authenticated, where the token says so.
          // Keycloak leaves "auth_time" out of a direct grant, and the
          // database falls back to now for those.
          identity.authenticatedAt,
        ],
      );
      this.remember(session);
    } catch {
      this.logger.warn("Could not record a login in the security log");
    }
  }

  // Remembering is capped, because the alternative is a set that grows with
  // every session this process has ever seen. It is a cache of "already
  // written", so dropping the oldest half costs at worst one refused insert.
  private remember(session: string) {
    if (this.recordedLogins.size >= 10_000)
      for (const key of [...this.recordedLogins].slice(0, 5_000))
        this.recordedLogins.delete(key);
    this.recordedLogins.add(session);
  }

  private current(
    account: Account | undefined,
    identity: VerifiedIdentity,
  ): account is Account {
    return (
      !!account &&
      account.LoginName === identity.loginName &&
      account.Email === identity.email &&
      (identity.name === null || account.Name === identity.name)
    );
  }

  private async provision(
    identity: VerifiedIdentity,
  ): Promise<Account | undefined> {
    const [account] = await this.db.query<Account>(
      'SELECT * FROM dbo."ProvisionUser"($1, $2, $3, $4, $5, $6)',
      [
        identity.subjectId,
        identity.loginName,
        identity.name,
        identity.email,
        // Whether the provider says this address has been confirmed. It is what
        // dbo.ProvisionUser marks the primary dbo.UserEmails row with, and it
        // can only ever verify a row, never take one back to unverified.
        identity.emailVerified,
        // When this token was minted. A token issued before somebody chose a
        // new sign-in address still carries the old one, and without this the
        // next request after that change would hand the old address back and
        // undo it. See dbo.ProvisionUser.
        identity.issuedAt,
      ],
    );
    return account;
  }
}

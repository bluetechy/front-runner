import {
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from "jose";

// The identity provider's public keys, resolved per token so that it can
// rotate them without a restart. Injected rather than built in the constructor
// so the tests can hand over a key set of their own and verify real signatures
// without a network.
export const IDENTITY_KEY_SET = Symbol("IDENTITY_KEY_SET");

export const identityKeySetProvider = {
  provide: IDENTITY_KEY_SET,
  inject: [ConfigService],
  // This address is separate from the issuer on purpose: in Compose the
  // browser reaches the provider on its published port and this process
  // reaches it inside the network, so the address that signs the token is not
  // the address the signing keys are fetched from.
  useFactory: (config: ConfigService): JWTVerifyGetKey =>
    createRemoteJWKSet(new URL(config.getOrThrow<string>("IDP_JWKS_URL")), {
      timeoutDuration: 5000,
      cooldownDuration: 30000,
      cacheMaxAge: 600000,
    }),
};

// What a verified access token tells us about the person holding it. The
// subject is the identity; the rest is profile data the identity provider owns
// and this API only mirrors.
export interface VerifiedIdentity {
  subjectId: string;
  loginName: string;
  name: string | null;
  email: string;
  // The token's "email_verified" claim, passed through rather than assumed.
  // A provider can hold an address nobody has confirmed, and dbo.UserEmails has
  // to be able to tell the two apart: the security page offers to send a
  // verification link for an address this is false for. A claim that is
  // missing or is not a boolean is false, which is the safe direction -- it
  // costs somebody one link, where guessing true would put a green tick on an
  // address nobody has proved they read.
  emailVerified: boolean;
  // The provider's session, from the "sid" claim. Null when the token carries
  // none, which is what a machine's token looks like.
  //
  // One login is one session, so this is what the security log deduplicates on:
  // main-api meets the same token on every request for as long as the session
  // lasts, and this is the only thing in it that says "these requests are all
  // the same login" and survives a restart. See dbo.LogLoginEvent.
  sessionId: string | null;
  // When the person actually proved who they were, from the "auth_time" claim,
  // as a Date. Null when the token does not carry one, which is often.
  //
  // It says _when_ a login happened and never _whether_ one did. That division
  // is not tidiness: Keycloak leaves "auth_time" out of a direct grant token
  // altogether, so a log that decided what counted as a login by this claim
  // would have recorded nothing for whole classes of login. The session id
  // above decides; this refines the timestamp when it is there.
  //
  // It is also not "iat", which moves every time a token is refreshed inside
  // one session.
  authenticatedAt: Date | null;
  // When the provider minted this token, from the "iat" claim, as a Date.
  //
  // It is what stops a change made on the security page from undoing itself.
  // A token is minted once and used until it expires, so one issued before
  // somebody chose a new sign-in address still carries the old one; handing
  // that to dbo.ProvisionUser without saying when it was written would move
  // the primary address back, and the change would appear to revert a moment
  // after it was made. See that function's header.
  //
  // Null when the claim is missing or is not a number, which dbo.ProvisionUser
  // reads as "do not know when" and treats as current.
  issuedAt: Date | null;
}

// dbo.Users column widths. A claim that will not fit is a rejected sign-in
// rather than a truncated identity -- except the display name, which is not
// identity and is cut to fit.
const SUBJECT_LIMIT = 255;
const LOGIN_NAME_LIMIT = 64;
const NAME_LIMIT = 64;
const EMAIL_LIMIT = 255;
// dbo.SecurityEvents."SessionId". Wider than any session id Keycloak mints, and
// a claim that would not fit is dropped rather than truncated: half a session
// id is not a session, and the log would rather record no login than one it
// cannot tell apart from the next.
const SESSION_LIMIT = 64;

@Injectable()
export class TokenVerifierService {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly accessTokenType: string;

  constructor(
    config: ConfigService,
    @Inject(IDENTITY_KEY_SET) private readonly keys: JWTVerifyGetKey,
  ) {
    this.issuer = config.getOrThrow<string>("IDP_ISSUER_URL");
    this.audience = config.getOrThrow<string>("IDP_AUDIENCE");
    // What the provider stamps an access token's "typ" with. Configurable
    // because it is the one part of this file that is not the same everywhere:
    // Keycloak writes "Bearer", others write "at+jwt" or nothing at all. Empty
    // turns the check off for a provider that does not distinguish the two.
    this.accessTokenType =
      config.get<string>("IDP_ACCESS_TOKEN_TYPE") ?? "Bearer";
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ["RS256", "RS384", "RS512", "PS256", "ES256", "ES384"],
        requiredClaims: ["exp", "sub"],
      }));
    } catch (error) {
      // A key server that cannot be reached is an outage, not a bad token, and
      // answering 401 to it would tell every signed-in user their session died.
      const code = (error as { code?: unknown }).code;
      if (typeof code !== "string" || code === "ERR_JWKS_TIMEOUT") {
        throw new ServiceUnavailableException(
          "The identity provider is unavailable",
        );
      }
      throw new UnauthorizedException("Invalid or expired token");
    }
    return this.identity(payload);
  }

  private identity(payload: JWTPayload): VerifiedIdentity {
    // An access token and an ID token are signed by the same keys and carry
    // the same subject, so without this an ID token -- which the browser also
    // holds, and which is not an authorization to call anything -- would pass
    // every other check here. Keycloak tells them apart by stamping "Bearer"
    // and "ID" into "typ"; see accessTokenType for providers that do not.
    if (this.accessTokenType && payload.typ !== this.accessTokenType)
      throw new UnauthorizedException("An access token is required");

    const subjectId = this.text(payload.sub, SUBJECT_LIMIT);
    const loginName = this.text(payload.preferred_username, LOGIN_NAME_LIMIT);
    if (!subjectId || !loginName)
      throw new UnauthorizedException("Invalid token claims");

    const email = this.text(payload.email, EMAIL_LIMIT) ?? "";
    const name =
      this.text(payload.name, NAME_LIMIT, true) ??
      this.text(
        [payload.given_name, payload.family_name].filter(Boolean).join(" "),
        NAME_LIMIT,
        true,
      );

    return {
      subjectId,
      loginName,
      name,
      email,
      emailVerified: payload.email_verified === true,
      sessionId: this.text(payload.sid, SESSION_LIMIT),
      authenticatedAt: this.moment(payload.auth_time),
      issuedAt: this.moment(payload.iat),
    };
  }

  // A claim that is seconds since the epoch, as a Date. Both of the times this
  // reads are stamped that way, and both are null when the claim is missing or
  // is not a finite number.
  private moment(claim: unknown): Date | null {
    return typeof claim === "number" && Number.isFinite(claim)
      ? new Date(claim * 1000)
      : null;
  }

  private text(value: unknown, limit: number, truncate = false): string | null {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.length <= limit) return trimmed;
    return truncate ? trimmed.slice(0, limit) : null;
  }
}

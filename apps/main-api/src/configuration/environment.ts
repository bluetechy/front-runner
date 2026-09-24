export function validateEnvironment(env: Record<string, unknown>) {
  const required = (name: string): string => {
    const value = env[name];
    if (typeof value !== "string" || !value.trim())
      throw new Error(`${name} is required`);
    return value;
  };
  // A secret with a floor under its length, so a key that is really a
  // placeholder is refused at boot rather than encrypting things weakly for
  // months. Required rather than defaulted: a default would be a key shared by
  // every deployment that forgot to set one, which is no key at all.
  const secret = (name: string, minimum: number): string => {
    const value = required(name);
    if (value.trim().length < minimum)
      throw new Error(`${name} must be at least ${minimum} characters`);
    return value;
  };
  // A switch, spelled the way a human writes one in a .env file. "false", "0",
  // "no" and "off" all turn a thing off, because somebody reaching for an
  // off switch should not have to guess which word this codebase chose, and a
  // value nobody recognizes is refused rather than quietly read as true.
  const flag = (name: string, fallback: boolean): boolean => {
    const value = env[name];
    if (value === undefined || value === null || value === "") return fallback;
    const word = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(word)) return true;
    if (["false", "0", "no", "off"].includes(word)) return false;
    throw new Error(`${name} must be true or false`);
  };
  const integer = (name: string, fallback: number, max: number) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`${name} is invalid`);
    return value;
  };
  // IDP_* is what any identity provider has to tell us and is all the request
  // path knows about; the KEYCLOAK_* block further down is the one
  // implementation's own configuration. The split is the seam: see
  // apps/main-api/src/authentication/identity-admin.service.ts.
  //
  // The issuer has to match the token's "iss" exactly, and a provider writes
  // it without a trailing slash whatever is configured here.
  const issuer = new URL(required("IDP_ISSUER_URL")).href.replace(/\/$/, "");
  if (env.NODE_ENV === "production" && !issuer.startsWith("https:")) {
    throw new Error("IDP_ISSUER_URL must use HTTPS");
  }
  // Separate from the issuer on purpose: in Compose the browser reaches the
  // provider on its published port and this process reaches it inside the
  // network, so the address that signs the token is not the address we fetch
  // the signing keys from.
  //
  // The fallback spells Keycloak's path for it, which is the one place an
  // IDP_* value knows today's provider. A deployment on anything else sets
  // IDP_JWKS_URL, which every provider publishes at
  // /.well-known/openid-configuration.
  const jwks = new URL(
    String(env.IDP_JWKS_URL ?? `${issuer}/protocol/openid-connect/certs`),
  ).href;
  return {
    ...env,
    NODE_ENV: env.NODE_ENV ?? "development",
    API_PORT: integer("API_PORT", 3000, 65535),
    POSTGRES_PORT: integer("POSTGRES_PORT", 5432, 65535),
    POSTGRES_ADDRESS: required("POSTGRES_ADDRESS"),
    POSTGRES_DATABASE: required("POSTGRES_DATABASE"),
    POSTGRES_USER: required("POSTGRES_USER"),
    POSTGRES_PASSWORD: required("POSTGRES_PASSWORD"),
    POSTGRES_POOL_SIZE: integer("POSTGRES_POOL_SIZE", 10, 100),
    POSTGRES_STATEMENT_TIMEOUT_MS: integer(
      "POSTGRES_STATEMENT_TIMEOUT_MS",
      10000,
      120000,
    ),
    IDP_ISSUER_URL: issuer,
    IDP_JWKS_URL: jwks,
    IDP_AUDIENCE: required("IDP_AUDIENCE"),
    // What the provider stamps an access token's "typ" with, so that an ID
    // token cannot be spent as one. Keycloak writes "Bearer"; empty turns the
    // check off for a provider that does not distinguish the two. See
    // TokenVerifierService.
    IDP_ACCESS_TOKEN_TYPE: String(env.IDP_ACCESS_TOKEN_TYPE ?? "Bearer"),
    // What dbo.AddCreditCard and dbo.AddBankAccount encrypt a card or account
    // number under. It is passed to them on every call and is never stored in
    // the database, which is the only thing that makes encrypting the column
    // worth anything. Rotating it orphans what is already stored -- nothing
    // reads those columns back today, so nothing breaks, but see
    // apps/main-db/sql/Tables/CreditCards.sql before that stops being true.
    WALLET_ENCRYPTION_KEY: secret("WALLET_ENCRYPTION_KEY", 16),
    // KeycloakAdminService's own configuration, and nothing else in the API
    // reads it. The realm main-api administers, and the credentials it does it
    // with: changing the address somebody logs in with is two writes, one here
    // and one at the provider, and this is the half that reaches the provider.
    // The secret belongs to the "main-api" client's service account, which
    // holds manage-users, view-users and view-events and nothing else. A move
    // to another provider replaces this block along with that file.
    KEYCLOAK_REALM: required("KEYCLOAK_REALM"),
    KEYCLOAK_CLIENT_ID: String(env.KEYCLOAK_CLIENT_ID ?? "main-api"),
    KEYCLOAK_CLIENT_SECRET: secret("KEYCLOAK_CLIENT_SECRET", 16),
    // Separate from the issuer for the same reason the key set is: in Compose
    // the browser reaches Keycloak on its published port and this process
    // reaches it inside the network. Admin calls are this process's, so they
    // take the inside address.
    KEYCLOAK_ADMIN_URL: new URL(
      String(env.KEYCLOAK_ADMIN_URL ?? issuer.replace(/\/realms\/[^/]+$/, "")),
    ).href.replace(/\/$/, ""),
    // The mail main-api sends itself: address verification, and nothing else
    // yet. The server is the one the identity provider already uses.
    MAIL_ADDRESS: required("MAIL_ADDRESS"),
    MAIL_SMTP_PORT: integer("MAIL_SMTP_PORT", 1025, 65535),
    MAIL_FROM_ADDRESS: required("MAIL_FROM_ADDRESS"),
    MAIL_FROM_NAME: String(env.MAIL_FROM_NAME ?? "Front Runner"),
    // Where a verification link points. The browser's address for main-gui,
    // because it goes into a message somebody opens on their own machine, and
    // a Compose hostname there would be a link that cannot be followed.
    APP_BASE_URL: new URL(required("APP_BASE_URL")).href.replace(/\/$/, ""),
    // Whether main-api mirrors refused logins out of the identity provider's
    // event log onto the security page. On by default, because somebody else
    // guessing at an account is the thing its owner most wants to know.
    //
    // It has an off switch and the other event types do not, because it is the
    // only one this application does not cause: nothing is deduplicated, ten
    // attempts are ten rows, and a realm being scanned can fill a page with
    // them. Turning it off stops the polling entirely -- no timer, no call to
    // the provider -- and the provider's own event log keeps them either way.
    // See apps/main-api/src/security-events/provider-events.service.ts.
    SECURITY_LOG_FAILED_LOGINS: flag("SECURITY_LOG_FAILED_LOGINS", true),
    CORS_ORIGINS: String(env.CORS_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

// Deliberately independent of the repository .env and developer credentials.
// The Keycloak values point at an address nothing listens on: the tests sign
// their own tokens with a generated key pair and hand the verifier that key
// set directly, so no request ever leaves the process.
Object.assign(process.env, {
  NODE_ENV: "test",
  API_PORT: "3000",
  POSTGRES_ADDRESS: "127.0.0.1",
  POSTGRES_PORT: "5432",
  POSTGRES_DATABASE: "api_test",
  POSTGRES_USER: "api_test",
  POSTGRES_PASSWORD: "test-only",
  POSTGRES_POOL_SIZE: "2",
  POSTGRES_STATEMENT_TIMEOUT_MS: "1000",
  IDP_ISSUER_URL: "https://identity.example.test/realms/front-runner",
  IDP_JWKS_URL:
    "https://identity.example.test/realms/front-runner/protocol/openid-connect/certs",
  IDP_AUDIENCE: "main-api",
  // Nothing under test encrypts anything -- the wallet's service is driven
  // with a stubbed database -- but the key is required at boot, and app.test.ts
  // boots the real module.
  WALLET_ENCRYPTION_KEY: "test-only-wallet-key",
  // The same arrangement as the IDP_ values above: the admin address
  // points at a host nothing listens on, and every test that exercises the
  // admin client hands it a fetch of its own, so no request leaves the
  // process. The secret is required at boot and app.test.ts boots the real
  // module.
  KEYCLOAK_REALM: "front-runner",
  KEYCLOAK_ADMIN_URL: "https://identity.example.test",
  KEYCLOAK_CLIENT_SECRET: "test-only-client-secret",
  // Mail is the same story: nothing under test opens a connection, because
  // the mail service's own tests mock nodemailer and every other test that
  // reaches it is handed a stub.
  MAIL_ADDRESS: "127.0.0.1",
  MAIL_SMTP_PORT: "1025",
  MAIL_FROM_ADDRESS: "no-reply@example.test",
  MAIL_FROM_NAME: "Front Runner",
  APP_BASE_URL: "https://app.example.test",
  CORS_ORIGINS: "",
});

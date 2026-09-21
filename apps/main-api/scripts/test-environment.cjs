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
  KEYCLOAK_ISSUER_URL: "https://identity.example.test/realms/front-runner",
  KEYCLOAK_JWKS_URL:
    "https://identity.example.test/realms/front-runner/protocol/openid-connect/certs",
  KEYCLOAK_AUDIENCE: "main-api",
  CORS_ORIGINS: "",
});

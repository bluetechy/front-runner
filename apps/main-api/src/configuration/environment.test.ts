import { describe, expect, it } from "@jest/globals";
import { validateEnvironment } from "./environment.js";
const base = {
  POSTGRES_ADDRESS: "localhost",
  POSTGRES_DATABASE: "test",
  POSTGRES_USER: "test",
  POSTGRES_PASSWORD: "test",
  KEYCLOAK_ISSUER_URL: "https://identity.example.test/realms/front-runner",
  KEYCLOAK_AUDIENCE: "main-api",
  KEYCLOAK_REALM: "front-runner",
  KEYCLOAK_CLIENT_SECRET: "a-secret-long-enough-to-pass",
  WALLET_ENCRYPTION_KEY: "a-key-long-enough-to-pass",
  MAIL_ADDRESS: "main-mail",
  MAIL_FROM_ADDRESS: "no-reply@example.test",
  APP_BASE_URL: "https://app.example.test",
};
describe("environment validation", () => {
  it("parses ports, pool limits and explicit CORS origins", () => {
    expect(
      validateEnvironment({
        ...base,
        API_PORT: "3456",
        CORS_ORIGINS: "https://one.test, https://two.test",
      }),
    ).toMatchObject({
      API_PORT: 3456,
      POSTGRES_PORT: 5432,
      CORS_ORIGINS: ["https://one.test", "https://two.test"],
    });
  });
  it("requires database credentials", () => {
    expect(() => validateEnvironment({})).toThrow();
  });
  it.each([
    "KEYCLOAK_ISSUER_URL",
    "KEYCLOAK_AUDIENCE",
    "KEYCLOAK_REALM",
    "KEYCLOAK_CLIENT_SECRET",
    "WALLET_ENCRYPTION_KEY",
    "MAIL_ADDRESS",
    "MAIL_FROM_ADDRESS",
    "APP_BASE_URL",
  ])("requires %s", (name) => {
    expect(() => validateEnvironment({ ...base, [name]: "" })).toThrow(name);
  });
  // The same reasoning as the wallet key: a short client secret is what a
  // forgotten placeholder looks like, and this one lets main-api change the
  // address somebody signs in with.
  it("refuses a Keycloak client secret too short to be one", () => {
    expect(() =>
      validateEnvironment({ ...base, KEYCLOAK_CLIENT_SECRET: "changeme" }),
    ).toThrow("KEYCLOAK_CLIENT_SECRET");
  });
  // The admin address is this process's route to Keycloak, which in Compose
  // is not the address in the token. Left unset it is the issuer with the
  // realm path taken off, which is right for a deployment where they agree.
  it("derives the admin address from the issuer, and lets it be overridden", () => {
    expect(validateEnvironment(base)).toMatchObject({
      KEYCLOAK_ADMIN_URL: "https://identity.example.test",
    });
    expect(
      validateEnvironment({
        ...base,
        KEYCLOAK_ADMIN_URL: "http://keycloak-idp:8080",
      }),
    ).toMatchObject({ KEYCLOAK_ADMIN_URL: "http://keycloak-idp:8080" });
  });
  // A verification link goes into a message somebody opens on their own
  // machine, so a trailing slash here would show up in every one of them.
  it("trims a trailing slash off the address links are built from", () => {
    expect(
      validateEnvironment({
        ...base,
        APP_BASE_URL: "https://app.example.test/",
      }),
    ).toMatchObject({ APP_BASE_URL: "https://app.example.test" });
  });
  it("defaults the mail port and the sender name", () => {
    expect(validateEnvironment(base)).toMatchObject({
      MAIL_SMTP_PORT: 1025,
      MAIL_FROM_NAME: "Front Runner",
      KEYCLOAK_CLIENT_ID: "main-api",
    });
  });
  // A short key is the shape a forgotten placeholder takes, so it is refused
  // at boot rather than left quietly encrypting card numbers with "changeme".
  it("refuses a wallet key too short to be one", () => {
    expect(() =>
      validateEnvironment({ ...base, WALLET_ENCRYPTION_KEY: "changeme" }),
    ).toThrow("WALLET_ENCRYPTION_KEY");
  });
  it.each(["bad", "0", "65536"])("rejects invalid API port %s", (API_PORT) => {
    expect(() => validateEnvironment({ ...base, API_PORT })).toThrow(
      "API_PORT",
    );
  });
  it("requires an HTTPS issuer in production", () => {
    expect(() =>
      validateEnvironment({
        ...base,
        NODE_ENV: "production",
        KEYCLOAK_ISSUER_URL: "http://unsafe.test/realms/x",
      }),
    ).toThrow("HTTPS");
  });
  it("allows a plain HTTP issuer for local development", () => {
    expect(
      validateEnvironment({
        ...base,
        KEYCLOAK_ISSUER_URL: "http://localhost:30003/realms/front-runner",
      }),
    ).toMatchObject({
      KEYCLOAK_ISSUER_URL: "http://localhost:30003/realms/front-runner",
    });
  });
  // Keycloak writes "iss" without a trailing slash, and jwtVerify compares it
  // literally, so a configured slash has to come off or nothing verifies.
  it("strips a trailing slash from the issuer", () => {
    expect(
      validateEnvironment({
        ...base,
        KEYCLOAK_ISSUER_URL:
          "https://identity.example.test/realms/front-runner/",
      }),
    ).toMatchObject({
      KEYCLOAK_ISSUER_URL: "https://identity.example.test/realms/front-runner",
    });
  });
  it("derives the key set address from the issuer, and lets it be overridden", () => {
    expect(validateEnvironment(base)).toMatchObject({
      KEYCLOAK_JWKS_URL:
        "https://identity.example.test/realms/front-runner/protocol/openid-connect/certs",
    });
    expect(
      validateEnvironment({
        ...base,
        KEYCLOAK_JWKS_URL:
          "http://keycloak-idp:8080/realms/front-runner/protocol/openid-connect/certs",
      }),
    ).toMatchObject({
      KEYCLOAK_JWKS_URL:
        "http://keycloak-idp:8080/realms/front-runner/protocol/openid-connect/certs",
    });
  });
});

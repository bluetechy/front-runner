import { describe, expect, it } from "@jest/globals";
import { validateEnvironment } from "./environment.js";
const base = {
  POSTGRES_ADDRESS: "localhost",
  POSTGRES_DATABASE: "test",
  POSTGRES_USER: "test",
  POSTGRES_PASSWORD: "test",
  KEYCLOAK_ISSUER_URL: "https://identity.example.test/realms/front-runner",
  KEYCLOAK_AUDIENCE: "main-api",
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
  it.each(["KEYCLOAK_ISSUER_URL", "KEYCLOAK_AUDIENCE"])(
    "requires %s",
    (name) => {
      expect(() => validateEnvironment({ ...base, [name]: "" })).toThrow(name);
    },
  );
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

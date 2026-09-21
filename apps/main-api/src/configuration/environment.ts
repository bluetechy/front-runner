export function validateEnvironment(env: Record<string, unknown>) {
  const required = (name: string): string => {
    const value = env[name];
    if (typeof value !== "string" || !value.trim())
      throw new Error(`${name} is required`);
    return value;
  };
  const integer = (name: string, fallback: number, max: number) => {
    const value = Number(env[name] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`${name} is invalid`);
    return value;
  };
  // The issuer has to match the token's "iss" exactly, and Keycloak writes it
  // without a trailing slash whatever is configured here.
  const issuer = new URL(required("KEYCLOAK_ISSUER_URL")).href.replace(
    /\/$/,
    "",
  );
  if (env.NODE_ENV === "production" && !issuer.startsWith("https:")) {
    throw new Error("KEYCLOAK_ISSUER_URL must use HTTPS");
  }
  // Separate from the issuer on purpose: in Compose the browser reaches
  // Keycloak on its published port and this process reaches it inside the
  // network, so the address that signs the token is not the address we fetch
  // the signing keys from.
  const jwks = new URL(
    String(env.KEYCLOAK_JWKS_URL ?? `${issuer}/protocol/openid-connect/certs`),
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
    KEYCLOAK_ISSUER_URL: issuer,
    KEYCLOAK_JWKS_URL: jwks,
    KEYCLOAK_AUDIENCE: required("KEYCLOAK_AUDIENCE"),
    CORS_ORIGINS: String(env.CORS_ORIGINS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  };
}

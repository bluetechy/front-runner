import "reflect-metadata";
import { beforeAll, describe, expect, it } from "@jest/globals";
import { ConfigService } from "@nestjs/config";
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type JWTVerifyGetKey,
  type JWK,
} from "jose";
import { TokenVerifierService } from "./token-verifier.service.js";

// Real RS256 signatures against a key pair generated here, so what is under
// test is the verification itself rather than a stand-in for it. Nothing
// reaches the network: the key set is local.
const issuer = "https://identity.example.test/realms/front-runner";
const audience = "main-api";

let signingKey: CryptoKey;
let keys: JWTVerifyGetKey;
let otherKey: CryptoKey;

const service = (overrides: Record<string, unknown> = {}) =>
  new TokenVerifierService(
    new ConfigService({
      IDP_ISSUER_URL: issuer,
      IDP_AUDIENCE: audience,
      ...overrides,
    }),
    keys,
  );

const claims = (overrides: Record<string, unknown> = {}) => ({
  typ: "Bearer",
  preferred_username: "alice",
  name: "Alice Example",
  email: "alice@example.test",
  email_verified: true,
  ...overrides,
});

const token = async (
  payload: Record<string, unknown> = {},
  options: {
    key?: CryptoKey;
    expiry?: string | number;
    subject?: string | null;
    /* setIssuedAt() stamps "iat" over whatever the payload said, so a test
     * about a missing or malformed one has to switch it off rather than pass
     * a value. */
    issuedAt?: boolean;
  } = {},
) => {
  let jwt = new SignJWT({ ...claims(), ...payload }).setProtectedHeader({
    alg: "RS256",
  });
  if (options.issuedAt !== false) jwt = jwt.setIssuedAt();
  jwt = jwt
    .setIssuer(String(payload.iss ?? issuer))
    .setAudience(String(payload.aud ?? audience));
  if (options.subject !== null)
    jwt = jwt.setSubject(options.subject ?? "subject-alice");
  if (options.expiry !== undefined) jwt = jwt.setExpirationTime(options.expiry);
  else jwt = jwt.setExpirationTime("1h");
  return jwt.sign(options.key ?? signingKey);
};

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  signingKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256", { extractable: true })).privateKey;
  const jwk = (await exportJWK(pair.publicKey)) as JWK;
  keys = createLocalJWKSet({ keys: [{ ...jwk, alg: "RS256", use: "sig" }] });
});

describe("access tokens", () => {
  it("accepts a token the realm signed and reports the identity behind it", async () => {
    await expect(service().verify(await token())).resolves.toEqual({
      subjectId: "subject-alice",
      loginName: "alice",
      name: "Alice Example",
      email: "alice@example.test",
      emailVerified: true,
      // setIssuedAt() stamps the token as it is signed, so this is whatever
      // "now" was, to the second.
      issuedAt: expect.any(Date),
    });
  });

  // The claim that stops a new sign-in address from undoing itself. A token
  // is minted once and used until it expires, so dbo.ProvisionUser has to be
  // able to tell a token that predates a change from one that describes it.
  it("reports when the token was minted, to the second", async () => {
    const identity = await service().verify(await token());

    expect(identity.issuedAt).toBeInstanceOf(Date);
    expect(identity.issuedAt!.getTime()).toBeLessThanOrEqual(Date.now());
    expect(identity.issuedAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
    // Seconds on the wire, milliseconds in a Date.
    expect(identity.issuedAt!.getTime() % 1000).toBe(0);
  });

  // A token with no "iat" at all is a valid token: the claim is optional.
  // dbo.ProvisionUser reads the null as "do not know when" and treats the
  // address on it as current, which is what it did before there was a claim
  // to read.
  it("reports no issue time when the claim is absent", async () => {
    const signed = await token({}, { issuedAt: false });

    await expect(service().verify(signed)).resolves.toMatchObject({
      issuedAt: null,
    });
  });

  // An "iat" that is not a number never reaches the mapping above: jose
  // refuses it while verifying, the same as any other malformed claim. Worth
  // stating, because the null-handling above would otherwise look like it was
  // covering this case too.
  it.each([
    ["a string", "yesterday"],
    ["null", null],
  ])("refuses a token whose issue time is %s", async (_label, iat) => {
    const signed = await token({ iat }, { issuedAt: false });

    await expect(service().verify(signed)).rejects.toThrow(
      "Invalid or expired token",
    );
  });

  // Whether the provider says the address has been confirmed, passed through
  // rather than assumed: dbo.ProvisionUser uses it to decide whether the
  // primary dbo.UserEmails row arrives verified. Anything that is not
  // literally true reads as false, which is the safe direction -- it costs
  // somebody one verification link, where guessing true would put a green
  // tick on an address nobody has proved they read.
  it.each([
    ["missing", undefined],
    ["false", false],
    ['the string "true"', "true"],
    ["null", null],
  ])(
    "reads an email_verified claim that is %s as unverified",
    async (_label, value) => {
      await expect(
        service().verify(await token({ email_verified: value })),
      ).resolves.toMatchObject({ emailVerified: false });
    },
  );

  it("rejects a token signed by any other key", async () => {
    await expect(
      service().verify(await token({}, { key: otherKey })),
    ).rejects.toThrow("Invalid or expired token");
  });

  it("rejects a token from another issuer or for another audience", async () => {
    await expect(
      service().verify(
        await token({ iss: "https://evil.test/realms/front-runner" }),
      ),
    ).rejects.toThrow("Invalid or expired token");
    await expect(
      service().verify(await token({ aud: "some-other-service" })),
    ).rejects.toThrow("Invalid or expired token");
  });

  it("rejects an expired token, and one that never expires", async () => {
    await expect(
      service().verify(
        await token({}, { expiry: Math.floor(Date.now() / 1000) - 60 }),
      ),
    ).rejects.toThrow("Invalid or expired token");
    const endless = await new SignJWT(claims())
      .setProtectedHeader({ alg: "RS256" })
      .setIssuedAt()
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject("subject-alice")
      .sign(signingKey);
    await expect(service().verify(endless)).rejects.toThrow(
      "Invalid or expired token",
    );
  });

  it("rejects garbage rather than treating it as anonymous", async () => {
    await expect(service().verify("not-a-token")).rejects.toThrow(
      "Invalid or expired token",
    );
  });

  // An ID token is signed by the same keys and carries the same subject, so
  // every other check here passes it. It is not an authorization to call
  // anything, and the browser holds one.
  it("rejects an ID token presented as an access token", async () => {
    await expect(service().verify(await token({ typ: "ID" }))).rejects.toThrow(
      "An access token is required",
    );
  });

  // "Bearer" is Keycloak's spelling of that distinction and is the default,
  // not a law: another provider writes "at+jwt", and one that does not
  // distinguish an access token from an ID token at all sets this empty rather
  // than having every token it issues refused.
  it("takes the access token's type from configuration", async () => {
    const other = service({ IDP_ACCESS_TOKEN_TYPE: "at+jwt" });

    await expect(
      other.verify(await token({ typ: "at+jwt" })),
    ).resolves.toMatchObject({ loginName: "alice" });
    await expect(other.verify(await token())).rejects.toThrow(
      "An access token is required",
    );
  });

  it("checks no type at all when configured with none", async () => {
    await expect(
      service({ IDP_ACCESS_TOKEN_TYPE: "" }).verify(await token({ typ: "ID" })),
    ).resolves.toMatchObject({ loginName: "alice" });
  });

  it("rejects a token with no subject or no username", async () => {
    await expect(
      service().verify(await token({}, { subject: null })),
    ).rejects.toThrow();
    await expect(
      service().verify(await token({ preferred_username: "" })),
    ).rejects.toThrow("Invalid token claims");
    await expect(
      service().verify(await token({ preferred_username: 42 })),
    ).rejects.toThrow("Invalid token claims");
  });

  // dbo.Users."LoginName" is varchar(64). Storing part of a username would
  // silently make it somebody else's.
  it("rejects a username or address too long for the account it would create", async () => {
    await expect(
      service().verify(await token({ preferred_username: "a".repeat(65) })),
    ).rejects.toThrow("Invalid token claims");
    await expect(
      service().verify(
        await token({ email: `${"a".repeat(250)}@example.test` }),
      ),
    ).resolves.toMatchObject({ email: "" });
  });

  it("falls back to the given and family names, and trims an over-long display name to fit", async () => {
    await expect(
      service().verify(
        await token({
          name: undefined,
          given_name: "Alice",
          family_name: "Example",
        }),
      ),
    ).resolves.toMatchObject({ name: "Alice Example" });
    await expect(
      service().verify(await token({ name: "A".repeat(100) })),
    ).resolves.toMatchObject({ name: "A".repeat(64) });
    await expect(
      service().verify(
        await token({
          name: undefined,
          given_name: undefined,
          family_name: undefined,
        }),
      ),
    ).resolves.toMatchObject({ name: null });
  });

  it("treats a missing email as absent rather than as null", async () => {
    await expect(
      service().verify(await token({ email: undefined })),
    ).resolves.toMatchObject({ email: "" });
  });

  // A key server that cannot be reached has not told us the token is bad. A
  // 401 would log every signed-in user out of a working session.
  it("reports an unreachable key server as an outage, not a bad token", async () => {
    const offline = new TokenVerifierService(
      new ConfigService({
        IDP_ISSUER_URL: issuer,
        IDP_AUDIENCE: audience,
      }),
      () => {
        throw Object.assign(new Error("socket hang up"), { code: undefined });
      },
    );
    await expect(offline.verify(await token())).rejects.toThrow(
      "identity provider is unavailable",
    );
  });
});

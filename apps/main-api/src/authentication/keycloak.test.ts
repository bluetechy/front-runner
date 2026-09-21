import 'reflect-metadata';
import { beforeAll, describe, expect, it } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey, type JWK } from 'jose';
import { KeycloakService } from './keycloak.service.js';

// Real RS256 signatures against a key pair generated here, so what is under
// test is the verification itself rather than a stand-in for it. Nothing
// reaches the network: the key set is local.
const issuer = 'https://identity.example.test/realms/front-runner';
const audience = 'main-api';

let signingKey: CryptoKey;
let keys: JWTVerifyGetKey;
let otherKey: CryptoKey;

const service = (overrides: Record<string, unknown> = {}) =>
  new KeycloakService(new ConfigService({ KEYCLOAK_ISSUER_URL: issuer, KEYCLOAK_AUDIENCE: audience, ...overrides }), keys);

const claims = (overrides: Record<string, unknown> = {}) => ({
  typ: 'Bearer', preferred_username: 'alice', name: 'Alice Example', email: 'alice@example.test', ...overrides,
});

const token = async (payload: Record<string, unknown> = {}, options: { key?: CryptoKey; expiry?: string | number; subject?: string | null } = {}) => {
  let jwt = new SignJWT({ ...claims(), ...payload })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setIssuer(String(payload.iss ?? issuer))
    .setAudience(String(payload.aud ?? audience));
  if (options.subject !== null) jwt = jwt.setSubject(options.subject ?? 'subject-alice');
  if (options.expiry !== undefined) jwt = jwt.setExpirationTime(options.expiry);
  else jwt = jwt.setExpirationTime('1h');
  return jwt.sign(options.key ?? signingKey);
};

beforeAll(async () => {
  const pair = await generateKeyPair('RS256', { extractable: true });
  signingKey = pair.privateKey;
  otherKey = (await generateKeyPair('RS256', { extractable: true })).privateKey;
  const jwk = (await exportJWK(pair.publicKey)) as JWK;
  keys = createLocalJWKSet({ keys: [{ ...jwk, alg: 'RS256', use: 'sig' }] });
});

describe('Keycloak access tokens', () => {
  it('accepts a token the realm signed and reports the identity behind it', async () => {
    await expect(service().verify(await token())).resolves.toEqual({
      subjectId: 'subject-alice', loginName: 'alice', name: 'Alice Example', email: 'alice@example.test',
    });
  });

  it('rejects a token signed by any other key', async () => {
    await expect(service().verify(await token({}, { key: otherKey }))).rejects.toThrow('Invalid or expired token');
  });

  it('rejects a token from another issuer or for another audience', async () => {
    await expect(service().verify(await token({ iss: 'https://evil.test/realms/front-runner' }))).rejects.toThrow('Invalid or expired token');
    await expect(service().verify(await token({ aud: 'some-other-service' }))).rejects.toThrow('Invalid or expired token');
  });

  it('rejects an expired token, and one that never expires', async () => {
    await expect(service().verify(await token({}, { expiry: Math.floor(Date.now() / 1000) - 60 }))).rejects.toThrow('Invalid or expired token');
    const endless = await new SignJWT(claims())
      .setProtectedHeader({ alg: 'RS256' }).setIssuedAt().setIssuer(issuer).setAudience(audience).setSubject('subject-alice')
      .sign(signingKey);
    await expect(service().verify(endless)).rejects.toThrow('Invalid or expired token');
  });

  it('rejects garbage rather than treating it as anonymous', async () => {
    await expect(service().verify('not-a-token')).rejects.toThrow('Invalid or expired token');
  });

  // An ID token is signed by the same realm keys and carries the same subject,
  // so every other check here passes it. It is not an authorization to call
  // anything, and the browser holds one.
  it('rejects an ID token presented as an access token', async () => {
    await expect(service().verify(await token({ typ: 'ID' }))).rejects.toThrow('An access token is required');
  });

  it('rejects a token with no subject or no username', async () => {
    await expect(service().verify(await token({}, { subject: null }))).rejects.toThrow();
    await expect(service().verify(await token({ preferred_username: '' }))).rejects.toThrow('Invalid token claims');
    await expect(service().verify(await token({ preferred_username: 42 }))).rejects.toThrow('Invalid token claims');
  });

  // dbo.Users."LoginName" is varchar(64). Storing part of a username would
  // silently make it somebody else's.
  it('rejects a username or address too long for the account it would create', async () => {
    await expect(service().verify(await token({ preferred_username: 'a'.repeat(65) }))).rejects.toThrow('Invalid token claims');
    await expect(service().verify(await token({ email: `${'a'.repeat(250)}@example.test` }))).resolves.toMatchObject({ email: '' });
  });

  it('falls back to the given and family names, and trims an over-long display name to fit', async () => {
    await expect(service().verify(await token({ name: undefined, given_name: 'Alice', family_name: 'Example' })))
      .resolves.toMatchObject({ name: 'Alice Example' });
    await expect(service().verify(await token({ name: 'A'.repeat(100) })))
      .resolves.toMatchObject({ name: 'A'.repeat(64) });
    await expect(service().verify(await token({ name: undefined, given_name: undefined, family_name: undefined })))
      .resolves.toMatchObject({ name: null });
  });

  it('treats a missing email as absent rather than as null', async () => {
    await expect(service().verify(await token({ email: undefined }))).resolves.toMatchObject({ email: '' });
  });

  // A key server that cannot be reached has not told us the token is bad. A
  // 401 would log every signed-in user out of a working session.
  it('reports an unreachable key server as an outage, not a bad token', async () => {
    const offline = new KeycloakService(
      new ConfigService({ KEYCLOAK_ISSUER_URL: issuer, KEYCLOAK_AUDIENCE: audience }),
      () => { throw Object.assign(new Error('socket hang up'), { code: undefined }); },
    );
    await expect(offline.verify(await token())).rejects.toThrow('identity provider is unavailable');
  });
});

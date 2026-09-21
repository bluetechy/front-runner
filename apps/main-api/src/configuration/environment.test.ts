import { describe, expect, it } from '@jest/globals';
import { validateEnvironment } from './environment.js';
const base = { POSTGRES_ADDRESS: 'localhost', POSTGRES_DATABASE: 'test', POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', JWT_SECRET_KEY: 'a'.repeat(32) };
describe('environment validation', () => {
  it('parses ports, pool limits and explicit CORS origins', () => {
    expect(validateEnvironment({ ...base, API_PORT: '3456', CORS_ORIGINS: 'https://one.test, https://two.test' })).toMatchObject({ API_PORT: 3456, POSTGRES_PORT: 5432, CORS_ORIGINS: ['https://one.test', 'https://two.test'] });
  });
  it('requires database credentials', () => { expect(() => validateEnvironment({})).toThrow(); });
  it('requires strong JWT secrets in production', () => {
    expect(() => validateEnvironment({ ...base, NODE_ENV: 'production', JWT_SECRET_KEY: 'short' })).toThrow('at least 32');
  });
  it.each(['bad', '0', '65536'])('rejects invalid API port %s', API_PORT => {
    expect(() => validateEnvironment({ ...base, API_PORT })).toThrow('API_PORT');
  });
  it('requires HTTPS for identity provider credentials', () => {
    expect(() => validateEnvironment({ ...base, HYDRA_BASE_URL: 'http://unsafe.test' })).toThrow('HTTPS');
  });
});

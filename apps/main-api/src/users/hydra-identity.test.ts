import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { HydraIdentityService } from './hydra-identity.service.js';
const identity = () => new HydraIdentityService(new ConfigService({ HYDRA_BASE_URL: 'https://id.example', HYDRA_NAMESPACE: 'employees' }));
describe('identity provider boundary', () => {
  it('fails clearly when login is not configured', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    await expect(new HydraIdentityService(new ConfigService({ HYDRA_BASE_URL: '', HYDRA_NAMESPACE: '' })).authenticate('abc')).rejects.toThrow('not configured');
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([401, 403])('maps status %s to invalid credentials', async status => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status }));
    await expect(identity().authenticate('abc')).rejects.toThrow('Invalid credentials');
  });
  it('masks provider failures', async () => {
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('private network details'));
    await expect(identity().authenticate('abc')).rejects.toThrow('Login provider is unavailable');
  });
  it.each([null, {}, { employee: { username: 'a' }, whoami: { loginTokenSecondsLeft: -1 } }])('rejects malformed responses: %j', async body => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body)));
    await expect(identity().authenticate('abc')).rejects.toThrow('Invalid login provider response');
  });
  it('caps token lifetime at one day', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ employee: { username: 'alice' }, whoami: { loginTokenSecondsLeft: 999999 } })));
    await expect(identity().authenticate('abc')).resolves.toEqual({ loginName: 'alice', expiresIn: 86400 });
  });
});

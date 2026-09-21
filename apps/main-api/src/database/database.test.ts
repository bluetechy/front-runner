import { describe, expect, it, jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { DatabaseService } from './database.service.js';
const config = new ConfigService({
  POSTGRES_ADDRESS: '127.0.0.1', POSTGRES_PORT: 5432, POSTGRES_DATABASE: 'test',
  POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_POOL_SIZE: 1,
  POSTGRES_STATEMENT_TIMEOUT_MS: 1000,
});
describe('PostgreSQL adapter', () => {
  it('passes bound values through and closes its pool on shutdown', async () => {
    const query = jest.spyOn(Pool.prototype, 'query').mockImplementation((async () => ({ rows: [{ count: 1 }] })) as never);
    const end = jest.spyOn(Pool.prototype, 'end').mockImplementation((async () => undefined) as never);
    const service = new DatabaseService(config);
    await expect(service.query('SELECT $1 AS count', [1])).resolves.toEqual([{ count: 1 }]);
    expect(query.mock.calls[0]).toEqual(['SELECT $1 AS count', [1]]);
    await service.onApplicationShutdown();
    expect(end).toHaveBeenCalledTimes(1);
  });
  // A rule the schema enforces is an answer to the request, not a failure to
  // process it. Returning 500 for "that invitation has expired" tells the caller
  // to retry something that will never succeed.
  it.each([
    ['Action cannot be performed.', 'Forbidden', 403],
    ['That invitation has expired.', 'Bad Request', 400],
    ['The last owner cannot leave the organization.', 'Bad Request', 400],
  ])('surfaces the deliberate exception %s as a client error', async (message, _name, status) => {
    jest.spyOn(Pool.prototype, 'query').mockImplementation((async () => { throw Object.assign(new Error(message), { code: 'P0001' }); }) as never);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const service = new DatabaseService(config);
    try {
      await expect(service.query('SELECT 1')).rejects.toMatchObject({ message, status });
    } finally { await service.onApplicationShutdown(); }
  });

  it('sanitizes database errors and logs only the error code', async () => {
    jest.spyOn(Pool.prototype, 'query').mockImplementation((async () => { throw Object.assign(new Error('private SQL and credentials'), { code: '42501' }); }) as never);
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const service = new DatabaseService(config);
    try {
      await expect(service.query('SELECT sensitive_data')).rejects.toThrow('Database operation failed');
      expect(log).toHaveBeenCalledWith('PostgreSQL operation failed (42501)');
    } finally { await service.onApplicationShutdown(); }
  });
});

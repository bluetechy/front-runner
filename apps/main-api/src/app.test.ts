import 'reflect-metadata';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { AppModule } from './app.module.js';
import { DatabaseService } from './database/index.js';

const userId = '00000000-0000-4000-8000-000000000001';
const orgId = '00000000-0000-4000-8000-000000000002';
const teamId = '00000000-0000-4000-8000-000000000003';
const profile = { UserUUID: userId, Name: 'Alice', LoginName: 'alice', Email: null, IsAdmin: false };
const organization = { OrganizationUUID: orgId, Name: 'Acme', TeamCount: 1, UserCount: 1, OwnerCount: 1, IsOwner: true };
const team = { OrganizationUUID: orgId, TeamUUID: teamId, Name: 'Builders', UserCount: 1, IsManager: true };

describe('GraphQL application', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let token: string;
  const query = jest.fn<(sql: string, values?: unknown[]) => Promise<Record<string, unknown>[]>>();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DatabaseService).useValue({ query }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    await app.init();
    jwt = app.get(JwtService);
    token = jwt.sign({ LoginName: 'alice' }, { expiresIn: 3600 });
  });
  afterAll(async () => { await app?.close(); });
  beforeEach(() => {
    query.mockReset();
    query.mockImplementation(async sql => {
      if (sql.startsWith('SELECT "UserUUID" FROM')) return [{ UserUUID: userId }];
      if (sql.startsWith('SELECT "IsEnabled"')) return [{ IsEnabled: true }];
      if (sql.includes('"GetUser"') || sql.includes('"GetUsers"') || sql.includes('"LoginUser"')) return [profile];
      if (sql.includes('"IsOwnerOfOrganization"') && !sql.includes('FROM dbo."Teams"')) return [{ allowed: true }];
      if (sql.includes('FROM dbo."Teams"')) return [{ member: true, manager: true, target_member: true }];
      if (/"(GetOrganizations|AddOrganization|JoinOrganization|LeaveOrganization)"/.test(sql)) return [organization];
      if (/"(GetTeams|AddTeam|JoinTeam|LeaveTeam)"/.test(sql)) return [team];
      if (sql.includes('"GetPoints"')) return [{ UserPointUUID: teamId, UserUUID: userId, OrganizationUUID: orgId, PointUUID: teamId, Name: 'XP', Description: 'Completed task', Amount: '900719925474099.1234', ExpiresAt: new Date('2030-01-01T00:00:00Z') }];
      if (sql.includes('"GetTallies"')) return [{ OrganizationUUID: orgId, UserUUID: userId, PointUUID: teamId, Name: 'Alice', Amount: '12.3400' }];
      if (sql.includes('"GetBadges"')) return [{ UserUUID: userId, OrganizationUUID: orgId, BadgeUUID: teamId, Name: 'Starter', Description: null, Level: 1, EarnedAt: new Date('2026-01-01T00:00:00Z'), EarnedDescription: null }];
      return [];
    });
  });
  const execute = (document: string, variables = {}, authorization = `Bearer ${token}`) =>
    request(app.getHttpServer()).post('/graphql').set('Authorization', authorization).send({ query: document, variables });

  it('serves all six read features through one schema and preserves exact decimals and ISO timestamps', async () => {
    const response = await execute(`query Dashboard($org: String!) {
      me { UserUUID LoginName Email }
      users { UserUUID }
      organizations { OrganizationUUID Name }
      teams(organizationId: $org) { TeamUUID }
      badges(organizationId: $org) { BadgeUUID Description EarnedAt }
      points(organizationId: $org) { Amount ExpiresAt }
      tallies(organizationId: $org) { Amount }
    }`, { org: orgId });
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.me.LoginName).toBe('alice');
    expect(response.body.data.points[0]).toEqual({ Amount: '900719925474099.1234', ExpiresAt: '2030-01-01T00:00:00.000Z' });
    expect(response.body.data.badges[0].Description).toBeNull();
    expect(response.body.data.tallies[0].Amount).toBe('12.3400');
    expect(query.mock.calls.filter(([sql]) => sql.startsWith('SELECT "UserUUID" FROM'))).toHaveLength(1);
  });

  it.each([
    ['addOrganization', 'name: "Acme"', 'OrganizationUUID', 'AddOrganization', ['alice', 'Acme']],
    ['joinOrganization', `organizationId: "${orgId}", userId: "${userId}"`, 'OrganizationUUID', 'JoinOrganization', ['alice', orgId, userId]],
    ['leaveOrganization', `organizationId: "${orgId}", userId: "${userId}"`, 'OrganizationUUID', 'LeaveOrganization', ['alice', orgId, userId]],
    ['addTeam', `organizationId: "${orgId}", name: "Builders"`, 'TeamUUID', 'AddTeam', ['alice', orgId, 'Builders']],
    ['joinTeam', `teamId: "${teamId}", userId: "${userId}"`, 'TeamUUID', 'JoinTeam', ['alice', teamId, userId]],
    ['leaveTeam', `teamId: "${teamId}", userId: "${userId}"`, 'TeamUUID', 'LeaveTeam', ['alice', teamId, userId]],
  ])('executes %s using the verified actor and parameterized SQL', async (operation, args, field, functionName, values) => {
    const response = await execute(`mutation { ${operation}(${args}) { ${field} } }`);
    expect(response.body.errors).toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining(`dbo."${functionName}"`), values);
  });

  it.each(['', 'Basic abc', 'Bearer garbage'])('rejects missing or invalid credentials: %s', async header => {
    const response = await execute('{ organizations { Name } }', {}, header);
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects expired and non-expiring JWTs', async () => {
    for (const invalid of [jwt.sign({ LoginName: 'alice' }, { expiresIn: -1 }), jwt.sign({ LoginName: 'alice' })]) {
      const response = await execute('{ me { Name } }', {}, `Bearer ${invalid}`);
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects a disabled or deleted account before querying domain data', async () => {
    query.mockResolvedValue([]);
    const response = await execute('{ me { Name } }');
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('validates UUIDs before querying feature data', async () => {
    const response = await execute('{ teams(organizationId: "not-a-uuid") { Name } }');
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it.each([0, -1, 101])('rejects a list limit of %s', async limit => {
    const response = await execute(`{ organizations(limit: ${limit}) { Name } }`);
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('passes pagination to PostgreSQL', async () => {
    const response = await execute('{ organizations(limit: 10, offset: 20) { Name } }');
    expect(response.body.errors).toBeUndefined();
    expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2 OFFSET $3'), ['alice', 10, 20]);
  });
  it('rejects blank organization names', async () => {
    const response = await execute('mutation { addOrganization(name: "  ") { Name } }');
    expect(response.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('denies team creation without organization ownership', async () => {
    query.mockImplementation(async sql => sql.startsWith('SELECT "UserUUID" FROM') ? [{ UserUUID: userId }] : [{ allowed: false }]);
    const response = await execute(`mutation { addTeam(organizationId: "${orgId}", name: "X") { Name } }`);
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(query.mock.calls.some(([sql]) => sql.includes('"AddTeam"'))).toBe(false);
  });
  it('does not leak database details or stack traces', async () => {
    query.mockRejectedValue(new Error('password=secret; SELECT private_data'));
    const response = await execute('{ me { Name } }');
    expect(response.body.errors[0].message).toBe('Internal server error');
    expect(JSON.stringify(response.body)).not.toMatch(/password|private_data|stacktrace/);
  });
  it('rejects excessive aliases before accessing the database', async () => {
    const aliases = Array.from({ length: 101 }, (_, i) => `a${i}: me { Name }`).join(' ');
    const response = await execute(`{ ${aliases} }`);
    expect(response.body.errors[0].extensions.code).toBe('GRAPHQL_VALIDATION_FAILED');
    expect(query).not.toHaveBeenCalled();
  });
  it('rejects HTTP request batching', async () => {
    const response = await request(app.getHttpServer()).post('/graphql').send([{ query: '{ me { Name } }' }]);
    expect(response.status).toBe(400);
    expect(query).not.toHaveBeenCalled();
  });
  it('authenticates with the configured provider and issues a minimal expiring JWT', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ employee: { username: 'alice' }, whoami: { loginTokenSecondsLeft: 3600 } }), { status: 200 }));
    const response = await execute('mutation { login(value: "encoded-credentials") { LoginName Token } }', {}, '');
    expect(response.body.errors).toBeUndefined();
    const payload = jwt.verify(response.body.data.login.Token);
    expect(payload).toMatchObject({ LoginName: 'alice', sub: userId });
    expect(payload.exp - payload.iat).toBe(3600);
    expect(payload.Token).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith('https://identity.example.test/loginTokens?expand=whoami', expect.objectContaining({ method: 'POST' }));
  });
  it('exposes liveness independently of database readiness', async () => {
    expect((await request(app.getHttpServer()).get('/health/live')).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/health/ready')).status).toBe(200);
    query.mockRejectedValue(new Error('offline'));
    expect((await request(app.getHttpServer()).get('/health/live')).status).toBe(200);
    expect((await request(app.getHttpServer()).get('/health/ready')).status).toBe(503);
  });
  it('returns 404 for the retired feature URL', async () => {
    expect((await request(app.getHttpServer()).post('/v1/users').send({ query: '{ get { Name } }' })).status).toBe(404);
  });
});

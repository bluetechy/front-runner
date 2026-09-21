import { ForbiddenException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';
import type { PageArgs } from '../graphql/index.js';
import type { Principal } from '../authentication/index.js';
import { Organization } from './organizations.model.js';
@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, page: PageArgs) {
    return this.db.query<Organization>('SELECT * FROM dbo."GetOrganizations"($1) ORDER BY "Name", "OrganizationUUID" LIMIT $2 OFFSET $3', [loginName, page.limit, page.offset]);
  }
  async add(loginName: string, name: string) {
    const [organization] = await this.db.query<Organization>('SELECT * FROM dbo."AddOrganization"($1, $2, true)', [loginName, name]);
    return organization ?? null;
  }
  private async owner(loginName: string, organizationId: string) {
    const [result] = await this.db.query<{ allowed: boolean }>('SELECT dbo."IsOwnerOfOrganization"($1, $2) AS allowed', [loginName, organizationId]);
    if (!result?.allowed) throw new ForbiddenException('Organization owner access is required');
  }
  async join(user: Principal, organizationId: string, userId: string) {
    await this.owner(user.loginName, organizationId);
    const [organization] = await this.db.query<Organization>('SELECT * FROM dbo."JoinOrganization"($1, $2, $3)', [user.loginName, organizationId, userId]);
    return organization ?? null;
  }
  async leave(user: Principal, organizationId: string, userId: string) {
    if (user.userId !== userId) await this.owner(user.loginName, organizationId);
    const [organization] = await this.db.query<Organization>('SELECT * FROM dbo."LeaveOrganization"($1, $2, $3)', [user.loginName, organizationId, userId]);
    return organization ?? null;
  }
}

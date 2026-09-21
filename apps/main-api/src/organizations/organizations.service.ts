import { ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import type { Principal } from "../authentication/index.js";
import { Organization, OrganizationMember } from "./organizations.model.js";
@Injectable()
export class OrganizationsService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, page: PageArgs, includeArchived: boolean) {
    return this.db.query<Organization>(
      'SELECT * FROM dbo."GetOrganizations"($1, $4) ORDER BY "Name", "OrganizationUUID" LIMIT $2 OFFSET $3',
      [loginName, page.limit, page.offset, includeArchived],
    );
  }

  async get(loginName: string, organizationId: string) {
    const [organization] = await this.db.query<Organization>(
      'SELECT * FROM dbo."GetOrganization"($1, $2)',
      [loginName, organizationId],
    );
    return organization ?? null;
  }

  async setEnabled(
    loginName: string,
    organizationId: string,
    isEnabled: boolean,
  ) {
    const [organization] = await this.db.query<Organization>(
      'SELECT * FROM dbo."SetOrganizationEnabled"($1, $2, $3)',
      [loginName, organizationId, isEnabled],
    );
    return organization ?? null;
  }
  async add(loginName: string, name: string) {
    const [organization] = await this.db.query<Organization>(
      'SELECT * FROM dbo."AddOrganization"($1, $2, true)',
      [loginName, name],
    );
    return organization ?? null;
  }
  private async owner(loginName: string, organizationId: string) {
    const [result] = await this.db.query<{ allowed: boolean }>(
      'SELECT dbo."IsOwnerOfOrganization"($1, $2) AS allowed',
      [loginName, organizationId],
    );
    if (!result?.allowed)
      throw new ForbiddenException("Organization owner access is required");
  }
  members(loginName: string, organizationId: string, page: PageArgs) {
    return this.db.query<OrganizationMember>(
      'SELECT * FROM dbo."GetOrganizationMembers"($1, $2) LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }

  // Ownership checks, the last-owner guard and the "is this even a member"
  // test are all dbo.SetOrganizationRole's, so there is no pre-check here to
  // disagree with it.
  async setRole(
    loginName: string,
    organizationId: string,
    userId: string,
    isOwner: boolean,
  ) {
    const [member] = await this.db.query<OrganizationMember>(
      'SELECT * FROM dbo."SetOrganizationRole"($1, $2, $3, $4)',
      [loginName, organizationId, userId, isOwner],
    );
    return member ?? null;
  }

  async rename(loginName: string, organizationId: string, name: string) {
    const [organization] = await this.db.query<Organization>(
      'SELECT * FROM dbo."RenameOrganization"($1, $2, $3)',
      [loginName, organizationId, name],
    );
    return organization ?? null;
  }

  // There is no counterpart to this. Joining an organization goes through
  // InvitationsService: an owner offers, and the invitee accepts. Removing
  // somebody is still one call, because being removed needs nobody's consent.
  async leave(user: Principal, organizationId: string, userId: string) {
    if (user.userId !== userId)
      await this.owner(user.loginName, organizationId);
    const [organization] = await this.db.query<Organization>(
      'SELECT * FROM dbo."LeaveOrganization"($1, $2, $3)',
      [user.loginName, organizationId, userId],
    );
    return organization ?? null;
  }
}

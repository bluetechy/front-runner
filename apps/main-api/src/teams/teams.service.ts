import { ForbiddenException, Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import type { Principal } from "../authentication/index.js";
import { Team } from "./teams.model.js";
@Injectable()
export class TeamsService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, organizationId: string, page: PageArgs) {
    // GetTeams joins memberships and can return the same team more than once.
    return this.db.query<Team>(
      'SELECT DISTINCT * FROM dbo."GetTeams"($1, $2) ORDER BY "Name", "TeamUUID" LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }
  async add(loginName: string, organizationId: string, name: string) {
    const [access] = await this.db.query<{ allowed: boolean }>(
      'SELECT dbo."IsOwnerOfOrganization"($1, $2) AS allowed',
      [loginName, organizationId],
    );
    if (!access?.allowed)
      throw new ForbiddenException("Organization owner access is required");
    const [team] = await this.db.query<Team>(
      'SELECT * FROM dbo."AddTeam"($1, $2, $3)',
      [loginName, organizationId, name],
    );
    return team ?? null;
  }
  private async access(
    user: Principal,
    teamId: string,
    userId: string,
    leaving: boolean,
  ) {
    const [access] = await this.db.query<{
      member: boolean;
      manager: boolean;
      target_member: boolean;
    }>(
      `
      SELECT dbo."IsMemberOfOrganization"($1, t."OrganizationUUID") AS member,
        (dbo."IsOwnerOfOrganization"($1, t."OrganizationUUID") OR dbo."IsManagerOfTeam"($1, t."TeamUUID")) AS manager,
        EXISTS (SELECT 1 FROM dbo."UserOrganizations" uo JOIN dbo."Users" u USING ("UserUUID")
          WHERE uo."OrganizationUUID" = t."OrganizationUUID" AND uo."UserUUID" = $3 AND u."IsEnabled" = true) AS target_member
      FROM dbo."Teams" t WHERE t."TeamUUID" = $2 AND t."IsEnabled" = true
    `,
      [user.loginName, teamId, userId],
    );
    if (
      !access?.member ||
      (!access.manager && !(leaving && user.userId === userId)) ||
      (!leaving && !access.target_member)
    ) {
      throw new ForbiddenException("Team access denied");
    }
  }
  async join(user: Principal, teamId: string, userId: string) {
    await this.access(user, teamId, userId, false);
    // Preserve an existing manager flag; the legacy function defaults it to false.
    const [team] = await this.db.query<Team>(
      `SELECT * FROM dbo."JoinTeam"($1, $2, $3,
      COALESCE((SELECT "IsManager" FROM dbo."UserTeams" WHERE "TeamUUID" = $2 AND "UserUUID" = $3), false))`,
      [user.loginName, teamId, userId],
    );
    return team ?? null;
  }
  async leave(user: Principal, teamId: string, userId: string) {
    await this.access(user, teamId, userId, true);
    const [team] = await this.db.query<Team>(
      'SELECT * FROM dbo."LeaveTeam"($1, $2, $3)',
      [user.loginName, teamId, userId],
    );
    return team ?? null;
  }
}

import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';
import type { PageArgs } from '../graphql/index.js';
import { OrganizationInvitation } from './invitations.model.js';

// Every permission decision here is the database's: dbo.InviteToOrganization
// and dbo.RevokeOrganizationInvitation check organization ownership,
// dbo.AcceptOrganizationInvitation and dbo.DeclineOrganizationInvitation match
// the invitation to the caller's own address. This layer passes the verified
// actor through and does not second-guess any of it.
@Injectable()
export class InvitationsService {
  constructor(private readonly db: DatabaseService) {}

  mine(loginName: string, page: PageArgs) {
    return this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."GetUserInvitations"($1) LIMIT $2 OFFSET $3',
      [loginName, page.limit, page.offset],
    );
  }

  forOrganization(loginName: string, organizationId: string, page: PageArgs) {
    return this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."GetOrganizationInvitations"($1, $2) LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }

  async invite(loginName: string, organizationId: string, email: string, isOwner: boolean) {
    const [invitation] = await this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."InviteToOrganization"($1, $2, $3, $4)',
      [loginName, organizationId, email, isOwner],
    );
    return invitation ?? null;
  }

  async accept(loginName: string, invitationId: string) {
    const [invitation] = await this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."AcceptOrganizationInvitation"($1, $2)', [loginName, invitationId],
    );
    return invitation ?? null;
  }

  async decline(loginName: string, invitationId: string) {
    const [invitation] = await this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."DeclineOrganizationInvitation"($1, $2)', [loginName, invitationId],
    );
    return invitation ?? null;
  }

  async revoke(loginName: string, invitationId: string) {
    const [invitation] = await this.db.query<OrganizationInvitation>(
      'SELECT * FROM dbo."RevokeOrganizationInvitation"($1, $2)', [loginName, invitationId],
    );
    return invitation ?? null;
  }
}

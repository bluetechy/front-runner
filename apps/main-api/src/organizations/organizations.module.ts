import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { OrganizationsResolver } from './organizations.resolver.js';
import { OrganizationsService } from './organizations.service.js';
import { InvitationsResolver } from './invitations.resolver.js';
import { InvitationsService } from './invitations.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizationsResolver, OrganizationsService, InvitationsResolver, InvitationsService],
})
export class OrganizationsModule {}

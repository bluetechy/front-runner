import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { OrganizationsResolver } from './organizations.resolver.js';
import { OrganizationsService } from './organizations.service.js';

@Module({ imports: [DatabaseModule], providers: [OrganizationsResolver, OrganizationsService] })
export class OrganizationsModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';
import { AuthenticationModule } from '../authentication/index.js';
import { HydraIdentityService } from './hydra-identity.service.js';

@Module({ imports: [DatabaseModule, AuthenticationModule], providers: [UsersResolver, UsersService, HydraIdentityService] })
export class UsersModule {}

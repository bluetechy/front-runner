import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { UsersResolver } from './users.resolver.js';
import { UsersService } from './users.service.js';

@Module({ imports: [DatabaseModule], providers: [UsersResolver, UsersService] })
export class UsersModule {}

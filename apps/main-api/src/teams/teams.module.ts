import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { TeamsResolver } from './teams.resolver.js';
import { TeamsService } from './teams.service.js';

@Module({ imports: [DatabaseModule], providers: [TeamsResolver, TeamsService] })
export class TeamsModule {}

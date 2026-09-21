import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { TalliesResolver } from './tallies.resolver.js';
import { TalliesService } from './tallies.service.js';

@Module({ imports: [DatabaseModule], providers: [TalliesResolver, TalliesService] })
export class TalliesModule {}

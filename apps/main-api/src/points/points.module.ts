import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/index.js';
import { PointsResolver } from './points.resolver.js';
import { PointsService } from './points.service.js';

@Module({ imports: [DatabaseModule], providers: [PointsResolver, PointsService] })
export class PointsModule {}

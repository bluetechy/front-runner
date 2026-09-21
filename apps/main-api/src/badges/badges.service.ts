import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/index.js';
import type { PageArgs } from '../graphql/index.js';
import { Badge } from './badges.model.js';
@Injectable()
export class BadgesService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, organizationId: string, page: PageArgs) {
    return this.db.query<Badge>(
      'SELECT * FROM dbo."GetBadges"($1, $2) ORDER BY "BadgeUUID" LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }
}

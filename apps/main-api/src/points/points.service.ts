import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import { Point } from "./points.model.js";
@Injectable()
export class PointsService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, organizationId: string, page: PageArgs) {
    return this.db.query<Point>(
      'SELECT * FROM dbo."GetPoints"($1, $2) ORDER BY "UserPointUUID" LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }
}

import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import { Tally } from "./tallies.model.js";
@Injectable()
export class TalliesService {
  constructor(private readonly db: DatabaseService) {}
  list(loginName: string, organizationId: string, page: PageArgs) {
    return this.db.query<Tally>(
      'SELECT * FROM dbo."GetTallies"($1, $2, 0) ORDER BY "Amount" DESC, "UserUUID", "PointUUID" LIMIT $3 OFFSET $4',
      [loginName, organizationId, page.limit, page.offset],
    );
  }
}

import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/index.js";
import type { PageArgs } from "../graphql/index.js";
import { User } from "./users.model.js";
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}
  async me(loginName: string) {
    const [user] = await this.db.query<User>(
      'SELECT * FROM dbo."GetUser"($1)',
      [loginName],
    );
    return user ?? null;
  }
  list(loginName: string, page: PageArgs) {
    return this.db.query<User>(
      'SELECT * FROM dbo."GetUsers"($1) ORDER BY "Name", "UserUUID" LIMIT $2 OFFSET $3',
      [loginName, page.limit, page.offset],
    );
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/index.js';
import type { PageArgs } from '../graphql/index.js';
import { User } from './users.model.js';
import { HydraIdentityService } from './hydra-identity.service.js';
@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService, private readonly identity: HydraIdentityService, private readonly jwt: JwtService) {}
  async me(loginName: string) {
    const [user] = await this.db.query<User>('SELECT * FROM dbo."GetUser"($1)', [loginName]);
    return user ?? null;
  }
  list(loginName: string, page: PageArgs) {
    return this.db.query<User>('SELECT * FROM dbo."GetUsers"($1) ORDER BY "Name", "UserUUID" LIMIT $2 OFFSET $3', [loginName, page.limit, page.offset]);
  }
  async login(value: string) {
    const identity = await this.identity.authenticate(value);
    const [user] = await this.db.query<User>(`SELECT profile.* FROM dbo."LoginUser"($1) profile`, [identity.loginName]);
    if (!user) throw new UnauthorizedException('User is unavailable');
    const [enabled] = await this.db.query<{ IsEnabled: boolean }>('SELECT "IsEnabled" FROM dbo."Users" WHERE "UserUUID" = $1', [user.UserUUID]);
    if (!enabled?.IsEnabled) throw new UnauthorizedException('User is unavailable');
    const token = await this.jwt.signAsync({ LoginName: user.LoginName }, { subject: user.UserUUID, expiresIn: identity.expiresIn });
    return { ...user, Token: token };
  }
}

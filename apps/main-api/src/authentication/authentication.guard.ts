import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/index.js';
import { GraphqlContext, Principal, PUBLIC_OPERATION } from './authentication.decorators.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_OPERATION, [context.getHandler(), context.getClass()])) return true;
    const request = GqlExecutionContext.create(context).getContext<GraphqlContext>().req;
    // One verified identity/database lookup per HTTP request, even with parallel root fields.
    request.authentication ??= this.authenticate(request.headers.authorization);
    request.principal = await request.authentication;
    return true;
  }

  private async authenticate(header?: string): Promise<Principal> {
    const match = /^Bearer ([^\s]+)$/i.exec(header ?? '');
    if (!match?.[1]) throw new UnauthorizedException('A Bearer token is required');
    let payload: { LoginName?: unknown; exp?: unknown };
    try { payload = await this.jwt.verifyAsync(match[1], { algorithms: ['HS256'] }); }
    catch { throw new UnauthorizedException('Invalid or expired token'); }
    if (typeof payload.LoginName !== 'string' || !payload.LoginName || typeof payload.exp !== 'number') {
      throw new UnauthorizedException('Invalid token claims');
    }
    const [user] = await this.db.query<{ UserUUID: string }>(
      'SELECT "UserUUID" FROM dbo."Users" WHERE "LoginName" = $1 AND "IsEnabled" = true', [payload.LoginName],
    );
    if (!user) throw new UnauthorizedException('User is unavailable');
    return { userId: user.UserUUID, loginName: payload.LoginName };
  }
}

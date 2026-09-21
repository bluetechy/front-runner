import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { DatabaseService } from '../database/index.js';
import { GraphqlContext, Principal, PUBLIC_OPERATION } from './authentication.decorators.js';
import { KeycloakService, type VerifiedIdentity } from './keycloak.service.js';

interface Account { UserUUID: string; Name: string; LoginName: string; Email: string; IsEnabled: boolean }

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly keycloak: KeycloakService, private readonly db: DatabaseService) {}

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
    const identity = await this.keycloak.verify(match[1]);

    // The common request is a user who signed in earlier and has changed
    // nothing since, so it costs one indexed read. Provisioning -- which
    // writes -- is kept for the sign-ins that actually need it: a subject this
    // installation has never seen, and a profile Keycloak has since edited.
    const [known] = await this.db.query<Account>(
      'SELECT "UserUUID", "Name", "LoginName", "Email", "IsEnabled" FROM dbo."Users" WHERE "SubjectId" = $1',
      [identity.subjectId],
    );
    const account = this.current(known, identity) ? known : await this.provision(identity);

    if (!account?.IsEnabled) throw new UnauthorizedException('User is unavailable');
    return { userId: account.UserUUID, loginName: account.LoginName };
  }

  private current(account: Account | undefined, identity: VerifiedIdentity): account is Account {
    return !!account
      && account.LoginName === identity.loginName
      && account.Email === identity.email
      && (identity.name === null || account.Name === identity.name);
  }

  private async provision(identity: VerifiedIdentity): Promise<Account | undefined> {
    const [account] = await this.db.query<Account>(
      'SELECT * FROM dbo."ProvisionUser"($1, $2, $3, $4)',
      [identity.subjectId, identity.loginName, identity.name, identity.email],
    );
    return account;
  }
}

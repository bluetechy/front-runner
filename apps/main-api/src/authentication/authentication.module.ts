import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/index.js';
import { AuthenticationGuard } from './authentication.guard.js';
import { KeycloakService, keycloakKeySetProvider } from './keycloak.service.js';

@Module({
  imports: [DatabaseModule],
  providers: [keycloakKeySetProvider, KeycloakService, { provide: APP_GUARD, useClass: AuthenticationGuard }],
  exports: [KeycloakService],
})
export class AuthenticationModule {}

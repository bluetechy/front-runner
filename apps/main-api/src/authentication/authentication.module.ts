import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { KeycloakAdminService } from "./keycloak-admin.service.js";
import { KeycloakService, keycloakKeySetProvider } from "./keycloak.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [
    keycloakKeySetProvider,
    KeycloakService,
    KeycloakAdminService,
    { provide: APP_GUARD, useClass: AuthenticationGuard },
  ],
  exports: [KeycloakService, KeycloakAdminService],
})
export class AuthenticationModule {}

import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "../database/index.js";
import { AuthenticationGuard } from "./authentication.guard.js";
import { IdentityAdminService } from "./identity-admin.service.js";
import { KeycloakAdminService } from "./keycloak-admin.service.js";
import {
  TokenVerifierService,
  identityKeySetProvider,
} from "./token-verifier.service.js";

// Where the identity provider is chosen, and the only line in this API that
// chooses one. Verticals inject IdentityAdminService, which says what an
// account is and what may be done to one; KeycloakAdminService is what answers
// that today. Moving to another provider is a new file beside that one and a
// different useClass here, with no vertical touched.
@Module({
  imports: [DatabaseModule],
  providers: [
    identityKeySetProvider,
    TokenVerifierService,
    { provide: IdentityAdminService, useClass: KeycloakAdminService },
    { provide: APP_GUARD, useClass: AuthenticationGuard },
  ],
  exports: [TokenVerifierService, IdentityAdminService],
})
export class AuthenticationModule {}

export { AuthenticationModule } from "./authentication.module.js";
export { KeycloakAdminService } from "./keycloak-admin.service.js";
export {
  KeycloakService,
  KEYCLOAK_KEY_SET,
  keycloakKeySetProvider,
} from "./keycloak.service.js";
// PUBLIC_OPERATION is the metadata key behind @Public, exported beside it so
// a vertical can assert that one of its own operations really is reachable
// without a session. The emails vertical does: verifyEmail is the one
// operation in this API that a link in an email reaches.
export {
  CurrentUser,
  Public,
  PUBLIC_OPERATION,
} from "./authentication.decorators.js";
export type { Account, NewAccount } from "./keycloak-admin.service.js";
export type { VerifiedIdentity } from "./keycloak.service.js";
export type { Principal, GraphqlContext } from "./authentication.decorators.js";

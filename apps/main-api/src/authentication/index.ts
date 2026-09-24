export { AuthenticationModule } from "./authentication.module.js";
// The port, not the implementation. KeycloakAdminService is deliberately not
// here: a vertical that could inject it could depend on a realm, and then the
// provider would no longer be one line's worth of choice. See
// authentication.module.ts.
export { IdentityAdminService } from "./identity-admin.service.js";
export {
  TokenVerifierService,
  IDENTITY_KEY_SET,
  identityKeySetProvider,
} from "./token-verifier.service.js";
// PUBLIC_OPERATION is the metadata key behind @Public, exported beside it so
// a vertical can assert that one of its own operations really is reachable
// without a session. The emails vertical does: verifyEmail is the one
// operation in this API that a link in an email reaches.
export {
  CurrentUser,
  Public,
  PUBLIC_OPERATION,
} from "./authentication.decorators.js";
export type {
  Account,
  LoginFailure,
  NewAccount,
} from "./identity-admin.service.js";
export type { VerifiedIdentity } from "./token-verifier.service.js";
export type { Principal, GraphqlContext } from "./authentication.decorators.js";

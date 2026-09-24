import { Mutation, Args, Resolver } from "@nestjs/graphql";
import { Public } from "../authentication/index.js";
import { ZodPipe } from "../graphql/index.js";
import { RegisteredAccount, RegistrationInput } from "./registration.model.js";
import { registrationSchema } from "./registration.schema.js";
import { RegistrationService } from "./registration.service.js";

// The one operation in this API that makes an account, and it is @Public
// because it has to be: nobody registering has a session yet.
//
// That is the whole of what is unusual here, and it is worth being plain
// about what it does and does not open up. The realm already allows
// self-registration on Keycloak's own hosted page, so this adds no way in
// that was not there -- it only lets the way in look like the rest of the
// site. It creates a disabled-for-nothing, unverified-address account with
// the password it was given and no roles; it answers with the username and
// address and never with a session. See KeycloakAdminService.createUser.
@Resolver(() => RegisteredAccount)
export class RegistrationResolver {
  constructor(private readonly service: RegistrationService) {}

  @Public()
  @Mutation(() => RegisteredAccount)
  register(
    @Args(
      "account",
      { type: () => RegistrationInput },
      new ZodPipe(registrationSchema),
    )
    account: RegistrationInput,
  ) {
    return this.service.register(account);
  }
}

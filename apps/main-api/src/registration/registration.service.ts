import { Injectable } from "@nestjs/common";
import { KeycloakAdminService } from "../authentication/index.js";
import { RegisteredAccount } from "./registration.model.js";
import type { NewAccountInput } from "./registration.schema.js";

// Making an account.
//
// Thin on purpose: the account lives in Keycloak and nowhere else until it is
// first signed in with. This application's own row is not written here -- that
// is dbo.ProvisionUser, which runs from the verified token on the first
// request a new session makes, the same as for somebody who registered on
// Keycloak's hosted page or arrived through Google. Writing a row here would
// be a second way for that row to come into being, able to disagree with the
// first.
@Injectable()
export class RegistrationService {
  constructor(private readonly keycloak: KeycloakAdminService) {}

  async register(account: NewAccountInput): Promise<RegisteredAccount> {
    await this.keycloak.createUser({
      username: account.Username,
      email: account.Email,
      firstName: account.FirstName,
      lastName: account.LastName,
      password: account.Password,
    });
    // What was stored, which is what the schema folded and trimmed rather
    // than what was typed. The dialog signs in with the address, so it wants
    // the one Keycloak actually has.
    return { Username: account.Username, Email: account.Email };
  }
}

import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { PasskeysResolver } from "./passkeys.resolver.js";
import { PasskeysService } from "./passkeys.service.js";

// The security page's fifth vertical, beside password-change, emails,
// single-sign-on and two-factor, and a vertical of its own for the reason
// those are: the subject is different. A password is the credential an
// account holds, a connected provider is one somebody else holds for it, a
// second factor is what is asked for after the password is right, and a
// passkey is what replaces the password altogether.
//
// The thinnest of the five. It reaches two ways out -- the identity provider,
// for the credentials it holds, and the security log, for the two things
// worth recording -- and neither the database nor the mail. There is nothing
// of a passkey for this product to keep: the private half never leaves the
// device that made it, and the public half is the provider's to check a
// signature with.
//
// Nothing is exported: the schema is the way in.
@Module({
  imports: [AuthenticationModule, SecurityEventsModule],
  providers: [PasskeysResolver, PasskeysService],
})
export class PasskeysModule {}

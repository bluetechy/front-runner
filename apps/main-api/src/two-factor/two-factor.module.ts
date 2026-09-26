import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { SmsModule } from "../sms/index.js";
import { TwoFactorResolver } from "./two-factor.resolver.js";
import { TwoFactorService } from "./two-factor.service.js";

// The security page's fourth vertical, beside password-change, emails and
// single-sign-on, and a vertical of its own for the reason those are: the
// subject is different. A password is the credential an account holds, a
// connected provider is one somebody else holds for it, and a second factor
// is the thing asked for after the password is right.
//
// It is the only one of the four that reaches all four ways out: the identity
// provider, for the factors it holds; this database, for the recovery codes
// and the half-finished phone numbers it cannot hold; the security log, for
// the four things worth recording; and the SMS transport, for the one message
// this vertical sends itself. Nothing reaches back, and nothing is exported:
// the schema is the way in.
//
// The message it sends is the enrollment code and only that. The code that
// decides a login is sent by Keycloak through SmsController, which is a door
// into the SMS vertical rather than through this one: deciding whether a login
// proceeds is the identity provider's, and this vertical is a page.
@Module({
  imports: [
    AuthenticationModule,
    DatabaseModule,
    SecurityEventsModule,
    SmsModule,
  ],
  providers: [TwoFactorResolver, TwoFactorService],
})
export class TwoFactorModule {}

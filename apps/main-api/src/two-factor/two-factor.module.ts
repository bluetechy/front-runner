import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { TwoFactorResolver } from "./two-factor.resolver.js";
import { TwoFactorService } from "./two-factor.service.js";

// The security page's fourth vertical, beside password-change, emails and
// single-sign-on, and a vertical of its own for the reason those are: the
// subject is different. A password is the credential an account holds, a
// connected provider is one somebody else holds for it, and a second factor
// is the thing asked for after the password is right.
//
// It is the only one of the four that reaches all three ways out: the identity
// provider, for the factors it holds; this database, for the recovery codes it
// cannot hold; and the security log, for the four things worth recording.
// Nothing reaches back, and nothing is exported: the schema is the way in.
@Module({
  imports: [AuthenticationModule, DatabaseModule, SecurityEventsModule],
  providers: [TwoFactorResolver, TwoFactorService],
})
export class TwoFactorModule {}

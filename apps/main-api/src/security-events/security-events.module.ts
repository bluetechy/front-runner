import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { PasswordResetModule } from "../password-reset/index.js";
import { LoginFailuresService } from "./login-failures.service.js";
import { SecurityEventsResolver } from "./security-events.resolver.js";
import { SecurityEventsService } from "./security-events.service.js";

// The one vertical here that exports its service. Every other one is reached
// through the schema and nothing else, which is the rule -- but a security log
// is written by whatever it is a log of, so the verticals that change how
// somebody gets into their account record what they did through this. That is
// the same shape MailModule has, and for the same reason: it is something other
// slices do, not a page of its own.
//
// The identity provider comes with it for one reason: a refused login is the
// only thing on the security page this application does not cause, so it is
// read back out of the provider's own event log. See LoginFailuresService.
@Module({
  imports: [DatabaseModule, PasswordResetModule, AuthenticationModule],
  providers: [
    SecurityEventsResolver,
    SecurityEventsService,
    LoginFailuresService,
  ],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}

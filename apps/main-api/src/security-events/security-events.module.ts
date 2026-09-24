import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { PasswordResetModule } from "../password-reset/index.js";
import { ProviderEventsService } from "./provider-events.service.js";
import { SecurityEventsResolver } from "./security-events.resolver.js";
import { SecurityEventsService } from "./security-events.service.js";

// The one vertical here that exports its service. Every other one is reached
// through the schema and nothing else, which is the rule -- but a security log
// is written by whatever it is a log of, so the verticals that change how
// somebody gets into their account record what they did through this. That is
// the same shape MailModule has, and for the same reason: it is something other
// slices do, not a page of its own.
//
// The identity provider comes with it for one reason: two things on the security
// page are not caused by this application and cannot be seen from the request
// path -- a login it refused, and a session that ended without anybody asking us
// -- so both are read back out of the provider's own event log. See
// ProviderEventsService.
//
// That import is only legal one way round. `authentication` is infrastructure
// here and may not reach a feature vertical, which is why AuthenticationGuard
// calls dbo.LogLoginEvent directly instead of coming through this service. This
// vertical is a feature, so it may reach infrastructure, and nothing reaches
// back -- check-boundaries enforces both halves.
@Module({
  imports: [DatabaseModule, PasswordResetModule, AuthenticationModule],
  providers: [
    SecurityEventsResolver,
    SecurityEventsService,
    // A provider and not an export: it is a timer, not an operation. Nothing
    // outside this vertical has any reason to hold it, and anything that did
    // could sweep the provider's log on its own schedule.
    ProviderEventsService,
  ],
  exports: [SecurityEventsService],
})
export class SecurityEventsModule {}

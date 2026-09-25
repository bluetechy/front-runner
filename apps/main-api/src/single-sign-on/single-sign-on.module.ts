import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { SingleSignOnResolver } from "./single-sign-on.resolver.js";
import { SingleSignOnService } from "./single-sign-on.service.js";

// The security page's third vertical, beside password-change and emails, and a
// vertical of its own for the same reason that one is: the subject is
// different. A password is a credential this application asks for and hands
// over; a connected provider is a credential somebody else holds, which this
// application can only ever read, confirm and take away.
//
// It reaches the identity provider for all three, and the security log to
// record the two that change something. Nothing reaches back, and nothing is
// exported: the schema is the way in.
@Module({
  imports: [AuthenticationModule, SecurityEventsModule],
  providers: [SingleSignOnResolver, SingleSignOnService],
})
export class SingleSignOnModule {}

import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { MailModule } from "../mail/index.js";
import { SecurityEventsModule } from "../security-events/index.js";
import { EmailsResolver } from "./emails.resolver.js";
import { EmailsService } from "./emails.service.js";

@Module({
  imports: [
    DatabaseModule,
    MailModule,
    AuthenticationModule,
    SecurityEventsModule,
  ],
  providers: [EmailsResolver, EmailsService],
})
export class EmailsModule {}

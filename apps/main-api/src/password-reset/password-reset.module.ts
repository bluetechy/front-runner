import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { DatabaseModule } from "../database/index.js";
import { MailModule } from "../mail/index.js";
import { PasswordResetResolver } from "./password-reset.resolver.js";
import { PasswordResetService } from "./password-reset.service.js";

@Module({
  imports: [DatabaseModule, MailModule, AuthenticationModule],
  providers: [PasswordResetResolver, PasswordResetService],
})
export class PasswordResetModule {}

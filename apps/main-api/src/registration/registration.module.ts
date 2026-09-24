import { Module } from "@nestjs/common";
import { AuthenticationModule } from "../authentication/index.js";
import { RegistrationResolver } from "./registration.resolver.js";
import { RegistrationService } from "./registration.service.js";

@Module({
  imports: [AuthenticationModule],
  providers: [RegistrationResolver, RegistrationService],
})
export class RegistrationModule {}

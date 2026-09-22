import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/index.js";
import { ProfilesResolver } from "./profiles.resolver.js";
import { ProfilesService } from "./profiles.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [ProfilesResolver, ProfilesService],
})
export class ProfilesModule {}

import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/index.js";
import { BadgesResolver } from "./badges.resolver.js";
import { BadgesService } from "./badges.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [BadgesResolver, BadgesService],
})
export class BadgesModule {}

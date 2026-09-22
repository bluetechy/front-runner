import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/index.js";
import { NotificationsResolver } from "./notifications.resolver.js";
import { NotificationsService } from "./notifications.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [NotificationsResolver, NotificationsService],
})
export class NotificationsModule {}
